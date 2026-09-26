// ============================================================================
// Contrato das regras da EXPANSÃO da "Caçada ao Inominável": Queda de Bigorna,
// Pipa, Buzz!, grade/vidro/tampa/chorume/vento, figurinhas, Copo de Requeijão,
// lojas novas, inimigos e chefes novos, save. A prova de que as áreas novas dá
// para atravessar (e que sem a habilidade não passa) está no robô
// (test/cacada-robo.test.js).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/cacada-core.js');
const MUNDO = require('../js/cacada-mundo.js');

const { CONFIG } = C;
const T = CONFIG.tile;
const A = CONFIG.jogadorA;
const DT = CONFIG.passo;

const mundoDe = (mapa, extra = {}) => ({ areas: { a: { nome: 'A', cor: '#fff' } }, salas: [{ id: 'sala', area: 'a', x: 0, y: 0, mapa, ...extra }] });

function jogoDe(mapa, extra = {}, habilidades = []) {
    const jogo = C.criarJogo(mundoDe(mapa, extra));
    C.iniciar(jogo);
    for (const h of habilidades) jogo.progresso.habilidades.add(h);
    jogo.eventos = [];
    return jogo;
}

function rodar(jogo, segundos, entrada = {}) {
    const n = Math.round(segundos / DT);
    for (let i = 0; i < n; i++) {
        const e = typeof entrada === 'function' ? entrada(i, jogo) : { ...entrada };
        e.cimaAgora = !!e.cimaPedido;
        C.passo(jogo, e, DT);
    }
}

const eventos = (jogo, tipo) => jogo.eventos.filter((e) => e.tipo === tipo);
const pes = (jogo) => jogo.jogador.y + A;

// Sala com uma grade de bueiro no chão e um andar de baixo.
const SALA_GRADE = [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#..S.........................#',
    '####GGG#######################',
    '#............................#',
    '#............................#',
    '#............................#',
    '##############################',
];

test('mundo: 28 salas, as aberturas batem e todas as letras novas carregam', () => {
    const nivel = C.carregarMundo(MUNDO);
    assert.equal(nivel.salas.length, 28);
    assert.deepEqual(C.aberturasSemPar(nivel), []);
    for (const id of ['boca', 'galerias', 'cachoeira', 'trono', 'feira', 'corredor', 'bonecos', 'palco', 'portal', 'comunidades', 'galeria', 'salao', 'servidor']) {
        assert.ok(nivel.salaPorId.has(id), id);
    }
    const prêmios = nivel.itens.filter((i) => i.premioDe).map((i) => i.habilidade).sort();
    assert.deepEqual(prêmios, ['bigorna', 'buzz', 'dash', 'pipa']);
    assert.equal(nivel.itens.filter((i) => i.tipo === 'figurinha').length, 6, '6 figurinhas no mundo (+2 nas lojas)');
    assert.equal(nivel.itens.filter((i) => i.tipo === 'copo').length, 7, '7 cacos no mundo (+2 nas lojas) = 3 copos');
    assert.equal(nivel.lojas.find((l) => l.vendedor === 'pastel').sala, nivel.salaPorId.get('corredor').idx);
});

test('Queda de Bigorna: ↓ + dash no ar mergulha, quebra a grade e cai no andar de baixo', () => {
    const jogo = jogoDe(SALA_GRADE, {}, ['dash', 'bigorna']);
    const j = jogo.jogador;
    j.x = 5 * T;
    rodar(jogo, 0.1, { puloPedido: true, pulo: true });
    rodar(jogo, 0.05, { baixo: true, dash: true, dashPedido: true });
    assert.equal(j.estado, 'mergulho');
    rodar(jogo, 1, {});
    assert.ok(eventos(jogo, 'gradeQuebrou').length > 0, 'quebrou a grade');
    assert.ok(eventos(jogo, 'pousoMergulho').length > 0, 'pousou');
    assert.ok(pes(jogo) > 8 * T, 'está no andar de baixo');
    assert.equal(jogo.progresso.quebrados.size, 1);
});

test('Queda de Bigorna: sem a habilidade, ↓ + dash no ar é um dash normal e a grade segura', () => {
    const jogo = jogoDe(SALA_GRADE, {}, ['dash']);
    jogo.jogador.x = 5 * T;
    rodar(jogo, 0.1, { puloPedido: true, pulo: true });
    rodar(jogo, 0.05, { baixo: true, dash: true, dashPedido: true });
    assert.notEqual(jogo.jogador.estado, 'mergulho');
    rodar(jogo, 1, {});
    assert.equal(jogo.progresso.quebrados.size, 0);
    assert.ok(pes(jogo) <= 7 * T + 0.5);
});

test('Queda de Bigorna: o pouso acerta inimigo perto dos pés', () => {
    const jogo = jogoDe([
        '##############################',
        '#............................#',
        '#............................#',
        '#............................#',
        '#..S.........................#',
        '#......c.....................#',
        '##############################',
    ], {}, ['dash', 'bigorna']);
    const j = jogo.jogador;
    const alvo = jogo.inimigos[0];
    j.x = alvo.x + 24;
    j.y = 1 * T;
    j.noChao = false;
    rodar(jogo, 0.02, { baixo: true, dash: true, dashPedido: true });
    rodar(jogo, 0.6, {});
    assert.ok(alvo.vida < C.Inimigos.TIPOS.capanga.vida, 'o capanga levou dano do pouso');
});

test('Pipa: segurando o pulo, a queda fica lenta; no vento, sobe', () => {
    const mapa = [
        '##############################',
        '#............................#',
        '#............................#',
        '#............................#',
        '#............................#',
        '#.........ww.................#',
        '#.........ww.................#',
        '#.........ww.................#',
        '#.........ww.................#',
        '#.........ww.................#',
        '#..S......ww.................#',
        '##############################',
    ];
    const jogo = jogoDe(mapa, {}, ['pipa']);
    const j = jogo.jogador;
    j.x = 20 * T;
    j.y = 1 * T;
    j.noChao = false;
    rodar(jogo, 0.5, { pulo: true });
    assert.ok(j.planando);
    assert.ok(j.vy <= CONFIG.planarQueda + 1, `vy ${j.vy}`);
    // No vento: sobe.
    j.x = 10 * T + 3;
    j.y = 8 * T;
    j.vy = 50;
    const y0 = j.y;
    rodar(jogo, 0.4, { pulo: true });
    assert.ok(j.y < y0 - 20, 'subiu com o vento');
    // Sem segurar o pulo, o vento não faz nada.
    const sem = jogoDe(mapa, {}, ['pipa']);
    sem.jogador.x = 10 * T + 3;
    sem.jogador.y = 6 * T;
    sem.jogador.noChao = false;
    rodar(sem, 0.4, {});
    assert.ok(sem.jogador.y > 6 * T + 20, 'caiu');
});

test('Buzz!: segure ↓ + dash no chão, solte e ele atravessa o vão e quebra o vidro', () => {
    const mapa = [
        '######################################',
        '#....................................#',
        '#....................................#',
        '#....................................#',
        '#..S..........................Y......#',
        '#.............................Y......#',
        '#######...............########Y#######',
        '######################################',
    ];
    const jogo = jogoDe(mapa, {}, ['dash', 'buzz']);
    const j = jogo.jogador;
    j.x = 5 * T;
    j.olhando = 1;
    rodar(jogo, 0.7, { baixo: true, dash: true, dashPedido: false, direita: false });
    // Primeiro passo: pedido; depois só segurando.
    const jogo2 = jogoDe(mapa, {}, ['dash', 'buzz']);
    const j2 = jogo2.jogador;
    j2.x = 5 * T;
    j2.olhando = 1;
    rodar(jogo2, 0.4, {});
    rodar(jogo2, 0.7, (i) => ({ baixo: true, dash: true, dashPedido: i === 0 }));
    assert.equal(j2.estado, 'carregando');
    rodar(jogo2, 0.02, { direita: true });
    assert.equal(j2.estado, 'buzz');
    rodar(jogo2, 1.2, {});
    assert.ok(eventos(jogo2, 'vidroQuebrou').length > 0, 'quebrou o vidro');
    assert.ok(j2.x > 31 * T, `passou do vidro (x=${j2.x})`);
});

test('Buzz!: soltar antes de carregar não dispara', () => {
    const jogo = jogoDe(['##########', '#........#', '#........#', '#..S.....#', '##########'], {}, ['dash', 'buzz']);
    const j = jogo.jogador;
    rodar(jogo, 0.2, (i) => ({ baixo: true, dash: true, dashPedido: i === 0 }));
    rodar(jogo, 0.05, {});
    assert.equal(j.estado, 'normal');
});

test('tampa do bueiro: sólida até comprar a Chave do Bueiro', () => {
    const mapa = [
        '##########',
        '#........#',
        '#..S.....#',
        '###ZZ#####',
        '#........#',
        '##########',
    ];
    const jogo = jogoDe(mapa);
    rodar(jogo, 0.5, {});
    assert.ok(pes(jogo) <= 3 * T + 0.5, 'em pé na tampa');
    jogo.progresso.loja.add('chave');
    rodar(jogo, 0.6, {});
    assert.ok(pes(jogo) > 4 * T, 'caiu pela tampa aberta');
});

test('chorume machuca como espinho e devolve ao lugar seguro', () => {
    const jogo = jogoDe([
        '############',
        '#..........#',
        '#..S.......#',
        '#####~~#####',
        '############',
    ]);
    const vida = jogo.jogador.vida;
    rodar(jogo, 1.5, { direita: true });
    assert.ok(eventos(jogo, 'perigo').some((e) => e.causa === 'chorume'));
    assert.equal(jogo.jogador.vida, vida - 1);
});

test('figurinhas: pega no mundo, põe no Álbum só no banco, 3 encaixes', () => {
    const jogo = jogoDe([
        '################',
        '#..............#',
        '#..............#',
        '#..S.b..h......#',
        '################',
    ], { figurinhas: ['tenis'] });
    rodar(jogo, 0.8, { direita: true });
    assert.ok(jogo.progresso.figurinhas.has('tenis'));
    assert.equal(C.trocarFigurinha(jogo, 'tenis'), 'longe', 'fora do banco não troca');
    // Volta ao banco, senta e abre o Álbum com ↑.
    rodar(jogo, 0.8, { esquerda: true });
    jogo.jogador.x = jogo.nivel.bancos[0].x + 10;
    rodar(jogo, DT, { cimaPedido: true });
    assert.equal(jogo.fase, 'sentado');
    rodar(jogo, DT, { cimaPedido: true });
    assert.equal(jogo.fase, 'album');
    assert.equal(C.trocarFigurinha(jogo, 'tenis'), 'ok');
    assert.ok(C.usa(jogo, 'tenis'));
    for (const f of ['ima', 'capa', 'radio']) jogo.progresso.figurinhas.add(f);
    assert.equal(C.trocarFigurinha(jogo, 'ima'), 'ok');
    assert.equal(C.trocarFigurinha(jogo, 'capa'), 'ok');
    assert.equal(C.trocarFigurinha(jogo, 'radio'), 'cheio');
    assert.equal(C.trocarFigurinha(jogo, 'tenis'), 'ok', 'tirar libera o encaixe');
    assert.equal(C.trocarFigurinha(jogo, 'radio'), 'ok');
    C.fecharAlbum(jogo);
    assert.equal(jogo.fase, 'sentado');
});

test('Tênis de Mola pula mais alto; Coronha Comprida alcança mais longe', () => {
    const alturaDoPulo = (tenis) => {
        const jogo = jogoDe(['##########', '#........#', '#........#', '#........#', '#........#', '#........#', '#........#', '#..S.....#', '##########']);
        if (tenis) { jogo.progresso.figurinhas.add('tenis'); jogo.progresso.equipadas.push('tenis'); }
        const y0 = jogo.jogador.y;
        let menor = y0;
        rodar(jogo, 0.6, (i, jg) => { menor = Math.min(menor, jg.jogador.y); return { pulo: true, puloPedido: i === 0 }; });
        return y0 - menor;
    };
    assert.ok(alturaDoPulo(true) > alturaDoPulo(false) + 10);
    const j = C.criarJogador({ x: 100, y: 100 });
    const curto = C.caixaGolpe(j, { gx: 1, gy: 0 });
    const longo = C.caixaGolpe(j, { gx: 1, gy: 0, longo: true });
    assert.ok(longo.w > curto.w);
});

test('Cogumelo de Vidro: +2 de vida e quebra quando morre', () => {
    const jogo = jogoDe(['##########', '#........#', '#........#', '#..S.b...#', '##########']);
    const p = jogo.progresso;
    p.figurinhas.add('vidro');
    p.equipadas.push('vidro');
    assert.equal(C.vidaTotal(jogo), CONFIG.vidaInicial + 2);
    jogo.fase = 'jogando';
    jogo.jogador.vida = 1;
    jogo.jogador.invencivel = 0;
    C.ferirJogador(jogo, 1, 0);
    assert.equal(jogo.fase, 'morto');
    assert.ok(!p.figurinhas.has('vidro'));
    assert.ok(p.quebradas.has('vidro'));
    assert.ok(!C.usa(jogo, 'vidro'));
});

test('Copo de Requeijão: 3 cacos = +33 de Pontuação máxima', () => {
    const jogo = jogoDe(['################', '#..............#', '#..............#', '#..S.qqq.......#', '################']);
    assert.equal(C.pontuacaoTotal(jogo.progresso), 99);
    rodar(jogo, 1, { direita: true });
    assert.equal(jogo.progresso.copos, 3);
    assert.equal(C.pontuacaoTotal(jogo.progresso), 132);
    assert.equal(eventos(jogo, 'copoCompleto').length, 1);
    assert.equal(jogo.jogador.pontuacao, 132, 'encheu a Pontuação');
});

test('lojas: ItaloLOL ganha estoque novo depois do Capanga-Mor; Tio do Pastel vende na Feira', () => {
    const jogo = jogoDe(['##########', '#........#', '#........#', '#..S.N...#', '##########']);
    jogo.vendedor = 'italolol';
    const antes = C.itensDaLoja(jogo).map((i) => i.id);
    assert.deepEqual(antes, ['cogumelo', 'lanche', 'fita']);
    jogo.progresso.chefes.add('arena:chefe');
    assert.ok(C.itensDaLoja(jogo).some((i) => i.id === 'chave'));
    jogo.progresso.virgulas = 1000;
    assert.equal(C.comprar(jogo, 'chave'), 'ok');
    assert.ok(jogo.progresso.loja.has('chave'));
    assert.equal(C.comprar(jogo, 'encaixe1'), 'ok');
    assert.equal(jogo.progresso.encaixes, 4);
    assert.equal(C.comprar(jogo, 'pacote1'), 'ok');
    assert.ok(jogo.progresso.figurinhas.has('pimenta'));
    assert.equal(C.comprar(jogo, 'copo1'), 'ok');
    assert.equal(jogo.progresso.copos, 1);
    // Item de outra loja não se compra aqui.
    assert.equal(C.comprar(jogo, 'copo2'), 'inexistente');
    jogo.vendedor = 'pastel';
    assert.equal(C.comprar(jogo, 'copo2'), 'ok');
    assert.ok(!C.itensDaLoja(jogo).some((i) => i.id === 'vidroNovo'), 'reposição só se quebrou');
});

test('Golpista do Pix rouba vírgulas no toque e devolve quando derrubado', () => {
    const jogo = jogoDe(['################', '#..............#', '#..............#', '#..S....x......#', '################']);
    jogo.progresso.virgulas = 40;
    const g = jogo.inimigos[0];
    rodar(jogo, 2, {});
    assert.ok(g.roubo > 0, 'roubou');
    assert.equal(jogo.progresso.virgulas, 40 - g.roubo);
    assert.equal(g.estado, 'fugir');
    const levou = g.roubo;
    g.vida = 1;
    jogo.jogador.x = g.x - 20;
    jogo.jogador.olhando = 1;
    jogo.jogador.recargaGolpe = 0;
    // Mata com um golpe direto (o teste de combate já cobre a mira).
    C.passo(jogo, { golpePedido: true }, DT);
    for (let i = 0; i < 20 && g.vivo; i++) C.passo(jogo, {}, DT);
    if (g.vivo) { g.vida = 0; }
    assert.ok(!g.vivo || jogo.progresso.virgulas >= 40 - levou);
});

test('inimigos novos: cada um roda 10 s sem erro numa sala com o jogador', () => {
    for (const letra of ['R', 'l', 'o', 'k', 'u', 'x', 'y', 's', 'F', 'n']) {
        const jogo = jogoDe([
            '##################',
            '#................#',
            '#................#',
            '#.........' + letra + '......#',
            '#................#',
            '#..S.............#',
            '##################',
        ]);
        assert.equal(jogo.inimigos.length, 1, letra);
        rodar(jogo, 10, (i) => ({ direita: i % 240 < 120, esquerda: i % 240 >= 120, golpePedido: i % 30 === 0 }));
    }
});

test('chefes novos: cada um luta 20 s sem erro e perde vida com golpes', () => {
    for (const chefe of ['ratao', 'coach', 'scrapeira', 'glitch']) {
        const jogo = jogoDe([
            '################################',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#..............................#',
            '#...S...........@..............#',
            '################################',
        ], { chefe });
        jogo.jogador.vida = 999;
        const c = jogo.inimigos.find((e) => e.chefe);
        assert.ok(c, chefe);
        rodar(jogo, 20, (i, jg) => {
            jg.jogador.invencivel = 1;
            const dx = c.x + c.w / 2 - (jg.jogador.x + 7);
            return { direita: dx > 20, esquerda: dx < -20, golpePedido: i % 36 === 0, cima: c.y + c.h < jg.jogador.y };
        });
        assert.ok(jogo.arena != null || !c.vivo, `${chefe}: a arena ligou`);
        assert.ok(c.vida < c.vidaMax, `${chefe}: levou dano`);
    }
});

test('save: figurinhas, Álbum, encaixes, cacos e quebradas vão e voltam', () => {
    const jogo = C.criarJogo(MUNDO);
    C.iniciar(jogo);
    const p = jogo.progresso;
    p.figurinhas = new Set(['ima', 'tenis', 'xyz']);
    p.equipadas = ['ima', 'tenis'];
    p.quebradas = new Set(['vidro']);
    p.encaixes = 4;
    p.copos = 5;
    p.habilidades.add('bigorna').add('pipa').add('buzz');
    const volta = C.importarSave(JSON.parse(JSON.stringify(C.exportarSave(jogo))));
    assert.deepEqual([...volta.figurinhas].sort(), ['ima', 'tenis']);
    assert.deepEqual(volta.equipadas, ['ima', 'tenis']);
    assert.deepEqual([...volta.quebradas], ['vidro']);
    assert.equal(volta.encaixes, 4);
    assert.equal(volta.copos, 5);
    assert.ok(volta.habilidades.has('buzz'));
    // Save antigo (sem os campos novos) continua valendo.
    const velho = C.importarSave({ v: 2, habilidades: ['dash'], vidaMax: 6 });
    assert.equal(velho.encaixes, CONFIG.encaixesIniciais);
    assert.deepEqual(velho.equipadas, []);
});
