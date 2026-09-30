// ============================================================================
// Testes do registro de acessos (api/acessos.js): IP, país, estado e cidade das ações.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const { origemDe } = require('../api/acessos.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };

function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    const verificarGoogle = async (credencial) => {
        const [, sub, nome] = credencial.split(':');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => relogio.agora });
    function navegador(origem = {}) {
        let cookie = '';
        return async (metodo, caminho, corpo) => {
            const h = { ...origem };
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const r = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }));
            const sc = r.headers.getSetCookie();
            if (sc.length) cookie = sc[0].split(';')[0];
            return { status: r.status, dados: await r.json() };
        };
    }
    return { db, relogio, navegador };
}
const login = (c, sub, nome) => c('POST', '/api/auth/google', { credential: `google:${sub}:${nome}:xxxxxxxxxxxxxxxxxxxx` });
const BH = { 'cf-connecting-ip': '187.1.2.3', 'cf-ipcountry': 'BR', 'cf-region': 'Minas Gerais', 'cf-ipcity': 'Belo%20Horizonte' };
const SP = { 'cf-connecting-ip': '200.9.9.9', 'cf-ipcountry': 'BR', 'cf-region': 'S%C3%A3o%20Paulo', 'cf-ipcity': 'S%C3%A3o%20Paulo' };

test('A1: origemDe lê IP e lugar dos cabeçalhos da Cloudflare (e decodifica)', () => {
    const o = origemDe(new Request('http://x/', { headers: SP }));
    assert.deepEqual(o, { ip: '200.9.9.9', pais: 'BR', estado: 'São Paulo', cidade: 'São Paulo' });
    assert.deepEqual(origemDe(new Request('http://x/')), { ip: null, pais: null, estado: null, cidade: null });
});

test('A2: login e ações sensíveis gravam IP e lugar; leitura comum não', async () => {
    const { db, navegador } = montar();
    const ana = navegador(BH);
    await login(ana, 'ana', 'Ana Silva');
    await ana('GET', '/api/baralho'); // não entra
    await ana('POST', '/api/auth/logout', {});
    const linhas = await db.query('SELECT evento, ip, pais, estado, cidade, user_id FROM acessos ORDER BY created_at, evento');
    assert.deepEqual(linhas.map((l) => l.evento).sort(), ['login', 'logout']);
    assert.equal(linhas[0].ip, '187.1.2.3');
    assert.equal(linhas[0].estado, 'Minas Gerais');
    assert.equal(linhas[0].cidade, 'Belo Horizonte');
    assert.ok(linhas.every((l) => l.user_id));
});

test('A3: visita entra uma vez por conta e IP a cada 30 minutos', async () => {
    const { db, relogio, navegador } = montar();
    const ana = navegador(BH);
    await login(ana, 'ana', 'Ana Silva');
    const visitas = () => db.query("SELECT 1 FROM acessos WHERE evento = 'visita'").then((l) => l.length);
    await ana('GET', '/api/auth/me'); // logo depois do login já conta como presença
    assert.equal(await visitas(), 0);
    relogio.agora += 31 * 60 * 1000;
    await ana('GET', '/api/auth/me');
    await ana('GET', '/api/auth/me');
    assert.equal(await visitas(), 1);
    // outro IP da mesma conta conta como visita nova na hora
    const outro = navegador(SP);
    await login(outro, 'ana', 'Ana Silva');
    await outro('GET', '/api/auth/me');
    assert.equal(await visitas(), 1); // o login no outro IP já conta
    relogio.agora += 31 * 60 * 1000;
    await outro('GET', '/api/auth/me');
    assert.equal(await visitas(), 2);
});

test('A4: só o admin lê; filtros por IP, lugar e país; IP repartido aparece no resumo', async () => {
    const { navegador } = montar();
    const chefe = navegador(SP);
    await login(chefe, 'chefe', 'Chefe');
    const ana = navegador(BH);
    const beto = navegador(BH);
    await login(ana, 'ana', 'Ana Silva');
    await login(beto, 'beto', 'Beto Souza');

    assert.equal((await ana('GET', '/api/admin/acessos')).status, 404);
    const todos = (await chefe('GET', '/api/admin/acessos')).dados;
    assert.ok(todos.acessos.length >= 3);
    const porIp = (await chefe('GET', '/api/admin/acessos?ip=187.1.2.3')).dados.acessos;
    assert.deepEqual(porIp.map((a) => a.nome).sort(), ['Ana Silva', 'Beto Souza']);
    const porLugar = (await chefe('GET', '/api/admin/acessos?lugar=belo')).dados.acessos;
    assert.equal(porLugar.length, 2);
    assert.equal((await chefe('GET', '/api/admin/acessos?lugar=' + encodeURIComponent('%'))).dados.acessos.length, 0);
    assert.equal((await chefe('GET', '/api/admin/acessos?pais=br')).dados.acessos.length, todos.acessos.length);

    const resumo = (await chefe('GET', '/api/admin/acessos/resumo')).dados;
    assert.equal(resumo.lugares[0].cidade, 'Belo Horizonte');
    assert.equal(resumo.repartidos.length, 1);
    assert.equal(resumo.repartidos[0].ip, '187.1.2.3');
    assert.equal(resumo.repartidos[0].contas, 2);
});

test('A5: a ficha da conta traz os acessos; registros antigos são apagados', async () => {
    const { db, relogio, navegador } = montar();
    const chefe = navegador(SP);
    const ana = navegador(BH);
    const r = await login(chefe, 'chefe', 'Chefe');
    const a = await login(ana, 'ana', 'Ana Silva');
    const ficha = (await chefe('GET', `/api/admin/users/${a.dados.user.id}`)).dados;
    assert.equal(ficha.acessos.length, 1);
    assert.equal(ficha.acessos[0].cidade, 'Belo Horizonte');
    assert.ok(r.dados.loggedIn);
    relogio.agora += 61 * 24 * 60 * 60 * 1000;
    await ana('POST', '/api/auth/logout', {}); // dispara a faxina
    const restam = await db.query("SELECT evento FROM acessos WHERE evento = 'login'");
    assert.equal(restam.length, 0);
});
