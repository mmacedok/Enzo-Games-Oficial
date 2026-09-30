// ============================================================================
// Testes da "chave do aparelho" (api/auth.js): quando o cookie some (Safari do iPhone, app embutido),
// o navegador troca a chave guardada por uma sessão nova.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };

function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    const verificarGoogle = async (c) => { const [, sub, nome] = c.split(':'); return { sub, name: nome, email: `${sub}@exemplo.com` }; };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => relogio.agora });
    const navegador = () => {
        let cookie = '';
        const chamar = async (metodo, caminho, corpo) => {
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const r = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }));
            const sc = r.headers.getSetCookie();
            if (sc.length) cookie = sc[sc.length - 1].split(';')[0];
            return { status: r.status, dados: await r.json() };
        };
        chamar.perderCookie = () => { cookie = ''; };
        return chamar;
    };
    return { db, relogio, navegador };
}
const entrar = (c, sub) => c('POST', '/api/auth/google', { credential: `google:${sub}:${sub}-nome-completo-xxxxxxxx` });

test('L1: login devolve a chave; sem cookie, a chave restaura a sessão e troca por outra', async () => {
    const { navegador } = montar();
    const aparelho = navegador();
    const login = (await entrar(aparelho, 'ana')).dados;
    assert.ok(login.lembrar && login.lembrar.length >= 40);
    assert.equal((await aparelho('GET', '/api/auth/me')).dados.loggedIn, true);

    aparelho.perderCookie(); // o Safari jogou o cookie fora
    assert.equal((await aparelho('GET', '/api/auth/me')).dados.loggedIn, false);
    const volta = await aparelho('POST', '/api/auth/restaurar', { token: login.lembrar });
    assert.equal(volta.status, 200);
    assert.equal(volta.dados.loggedIn, true);
    assert.equal(volta.dados.user.id, login.user.id);
    assert.notEqual(volta.dados.lembrar, login.lembrar); // chave trocada
    assert.equal((await aparelho('GET', '/api/auth/me')).dados.loggedIn, true); // o cookie novo funciona
});

test('L2: a chave velha vale 2 minutos (duas abas) e depois morre; chave falsa 401', async () => {
    const { relogio, navegador } = montar();
    const a = navegador();
    const chave = (await entrar(a, 'ana')).dados.lembrar;
    const b = navegador();
    assert.equal((await b('POST', '/api/auth/restaurar', { token: chave })).status, 200);
    const c = navegador();
    assert.equal((await c('POST', '/api/auth/restaurar', { token: chave })).status, 200); // 2ª aba, dentro da carência
    relogio.agora += 3 * 60 * 1000;
    assert.equal((await navegador()('POST', '/api/auth/restaurar', { token: chave })).status, 401);
    assert.equal((await navegador()('POST', '/api/auth/restaurar', { token: 'nao-existe-nao-existe-nao-existe' })).status, 401);
    assert.equal((await navegador()('POST', '/api/auth/restaurar', {})).status, 401);
});

test('L3: a chave não vale como cookie, não conta como sessão e some ao sair; banido não restaura', async () => {
    const { navegador } = montar();
    const chefe = navegador();
    await entrar(chefe, 'chefe');
    const ana = navegador();
    const login = (await entrar(ana, 'ana')).dados;
    const ficha = (await chefe('GET', `/api/admin/users/${login.user.id}`)).dados;
    assert.equal(ficha.sessoes, 1); // só o cookie, não a chave

    await ana('POST', '/api/auth/logout', { token: login.lembrar });
    assert.equal((await navegador()('POST', '/api/auth/restaurar', { token: login.lembrar })).status, 401);

    const beto = navegador();
    const chaveBeto = (await entrar(beto, 'beto')).dados;
    await chefe('POST', `/api/admin/users/${chaveBeto.user.id}/role`, { role: 'banned' });
    assert.equal((await navegador()('POST', '/api/auth/restaurar', { token: chaveBeto.lembrar })).status, 401); // banir derruba as chaves também
});
