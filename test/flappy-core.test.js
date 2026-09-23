// ============================================================================
// Contrato das regras do Flappy Enzo (js/flappy-core.js).
// Estes testes definem o comportamento; o código existe para fazê-los passar.
// Unidades lógicas: tela 360×640, tempo em segundos, velocidade em px/s.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const Flappy = require('../js/flappy-core.js');

const { CONFIG, criarJogo, tocar, avancar, reiniciar, retangulosTalher, colideCirculoRetangulo } = Flappy;

/** Gerador pseudoaleatório previsível (mesma semente = mesma sequência). */
function semente(valor) {
    let s = valor >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

/** Avança `segundos` em quadros de `hz` (como o navegador faria). */
function rodar(jogo, segundos, hz, antesDoQuadro) {
    const quadros = Math.round(segundos * hz);
    for (let i = 0; i < quadros; i++) {
        antesDoQuadro?.(jogo);
        avancar(jogo, 1 / hz);
    }
}

/** Robô: bate asa quando está abaixo do centro do próximo vão e caindo. */
function robo(jogo) {
    const proximo = jogo.talheres.find(t => t.x + CONFIG.larguraTalher >= CONFIG.enzoX - CONFIG.raioEnzo);
    const alvo = proximo ? proximo.vaoY + 12 : CONFIG.altura * 0.45;
    if (jogo.fase === 'jogando' && jogo.y > alvo && jogo.vy >= 0) tocar(jogo);
}

// ------------------------------------------------------------------ config
test('CONFIG tem os valores do plano', () => {
    assert.equal(CONFIG.largura, 360);
    assert.equal(CONFIG.altura, 640);
    assert.equal(CONFIG.chao, 560);
    assert.equal(CONFIG.gravidade, 1500);
    assert.equal(CONFIG.impulso, -430);
    assert.equal(CONFIG.quedaMax, 620);
    assert.equal(CONFIG.velocidade, 150);
    assert.equal(CONFIG.vao, 150);
    assert.equal(CONFIG.distancia, 210);
    assert.equal(CONFIG.margem, 60);
    assert.equal(CONFIG.mudancaMaxVao, 120);
    assert.equal(CONFIG.larguraTalher, 64);
    assert.equal(CONFIG.enzoX, 100);
    assert.equal(CONFIG.raioEnzo, 18);
    assert.equal(CONFIG.inicioY, 280);
    assert.equal(CONFIG.passo, 1 / 120);
    assert.ok(Object.isFrozen(CONFIG), 'CONFIG não pode ser alterado por acidente');
});

// --------------------------------------------------------- estado inicial
test('jogo novo começa pronto, parado e sem talheres', () => {
    const jogo = criarJogo(semente(1));
    assert.equal(jogo.fase, 'pronto');
    assert.equal(jogo.pontos, 0);
    assert.equal(jogo.y, CONFIG.inicioY);
    assert.equal(jogo.vy, 0);
    assert.deepEqual(jogo.talheres, []);
});

test('pronto: o tempo passa mas o Enzo não cai e nada aparece', () => {
    const jogo = criarJogo(semente(1));
    rodar(jogo, 3, 60);
    assert.equal(jogo.fase, 'pronto');
    assert.equal(jogo.y, CONFIG.inicioY);
    assert.deepEqual(jogo.talheres, []);
});

// -------------------------------------------------------------- controles
test('primeiro toque começa o jogo com impulso e cria o primeiro talher fora da tela', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    assert.equal(jogo.fase, 'jogando');
    assert.equal(jogo.vy, CONFIG.impulso);
    assert.equal(jogo.talheres.length, 1);
    assert.ok(jogo.talheres[0].x >= CONFIG.largura, 'nasce à direita, fora da tela');
    assert.equal(jogo.talheres[0].contado, false);
});

test('toque substitui a velocidade (não acumula)', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    tocar(jogo);
    tocar(jogo);
    assert.equal(jogo.vy, CONFIG.impulso);
});

// ---------------------------------------------------------------- física
test('gravidade acelera a queda até o limite', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    const yInicial = jogo.y;
    rodar(jogo, 0.1, 60);
    assert.ok(jogo.y < yInicial, 'logo após o toque, sobe');
    assert.ok(jogo.vy > CONFIG.impulso, 'a gravidade freia a subida');
    const maisTarde = criarJogo(semente(1));
    tocar(maisTarde);
    maisTarde.y = 40; // bem alto, para ter tempo de acelerar sem bater no chão
    rodar(maisTarde, 0.8, 60);
    assert.ok(maisTarde.vy <= CONFIG.quedaMax, 'nunca passa da queda máxima');
    assert.equal(maisTarde.vy, CONFIG.quedaMax, 'depois de um tempo, cai na velocidade máxima');
});

test('teto não mata: o Enzo fica preso no topo', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    jogo.talheres = []; // sem obstáculos para isolar o teste
    rodar(jogo, 1.5, 60, j => { j.talheres = []; tocar(j); });
    assert.equal(jogo.fase, 'jogando');
    assert.ok(jogo.y >= CONFIG.raioEnzo, 'nunca sai pelo topo');
});

test('chão mata: sem tocar, o jogo termina com o Enzo apoiado no chão', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    rodar(jogo, 3, 60);
    assert.equal(jogo.fase, 'fim');
    assert.equal(jogo.y, CONFIG.chao - CONFIG.raioEnzo);
});

test('mesma partida em 60 Hz e 144 Hz dá o mesmo resultado', () => {
    const a = criarJogo(semente(7));
    const b = criarJogo(semente(7));
    tocar(a);
    tocar(b);
    a.y = b.y = 40; // alto o bastante para não bater no chão nem em talher
    rodar(a, 0.9, 60);
    rodar(b, 0.9, 144);
    assert.ok(Math.abs(a.y - b.y) < 0.5, `y: ${a.y} vs ${b.y}`);
    assert.ok(Math.abs(a.vy - b.vy) < 1, `vy: ${a.vy} vs ${b.vy}`);
    assert.equal(a.talheres.length, b.talheres.length);
});

test('avancar ignora travadas longas (no máximo 0,25 s simulados por chamada)', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    jogo.y = 40;
    avancar(jogo, 10);
    const referencia = criarJogo(semente(1));
    tocar(referencia);
    referencia.y = 40;
    avancar(referencia, 0.25);
    assert.ok(Math.abs(jogo.y - referencia.y) < 0.5);
    assert.equal(jogo.fase, 'jogando');
});

// -------------------------------------------------------------- talheres
test('talheres andam para a esquerda, com distância constante, e somem ao sair da tela', () => {
    const jogo = criarJogo(semente(3));
    tocar(jogo);
    rodar(jogo, 12, 60, j => { j.y = 280; j.vy = 0; j.talheres.forEach(t => { t.vaoY = 280; }); });
    const xs = jogo.talheres.map(t => t.x);
    for (let i = 1; i < xs.length; i++) {
        const espaco = xs[i] - xs[i - 1];
        assert.ok(Math.abs(espaco - CONFIG.distancia) <= CONFIG.velocidade * CONFIG.passo + 0.01, `espaço ${espaco}`);
    }
    assert.ok(jogo.talheres.every(t => t.x + CONFIG.larguraTalher > -1), 'os que saíram da tela foram removidos');
    assert.ok(jogo.talheres.length <= Math.ceil((CONFIG.largura + CONFIG.larguraTalher * 2) / CONFIG.distancia) + 1);
});

test('todo vão fica dentro dos limites e é alcançável a partir do anterior', () => {
    const minimo = CONFIG.margem + CONFIG.vao / 2;
    const maximo = CONFIG.chao - CONFIG.margem - CONFIG.vao / 2;
    const extremos = [() => 0, () => 0.9999999, semente(11), semente(99)];
    for (const aleatorio of extremos) {
        const jogo = criarJogo(aleatorio);
        tocar(jogo);
        const vaos = [];
        rodar(jogo, 80, 60, j => {
            for (const t of j.talheres) if (!vaos.includes(t)) vaos.push(t);
            // Mantém o Enzo vivo no vão do talher mais próximo: aqui só importam os vãos.
            const alvo = j.talheres.find(t => t.x + CONFIG.larguraTalher >= CONFIG.enzoX - CONFIG.raioEnzo - 5);
            j.y = alvo ? alvo.vaoY : 280;
            j.vy = 0;
        });
        assert.ok(vaos.length > 50, 'gerou vários talheres');
        vaos.forEach((t, i) => {
            assert.ok(t.vaoY >= minimo && t.vaoY <= maximo, `vão fora dos limites: ${t.vaoY}`);
            if (i > 0) assert.ok(Math.abs(t.vaoY - vaos[i - 1].vaoY) <= CONFIG.mudancaMaxVao, 'mudança de altura grande demais');
        });
    }
});

test('geometria: os dois retângulos cobrem tudo menos o vão, do teto ao chão', () => {
    const talher = { x: 200, vaoY: 300, contado: false };
    const { garfo, faca } = retangulosTalher(talher);
    assert.deepEqual(garfo, { x: 200, y: 0, w: CONFIG.larguraTalher, h: 300 - CONFIG.vao / 2 });
    assert.deepEqual(faca, { x: 200, y: 300 + CONFIG.vao / 2, w: CONFIG.larguraTalher, h: CONFIG.chao - (300 + CONFIG.vao / 2) });
    assert.equal(garfo.h + CONFIG.vao + faca.h, CONFIG.chao);
});

// -------------------------------------------------------------- colisão
test('colisão círculo × retângulo', () => {
    const r = { x: 100, y: 100, w: 50, h: 50 };
    assert.equal(colideCirculoRetangulo(125, 125, 10, r), true, 'centro dentro');
    assert.equal(colideCirculoRetangulo(95, 125, 10, r), true, 'encostando na lateral');
    assert.equal(colideCirculoRetangulo(89, 125, 10, r), false, 'a 11 px da lateral');
    assert.equal(colideCirculoRetangulo(93, 93, 10, r), true, 'perto do canto (distância ~9,9)');
    assert.equal(colideCirculoRetangulo(92, 92, 10, r), false, 'fora do canto (distância ~11,3)');
});

test('bater num talher termina o jogo; passar pelo meio do vão não', () => {
    const batendo = criarJogo(semente(1));
    tocar(batendo);
    batendo.talheres = [{ x: CONFIG.enzoX - 10, vaoY: 450, contado: false }];
    batendo.y = 200; batendo.vy = 0;
    avancar(batendo, CONFIG.passo);
    assert.equal(batendo.fase, 'fim');

    const passando = criarJogo(semente(1));
    tocar(passando);
    passando.talheres = [{ x: CONFIG.enzoX - 10, vaoY: 300, contado: false }];
    passando.y = 300; passando.vy = 0;
    avancar(passando, CONFIG.passo);
    assert.equal(passando.fase, 'jogando');
});

// ---------------------------------------------------------------- pontos
test('um ponto por talher, contado uma única vez, quando o Enzo passa por inteiro', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    const t = { x: CONFIG.enzoX - CONFIG.raioEnzo - CONFIG.larguraTalher + 1, vaoY: 300, contado: false };
    jogo.talheres = [t];
    jogo.y = 300; jogo.vy = 0;
    avancar(jogo, CONFIG.passo);
    assert.equal(jogo.pontos, 1);
    assert.equal(t.contado, true);
    for (let i = 0; i < 20; i++) { jogo.y = 300; jogo.vy = 0; avancar(jogo, CONFIG.passo); }
    assert.equal(jogo.pontos, 1, 'não conta de novo');
});

test('um robô simples consegue jogar: o jogo é atravessável', () => {
    for (const s of [1, 2, 3, 4, 5]) {
        const jogo = criarJogo(semente(s));
        tocar(jogo);
        rodar(jogo, 60, 60, robo);
        assert.equal(jogo.fase, 'jogando', `semente ${s}: o robô morreu com ${jogo.pontos} pontos`);
        assert.ok(jogo.pontos >= 30, `semente ${s}: só ${jogo.pontos} pontos em 60 s`);
    }
});

// ------------------------------------------------------------ fim e volta
test('no fim, tocar não faz nada; reiniciar volta ao começo', () => {
    const jogo = criarJogo(semente(1));
    tocar(jogo);
    rodar(jogo, 3, 60);
    assert.equal(jogo.fase, 'fim');
    const antes = JSON.stringify(jogo);
    tocar(jogo);
    rodar(jogo, 1, 60);
    assert.equal(JSON.stringify(jogo), antes, 'estado congelado no fim');
    reiniciar(jogo);
    assert.equal(jogo.fase, 'pronto');
    assert.equal(jogo.pontos, 0);
    assert.equal(jogo.y, CONFIG.inicioY);
    assert.equal(jogo.vy, 0);
    assert.deepEqual(jogo.talheres, []);
});
