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
        x.vida = lado.vida === undefined ? R.VIDA_INICIAL : lado.vida;
        x.flags = { auras: 1, auraEm: {}, reforco: 0, campo: false, recuo: false, trocarCarta: false, poderes: [] };
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
            for (const a of d.ataques) assert.ok(a.nome && a.custo >= 0 && a.dano >= 0, `${c.id}: ataque ${a.nome}`);
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
    // 3 Auras do turno + 1 de Reforço (essa só vale no banco); no máximo 2 na mesma carta.
    e = jogar(e, { tipo: 'aura', alvo: ativo }).estado;
    e = jogar(e, { tipo: 'aura', alvo: ativo }).estado;
    invalida(() => jogar(e, { tipo: 'aura', alvo: ativo }), 'no máximo 2 Auras');
    e = jogar(e, { tipo: 'aura', alvo: banco }).estado;
    e = jogar(e, { tipo: 'aura', alvo: banco }).estado;
    invalida(() => jogar(e, { tipo: 'aura', alvo: banco }), 'já prendeu');
    assert.equal(EU(e).ativo.aura + EU(e).banco[0].aura, 4);
    // Na ordem inversa também: banco primeiro, depois ativo.
    let f = mesa({ turno: 1, eu: { banco: ['bug-do-discord'] }, ele: { banco: ['drone-vigia'] } });
    f = jogar(f, { tipo: 'passar' }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).banco[0].uid }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }).estado;
    assert.equal(EU(f).ativo.aura + EU(f).banco[0].aura, 2);
    // Turno 3 volta a ser 3 Auras, no máximo 2 na mesma carta (a 3ª vai para outra).
    f = jogar(f, { tipo: 'passar' }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }).estado;
    f = jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }).estado;
    invalida(() => jogar(f, { tipo: 'aura', alvo: EU(f).ativo.uid }), 'no máximo 2 Auras');
    f = jogar(f, { tipo: 'aura', alvo: EU(f).banco[0].uid }).estado;
    invalida(() => jogar(f, { tipo: 'aura', alvo: EU(f).banco[0].uid }), 'já prendeu');
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
    assert.equal(estado.jogadores[1].ativo.dano, 20 * R.ESCALA);
    assert.equal(estado.vez, 1);
    assert.equal(estado.turno, 6);
    assert.deepEqual(eventos.map((ev) => ev.tipo), ['ataque', 'dano', 'fimTurno', 'turno', 'compra']);
    assert.equal(e.jogadores[1].ativo.dano, 0, 'aplicar não altera o estado recebido');
});

test('nocaute: carta vai para o descarte, o dono perde vida pela raridade, dono escolhe novo ativo', () => {
    const e = mesa({
        eu: { ativo: { id: 'enzo-games', aura: 3 } },
        ele: { ativo: 'drone-vigia', banco: ['bug-do-discord', 'italolol'] },
    });
    const r = atacar(e, 1);
    let s = r.estado;
    // A carta caiu: o dono só perde a vida pela raridade (não há golpe extra).
    assert.equal(s.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.comum);
    assert.equal(s.jogadores[1].ativo, null);
    assert.equal(s.jogadores[1].descarte.length, 1);
    assert.deepEqual(s.pendentes, [{ jogador: 1, tipo: 'novoAtivo' }]);
    assert.equal(s.vez, 0, 'o turno só passa depois da escolha');
    invalida(() => R.aplicar(s, { tipo: 'passar', jogador: 0 }), 'novo ativo');
    invalida(() => R.aplicar(s, { tipo: 'novoAtivo', jogador: 0, uid: 'x' }), 'não é você');
    s = R.aplicar(s, { tipo: 'novoAtivo', jogador: 1, uid: s.jogadores[1].banco[1].uid }).estado;
    assert.equal(s.jogadores[1].ativo.id, 'italolol');
    assert.equal(s.vez, 1);

    // A raridade muda a vida que o dono perde: o lendário dói mais que o comum.
    const lend = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: { id: 'superkid', dano: 20 * R.ESCALA }, banco: ['bug-do-discord'] } });
    assert.equal(atacar(lend, 1).estado.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.lendario);
});

test('vitória: vida zerada encerra a partida; mesa vazia não é mais derrota', () => {
    const e = mesa({
        eu: { ativo: { id: 'enzo-games', aura: 3 } },
        ele: { vida: R.DANO_NOCAUTE.comum, ativo: 'drone-vigia', banco: ['bug-do-discord'] },
    });
    const r = atacar(e, 1);
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'vida');
    assert.equal(r.estado.jogadores[1].vida, 0);
    invalida(() => R.aplicar(r.estado, { tipo: 'passar', jogador: 1 }), 'acabou');
    assert.deepEqual(R.jogadasValidas(r.estado, 0), []);

    // Derrubar a última carta não encerra mais: o jogo continua.
    const vazia = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'drone-vigia' } });
    const v = atacar(vazia, 1).estado;
    assert.equal(v.fase, 'jogo');
    assert.equal(v.vencedor, null);
});

test('desistir encerra na hora a favor do outro', () => {
    const e = mesa();
    const r = R.aplicar(e, { tipo: 'desistir', jogador: 1 });
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'desistencia');
    // O servidor desiste por quem ficou 3 vezes sem jogar: motivo próprio, sem ponto de carta.
    const i = R.aplicar(e, { tipo: 'desistir', jogador: 1, motivo: 'inatividade' });
    assert.equal(i.estado.vencedor, 0);
    assert.equal(i.estado.motivo, 'inatividade');
    assert.deepEqual(i.estado.jogadores.map((x) => x.vida), e.jogadores.map((x) => x.vida));
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

test('Notificado: tira 200 dos ativos dos dois lados entre os turnos (pode nocautear)', () => {
    const e = mesa({
        eu: { ativo: { id: 'drone-vigia', estados: { notificado: true } } },
        ele: { ativo: { id: 'notificacao-morcego', dano: 30 * R.ESCALA, estados: { notificado: true } }, banco: ['bug-do-discord'] },
    });
    const r = jogar(e, { tipo: 'passar' });
    assert.equal(r.estado.jogadores[0].ativo.dano, 10 * R.ESCALA);
    assert.equal(r.estado.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.comum, 'o dono do Morcego perdeu vida com o veneno');
    assert.deepEqual(r.estado.pendentes, [{ jogador: 1, tipo: 'novoAtivo' }]);
    const s = R.aplicar(r.estado, { tipo: 'novoAtivo', jogador: 1, uid: r.estado.jogadores[1].banco[0].uid }).estado;
    assert.equal(s.vez, 1, 'depois da escolha começa o próximo turno');
    assert.equal(s.turno, 6);
});

test('limite de 30 turnos: vence quem tem mais vida', () => {
    const e = mesa({ turno: 30, eu: { vida: R.VIDA_INICIAL }, ele: { vida: R.VIDA_INICIAL - 500 } });
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

test('Iludido: moeda coroa = ataque falha e leva 400; cara = ataca normal', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1, estados: { iludido: true } } }, ele: { ativo: 'drone-vigia' } });
    const falhou = comMoeda(e, false, { tipo: 'atacar', jogador: 0, ataque: 0 });
    assert.equal(falhou.estado.jogadores[0].ativo.dano, 20 * R.ESCALA);
    assert.equal(falhou.estado.jogadores[1].ativo.dano, 0);
    const acertou = comMoeda(e, true, { tipo: 'atacar', jogador: 0, ataque: 0 });
    assert.equal(acertou.estado.jogadores[1].ativo.dano, 20 * R.ESCALA);
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

test('Piscina de Macarronada: quem a joga é curado no mesmo turno (400 no ativo dele); o adversário não', () => {
    const e = mesa({ eu: { ativo: { id: 'drone-vigia', dano: 30 * R.ESCALA }, mao: ['piscina-de-macarronada'] }, ele: { ativo: { id: 'drone-vigia', dano: 30 * R.ESCALA } } });
    const r = jogar(e, { tipo: 'campo', uid: EU(e).mao[0].uid });
    assert.equal(r.estado.jogadores[0].ativo.dano, 30 * R.ESCALA - 20 * R.ESCALA, 'quem jogou curou 400 agora');
    assert.equal(r.estado.jogadores[1].ativo.dano, 30 * R.ESCALA, 'o adversário só é curado no começo do turno dele');
    assert.ok(r.eventos.some((ev) => ev.tipo === 'cura' && ev.fonte === 'campo' && ev.uid === EU(e).ativo.uid));
    // sem dano não há o que curar (nada de evento)
    const inteiro = mesa({ eu: { ativo: 'drone-vigia', mao: ['piscina-de-macarronada'] } });
    assert.ok(!jogar(inteiro, { tipo: 'campo', uid: EU(inteiro).mao[0].uid }).eventos.some((ev) => ev.tipo === 'cura'));
});

test('Piscina de Macarronada: cura 400 do ativo de quem começa o turno', () => {
    const e = mesa({ ele: { ativo: { id: 'drone-vigia', dano: 30 * R.ESCALA } }, campo: 'piscina-de-macarronada' });
    const s = jogar(e, { tipo: 'passar' }).estado;
    assert.equal(s.jogadores[1].ativo.dano, 10 * R.ESCALA);
});

test('Toradolândia: com 3 cartas ou menos na mão, compra 1 a mais', () => {
    const e = mesa({ ele: { mao: ['bug-do-discord'] }, campo: 'toradolandia' });
    assert.equal(jogar(e, { tipo: 'passar' }).estado.jogadores[1].mao.length, 3);
    const cheia = mesa({ ele: { mao: ['bug-do-discord', 'bug-do-discord', 'bug-do-discord', 'bug-do-discord'] }, campo: 'toradolandia' });
    assert.equal(jogar(cheia, { tipo: 'passar' }).estado.jogadores[1].mao.length, 5);
});

test('Mansão do Inominável: goons +20 HP, Notificado tira 20; sair da Mansão tira o HP extra mas não nocauteia', () => {
    const e = mesa({
        eu: { ativo: { id: 'drone-vigia', dano: 65 * R.ESCALA }, mao: ['toradolandia'] },
        ele: { ativo: { id: 'italolol', estados: { notificado: true } } },
        campo: { id: 'mansao-do-inominavel', dono: 1 },
    });
    assert.equal(R.hpMax(e, EU(e).ativo), 80 * R.ESCALA);
    assert.equal(R.hpMax(e, ELE(e).ativo), 90 * R.ESCALA, 'personagem não ganha HP');
    assert.equal(jogar(e, { tipo: 'passar' }).estado.jogadores[1].ativo.dano, 20 * R.ESCALA);
    const r = jogar(e, { tipo: 'campo', uid: EU(e).mao[0].uid });
    assert.ok(!r.eventos.some((ev) => ev.tipo === 'nocaute'), 'sair da Mansão não derruba ninguém');
    assert.equal(EU(r.estado).ativo.dano, 60 * R.ESCALA - 1, 'fica com 1 de vida');
    assert.equal(r.estado.jogadores[0].vida, R.VIDA_INICIAL);
});

test('Estacionamento Noturno: goons recuam de graça', () => {
    const e = mesa({ eu: { ativo: { id: 'moderador-do-ban' }, banco: ['bug-do-discord'] }, campo: 'estacionamento-noturno' });
    assert.equal(R.custoRecuo(e, EU(e).ativo), 0);
    const chorao = mesa({ eu: { ativo: 'chorao' }, campo: 'estacionamento-noturno' });
    assert.equal(R.custoRecuo(chorao, EU(chorao).ativo), 2);
    assert.doesNotThrow(() => jogar(e, { tipo: 'recuar', para: EU(e).banco[0].uid }));
});

test('Casa do Enzo Games: devolve 1 da mão ao baralho e compra 1, uma vez por turno', () => {
    const e = mesa({ eu: { mao: ['bug-do-discord', 'drone-vigia'], deck: ['italolol', 'italolol'] }, campo: 'casa-do-enzo-games' });
    const r = jogar(e, { tipo: 'trocarCarta', uid: EU(e).mao[0].uid });
    const s = r.estado;
    assert.equal(EU(s).mao.length, 2, 'devolveu 1 e comprou 1');
    assert.equal(EU(s).descarte.length, 0, 'não vai mais para o descarte');
    assert.equal(EU(s).deck.length, 2, 'voltou ao baralho e a compra saiu dele');
    assert.equal(EU(s).flags.trocarCarta, true);
    assert.deepEqual(r.eventos.map((ev) => ev.tipo), ['devolver', 'compra']);
    assert.equal(r.eventos[0].de, 'mao');
    assert.equal(r.eventos[0].motivo, 'casa');
    invalida(() => jogar(s, { tipo: 'trocarCarta', uid: EU(s).mao[0].uid }), 'só 1 troca');
    invalida(() => jogar(mesa({ eu: { mao: ['bug-do-discord'] } }), { tipo: 'trocarCarta', uid: 'x' }), 'Casa do Enzo');
});

test('devolverMao: carta sai da mão e entra no baralho sem comprar; 2 por turno, reseta no turno seguinte', () => {
    const e = mesa({ eu: { mao: ['bug-do-discord', 'drone-vigia', 'emoji-pistola', 'italolol'], deck: ['cara-de-coracao'] } });
    const u0 = EU(e).mao[0].uid;
    const r = jogar(e, { tipo: 'devolverMao', uid: u0 });
    const s = r.estado;
    assert.equal(EU(s).mao.length, 3, 'saiu da mão e não comprou');
    assert.equal(EU(s).deck.length, 2, 'a carta entrou no baralho');
    assert.equal(EU(s).deck.some((c) => c.uid === u0), true, 'a mesma instância foi para o baralho');
    assert.equal(EU(s).flags.devolvidasMao, 1);
    assert.deepEqual(r.eventos, [{ tipo: 'devolver', jogador: 0, uid: u0, id: 'bug-do-discord', de: 'mao' }]);
    let x = jogar(s, { tipo: 'devolverMao', uid: EU(s).mao[0].uid }).estado;
    assert.equal(EU(x).flags.devolvidasMao, 2);
    invalida(() => jogar(x, { tipo: 'devolverMao', uid: EU(x).mao[0].uid }), 'só 2 cartas da mão por turno');
    // No turno seguinte volta a poder devolver.
    x = jogar(x, { tipo: 'passar' }).estado;
    x = jogar(x, { tipo: 'passar' }).estado;
    assert.equal(x.vez, 0);
    assert.equal(EU(x).flags.devolvidasMao, 0, 'o limite é por turno');
    assert.doesNotThrow(() => jogar(x, { tipo: 'devolverMao', uid: EU(x).mao[0].uid }));
});

test('devolverMesa do banco: volta limpa ao baralho, sem nocaute nem golpe extra; 1 por turno', () => {
    const e = mesa({ eu: { ativo: 'cara-de-coracao', banco: [{ id: 'drone-vigia', dano: 50, aura: 3, estados: { notificado: true } }], deck: ['italolol'] } });
    const u = EU(e).banco[0].uid;
    const vidaAntes = EU(e).vida;
    const r = jogar(e, { tipo: 'devolverMesa', uid: u });
    const s = r.estado;
    assert.equal(EU(s).banco.length, 0, 'saiu da mesa');
    const noDeck = EU(s).deck.find((c) => c.uid === u);
    assert.ok(noDeck, 'foi para o baralho');
    assert.equal(noDeck.dano, 0);
    assert.equal(noDeck.aura, 0);
    assert.equal(noDeck.estados.notificado, false);
    assert.equal(noDeck.estados.virada, 0);
    assert.equal(EU(s).vida, vidaAntes, 'devolver não é nocaute: o dono não perde vida');
    assert.equal(r.eventos.some((ev) => ev.tipo === 'nocaute'), false);
    assert.equal(r.eventos.some((ev) => ev.tipo === 'golpeExtra'), false);
    assert.deepEqual(r.eventos, [{ tipo: 'devolver', jogador: 0, uid: u, id: 'drone-vigia', de: 'mesa' }]);
    invalida(() => jogar(s, { tipo: 'devolverMesa', uid: EU(s).ativo.uid }), 'só 1 carta da mesa por turno');
});

test('devolverMesa do ativo com banco: pede novo ativo e o turno continua (ele ainda ataca)', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 }, banco: [{ id: 'drone-vigia', aura: 1 }] }, ele: { ativo: 'chorao' } });
    const r = jogar(e, { tipo: 'devolverMesa', uid: EU(e).ativo.uid });
    let s = r.estado;
    assert.equal(EU(s).ativo, null);
    assert.deepEqual(s.pendentes, [{ jogador: 0, tipo: 'novoAtivo' }]);
    assert.equal(s.vez, 0, 'o turno continua com o mesmo jogador');
    invalida(() => jogar(s, { tipo: 'atacar', ataque: 0 }), 'novo ativo');
    s = jogar(s, { tipo: 'novoAtivo', uid: EU(s).banco[0].uid }).estado;
    assert.equal(EU(s).ativo.id, 'drone-vigia');
    assert.equal(s.vez, 0);
    assert.deepEqual(s.pendentes, []);
    assert.doesNotThrow(() => jogar(s, { tipo: 'atacar', ataque: 0 }), 'ainda ataca no mesmo turno');
});

test('devolverMesa do ativo sem banco: sem pendente e a partida continua', () => {
    const e = mesa({ eu: { ativo: 'cara-de-coracao' }, ele: { ativo: 'drone-vigia' } });
    const r = jogar(e, { tipo: 'devolverMesa', uid: EU(e).ativo.uid });
    const s = r.estado;
    assert.equal(EU(s).ativo, null);
    assert.deepEqual(s.pendentes, [], 'mesa vazia é permitida, sem pendente');
    assert.equal(s.fase, 'jogo');
    assert.equal(s.vez, 0);
    assert.doesNotThrow(() => jogar(s, { tipo: 'passar' }));
});

test('devolver fora da vez é inválido', () => {
    const e = mesa({ eu: { mao: ['bug-do-discord'], ativo: 'cara-de-coracao' }, ele: { mao: ['drone-vigia'] } });
    invalida(() => R.aplicar(e, { tipo: 'devolverMao', jogador: 1, uid: ELE(e).mao[0].uid }), 'não é a sua vez');
    invalida(() => R.aplicar(e, { tipo: 'devolverMesa', jogador: 1, uid: ELE(e).ativo.uid }), 'não é a sua vez');
});

test('Casa do Enzo Games: a troca não conta no limite de devolverMao e funciona com o baralho vazio', () => {
    const e = mesa({ eu: { mao: ['bug-do-discord', 'drone-vigia', 'emoji-pistola'], deck: ['italolol', 'italolol'] }, campo: 'casa-do-enzo-games' });
    let s = jogar(e, { tipo: 'devolverMao', uid: EU(e).mao[0].uid }).estado;
    s = jogar(s, { tipo: 'devolverMao', uid: EU(s).mao[0].uid }).estado;
    assert.equal(EU(s).flags.devolvidasMao, 2);
    const r = jogar(s, { tipo: 'trocarCarta', uid: EU(s).mao[0].uid });
    assert.equal(EU(r.estado).flags.devolvidasMao, 2, 'a troca não soma no limite de devolverMao');
    assert.equal(EU(r.estado).flags.trocarCarta, true);
    // Baralho vazio: a carta devolvida vira a própria compra.
    const vazio = mesa({ eu: { mao: ['bug-do-discord'], deck: [] }, campo: 'casa-do-enzo-games' });
    const rv = jogar(vazio, { tipo: 'trocarCarta', uid: EU(vazio).mao[0].uid });
    assert.deepEqual(EU(rv.estado).mao.map((c) => c.id), ['bug-do-discord'], 'a devolvida virou a compra');
    assert.equal(EU(rv.estado).deck.length, 0);
});

test('eventosPara: o devolver da mão esconde id e uid do outro; o da mesa mostra para os dois', () => {
    const eventos = [
        { tipo: 'devolver', jogador: 0, uid: '0-1', id: 'bug-do-discord', de: 'mao' },
        { tipo: 'devolver', jogador: 0, uid: '0-2', id: 'drone-vigia', de: 'mesa' },
        { tipo: 'devolver', jogador: 0, uid: '0-3', id: 'italolol', de: 'mao', motivo: 'casa' },
    ];
    assert.deepEqual(R.eventosPara(eventos, 0), eventos);
    assert.deepEqual(R.eventosPara(eventos, 1), [
        { tipo: 'devolver', jogador: 0, de: 'mao', motivo: undefined },
        { tipo: 'devolver', jogador: 0, uid: '0-2', id: 'drone-vigia', de: 'mesa' },
        { tipo: 'devolver', jogador: 0, de: 'mao', motivo: 'casa' },
    ]);
});

test('jogadasValidas: devolverMao para cada carta da mão e devolverMesa para cada carta da mesa', () => {
    const e = mesa({ eu: { ativo: 'cara-de-coracao', banco: ['drone-vigia'], mao: ['bug-do-discord', 'emoji-pistola'], deck: ['italolol'] } });
    const validas = R.jogadasValidas(e, 0);
    for (const c of EU(e).mao) {
        assert.ok(validas.some((j) => j.tipo === 'devolverMao' && j.uid === c.uid), `devolverMao para ${c.id}`);
    }
    for (const c of R.naMesa(EU(e))) {
        assert.ok(validas.some((j) => j.tipo === 'devolverMesa' && j.uid === c.uid), `devolverMesa para ${c.id}`);
    }
    // Depois de 2 devolverMao, a jogada some da lista do turno.
    let s = jogar(e, { tipo: 'devolverMao', uid: EU(e).mao[0].uid }).estado;
    s = jogar(s, { tipo: 'devolverMao', uid: EU(s).mao[0].uid }).estado;
    assert.equal(R.jogadasValidas(s, 0).some((j) => j.tipo === 'devolverMao'), false);
});

test('São João do Butico: ataques não acertam o banco', () => {
    const e = mesa({ eu: { ativo: { id: 'degustador-da-noite', aura: 1 } }, ele: { banco: ['drone-vigia'] }, campo: 'sao-joao-do-butico' });
    invalida(() => atacar(e, 0, { alvo: ELE(e).banco[0].uid }), 'protege o banco');
    assert.doesNotThrow(() => atacar(e, 0, { alvo: ELE(e).ativo.uid }));
});

// ---- Cartas -----------------------------------------------------------------------
test('Enzo Games: Almôndega 30 e Macarronada a 300% 120', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 30 * R.ESCALA);
    const s = atacar(e, 1).estado;
    assert.equal(s.jogadores[1].ativo, null, 'Chorão tem 2200 HP: caiu com 2400');
    // O Chorão (raro) caiu: o dono perde só o nocaute raro, sem golpe extra.
    assert.equal(s.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.raro);
});

test('Cabo Côco: no ativo impede o adversário de jogar campo; Arquivo Confidencial cura 20', () => {
    const e = mesa({ eu: { mao: ['toradolandia'] }, ele: { ativo: 'cabo-coco' } });
    invalida(() => jogar(e, { tipo: 'campo', uid: EU(e).mao[0].uid }), 'Conteúdo Banido');
    const c = mesa({ eu: { ativo: { id: 'cabo-coco', aura: 2, dano: 50 * R.ESCALA } }, ele: { ativo: 'chorao' } });
    const s = atacar(c, 0).estado;
    assert.equal(s.jogadores[1].ativo.dano, 60 * R.ESCALA);
    assert.equal(s.jogadores[0].ativo.dano, 50 * R.ESCALA, '1000 - 400 de cura + 400 do contra-ataque do Chorão');
});

test('Degustador: Vírgula-rangue acerta o banco; Escudo de Parênteses tira 30 do próximo ataque', () => {
    const e = mesa({ eu: { ativo: { id: 'degustador-da-noite', aura: 3 } }, ele: { ativo: 'chorao', banco: ['drone-vigia'] } });
    const alvo = ELE(e).banco[0].uid;
    assert.equal(atacar(e, 0, { alvo }).estado.jogadores[1].banco[0].dano, 20 * R.ESCALA);
    invalida(() => atacar(e, 0), 'escolha o alvo');
    let s = atacar(e, 1).estado;
    assert.deepEqual(s.jogadores[0].ativo.escudo, { valor: 30 * R.ESCALA, ate: 6 });
    s.jogadores[1].ativo.aura = 2;
    assert.equal(s.jogadores[0].ativo.dano, 20 * R.ESCALA, 'levou 400 do contra-ataque do Chorão');
    s = R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }).estado; // Chorão, Birra: 1000 - 600 do escudo = 400
    assert.equal(s.jogadores[0].ativo.dano, 40 * R.ESCALA);
});

test('O Inominável: poder deixa o ativo do outro Notificado (1 vez por turno); Bala Dourada acerta qualquer um', () => {
    const e = mesa({ eu: { banco: ['o-inominavel'] }, ele: { banco: ['drone-vigia'] } });
    const uid = EU(e).banco[0].uid;
    const s = jogar(e, { tipo: 'poder', uid }).estado;
    assert.equal(ELE(s).ativo.estados.notificado, true);
    invalida(() => jogar(s, { tipo: 'poder', uid }), 'já foi usado');
    const b = mesa({ eu: { ativo: { id: 'o-inominavel', aura: 3 } }, ele: { banco: ['italolol'] } });
    assert.equal(atacar(b, 0, { alvo: ELE(b).banco[0].uid }).estado.jogadores[1].banco[0].dano, 60 * R.ESCALA);
});

test('Superkid: Farmar Aura prende +1; Aura de 67 Segundos = 20 + 20 por Aura', () => {
    const e = mesa({ eu: { ativo: { id: 'superkid', aura: 1 } } });
    assert.equal(atacar(e, 0).estado.jogadores[0].ativo.aura, 2);
    const f = mesa({ eu: { ativo: { id: 'superkid', aura: 4 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(f, 1).estado.jogadores[1].ativo.dano, 100 * R.ESCALA);
});

test('Chorão: quem causa dano nele leva 20; ataque sem dano não ativa', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[0].ativo.dano, 20 * R.ESCALA);
    const farmar = mesa({ eu: { ativo: { id: 'superkid', aura: 1 } }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(farmar, 0).estado.jogadores[0].ativo.dano, 0);
});

test('Sombra do Degustador: Teemo no Top deixa Notificado; recua de graça', () => {
    const e = mesa({ eu: { ativo: { id: 'sombra-do-degustador', aura: 1 } } });
    const s = atacar(e, 0).estado;
    assert.equal(s.jogadores[1].ativo.estados.notificado, true);
    assert.equal(s.jogadores[1].ativo.dano, 30 * R.ESCALA, '400 do ataque + 200 do Notificado');
    assert.equal(R.custoRecuo(e, EU(e).ativo), 0);
});

test('Hatsune Neves: poder compra 1 carta; Porta do Quarto 30 e escudo de 20', () => {
    const e = mesa({ eu: { ativo: 'hatsune-neves', mao: [] } });
    const s = jogar(e, { tipo: 'poder', uid: EU(e).ativo.uid }).estado;
    assert.equal(EU(s).mao.length, 1);
    const semDeck = mesa({ eu: { ativo: 'hatsune-neves', deck: [] } });
    invalida(() => jogar(semDeck, { tipo: 'poder', uid: EU(semDeck).ativo.uid }), 'deck acabou');
    const p = atacar(mesa({ eu: { ativo: { id: 'hatsune-neves', aura: 2 } } }), 0).estado;
    assert.equal(p.jogadores[1].ativo.dano, 30 * R.ESCALA);
    assert.equal(p.jogadores[0].ativo.escudo.valor, 20 * R.ESCALA);
});

test('ItaloLOL: 0/14/2 dá 70 e ele leva 30 (e pode cair sozinho)', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 2 } }, ele: { ativo: 'chorao' } });
    const s = atacar(e, 1).estado;
    assert.equal(s.jogadores[1].ativo.dano, 70 * R.ESCALA);
    assert.equal(s.jogadores[0].ativo.dano, 50 * R.ESCALA, '600 próprio + 400 do Chorão');
    const fraco = mesa({ eu: { ativo: { id: 'italolol', aura: 2, dano: 70 * R.ESCALA }, banco: ['bug-do-discord'] }, ele: { ativo: 'chorao' } });
    const f = atacar(fraco, 1).estado;
    assert.equal(f.jogadores[0].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.raro);
    assert.deepEqual(f.pendentes, [{ jogador: 0, tipo: 'novoAtivo' }]);
});

test('Stand do Joinha: no banco dá +10 ao ativo (dois Stands não somam)', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1 }, banco: ['stand-do-joinha', 'stand-do-joinha'] }, ele: { ativo: 'drone-vigia' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 30 * R.ESCALA);
    const ativo = mesa({ eu: { ativo: { id: 'stand-do-joinha', aura: 1 } }, ele: { ativo: 'drone-vigia' } });
    assert.equal(atacar(ativo, 0).estado.jogadores[1].ativo.dano, 20 * R.ESCALA, 'no ativo o poder não conta');
});

test('Encantadora: poder Vem Cá (do banco ou do ativo) puxa quem você escolher e ela fica virada 1 turno; Chama Rosa deixa Iludido', () => {
    const e = mesa({ eu: { ativo: 'italolol', banco: ['encantadora'] }, ele: { ativo: { id: 'chorao', estados: { notificado: true } }, banco: ['bug-do-discord', 'notificacao-morcego'] } });
    const enc = EU(e).banco[0];
    invalida(() => jogar(e, { tipo: 'poder', uid: enc.uid }), 'escolha quem vem do banco');
    invalida(() => jogar(e, { tipo: 'poder', uid: enc.uid, alvo: ELE(e).ativo.uid }), 'escolha quem vem do banco');
    const alvo = ELE(e).banco[1].uid;
    const r = jogar(e, { tipo: 'poder', uid: enc.uid, alvo });
    const s = r.estado;
    assert.equal(s.jogadores[1].ativo.id, 'notificacao-morcego');
    const chorao = s.jogadores[1].banco.find((c) => c.id === 'chorao');
    assert.equal(chorao.estados.notificado, false, 'quem vai para o banco perde os estados');
    assert.ok(r.eventos.some((ev) => ev.tipo === 'virada' && ev.uid === enc.uid && ev.motivo === 'poder'));
    // fica virada até o próximo turno dela: não usa o poder de novo nem recua
    const encDepois = s.jogadores[0].banco[0];
    assert.equal(R.virada(s, encDepois), true);
    invalida(() => jogar(s, { tipo: 'poder', uid: enc.uid, alvo: s.jogadores[1].banco[0].uid }), 'já foi usado');
    // sem banco do outro lado o poder não vale
    const semBanco = mesa({ eu: { ativo: 'italolol', banco: ['encantadora'] }, ele: { ativo: 'chorao' } });
    invalida(() => jogar(semBanco, { tipo: 'poder', uid: EU(semBanco).banco[0].uid, alvo: ELE(semBanco).ativo.uid }), 'ninguém no banco');
    // Chama Rosa agora é o único ataque dela
    const rosa = mesa({ eu: { ativo: { id: 'encantadora', aura: 2 } }, ele: { ativo: 'chorao' } });
    assert.equal(R.combate('encantadora').ataques.length, 1);
    assert.equal(atacar(rosa, 0).estado.jogadores[1].ativo.estados.iludido, true);
});

test('Marreteiro: Quebrar Tudo descarta o campo; Marretada 90', () => {
    const e = mesa({ eu: { ativo: { id: 'marreteiro-do-coracao', aura: 3 } }, ele: { ativo: 'chorao' }, campo: { id: 'toradolandia', dono: 1 } });
    const s = atacar(e, 0).estado;
    assert.equal(s.campo, null);
    assert.equal(s.jogadores[1].descarte[0].id, 'toradolandia');
    assert.equal(atacar(e, 1).estado.jogadores[1].ativo.dano, 90 * R.ESCALA);
});

test('Moderador do Discord: Silenciado não ataca nem recua no próximo turno, depois passa', () => {
    const e = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 2 } }, ele: { ativo: { id: 'italolol', aura: 1 }, banco: ['bug-do-discord'] } });
    let s = atacar(e, 0).estado; // turno 6 é do jogador 1
    invalida(() => R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }), 'Silenciado');
    invalida(() => R.aplicar(s, { tipo: 'recuar', jogador: 1, para: s.jogadores[1].banco[0].uid }), 'Silenciado');
    s = R.aplicar(s, { tipo: 'passar', jogador: 1 }).estado;
    s = R.aplicar(s, { tipo: 'passar', jogador: 0 }).estado;
    assert.doesNotThrow(() => R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }));
});

test('Moderador do Discord: não silencia de novo quem acabou de sair do Silenciado', () => {
    // Alvo que acabou de sair do Silenciado (estados.silenciado = turno - 1): ganha imunidade.
    const recente = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 2 } },
        ele: { ativo: { id: 'chorao', aura: 2, estados: { silenciado: 4 } } } });
    const r = atacar(recente, 0);
    assert.ok(r.eventos.some((ev) => ev.tipo === 'imune'));
    assert.ok(!r.eventos.some((ev) => ev.tipo === 'estado' && ev.estado === 'silenciado'));

    // Silenciado antigo (bem antes): silencia de novo normalmente.
    const antigo = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 2 } },
        ele: { ativo: { id: 'chorao', aura: 2, estados: { silenciado: 1 } } } });
    const d = atacar(antigo, 0);
    assert.ok(d.eventos.some((ev) => ev.tipo === 'estado' && ev.estado === 'silenciado'));
});

test('Cara de Coração: +20 com Encantadora na mesa', () => {
    const e = mesa({ eu: { ativo: { id: 'cara-de-coracao', aura: 1 }, banco: ['encantadora'] }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 40 * R.ESCALA);
});

test('Bug do Discord: moeda cara = 40, coroa = 0', () => {
    const e = mesa({ eu: { ativo: { id: 'bug-do-discord', aura: 1 } }, ele: { ativo: 'chorao' } });
    assert.equal(comMoeda(e, true, { tipo: 'atacar', jogador: 0, ataque: 0 }).estado.jogadores[1].ativo.dano, 40 * R.ESCALA);
    assert.equal(comMoeda(e, false, { tipo: 'atacar', jogador: 0, ataque: 0 }).estado.jogadores[1].ativo.dano, 0);
});

test('Emoji Pistola: 10 + 10 por goon na sua mesa (conta ele mesmo)', () => {
    const e = mesa({ eu: { ativo: { id: 'emoji-pistola', aura: 1 }, banco: ['bug-do-discord', 'italolol'] }, ele: { ativo: 'chorao' } });
    assert.equal(atacar(e, 0).estado.jogadores[1].ativo.dano, 30 * R.ESCALA);
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

// ---- Vida, golpe no jogador, recarga e estados ------------------------------------
test('atacar o jogador tira vida mesmo com o ativo dele na mesa e não mexe no ativo', () => {
    const e = mesa({ eu: { ativo: { id: 'italolol', aura: 1 } }, ele: { ativo: 'chorao' } });
    const danoAntes = ELE(e).ativo.dano;
    const r = atacar(e, 0, { alvo: R.JOGADOR });
    // Com o ativo do rival na mesa o golpe entra só com 35% (o ativo protege o dono).
    assert.equal(r.estado.jogadores[1].vida, R.VIDA_INICIAL - Math.floor(20 * R.ESCALA * R.PROTECAO_ATIVO));
    assert.equal(r.estado.jogadores[1].ativo.dano, danoAntes, 'o ativo dele ficou intacto');
    assert.ok(r.eventos.some((ev) => ev.tipo === 'danoJogador' && ev.fonte === 'ataque' && ev.jogador === 1));
});

test('Vem Cá (puxar) não vale no jogador nem com a Encantadora virada', () => {
    const e = mesa({ eu: { ativo: { id: 'encantadora', aura: 2 } }, ele: { ativo: 'chorao', banco: ['bug-do-discord'] } });
    invalida(() => jogar(e, { tipo: 'poder', uid: EU(e).ativo.uid, alvo: R.JOGADOR }), 'escolha quem vem do banco');
    const virada = mesa({ eu: { ativo: { id: 'encantadora', aura: 2, estados: { virada: 99 } } }, ele: { ativo: 'chorao', banco: ['bug-do-discord'] } });
    invalida(() => jogar(virada, { tipo: 'poder', uid: EU(virada).ativo.uid, alvo: ELE(virada).banco[0].uid }), 'virada');
});

test('Superkid: a Aura de 67 Segundos que derruba uma carta deixa ele virado (mesmo sem ser de um golpe só)', () => {
    const derruba = mesa({ eu: { ativo: { id: 'superkid', aura: 5 } }, ele: { ativo: { id: 'chorao', dano: 100 } } });
    const s = atacar(derruba, 1).estado;
    assert.equal(R.virada(s, s.jogadores[0].ativo), true, 'derrubou: fica virado');
    const naoDerruba = mesa({ eu: { ativo: { id: 'superkid', aura: 2 } }, ele: { ativo: 'chorao' } });
    const n = atacar(naoDerruba, 1).estado;
    assert.equal(R.virada(n, n.jogadores[0].ativo), false, 'não derrubou: continua desvirado');
});

test('jogadasValidas inclui alvo JOGADOR em cada ataque sem puxar', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'chorao' } });
    const validas = R.jogadasValidas(e, 0);
    for (let i = 0; i < R.combate('enzo-games').ataques.length; i++) {
        assert.ok(validas.some((v) => v.tipo === 'atacar' && v.ataque === i && v.alvo === R.JOGADOR), `ataque ${i} sem alvo JOGADOR`);
    }
    // O poder Vem Cá só mira o banco do rival, nunca o jogador.
    const enc = mesa({ eu: { ativo: 'italolol', banco: ['encantadora'] }, ele: { ativo: 'chorao', banco: ['bug-do-discord'] } });
    const venc = R.jogadasValidas(enc, 0);
    assert.ok(venc.some((v) => v.tipo === 'poder' && v.alvo === ELE(enc).banco[0].uid), 'Vem Cá mira o banco');
    assert.ok(venc.every((v) => !(v.tipo === 'poder' && (v.alvo === undefined || v.alvo === R.JOGADOR))), 'Vem Cá nunca sem alvo nem no jogador');
});

test('nocaute tira do dono a vida da raridade (comum e lendário)', () => {
    assert.equal(R.danoNocaute('drone-vigia'), R.DANO_NOCAUTE.comum);
    assert.equal(R.danoNocaute('superkid'), R.DANO_NOCAUTE.lendario);
    const comum = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'drone-vigia', banco: ['bug-do-discord'] } });
    const rc = atacar(comum, 1).estado;
    assert.equal(rc.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.comum);
    const lend = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: { id: 'superkid', dano: 100 * R.ESCALA }, banco: ['bug-do-discord'] } });
    const rl = atacar(lend, 1).estado;
    assert.equal(rl.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.lendario);
});

test('vida zerada por golpe direto: fim, motivo vida, vencedor certo', () => {
    const e = mesa({ eu: { ativo: { id: 'marreteiro-do-coracao', aura: 3 } }, ele: { vida: Math.floor(90 * R.ESCALA * R.PROTECAO_ATIVO), ativo: 'chorao' } });
    const r = atacar(e, 1, { alvo: R.JOGADOR });   // Marretada 1800, mas o Chorão na mesa segura 65%: entra 630
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'vida');
    assert.equal(r.estado.jogadores[1].vida, 0);
});

test('vida zerada pelo nocaute: fim, motivo vida', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { vida: R.DANO_NOCAUTE.comum, ativo: 'drone-vigia' } });
    const r = atacar(e, 1);
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'vida');
    assert.equal(r.estado.jogadores[1].vida, 0);
});

test('limite de 30 turnos: mais vida vence; vida igual é empate', () => {
    const maior = mesa({ turno: 30, eu: { vida: R.VIDA_INICIAL }, ele: { vida: R.VIDA_INICIAL - 1 } });
    const r = jogar(maior, { tipo: 'passar' });
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.motivo, 'limiteTurnos');
    const igual = jogar(mesa({ turno: 30 }), { tipo: 'passar' }).estado;
    assert.equal(igual.fase, 'fim');
    assert.equal(igual.vencedor, 'empate');
    assert.equal(igual.motivo, 'limiteTurnos');
});

test('mesa vazia não encerra; sem banco não cria pendente; baixar entra como ativo', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'drone-vigia', mao: ['bug-do-discord'] } });
    const r = atacar(e, 1).estado;   // Macarronada derruba o único ativo dele
    assert.equal(r.fase, 'jogo');
    assert.equal(r.jogadores[1].ativo, null);
    assert.deepEqual(r.pendentes, [], 'sem banco não há escolha de novo ativo');
    const uid = r.jogadores[1].mao[0].uid;
    const b = R.aplicar(r, { tipo: 'baixar', jogador: 1, uid });
    assert.equal(b.estado.jogadores[1].ativo.id, 'bug-do-discord', 'baixar com a mesa vazia vira ativo');
    assert.equal(b.estado.jogadores[1].banco.length, 0);
    assert.ok(b.eventos.some((ev) => ev.tipo === 'baixar' && ev.ativo === true));
});

test('recarga: Macarronada a 300% vira o Enzo no próximo turno do dono e libera no seguinte', () => {
    let e = mesa({
        turno: 5, vez: 0,
        eu: { ativo: { id: 'enzo-games', aura: 3 }, banco: ['bug-do-discord'] },
        ele: { ativo: { id: 'enzo-games', aura: 1 } },
    });
    let s = atacar(e, 1).estado;   // Macarronada a 300% (recarga 1)
    assert.ok(s.jogadores[0].ativo.estados.virada === 7, 'virada até o turno 7');
    assert.equal(s.jogadores[1].ativo.dano, 120 * R.ESCALA, 'o ataque ainda acerta no turno em que foi usado');
    s = R.aplicar(s, { tipo: 'passar', jogador: 1 }).estado;   // volta no turno 7 (vez do dono)
    assert.equal(s.turno, 7);
    assert.equal(s.vez, 0);
    const meu = s.jogadores[0];
    invalida(() => R.aplicar(s, { tipo: 'atacar', jogador: 0, ataque: 0 }), 'virada');
    invalida(() => R.aplicar(s, { tipo: 'recuar', jogador: 0, para: meu.banco[0].uid }), 'virada');
    s = R.aplicar(s, { tipo: 'aura', jogador: 0, alvo: meu.ativo.uid }).estado;   // Aura para o ataque do turno 9
    s = R.aplicar(s, { tipo: 'passar', jogador: 0 }).estado;   // turno 8, vez do rival
    s = R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }).estado;   // Almôndega 600 no Enzo virado
    assert.equal(s.jogadores[0].ativo.dano, 30 * R.ESCALA, 'carta virada continua levando dano');
    assert.equal(s.turno, 9);
    assert.equal(s.vez, 0);
    assert.doesNotThrow(() => R.aplicar(s, { tipo: 'atacar', jogador: 0, ataque: 0 }), 'no turno 9 a recarga acabou');

    // Poder também fica bloqueado: O Inominável virado não usa o poder.
    let ino = mesa({ turno: 5, vez: 0, eu: { ativo: { id: 'o-inominavel', aura: 3 } }, ele: { ativo: 'chorao' } });
    ino = atacar(ino, 0, { alvo: R.JOGADOR }).estado;   // Bala Dourada (recarga 1)
    assert.equal(ino.jogadores[0].ativo.estados.virada, 7);
    ino = R.aplicar(ino, { tipo: 'passar', jogador: 1 }).estado;   // turno 7
    invalida(() => R.aplicar(ino, { tipo: 'poder', jogador: 0, uid: ino.jogadores[0].ativo.uid }), 'virada');
});

test('Ban de 7 Dias vira o Moderador e silencia o alvo; a imunidade anti-relock continua', () => {
    const e = mesa({
        turno: 5, vez: 0,
        eu: { ativo: { id: 'moderador-do-ban', aura: 2 }, banco: ['bug-do-discord'] },
        ele: { ativo: { id: 'italolol', aura: 1 } },
    });
    const r = atacar(e, 0);
    assert.equal(r.estado.jogadores[0].ativo.estados.virada, 7, 'o Ban vira o Moderador (recarga 1)');
    assert.ok(r.eventos.some((ev) => ev.tipo === 'estado' && ev.estado === 'silenciado'));
    assert.equal(r.estado.jogadores[1].ativo.estados.silenciado, 6, 'Silenciado vale no turno 6');
    // No turno seguinte o alvo está Silenciado.
    const s = r.estado;
    assert.equal(s.turno, 6);
    invalida(() => R.aplicar(s, { tipo: 'atacar', jogador: 1, ataque: 0 }), 'Silenciado não ataca');

    // Imunidade: quem acabou de sair do Silenciado não é silenciado de novo.
    const imune = mesa({ eu: { ativo: { id: 'moderador-do-ban', aura: 2 } },
        ele: { ativo: { id: 'italolol', aura: 1, estados: { silenciado: 4 } } } });
    const ri = atacar(imune, 0);
    assert.ok(ri.eventos.some((ev) => ev.tipo === 'imune'));
    assert.ok(!ri.eventos.some((ev) => ev.tipo === 'estado' && ev.estado === 'silenciado'));
});

test('Iludido que falha a moeda não vira a carta', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3, estados: { iludido: true } } }, ele: { ativo: 'chorao' } });
    const falhou = comMoeda(e, false, { tipo: 'atacar', jogador: 0, ataque: 1 });
    assert.ok(falhou.eventos.some((ev) => ev.tipo === 'ataqueFalhou'));
    assert.ok(!falhou.eventos.some((ev) => ev.tipo === 'virada'), 'falhar a moeda não vira a carta');
    assert.equal(falhou.estado.jogadores[0].ativo.estados.virada || 0, 0);
    const acertou = comMoeda(e, true, { tipo: 'atacar', jogador: 0, ataque: 1 });
    assert.ok(acertou.eventos.some((ev) => ev.tipo === 'virada'), 'acertando a moeda, a carta vira');
});

test('estado no golpe no jogador (Notificado do Teemo) não pega em ninguém', () => {
    const e = mesa({ eu: { ativo: { id: 'sombra-do-degustador', aura: 1 } }, ele: { ativo: 'chorao' } });
    const r = atacar(e, 0, { alvo: R.JOGADOR });
    assert.ok(r.eventos.some((ev) => ev.tipo === 'danoJogador' && ev.fonte === 'ataque' && ev.jogador === 1));
    assert.ok(!r.eventos.some((ev) => ev.tipo === 'estado'), 'nenhum estado é aplicado no golpe no jogador');
    assert.equal(r.estado.jogadores[1].ativo.estados.notificado, false);
});

// ---- Proteção do ativo e virada por derrubar de um golpe -----------
test('golpe no jogador: ativo na mesa segura 35% (floor); mesa vazia entra 100%', () => {
    const comAtivo = mesa({ eu: { ativo: { id: 'italolol', aura: 1 } }, ele: { ativo: 'drone-vigia' } });
    const r1 = atacar(comAtivo, 0, { alvo: R.JOGADOR });
    assert.equal(r1.estado.jogadores[1].vida, R.VIDA_INICIAL - Math.floor(20 * R.ESCALA * R.PROTECAO_ATIVO));

    const semAtivo = mesa({ eu: { ativo: { id: 'italolol', aura: 1 } }, ele: { ativo: null } });
    const r2 = atacar(semAtivo, 0, { alvo: R.JOGADOR });
    assert.equal(r2.estado.jogadores[1].vida, R.VIDA_INICIAL - 20 * R.ESCALA);
});

test('derrubar o ativo NÃO dá golpe extra: o dono perde só a vida da raridade', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'drone-vigia', banco: ['bug-do-discord'] } });
    const r = atacar(e, 1);
    assert.ok(!r.eventos.some((ev) => ev.tipo === 'golpeExtra'));
    const danos = r.eventos.filter((ev) => ev.tipo === 'danoJogador' && ev.jogador === 1);
    assert.deepEqual(danos.map((ev) => [ev.fonte, ev.valor]), [['nocaute', R.DANO_NOCAUTE.comum]]);
    assert.equal(r.estado.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.comum);
});

test('derrubar do banco (Vírgula-rangue e Bala Dourada) também só tira a vida da raridade', () => {
    const degustador = mesa({ eu: { ativo: { id: 'degustador-da-noite', aura: 3 } },
        ele: { ativo: 'chorao', banco: [{ id: 'drone-vigia', dano: 40 * R.ESCALA }] } });
    const rd = atacar(degustador, 0, { alvo: ELE(degustador).banco[0].uid });
    assert.ok(!rd.eventos.some((ev) => ev.tipo === 'golpeExtra'));
    assert.equal(rd.estado.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.comum);

    const inominavel = mesa({ eu: { ativo: { id: 'o-inominavel', aura: 3 } },
        ele: { ativo: 'chorao', banco: ['notificacao-morcego'] } });
    const ri = atacar(inominavel, 0, { alvo: ELE(inominavel).banco[0].uid });
    assert.ok(!ri.eventos.some((ev) => ev.tipo === 'golpeExtra'));
    assert.equal(ri.estado.jogadores[1].vida, R.VIDA_INICIAL - R.DANO_NOCAUTE.comum);
});

test('nocaute por veneno ou por contra-ataque do Chorão não dá golpe extra', () => {
    const veneno = mesa({ eu: { ativo: { id: 'notificacao-morcego', dano: 30 * R.ESCALA, estados: { notificado: true } } } });
    const rv = jogar(veneno, { tipo: 'passar' });
    assert.ok(rv.eventos.some((ev) => ev.tipo === 'nocaute' && ev.jogador === 0));
    assert.ok(!rv.eventos.some((ev) => ev.tipo === 'golpeExtra'), 'veneno não dá golpe extra');

    const contra = mesa({ eu: { ativo: { id: 'notificacao-morcego', aura: 1, dano: 30 * R.ESCALA } }, ele: { ativo: 'chorao' } });
    const rc = atacar(contra, 0);
    assert.ok(rc.eventos.some((ev) => ev.tipo === 'nocaute' && ev.jogador === 0), 'o atacante caiu pelo contra-ataque');
    assert.ok(!rc.eventos.some((ev) => ev.tipo === 'golpeExtra'), 'contra-ataque não dá golpe extra');
});

test('toda carta que derruba outra fica virada (machucada ou não), depois de a vida do dono cair', () => {
    // Carta já machucada: cai e quem derrubou também vira.
    const machucada = mesa({ turno: 5, vez: 0, eu: { ativo: { id: 'marreteiro-do-coracao', aura: 3 }, banco: ['bug-do-discord'] },
        ele: { ativo: { id: 'chorao', dano: 40 * R.ESCALA }, banco: ['bug-do-discord'] } });
    const rm = atacar(machucada, 1);
    assert.equal(rm.estado.jogadores[1].ativo, null);
    assert.ok(rm.eventos.some((ev) => ev.tipo === 'virada' && ev.motivo === 'derrubou' && ev.uid === rm.estado.jogadores[0].ativo.uid));
    assert.equal(rm.estado.jogadores[0].ativo.estados.virada, 7);
    // a virada vem DEPOIS do dano na vida do dono da carta
    const tipos = rm.eventos.map((ev) => ev.tipo + (ev.fonte ? ':' + ev.fonte : ''));
    assert.ok(tipos.indexOf('virada') > tipos.indexOf('danoJogador:nocaute'), tipos.join(' '));
    // vida cheia: idem, e prende o próximo turno dele
    const cheia = mesa({ turno: 5, vez: 0,
        eu: { ativo: { id: 'marreteiro-do-coracao', aura: 3 }, banco: ['bug-do-discord'] },
        ele: { ativo: 'drone-vigia', banco: ['bug-do-discord'] } });
    const rch = atacar(cheia, 1);
    assert.equal(rch.estado.jogadores[0].ativo.estados.virada, 7);
    let s = rch.estado;
    s = R.aplicar(s, { tipo: 'novoAtivo', jogador: 1, uid: s.jogadores[1].banco[0].uid }).estado;
    assert.equal(s.turno, 6);
    s = R.aplicar(s, { tipo: 'passar', jogador: 1 }).estado;
    assert.equal(s.turno, 7);
    assert.equal(s.vez, 0);
    invalida(() => R.aplicar(s, { tipo: 'atacar', jogador: 0, ataque: 1 }), 'virada');
    // sem derrubar ninguém, não vira
    const sem = mesa({ eu: { ativo: { id: 'marreteiro-do-coracao', aura: 3 } }, ele: { ativo: 'enzo-games' } });
    assert.ok(!atacar(sem, 1).eventos.some((ev) => ev.tipo === 'virada'));
});

test('derrubar com Macarronada (que já tem recarga) gera só um evento virada', () => {
    const e = mesa({ turno: 5, vez: 0, eu: { ativo: { id: 'enzo-games', aura: 3 } }, ele: { ativo: 'drone-vigia', banco: ['bug-do-discord'] } });
    const r = atacar(e, 1);
    const viradas = r.eventos.filter((ev) => ev.tipo === 'virada');
    assert.equal(viradas.length, 1, 'a recarga já virou: não duplica o evento');
    assert.equal(r.estado.jogadores[0].ativo.estados.virada, 7);
});

test('Superkid: a Aura de 67 Segundos que derruba uma carta deixa ele virado', () => {
    const derruba = mesa({ eu: { ativo: { id: 'superkid', aura: 5 } }, ele: { ativo: { id: 'chorao', dano: 100 } } });
    const s = atacar(derruba, 1).estado;
    assert.equal(R.virada(s, s.jogadores[0].ativo), true);
    const naoDerruba = mesa({ eu: { ativo: { id: 'superkid', aura: 2 } }, ele: { ativo: 'chorao' } });
    const n = atacar(naoDerruba, 1).estado;
    assert.equal(R.virada(n, n.jogadores[0].ativo), false);
});

test('nocaute que zera a vida encerra a partida com motivo vida', () => {
    const e = mesa({ eu: { ativo: { id: 'enzo-games', aura: 3 } },
        ele: { vida: R.DANO_NOCAUTE.comum, ativo: 'drone-vigia', banco: ['bug-do-discord'] } });
    const r = atacar(e, 1);
    assert.ok(r.eventos.some((ev) => ev.tipo === 'danoJogador' && ev.fonte === 'nocaute' && ev.jogador === 1));
    assert.equal(r.estado.fase, 'fim');
    assert.equal(r.estado.motivo, 'vida');
    assert.equal(r.estado.vencedor, 0);
    assert.equal(r.estado.jogadores[1].vida, 0);
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
    assert.equal(v.semente, undefined);
});

test('online: jogadasValidas e motivoInvalida dão o mesmo resultado com a visão do jogador', () => {
    for (let s = 0; s < 15; s++) {
        const { config, jogadas } = partidaDeRobos(s);
        let estado = R.criarPartida(config);
        for (const jogada of jogadas) {
            for (const j of [0, 1]) {
                const v = R.visaoDe(estado, j);
                assert.deepEqual(R.jogadasValidas(v, j), R.jogadasValidas(estado, j));
            }
            assert.equal(R.motivoInvalida(R.visaoDe(estado, jogada.jogador), jogada), null);
            estado = R.aplicar(estado, jogada).estado;
        }
    }
});

test('eventosPara: o outro não vê a carta comprada nem a espiada da Câmera', () => {
    const eventos = [
        { tipo: 'compra', jogador: 0, uid: '0-3', id: 'chorao', motivo: 'turno' },
        { tipo: 'espiar', jogador: 0, ids: ['chorao'], privado: true },
        { tipo: 'baixar', jogador: 0, uid: '0-3', id: 'chorao' },
    ];
    assert.deepEqual(R.eventosPara(eventos, 0), eventos);
    assert.deepEqual(R.eventosPara(eventos, 1), [
        { tipo: 'compra', jogador: 0, motivo: 'turno' },
        { tipo: 'baixar', jogador: 0, uid: '0-3', id: 'chorao' },
    ]);
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

test('texto do TCG de cada carta: existe e cita todos os ataques e o poder (não fica para trás no balanceamento)', () => {
    for (const carta of Baralho.CARTAS) {
        const c = COMBATE[carta.id];
        assert.ok(carta.tcg && carta.tcg.length > 10, `${carta.id} sem texto do TCG`);
        for (const a of c.ataques || []) assert.ok(carta.tcg.includes(a.nome), `${carta.id}: falta o ataque ${a.nome}`);
        if (c.poder) assert.ok(carta.tcg.includes(c.poder.nome), `${carta.id}: falta o poder ${c.poder.nome}`);
        for (const a of c.ataques || []) {
            assert.ok(carta.tcg.includes(`${a.nome} (${a.custo === 0 ? 'de graça' : `${a.custo} Aura`})`), `${carta.id}: custo de ${a.nome} diferente do jogo`);
            if (a.dano > 0) assert.ok(carta.tcg.includes(String(a.dano * R.ESCALA).replace(/\B(?=(\d{3})+(?!\d))/g, '.')), `${carta.id}: dano de ${a.nome} diferente do jogo`);
        }
        if (c.hp) assert.ok(carta.tcg.includes(`Vida ${String(c.hp * R.ESCALA).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`), `${carta.id}: vida diferente do jogo`);
    }
});

// ---- Banimento de cartas (antes de qualquer carta ir à mesa) ----------------------
const comBanimento = () => R.criarPartida({ semente: 7, decks: [DECK, DECK], banimento: true });
const banir = (e, j, cartas) => R.aplicar(e, { tipo: 'banir', jogador: j, cartas });
// uma cópia de cada carta (não dá para banir as duas cópias juntas)
const naoLendarias = (e, j) => e.jogadores[j].deck.filter((c, i, todas) => R.banivel(c) && todas.findIndex((x) => x.id === c.id) === i);

test('banimento: a partida começa sem mãos, com os decks inteiros, e os dois precisam banir', () => {
    const e = comBanimento();
    assert.equal(e.fase, 'banimento');
    assert.deepEqual(R.quemDeve(e), [0, 1]);
    assert.ok(e.jogadores.every((x) => x.deck.length === 15 && x.mao.length === 0));
    invalida(() => jogar({ ...e, vez: 0 }, { tipo: 'passar' }), 'banir primeiro');
    invalida(() => R.aplicar(e, { tipo: 'preparar', jogador: 0, ativo: 'x', banco: [] }), 'banir primeiro');
    // sem banimento o jogo é como sempre (mãos já compradas)
    const normal = R.criarPartida({ semente: 7, decks: [DECK, DECK] });
    assert.equal(normal.fase, 'preparacao');
    assert.equal(normal.jogadores[0].mao.length, R.MAO_INICIAL);
});

test('banimento: 2 cartas não lendárias do deck do adversário, sem repetir e sem deixar o deck sem lutador', () => {
    const e = comBanimento();
    const possiveis = naoLendarias(e, 1);
    const [a, b] = possiveis;
    invalida(() => banir(e, 0, [a.uid]), 'escolha 2 cartas');
    invalida(() => banir(e, 0, [a.uid, a.uid]), 'repetida');
    invalida(() => banir(e, 0, [a.uid, 'xxx']), 'não está no deck');
    const lendaria = e.jogadores[1].deck.find((c) => !R.banivel(c));
    invalida(() => banir(e, 0, [a.uid, lendaria.uid]), 'lendária');
    // cartas do PRÓPRIO deck não valem (o uid é do deck do outro lado)
    invalida(() => banir(e, 0, [e.jogadores[0].deck[0].uid, e.jogadores[0].deck[1].uid]), 'não está no deck');
    assert.doesNotThrow(() => banir(e, 0, [a.uid, b.uid]));
    // as duas cópias da mesma carta não podem ser banidas juntas
    const copias = comBanimento();
    const mk2 = (id, n) => ({ uid: `1-c${n}`, id, dano: 0, aura: 0, estados: {}, escudo: null });
    copias.jogadores[1].deck = [mk2('cara-de-coracao', 0), mk2('cara-de-coracao', 1), mk2('chorao', 2), mk2('toradolandia', 3)];
    invalida(() => banir(copias, 0, ['1-c0', '1-c1']), 'duas cópias');
    assert.doesNotThrow(() => banir(copias, 0, ['1-c0', '1-c2']));
    // deck com 1 só lutador: banir esse lutador deixaria o deck sem ninguém para lutar
    const fino = comBanimento();
    const mk = (id, n) => ({ uid: `1-f${n}`, id, dano: 0, aura: 0, estados: {}, escudo: null });
    fino.jogadores[1].deck = [mk('cara-de-coracao', 0), mk('estacionamento-noturno', 1), mk('toradolandia', 2), mk('piscina-de-macarronada', 3)];
    invalida(() => banir(fino, 0, ['1-f0', '1-f1']), 'sem ninguém para lutar');
    assert.doesNotThrow(() => banir(fino, 0, ['1-f1', '1-f2']));
});

test('banimento: os dois banindo, as cartas somem dos decks, aparecem para todos e as mãos são compradas sem elas', () => {
    let e = comBanimento();
    const [a0, b0] = naoLendarias(e, 1);   // o jogador 0 bane do deck do 1
    const [a1, b1] = naoLendarias(e, 0);
    let r = banir(e, 0, [a0.uid, b0.uid]);
    e = r.estado;
    assert.equal(e.fase, 'banimento', 'falta o outro');
    assert.deepEqual(R.quemDeve(e), [1]);
    invalida(() => banir(e, 0, [a0.uid, b0.uid]), 'já baniu');
    assert.deepEqual(r.eventos.map((ev) => ev.tipo), ['banimentoPronto']);
    r = banir(e, 1, [a1.uid, b1.uid]);
    e = r.estado;
    assert.equal(e.fase, 'preparacao');
    const quais = r.eventos.filter((ev) => ev.tipo === 'banimento');
    assert.equal(quais.length, 2);
    assert.deepEqual(quais.find((ev) => ev.alvo === 1).cartas.map((c) => c.uid).sort(), [a0.uid, b0.uid].sort());
    for (const i of [0, 1]) {
        const x = e.jogadores[i];
        assert.equal(x.deck.length + x.mao.length, 13);
        assert.equal(x.mao.length, R.MAO_INICIAL);
        assert.equal(e.banidas[i].length, 2);
        assert.ok(![...x.deck, ...x.mao].some((c) => e.banidas[i].some((b) => b.uid === c.uid)), 'banida não volta');
    }
    assert.equal(e.banimento, null);
});

test('banimento: cada um vê a lista do deck do outro, mas não o que o outro escolheu; depois só a quantidade', () => {
    let e = comBanimento();
    const v = R.visaoDe(e, 0);
    assert.ok(Array.isArray(v.jogadores[1].deck) && v.jogadores[1].deck[0].id);
    const [a0, b0] = naoLendarias(e, 1);
    e = banir(e, 0, [a0.uid, b0.uid]).estado;
    const vista = R.visaoDe(e, 1);
    assert.deepEqual(vista.banimento.feitos, [true, false], 'o outro só sabe que já escolheu');
    assert.ok(!JSON.stringify(vista).includes(a0.uid) || vista.jogadores[1].deck.some((c) => c.uid === a0.uid), 'a escolha não vaza fora da lista do próprio deck');
    const [a1, b1] = naoLendarias(e, 0);
    e = banir(e, 1, [a1.uid, b1.uid]).estado;
    assert.equal(typeof R.visaoDe(e, 0).jogadores[1].deck, 'number');
});

test('banimento: o robô bane as cartas mais fortes e a partida inteira fecha', () => {
    let e = R.criarPartida({ semente: 11, decks: [DECK, DECK], banimento: true });
    for (let i = 0; i < 2000 && e.fase !== 'fim'; i++) {
        const quem = Robo.quemJoga(e);
        e = R.aplicar(e, Robo.escolherJogada(e, quem, { nivel: 'normal' })).estado;
    }
    assert.equal(e.fase, 'fim');
    assert.equal(e.banidas[0].length, 2);
    assert.ok(e.banidas.every((l) => l.every((c) => R.banivel({ id: c.id }))));
});

test('rodada: o par de turnos (1 e 2 = rodada 1) e o limite em rodadas', () => {
    assert.deepEqual([1, 2, 3, 4, 29, 30].map(R.rodadaDe), [1, 1, 2, 2, 15, 15]);
    assert.equal(R.RODADAS_MAX, 15);
});
