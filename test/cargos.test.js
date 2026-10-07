// ============================================================================
// Cargos da equipe (api/cargos.js + rotas em api/admin.js): dono, admin e moderador.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'dono@exemplo.com' };

async function montar() {
    const db = createLocalDb(null);
    const verificarGoogle = async (c) => { const [, sub, nome] = c.split(':'); return { sub, name: nome, email: `${sub}@exemplo.com` }; };
    const api = createApi({ db, env: ENV, verificarGoogle });
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
    const gente = {};
    for (const nome of ['dono', 'ana', 'bia', 'leitor']) {
        const chamar = navegador();
        const login = await chamar('POST', '/api/auth/google', { credential: `google:${nome}:${nome}-${'x'.repeat(20)}` });
        gente[nome] = { chamar, id: login.dados.user.id };
    }
    return { db, gente };
}

const lanc = { comic: 'degustador', capitulo: '5', acao: 'publicar' };

test('cargos: o dono dá moderador; o moderador só vê lançamentos e mexe neles', async (t) => {
    const { db, gente } = await montar();
    t.after(() => db.close());
    const { dono, ana, leitor } = gente;
    assert.equal((await ana.chamar('POST', '/api/admin/lancamentos', lanc)).status, 404, 'leitor comum não publica');
    assert.equal((await dono.chamar('POST', `/api/admin/users/${ana.id}/cargo`, { cargo: 'moderador' })).status, 200);
    const eu = (await ana.chamar('GET', '/api/auth/me')).dados;
    assert.equal(eu.cargo, 'moderador'); assert.equal(eu.admin, false);
    assert.equal((await dono.chamar('GET', '/api/auth/me')).dados.cargo, 'dono');

    assert.equal((await ana.chamar('POST', '/api/admin/lancamentos', lanc)).status, 200, 'moderador publica');
    await dono.chamar('POST', `/api/admin/users/${leitor.id}/role`, { role: 'banned' });
    const log = (await ana.chamar('GET', '/api/admin/log')).dados.log;
    assert.deepEqual([...new Set(log.map((l) => l.acao))], ['publish'], 'o moderador não vê ban/cargo');
    assert.ok((await dono.chamar('GET', '/api/admin/log')).dados.log.some((l) => l.acao === 'ban'));

    for (const [m, c, corpo] of [
        ['GET', '/api/admin/users'], ['GET', '/api/admin/overview'], ['GET', '/api/admin/lancamentos/acessos'],
        ['POST', '/api/admin/lancamentos/acesso', { comic: 'degustador', capitulo: '5', usuario: leitor.id, dar: true }],
        ['GET', '/api/admin/upload/estado'], ['GET', '/api/admin/equipe'], ['GET', '/api/admin/acessos'],
        ['POST', `/api/admin/users/${leitor.id}/cargo`, { cargo: 'moderador' }],
    ]) assert.equal((await ana.chamar(m, c, corpo)).status, 404, `${m} ${c}`);
});

test('cargos: só o dono cria ou tira admin; o dono e a própria conta não mudam', async (t) => {
    const { db, gente } = await montar();
    t.after(() => db.close());
    const { dono, ana, bia, leitor } = gente;
    assert.equal((await dono.chamar('POST', `/api/admin/users/${ana.id}/cargo`, { cargo: 'admin' })).status, 200);
    const eu = (await ana.chamar('GET', '/api/auth/me')).dados;
    assert.equal(eu.admin, true); assert.equal(eu.cargo, 'admin');
    assert.equal((await ana.chamar('GET', '/api/admin/users')).status, 200, 'admin com cargo usa o terminal');
    // admin comum cria/tira moderador, mas não admin
    assert.equal((await ana.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: 'moderador' })).status, 200);
    assert.equal((await ana.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: 'admin' })).status, 403);
    assert.equal((await ana.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: null })).status, 200);
    assert.equal((await ana.chamar('POST', `/api/admin/users/${ana.id}/cargo`, { cargo: null })).status, 400, 'não muda o próprio');
    assert.equal((await ana.chamar('POST', `/api/admin/users/${dono.id}/cargo`, { cargo: null })).status, 400, 'o dono não muda');
    assert.equal((await dono.chamar('POST', `/api/admin/users/${ana.id}/cargo`, { cargo: 'dono' })).status, 400, 'cargo inválido');
    // moderador promovido a admin pelo dono ("transformar em adm"), e depois rebaixado
    await dono.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: 'moderador' });
    assert.equal((await dono.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: 'admin' })).status, 200);
    assert.equal((await bia.chamar('GET', '/api/admin/users')).status, 200);
    assert.equal((await ana.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: null })).status, 403, 'admin comum não tira admin');
    assert.equal((await dono.chamar('POST', `/api/admin/users/${bia.id}/cargo`, { cargo: null })).status, 200);
    assert.equal((await bia.chamar('GET', '/api/admin/users')).status, 404, 'sem cargo, sem terminal');
    // banido não ganha cargo
    await dono.chamar('POST', `/api/admin/users/${leitor.id}/role`, { role: 'banned' });
    assert.equal((await dono.chamar('POST', `/api/admin/users/${leitor.id}/cargo`, { cargo: 'moderador' })).status, 400);
    // a equipe lista os cargos
    const equipe = (await dono.chamar('GET', '/api/admin/equipe')).dados;
    assert.equal(equipe.souDono, true);
    assert.deepEqual(equipe.equipe.map((m) => `${m.name.split('-')[0]}:${m.cargo}`).sort(), ['ana:admin', 'dono:dono']);
});
