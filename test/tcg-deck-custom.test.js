// ============================================================================
// Testes do deck customizado (Batalha): cartas infinitas (não depende da coleção), 15 cartas,
// no máximo 2 lendárias, repetição limitada, e usar em sala/partida/revanche.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const R = require('../js/tcg-regras.js');
const Baralho = require('../js/baralho-dados.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };
const LENDARIAS = Baralho.CARTAS.filter((c) => c.raridade === 'lendario' && c.tipo !== 'campo').map((c) => c.id);
const COMUNS = Baralho.CARTAS.filter((c) => c.raridade !== 'lendario').map((c) => c.id);

// 2 lendárias + 13 outras (até 2 cópias de cada)
const DECK = [LENDARIAS[0], LENDARIAS[1], ...COMUNS.slice(0, 7).flatMap((id) => [id, id])].slice(0, 15);

function montar() {
    const db = createLocalDb(null);
    const verificarGoogle = async (c) => { const [, sub, nome] = c.split(':'); return { sub, name: nome, email: `${sub}@exemplo.com` }; };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => 1_700_000_000_000, aleatorio: (max) => 3 % max });
    const navegador = () => {
        let cookie = '';
        return async (metodo, caminho, corpo) => {
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const r = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }));
            const sc = r.headers.getSetCookie();
            if (sc.length) cookie = sc[0].split(';')[0];
            return { status: r.status, dados: await r.json() };
        };
    };
    return { db, navegador };
}
async function entrar(m, sub) {
    const c = m.navegador();
    const r = await c('POST', '/api/auth/google', { credential: `google:${sub}:${sub}-nome-completo-xxxxxxxx` });
    return { c, id: r.dados.user.id };
}

test('D1: validarDeck com maxLendarias; o deck de teste é válido', () => {
    assert.equal(DECK.length, 15);
    assert.deepEqual(R.validarDeck(DECK, { maxLendarias: R.MAX_LENDARIAS_CUSTOM }), []);
    const tres = [LENDARIAS[0], LENDARIAS[1], LENDARIAS[2], ...DECK.slice(2, 14)];
    assert.match(R.validarDeck(tres, { maxLendarias: 2 }).join(' '), /No máximo 2 lendárias/);
    assert.deepEqual(R.validarDeck(tres), []); // sem a opção, os decks prontos (3 lendárias) continuam valendo
});

test('D2: salvar sem ter as cartas (infinitas); 15 cartas, 2 lendárias, repetição limitada', async () => {
    const m = montar();
    const { c } = await entrar(m, 'ana');
    const vazio = (await c('GET', '/api/tcg/deck')).dados;
    assert.equal(vazio.cartas, null);
    assert.deepEqual(vazio.limites, { tamanho: 15, copias: 2, copiasLendaria: 1, lendarias: 2 });
    // a conta não tem nenhuma carta na coleção e mesmo assim monta o deck
    const ok = await c('POST', '/api/tcg/deck', { cartas: DECK });
    assert.equal(ok.status, 200);
    assert.deepEqual((await c('GET', '/api/tcg/deck')).dados.cartas, DECK);

    const falha = async (cartas) => (await c('POST', '/api/tcg/deck', { cartas })).status;
    assert.equal(await falha(DECK.slice(0, 14)), 400);                       // 14 cartas
    assert.equal(await falha([...DECK.slice(0, 14), DECK[14], DECK[14]]), 400); // 16 cartas
    assert.equal(await falha([LENDARIAS[0], LENDARIAS[1], LENDARIAS[2], ...DECK.slice(2, 14)]), 400); // 3 lendárias
    assert.equal(await falha([LENDARIAS[0], LENDARIAS[0], ...DECK.slice(2)]), 400); // lendária repetida
    assert.equal(await falha([COMUNS[0], COMUNS[0], COMUNS[0], ...DECK.slice(3)]), 400); // 3 cópias
    assert.equal(await falha([...DECK.slice(0, 14), 'nao-existe']), 400);
    assert.equal(await falha('texto'), 400);
});

test('D3: sala e partida com o deck customizado; revanche mantém os decks', async () => {
    const m = montar();
    const a = await entrar(m, 'ana');
    const b = await entrar(m, 'beto');
    assert.equal((await a.c('POST', '/api/tcg/salas', { deck: 'custom' })).status, 400); // ainda não montou
    await a.c('POST', '/api/tcg/deck', { cartas: DECK });

    const sala = (await a.c('POST', '/api/tcg/salas', { deck: 'custom' })).dados;
    assert.equal(sala.deck, 'custom');
    assert.equal((await b.c('POST', '/api/tcg/salas/' + sala.codigo + '/entrar', { deck: 'custom' })).status, 400); // beto não tem deck
    const p = (await b.c('POST', `/api/tcg/salas/${sala.codigo}/entrar`, { deck: 'turma' })).dados;
    assert.ok(p.id);
    const minha = (await a.c('GET', `/api/tcg/partidas/${p.id}`)).dados;
    assert.deepEqual(minha.decks, ['custom', 'turma']);
    const cartasDaAna = [...minha.visao.jogadores[0].mao, ...(minha.visao.jogadores[0].ativo ? [minha.visao.jogadores[0].ativo] : [])].map((x) => x.id);
    assert.ok(cartasDaAna.every((id) => DECK.includes(id)));

    // revanche: lados trocados e o deck customizado vai junto
    const v = minha.versao;
    await b.c('POST', `/api/tcg/partidas/${p.id}/jogada`, { jogada: { tipo: 'desistir' }, versao: (await b.c('GET', `/api/tcg/partidas/${p.id}`)).dados.versao, regras: R.REGRAS_VERSAO });
    assert.ok(v >= 0);
    await a.c('POST', `/api/tcg/partidas/${p.id}/revanche`, {});
    await b.c('POST', `/api/tcg/partidas/${p.id}/revanche`, {});
    const nova = (await a.c('GET', '/api/tcg/atual')).dados.partida;
    assert.ok(nova && nova !== p.id);
    const r2 = (await a.c('GET', `/api/tcg/partidas/${nova}`)).dados;
    assert.deepEqual(r2.decks, ['turma', 'custom']); // trocou de lado

    // lista salva que deixou de ser válida (ex.: limite mudou) não entra em sala
    await a.c('POST', `/api/tcg/partidas/${nova}/jogada`, { jogada: { tipo: 'desistir' }, versao: r2.versao, regras: R.REGRAS_VERSAO });
    await m.db.query('UPDATE tcg_deck_custom SET cartas = $2 WHERE user_id = $1', [a.id, JSON.stringify(DECK.slice(0, 10))]);
    assert.ok((await a.c('GET', '/api/tcg/deck')).dados.erros.length > 0);
    assert.equal((await a.c('POST', '/api/tcg/salas', { deck: 'custom' })).status, 400);
});

test('D4: listar o deck (nome, descrição, sem links), ver em "Decks de players", copiar e o admin tirar da lista', async () => {
    const m = montar();
    const a = await entrar(m, 'ana');
    const b = await entrar(m, 'beto');
    const chefe = m.navegador();
    await chefe('POST', '/api/auth/google', { credential: 'google:chefe:chefe-nome-completo-xxxxxxxx' });

    // sem nome não lista; nome/descrição com link ou grande demais é recusado
    assert.equal((await a.c('POST', '/api/tcg/deck', { cartas: DECK, publico: true })).status, 400);
    assert.equal((await a.c('POST', '/api/tcg/deck', { cartas: DECK, nome: 'veja www.x.com', publico: true })).status, 400);
    assert.equal((await a.c('POST', '/api/tcg/deck', { cartas: DECK, nome: 'x'.repeat(31) })).status, 400);
    assert.equal((await a.c('POST', '/api/tcg/deck', { cartas: DECK, nome: 'Bom', descricao: 'y'.repeat(81) })).status, 400);

    // salvar sem listar: ninguém vê
    let s = (await a.c('POST', '/api/tcg/deck', { cartas: DECK, nome: '  Macarrão   Forte ', descricao: 'Barato e rápido' })).dados;
    assert.equal(s.nome, 'Macarrão Forte');
    assert.equal(s.publico, false);
    assert.deepEqual((await b.c('GET', '/api/tcg/decks-publicos')).dados.decks, []);

    // listar
    s = (await a.c('POST', '/api/tcg/deck', { cartas: DECK, publico: true })).dados; // mantém nome e descrição
    assert.equal(s.publico, true);
    assert.equal(s.descricao, 'Barato e rápido');
    const lista = (await b.c('GET', '/api/tcg/decks-publicos')).dados.decks;
    assert.equal(lista.length, 1);
    assert.deepEqual([lista[0].nome, lista[0].descricao, lista[0].meu, lista[0].cartas.length, lista[0].copias], ['Macarrão Forte', 'Barato e rápido', false, 15, 0]);
    assert.ok(/ana/i.test(lista[0].autor));
    assert.equal((await a.c('GET', '/api/tcg/decks-publicos')).dados.decks[0].meu, true);

    // copiar: vira o deck do Beto (não listado), contador sobe; copiar o próprio é recusado
    assert.equal((await a.c('POST', `/api/tcg/decks-publicos/${a.id}/copiar`, {})).status, 400);
    const copia = (await b.c('POST', `/api/tcg/decks-publicos/${a.id}/copiar`, {})).dados;
    assert.deepEqual(copia.cartas, DECK);
    assert.equal(copia.publico, false);
    assert.equal(copia.nome, 'Cópia: Macarrão Forte');
    assert.equal((await b.c('GET', '/api/tcg/decks-publicos?ordem=copias')).dados.decks[0].copias, 1);
    assert.equal((await b.c('POST', '/api/tcg/salas', { deck: 'custom' })).status, 200); // a cópia já joga

    // tirar da lista (o dono) e o admin
    await a.c('POST', '/api/tcg/deck', { cartas: DECK, publico: false });
    assert.equal((await b.c('GET', '/api/tcg/decks-publicos')).dados.decks.length, 0);
    assert.equal((await b.c('POST', `/api/tcg/decks-publicos/${a.id}/copiar`, {})).status, 404);
    await a.c('POST', '/api/tcg/deck', { cartas: DECK, publico: true });
    assert.equal((await a.c('POST', `/api/admin/users/${a.id}/deck/despublicar`, {})).status, 404); // não é admin
    assert.equal((await chefe('POST', `/api/admin/users/${a.id}/deck/despublicar`, {})).dados.tirado, true);
    assert.equal((await b.c('GET', '/api/tcg/decks-publicos')).dados.decks.length, 0);
    assert.equal((await chefe('POST', `/api/admin/users/${a.id}/deck/despublicar`, {})).dados.tirado, false); // já estava fora
    assert.equal((await a.c('GET', '/api/tcg/deck')).dados.publico, false);
    assert.ok((await chefe('GET', '/api/admin/log')).dados.log.some((l) => l.acao === 'deck-despublicar'));
    // a ficha da conta para o admin mostra o deck
    await a.c('POST', '/api/tcg/deck', { cartas: DECK, publico: true });
    const ficha = (await chefe('GET', `/api/admin/users/${a.id}`)).dados;
    assert.deepEqual([ficha.deck.nome, ficha.deck.publico, ficha.deck.cartas], ['Macarrão Forte', true, 15]);
});
