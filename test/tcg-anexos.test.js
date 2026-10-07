// ============================================================================
// Cartas complementares (modo `anexo`, tipo `resenha`): ficam deitadas atrás de um lutador e mudam só ele.
// Ainda não há carta dessas no Baralho, então o teste carrega o motor com um catálogo de teste
// (as cartas reais + as de mentira abaixo), sem mexer nos arquivos de dados.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const BaralhoReal = require('../js/baralho-dados.js');
const CartasReais = require('../js/tcg-cartas.js');

const resenha = (id, nome) => ({ id, nome, tipo: 'resenha', raridade: 'raro', peso: 1 });
const CARTAS_TESTE = {
    'r-forca': resenha('r-forca', 'Resenha da Força'),
    'r-maldicao': resenha('r-maldicao', 'Resenha da Maldição'),
    'r-skin': resenha('r-skin', 'Pedir Skin'),
    'r-poder': resenha('r-poder', 'Resenha do Poder'),
    'r-lanche': resenha('r-lanche', 'Lanche'),
    'r-treino': resenha('r-treino', 'Treino'),
};
const COMBATE_TESTE = {
    'r-forca': { anexo: { texto: '+20 HP e +10 de dano.', hp: 20, dano: 10 } },
    'r-maldicao': { anexo: { texto: 'No ativo dele: Notificado e recuo +2.', em: { lado: 'dele', lugar: 'ativo' }, recuo: 2,
        aoEntrar: [{ tipo: 'estado', estado: 'notificado' }] } },
    'r-skin': { anexo: { texto: 'Só no Superkid: vira o Enzo e troca os ataques; sai depois de 1 ataque.', em: { cartas: ['superkid'] },
        visual: { arte: 'enzo-games', nome: 'Superkid de Skin' }, trocaAtaques: [{ nome: 'Pedir Skin', custo: 2, dano: 60 }], usos: 1 } },
    'r-poder': { anexo: { texto: 'Ganha o poder de comprar; sai no fim do seu turno.', turnos: 1, hp: 30,
        poder: { nome: 'Pede Lanche', tipo: 'comprar', ativavel: true, valor: 1, texto: 'compra 1' } } },
    'r-lanche': { anexo: { texto: 'Ao entrar, cura 30 e vai para o descarte.', aoEntrar: [{ tipo: 'curarSi', valor: 30 }], soAoEntrar: true } },
    'r-treino': { anexo: { texto: 'Ataques custam 1 a menos e dão escudo de 10.', custo: -1, efeitosAtaque: [{ tipo: 'escudo', valor: 10 }], tags: ['treinado'] } },
};

/** Carrega um módulo UMD do js/ com as dependências trocadas. */
function carregar(arquivo, deps) {
    const mod = { exports: {} };
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', arquivo), 'utf8');
    new Function('module', 'require', src)(mod, (p) => deps[path.basename(p)]);
    return mod.exports;
}
const Baralho = { ...BaralhoReal, carta: (id) => CARTAS_TESTE[id] || BaralhoReal.carta(id) };
const Cartas = { ...CartasReais, COMBATE: { ...CartasReais.COMBATE, ...COMBATE_TESTE } };
const R = carregar('tcg-regras.js', { 'baralho-dados.js': Baralho, 'tcg-cartas.js': Cartas });
const Robo = carregar('tcg-robo.js', { 'tcg-regras.js': R });

const DECK = ['superkid', 'italolol', 'italolol', 'hatsune-neves', 'hatsune-neves', 'chorao', 'chorao', 'drone-vigia', 'drone-vigia',
    'r-forca', 'r-forca', 'r-maldicao', 'r-skin', 'r-lanche', 'r-treino'];

let n = 0;
const inst = (j, id, extra = {}) => ({ uid: `${j}-x${n++}`, id, dano: 0, aura: 0,
    estados: { notificado: false, iludido: false, silenciado: 0, virada: 0 }, escudo: null, anexos: [], ...extra });
/** Mesa pronta: o jogador 0 joga o turno 5. */
function mesa({ eu = {}, ele = {} } = {}) {
    const e = R.criarPartida({ semente: 1, decks: [DECK, DECK] });
    Object.assign(e, { fase: 'jogo', turno: 5, vez: 0, primeiro: 0 });
    [[0, eu], [1, ele]].forEach(([j, lado]) => {
        const x = e.jogadores[j];
        x.preparado = true;
        x.ativo = inst(j, lado.ativo || 'italolol', lado.ativoExtra);
        x.banco = (lado.banco || []).map((id) => inst(j, id));
        x.mao = (lado.mao || []).map((id) => inst(j, id));
        x.deck = ['drone-vigia', 'drone-vigia', 'drone-vigia'].map((id) => inst(j, id));
        x.descarte = [];
        x.flags = { auras: 3, auraEm: {}, reforco: 0, campo: false, recuo: false, trocarCarta: false, poderes: [] };
    });
    return e;
}
const jogar = (e, jogada) => R.aplicar(e, { jogador: e.vez, ...jogada });
const invalida = (fn, trecho) => assert.throws(fn, (err) => err instanceof R.JogadaInvalida && err.message.includes(trecho));
const EU = (e) => e.jogadores[0];
const ELE = (e) => e.jogadores[1];

test('o tipo resenha é do modo anexo e a jogada dele é anexar', () => {
    assert.equal(R.modoDe('r-forca'), 'anexo');
    assert.equal(R.jogadaDaCarta('r-forca'), 'anexar');
    assert.equal(R.jogadaDaCarta('italolol'), 'baixar');
    assert.equal(R.jogadaDaCarta('toradolandia'), 'campo');
    assert.ok(!R.ehLutador('r-forca'));
    assert.deepEqual(R.validarDeck(DECK), []);
});

test('anexar: a carta sai da mão e fica atrás do lutador, mudando HP e dano só dele', () => {
    const e = mesa({ eu: { mao: ['r-forca'], banco: ['italolol'] } });
    const carta = EU(e).mao[0].uid;
    const hpAntes = R.hpMax(e, EU(e).ativo);
    const { estado, eventos } = jogar(e, { tipo: 'anexar', uid: carta, alvo: EU(e).ativo.uid });
    assert.equal(EU(estado).mao.length, 0);
    assert.deepEqual(EU(estado).ativo.anexos.map((a) => a.uid), [carta]);
    assert.equal(EU(estado).ativo.anexos[0].dono, 0);
    assert.ok(eventos.some((ev) => ev.tipo === 'anexar' && ev.alvo === EU(e).ativo.uid));
    assert.equal(R.hpMax(estado, EU(estado).ativo), hpAntes + 20 * R.ESCALA);
    assert.equal(R.hpMax(estado, EU(estado).banco[0]), hpAntes, 'o do banco não muda');
    const ataque = R.ficha(estado, EU(estado).ativo).ataques[0];
    assert.equal(R.calcularDano(estado, 0, ataque, ELE(estado).ativo), (ataque.dano + 10) * R.ESCALA);
});

test('anexar: só carta complementar, só onde ela combina, e 1 por lutador', () => {
    const e = mesa({ eu: { mao: ['r-forca', 'r-forca', 'italolol', 'r-maldicao', 'r-skin'], ativo: 'italolol', banco: ['superkid'] } });
    const [forca1, forca2, lutador, maldicao, skin] = EU(e).mao.map((c) => c.uid);
    invalida(() => jogar(e, { tipo: 'anexar', uid: lutador, alvo: EU(e).ativo.uid }), 'não vai atrás');
    invalida(() => jogar(e, { tipo: 'anexar', uid: forca1, alvo: ELE(e).ativo.uid }), 'lutador seu');
    invalida(() => jogar(e, { tipo: 'anexar', uid: maldicao, alvo: EU(e).ativo.uid }), 'do adversário');
    invalida(() => jogar(e, { tipo: 'anexar', uid: skin, alvo: EU(e).ativo.uid }), 'não combina');
    invalida(() => jogar(e, { tipo: 'anexar', uid: forca1, alvo: 'nada' }), 'escolha o lutador');
    jogar(e, { tipo: 'anexar', uid: skin, alvo: EU(e).banco[0].uid });   // o Superkid aceita
    const { estado } = jogar(e, { tipo: 'anexar', uid: forca1, alvo: EU(e).ativo.uid });
    invalida(() => R.aplicar(estado, { jogador: 0, tipo: 'anexar', uid: forca2, alvo: EU(e).ativo.uid }), 'já tem uma carta');
});

test('carta no adversário: entra notificando o ativo dele e aumenta o recuo; só vale no ativo', () => {
    const e = mesa({ eu: { mao: ['r-maldicao'] }, ele: { banco: ['chorao'] } });
    const uid = EU(e).mao[0].uid;
    invalida(() => jogar(e, { tipo: 'anexar', uid, alvo: ELE(e).banco[0].uid }), 'só vai atrás do ativo');
    const recuo = R.custoRecuo(e, ELE(e).ativo);
    const { estado } = jogar(e, { tipo: 'anexar', uid, alvo: ELE(e).ativo.uid });
    assert.equal(ELE(estado).ativo.estados.notificado, true);
    assert.equal(R.custoRecuo(estado, ELE(estado).ativo), recuo + 2);
    assert.equal(ELE(estado).ativo.anexos[0].dono, 0, 'a carta continua sendo de quem jogou');
});

test('nocaute: as cartas atrás vão para o descarte de quem as jogou', () => {
    const e = mesa({ eu: { mao: ['r-maldicao'], ativo: 'italolol', ativoExtra: { aura: 2 } } });
    const maldicao = EU(e).mao[0].uid;
    let { estado } = jogar(e, { tipo: 'anexar', uid: maldicao, alvo: ELE(e).ativo.uid });
    ELE(estado).ativo.dano = R.hpMax(estado, ELE(estado).ativo) - 1;
    const r = R.aplicar(estado, { jogador: 0, tipo: 'atacar', ataque: 1 });
    assert.ok(r.eventos.some((ev) => ev.tipo === 'nocaute'));
    assert.ok(r.eventos.some((ev) => ev.tipo === 'anexoSai' && ev.uid === maldicao && ev.motivo === 'nocaute'));
    assert.ok(EU(r.estado).descarte.some((c) => c.uid === maldicao), 'volta para o descarte do dono (eu)');
    assert.ok(!ELE(r.estado).descarte.some((c) => c.uid === maldicao));
    const caido = ELE(r.estado).descarte.find((c) => c.id === 'italolol');
    assert.deepEqual(caido.anexos, []);
});

test('devolver o lutador ao baralho: a carta atrás dele vai para o descarte; recuar leva a carta junto', () => {
    const e = mesa({ eu: { mao: ['r-forca', 'r-treino'], banco: ['chorao'], ativoExtra: { aura: 3 } } });
    const [forca, treino] = EU(e).mao.map((c) => c.uid);
    let { estado } = jogar(e, { tipo: 'anexar', uid: forca, alvo: EU(e).ativo.uid });
    estado = R.aplicar(estado, { jogador: 0, tipo: 'anexar', uid: treino, alvo: EU(e).banco[0].uid }).estado;
    // recuo: a carta vai junto com quem foi para o banco
    estado = R.aplicar(estado, { jogador: 0, tipo: 'recuar', para: EU(estado).banco[0].uid }).estado;
    assert.equal(EU(estado).banco[0].anexos[0].uid, forca);
    assert.equal(EU(estado).ativo.anexos[0].uid, treino);
    const r = R.aplicar(estado, { jogador: 0, tipo: 'devolverMesa', uid: EU(estado).banco[0].uid });
    assert.ok(EU(r.estado).descarte.some((c) => c.uid === forca));
    assert.ok(!EU(r.estado).deck.some((c) => c.uid === forca), 'a carta complementar não volta ao baralho');
    assert.ok(r.eventos.some((ev) => ev.tipo === 'anexoSai' && ev.motivo === 'devolvida'));
});

test('trocar ataques, aparência e usos: a skin troca o Superkid e sai depois de 1 ataque', () => {
    const e = mesa({ eu: { mao: ['r-skin'], ativo: 'superkid', ativoExtra: { aura: 2 } } });
    const skin = EU(e).mao[0].uid;
    let { estado } = jogar(e, { tipo: 'anexar', uid: skin, alvo: EU(e).ativo.uid });
    const f = R.ficha(estado, EU(estado).ativo);
    assert.deepEqual(f.visual, { arte: 'enzo-games', nome: 'Superkid de Skin' });
    assert.deepEqual(f.ataques.map((a) => a.nome), ['Pedir Skin']);
    assert.ok(R.jogadasValidas(estado, 0).some((v) => v.tipo === 'atacar' && v.ataque === 0));
    assert.ok(!R.jogadasValidas(estado, 0).some((v) => v.tipo === 'atacar' && v.ataque === 1), 'os ataques dele foram trocados');
    const r = R.aplicar(estado, { jogador: 0, tipo: 'atacar', ataque: 0 });
    assert.ok(r.eventos.some((ev) => ev.tipo === 'dano' && ev.valor === 60 * R.ESCALA));
    assert.ok(r.eventos.some((ev) => ev.tipo === 'anexoSai' && ev.uid === skin && ev.motivo === 'usada'));
    const sk = R.naMesa(EU(r.estado)).find((c) => c.id === 'superkid');
    assert.equal(R.ficha(r.estado, sk).visual, null, 'volta a ser o Superkid');
});

test('poder emprestado com prazo: dura até o fim do turno de quem jogou; quem estava de pé fica com 1 de vida', () => {
    const e = mesa({ eu: { mao: ['r-poder'] } });
    let { estado } = jogar(e, { tipo: 'anexar', uid: EU(e).mao[0].uid, alvo: EU(e).ativo.uid });
    assert.equal(R.poderDe(estado, EU(estado).ativo).nome, 'Pede Lanche');
    const mao = EU(estado).mao.length;
    estado = R.aplicar(estado, { jogador: 0, tipo: 'poder', uid: EU(estado).ativo.uid }).estado;
    assert.equal(EU(estado).mao.length, mao + 1);
    EU(estado).ativo.dano = R.hpMax(estado, EU(estado).ativo) - 10;   // de pé só por causa dos +30 de HP
    const r = R.aplicar(estado, { jogador: 0, tipo: 'passar' });
    assert.ok(r.eventos.some((ev) => ev.tipo === 'anexoSai' && ev.motivo === 'prazo'));
    assert.deepEqual(EU(r.estado).ativo.anexos, []);
    assert.equal(EU(r.estado).ativo.dano, R.hpMax(r.estado, EU(r.estado).ativo) - 1);
    assert.ok(!r.eventos.some((ev) => ev.tipo === 'nocaute'));
});

test('carta só de entrada: cura e vai direto para o descarte', () => {
    const e = mesa({ eu: { mao: ['r-lanche'], ativoExtra: { dano: 800 } } });
    const uid = EU(e).mao[0].uid;
    const { estado, eventos } = jogar(e, { tipo: 'anexar', uid, alvo: EU(e).ativo.uid });
    assert.equal(EU(estado).ativo.dano, 800 - 30 * R.ESCALA);
    assert.ok(eventos.some((ev) => ev.tipo === 'cura' && ev.fonte === 'anexo'));
    assert.deepEqual(EU(estado).ativo.anexos, []);
    assert.ok(EU(estado).descarte.some((c) => c.uid === uid));
});

test('carta que muda os ataques: custo menor, efeito a mais e tag nova', () => {
    const e = mesa({ eu: { mao: ['r-treino'], ativoExtra: { aura: 1 } } });
    let { estado } = jogar(e, { tipo: 'anexar', uid: EU(e).mao[0].uid, alvo: EU(e).ativo.uid });
    const f = R.ficha(estado, EU(estado).ativo);
    assert.deepEqual(f.ataques.map((a) => a.custo), [0, 1]);
    assert.ok(f.tags.includes('treinado'));
    const r = R.aplicar(estado, { jogador: 0, tipo: 'atacar', ataque: 1 });   // 0/14/2 com 1 Aura (custava 2)
    assert.ok(r.eventos.some((ev) => ev.tipo === 'escudo'));
});

test('visão do jogador: as cartas atrás dos lutadores são públicas', () => {
    const e = mesa({ eu: { mao: ['r-forca'] } });
    const { estado } = jogar(e, { tipo: 'anexar', uid: EU(e).mao[0].uid, alvo: EU(e).ativo.uid });
    const v = R.visaoDe(estado, 1);
    assert.equal(v.jogadores[0].ativo.anexos[0].id, 'r-forca');
});

test('robô: deita a carta complementar e partidas inteiras com elas terminam sem erro', () => {
    const e = mesa({ eu: { mao: ['r-forca'] } });
    const jogada = Robo.escolherJogada(e, 0, { nivel: 'normal' });
    assert.equal(jogada.tipo, 'anexar');
    assert.equal(jogada.alvo, EU(e).ativo.uid);
    let anexadas = 0;
    for (let p = 0; p < 40; p++) {
        let s = 1;
        const aleatorio = () => { s = (s * 16807 + p) % 2147483647; return s / 2147483647; };
        let estado = R.criarPartida({ semente: `anexo-${p}`, decks: [DECK, DECK] });
        for (let passo = 0; estado.fase !== 'fim' && passo < 3000; passo++) {
            const j = Robo.quemJoga(estado);
            const r = R.aplicar(estado, Robo.escolherJogada(estado, j, { nivel: p % 2 ? 'facil' : 'normal', aleatorio }));
            anexadas += r.eventos.filter((ev) => ev.tipo === 'anexar').length;
            estado = r.estado;
        }
        assert.equal(estado.fase, 'fim', `partida ${p} não terminou`);
        // nenhuma carta some nem duplica: deck + mão + descarte + mesa (com as de trás) + campo = 15 de cada um
        const todas = [...estado.jogadores.flatMap((x) => [...x.deck, ...x.mao, ...x.descarte,
            ...R.naMesa(x).flatMap((c) => [c, ...(c.anexos || [])])]), ...(estado.campo ? [estado.campo.carta] : [])];
        assert.equal(todas.length, 30);
        for (const j of [0, 1]) assert.equal(new Set(todas.filter((c) => c.uid.startsWith(`${j}-`)).map((c) => c.uid)).size, 15);
    }
    assert.ok(anexadas > 20, `o robô quase não usou as cartas (${anexadas})`);
});
