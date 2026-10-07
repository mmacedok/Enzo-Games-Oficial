// Visualizações de capítulo: o leitor soma, só a equipe vê.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'dono@exemplo.com' };

async function montar() {
    const db = createLocalDb(null);
    let agora = 1_700_000_000_000;
    const verificarGoogle = async (c) => { const [, sub, nome] = c.split(':'); return { sub, name: nome, email: `${sub}@exemplo.com` }; };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => agora });
    const gente = {};
    for (const nome of ['dono', 'ana', 'leitor', 'bia']) {
        let cookie = '';
        const chamar = async (metodo, caminho, corpo) => {
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const r = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }));
            const sc = r.headers.getSetCookie();
            if (sc.length) cookie = sc[0].split(';')[0];
            return { status: r.status, dados: await r.json() };
        };
        const login = await chamar('POST', '/api/auth/google', { credential: `google:${nome}:${nome}-${'x'.repeat(20)}` });
        gente[nome] = { chamar, id: login.dados.user.id };
    }
    return { db, gente, passar: (ms) => { agora += ms; } };
}

test('leituras: soma 1 por abertura (com intervalo) e só a equipe vê', async (t) => {
    const { db, gente, passar } = await montar();
    t.after(() => db.close());
    const { dono, ana, leitor, bia } = gente;
    await dono.chamar('POST', `/api/admin/users/${ana.id}/cargo`, { cargo: 'moderador' });
    const ver = (quem, cap = '1') => quem.chamar('POST', '/api/reader/view', { comicId: 'degustador', chapterId: cap });

    assert.equal((await ver(leitor)).status, 200);
    assert.equal((await ver(leitor)).status, 200, 'repetir logo depois não soma');
    passar(11 * 60 * 1000);
    await ver(leitor);
    await ver(leitor, '2');
    await ver(bia);
    assert.equal((await leitor.chamar('POST', '/api/reader/view', { comicId: '../x', chapterId: '1' })).status, 400);

    const painel = (await ana.chamar('GET', '/api/admin/leituras')).dados;
    assert.equal(painel.geral.visualizacoes, 4);
    assert.equal(painel.geral.leitores, 2);
    assert.equal(painel.hoje.visualizacoes, 4);
    assert.ok(painel.leitores[0].name.startsWith('leitor'));
    assert.equal(painel.leitores[0].total, 3);
    assert.equal(painel.top[0].chapterId, '1');
    assert.equal(painel.top[0].visualizacoes, 3);
    assert.ok(!JSON.stringify(painel).includes('@exemplo.com'), 'sem e-mail');

    const ficha = (await ana.chamar('GET', `/api/admin/leitores/${leitor.id}`)).dados;
    assert.equal(ficha.total, 3);
    assert.equal(ficha.leituras.length, 2);
    assert.ok(!('email' in ficha));
    assert.equal((await ana.chamar('GET', `/api/admin/leituras?q=bia`)).dados.leitores.length, 1);
    assert.equal((await dono.chamar('GET', '/api/admin/leituras')).status, 200, 'admin também vê');

    for (const quem of [leitor, bia]) {
        assert.equal((await quem.chamar('GET', '/api/admin/leituras')).status, 404);
        assert.equal((await quem.chamar('GET', `/api/admin/leitores/${leitor.id}`)).status, 404);
    }
});
