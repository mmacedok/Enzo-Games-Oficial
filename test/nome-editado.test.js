// ============================================================================
// Nome da conta editado pela equipe (POST /api/admin/users/:id/nome): o login do Google não desfaz.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'dono@exemplo.com' };

test('nome: admin troca, o login mantém, e dá para voltar ao original', async (t) => {
    const db = createLocalDb(null);
    t.after(() => db.close());
    let nomeGoogle = 'xX_Fulano_Xx';
    const verificarGoogle = async (c) => { const [, sub] = c.split(':'); return { sub, name: sub === 'dono' ? 'Dono' : nomeGoogle, email: `${sub}@exemplo.com` }; };
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
    const entrar = async (nome) => { const c = navegador(); const l = await c('POST', '/api/auth/google', { credential: `google:${nome}:${nome}-${'x'.repeat(20)}` }); return { c, id: l.dados.user.id }; };
    const dono = await entrar('dono');
    const fulano = await entrar('fulano');

    assert.equal((await fulano.c('POST', `/api/admin/users/${fulano.id}/nome`, { nome: 'Eu' })).status, 404, 'leitor comum não renomeia');
    const r = await dono.c('POST', `/api/admin/users/${fulano.id}/nome`, { nome: '  Fulano   da Silva ' });
    assert.equal(r.status, 200);
    assert.equal(r.dados.name, 'Fulano da Silva');
    assert.equal(r.dados.original, 'xX_Fulano_Xx');

    nomeGoogle = 'Outro Nome do Google';
    await entrar('fulano');
    let u = (await dono.c('GET', `/api/admin/users/${fulano.id}`)).dados;
    assert.equal(u.name, 'Fulano da Silva', 'o login não desfaz a troca');
    assert.equal(u.nomeOriginal, 'Outro Nome do Google');
    assert.equal(u.nomeEditado, true);
    assert.equal(u.email, 'fulano@exemplo.com');

    await dono.c('POST', `/api/admin/users/${fulano.id}/nome`, { nome: '' });
    u = (await dono.c('GET', `/api/admin/users/${fulano.id}`)).dados;
    assert.equal(u.name, 'Outro Nome do Google');
    assert.equal(u.nomeEditado, false);
    assert.ok((await dono.c('GET', '/api/admin/log')).dados.log.some((l) => l.acao === 'nome'));
});
