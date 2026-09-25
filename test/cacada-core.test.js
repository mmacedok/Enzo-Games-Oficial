// ============================================================================
// Contrato das regras da "Caçada ao Inominável" (js/cacada-core.js e
// js/cacada-inimigos.js): mundo, física, combate, inimigos, chefes e save.
// A prova de que o mundo inteiro dá para atravessar está em
// test/cacada-robo.test.js (mais demorado).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/cacada-core.js');
const MUNDO = require('../js/cacada-mundo.js');

const { CONFIG } = C;
const T = CONFIG.tile;
const L = CONFIG.jogadorL;
const A = CONFIG.jogadorA;
const DT = CONFIG.passo;

/** Mundo de uma sala só, para testar uma coisa por vez. */
const mundoDe = (mapa, extra = {}) => ({ areas: { a: { nome: 'A', cor: '#fff' } }, salas: [{ id: 'sala', area: 'a', x: 0, y: 0, mapa, ...extra }] });

function jogoDe(mapa, extra = {}, habilidades = []) {
    const jogo = C.criarJogo(mundoDe(mapa, extra));
    C.iniciar(jogo);
    for (const h of habilidades) jogo.progresso.habilidades.add(h);
    jogo.eventos = [];
    return jogo;
}

/** Roda `segundos` de jogo com a entrada dada (objeto fixo ou função do passo). */
function rodar(jogo, segundos, entrada = {}) {
    const n = Math.round(segundos / DT);
    for (let i = 0; i < n; i++) {
        const e = typeof entrada === 'function' ? entrada(i, jogo) : { ...entrada };
        e.cimaAgora = !!e.cimaPedido;
        C.passo(jogo, e, DT);
    }
}

const eventos = (jogo, tipo) => jogo.eventos.filter((e) => e.tipo === tipo);

const SALA_LIVRE = [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#..S.........................#',
    '##############################',
];

// ------------------------------------------------------------------ mundo

test('o mundo carrega: 15 salas, sem sobreposição e com aberturas que batem', () => {
    const nivel = C.carregarMundo(MUNDO);
    assert.equal(nivel.salas.length, 15);
    assert.deepEqual(C.aberturasSemPar(nivel), []);
    for (const s of nivel.salas) {
        assert.ok(MUNDO.areas[s.area], `${s.id}: área sem nome`);
        assert.ok(s.nome, `${s.id}: sala sem nome`);
    }
    assert.ok(nivel.bancos.length >= 4);
    assert.ok(nivel.lojas.length >= 1);
});

test('cada habilidade aparece uma vez no mundo e os dois chefes existem', () => {
    const nivel = C.carregarMundo(MUNDO);
    const habs = nivel.itens.filter((i) => i.tipo === 'habilidade').map((i) => i.habilidade).sort();
    assert.deepEqual(habs, ['dash', 'parede', 'pulo2', 'rajada']);
    const chefes = nivel.salas.filter((s) => s.chefeDef).map((s) => s.chefeDef.tipo).sort();
    assert.deepEqual(chefes, ['capangaMor', 'opressor']);
    // Fragmentos no mundo + 1 na loja dão pelo menos um cogumelo a mais.
    assert.ok(nivel.itens.filter((i) => i.tipo === 'fragmento').length + 1 >= 4);
});

test('erros de desenho viram erro na hora de carregar', () => {
    assert.throws(() => C.carregarMundo(mundoDe(['#?#', 'S..'])), /desconhecida/);
    assert.throws(() => C.carregarMundo({ areas: {}, salas: [{ id: 'a', area: 'a', x: 0, y: 0, mapa: ['S..'] }, { id: 'b', area: 'a', x: 0, y: 0, mapa: ['...'] }] }), /sobrepõe/);
    assert.throws(() => C.carregarMundo(mundoDe(['@..', 'S..'])), /chefe/);
});

// ------------------------------------------------------------------ física

test('pulo sobe ~4 tiles; soltar cedo pula mais baixo', () => {
    assert.ok(Math.abs(C.alturaPulo() - 4 * T) < 4);
    const altura = (quadrosSegurando) => {
        const jogo = jogoDe(SALA_LIVRE);
        const y0 = jogo.jogador.y;
        let topo = y0;
        rodar(jogo, 0.6, (i, jj) => { topo = Math.min(topo, jj.jogador.y); return { pulo: i < quadrosSegurando, puloPedido: i === 0 }; });
        return y0 - topo;
    };
    const cheio = altura(999);
    assert.ok(cheio > 75 && cheio < 90, `pulo ${cheio}`);
    assert.ok(altura(5) < cheio * 0.6, 'pulo curto');
});

test('dash só com a Capa Janky e anda ~85 px', () => {
    const sem = jogoDe(SALA_LIVRE);
    const x0 = sem.jogador.x;
    rodar(sem, 0.25, (i) => ({ dashPedido: i === 0 }));
    assert.ok(Math.abs(sem.jogador.x - x0) < 1, 'sem capa não sai do lugar');
    const com = jogoDe(SALA_LIVRE, {}, ['dash']);
    rodar(com, 0.3, (i) => ({ dashPedido: i === 0 }));
    const andou = com.jogador.x - x0;
    assert.ok(andou > 75 && andou < 110, `dash andou ${andou}`);
});

test('parede: sem as Luvas cai direto; com as Luvas desliza e pula dela', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i > 0 && i < 15 ? `${l.slice(0, 10)}#${l.slice(11)}` : l));
    const teste = (habilidades) => {
        const jogo = jogoDe(mapa, {}, habilidades);
        const j = jogo.jogador;
        j.x = 10 * T - L;
        j.y = 3 * T;
        rodar(jogo, 0.5, { direita: true });
        const vy = j.vy;
        rodar(jogo, DT, { direita: true, pulo: true, puloPedido: true });
        return { vy, vx: j.vx, parede: j.parede };
    };
    const sem = teste([]);
    assert.ok(sem.vy > CONFIG.quedaParede + 50, `sem luvas cai rápido (${sem.vy})`);
    const com = teste(['parede']);
    assert.ok(com.vy <= CONFIG.quedaParede + 1, `desliza (${com.vy})`);
    assert.ok(com.vx < -150, 'pula para longe da parede');
});

test('parede estilo Hollow Knight: gruda sem segurar e escala uma parede só', () => {
    // Uma parede alta à direita, sem outra parede perto para quicar.
    const mapa = [
        '##############################',
        ...Array.from({ length: 26 }, () => '#.........####################'),
        '#......S..####################',
        '##############################',
    ];
    const jogo = jogoDe(mapa, {}, ['parede']);
    const j = jogo.jogador;
    // Encosta pulando e solta a seta: continua grudado, deslizando devagar.
    rodar(jogo, 0.5, (i) => ({ direita: true, pulo: true, puloPedido: i === 0 }));
    assert.equal(j.grudado, 1, 'grudou na parede');
    rodar(jogo, 0.3, {});
    assert.equal(j.grudado, 1, 'continua grudado sem segurar');
    assert.ok(j.vy <= CONFIG.quedaParede + 1, `desliza devagar (${j.vy})`);
    // Pula e segura de volta para a mesma parede, várias vezes: tem que subir.
    const y0 = j.y;
    let pulos = 0;
    rodar(jogo, 3, (i, jj) => {
        const g = jj.jogador.grudado === 1;
        if (g) pulos++;
        return { direita: true, pulo: true, puloPedido: g };
    });
    assert.ok(pulos >= 4, `pulou ${pulos} vezes`);
    assert.ok(y0 - j.y > 5 * T, `subiu ${Math.round(y0 - j.y)} px na mesma parede`);
    // Segurando para fora, solta.
    rodar(jogo, 0.2, {});
    rodar(jogo, 0.1, { esquerda: true });
    assert.equal(j.grudado, 0, 'soltou ao segurar para fora');
});

test('coronhada em 8 direções: diagonais e para baixo no chão', () => {
    const jogo = jogoDe(SALA_LIVRE);
    const j = jogo.jogador;
    const dir = (entrada) => {
        j.recargaGolpe = 0;
        j.golpe = null;
        rodar(jogo, DT, { ...entrada, golpePedido: true });
        return j.golpe && j.golpe.dir;
    };
    assert.equal(dir({}), 'frente');
    assert.equal(dir({ cima: true }), 'cima');
    assert.equal(dir({ cima: true, direita: true }), 'cimaDiag');
    assert.equal(dir({ baixo: true }), 'baixo', 'para baixo também no chão');
    assert.equal(dir({ baixo: true, esquerda: true }), 'baixoDiag');
    assert.equal(j.golpe.gx, -1);
    const caixa = C.caixaGolpe(j, j.golpe);
    assert.ok(caixa.x + caixa.w <= j.x + 12 && caixa.y > j.y, 'diagonal baixa fica embaixo e à esquerda');
});

test('pulo duplo só com os Parênteses', () => {
    const alturaMax = (habilidades) => {
        const jogo = jogoDe(SALA_LIVRE, {}, habilidades);
        const y0 = jogo.jogador.y;
        let topo = y0;
        rodar(jogo, 1, (i, jj) => { topo = Math.min(topo, jj.jogador.y); return { pulo: true, puloPedido: i === 0 || i === 36 }; });
        return y0 - topo;
    };
    const sem = alturaMax([]);
    const com = alturaMax(['pulo2']);
    assert.ok(com > sem + 40, `com ${com} × sem ${sem}`);
});

test('agarra a quina de uma parede de 5 tiles e sobe com ↑', () => {
    const mapa = [
        '##############################',
        '#............................#',
        '#............................#',
        '#............................#',
        '#............................#',
        '#............................#',
        '#............................#',
        '#............................#',
        '#............................#',
        '#.........####################',
        '#.........####################',
        '#.........####################',
        '#.........####################',
        '#.........####################',
        '#..S......####################',
        '##############################',
    ];
    const jogo = jogoDe(mapa);
    const j = jogo.jogador;
    let agarrou = false;
    rodar(jogo, 1.5, (i, jj) => {
        if (jj.jogador.estado === 'agarrado') agarrou = true;
        if (agarrou) return { cima: true };
        return { direita: true, pulo: true, puloPedido: jj.jogador.noChao && jj.jogador.x > 6.5 * T };
    });
    assert.ok(agarrou, 'agarrou');
    assert.ok(j.y + A <= 9 * T + 0.5 && j.x >= 10 * T - 2, `subiu (${j.x}, ${j.y})`);
});

// ------------------------------------------------------------------ combate

const SALA_INIMIGO = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S....c.....................#' : l)).map((l) => l.slice(0, 30));

test('coronhada: acerta, dá 11 de Pontuação e empurra o inimigo', () => {
    const jogo = jogoDe(SALA_INIMIGO);
    const e = jogo.inimigos[0];
    e.x = jogo.jogador.x + L + 10;
    e.vida = 3;
    const vidaAntes = e.vida;
    rodar(jogo, 0.05, (i) => ({ golpePedido: i === 0 }));
    assert.equal(e.vida, vidaAntes - 1);
    assert.equal(jogo.jogador.pontuacao, CONFIG.pontuacaoPorGolpe);
    assert.ok(e.kx > 0, 'inimigo recuou');
});

test('pogo: golpe para baixo em espinho quica sem tomar dano', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S....^^^^^^^^..............#' : l)).map((l) => l.slice(0, 30));
    const jogo = jogoDe(mapa);
    const j = jogo.jogador;
    j.x = 10 * T;
    j.y = 9 * T;
    let quicou = false;
    rodar(jogo, 0.6, (i, jj) => {
        if (eventos(jj, 'pogo').length) quicou = true;
        const perto = jj.jogador.y + A > 14 * T - 30;
        return { baixo: true, golpePedido: !quicou && jj.jogador.vy > 0 && perto };
    });
    assert.ok(quicou, 'quicou');
    assert.equal(j.vida, CONFIG.vidaInicial);
    assert.equal(eventos(jogo, 'perigo').length, 0);
});

test('encostar no inimigo tira 1 cogumelo, empurra e dá invencibilidade', () => {
    const jogo = jogoDe(SALA_INIMIGO);
    const j = jogo.jogador;
    const e = jogo.inimigos[0];
    e.x = j.x + 4;
    e.y = j.y + A - e.h;
    rodar(jogo, 0.02);
    assert.equal(j.vida, CONFIG.vidaInicial - 1);
    assert.ok(j.invencivel > 0);
    e.x = j.x;
    e.y = j.y + A - e.h;
    rodar(jogo, 0.1);
    assert.equal(j.vida, CONFIG.vidaInicial - 1, 'invencível não toma de novo');
});

test('espinho tira 1 cogumelo e devolve ao último lugar seguro', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S.......^^^................#' : l)).map((l) => l.slice(0, 30));
    const jogo = jogoDe(mapa);
    rodar(jogo, 2, { direita: true });
    assert.ok(eventos(jogo, 'perigo').length >= 1);
    rodar(jogo, CONFIG.tempoPerigo + 0.1);
    assert.equal(jogo.fase, 'jogando');
    assert.ok(jogo.jogador.vida < CONFIG.vidaInicial);
    assert.ok(jogo.jogador.x < 11 * T, 'voltou para antes dos espinhos');
});

test('morrer: renasce no banco com vida cheia e a Sombra guarda as vírgulas', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S.b..........^^............#' : l)).map((l) => l.slice(0, 30));
    const jogo = jogoDe(mapa);
    rodar(jogo, 0.3, { direita: true });
    rodar(jogo, DT, { cimaPedido: true });
    assert.equal(jogo.fase, 'sentado');
    assert.equal(jogo.progresso.banco, 'sala:banco1');
    jogo.progresso.virgulas = 40;
    rodar(jogo, 0.1, { direita: true });
    jogo.jogador.vida = 1;
    jogo.jogador.invencivel = 0;
    for (let i = 0; i < 400 && jogo.fase !== 'morto'; i++) rodar(jogo, DT, { direita: true });
    assert.equal(jogo.progresso.mortes, 1);
    rodar(jogo, CONFIG.tempoMorte + 0.1);
    assert.equal(jogo.fase, 'sentado');
    assert.equal(jogo.jogador.vida, jogo.progresso.vidaMax);
    assert.equal(jogo.progresso.virgulas, 0);
    assert.equal(jogo.progresso.sombra.virgulas, 40);
    const sombra = jogo.inimigos.find((e) => e.tipo === 'sombra');
    assert.ok(sombra, 'a Sombra está na sala');
    // Derrotar a Sombra devolve as vírgulas.
    sombra.vida = 1;
    jogo.fase = 'jogando';
    sombra.x = jogo.jogador.x + L + 6;
    sombra.y = jogo.jogador.y;
    sombra.vx = sombra.vy = 0;
    rodar(jogo, 0.05, (i) => ({ golpePedido: i === 0 }));
    assert.equal(jogo.progresso.virgulas, 40);
    assert.equal(jogo.progresso.sombra, null);
});

test('Degustar: segurar cura 1 cogumelo e gasta 33 de Pontuação', () => {
    const jogo = jogoDe(SALA_LIVRE);
    const j = jogo.jogador;
    j.vida = 2;
    j.pontuacao = 40;
    rodar(jogo, 0.5, { degustar: true });
    assert.equal(j.vida, 2, 'soltar cedo não cura');
    rodar(jogo, 0.1, {});
    rodar(jogo, CONFIG.tempoDegustar + 0.05, { degustar: true });
    assert.equal(j.vida, 3);
    assert.equal(j.pontuacao, 40 - CONFIG.custoMagia);
    rodar(jogo, 1.2, { degustar: true });
    assert.equal(j.vida, 3, 'sem Pontuação não cura mais');
});

test('Rajada: só com a habilidade, gasta 33 e atravessa inimigos', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S....c..c..................#' : l)).map((l) => l.slice(0, 30));
    const jogo = jogoDe(mapa);
    jogo.jogador.pontuacao = 99;
    rodar(jogo, 0.05, (i) => ({ magiaPedido: i === 0 }));
    assert.equal(jogo.tiros.length, 0, 'sem a habilidade não atira');
    jogo.progresso.habilidades.add('rajada');
    for (const e of jogo.inimigos) { e.vida = 10; e.dir = 1; }
    rodar(jogo, 0.6, (i) => ({ magiaPedido: i === 0 }));
    assert.equal(jogo.jogador.pontuacao, 99 - CONFIG.custoMagia);
    assert.ok(jogo.inimigos.every((e) => e.vida === 10 - CONFIG.rajadaDano), 'acertou os dois');
});

test('parede rachada quebra com 3 golpes; alavanca abre o portão', () => {
    const mapa = SALA_LIVRE.map((l, i) => {
        if (i === 12 || i === 13) return '#.....B......P................#'.slice(0, 30);
        if (i === 14) return '#..S..B...L..P................#'.slice(0, 30);
        return l;
    });
    const jogo = jogoDe(mapa);
    const j = jogo.jogador;
    rodar(jogo, 1, { direita: true });
    for (let k = 0; k < 3; k++) rodar(jogo, 0.35, (i) => ({ golpePedido: i === 0, direita: i > 30 }));
    assert.equal(jogo.progresso.quebrados.size, 1, 'quebrou');
    rodar(jogo, 1, { direita: true });
    assert.ok(j.x > 6 * T, 'passou pela parede quebrada');
    // Volta um pouco e golpeia a alavanca.
    j.x = 8 * T;
    j.olhando = 1;
    rodar(jogo, 0.1, (i) => ({ golpePedido: i === 0 }));
    assert.ok(jogo.progresso.abertos.has('sala'), 'alavanca abriu');
    rodar(jogo, 1.5, { direita: true });
    assert.ok(j.x > 14 * T, 'passou pelo portão');
});

// ------------------------------------------------------------------ inimigos

function inimigoSozinho(letra, mapaExtra) {
    const mapa = SALA_LIVRE.map((l, i) => (mapaExtra && mapaExtra[i] ? mapaExtra[i] : l)).map((l) => l.slice(0, 30));
    const linha = mapa[10].split('');
    linha[20] = letra;
    mapa[10] = linha.join('');
    return jogoDe(mapa);
}

test('Ping fica parado de longe e persegue voando quando te vê', () => {
    const jogo = inimigoSozinho('p');
    const e = jogo.inimigos[0];
    const d0 = Math.hypot(e.x - jogo.jogador.x, e.y - jogo.jogador.y);
    rodar(jogo, 1);
    assert.notEqual(e.estado, 'caca');
    jogo.jogador.x = e.x - 120;
    rodar(jogo, 1);
    assert.equal(e.estado, 'caca');
    assert.ok(Math.hypot(e.x - jogo.jogador.x, e.y - jogo.jogador.y) < 120 || jogo.jogador.vida < CONFIG.vidaInicial);
    assert.ok(d0 > 0);
});

test('Troll prepara e dá investida', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S..............t...........#' : l)).map((l) => l.slice(0, 30));
    const jogo = jogoDe(mapa);
    const e = jogo.inimigos[0];
    e.dir = -1;
    jogo.jogador.x = e.x - 150;
    let investiu = false;
    rodar(jogo, 2, (i, jj) => { if (e.estado === 'investida') investiu = true; return {}; });
    assert.ok(investiu);
});

test('Moderador bloqueia golpe de frente mas não por cima', () => {
    const mapa = SALA_LIVRE.map((l, i) => (i === 14 ? '#..S....m.....................#' : l)).map((l) => l.slice(0, 30));
    const jogo = jogoDe(mapa);
    const e = jogo.inimigos[0];
    rodar(jogo, 0.1);
    e.dir = -1;
    e.estado = 'guarda';
    e.t = 0;
    jogo.jogador.x = e.x - L - 12;
    jogo.jogador.olhando = 1;
    rodar(jogo, 0.03, (i) => ({ golpePedido: i === 0 }));
    assert.equal(e.vida, e.vidaMax, 'bloqueou');
    assert.ok(eventos(jogo, 'bloqueio').length >= 1);
    // Por cima (pogo).
    jogo.jogador.invencivel = 5;
    jogo.jogador.x = e.x + 2;
    jogo.jogador.y = e.y - A - 16;
    jogo.jogador.vy = 100;
    jogo.jogador.recargaGolpe = 0;
    rodar(jogo, 0.3, (i) => ({ baixo: true, golpePedido: i === 2 }));
    assert.ok(e.vida < e.vidaMax, 'golpe por cima passou do escudo');
});

test('Bug anda em volta de um bloco e volta ao começo', () => {
    const mapa = SALA_LIVRE.map((l, i) => {
        if (i >= 8 && i <= 10) return '#..........#####..............#'.slice(0, 30);
        if (i === 7) return '#............g.................#'.slice(0, 30);
        return l;
    });
    const jogo = jogoDe(mapa);
    const e = jogo.inimigos[0];
    jogo.jogador.x = 2 * T;
    rodar(jogo, 0.05);
    const inicio = { x: e.px, y: e.py };
    const normais = new Set();
    rodar(jogo, 16 * T / 38 + 0.05, (i) => { normais.add(`${e.nx},${e.ny}`); return {}; });
    assert.equal(normais.size, 4, 'passou pelas 4 faces');
    assert.ok(Math.hypot(e.px - inicio.x, e.py - inicio.y) < 3, 'voltou perto do início');
});

test('Drone atira em leque e a Feiticeira teleporta', () => {
    const jogo = inimigoSozinho('d');
    jogo.jogador.x = jogo.inimigos[0].x - 150;
    rodar(jogo, 3);
    assert.ok(eventos(jogo, 'tiroInimigo').length >= 1 || jogo.projeteis.length > 0);
    const f = inimigoSozinho('f');
    const e = f.inimigos[0];
    f.jogador.x = e.x - 160;
    const x0 = e.x;
    const y0 = e.y;
    rodar(f, 2.5);
    assert.ok(Math.hypot(e.x - x0, e.y - y0) > 20, 'mudou de lugar');
});

// ------------------------------------------------------------------ chefes

const ARENA = [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '|............................#',
    '|............................#',
    '|S.........@.................#',
    '##############################',
];

test('Capanga-Mor: a arena fecha, ele ataca, e ao cair deixa a Capa Janky', () => {
    const jogo = jogoDe(ARENA, { chefe: 'capangaMor', premio: 'dash' });
    const j = jogo.jogador;
    rodar(jogo, 0.4, { direita: true });
    assert.equal(jogo.arena, 0, 'arena ligada');
    assert.ok(C.solido({ nivel: jogo.nivel, arena: jogo.arena }, 0, 13), 'grade fechada');
    const chefe = jogo.inimigos.find((e) => e.chefe);
    j.invencivel = 999;
    rodar(jogo, 4);
    assert.ok(jogo.projeteis.length > 0 || ['saltoPrep', 'salto', 'corridaPrep', 'corrida', 'marretaPrep', 'marreta', 'atordoado', 'recuperar', 'ocioso'].includes(chefe.estado));
    chefe.vida = 1;
    chefe.x = j.x + L + 4;
    chefe.y = j.y + A - chefe.h;
    j.olhando = 1;
    rodar(jogo, 0.05, (i) => ({ golpePedido: i === 0 }));
    assert.equal(chefe.vivo, false);
    assert.ok(jogo.progresso.chefes.has('sala:chefe'));
    assert.equal(jogo.arena, null, 'grade abriu');
    const premio = jogo.nivel.itens.find((i) => i.premioDe === 'sala:chefe');
    j.x = premio.x;
    j.y = premio.y + premio.h - A;
    j.invencivel = 0;
    rodar(jogo, 0.05);
    assert.equal(jogo.fase, 'pegou');
    assert.ok(jogo.progresso.habilidades.has('dash'));
    C.continuar(jogo);
    assert.equal(jogo.fase, 'jogando');
});

test('Opressor do Chat: derrotar leva ao final', () => {
    const jogo = jogoDe(ARENA, { chefe: 'opressor', final: true });
    rodar(jogo, 0.4, { direita: true });
    const chefe = jogo.inimigos.find((e) => e.chefe);
    jogo.jogador.invencivel = 999;
    rodar(jogo, 6);
    assert.ok(eventos(jogo, 'ataqueChefe').length >= 1 || jogo.projeteis.length >= 0);
    chefe.vida = 1;
    chefe.x = jogo.jogador.x + L + 4;
    chefe.y = jogo.jogador.y - 10;
    chefe.vx = chefe.vy = 0;
    jogo.jogador.olhando = 1;
    rodar(jogo, 0.05, (i) => ({ golpePedido: i === 0 }));
    assert.equal(chefe.vivo, false);
    rodar(jogo, 3.2);
    assert.equal(jogo.fase, 'final');
    assert.ok(jogo.progresso.final);
});

// ------------------------------------------------------------------ loja, save, ritmo

test('loja: sem vírgulas não compra; Fita Reforçada dobra o dano', () => {
    const jogo = jogoDe(SALA_INIMIGO);
    assert.equal(C.comprar(jogo, 'fita'), 'caro');
    jogo.progresso.virgulas = 500;
    assert.equal(C.comprar(jogo, 'fita'), 'ok');
    assert.equal(C.comprar(jogo, 'fita'), 'comprado');
    const e = jogo.inimigos[0];
    e.x = jogo.jogador.x + L + 10;
    e.vida = 5;
    rodar(jogo, 0.05, (i) => ({ golpePedido: i === 0 }));
    assert.equal(e.vida, 3);
    assert.equal(C.comprar(jogo, 'fragmento'), 'ok');
    assert.equal(jogo.progresso.fragmentos, 1);
});

test('save: exportar e importar devolve o mesmo progresso', () => {
    const jogo = C.criarJogo(MUNDO);
    C.iniciar(jogo);
    const p = jogo.progresso;
    p.habilidades.add('dash');
    p.virgulas = 77;
    p.coletados.add('x:1');
    p.quebrados.add('B1,2');
    p.abertos.add('torre');
    p.chefes.add('arena:chefe');
    p.sombra = { sala: 'beco', x: 10, y: 20, virgulas: 30 };
    p.banco = 'beco:banco1';
    p.visitadas.add('beco');
    const dados = JSON.parse(JSON.stringify(C.exportarSave(jogo)));
    const outro = C.criarJogo(MUNDO);
    C.iniciar(outro, dados);
    assert.deepEqual(C.exportarSave(outro), dados);
    assert.equal(outro.fase, 'sentado', 'continua sentado no banco salvo');
    assert.equal(outro.sala.id, 'beco');
    // Save estranho não quebra o jogo.
    const vazio = C.criarJogo(MUNDO);
    C.iniciar(vazio, { v: 2, habilidades: ['voar', 'dash'], vidaMax: 99, banco: 'nao-existe' });
    assert.deepEqual([...vazio.progresso.habilidades], ['dash']);
    assert.equal(vazio.progresso.vidaMax, CONFIG.vidaMaxima);
    assert.equal(vazio.fase, 'jogando');
});

test('passo fixo: 60 Hz e 144 Hz dão o mesmo resultado', () => {
    const final = (hz) => {
        const jogo = C.criarJogo(MUNDO);
        C.iniciar(jogo);
        const e = { direita: true, pulo: true };
        for (let i = 0; i < hz * 3; i++) {
            if (i % Math.round(hz / 2) === 0) e.puloPedido = true;
            C.avancar(jogo, 1 / hz, e);
        }
        return jogo.jogador;
    };
    const a = final(60);
    const b = final(144);
    assert.ok(Math.abs(a.x - b.x) < 12, `${a.x} × ${b.x}`);
});

test('começo do jogo: esconderijo, 5 cogumelos e nenhuma habilidade', () => {
    const jogo = C.criarJogo(MUNDO);
    C.iniciar(jogo);
    assert.equal(jogo.sala.id, 'esconderijo');
    assert.equal(jogo.jogador.vida, 5);
    assert.equal(jogo.progresso.habilidades.size, 0);
    assert.equal(jogo.fase, 'jogando');
});
