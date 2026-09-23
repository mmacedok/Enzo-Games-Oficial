// ============================================================================
// Contrato das regras da "Ronda nos Telhados" (js/ronda-core.js).
// O teste mais importante é o do robô: prova que o gerador de fases nunca
// cria um trecho impossível (buraco grande demais, subida alta demais, parede
// sem tempo para atirar).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/ronda-core.js');

const { CONFIG, TIPOS, criarJogo, reiniciar, pular, atirar, avancar, pontos, alcanceDoPulo, alturaPulo, velocidadeEm } = R;

function semente(valor) {
    let s = valor >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function rodar(jogo, segundos, hz, antesDoQuadro) {
    const quadros = Math.round(segundos * hz);
    for (let i = 0; i < quadros && jogo.fase !== 'fim'; i++) {
        antesDoQuadro?.(jogo);
        avancar(jogo, 1 / hz);
    }
}

/** Mundo controlado para testes de física: um prédio só (ou os informados). */
function mundo(jogo, predios, desafios = []) {
    jogo.predios = predios;
    jogo.desafios = desafios;
    // Congela o gerador empurrando o fim do último prédio para longe.
    const ultimo = predios[predios.length - 1];
    if (ultimo.x + ultimo.w < 5000) predios.push({ x: 99999, w: 10, topo: 300 });
}

const frente = () => CONFIG.jogadorX + CONFIG.jogadorL;

/** Tempo de um pulo cheio até subir `altura` px. */
const tempoParaSubir = (altura) => {
    const v0 = -CONFIG.impulso;
    const disc = v0 * v0 - 2 * CONFIG.gravidade * altura;
    return disc < 0 ? Infinity : (v0 - Math.sqrt(disc)) / CONFIG.gravidade;
};

/**
 * Robô que joga "como gente": olha o que vem à frente e pula ou atira.
 * Pula cheio a tempo de passar buracos e subir em telhados mais altos (sem
 * bater na fachada) e antes de obstáculos baixos; atira sem parar quando há
 * algo quebrável à frente.
 */
function robo(jogo) {
    const j = jogo.jogador;
    const v = jogo.velocidade;
    const base = j.y + CONFIG.jogadorA;
    const pes = CONFIG.jogadorX + CONFIG.folga;
    const atual = jogo.predios.find((p) => pes < p.x + p.w && pes + CONFIG.jogadorL - 2 * CONFIG.folga > p.x);
    let querPular = false;

    if (atual && j.noChao) {
        const proximo = jogo.predios[jogo.predios.indexOf(atual) + 1];
        const beira = atual.x + atual.w;
        if (proximo) {
            const subida = atual.topo - proximo.topo;
            const buraco = proximo.x - beira;
            // Tempo até a fachada seguinte ao pular agora: precisa já ter subido o bastante.
            const ateFachada = (proximo.x - frente()) / v;
            const precisa = subida > 0 ? tempoParaSubir(subida + 10) + 0.04 : 0;
            const alvo = Math.max(precisa, buraco > 1 ? buraco / v + 0.02 : 0);
            if ((buraco > 1 || subida > 0) && ateFachada <= alvo) querPular = true;
        }
        const baixo = jogo.desafios.find((d) => d.tipo === 'baixo' && d.x + d.w > pes && d.x - frente() < v * 0.12 && Math.abs(d.y + d.h - base) < 2);
        if (baixo) querPular = true;
    }
    if (querPular) { pular(jogo, true); pular(jogo, false); j.vy = Math.min(j.vy, CONFIG.impulso); }

    const quebravel = jogo.desafios.find((d) => d.vida > 0 && d.x + d.w > CONFIG.jogadorX && d.x - frente() < 600);
    if (quebravel) atirar(jogo);
}

// ------------------------------------------------------------------ física
test('números básicos: pulo de ~131 px, subida máxima cabe no pulo', () => {
    assert.ok(Math.abs(alturaPulo() - 131.27) < 0.1);
    assert.ok(CONFIG.subidaMax <= alturaPulo() * 0.71);
    assert.ok(Object.isFrozen(CONFIG) && Object.isFrozen(TIPOS));
    assert.ok(alcanceDoPulo(260, 0) > 170 && alcanceDoPulo(260, 0) < 190, 'pulo plano a 260 px/s alcança ~179 px');
    assert.ok(alcanceDoPulo(260, 90) < alcanceDoPulo(260, 0), 'subir encurta o pulo');
    assert.ok(alcanceDoPulo(260, -100) > alcanceDoPulo(260, 0), 'descer alonga o pulo');
    assert.equal(alcanceDoPulo(260, 200), 0, 'subida impossível');
});

test('velocidade sobe de 260 a 520 em 90 s e estabiliza', () => {
    assert.equal(velocidadeEm(0), 260);
    assert.equal(velocidadeEm(45), 390);
    assert.equal(velocidadeEm(90), 520);
    assert.equal(velocidadeEm(300), 520);
});

test('pronto: nada se mexe; o primeiro pulo começa a corrida', () => {
    const jogo = criarJogo(semente(1));
    const antes = JSON.stringify(jogo);
    rodar(jogo, 2, 60);
    assert.equal(JSON.stringify(jogo), antes);
    assert.equal(jogo.fase, 'pronto');
    pular(jogo, true);
    assert.equal(jogo.fase, 'correndo');
    assert.equal(jogo.jogador.vy, CONFIG.impulso);
});

test('começo tranquilo: 3 s só correndo, sem desafios no caminho', () => {
    const jogo = criarJogo(semente(2));
    pular(jogo, true); pular(jogo, false);
    rodar(jogo, 3, 60);
    assert.equal(jogo.fase, 'correndo');
});

test('segurar o pulo sobe mais que soltar cedo', () => {
    const alturaMax = (soltar) => {
        const jogo = criarJogo(semente(1));
        mundo(jogo, [{ x: -100, w: 20000, topo: 300 }]);
        pular(jogo, true);
        jogo.jogador.y = 300 - CONFIG.jogadorA;
        let menor = jogo.jogador.y;
        rodar(jogo, 0.6, 120, (j) => {
            if (soltar && j.tempo > 0.05) pular(j, false);
            menor = Math.min(menor, j.jogador.y);
        });
        return 300 - CONFIG.jogadorA - menor;
    };
    const cheio = alturaMax(false);
    const curto = alturaMax(true);
    assert.ok(Math.abs(cheio - alturaPulo()) < 4, `pulo cheio ~131: ${cheio}`);
    assert.ok(curto < cheio * 0.6, `pulo curto (${curto}) bem menor que o cheio (${cheio})`);
});

test('tolerância de beirada: ainda pula logo depois de sair do telhado', () => {
    // Anda até sair da beirada e pula 0,05 s depois: vale.
    const b = criarJogo(semente(1));
    pular(b, true); pular(b, false);
    mundo(b, [{ x: -100, w: CONFIG.jogadorX + 110, topo: 300 }, { x: CONFIG.jogadorX + 150, w: 20000, topo: 300 }]);
    b.jogador.y = 300 - CONFIG.jogadorA; b.jogador.vy = 0; b.jogador.noChao = true; b.jogador.pulou = false;
    let saiu = null;
    let pulouNoAr = false;
    rodar(b, 1.5, 120, (j) => {
        if (saiu === null && !j.jogador.noChao) saiu = j.tempo;
        if (saiu !== null && !pulouNoAr && j.tempo - saiu >= 0.05) { pular(j, true); pulouNoAr = j.jogador.vy === CONFIG.impulso; }
    });
    assert.ok(pulouNoAr, 'pulo aceito 0,05 s depois da beirada');

    const c = criarJogo(semente(1));
    pular(c, true); pular(c, false);
    mundo(c, [{ x: -100, w: CONFIG.jogadorX + 110, topo: 300 }]);
    c.jogador.y = 300 - CONFIG.jogadorA; c.jogador.vy = 0; c.jogador.noChao = true; c.jogador.pulou = false;
    let saiuC = null;
    let aceito = null;
    rodar(c, 1, 120, (j) => {
        if (saiuC === null && !j.jogador.noChao) saiuC = j.tempo;
        if (saiuC !== null && aceito === null && j.tempo - saiuC >= 0.2) { pular(j, true); aceito = j.jogador.vy === CONFIG.impulso; }
    });
    assert.equal(aceito, false, 'pulo 0,2 s depois da beirada não vale');
});

test('pulo antecipado: apertar pouco antes de pousar pula ao tocar o chão', () => {
    const jogo = criarJogo(semente(1));
    pular(jogo, true); pular(jogo, false);
    mundo(jogo, [{ x: -100, w: 20000, topo: 300 }]);
    jogo.jogador.y = 200; jogo.jogador.vy = 300; jogo.jogador.noChao = false; jogo.jogador.pulou = true;
    let pediu = false;
    let repulou = false;
    rodar(jogo, 0.5, 120, (j) => {
        const falta = 300 - (j.jogador.y + CONFIG.jogadorA);
        if (!pediu && falta > 0 && falta < j.jogador.vy * 0.08) { pular(j, true); pediu = true; }
        if (pediu && j.jogador.vy === CONFIG.impulso) repulou = true;
    });
    assert.ok(pediu && repulou, 'pulou de novo no pouso');
});

test('cair no buraco termina a partida (causa buraco)', () => {
    const jogo = criarJogo(semente(1));
    pular(jogo, true); pular(jogo, false);
    mundo(jogo, [{ x: -100, w: CONFIG.jogadorX + 150, topo: 300 }]);
    jogo.jogador.y = 260; jogo.jogador.vy = 0; jogo.jogador.noChao = true; jogo.jogador.pulou = false;
    rodar(jogo, 3, 60);
    assert.equal(jogo.fase, 'fim');
    assert.equal(jogo.causa, 'buraco');
});

test('bater na fachada de um prédio mais alto termina a partida (causa prédio)', () => {
    const jogo = criarJogo(semente(1));
    pular(jogo, true); pular(jogo, false);
    mundo(jogo, [{ x: -100, w: CONFIG.jogadorX + 200, topo: 300 }, { x: CONFIG.jogadorX + 100, w: 20000, topo: 200 }]);
    jogo.jogador.y = 260; jogo.jogador.vy = 0; jogo.jogador.noChao = true; jogo.jogador.pulou = false;
    rodar(jogo, 2, 60);
    assert.equal(jogo.fase, 'fim');
    assert.equal(jogo.causa, 'predio');
});

test('encostar num desafio termina a partida (causa desafio)', () => {
    const jogo = criarJogo(semente(1));
    pular(jogo, true); pular(jogo, false);
    const t = TIPOS.baixo;
    mundo(jogo, [{ x: -100, w: 20000, topo: 300 }], [{ tipo: 'baixo', x: CONFIG.jogadorX + 80, y: 300 - t.h, w: t.w, h: t.h, base: 300 - t.h, vida: 0, fase: 0 }]);
    jogo.jogador.y = 260; jogo.jogador.vy = 0; jogo.jogador.noChao = true; jogo.jogador.pulou = false;
    rodar(jogo, 2, 60);
    assert.equal(jogo.causa, 'desafio');
});

// -------------------------------------------------------------------- tiro
test('tiro respeita a cadência (6 por segundo) e não sai antes da corrida', () => {
    const jogo = criarJogo(semente(1));
    assert.equal(atirar(jogo), false, 'parado não atira');
    pular(jogo, true); pular(jogo, false);
    mundo(jogo, [{ x: -100, w: 20000, topo: 300 }]);
    let tiros = 0;
    rodar(jogo, 1, 120, (j) => { if (atirar(j)) tiros++; });
    assert.ok(tiros >= 6 && tiros <= 7, `tiros em 1 s: ${tiros}`);
});

test('parede cai com 3 tiros, pássaro com 1; cada um dá seu bônus', () => {
    for (const [tipo, tiros] of [['parede', 3], ['passaro', 1], ['drone', 2]]) {
        const jogo = criarJogo(semente(1));
        pular(jogo, true); pular(jogo, false);
        const t = TIPOS[tipo];
        const y = tipo === 'parede' ? 300 - t.h : 300 - 26 - t.h / 2;
        mundo(jogo, [{ x: -100, w: 20000, topo: 300 }], [{ tipo, x: CONFIG.jogadorX + 500, y, w: t.w, h: t.h, base: y, vida: t.vida, fase: 0 }]);
        jogo.jogador.y = 260; jogo.jogador.vy = 0; jogo.jogador.noChao = true; jogo.jogador.pulou = false;
        let disparos = 0;
        rodar(jogo, 1.2, 120, (j) => { if (j.desafios.some((d) => d.tipo === tipo) && disparos < tiros + 3 && atirar(j)) disparos++; });
        assert.equal(jogo.fase, 'correndo', `${tipo}: sobreviveu`);
        assert.ok(!jogo.desafios.some((d) => d.tipo === tipo), `${tipo}: destruído`);
        assert.equal(jogo.bonus, t.bonus, `${tipo}: bônus`);
    }
});

test('obstáculo baixo não quebra e não bloqueia o tiro', () => {
    const jogo = criarJogo(semente(1));
    pular(jogo, true); pular(jogo, false);
    const b = TIPOS.baixo;
    const p = TIPOS.parede;
    mundo(jogo, [{ x: -100, w: 20000, topo: 300 }], [
        { tipo: 'baixo', x: CONFIG.jogadorX + 300, y: 300 - b.h, w: b.w, h: b.h, base: 300 - b.h, vida: 0, fase: 0 },
        { tipo: 'parede', x: CONFIG.jogadorX + 380, y: 300 - p.h, w: p.w, h: p.h, base: 300 - p.h, vida: 3, fase: 0 },
    ]);
    jogo.jogador.y = 260; jogo.jogador.vy = 0; jogo.jogador.noChao = true; jogo.jogador.pulou = false;
    rodar(jogo, 0.9, 120, (j) => atirar(j));
    assert.ok(jogo.desafios.some((d) => d.tipo === 'baixo'), 'o baixo continua lá');
    assert.ok(!jogo.desafios.some((d) => d.tipo === 'parede'), 'a parede atrás dele caiu');
});

// ------------------------------------------------------------------ gerador
test('gerador: telhados nos limites, subidas e buracos sempre vencíveis', () => {
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const jogo = criarJogo(semente(s));
        pular(jogo, true); pular(jogo, false);
        const vistos = new Set();
        const checar = (j) => {
            j.jogador.y = Math.min(...j.predios.map((p) => p.topo)) - CONFIG.jogadorA - 200; // voa por cima de tudo
            j.jogador.vy = 0;
            j.desafios = j.desafios.filter((d) => d.x > CONFIG.jogadorX + 200 || d.x + d.w < CONFIG.jogadorX);
            for (let i = 1; i < j.predios.length; i++) {
                const p = j.predios[i];
                const a = j.predios[i - 1];
                if (vistos.has(p)) continue;
                vistos.add(p);
                assert.ok(p.topo >= CONFIG.topoMin && p.topo <= CONFIG.topoMax, 'telhado fora da tela');
                assert.ok(a.topo - p.topo <= CONFIG.subidaMax + 1e-9, `subida ${a.topo - p.topo}`);
                const buraco = p.x - (a.x + a.w);
                assert.ok(buraco <= CONFIG.margemBuraco * alcanceDoPulo(j.velocidade, a.topo - p.topo) + 1e-6, `buraco ${buraco} grande demais`);
            }
        };
        rodar(jogo, 120, 60, checar);
        assert.ok(vistos.size > 60, `semente ${s}: gerou prédios suficientes (${vistos.size})`);
    }
});

test('um robô consegue correr 2 minutos: toda fase gerada é vencível', () => {
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const jogo = criarJogo(semente(s));
        pular(jogo, true); pular(jogo, false);
        rodar(jogo, 120, 60, robo);
        assert.equal(jogo.fase, 'correndo', `semente ${s}: robô perdeu (${jogo.causa}) aos ${jogo.tempo.toFixed(1)} s`);
        assert.ok(jogo.bonus > 0, `semente ${s}: destruiu desafios`);
    }
});

// ------------------------------------------------------------- tempo e fim
test('mesma partida em 60 Hz e 144 Hz dá o mesmo resultado', () => {
    const a = criarJogo(semente(4));
    const b = criarJogo(semente(4));
    pular(a, true); pular(a, false);
    pular(b, true); pular(b, false);
    rodar(a, 2, 60);
    rodar(b, 2, 144);
    assert.ok(Math.abs(a.distancia - b.distancia) < 1, `distância ${a.distancia} vs ${b.distancia}`);
    assert.ok(Math.abs(a.jogador.y - b.jogador.y) < 1);
    assert.equal(a.predios.length, b.predios.length);
});

test('pontos = metros + bônus; no fim nada muda; reiniciar volta ao começo', () => {
    const jogo = criarJogo(semente(1));
    pular(jogo, true); pular(jogo, false);
    mundo(jogo, [{ x: -100, w: CONFIG.jogadorX + 400, topo: 300 }]);
    jogo.jogador.y = 260; jogo.jogador.noChao = true; jogo.jogador.pulou = false;
    jogo.bonus = 50;
    rodar(jogo, 5, 60);
    assert.equal(jogo.fase, 'fim');
    assert.equal(pontos(jogo), Math.floor(jogo.distancia / 20) + 50);
    const congelado = JSON.stringify(jogo);
    pular(jogo, true); atirar(jogo); rodar(jogo, 1, 60);
    assert.equal(JSON.stringify(jogo), congelado);
    reiniciar(jogo);
    assert.equal(jogo.fase, 'pronto');
    assert.equal(pontos(jogo), 0);
    assert.equal(jogo.desafios.length, 0);
});
