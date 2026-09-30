// ============================================================================
// Testes do registro de acessos (api/acessos.js): IP, país, estado e cidade das ações.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const { origemDe, aparelhoDe } = require('../api/acessos.js');

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
    assert.deepEqual(o, { ip: '200.9.9.9', pais: 'BR', estado: 'São Paulo', cidade: 'São Paulo', operadora: null, aparelho: null, lat: null, lon: null });
    assert.deepEqual(origemDe(new Request('http://x/')), { ip: null, pais: null, estado: null, cidade: null, operadora: null, aparelho: null, lat: null, lon: null });
    const comCf = new Request('http://x/', { headers: SP });
    comCf.cf = { asOrganization: 'Claro S.A.', city: 'Fortaleza', latitude: '-3.7319', longitude: '-38.5267' };
    assert.equal(origemDe(comCf).operadora, 'Claro S.A.');
    assert.equal(origemDe(comCf).cidade, 'Fortaleza');
    assert.equal(origemDe(comCf).lat, -3.73);
    assert.equal(origemDe(comCf).lon, -38.53);
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

test('A6: visitante sem login é registrado (1 por IP a cada 30 min) e o admin filtra por ele', async () => {
    const { relogio, navegador } = montar();
    const chefe = navegador(SP);
    await login(chefe, 'chefe', 'Chefe');
    const v1 = navegador(BH);
    assert.equal((await v1('POST', '/api/visita', { pagina: '/reader.html?x=1' })).status, 200);
    await v1('POST', '/api/visita', { pagina: '/index.html' }); // mesmo IP: não duplica
    await navegador(SP)('POST', '/api/visita', { pagina: 'sem-barra' }); // página inválida vira vazio
    const { acessos } = (await chefe('GET', '/api/admin/acessos?anonimo=1')).dados;
    assert.equal(acessos.length, 2);
    assert.ok(acessos.every((a) => a.userId === null && a.evento === 'visitante'));
    assert.deepEqual(acessos.map((a) => a.pagina).sort((x, y) => String(x).localeCompare(String(y))), ['/reader.html?x=1', null]);
    const resumo = (await chefe('GET', '/api/admin/acessos/resumo')).dados;
    assert.deepEqual(resumo.semLogin, { acessos: 2, ips: 2 });
    relogio.agora += 31 * 60 * 1000;
    await v1('POST', '/api/visita', { pagina: '/index.html' });
    assert.equal((await chefe('GET', '/api/admin/acessos?anonimo=1')).dados.acessos.length, 3);
});

test('A7: radar devolve tráfego por hora, pontos do mapa e eventos recentes (só admin)', async () => {
    const { db, navegador } = montar();
    const chefe = navegador(SP);
    await login(chefe, 'chefe', 'Chefe');
    await navegador(BH)('POST', '/api/visita', { pagina: '/' });
    await db.query("UPDATE acessos SET lat = -19.92, lon = -43.94 WHERE evento = 'visitante'");
    assert.equal((await navegador(BH)('GET', '/api/admin/acessos/radar')).status, 404);
    const r = (await chefe('GET', '/api/admin/acessos/radar')).dados;
    assert.equal(r.horas.length, 24);
    assert.equal(r.horas.reduce((s, h) => s + h.total, 0), 2);
    assert.equal(r.horas.reduce((s, h) => s + h.semLogin, 0), 1);
    assert.equal(r.pontos.length, 1);
    assert.deepEqual([r.pontos[0].lat, r.pontos[0].lon, r.pontos[0].n], [-19.92, -43.94, 1]);
    assert.equal(r.recentes.length, 2);
    assert.deepEqual(r.totais, { acessos: 2, ips: 2, semLogin: 1 });
});

test('A8: aparelhoDe resume o User-Agent (iPhone Safari, app embutido, Android, PC)', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    assert.equal(aparelhoDe(iphone), 'iPhone 17 · Safari');
    assert.equal(aparelhoDe(iphone + ' Instagram 330.0.0'), 'iPhone 17 · Instagram (app)');
    assert.equal(aparelhoDe('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'), 'iPhone 17 · WebView (app)');
    assert.equal(aparelhoDe('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'), 'Android · Chrome');
    assert.equal(aparelhoDe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0'), 'Windows · Edge');
    assert.equal(aparelhoDe(''), null);
});

test('A9: sessão perdida (o navegador lembrava o login) é registrada com o aparelho; cookie de sessão leva Expires', async () => {
    const { navegador } = montar();
    const chefe = navegador(SP);
    await login(chefe, 'chefe', 'Chefe');
    const iphone = navegador({ ...BH, 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
    await iphone('POST', '/api/visita', { pagina: '/index.html', perdida: true });
    await iphone('POST', '/api/visita', { pagina: '/index.html', perdida: true }); // mesmo IP: não duplica
    const { acessos } = (await chefe('GET', '/api/admin/acessos?anonimo=1')).dados;
    assert.equal(acessos.length, 1);
    assert.equal(acessos[0].evento, 'sessao-perdida');
    assert.equal(acessos[0].aparelho, 'iPhone 17 · Safari');
    // cookie do login: Max-Age e Expires juntos
    const { createApi: criar } = require('../api/handler.js');
    const api = criar({ db: createLocalDb(null), env: ENV, verificarGoogle: async () => ({ sub: 'x', name: 'X', email: 'x@exemplo.com' }), agora: Date.now });
    const r = await api(new Request('http://localhost/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify({ credential: 'google:x:X:xxxxxxxxxxxxxxxxxxxx' }) }));
    const cookie = r.headers.getSetCookie()[0];
    assert.match(cookie, /Max-Age=2592000/);
    assert.match(cookie, /Expires=\w{3}, \d{2} \w{3} \d{4}/);
    assert.match(cookie, /HttpOnly/);
});
