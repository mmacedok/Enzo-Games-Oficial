// ============================================================================
// Histórico das partidas online da Batalha no terminal admin (GET /api/admin/tcg/partidas).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const DIA = 24 * 60 * 60 * 1000;
const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };

function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    const verificarGoogle = async (credencial) => {
        const [prefixo, sub, nome] = credencial.split(':');
        if (prefixo !== 'google') throw new Error('assinatura inválida');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => relogio.agora });
    function navegador() {
        let cookie = '';
        return async function chamar(metodo, caminho, corpo) {
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const resposta = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }));
            const setCookie = resposta.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            return { status: resposta.status, dados: await resposta.json() };
        };
    }
    return { db, relogio, navegador };
}

const entrar = async (chamar, sub, nome) =>
    (await chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}-${'x'.repeat(20)}` })).dados.user;

test('histórico de partidas da Batalha: só admin vê; lista resultados, filtra por jogador e mostra as ao vivo', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const chefe = m.navegador();
    const leitor = m.navegador();
    const bia = m.navegador();
    await entrar(chefe, 'chefe', 'Henrique');
    const ze = await entrar(leitor, 'ze', 'Ze');
    const b = await entrar(bia, 'bia', 'Bia');

    const resultado = (id, venc, perd, a, bj, turnos, motivo, fim) => m.db.query(
        'INSERT INTO tcg_resultados (partida_id, vencedor, perdedor, decks, turnos, motivo, fim_em, jogador_a, jogador_b) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [id, venc, perd, JSON.stringify([['enzo-games', 'italolol'], ['superkid', 'chorao']]), turnos, motivo, fim, a, bj]);
    await resultado('p1', ze.id, b.id, ze.id, b.id, 21, 'vida', 1_000);
    await resultado('p2', null, null, b.id, ze.id, 30, 'limiteTurnos', 2_000);
    await resultado('p3', b.id, ze.id, ze.id, b.id, 9, 'desistencia', 3_000);

    // só admin
    assert.equal((await leitor('GET', '/api/admin/tcg/partidas')).status, 404);
    assert.equal((await m.navegador()('GET', '/api/admin/tcg/partidas')).status, 404);

    const r = (await chefe('GET', '/api/admin/tcg/partidas')).dados;
    assert.deepEqual(r.partidas.map((p) => p.id), ['p3', 'p2', 'p1'], 'mais recentes primeiro');
    const p1 = r.partidas.find((p) => p.id === 'p1');
    assert.equal(p1.vencedor.name, 'Ze-' + 'x'.repeat(20));
    assert.equal(p1.a.id, ze.id);
    assert.equal(p1.rodadas, 11);
    assert.equal(p1.motivo, 'vida');
    assert.deepEqual(p1.decks, [['enzo-games', 'italolol'], ['superkid', 'chorao']]);
    const p2 = r.partidas.find((p) => p.id === 'p2');
    assert.equal(p2.empate, true);
    assert.equal(p2.vencedor, null);
    assert.equal(r.temMais, false);

    // filtro por nome e por id da conta
    assert.equal((await chefe('GET', '/api/admin/tcg/partidas?q=Bia')).dados.partidas.length, 3);
    assert.equal((await chefe('GET', '/api/admin/tcg/partidas?q=ninguem')).dados.partidas.length, 0);
    assert.equal((await chefe('GET', `/api/admin/tcg/partidas?q=${ze.id}`)).dados.partidas.length, 3);

    // partida em andamento aparece em aoVivo
    await m.db.query(
        `INSERT INTO tcg_partidas (id, jogador_a, jogador_b, deck_a, deck_b, estado, versao, regras, prazo, status, criado_em, atualizado_em)
         VALUES ($4, $1, $2, 'custom', 'custom', $3, 1, 10, 9999, 'jogando', $5, $5)`,
        [ze.id, b.id, JSON.stringify({ turno: 4 }), 'viva', m.relogio.agora - 30_000]);
    await m.db.query(
        `INSERT INTO tcg_partidas (id, jogador_a, jogador_b, deck_a, deck_b, estado, versao, regras, prazo, status, criado_em, atualizado_em)
         VALUES ($4, $1, $2, 'custom', 'custom', $3, 1, 10, 9999, 'jogando', $5, $5)`,
        [ze.id, b.id, JSON.stringify({ turno: 7 }), 'parada', m.relogio.agora - 24 * 60 * 60 * 1000]);
    const dados = (await chefe('GET', '/api/admin/tcg/partidas')).dados;
    assert.deepEqual(dados.aoVivo.map((v) => v.id), ['viva'], 'só a que teve jogada há 30 s está ao vivo');
    assert.equal(dados.aoVivo[0].turnos, 4);
    assert.equal(dados.aoVivo[0].a.id, ze.id);
    // a de ontem foi encerrada sozinha: sem resultado, e aparece como abandonada
    assert.deepEqual(dados.abandonadas.map((v) => v.id), ['parada']);
    assert.equal(dados.abandonadas[0].turnos, 7);
    const [linha] = await m.db.query("SELECT status, motivo FROM tcg_partidas WHERE id = 'parada'");
    assert.deepEqual([linha.status, linha.motivo], ['fim', 'abandonada']);
    assert.equal((await m.db.query("SELECT 1 FROM tcg_resultados WHERE partida_id = 'parada'")).length, 0, 'abandono não vira resultado nem placar');
});

test('partida abandonada não prende mais os jogadores: encerra sozinha quando o site pergunta', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const ze = m.navegador();
    const b = m.navegador();
    const u1 = await entrar(ze, 'ze2', 'Ze');
    const u2 = await entrar(b, 'bia2', 'Bia');
    await m.db.query(
        `INSERT INTO tcg_partidas (id, jogador_a, jogador_b, deck_a, deck_b, estado, versao, regras, prazo, status, criado_em, atualizado_em)
         VALUES ('velha', $1, $2, 'custom', 'custom', $3, 1, 10, 9999, 'jogando', $4, $4)`,
        [u1.id, u2.id, JSON.stringify({ turno: 3 }), m.relogio.agora - DIA]);
    // /api/tcg/atual é o que o site pergunta para saber se a pessoa já está numa partida
    const atual = await ze('GET', '/api/tcg/atual');
    assert.equal(atual.status, 200);
    assert.ok(!atual.dados.partida && !atual.dados.id, 'a partida de ontem não prende mais ninguém');
    const [linha] = await m.db.query("SELECT status, motivo FROM tcg_partidas WHERE id = 'velha'");
    assert.deepEqual([linha.status, linha.motivo], ['fim', 'abandonada']);
});
