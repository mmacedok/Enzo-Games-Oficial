// ============================================================================
// Regras puras da "Caçada ao Inominável" (jogo de plataforma do Degustador).
// Fases feitas à mão (js/cacada-fases.js), no estilo Super Meat Boy / Mario:
// correr, pular, deslizar e pular na parede, agarrar na beirada, espinhos,
// serras, inimigos e o Inominável esperando no fim de cada fase.
// Sem DOM e sem canvas — usado por js/cacada.js e pelos testes
// (test/cacada-core.test.js é o contrato deste arquivo).
// Unidades: pixels lógicos (tela 640×360), y cresce para baixo, tempo em s.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CacadaCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const CONFIG = Object.freeze({
        largura: 640,
        altura: 360,
        tile: 20,
        passo: 1 / 120,
        // Degustador (caixa de colisão)
        jogadorL: 14,
        jogadorA: 26,
        folgaPerigo: 2,          // espinhos/serras/inimigos perdoam raspão
        // Corrida
        velocidadeMax: 190,
        acelChao: 1700,
        acelAr: 1150,
        atritoChao: 2000,
        atritoAr: 350,
        // Pulo
        gravidade: 1800,
        quedaMax: 560,
        impulso: -545,           // pulo cheio sobe ~82 px (4 tiles)
        corteDoPulo: -210,       // soltar o botão cedo corta a subida
        tempoCoiote: 0.09,
        tempoAntecipado: 0.12,
        // Parede
        quedaParede: 105,        // deslizando encostado
        paredeImpulsoX: 215,
        paredeImpulsoY: -500,
        travaParede: 0.13,       // depois do pulo na parede, empurrar para ela não vale
        coiotaParede: 0.08,
        // Beirada
        agarrarAcima: 5,         // mãos (topo do corpo) até 5 px acima…
        agarrarAbaixo: 16,       // …ou 16 px abaixo da quina
        agarrarVyMin: -140,      // agarra subindo devagar ou caindo
        tempoSubir: 0.16,
        largarBeirada: 0.3,
        // Mola e pisão
        molaImpulso: -800,
        pisaoImpulso: -330,
        pisaoImpulsoSegurando: -520,
        // Tiro (MP5K)
        cadencia: 5,
        velocidadeTiro: 560,
        alcanceTiro: 340,
        alturaArma: 11,
        // Mundo
        periodo: 3,              // serras e plataformas móveis: vai e volta em 3 s
        amplitude: 60,           // …andando 3 tiles para cada lado
        raioSerra: 15,
        plataformaA: 8,
        tempoTelha: 0.45,        // telha que desaba: aguenta isso depois de pisar
        voltaTelha: 3,
        tempoMorte: 0.55,
        // Inimigos
        coracaoVelocidade: 45,
        droneAmplitude: 50,
        feiticeiraRecarga: 2.2,
        feiticeiraAlcance: 300,
        magiaVelocidade: 140,
        magiaRaio: 5,
    });

    const T = CONFIG.tile;

    /** Inimigos: tamanho da caixa e tiros para derrubar. */
    const INIMIGOS = Object.freeze({
        coracao: Object.freeze({ w: 18, h: 22, vida: 2 }),
        drone: Object.freeze({ w: 20, h: 16, vida: 1 }),
        feiticeira: Object.freeze({ w: 20, h: 28, vida: 3 }),
    });

    /**
     * Legenda do mapa (uma letra por tile de 20×20).
     * Tiles fixos ficam na grade; o resto vira entidade.
     */
    const LEGENDA = Object.freeze({
        '.': 'vazio',
        '#': 'telhado (sólido)',
        'X': 'caixa de metal (sólido)',
        '=': 'marquise: atravessa por baixo, ↓ desce',
        'Q': 'telha que desaba',
        'T': 'mola',
        '^': 'espinhos no chão',
        'v': 'espinhos no teto',
        'O': 'serra parada',
        'H': 'serra que vai e volta (horizontal)',
        'U': 'serra que sobe e desce',
        'M': 'plataforma móvel (M seguidos = uma plataforma)',
        'S': 'início',
        'C': 'ponto de controle',
        ',': 'vírgula (coletável)',
        'E': 'coração (anda)',
        'D': 'drone do Inominável',
        'F': 'feiticeira (atira magia)',
        'I': 'o Inominável (fim da fase)',
    });
    const FIXOS = new Set(['#', 'X', '=', 'Q', 'T', '^', 'v']);

    // ------------------------------------------------------------ fases

    /** Lê a fase desenhada em texto e devolve o nível pronto para jogar. */
    function carregarFase(def) {
        const linhas = def.mapa.map((l) => l.replace(/\s+$/, ''));
        const largura = Math.max(...linhas.map((l) => l.length));
        const altura = linhas.length;
        const nivel = {
            id: def.id,
            nome: def.nome,
            dica: def.dica || '',
            largura,
            altura,
            larguraPx: largura * T,
            alturaPx: altura * T,
            grade: [],
            inicio: null,
            objetivo: null,
            checkpoints: [],
            virgulas: [],
            inimigos: [],
            serras: [],
            plataformas: [],
            temDinamicos: false,
        };
        for (let ty = 0; ty < altura; ty++) {
            const linha = [];
            for (let tx = 0; tx < largura; tx++) {
                const c = linhas[ty][tx] || '.';
                if (!(c in LEGENDA)) throw new Error(`Fase ${def.id}: letra desconhecida "${c}" em (${tx}, ${ty})`);
                linha.push(FIXOS.has(c) ? c : '.');
                const x = tx * T;
                const y = ty * T;
                const base = y + T;
                if (c === 'S') nivel.inicio = { x: x + (T - CONFIG.jogadorL) / 2, y: base - CONFIG.jogadorA };
                else if (c === 'I') nivel.objetivo = { x: x - 6, y: base - 50, w: 32, h: 50 };
                else if (c === 'C') nivel.checkpoints.push({ id: nivel.checkpoints.length, x: x + 4, y: base - 40, w: 12, h: 40 });
                else if (c === ',') nivel.virgulas.push({ id: nivel.virgulas.length, x: x + 4, y: y + 3, w: 12, h: 14 });
                else if (c === 'E') nivel.inimigos.push({ tipo: 'coracao', x: x + 1, y: base - INIMIGOS.coracao.h });
                else if (c === 'D') nivel.inimigos.push({ tipo: 'drone', x: x, y: y + 2 });
                else if (c === 'F') nivel.inimigos.push({ tipo: 'feiticeira', x: x, y: base - INIMIGOS.feiticeira.h });
                else if (c === 'O' || c === 'H' || c === 'U') {
                    nivel.serras.push({ tipo: c, cx: x + T / 2, cy: y + T / 2, fase: nivel.serras.length * 0.7 });
                    if (c !== 'O') nivel.temDinamicos = true;
                } else if (c === 'M' && linhas[ty][tx - 1] !== 'M') {
                    let n = 1;
                    while (linhas[ty][tx + n] === 'M') n++;
                    nivel.plataformas.push({ id: nivel.plataformas.length, x0: x, y: y, w: n * T, h: CONFIG.plataformaA });
                    nivel.temDinamicos = true;
                }
            }
            nivel.grade.push(linha);
        }
        if (!nivel.inicio) throw new Error(`Fase ${def.id}: falta o S (início)`);
        if (!nivel.objetivo) throw new Error(`Fase ${def.id}: falta o I (Inominável)`);
        return nivel;
    }

    // ------------------------------------------------------------ mundo

    const onda = (t, fase = 0) => Math.sin(((t / CONFIG.periodo) + fase) * Math.PI * 2);

    /** Posição de uma plataforma móvel no tempo t. */
    const posPlataforma = (p, t) => ({ x: p.x0 + CONFIG.amplitude * onda(t, p.id * 0.5), y: p.y, w: p.w, h: p.h });

    /** Centro de uma serra no tempo t. */
    function posSerra(s, t) {
        if (s.tipo === 'H') return { x: s.cx + CONFIG.amplitude * onda(t, s.fase), y: s.cy };
        if (s.tipo === 'U') return { x: s.cx, y: s.cy + CONFIG.amplitude * onda(t, s.fase) };
        return { x: s.cx, y: s.cy };
    }

    /**
     * O "mundo" que a física consulta: grade + telhas caídas + tempo.
     * `caidas` é um Map "tx,ty" → estado da telha (só no jogo de verdade).
     */
    function tileEm(nivel, tx, ty) {
        if (tx < 0 || tx >= nivel.largura) return '#'; // bordas da fase são paredes
        if (ty < 0 || ty >= nivel.altura) return '.';
        return nivel.grade[ty][tx];
    }

    function solido(mundo, tx, ty) {
        const c = tileEm(mundo.nivel, tx, ty);
        if (c === '#' || c === 'X' || c === 'T') return true;
        if (c === 'Q') return !(mundo.caidas && mundo.caidas.get(`${tx},${ty}`)?.caiu);
        return false;
    }

    const colide = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    function colideCirculo(r, cx, cy, raio) {
        const px = Math.max(r.x, Math.min(cx, r.x + r.w));
        const py = Math.max(r.y, Math.min(cy, r.y + r.h));
        return (px - cx) ** 2 + (py - cy) ** 2 < raio * raio;
    }

    // ------------------------------------------------------------ jogador

    function criarJogador(pos) {
        return {
            x: pos.x, y: pos.y, vx: 0, vy: 0,
            noChao: false,
            olhando: 1,
            coiote: 0,
            antecipado: 0,
            parede: 0,           // -1/1: encostado numa parede à esquerda/direita
            coiotaParede: 0,
            ultimaParede: 0,
            trava: 0,
            travaLado: 0,
            semCorte: false,     // mola e pisão: soltar o botão não corta a subida
            estado: 'normal',    // 'normal' | 'agarrado' | 'subindo'
            lado: 0,             // agarrado: lado da parede
            subir: null,
            largou: 0,
            plataforma: -1,
            descendo: 0,         // atravessando marquise para baixo
        };
    }

    const clonarJogador = (j) => ({ ...j, subir: j.subir && { ...j.subir } });

    const caixa = (j) => ({ x: j.x, y: j.y, w: CONFIG.jogadorL, h: CONFIG.jogadorA });
    const caixaPerigo = (j) => {
        const f = CONFIG.folgaPerigo;
        return { x: j.x + f, y: j.y + f, w: CONFIG.jogadorL - 2 * f, h: CONFIG.jogadorA - 2 * f };
    };

    /** Algum tile sólido na coluna tx entre as alturas y0..y1 (px)? */
    function paredeNaColuna(mundo, tx, y0, y1) {
        for (let ty = Math.floor(y0 / T); ty <= Math.floor((y1 - 0.001) / T); ty++) if (solido(mundo, tx, ty)) return true;
        return false;
    }

    function moverX(mundo, j, dx) {
        j.x += dx;
        const top = j.y + 0.5;
        const bot = j.y + CONFIG.jogadorA - 0.5;
        if (dx > 0) {
            const tx = Math.floor((j.x + CONFIG.jogadorL - 0.001) / T);
            if (paredeNaColuna(mundo, tx, top, bot)) { j.x = tx * T - CONFIG.jogadorL; j.vx = 0; }
        } else if (dx < 0) {
            const tx = Math.floor(j.x / T);
            if (paredeNaColuna(mundo, tx, top, bot)) { j.x = (tx + 1) * T; j.vx = 0; }
        }
    }

    /** Move na vertical; devolve o tile em que pousou (ou null). */
    function moverY(mundo, j, dy, t) {
        const antes = j.y + CONFIG.jogadorA;
        j.y += dy;
        const x0 = Math.floor((j.x + 0.5) / T);
        const x1 = Math.floor((j.x + CONFIG.jogadorL - 0.5) / T);
        if (dy > 0) {
            const base = j.y + CONFIG.jogadorA;
            const ty = Math.floor((base - 0.001) / T);
            let pouso = null;
            for (let tx = x0; tx <= x1; tx++) {
                const c = tileEm(mundo.nivel, tx, ty);
                const topo = ty * T;
                if (solido(mundo, tx, ty) || (c === '=' && antes <= topo + 0.01 && j.descendo <= 0)) {
                    if (!pouso || c === 'T') pouso = { c, tx, ty };
                }
            }
            if (pouso) {
                j.y = pouso.ty * T - CONFIG.jogadorA;
                j.vy = 0;
                j.noChao = true;
                return pouso;
            }
            // Plataformas móveis: só por cima.
            for (const p of mundo.nivel.plataformas) {
                const q = posPlataforma(p, t);
                if (antes <= q.y + 0.01 && base >= q.y && j.x + CONFIG.jogadorL > q.x && j.x < q.x + q.w) {
                    j.y = q.y - CONFIG.jogadorA;
                    j.vy = 0;
                    j.noChao = true;
                    j.plataforma = p.id;
                    return { c: 'M', plataforma: p.id };
                }
            }
        } else if (dy < 0) {
            const ty = Math.floor(j.y / T);
            for (let tx = x0; tx <= x1; tx++) {
                if (solido(mundo, tx, ty)) { j.y = (ty + 1) * T; j.vy = 0; break; }
            }
        }
        return null;
    }

    /** Parede encostada do lado `lado` (sem contar o chão e o teto). */
    function tocandoParede(mundo, j, lado) {
        const tx = lado > 0 ? Math.floor((j.x + CONFIG.jogadorL + 1) / T) : Math.floor((j.x - 1) / T);
        return paredeNaColuna(mundo, tx, j.y + 4, j.y + CONFIG.jogadorA - 4);
    }

    /** Tenta agarrar a quina do lado `lado`. Devolve true se agarrou. */
    function tentarAgarrar(mundo, j, lado) {
        const tx = lado > 0 ? Math.floor((j.x + CONFIG.jogadorL + 1) / T) : Math.floor((j.x - 1) / T);
        const tyMin = Math.floor((j.y - CONFIG.agarrarAbaixo) / T);
        const tyMax = Math.floor((j.y + CONFIG.agarrarAcima) / T) + 1;
        for (let ty = tyMin; ty <= tyMax; ty++) {
            const quina = ty * T;
            if (j.y < quina - CONFIG.agarrarAcima || j.y > quina + CONFIG.agarrarAbaixo) continue;
            if (!solido(mundo, tx, ty) || solido(mundo, tx, ty - 1)) continue;
            // A telha que desaba não serve de beirada (evita ficar pendurado no ar).
            if (tileEm(mundo.nivel, tx, ty) === 'Q') continue;
            // Espaço para o corpo pendurado (acima da quina, do lado de cá).
            const minhaColuna = lado > 0 ? Math.floor((j.x + CONFIG.jogadorL - 1) / T) : Math.floor(j.x / T);
            if (solido(mundo, minhaColuna, ty - 1)) continue;
            j.estado = 'agarrado';
            j.lado = lado;
            j.olhando = lado;
            j.x = lado > 0 ? tx * T - CONFIG.jogadorL : (tx + 1) * T;
            j.y = quina - 2;
            j.vx = 0;
            j.vy = 0;
            j.quinaX = tx;
            j.quinaY = ty;
            return true;
        }
        return false;
    }

    function pularDaParede(j, lado) {
        j.vx = -lado * CONFIG.paredeImpulsoX;
        j.vy = CONFIG.paredeImpulsoY;
        j.trava = CONFIG.travaParede;
        j.travaLado = lado;
        j.olhando = -lado;
        j.semCorte = false;
        j.antecipado = 0;
        j.coiotaParede = 0;
        j.estado = 'normal';
    }

    /**
     * Um passo de física do Degustador.
     * entrada: { esquerda, direita, cima, baixo, pulo (segurando), puloPedido (acabou de apertar) }.
     * Devolve a lista de acontecimentos do passo ('pulo', 'parede', 'mola', 'agarrou', 'subiu').
     */
    function passoJogador(mundo, j, e, dt, t) {
        const ev = [];
        if (e.puloPedido) j.antecipado = CONFIG.tempoAntecipado;
        const dir = (e.direita ? 1 : 0) - (e.esquerda ? 1 : 0);
        j.largou = Math.max(0, j.largou - dt);
        j.descendo = Math.max(0, j.descendo - dt);

        if (j.estado === 'subindo') {
            const s = j.subir;
            s.t += dt;
            const k = Math.min(1, s.t / CONFIG.tempoSubir);
            // Sobe primeiro, depois vai para cima da quina.
            const ky = Math.min(1, k * 1.6);
            const kx = Math.max(0, (k - 0.4) / 0.6);
            j.y = s.y0 + (s.y1 - s.y0) * ky;
            j.x = s.x0 + (s.x1 - s.x0) * kx;
            if (k >= 1) { j.estado = 'normal'; j.noChao = true; j.coiote = CONFIG.tempoCoiote; j.subir = null; ev.push('subiu'); }
            j.antecipado = Math.max(0, j.antecipado - dt);
            return ev;
        }

        if (j.estado === 'agarrado') {
            // A beirada pode sumir (telha) — aí cai.
            if (!solido(mundo, j.quinaX, j.quinaY)) { j.estado = 'normal'; return ev; }
            if (e.baixo) {
                j.estado = 'normal';
                j.largou = CONFIG.largarBeirada;
            } else if (j.antecipado > 0) {
                j.antecipado = 0;
                if (dir === -j.lado) { pularDaParede(j, j.lado); ev.push('parede'); } else subir(j, ev);
            } else if (e.cima) {
                subir(j, ev);
            }
            if (j.estado === 'agarrado') return ev;
        }

        // Corrida.
        let quer = dir;
        if (j.trava > 0) { j.trava -= dt; if (quer === j.travaLado) quer = 0; }
        if (quer !== 0) j.olhando = quer;
        const alvo = quer * CONFIG.velocidadeMax;
        if (quer !== 0) {
            const a = j.noChao ? CONFIG.acelChao : CONFIG.acelAr;
            // Virar no chão é instantâneo como em Meat Boy: freia com o atrito junto.
            const extra = j.noChao && Math.sign(j.vx) === -quer ? CONFIG.atritoChao : 0;
            j.vx += Math.sign(alvo - j.vx) * Math.min(Math.abs(alvo - j.vx), (a + extra) * dt);
        } else if (j.trava <= 0 || j.noChao) {
            const a = j.noChao ? CONFIG.atritoChao : CONFIG.atritoAr;
            j.vx -= Math.sign(j.vx) * Math.min(Math.abs(j.vx), a * dt);
        }

        // Pulos.
        if (j.noChao) j.coiote = CONFIG.tempoCoiote;
        else j.coiote = Math.max(0, j.coiote - dt);
        if (j.parede !== 0) { j.coiotaParede = CONFIG.coiotaParede; j.ultimaParede = j.parede; } else j.coiotaParede = Math.max(0, j.coiotaParede - dt);

        if (j.antecipado > 0) {
            if (j.noChao && e.baixo && embaixoEhMarquise(mundo, j)) {
                // ↓ + pulo em cima da marquise: desce por ela.
                j.descendo = 0.2;
                j.antecipado = 0;
                j.noChao = false;
            } else if (j.noChao || j.coiote > 0) {
                j.vy = CONFIG.impulso;
                j.noChao = false;
                j.coiote = 0;
                j.antecipado = 0;
                j.semCorte = false;
                ev.push('pulo');
            } else if (j.coiotaParede > 0) {
                pularDaParede(j, j.ultimaParede);
                ev.push('parede');
            }
        }
        j.antecipado = Math.max(0, j.antecipado - dt);
        if (j.noChao && e.baixo && embaixoEhMarquise(mundo, j) && j.descendo <= 0) {
            j.descendo = 0.2;
            j.noChao = false;
        }

        if (!e.pulo && !j.semCorte && j.vy < CONFIG.corteDoPulo) j.vy = CONFIG.corteDoPulo;
        if (j.vy >= 0) j.semCorte = false;

        j.vy = Math.min(j.vy + CONFIG.gravidade * dt, CONFIG.quedaMax);
        // Deslizar na parede: encostado, caindo e empurrando para ela.
        if (!j.noChao && j.parede !== 0 && dir === j.parede && j.vy > CONFIG.quedaParede) j.vy = CONFIG.quedaParede;

        // Plataforma móvel carrega quem está em cima.
        if (j.plataforma >= 0) {
            const p = mundo.nivel.plataformas[j.plataforma];
            const dx = posPlataforma(p, t + dt).x - posPlataforma(p, t).x;
            moverX(mundo, j, dx);
            j.plataforma = -1;
        }

        moverX(mundo, j, j.vx * dt);
        j.noChao = false;
        const pouso = moverY(mundo, j, j.vy * dt, t + dt);
        if (pouso && pouso.c === 'T') {
            j.vy = CONFIG.molaImpulso;
            j.noChao = false;
            j.semCorte = true;
            ev.push('mola');
        }
        if (pouso && pouso.c === 'Q' && mundo.pisarTelha) mundo.pisarTelha(pouso.tx, pouso.ty);

        // Paredes e beiradas (só no ar).
        j.parede = 0;
        if (!j.noChao) {
            if (tocandoParede(mundo, j, 1)) j.parede = 1;
            else if (tocandoParede(mundo, j, -1)) j.parede = -1;
            if (dir !== 0 && !e.baixo && j.largou <= 0 && j.vy >= CONFIG.agarrarVyMin && tentarAgarrar(mundo, j, dir)) ev.push('agarrou');
        }
        return ev;
    }

    function embaixoEhMarquise(mundo, j) {
        const ty = Math.floor((j.y + CONFIG.jogadorA + 1) / T);
        const x0 = Math.floor((j.x + 0.5) / T);
        const x1 = Math.floor((j.x + CONFIG.jogadorL - 0.5) / T);
        let marquise = false;
        for (let tx = x0; tx <= x1; tx++) {
            const c = tileEm(mundo.nivel, tx, ty);
            if (solido(mundo, tx, ty)) return false;
            if (c === '=') marquise = true;
        }
        return marquise;
    }

    function subir(j, ev) {
        const x1 = j.lado > 0 ? j.quinaX * T + 1 : (j.quinaX + 1) * T - CONFIG.jogadorL - 1;
        j.estado = 'subindo';
        j.subir = { t: 0, x0: j.x, y0: j.y, x1, y1: j.quinaY * T - CONFIG.jogadorA };
        j.vx = 0;
        j.vy = 0;
        ev.push('subindo');
    }

    /** Encostou num perigo fixo ou numa serra? (não inclui inimigos) */
    function tocouPerigo(nivel, j, t) {
        const c = caixaPerigo(j);
        const x0 = Math.floor(c.x / T), x1 = Math.floor((c.x + c.w) / T);
        const y0 = Math.floor(c.y / T), y1 = Math.floor((c.y + c.h) / T);
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const k = tileEm(nivel, tx, ty);
                if (k === '^' && colide(c, { x: tx * T + 2, y: ty * T + 9, w: T - 4, h: T - 9 })) return 'espinho';
                if (k === 'v' && colide(c, { x: tx * T + 2, y: ty * T, w: T - 4, h: T - 9 })) return 'espinho';
            }
        }
        for (const s of nivel.serras) {
            const p = posSerra(s, t);
            if (colideCirculo(c, p.x, p.y, CONFIG.raioSerra)) return 'serra';
        }
        if (j.y > nivel.alturaPx + 40) return 'queda';
        return null;
    }

    const chegou = (nivel, j) => colide(caixa(j), nivel.objetivo);

    // ------------------------------------------------------------ partida

    function criarJogo(defs) {
        return {
            defs,
            indice: 0,
            nivel: null,
            fase: 'menu',        // 'menu' | 'jogando' | 'morto' | 'vitoria'
            tempo: 0,            // relógio do mundo (serras, plataformas)
            tempoFase: 0,        // cronômetro da tentativa (não para nas mortes)
            mortes: 0,
            causa: null,
            morteT: 0,
            checkpoint: null,
            pegas: new Set(),    // vírgulas coletadas nesta tentativa
            jogador: null,
            inimigos: [],
            tiros: [],
            magias: [],
            caidas: new Map(),
            recargaTiro: 0,
            eventos: [],
            acumulado: 0,
        };
    }

    function mundoDo(jogo) {
        return {
            nivel: jogo.nivel,
            caidas: jogo.caidas,
            pisarTelha(tx, ty) {
                const k = `${tx},${ty}`;
                if (!jogo.caidas.has(k)) jogo.caidas.set(k, { t: 0, caiu: false });
            },
        };
    }

    function criarInimigos(nivel) {
        return nivel.inimigos.map((d, i) => ({
            ...d,
            ...INIMIGOS[d.tipo],
            x0: d.x,
            y0: d.y,
            vx: d.tipo === 'coracao' ? -CONFIG.coracaoVelocidade : 0,
            vy: 0,
            vida: INIMIGOS[d.tipo].vida,
            recarga: 1 + (i % 3) * 0.4,
            fase: i * 0.37,
            vivo: true,
        }));
    }

    function iniciarFase(jogo, indice) {
        jogo.indice = indice;
        jogo.nivel = carregarFase(jogo.defs[indice]);
        jogo.fase = 'jogando';
        jogo.tempo = 0;
        jogo.tempoFase = 0;
        jogo.mortes = 0;
        jogo.checkpoint = null;
        jogo.pegas = new Set();
        jogo.eventos = [];
        jogo.acumulado = 0;
        renascer(jogo);
    }

    /** Volta ao início (ou ao último ponto de controle) com tudo resetado. */
    function renascer(jogo) {
        const nivel = jogo.nivel;
        const pos = jogo.checkpoint
            ? { x: jogo.checkpoint.x + (12 - CONFIG.jogadorL) / 2, y: jogo.checkpoint.y + 40 - CONFIG.jogadorA }
            : nivel.inicio;
        jogo.jogador = criarJogador(pos);
        jogo.inimigos = criarInimigos(nivel);
        jogo.tiros = [];
        jogo.magias = [];
        jogo.caidas = new Map();
        jogo.recargaTiro = 0;
        jogo.fase = 'jogando';
        jogo.causa = null;
    }

    function morrer(jogo, causa) {
        if (jogo.fase !== 'jogando') return;
        jogo.fase = 'morto';
        jogo.causa = causa;
        jogo.morteT = 0;
        jogo.mortes++;
        jogo.eventos.push({ tipo: 'morte', causa, x: jogo.jogador.x + CONFIG.jogadorL / 2, y: jogo.jogador.y + CONFIG.jogadorA / 2 });
    }

    function atualizarTelhas(jogo, dt) {
        for (const [k, s] of jogo.caidas) {
            s.t += dt;
            if (!s.caiu && s.t >= CONFIG.tempoTelha) s.caiu = true;
            if (s.caiu && s.t >= CONFIG.tempoTelha + CONFIG.voltaTelha) {
                const [tx, ty] = k.split(',').map(Number);
                // Só volta se o Degustador não estiver no lugar.
                if (!colide(caixa(jogo.jogador), { x: tx * T, y: ty * T, w: T, h: T })) jogo.caidas.delete(k);
            }
        }
    }

    function atualizarInimigos(jogo, dt) {
        const mundo = mundoDo(jogo);
        const j = jogo.jogador;
        for (const d of jogo.inimigos) {
            if (!d.vivo) continue;
            if (d.tipo === 'coracao') {
                // Anda e vira na parede ou na beirada.
                d.vy = Math.min(d.vy + CONFIG.gravidade * dt, CONFIG.quedaMax);
                d.y += d.vy * dt;
                const baseTy = Math.floor((d.y + d.h) / T);
                const cols = [Math.floor(d.x / T), Math.floor((d.x + d.w - 0.01) / T)];
                if (cols.some((tx) => solido(mundo, tx, baseTy) || tileEm(jogo.nivel, tx, baseTy) === '=')) {
                    d.y = baseTy * T - d.h;
                    d.vy = 0;
                    const frente = d.vx > 0 ? Math.floor((d.x + d.w + 1) / T) : Math.floor((d.x - 1) / T);
                    const parede = solido(mundo, frente, Math.floor((d.y + d.h - 1) / T));
                    const semChao = !solido(mundo, frente, baseTy) && tileEm(jogo.nivel, frente, baseTy) !== '=';
                    if (parede || semChao) d.vx = -d.vx;
                }
                d.x += d.vx * dt;
                if (d.y > jogo.nivel.alturaPx + 40) d.vivo = false;
            } else if (d.tipo === 'drone') {
                d.x = d.x0 + CONFIG.droneAmplitude * onda(jogo.tempo, d.fase);
                d.y = d.y0 + 8 * Math.sin(jogo.tempo * 4 + d.fase * 6);
                d.vx = Math.cos(((jogo.tempo / CONFIG.periodo) + d.fase) * Math.PI * 2);
            } else if (d.tipo === 'feiticeira') {
                d.y = d.y0 + 3 * Math.sin(jogo.tempo * 3 + d.fase);
                const dx = j.x + CONFIG.jogadorL / 2 - (d.x + d.w / 2);
                const dy = j.y + CONFIG.jogadorA / 2 - (d.y + 8);
                d.vx = Math.sign(dx) || -1;
                d.recarga -= dt;
                if (d.recarga <= 0 && Math.hypot(dx, dy) < CONFIG.feiticeiraAlcance && jogo.fase === 'jogando') {
                    d.recarga = CONFIG.feiticeiraRecarga;
                    const n = Math.hypot(dx, dy) || 1;
                    jogo.magias.push({ x: d.x + d.w / 2, y: d.y + 8, vx: (dx / n) * CONFIG.magiaVelocidade, vy: (dy / n) * CONFIG.magiaVelocidade, vida: 4 });
                    jogo.eventos.push({ tipo: 'magia', x: d.x + d.w / 2, y: d.y + 8 });
                }
            }
        }
    }

    function atualizarTiros(jogo, dt) {
        const mundo = mundoDo(jogo);
        for (const b of jogo.tiros) {
            const passo = b.vx * dt;
            b.x += passo;
            b.andou += Math.abs(passo);
            if (b.andou > CONFIG.alcanceTiro || solido(mundo, Math.floor(b.x / T), Math.floor(b.y / T))) { b.fim = true; continue; }
            for (const d of jogo.inimigos) {
                if (!d.vivo || !colide({ x: b.x - 4, y: b.y - 2, w: 8, h: 4 }, d)) continue;
                b.fim = true;
                d.vida--;
                jogo.eventos.push({ tipo: 'acerto', x: b.x, y: b.y });
                if (d.vida <= 0) { d.vivo = false; jogo.eventos.push({ tipo: 'derrubou', inimigo: d.tipo, x: d.x + d.w / 2, y: d.y }); }
                break;
            }
        }
        jogo.tiros = jogo.tiros.filter((b) => !b.fim);
        for (const m of jogo.magias) {
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            m.vida -= dt;
            if (m.vida <= 0 || solido(mundo, Math.floor(m.x / T), Math.floor(m.y / T))) m.fim = true;
        }
        jogo.magias = jogo.magias.filter((m) => !m.fim);
    }

    function atirar(jogo) {
        const j = jogo.jogador;
        if (jogo.fase !== 'jogando' || j.estado !== 'normal' || jogo.recargaTiro > 0) return false;
        jogo.recargaTiro = 1 / CONFIG.cadencia;
        // Deslizando na parede, atira para longe dela.
        const lado = j.parede !== 0 && !j.noChao ? -j.parede : j.olhando;
        const x = lado > 0 ? j.x + CONFIG.jogadorL + 4 : j.x - 4;
        jogo.tiros.push({ x, y: j.y + CONFIG.alturaArma, vx: lado * CONFIG.velocidadeTiro, andou: 0 });
        jogo.eventos.push({ tipo: 'tiro', x, y: j.y + CONFIG.alturaArma, lado });
        return true;
    }

    function colisoesComInimigos(jogo, e) {
        const j = jogo.jogador;
        const cj = caixaPerigo(j);
        for (const d of jogo.inimigos) {
            if (!d.vivo || !colide(cj, d)) continue;
            const pes = j.y + CONFIG.jogadorA;
            if (j.vy > 0 && pes - d.y < 12) {
                // Pisão (Mario): derruba e quica.
                d.vivo = false;
                j.vy = e.pulo ? CONFIG.pisaoImpulsoSegurando : CONFIG.pisaoImpulso;
                j.semCorte = true;
                jogo.eventos.push({ tipo: 'pisao', inimigo: d.tipo, x: d.x + d.w / 2, y: d.y });
            } else {
                morrer(jogo, d.tipo);
                return;
            }
        }
        for (const m of jogo.magias) {
            if (colideCirculo(cj, m.x, m.y, CONFIG.magiaRaio)) { morrer(jogo, 'magia'); return; }
        }
    }

    function coletar(jogo) {
        const cj = caixa(jogo.jogador);
        for (const v of jogo.nivel.virgulas) {
            if (!jogo.pegas.has(v.id) && colide(cj, v)) {
                jogo.pegas.add(v.id);
                jogo.eventos.push({ tipo: 'virgula', x: v.x + v.w / 2, y: v.y + v.h / 2 });
            }
        }
        for (const c of jogo.nivel.checkpoints) {
            if (jogo.checkpoint !== c && colide(cj, c) && (!jogo.checkpoint || c.x > jogo.checkpoint.x || c.id > jogo.checkpoint.id)) {
                jogo.checkpoint = c;
                jogo.eventos.push({ tipo: 'checkpoint', x: c.x + c.w / 2, y: c.y });
            }
        }
    }

    /** Um passo fixo da partida. */
    function passo(jogo, e, dt) {
        jogo.tempo += dt;
        if (jogo.fase === 'morto') {
            jogo.tempoFase += dt;
            jogo.morteT += dt;
            atualizarTiros(jogo, dt);
            if (jogo.morteT >= CONFIG.tempoMorte) renascer(jogo);
            return;
        }
        if (jogo.fase !== 'jogando') return;
        jogo.tempoFase += dt;
        const j = jogo.jogador;
        const mundo = mundoDo(jogo);
        jogo.recargaTiro = Math.max(0, jogo.recargaTiro - dt);
        atualizarTelhas(jogo, dt);
        for (const tipo of passoJogador(mundo, j, e, dt, jogo.tempo - dt)) {
            jogo.eventos.push({ tipo, x: j.x + CONFIG.jogadorL / 2, y: j.y + CONFIG.jogadorA, lado: j.olhando });
        }
        e.puloPedido = false;
        if (e.tiro) atirar(jogo);
        atualizarInimigos(jogo, dt);
        atualizarTiros(jogo, dt);
        const perigo = tocouPerigo(jogo.nivel, j, jogo.tempo);
        if (perigo) { morrer(jogo, perigo); return; }
        colisoesComInimigos(jogo, e);
        if (jogo.fase !== 'jogando') return;
        coletar(jogo);
        if (chegou(jogo.nivel, j)) {
            jogo.fase = 'vitoria';
            jogo.eventos.push({ tipo: 'vitoria', x: jogo.nivel.objetivo.x, y: jogo.nivel.objetivo.y });
        }
    }

    /** Avança `dt` segundos em passos fixos (60 Hz e 144 Hz jogam igual). */
    function avancar(jogo, dt, entrada) {
        jogo.acumulado += Math.min(dt, 0.1);
        while (jogo.acumulado >= CONFIG.passo) {
            jogo.acumulado -= CONFIG.passo;
            passo(jogo, entrada, CONFIG.passo);
        }
    }

    return {
        CONFIG,
        INIMIGOS,
        LEGENDA,
        carregarFase,
        posPlataforma,
        posSerra,
        tileEm,
        solido,
        criarJogador,
        clonarJogador,
        passoJogador,
        tocouPerigo,
        chegou,
        criarJogo,
        iniciarFase,
        renascer,
        passo,
        avancar,
        atirar,
        alturaPulo: () => (CONFIG.impulso * CONFIG.impulso) / (2 * CONFIG.gravidade),
    };
});
