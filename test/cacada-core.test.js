// ============================================================================
// Contrato das regras da "Caçada ao Inominável" (js/cacada-core.js).
// O teste mais importante é o do robô: prova que toda fase dá para passar
// com a física de verdade (tools/cacada-robo.js).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/cacada-core.js');
const FASES = require('../js/cacada-fases.js');
const { resolver } = require('../tools/cacada-robo.js');

const { CONFIG } = C;
const T = CONFIG.tile;

/** Fase de teste a partir de linhas de texto. */
const nivel = (mapa) => C.carregarFase({ id: 'teste', nome: 'teste', mapa });

/** Roda `segundos` de física com a entrada dada (função do tempo ou objeto fixo). */
function rodar(nv, j, segundos, entrada = {}) {
    const mundo = { nivel: nv };
    let t = 0;
    let pedido = false;
    const passos = Math.round(segundos / CONFIG.passo);
    for (let i = 0; i < passos; i++) {
        const e = { ...(typeof entrada === 'function' ? entrada(t, j) : entrada) };
        // puloPedido só vale no primeiro passo em que aparece.
        if (e.puloPedido && pedido) e.puloPedido = false;
        pedido = !!e.puloPedido;
        C.passoJogador(mundo, j, e, CONFIG.passo, t);
        t += CONFIG.passo;
    }
    return j;
}

const CHAO_LIVRE = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '.S.......I',
    '##########',
];

test('todas as fases carregam: início, Inominável e só letras da legenda', () => {
    assert.ok(FASES.length >= 6);
    const ids = new Set();
    for (const def of FASES) {
        const nv = C.carregarFase(def);
        assert.ok(!ids.has(def.id), `id repetido ${def.id}`);
        ids.add(def.id);
        assert.ok(nv.inicio && nv.objetivo, def.id);
        assert.ok(nv.altura * T >= CONFIG.altura, `${def.id}: fase mais baixa que a tela`);
        assert.ok(def.nome && def.dica, `${def.id}: falta nome ou dica`);
        assert.ok(nv.virgulas.length > 0, `${def.id}: sem vírgulas`);
    }
});

test('letra desconhecida no mapa é erro (pega erro de digitação)', () => {
    assert.throws(() => nivel(['S.I', '#?#']), /desconhecida/);
    assert.throws(() => nivel(['..I', '###']), /falta o S/);
});

test('pulo cheio sobe ~4 tiles e soltar cedo pula mais baixo', () => {
    assert.ok(Math.abs(C.alturaPulo() - 4 * T) < 4, `altura ${C.alturaPulo()}`);
    const nv = nivel(CHAO_LIVRE);
    const alto = (segurar) => {
        const j = C.criarJogador(nv.inicio);
        rodar(nv, j, 0.1);
        const y0 = j.y;
        let topo = y0;
        rodar(nv, j, 0.8, (t) => {
            topo = Math.min(topo, j.y);
            return { pulo: t < segurar, puloPedido: t < 0.01 };
        });
        return y0 - topo;
    };
    const cheio = alto(1);
    const curto = alto(0.05);
    assert.ok(cheio > 75 && cheio < 90, `pulo cheio ${cheio}`);
    assert.ok(curto < cheio * 0.6, `pulo curto ${curto}`);
});

test('tolerância da beirada (pulo coiote)', () => {
    const nv2 = nivel([
        '..........',
        '..........',
        '..........',
        '..........',
        '..........',
        '..........',
        '..........',
        '.S.......I',
        '###.......',
    ]);
    // Coiote: já saiu da beirada (no ar) e o pulo ainda vale.
    const k = C.criarJogador(nv2.inicio);
    const mundo = { nivel: nv2 };
    let t = 0;
    let pulouNoAr = false;
    for (let i = 0; i < 120 && !pulouNoAr; i++, t += CONFIG.passo) {
        const noAr = !k.noChao && k.x > 3 * T;
        const ev = C.passoJogador(mundo, k, { direita: true, pulo: noAr, puloPedido: noAr }, CONFIG.passo, t);
        if (noAr && ev.includes('pulo')) pulouNoAr = true;
    }
    assert.ok(pulouNoAr, 'pulou depois de sair da beirada');
    assert.ok(k.vy < -400);
});

test('parede: desliza devagar e o pulo na parede empurra para longe', () => {
    const nv = nivel([
        '.....#....',
        '.....#....',
        '.....#....',
        '.....#....',
        '.....#....',
        '.....#....',
        '.....#....',
        '.S...#...I',
        '##########',
    ]);
    const j = C.criarJogador({ x: 5 * T - CONFIG.jogadorL, y: 50 });
    rodar(nv, j, 0.5, { direita: true });
    assert.equal(j.parede, 1);
    assert.ok(j.vy <= CONFIG.quedaParede + 1, `desliza ${j.vy}`);
    rodar(nv, j, CONFIG.passo, { direita: true, pulo: true, puloPedido: true });
    assert.ok(j.vx < -150, `empurrou para a esquerda ${j.vx}`);
    assert.ok(j.vy < -400, `subiu ${j.vy}`);
});

test('chaminé de 3 tiles: sobe só pulando de parede em parede', () => {
    const mapa = ['........I..'];
    for (let i = 0; i < 20; i++) mapa.push('####...####');
    mapa.push('####S..####', '###########');
    const r = resolver({ id: 'chamine', nome: 'x', mapa });
    assert.ok(r.ok, 'o robô sobe a chaminé');
});

test('beirada: parede de 5 tiles só se sobe agarrando a quina', () => {
    const mapa = [
        '..................',
        '..................',
        '..................',
        '..................',
        '..........I.......',
        '.........#########',
        '.........#########',
        '.........#########',
        '.........#########',
        '.S.......#########',
        '##################',
    ];
    const nv = nivel(mapa);
    const j = C.criarJogador(nv.inicio);
    const eventos = [];
    const mundo = { nivel: nv };
    let t = 0;
    for (let i = 0; i < 360; i++) {
        const e = { direita: true, pulo: true, puloPedido: j.noChao && j.x > 6.5 * T };
        eventos.push(...C.passoJogador(mundo, j, e, CONFIG.passo, t));
        t += CONFIG.passo;
        if (j.estado === 'agarrado') break;
    }
    assert.ok(eventos.includes('agarrou'), 'agarrou a quina');
    assert.equal(j.estado, 'agarrado');
    // ↑ sobe para cima do paredão.
    for (let i = 0; i < 60; i++) { C.passoJogador(mundo, j, { cima: true }, CONFIG.passo, t); t += CONFIG.passo; }
    assert.equal(j.estado, 'normal');
    assert.ok(j.y + CONFIG.jogadorA <= 5 * T + 0.5 && j.x >= 9 * T - 2, `em cima (${j.x}, ${j.y})`);
    // Sem agarrar (só pulo cheio, sem direção na hora de subir) não passa: 5 tiles > pulo.
    assert.ok(C.alturaPulo() < 5 * T);
});

test('marquise: sobe por baixo, pisa em cima e ↓ desce', () => {
    const nv = nivel([
        '..........',
        '..........',
        '..........',
        '..........',
        '...===....',
        '..........',
        '..........',
        '.S.......I',
        '##########',
    ]);
    const j = C.criarJogador({ x: 3 * T + 2, y: 7 * T + T - CONFIG.jogadorA });
    rodar(nv, j, 0.05);
    rodar(nv, j, 0.9, (t) => ({ pulo: true, puloPedido: t < 0.01 }));
    assert.ok(j.noChao && Math.abs(j.y + CONFIG.jogadorA - 4 * T) < 0.5, `em cima da marquise ${j.y}`);
    rodar(nv, j, 0.6, { baixo: true });
    assert.ok(j.y + CONFIG.jogadorA > 6 * T, 'desceu pela marquise');
});

test('mola joga bem mais alto que o pulo', () => {
    const nv = nivel(CHAO_LIVRE.map((l, i) => (i === 7 ? '.S.T.....I' : l)));
    const j = C.criarJogador({ x: 3 * T + 3, y: 20 });
    let topo = Infinity;
    const eventos = [];
    const mundo = { nivel: nv };
    for (let i = 0, t = 0; i < 240; i++, t += CONFIG.passo) {
        eventos.push(...C.passoJogador(mundo, j, {}, CONFIG.passo, t));
        if (eventos.includes('mola')) topo = Math.min(topo, j.y);
    }
    assert.ok(eventos.includes('mola'));
    assert.ok(7 * T - topo > C.alturaPulo() * 1.5, `subiu ${7 * T - topo}`);
});

test('espinhos, serra e queda matam; o Inominável termina a fase', () => {
    const jogo = C.criarJogo([{ id: 'x', nome: 'x', dica: 'x', mapa: ['..........', '.S.^.....I', '##########', '..........'] }]);
    C.iniciarFase(jogo, 0);
    const e = { direita: true };
    for (let i = 0; i < 120 && jogo.fase === 'jogando'; i++) C.passo(jogo, e, CONFIG.passo);
    assert.equal(jogo.fase, 'morto');
    assert.equal(jogo.causa, 'espinho');
    assert.equal(jogo.mortes, 1);
    for (let i = 0; i < 120 && jogo.fase !== 'jogando'; i++) C.passo(jogo, {}, CONFIG.passo);
    assert.equal(jogo.fase, 'jogando', 'renasce sozinho');
    assert.deepEqual([jogo.jogador.x, jogo.jogador.y], [jogo.nivel.inicio.x, jogo.nivel.inicio.y]);

    const vit = C.criarJogo([{ id: 'x', nome: 'x', dica: 'x', mapa: ['..........', '.S......I.', '##########'] }]);
    C.iniciarFase(vit, 0);
    for (let i = 0; i < 600 && vit.fase === 'jogando'; i++) C.passo(vit, { direita: true }, CONFIG.passo);
    assert.equal(vit.fase, 'vitoria');
});

test('ponto de controle: renasce nele e as vírgulas pegas continuam', () => {
    const jogo = C.criarJogo([{ id: 'x', nome: 'x', dica: 'x', mapa: ['..........', '.S,C.^...I', '##########'] }]);
    C.iniciarFase(jogo, 0);
    for (let i = 0; i < 240 && jogo.fase === 'jogando'; i++) C.passo(jogo, { direita: true }, CONFIG.passo);
    assert.equal(jogo.fase, 'morto');
    assert.equal(jogo.pegas.size, 1);
    for (let i = 0; i < 120 && jogo.fase !== 'jogando'; i++) C.passo(jogo, {}, CONFIG.passo);
    assert.ok(jogo.checkpoint);
    assert.ok(Math.abs(jogo.jogador.x - 3 * T) < T, 'renasceu no ponto de controle');
    assert.equal(jogo.pegas.size, 1);
});

test('inimigos: pisão derruba e quica; encostar de lado mata; tiro derruba', () => {
    const mapa = ['..........', '..........', '.S....E..I', '##########'];
    // De lado.
    const lado = C.criarJogo([{ id: 'x', nome: 'x', dica: 'x', mapa }]);
    C.iniciarFase(lado, 0);
    for (let i = 0; i < 240 && lado.fase === 'jogando'; i++) C.passo(lado, { direita: true }, CONFIG.passo);
    assert.equal(lado.fase, 'morto');
    assert.equal(lado.causa, 'coracao');
    // Pisão: cai em cima.
    const pisa = C.criarJogo([{ id: 'x', nome: 'x', dica: 'x', mapa }]);
    C.iniciarFase(pisa, 0);
    const d = pisa.inimigos[0];
    d.vx = 0;
    pisa.jogador.x = d.x + 2;
    pisa.jogador.y = d.y - 60;
    let quicou = false;
    for (let i = 0; i < 120; i++) {
        C.passo(pisa, {}, CONFIG.passo);
        if (pisa.eventos.some((e) => e.tipo === 'pisao')) quicou = true;
        if (quicou) break;
    }
    assert.ok(quicou && !d.vivo && pisa.jogador.vy < 0 && pisa.fase === 'jogando');
    // Tiro: 2 tiros no coração.
    const tiro = C.criarJogo([{ id: 'x', nome: 'x', dica: 'x', mapa }]);
    C.iniciarFase(tiro, 0);
    tiro.inimigos[0].vx = 0;
    for (let i = 0; i < 120; i++) C.passo(tiro, { tiro: true }, CONFIG.passo);
    assert.equal(tiro.inimigos[0].vivo, false);
    assert.equal(tiro.fase, 'jogando');
});

test('passo fixo: 60 Hz e 144 Hz dão a mesma partida', () => {
    const final = (hz) => {
        const jogo = C.criarJogo(FASES);
        C.iniciarFase(jogo, 0);
        const e = { direita: true, pulo: true };
        for (let i = 0; i < hz * 3; i++) {
            if (i % Math.round(hz / 2) === 0) e.puloPedido = true;
            C.avancar(jogo, 1 / hz, e);
        }
        return jogo;
    };
    const a = final(60);
    const b = final(144);
    assert.ok(Math.abs(a.jogador.x - b.jogador.x) < 12, `${a.jogador.x} vs ${b.jogador.x}`);
    assert.equal(a.mortes, b.mortes);
});

test('robô: toda fase tem caminho do início até o Inominável', { timeout: 300000 }, () => {
    for (const def of FASES) {
        const r = resolver(def);
        assert.ok(r.ok, `${def.id} ${def.nome}: o robô não achou caminho (${r.nos} nós)`);
    }
});
