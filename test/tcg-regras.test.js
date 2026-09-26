// ============================================================================
// Testes do motor da Batalha dos Torados (js/tcg-regras.js) e do robô.
// Cada regra do docs/PLANO-TCG.md e cada carta com efeito tem um teste aqui.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const Baralho = require('../js/baralho-dados.js');
const { COMBATE } = require('../js/tcg-cartas.js');
const R = require('../js/tcg-regras.js');
const Robo = require('../js/tcg-robo.js');

const DECK = [
    'cara-de-coracao', 'cara-de-coracao', 'bug-do-discord', 'bug-do-discord',
    'notificacao-morcego', 'notificacao-morcego', 'emoji-pistola', 'emoji-pistola',
    'drone-vigia', 'drone-vigia', 'italolol', 'italolol',
    'estacionamento-noturno', 'estacionamento-noturno', 'enzo-games',
];

// ---- Ajudantes ----------------------------------------------------------------
let contador = 0;
function inst(j, spec) {
    const s = typeof spec === 'string' ? { id: spec } : spec;
    return {
        uid: s.uid || `${j}-t${contador++}`, id: s.id, dano: s.dano || 0, aura: s.aura || 0,
        estados: { notificado: false, iludido: false, silenciado: 0, ...(s.estados || {}) },
        escudo: s.escudo || null,
    };
}
/**
 * Monta uma mesa pronta no meio da partida: `vez` joga o turno `turno`.
 * mesa({ eu: { ativo, banco, mao, deck }, ele: {...}, campo, turno, vez })
 */
function mesa({ eu = {}, ele = {}, campo = null, turno = 5, vez = 0 } = {}) {
    const e = R.criarPartida({ semente: 1, decks: [DECK, DECK] });
    e.fase = 'jogo';
    e.turno = turno;
    e.vez = vez;
    e.primeiro = 0;
    [[vez, eu], [1 - vez, ele]].forEach(([j, lado]) => {
        const x = e.jogadores[j];
        x.preparado = true;
        x.ativo = lado.ativo === null ? null : inst(j, lado.ativo || 'cara-de-coracao');
        x.banco = (lado.banco || []).map((s) => inst(j, s));
        x.mao = (lado.mao || []).map((s) => inst(j, s));
        x.deck = (lado.deck || ['bug-do-discord', 'bug-do-discord', 'bug-do-discord']).map((s) => inst(j, s));
        x.descarte = [];
        x.pontos = lado.pontos || 0;
        x.flags = { auras: 1, reforco: 0, campo: false, recuo: false, trocarCarta: false, poderes: [] };
    });
    if (campo) e.campo = { carta: inst(campo.dono ?? vez, campo.id || campo), dono: campo.dono ?? vez };
    return e;
}
const jogar = (e, jogada) => R.aplicar(e, { jogador: e.vez, ...jogada });
const atacar = (e, ataque = 0, extra = {}) => jogar(e, { tipo: 'atacar', ataque, ...extra });
const EU = (e) => e.jogadores[e.vez];
const ELE = (e) => e.jogadores[1 - e.vez];
/** Força o resultado da próxima moeda do motor (procura uma semente que dá o lado pedido). */
function comMoeda(e, cara, jogada) {
    for (let k = 1; k < 500; k++) {
        const copia = structuredClone(e);
        copia.rng = k;
        const r = R.aplicar(copia, jogada);
        const m = r.eventos.find((ev) => ev.tipo === 'moeda');
        if (m && (m.resultado === 'cara') === cara) return r;
    }
    throw new Error('moeda não encontrada');
}
const invalida = (fn, trecho) => assert.throws(fn, (err) => err instanceof R.JogadaInvalida && err.message.includes(trecho));

// ---- Dados das cartas ---------------------------------------------------------
test('toda carta do Baralho tem números de combate coerentes com o tipo', () => {
    for (const c of Baralho.CARTAS) {
        const d = COMBATE[c.id];
        assert.ok(d, `${c.id} sem dados`);
        if (c.tipo === 'campo') {
            assert.ok(d.campo?.tipo && d.campo.texto, `${c.id}: campo sem efeito`);
        } else {
            assert.ok(d.hp > 0 && d.hp % 10 === 0, `${c.id}: HP`);
            assert.ok(Number.isInteger(d.recuo) && d.recuo >= 0, `${c.id}: recuo`);
            assert.ok(d.ataques.length >= 1, `${c.id}: sem ataque`);
            for (const a of d.ataques) assert.ok(a.nome && a.custo >= 1 && a.dano >= 0, `${c.id}: ataque ${a.nome}`);
        }
    }
    assert.equal(Object.keys(COMBATE).length, Baralho.CARTAS.length);
});

// ---- Deck -----------------------------------------------------------------------
test('validarDeck: 15 cartas, 2 cópias, 1 lendário, precisa de lutador', () => {
    assert.deepEqual(R.validarDeck(DECK), []);
    assert.match(R.validarDeck(DECK.slice(1)).join(), /15 cartas/);
    assert.match(R.validarDeck([...DECK.slice(0, -1), 'cara-de-coracao']).join(), /Cara de Coração: no máximo 2/);
    assert.match(R.validarDeck([...DECK.slice(1), 'enzo-games']).join(), /Enzo Games: no máximo 1 cópia/);
    assert.match(R.validarDeck([...DECK.slice(1), 'carta-inventada']).join(), /desconhecida/);
    const soCampos = ['piscina-de-macarronada', 'toradolandia', 'toradolandia', 'mansao-do-inominavel', 'mansao-do-inominavel',
        'estacionamento-noturno', 'estacionamento-noturno', 'casa-do-enzo-games', 'casa-do-enzo-games',
        'sao-joao-do-butico', 'sao-joao-do-butico', 'enzo-games', 'superkid', 'cabo-coco', 'o-inominavel'];
    assert.deepEqual(R.validarDeck(soCampos), []);
    assert.match(R.validarDeck('x').join(), /lista/);
});

test('validarDeck com coleção (para o futuro): só entra o que o leitor tem', () => {
    const colecao = Object.fromEntries(DECK.map((id) => [id, 2]));
    assert.deepEqual(R.validarDeck(DECK, { colecao }), []);
    colecao.italolol = 1;
    assert.match(R.validarDeck(DECK, { colecao }).join(), /ItaloLOL: você tem 1/);
});

// ---- Começo ---------------------------------------------------------------------
test('criarPartida: mesma semente, mesma partida; mão de 5 sempre com lutador', () => {
    const a = R.criarPartida({ semente: 'abc', decks: [DECK, DECK] });
    const b = R.criarPartida({ semente: 'abc', decks: [DECK, DECK] });
    assert.deepEqual(a, b);
    for (let s = 0; s < 200; s++) {
        const e = R.criarPartida({ semente: s, decks: [DECK, DECK] });
        for (const x of e.jogadores) {
            assert.equal(x.mao.length, 5);
            assert.equal(x.deck.length, 10);
            assert.ok(x.mao.some((c) => R.ehLutador(c.id)));
        }
    }
    assert.throws(() => R.criarPartida({ decks: [DECK] }), R.JogadaInvalida);
    assert.throws(() => R.criarPartida({ decks: [DECK, DECK.slice(1)] }), /Deck 2 inválido/);
});

test('mulligan: mão sem lutador é devolvida e comprada de novo', () => {
    const deck = ['piscina-de-macarronada', 'toradolandia', 'toradolandia', 'mansao-do-inominavel', 'mansao-do-inominavel',
        'estacionamento-noturno', 'estacionamento-noturno', 'casa-do-enzo-games', 'casa-do-enzo-games',
        'sao-joao-do-butico', 'sao-joao-do-butico', 'drone-vigia', 'bug-do-discord', 'cara-de-coracao', 'notificacao-morcego'];
    let viuMulligan = false;
    for (let s = 0; s < 50; s++) {
        const e = R.criarPartida({ semente: s, decks: [deck, deck] });
        e.jogadores.forEach((x) => {
            assert.ok(x.mao.some((c) => R.ehLutador(c.id)));
            assert.equal(x.mao.length + x.deck.length, 15);
            if (x.mulligans) viuMulligan = true;
        });
    }
    assert.ok(viuMulligan);
});

test('preparação: escolhas válidas, depois começa o turno 1 de quem ganhou a moeda', () => {
    let e = R.criarPartida({ semente: 7, decks: [DECK, DECK] });
    for (const j of [0, 1]) {
        const mao = e.jogadores[j].mao;
        const campo = mao.find((c) => !R.ehLutador(c.id));
        if (campo) invalida(() => R.aplicar(e, { tipo: 'preparar', jogador: j, ativo: campo.uid }), 'personagem ou goon');
        invalida(() => R.aplicar(e, { tipo: 'baixar', jogador: j, uid: mao[0].uid }), 'escolha o ativo');
        const lutadores = mao.filter((c) => R.ehLutador(c.id));
        invalida(() => R.aplicar(e, { tipo: 'preparar', jogador: j, ativo: lutadores[0].uid, banco: [lutadores[0].uid] }), 'repetida');
        const r = R.aplicar(e, { tipo: 'preparar', jogador: j, ativo: lutadores[0].uid, banco: lutadores.slice(1, 4).map((c) => c.uid) });
        e = r.estado;
        if (j === 0) {
            assert.equal(e.fase, 'preparacao');
            invalida(() => R.aplicar(e, { tipo: 'preparar', jogador: 0, ativo: lutadores[0].uid }), 'já se preparou');
        } else {
            assert.equal(e.fase, 'jogo');
            assert.equal(e.turno, 1);
            assert.equal(e.vez, e.primeiro);
            assert.ok(r.eventos.some((ev) => ev.tipo === 'inicio'));
            assert.ok(r.eventos.some((ev) => ev.tipo === 'compra' && ev.jogador === e.primeiro));
        }
    }
});

// ---- Turno ----------------------------------------------------------------------
test('1º turno: quem começa ganha Aura mas não ataca', () => {
    const e = mesa({ turno: 1, eu: { ativo: { id: 'italolol', aura: 1 } } });
    invalida(() => atacar(e), 'não ataca no 1º turno');
    const r = jogar(e, { tipo: 'aura', alvo: EU(e).ativo.uid });
    assert.equal(EU(r.estado).ativo.aura, 2);
});

test('Aura de Reforço: quem joga em segundo ganha +1 Aura no 1º turno, só para o banco', () => {
    let e = mesa({ turno: 1, eu: { banco: ['bug-do-discord'] }, ele: { banco: ['drone-vigia'] } });
    e = jogar(e, { tipo: 'passar' }).estado;
    assert.equal(e.turno, 2);
    const ativo = EU(e).ativo.uid;
    const banco = EU(e).banco[0].uid;
    e = jogar(e, { tipo: 'aura', alvo: ativo }).estado;
    invalida(() => jogar(e, { tipo: 'aura', alvo: ativo }), 'Reforço vai para o banco');
    e = jogar(e, { tipo: 'aura', alvo: banco }).estado;
    invalida(() => jogar(e, { tipo: 'aura', alvo: banco }), 'já prendeu');
    // Na ordem inversa também: banco primeiro, depois ativo.
    let f = mesa({ turno: 1, eu: { banco: ['bug-do-discord'] }, ele: { banco: ['drone-vigia'] } });
    f = jogar(f, { tipo: 'passar' }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).banco[0].uid }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }).estado;
    assert.equal(EU(f).ativo.aura + EU(f).banco[0].aura, 2);
    // Turno 3 volta a ser 1 Aura.
    f = jogar(f, { tipo: 'passar' }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }).estado;
    invalida(() => jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }), 'já prendeu');
});

test('só joga na sua vez; baixar vai para o banco (3 vagas)', () => {
    const e = mesa({ eu: { mao: ['bug-do-discord', 'drone-vigia', 'emoji-pistola', 'italolol', 'toradolandia'] } });
    invalida(() => R.aplicar(e, { tipo: 'passar', jogador: 1 }), 'não é a sua vez');
    let x = e;
    for (let i = 0; i < 3; i++) x = jogar(x, { tipo: 'baixar', uid: EU(x).mao[0].uid }).estado;
    assert.equal(EU(x).banco.length, 3);
    invalida(() => jogar(x, { tipo: 'baixar', uid: EU(x).mao[0].uid }), 'banco está cheio');
    invalida(() => jogar(e, { tipo: 'baixar', uid: EU(e).mao[4].uid }), 'só personagens e goons');
    invalida(() => jogar(e, { tipo: 'voar' }), 'desconhecida');
});

test('ataque: custa Aura, dá dano, acaba o turno e o outro compra', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1 } }, ele: { ativo: 'drone-vigia' } });
    invalida(() => atacar(e, 1), 'precisa de 2 de Aura');
    const { estado, eventos } = atacar(e, 0);
    assert.equal(ELE(e).ativo.id, 'drone-vigia');
    assert.equal(estado.jogadores[1].ativo.dano, 20);
    assert.equal(estado.vez, 1);
    assert.equal(estado.turno, 6);
    assert.deepEqual(eventos.map((ev) => ev.tipo), ['ataque', 'dano', 'fimTurno', 'turno', 'compra']);
    assert.equal(e.jogadores[1].ativo.dano, 0, 'aplicar não altera o estado recebido');
});

test('nocaute: carta vai para o descarte, 1 ponto (2 se lendário), dono escolhe novo ativo', () => {
    const e = mesa({
        eu: { ativo: { id: 'enzo-games', aura: 3 } },
        ele: { ativo: 'drone-vigia', banco: ['bug-do-discord', 'italolol'] },
    });
    const r = atacar(e, 1);
    let s = r.estado;
    assert.equal(s.jogadores[0].pontos, 1);
    assert.equal(s.jogadores[1].ativo, null);
    assert.equal(s.jogadores[1].descarte.length, 1);
    assert.deepEqual(s.pendentes, [{ jogador: 1, tipo: 'novoAtivo' }]);
    assert.equal(s.vez, 0, 'o turno só passa depois da escolha');
    invalida(() => R.aplicar(s, { tipo: 'passar', jogador: 0 }), 'novo ativo');
    invalida(() => R.aplicar(s, { tipo: 'novoAtivo', jogador: 0, uid: 'x' }), 'não é você');
    s = R.aplicar(s, { tipo: 'novoAtivo', jogador: 1, uid: s.jogadores[1].banco[1].uid }).estado;
    assert.equal(s.jogadores[1].ativo.id, 'italolol');
    assert.equal(s.vez, 1);

    const lend = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: { id: 'superkid', dano: 20 }, banco: ['bug-do-discord'] } });
    assert.equal(atacar(lend, 1).estado.jogadores[0].pontos, 2);
});

test('vitória: 3 pontos ou adversário sem ninguém na mesa', () => {
    const pontos = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 }, pontos: 2 }, ele: { ativo: 'drone-vigia', banco: ['bug-do-discord'] } });
    const r = atacar(pontos, 1);
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'pontos');
    invalida(() => R.aplicar(r.estado, { tipo: 'passar', jogador: 1 }), 'acabou');
    assert.deepEqual(R.jogadasValidas(r.estado, 0), []);

    const vazia = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'drone-vigia' } });
    const v = atacar(vazia, 1).estado;
    assert.equal(v.vencedor, 0);
    assert.equal(v.motivo, 'mesaVazia');
});

test('desistir encerra na hora a favor do outro', () => {
    const e = mesa();
    const r = R.aplicar(e, { tipo: 'desistir', jogador: 1 });
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'desistencia');
});

test('recuo: paga Aura, 1 vez por turno, limpa estados; Silenciado não recua', () => {
    const e = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 2, estados: { notificado: true, iludido: true } }, banco: ['bug-do-discord', 'drone-vigia'] } });
    const para = EU(e).banco[0].uid;
    const s = jogar(e, { tipo: 'recuar', para }).estado;
    assert.equal(EU(s).ativo.id, 'bug-do-discord');
    const saiu = EU(s).banco.find((c) => c.id === 'moderador-do-ban');
    assert.equal(saiu.aura, 0);
    assert.equal(saiu.estados.notificado, false);
    assert.equal(saiu.estados.iludido, false);
    invalida(() => jogar(s, { tipo: 'recuar', para: saiu.uid }), '1 recuo');

    const pobre = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 1 }, banco: ['bug-do-discord'] } });
    invalida(() => jogar(pobre, { tipo: 'recuar', para: EU(pobre).banco[0].uid }), 'Aura insuficiente');
    const mudo = mesa({ turno: 6, eu: { ativo: { id: 'bug-do-discord', aura: 3, estados: { silenciado: 6 } }, banco: ['drone-vigia'] } });
    invalida(() => jogar(mudo, { tipo: 'recuar', para: EU(mudo).banco[0].uid }), 'Silenciado não recua');
    invalida(() => atacar(mudo), 'Silenciado não ataca');
});

test('Notificado: tira 10 dos ativos dos dois lados entre os turnos (pode nocautear)', () => {
    const e = mesa({
        eu: { ativo: { id: 'drone-vigia', estados: { notificado: true } } },
        ele: { ativo: { id: 'notificacao-morcego', dano: 30, estados: { notificado: true } }, banco: ['bug-do-discord'] },
    });
    const r = jogar(e, { tipo: 'passar' });
    assert.equal(r.estado.jogadores[0].ativo.dano, 10);
    assert.equal(r.estado.jogadores[0].pontos, 1, 'o Morcego caiu com o veneno');
    assert.deepEqual(r.estado.pendentes, [{ jogador: 1, tipo: 'novoAtivo' }]);
    const s = R.aplicar(r.estado, { tipo: 'novoAtivo', jogador: 1, uid: r.estado.jogadores[1].banco[0].uid }).estado;
    assert.equal(s.vez, 1, 'depois da escolha começa o próximo turno');
    assert.equal(s.turno, 6);
});

test('limite de 30 turnos: vence quem tem mais pontos', () => {
    const e = mesa({ turno: 30, eu: { pontos: 1 } });
    const r = jogar(e, { tipo: 'passar' });
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'limiteTurnos');
    const empate = jogar(mesa({ turno: 30 }), { tipo: 'passar' }).estado;
    assert.equal(empate.vencedor, 'empate');
});

test('deck vazio: não compra e ninguém perde por isso', () => {
    const e = mesa({ ele: { deck: [] } });
    const r = jogar(e, { tipo: 'passar' });
    assert.equal(r.estado.fase, 'jogo');
    assert.ok(r.eventos.some((ev) => ev.tipo === 'deckVazio'));
});

test('Iludido: moeda coroa = ataque falha e leva 20; cara = ataca normal', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1, estados: { iludido: true } } }, ele: { ativo: 'drone-vigia' } });
    const falhou = comMoeda(e, false, { tipo: 'atacar', jogador: 0, ataque: 0 });
    assert.equal(falhou.estado.jogadores[0].ativo.dano, 20);
    assert.equal(falhou.estado.jogadores[1].ativo.dano, 0);
    const acertou = comMoeda(e, true, { tipo: 'atacar', jogador: 0, ataque: 0 });
    assert.equal(acertou.estado.jogadores[1].ativo.dano, 20);
});

// ---- Campos -----------------------------------------------------------------------
test('campo: 1 por turno, troca o anterior (vai para o descarte do dono), não repete o mesmo', () => {
    const e = mesa({ eu: { mao: ['toradolandia', 'casa-do-enzo-games', 'estacionamento-noturno'] }, campo: { id: 'estacionamento-noturno', dono: 1 } });
    invalida(() => jogar(e, { tipo: 'campo', uid: EU(e).mao[2].uid }), 'já está na mesa');
    const s = jogar(e, { tipo: 'campo', uid: EU(e).mao[0].uid }).estado;
    assert.equal(s.campo.carta.id, 'toradolandia');
    assert.equal(s.campo.dono, 0);
    assert.equal(s.jogadores[1].descarte[0].id, 'estacionamento-noturno');
    invalida(() => jogar(s, { tipo: 'campo', uid: EU(s).mao[0].uid }), 'só 1 campo');
    invalida(() => jogar(e, { tipo: 'campo', uid: EU(mesa({ eu: { mao: ['bug-do-discord'] } })).mao[0].uid }), 'não é um campo');
});

test('Piscina de Macarronada: cura 20 do ativo de quem começa o turno', () => {
    const e = mesa({ ele: { ativo: { id: 'drone-vigia', dano: 30 } }, campo: 'piscina-de-macarronada' });
    const s = jogar(e, { tipo: 'passar' }).estado;
    assert.equal(s.jogadores[1].ativo.dano, 10);
});

test('Toradolândia: com 3 cartas ou menos na mão, compra 1 a mais', () => {
    const e = mesa({ ele: { mao: ['bug-do-discord'] }, campo: 'toradolandia' });
    assert.equal(jogar(e, { tipo: 'passar' }).estado.jogadores[1].mao.length, 3);
    const cheia = mesa({ ele: { mao: ['bug-do-discord', 'bug-do-discord', 'bug-do-discord', 'bug-do-discord'] }, campo: 'toradolandia' });
    assert.equal(jogar(cheia, { tipo: 'passar' }).estado.jogadores[1].mao.length, 5);
});

test('Mansão do Inominável: goons +20 HP, Notificado tira 20; sair da Mansão pode nocautear', () => {
    const e = mesa({
        eu: { ativo: { id: 'drone-vigia', dano: 65 }, mao: ['toradolandia'] },
        ele: { ativo: { id: 'italolol', estados: { notificado: true } } },
        campo: { id: 'mansao-do-inominavel', dono: 1 },
    });
    assert.equal(R.hpMax(e, EU(e).ativo), 80);
    assert.equal(R.hpMax(e, ELE(e).ativo), 90, 'personagem não ganha HP');
    assert.equal(jogar(e, { tipo: 'passar' }).estado.jogadores[1].ativo.dano, 20);
    const r = jogar(e, { tipo: 'campo', uid: EU(e).mao[0].uid });
    assert.ok(r.eventos.some((ev) => ev.tipo === 'nocaute' && ev.id === 'drone-vigia'));
    assert.equal(r.estado.jogadores[1].pontos, 1);
});

test('Estacionamento Noturno: goons recuam de graça', () => {
    const e = mesa({ eu: { ativo: { id: 'moderador-do-ban' }, banco: ['bug-do-discord'] }, campo: 'estacionamento-noturno' });
    assert.equal(R.custoRecuo(e, EU(e).ativo), 0);
    const chorao = mesa({ eu: { ativo: 'chorao' }, campo: 'estacionamento-noturno' });
    assert.equal(R.custoRecuo(chorao, EU(chorao).ativo), 2);
    assert.doesNotThrow(() => jogar(e, { tipo: 'recuar', para: EU(e).banco[0].uid }));
});

test('Casa do Enzo Games: descarta 1 da mão para comprar 1, uma vez por turno', () => {
    const e = mesa({ eu: { mao: ['bug-do-discord', 'drone-vigia'], deck: ['italolol', 'italolol'] }, campo: 'casa-do-enzo-games' });
    const s = jogar(e, { tipo: 'trocarCarta', uid: EU(e).mao[0].uid }).estado;
    assert.deepEqual(EU(s).mao.map((c) => c.id), ['drone-vigia', 'italolol']);
    assert.equal(EU(s).descarte[0].id, 'bug-do-discord');
    invalida(() => jogar(s, { tipo: 'trocarCarta', uid: EU(s).mao[0].uid }), 'só 1 troca');
    invalida(() => jogar(mesa({ eu: { mao: ['bug-do-discord'] } }), { tipo: 'trocarCarta', uid: 'x' }), 'Casa do Enzo');
});

test('São João do Butico: ataques não acertam o banco', () => {
    const e = mesa({ eu: { ativo: { id: 'degustador-da-noite', aura: 1 } }, ele: { banco: ['drone-vigia'] }, campo: 'sao-joao-do-butico' });
    invalida(() => atacar(e, 0, { alvo: ELE(e).banco[0].uid }), 'protege o banco');
    assert.doesNotThrow(() => atacar(e, 0, { alvo: ELE(e).ativo.uid }));
});

// ---- Cartas -----------------------------------------------------------------------
test('Enzo Games: Almôndega 30 e Macarronada a 300% 120', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 30);
    const s = atacar(e, 1).estado;
    assert.equal(s.jogadores[1].ativo, null, 'Chorão tem 110 HP: caiu com 120');
    assert.equal(s.jogadores[0].pontos, 1);
});

test('Cabo Côco: no ativo impede o adversário de jogar campo; Arquivo Confidencial cura 20', () => {
    const e = mesa({ eu: { mao: ['toradolandia'] }, ele: { ativo: 'cabo-coco' } });
    invalida(() => jogar(e, { tipo: 'campo', uid: EU(e).mao[0].uid }), 'Conteúdo Banido');
    const c = mesa({ eu: { ativo: { id: 'cabo-coco', aura: 2, dano: 50 } }, ele: { ativo: 'chorao' } });
    const s = atacar(c, 0).estado;
    assert.equal(s.jogadores[1].ativo.dano, 60);
    assert.equal(s.jogadores[0].ativo.dano, 50, '50 - 20 de cura + 20 do contra-ataque do Chorão');
});

test('Degustador: Vírgula-rangue acerta o banco; Escudo de Parênteses tira 30 do próximo ataque', () => {
    const e = mesa({ eu: { ativo: { id: 'degustador-da-noite', aura: 3 } }, ele: { ativo: 'chorao', banco: ['drone-vigia'] } });
    const alvo = ELE(e).banco[0].uid;
    assert.equal(atacar(e, 0, { alvo }).estado.jogadores[1].banco[0].dano, 20);
    invalida(() => atacar(e, 0), 'escolha o alvo');
    let s = atacar(e, 1).estado;
    assert.deepEqual(s.jogadores[0].ativo.escudo, { valor: 30, ate: 6 });
    s.jogadores[1].ativo.aura = 2;
    assert.equal(s.jogadores[0].ativo.dano, 20, 'levou 20 do contra-ataque do Chorão');
    s = R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }).estado; // Chorão, Birra: 50 - 30 = 20
    assert.equal(s.jogadores[0].ativo.dano, 40);
});

test('O Inominável: poder deixa o ativo do outro Notificado (1 vez por turno); Bala Dourada acerta qualquer um', () => {
    const e = mesa({ eu: { banco: ['o-inominavel'] }, ele: { banco: ['drone-vigia'] } });
    const uid = EU(e).banco[0].uid;
    const s = jogar(e, { tipo: 'poder', uid }).estado;
    assert.equal(ELE(s).ativo.estados.notificado, true);
    invalida(() => jogar(s, { tipo: 'poder', uid }), 'já foi usado');
    const b = mesa({ eu: { ativo: { id: 'o-inominavel', aura: 3 } }, ele: { banco: ['italolol'] } });
    assert.equal(atacar(b, 0, { alvo: ELE(b).banco[0].uid }).estado.jogadores[1].banco[0].dano, 60);
});

test('Superkid: Farmar Aura prende +1; Aura de 67 Segundos = 20 + 20 por Aura', () => {
    const e = mesa({ eu: { ativo: { id: 'superkid', aura: 1 } } });
    assert.equal(atacar(e, 0).estado.jogadores[0].ativo.aura, 2);
    const f = mesa({ eu: { ativo: { id: 'superkid', aura: 4 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(f, 1).estado.jogadores[1].ativo.dano, 100);
});

test('Chorão: quem causa dano nele leva 20; ataque sem dano não ativa', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[0].ativo.dano, 20);
    const encantadora = mesa({ eu: { ativo: { id: 'encantadora', aura: 1 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(encantadora, 0).estado.jogadores[0].ativo.dano, 0);
});

test('Sombra do Degustador: Teemo no Top deixa Notificado; recua de graça', () => {
    const e = mesa({ eu: { ativo: { id: 'sombra-do-degustador', aura: 1 } } });
    const s = atacar(e, 0).estado;
    assert.equal(s.jogadores[1].ativo.estados.notificado, true);
    assert.equal(s.jogadores[1].ativo.dano, 30, '20 do ataque + 10 do Notificado');
    assert.equal(R.custoRecuo(e, EU(e).ativo), 0);
});

test('Hatsune Neves: poder compra 1 carta; Porta do Quarto 30 e escudo de 20', () => {
    const e = mesa({ eu: { ativo: 'hatsune-neves', mao: [] } });
    const s = jogar(e, { tipo: 'poder', uid: EU(e).ativo.uid }).estado;
    assert.equal(EU(s).mao.length, 1);
    const semDeck = mesa({ eu: { ativo: 'hatsune-neves', deck: [] } });
    invalida(() => jogar(semDeck, { tipo: 'poder', uid: EU(semDeck).ativo.uid }), 'deck acabou');
    const p = atacar(mesa({ eu: { ativo: { id: 'hatsune-neves', aura: 2 } } }), 0).estado;
    assert.equal(p.jogadores[1].ativo.dano, 30);
    assert.equal(p.jogadores[0].ativo.escudo.valor, 20);
});

test('ItaloLOL: 0/14/2 dá 70 e ele leva 30 (e pode cair sozinho)', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 2 } }, ele: { ativo: 'chorao' } });
    const s = atacar(e, 1).estado;
    assert.equal(s.jogadores[1].ativo.dano, 70);
    assert.equal(s.jogadores[0].ativo.dano, 50, '30 próprio + 20 do Chorão');
    const fraco = mesa({ eu: { ativo: { id: 'italolol', aura: 2, dano: 70 }, banco: ['bug-do-discord'] }, ele: { ativo: 'chorao' } });
    const f = atacar(fraco, 1).estado;
    assert.equal(f.jogadores[1].pontos, 1);
    assert.deepEqual(f.pendentes, [{ jogador: 0, tipo: 'novoAtivo' }]);
});

test('Stand do Joinha: no banco dá +10 ao ativo (dois Stands não somam)', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1 }, banco: ['stand-do-joinha', 'stand-do-joinha'] }, ele: { ativo: 'drone-vigia' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 30);
    const ativo = mesa({ eu: { ativo: { id: 'stand-do-joinha', aura: 1 } }, ele: { ativo: 'drone-vigia' } });
    assert.equal(atacar(ativo, 0).estado.jogadores[1].ativo.dano, 20, 'no ativo o poder não conta');
});

test('Encantadora: Vem Cá troca o ativo dele por quem você escolher do banco; Chama Rosa deixa Iludido', () => {
    const e = mesa({ eu: { ativo: { id: 'encantadora', aura: 2 } }, ele: { ativo: { id: 'chorao', estados: { notificado: true } }, banco: ['bug-do-discord', 'notificacao-morcego'] } });
    invalida(() => atacar(e, 0), 'escolha quem vem do banco');
    const alvo = ELE(e).banco[1].uid;
    const s = atacar(e, 0, { alvo }).estado;
    assert.equal(s.jogadores[1].ativo.id, 'notificacao-morcego');
    const chorao = s.jogadores[1].banco.find((c) => c.id === 'chorao');
    assert.equal(chorao.estados.notificado, false, 'quem vai para o banco perde os estados');
    const semBanco = mesa({ eu: { ativo: { id: 'encantadora', aura: 1 } } });
    assert.doesNotThrow(() => atacar(semBanco, 0));
    assert.equal(atacar(e, 1).estado.jogadores[1].ativo.estados.iludido, true);
});

test('Marreteiro: Quebrar Tudo descarta o campo; Marretada 90', () => {
    const e = mesa({ eu: { ativo: { id: 'marreteiro-do-coracao', aura: 3 } }, ele: { ativo: 'chorao' }, campo: { id: 'toradolandia', dono: 1 } });
    const s = atacar(e, 0).estado;
    assert.equal(s.campo, null);
    assert.equal(s.jogadores[1].descarte[0].id, 'toradolandia');
    assert.equal(atacar(e, 1).estado.jogadores[1].ativo.dano, 90);
});

test('Moderador do BAN: Silenciado não ataca nem recua no próximo turno, depois passa', () => {
    const e = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 2 } }, ele: { ativo: { id: 'italolol', aura: 1 }, banco: ['bug-do-discord'] } });
    let s = atacar(e, 0).estado; // turno 6 é do jogador 1
    invalida(() => R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }), 'Silenciado');
    invalida(() => R.aplicar(s, { tipo: 'recuar', jogador: 1, para: s.jogadores[1].banco[0].uid }), 'Silenciado');
    s = R.aplicar(s, { tipo: 'passar', jogador: 1 }).estado;
    s = R.aplicar(s, { tipo: 'passar', jogador: 0 }).estado;
    assert.doesNotThrow(() => R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }));
});

test('Cara de Coração: +20 com Encantadora na mesa', () => {
    const e = mesa({ eu: { ativo: { id: 'cara-de-coracao', aura: 1 }, banco: ['encantadora'] }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 40);
});

test('Bug do Discord: moeda cara = 40, coroa = 0', () => {
    const e = mesa({ eu: { ativo: { id: 'bug-do-discord', aura: 1 } }, ele: { ativo: 'chorao' } });
    assert.equal(comMoeda(e, true, { tipo: 'atacar', jogador: 0, ataque: 0 }).estado.jogadores[1].ativo.dano, 40);
    assert.equal(comMoeda(e, false, { tipo: 'atacar', jogador: 0, ataque: 0 }).estado.jogadores[1].ativo.dano, 0);
});

test('Emoji Pistola: 10 + 10 por goon na sua mesa (conta ele mesmo)', () => {
    const e = mesa({ eu: { ativo: { id: 'emoji-pistola', aura: 1 }, banco: ['bug-do-discord', 'italolol'] }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 30);
});

test('Drone Vigia: Câmera mostra a mão do adversário (só para quem espiou)', () => {
    const e = mesa({ eu: { ativo: 'drone-vigia' }, ele: { mao: ['enzo-games', 'bug-do-discord'] } });
    const r = jogar(e, { tipo: 'poder', uid: EU(e).ativo.uid });
    assert.deepEqual(EU(r.estado).espiada, ['enzo-games', 'bug-do-discord']);
    assert.ok(r.eventos.some((ev) => ev.tipo === 'espiar' && ev.privado && ev.ids.length === 2));
    assert.equal(R.visaoDe(r.estado, 1).jogadores[0].espiada, null);
    const vazia = mesa({ eu: { ativo: 'drone-vigia' } });
    invalida(() => jogar(vazia, { tipo: 'poder', uid: EU(vazia).ativo.uid }), 'está vazia');
});

// ---- Visão, repetição e robô ---------------------------------------------------
test('visaoDe esconde a mão e o deck do outro, a ordem do próprio deck e a sorte', () => {
    const e = R.criarPartida({ semente: 3, decks: [DECK, DECK] });
    const v = R.visaoDe(e, 0);
    assert.equal(v.jogadores[1].mao, 5);
    assert.equal(v.jogadores[1].deck, 10);
    assert.equal(v.jogadores[0].deck, 10);
    assert.equal(v.jogadores[0].mao.length, 5);
    assert.equal(v.rng, undefined);
});

function partidaDeRobos(semente, niveis = ['normal', 'normal']) {
    let sorte = 0;
    const aleatorio = () => ((sorte = (sorte * 1103515245 + 12345 + semente) % 2147483648) / 2147483648);
    const config = { semente, decks: [DECK, DECK] };
    let estado = R.criarPartida(config);
    const jogadas = [];
    while (estado.fase !== 'fim') {
        const j = Robo.quemJoga(estado);
        const jogada = Robo.escolherJogada(estado, j, { nivel: niveis[j], aleatorio });
        jogadas.push(jogada);
        estado = R.aplicar(estado, jogada).estado;
        assert.ok(jogadas.length < 5000, 'partida travada');
    }
    return { config, jogadas, estado };
}

test('repetir: mesma semente + mesmas jogadas = mesmo final (o servidor confere assim)', () => {
    for (let s = 0; s < 20; s++) {
        const { config, jogadas, estado } = partidaDeRobos(s);
        assert.deepEqual(R.repetir(config, jogadas), estado);
        const truque = jogadas.slice();
        truque.push({ tipo: 'passar', jogador: 0 });
        assert.throws(() => R.repetir(config, truque), R.JogadaInvalida);
    }
});

test('300 partidas com jogadas aleatórias: sem erro, cartas nunca somem nem duplicam', () => {
    let sorte = 42;
    const aleatorio = () => ((sorte = (sorte * 16807) % 2147483647) / 2147483647);
    const todas = Baralho.CARTAS.map((c) => c.id);
    for (let p = 0; p < 300; p++) {
        const decks = [0, 1].map(() => {
            for (;;) {
                const d = [];
                while (d.length < R.TAMANHO_DECK) d.push(todas[Math.floor(aleatorio() * todas.length)]);
                if (!R.validarDeck(d).length) return d;
            }
        });
        let e = R.criarPartida({ semente: p, decks });
        let passos = 0;
        while (e.fase !== 'fim') {
            const j = Robo.quemJoga(e);
            const validas = R.jogadasValidas(e, j);
            assert.ok(validas.length, `sem jogada na partida ${p}`);
            e = R.aplicar(e, validas[Math.floor(aleatorio() * validas.length)]).estado;
            for (const x of e.jogadores) {
                const campoMeu = e.campo && e.jogadores[e.campo.dono] === x ? 1 : 0;
                const total = x.deck.length + x.mao.length + x.banco.length + x.descarte.length + (x.ativo ? 1 : 0) + campoMeu;
                assert.equal(total, 15, `partida ${p}: cartas somaram ${total}`);
                for (const c of R.naMesa(x)) assert.ok(c.dano < R.hpMax(e, c), 'carta sem HP ficou na mesa');
                assert.ok(x.banco.length <= R.VAGAS_BANCO);
            }
            assert.ok(++passos < 3000, 'partida travada');
        }
    }
});

test('robô: sempre faz jogada válida; normal vence o fácil na maioria', () => {
    let normal = 0;
    for (let s = 0; s < 60; s++) {
        const niveis = s % 2 ? ['facil', 'normal'] : ['normal', 'facil'];
        const { estado } = partidaDeRobos(s, niveis);
        if (estado.vencedor !== 'empate' && niveis[estado.vencedor] === 'normal') normal++;
    }
    assert.ok(normal >= 40, `normal venceu só ${normal} de 60`);
});
