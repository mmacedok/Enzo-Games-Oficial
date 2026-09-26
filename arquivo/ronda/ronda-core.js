// ============================================================================
// Regras puras da "Degustação Noturna" (minigame do Degustador da Noite).
// Runner lateral: o Degustador corre sozinho, o mundo passa por ele.
// Sem DOM e sem canvas — usado por js/ronda.js e pelos testes
// (test/ronda-core.test.js é o contrato deste arquivo).
// Unidades lógicas: tela 640×360, y cresce para baixo, tempo em segundos.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RondaCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const CONFIG = Object.freeze({
        largura: 640,
        altura: 360,
        passo: 1 / 120,
        // Degustador (retângulo do desenho; a colisão usa `folga` a menos em cada lado)
        jogadorX: 150,
        jogadorL: 24,
        jogadorA: 40,
        folga: 3,
        alturaArma: 16,          // tiro sai a 16 px do topo do jogador
        // Física
        gravidade: 2200,
        impulso: -760,           // pulo cheio sobe ~131 px
        corteDoPulo: -320,       // soltar o botão cedo corta a subida aqui
        quedaMax: 1100,
        tempoCoiote: 0.1,        // ainda pode pular logo depois de sair da beirada
        tempoAntecipado: 0.12,   // pulo apertado pouco antes de pousar vale
        // Ritmo
        velocidadeInicial: 260,
        velocidadeFinal: 520,
        tempoAteVelocidadeFinal: 90,
        // Prédios
        topoMin: 170,            // telhado mais alto possível (y)
        topoMax: 320,            // telhado mais baixo possível (y)
        subidaMax: 92,           // 70% da altura do pulo cheio
        descidaMax: 110,
        buracoMin: 60,
        margemBuraco: 0.8,       // buraco <= 80% do alcance do pulo
        // Tiro
        cadencia: 6,             // tiros por segundo
        velocidadeTiro: 900,
        pente: 10,               // balas por pente
        tempoRecarga: 2,         // recarga automática ao esvaziar, ou manual (recarregar)
        // Desafios
        inicioSemDesafios: 3,    // segundos iniciais só correndo
        inicioCoracao: 15,
        inicioFeiticeira: 25,
        inicioDrones: 40,
        corridaCoracao: 110,     // px/s a mais que o mundo, correndo na direção dele
        // Laser da feiticeira: linha rosa na frente dela, na altura do pulo
        laserComprimento: 220,
        laserAltura: 64,         // px acima do telhado (o Degustador em pé tem 40)
        laserAviso: 0.6,         // pisca fino antes (não mata)
        laserAtivo: 1.2,         // mata quem encostar
        laserPausa: 0.8,
    });

    /** Tipos de desafio: tamanho, vida (0 = não quebra) e bônus ao destruir. */
    const TIPOS = Object.freeze({
        baixo: Object.freeze({ w: 26, h: 30, vida: 0, bonus: 0 }),
        parede: Object.freeze({ w: 22, h: 150, vida: 3, bonus: 50 }),
        passaro: Object.freeze({ w: 20, h: 16, vida: 1, bonus: 30 }),
        drone: Object.freeze({ w: 26, h: 22, vida: 2, bonus: 80 }),
        coracao: Object.freeze({ w: 26, h: 40, vida: 2, bonus: 60 }),
        feiticeira: Object.freeze({ w: 30, h: 40, vida: 0, bonus: 0 }), // voa alto: o tiro não alcança
    });

    /** Tiros que o jogador precisa dar em cada desafio que só se vence atirando. */
    const TIROS_NECESSARIOS = Object.freeze({ parede: 3, passaro: 1, drone: 2 });

    const alturaPulo = () => (CONFIG.impulso * CONFIG.impulso) / (2 * CONFIG.gravidade);

    /**
     * Distância horizontal de um pulo cheio até pousar num telhado `subida`
     * px mais alto (negativo = mais baixo), na `velocidade` dada.
     * Retorna 0 se a subida for impossível.
     */
    function alcanceDoPulo(velocidade, subida) {
        const v0 = -CONFIG.impulso;
        const g = CONFIG.gravidade;
        const disc = v0 * v0 - 2 * g * subida;
        if (disc < 0) return 0;
        const tempoNoAr = (v0 + Math.sqrt(disc)) / g;
        return velocidade * tempoNoAr;
    }

    const velocidadeEm = (tempo) =>
        CONFIG.velocidadeInicial + (CONFIG.velocidadeFinal - CONFIG.velocidadeInicial) *
        Math.min(1, tempo / CONFIG.tempoAteVelocidadeFinal);

    const dificuldadeEm = (tempo) => Math.min(1, tempo / CONFIG.tempoAteVelocidadeFinal);

    function colide(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    /** Retângulo de colisão do jogador (um pouco menor que o desenho). */
    function hitboxJogador(jogo) {
        const f = CONFIG.folga;
        return { x: CONFIG.jogadorX + f, y: jogo.jogador.y + f, w: CONFIG.jogadorL - f * 2, h: CONFIG.jogadorA - f * 2 };
    }

    const corpoPredio = (p) => ({ x: p.x, y: p.topo, w: p.w, h: CONFIG.altura - p.topo + 400 });

    /** Fase do laser da feiticeira agora: 'aviso', 'ativo' ou 'pausa'. */
    function estadoLaser(d, tempo) {
        const ciclo = CONFIG.laserAviso + CONFIG.laserAtivo + CONFIG.laserPausa;
        const t = (tempo + (d.fase / (Math.PI * 2)) * ciclo) % ciclo;
        if (t < CONFIG.laserAviso) return 'aviso';
        if (t < CONFIG.laserAviso + CONFIG.laserAtivo) return 'ativo';
        return 'pausa';
    }

    /** Faixa do laser: da mão da feiticeira para a esquerda, cobrindo o corpo dela. */
    const zonaLaser = (d) => ({ x: d.x - CONFIG.laserComprimento, y: d.laserY - 2, w: CONFIG.laserComprimento + d.w, h: 4 });

    // ------------------------------------------------------------ estado
    function criarJogo(aleatorio = Math.random) {
        return reiniciar({ aleatorio });
    }

    function reiniciar(jogo) {
        const topo = 260;
        Object.assign(jogo, {
            fase: 'pronto',
            causa: null,
            tempo: 0,
            distancia: 0,
            bonus: 0,
            velocidade: CONFIG.velocidadeInicial,
            jogador: { y: topo - CONFIG.jogadorA, vy: 0, noChao: true, semChao: 0, pedido: -1, segurando: false, pulou: false },
            // Prédio inicial largo e sem desafios: começo tranquilo.
            predios: [{ x: -100, w: 1100, topo }],
            desafios: [],
            tiros: [],
            recarga: 0,
            balas: CONFIG.pente,
            recarregando: 0,         // segundos até o pente encher (0 = não está recarregando)
            // Plano de munição do gerador (estratégia: recarregar quando sobrar < 3 balas)
            planoTiro: { balas: CONFIG.pente, livreEm: 0, ultimo: -Infinity },
            acumulador: 0,
        });
        gerarAte(jogo, CONFIG.largura + 400);
        return jogo;
    }

    const pontos = (jogo) => Math.floor(jogo.distancia / 20) + jogo.bonus;

    // ------------------------------------------------------------ gerador
    const sortear = (jogo, min, max) => min + jogo.aleatorio() * (max - min);

    /** Cria prédios (e desafios em cima deles) até a borda `limite`. */
    function gerarAte(jogo, limite) {
        while (true) {
            const ultimo = jogo.predios[jogo.predios.length - 1];
            if (ultimo.x + ultimo.w >= limite) return;
            const v = jogo.velocidade;
            const dif = dificuldadeEm(jogo.tempo);

            const subida = sortear(jogo, -CONFIG.descidaMax, CONFIG.subidaMax);
            const topo = Math.min(CONFIG.topoMax, Math.max(CONFIG.topoMin, ultimo.topo - subida));
            const subidaReal = ultimo.topo - topo;

            let buraco = 0;
            if (jogo.aleatorio() < 0.15 + 0.35 * dif) {
                const maximo = CONFIG.margemBuraco * alcanceDoPulo(v, subidaReal);
                if (maximo > CONFIG.buracoMin) buraco = sortear(jogo, CONFIG.buracoMin, maximo);
            }
            const w = sortear(jogo, Math.max(260, v * 1.0), Math.max(560, v * 1.6));
            const predio = { x: ultimo.x + ultimo.w + buraco, w, topo, buraco };
            jogo.predios.push(predio);
            // Onde ele pode pousar depois de pular para cá: essa faixa fica livre.
            // (10% a mais de velocidade: ele chega aqui um pouco mais rápido.)
            // Pulando (buraco ou subida): até onde o pulo leva. Descendo colado: a queda
            // também leva ele para dentro do telhado antes de pousar.
            const pulaParaCa = buraco > 0 || subidaReal > 0;
            const queda = subidaReal < 0 ? v * 1.1 * Math.sqrt((2 * -subidaReal) / CONFIG.gravidade) : 0;
            const pouso = pulaParaCa ? Math.max(0, alcanceDoPulo(v * 1.1, subidaReal) - buraco) : queda;
            colocarDesafio(jogo, predio, v, dif, pouso);
        }
    }

    /**
     * Munição: reserva os tiros de um alvo que chega ao jogador em `chegada` (s).
     * Modela um jogador que atira só o necessário, de 0,6 s a 0,15 s antes de
     * o alvo chegar, e recarrega logo depois da rajada quando sobram menos de 3
     * balas. Sem balas ou sem tempo para isso, o alvo não entra (retorna false).
     */
    function reservarTiros(jogo, chegada, n) {
        const plano = jogo.planoTiro;
        const inicio = Math.max(chegada - 0.6, plano.livreEm, plano.ultimo + 1 / CONFIG.cadencia);
        const ultimo = inicio + (n - 1) / CONFIG.cadencia;
        if (ultimo > chegada - 0.15) return false;
        plano.balas -= n;
        plano.ultimo = ultimo;
        if (plano.balas < 3) {
            plano.balas = CONFIG.pente;
            plano.livreEm = ultimo + 0.1 + CONFIG.tempoRecarga;
        }
        return true;
    }

    /** No máximo um desafio por prédio, sempre com espaço para vencê-lo. */
    function colocarDesafio(jogo, predio, v, dif, pouso) {
        if (jogo.tempo < CONFIG.inicioSemDesafios) return;
        if (jogo.aleatorio() > 0.35 + 0.4 * dif) return;
        const tipos = ['baixo', 'parede', 'passaro'];
        if (jogo.tempo >= CONFIG.inicioCoracao) tipos.push('coracao');
        if (jogo.tempo >= CONFIG.inicioFeiticeira) tipos.push('feiticeira');
        if (jogo.tempo >= CONFIG.inicioDrones) tipos.push('drone');
        const tipo = tipos[Math.floor(jogo.aleatorio() * tipos.length)];
        if (tipo === 'feiticeira') return colocarFeiticeira(jogo, predio, v, pouso);
        const t = TIPOS[tipo];
        let min;
        let max;
        if (tipo === 'baixo' || tipo === 'coracao') {
            // Depois de pular o obstáculo, ainda precisa ter telhado para pousar.
            // O coração corre na direção do jogador, mas para antes do pouso.
            min = pouso + (tipo === 'coracao' ? 250 : 150);
            max = predio.w - (0.75 * v + 60) - t.w;
        } else if (tipo === 'parede' || tipo === 'drone') {
            // Longe da beirada: dá tempo de dar os tiros mesmo chegando de um pulo.
            min = pouso + Math.max(300, 0.8 * v);
            max = predio.w - 60;
        } else {
            // Pássaro: a janela de tiro (0,6 s antes) cabe no mesmo telhado.
            min = pouso + Math.max(200, 0.6 * v + 40);
            max = predio.w - 100;
        }
        if (max < min) return;
        const x = predio.x + sortear(jogo, min, max);
        const fase = jogo.aleatorio() * Math.PI * 2;
        const n = TIROS_NECESSARIOS[tipo];
        if (n && !reservarTiros(jogo, jogo.tempo + (x - CONFIG.jogadorX) / v, n)) return;
        const y = tipo === 'passaro' || tipo === 'drone'
            ? predio.topo - 26 - t.h / 2 // na altura da arma
            : predio.topo - t.h;
        const desafio = { tipo, x, y, w: t.w, h: t.h, base: y, vida: t.vida, fase };
        if (tipo === 'coracao') Object.assign(desafio, { predio, recuo: pouso + 150, correndo: false });
        jogo.desafios.push(desafio);
    }

    /**
     * Feiticeira: flutua sobre um telhado largo e risca um laser na altura do
     * pulo. Nesse trecho nunca é preciso pular: o prédio é alargado para caber
     * o pouso antes, a faixa do laser e a corrida até a beirada depois.
     */
    function colocarFeiticeira(jogo, predio, v, pouso) {
        const t = TIPOS.feiticeira;
        const inicioZona = pouso + 40;
        const depois = 0.25 * v + 90; // da faixa até a beirada: dá para pular o próximo buraco
        predio.w = Math.max(predio.w, inicioZona + CONFIG.laserComprimento + t.w + depois + sortear(jogo, 0, 120));
        const x = predio.x + inicioZona + CONFIG.laserComprimento;
        const y = predio.topo - 125;
        jogo.desafios.push({
            tipo: 'feiticeira', x, y, w: t.w, h: t.h, base: y, vida: 0,
            fase: jogo.aleatorio() * Math.PI * 2, laserY: predio.topo - CONFIG.laserAltura,
        });
    }

    // ------------------------------------------------------------ controles
    /** Apertar (true) ou soltar (false) o botão de pulo. O 1º aperto começa a corrida. */
    function pular(jogo, apertado) {
        const j = jogo.jogador;
        if (jogo.fase === 'fim') return;
        if (!apertado) {
            j.segurando = false;
            if (j.vy < CONFIG.corteDoPulo) j.vy = CONFIG.corteDoPulo;
            return;
        }
        if (jogo.fase === 'pronto') jogo.fase = 'correndo';
        j.segurando = true;
        if (!impulsionar(jogo)) j.pedido = jogo.tempo; // guarda para o pouso
    }

    function impulsionar(jogo) {
        const j = jogo.jogador;
        const podePular = j.noChao || (!j.pulou && j.semChao <= CONFIG.tempoCoiote);
        if (!podePular) return false;
        j.vy = CONFIG.impulso;
        j.noChao = false;
        j.pulou = true;
        j.pedido = -1;
        return true;
    }

    /** Um tiro, respeitando a cadência e o pente. Retorna true se atirou. */
    function atirar(jogo) {
        if (jogo.fase !== 'correndo' || jogo.recarga > 0 || jogo.recarregando > 0 || jogo.balas === 0) return false;
        jogo.tiros.push({ x: CONFIG.jogadorX + CONFIG.jogadorL, y: jogo.jogador.y + CONFIG.alturaArma });
        jogo.recarga = 1 / CONFIG.cadencia;
        jogo.balas -= 1;
        if (jogo.balas === 0) jogo.recarregando = CONFIG.tempoRecarga; // pente vazio: recarrega sozinho
        return true;
    }

    /** Recarga manual (pente incompleto). Retorna true se começou a recarregar. */
    function recarregar(jogo) {
        if (jogo.fase !== 'correndo' || jogo.recarregando > 0 || jogo.balas === CONFIG.pente) return false;
        jogo.recarregando = CONFIG.tempoRecarga;
        return true;
    }

    // ------------------------------------------------------------ simulação
    function terminar(jogo, causa) {
        jogo.fase = 'fim';
        jogo.causa = causa;
    }

    function passo(jogo) {
        const dt = CONFIG.passo;
        const j = jogo.jogador;
        jogo.tempo += dt;
        jogo.velocidade = velocidadeEm(jogo.tempo);
        jogo.recarga = Math.max(0, jogo.recarga - dt);
        if (jogo.recarregando > 0) {
            jogo.recarregando = Math.max(0, jogo.recarregando - dt);
            if (jogo.recarregando === 0) jogo.balas = CONFIG.pente;
        }
        const mov = jogo.velocidade * dt;
        jogo.distancia += mov;

        // Mundo anda para a esquerda.
        for (const p of jogo.predios) p.x -= mov;
        for (const d of jogo.desafios) {
            d.x -= mov;
            if (d.tipo === 'passaro') d.y = d.base + Math.sin(jogo.tempo * 5 + d.fase) * 6;
            if (d.tipo === 'feiticeira') d.y = d.base + Math.sin(jogo.tempo * 3 + d.fase) * 4;
            if (d.tipo === 'coracao' && d.x < CONFIG.largura) {
                // Na tela, corre na direção do jogador até perto de onde ele pousa.
                const limite = d.predio.x + d.recuo;
                d.x = Math.max(limite, d.x - CONFIG.corridaCoracao * dt);
                d.correndo = d.x > limite;
            }
        }
        jogo.predios = jogo.predios.filter((p) => p.x + p.w > -50);
        jogo.desafios = jogo.desafios.filter((d) => d.x + d.w > -50);
        gerarAte(jogo, CONFIG.largura + 400);

        // Jogador: gravidade e pouso.
        const baseAntes = j.y + CONFIG.jogadorA;
        j.vy = Math.min(j.vy + CONFIG.gravidade * dt, CONFIG.quedaMax);
        j.y += j.vy * dt;
        const base = j.y + CONFIG.jogadorA;
        const pesX = CONFIG.jogadorX + CONFIG.folga;
        const pesW = CONFIG.jogadorL - CONFIG.folga * 2;
        const embaixo = jogo.predios.find((p) => pesX < p.x + p.w && pesX + pesW > p.x);

        if (embaixo && j.vy >= 0 && baseAntes <= embaixo.topo + 0.5 && base >= embaixo.topo) {
            j.y = embaixo.topo - CONFIG.jogadorA;
            j.vy = 0;
            j.noChao = true;
            j.semChao = 0;
            j.pulou = false;
            if (j.pedido >= 0 && jogo.tempo - j.pedido <= CONFIG.tempoAntecipado) impulsionar(jogo);
        } else if (!embaixo || base < embaixo.topo - 0.5 || j.vy < 0) {
            if (j.noChao) j.noChao = false;
            j.semChao += dt;
        }
        // Parado em cima do telhado: continua no chão.
        if (embaixo && j.noChao) j.y = embaixo.topo - CONFIG.jogadorA;

        const corpo = hitboxJogador(jogo);
        if (jogo.predios.some((p) => colide(corpo, { ...corpoPredio(p), y: p.topo + 0.5 }))) return terminar(jogo, 'predio');
        if (j.y > CONFIG.altura) return terminar(jogo, 'buraco');
        if (jogo.desafios.some((d) => d.tipo !== 'feiticeira' && colide(corpo, d))) return terminar(jogo, 'desafio');
        const laser = (d) => d.tipo === 'feiticeira' && estadoLaser(d, jogo.tempo) === 'ativo' && colide(corpo, zonaLaser(d));
        if (jogo.desafios.some(laser)) return terminar(jogo, 'laser');

        // Tiros: andam, param na fachada de prédios, quebram desafios.
        const vivos = [];
        for (const tiro of jogo.tiros) {
            tiro.x += CONFIG.velocidadeTiro * dt;
            const bala = { x: tiro.x, y: tiro.y - 2, w: 10, h: 4 };
            if (tiro.x > CONFIG.largura + 20) continue;
            if (jogo.predios.some((p) => colide(bala, corpoPredio(p)))) continue;
            const alvo = jogo.desafios.find((d) => d.vida > 0 && colide(bala, d));
            if (alvo) {
                alvo.vida -= 1;
                if (alvo.vida === 0) {
                    jogo.bonus += TIPOS[alvo.tipo].bonus;
                    jogo.desafios.splice(jogo.desafios.indexOf(alvo), 1);
                }
                continue;
            }
            vivos.push(tiro);
        }
        jogo.tiros = vivos;
    }

    /** Avança o tempo real do quadro em passos fixos (60 Hz e 144 Hz jogam igual). */
    function avancar(jogo, segundos) {
        if (jogo.fase !== 'correndo') return 0;
        jogo.acumulador += Math.min(Math.max(segundos, 0), 0.25);
        let n = 0;
        while (jogo.acumulador >= CONFIG.passo - 1e-9 && jogo.fase === 'correndo') {
            passo(jogo);
            jogo.acumulador -= CONFIG.passo;
            n++;
        }
        if (jogo.fase !== 'correndo') jogo.acumulador = 0;
        return n;
    }

    return {
        CONFIG, TIPOS, criarJogo, reiniciar, pular, atirar, recarregar, avancar, pontos,
        alcanceDoPulo, alturaPulo, velocidadeEm, colide, hitboxJogador, estadoLaser, zonaLaser,
    };
});
