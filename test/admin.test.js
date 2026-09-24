// ============================================================================
// Testes do painel admin (api/admin.js): quem entra, o que muda e o histórico.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const ENV = {
    GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com',
    SESSION_SECRET: 'x'.repeat(40),
    ADMIN_EMAILS: ' Chefe@Exemplo.com , outro-admin@exemplo.com',
};

function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    // Credencial falsa: "google:<sub>:<nome>" -> e-mail <sub>@exemplo.com.
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
            const resposta = await api(new Request(`http://localhost${caminho}`, {
                method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo),
            }));
            const setCookie = resposta.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            return { status: resposta.status, dados: await resposta.json() };
        };
    }
    return { db, relogio, navegador };
}

const entrar = async (chamar, sub, nome = 'Fulano Tal') =>
    (await chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}-${'x'.repeat(20)}` })).dados.user;

async function cenario() {
    const m = montar();
    const chefe = m.navegador();
    const leitor = m.navegador();
    const eu = await entrar(chefe, 'chefe', 'Henrique Macedo');
    const ele = await entrar(leitor, 'leitor', 'Zé Leitor');
    return { ...m, chefe, leitor, eu, ele };
}

test('1. só e-mails de ADMIN_EMAILS entram; para os outros a rota não existe', async (t) => {
    const { db, chefe, leitor, navegador } = await cenario();
    t.after(() => db.close());

    assert.equal((await chefe('GET', '/api/auth/me')).dados.admin, true);
    assert.equal((await leitor('GET', '/api/auth/me')).dados.admin, false);
    assert.equal((await chefe('GET', '/api/admin/overview')).status, 200);
    for (const chamar of [leitor, navegador()]) {
        assert.equal((await chamar('GET', '/api/admin/overview')).status, 404);
        assert.equal((await chamar('GET', '/api/admin/users')).status, 404);
    }
});

test('2. lista e busca mostram e-mail; detalhe traz tudo', async (t) => {
    const { db, chefe, leitor, ele } = await cenario();
    t.after(() => db.close());

    await leitor('POST', '/api/user/achievement', { id: 'macarronada' });
    const lista = await chefe('GET', '/api/admin/users');
    assert.equal(lista.status, 200);
    assert.equal(lista.dados.users.length, 2);
    assert.ok(lista.dados.users.some((u) => u.email === 'leitor@exemplo.com' && u.conquistas === 1));
    assert.ok(lista.dados.users.some((u) => u.email === 'chefe@exemplo.com' && u.admin));

    const busca = await chefe('GET', '/api/admin/users?q=z%C3%A9');
    assert.deepEqual(busca.dados.users.map((u) => u.id), [ele.id]);
    // Curinga do LIKE não vira "qualquer coisa".
    assert.equal((await chefe('GET', '/api/admin/users?q=%25')).dados.users.length, 0);

    const detalhe = await chefe('GET', `/api/admin/users/${ele.id}`);
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.dados.name, 'Zé Leitor-xxxxxxxxxxxxxxxxxxxx');
    assert.deepEqual(detalhe.dados.achievements.map((a) => a.id), ['macarronada']);
    assert.equal(detalhe.dados.sessoes, 1);
    assert.equal((await chefe('GET', '/api/admin/users/nao-existe')).status, 404);
});

test('3. dar e tirar conquistas (e secretos), com histórico', async (t) => {
    const { db, chefe, leitor, ele } = await cenario();
    t.after(() => db.close());
    const url = `/api/admin/users/${ele.id}/achievement`;

    assert.equal((await chefe('POST', url, { achievement: 'serie-completa', unlocked: true })).dados.changed, true);
    assert.equal((await chefe('POST', url, { achievement: 'serie-completa', unlocked: true })).dados.changed, false);
    assert.equal((await chefe('POST', url, { achievement: 'enzo-secreto-42', unlocked: true })).status, 200);
    assert.equal((await chefe('POST', url, { achievement: 'enzo-secreto-100', unlocked: true })).status, 400);
    assert.equal((await chefe('POST', url, { achievement: 'inventada', unlocked: true })).status, 400);
    assert.equal((await chefe('POST', url, { achievement: 'macarronada', unlocked: 'sim' })).status, 400);

    let sync = await leitor('GET', '/api/user/sync');
    assert.deepEqual(sync.dados.achievements.sort(), ['enzo-secreto-42', 'serie-completa']);

    assert.equal((await chefe('POST', url, { achievement: 'serie-completa', unlocked: false })).dados.changed, true);
    sync = await leitor('GET', '/api/user/sync');
    assert.deepEqual(sync.dados.achievements, ['enzo-secreto-42']);

    const log = await chefe('GET', '/api/admin/log');
    assert.deepEqual(log.dados.log.map((l) => l.acao).sort(), ['grant', 'grant', 'revoke']);
    assert.ok(log.dados.log.every((l) => l.alvoNome && l.admin.startsWith('Henrique')));

    // Leitor comum não consegue usar a rota.
    assert.equal((await leitor('POST', url, { achievement: 'macarronada', unlocked: true })).status, 404);
});

test('4. banir derruba a sessão e some do ranking; não dá para banir a si mesmo', async (t) => {
    const { db, chefe, leitor, eu, ele } = await cenario();
    t.after(() => db.close());

    assert.equal((await chefe('POST', `/api/admin/users/${eu.id}/role`, { role: 'banned' })).status, 400);
    assert.equal((await chefe('POST', `/api/admin/users/${ele.id}/role`, { role: 'admin' })).status, 400);
    assert.equal((await chefe('POST', `/api/admin/users/${ele.id}/role`, { role: 'banned' })).status, 200);
    assert.equal((await leitor('GET', '/api/auth/me')).dados.loggedIn, false);
    const leitores = await chefe('GET', '/api/readers');
    assert.ok(!leitores.dados.readers.some((l) => l.id === ele.id));

    assert.equal((await chefe('POST', `/api/admin/users/${ele.id}/role`, { role: 'player' })).status, 200);
    await entrar(leitor, 'leitor', 'Zé Leitor');
    assert.equal((await leitor('GET', '/api/auth/me')).dados.loggedIn, true);
});

test('5. outro admin não pode ser banido', async (t) => {
    const { db, chefe, navegador } = await cenario();
    t.after(() => db.close());
    const outro = await entrar(navegador(), 'outro-admin', 'Outra Pessoa');
    assert.equal((await chefe('POST', `/api/admin/users/${outro.id}/role`, { role: 'banned' })).status, 400);
});

test('6. kick e fala', async (t) => {
    const { db, chefe, leitor, eu, ele } = await cenario();
    t.after(() => db.close());

    assert.equal((await chefe('POST', `/api/admin/users/${eu.id}/kick`, {})).status, 400);
    const kick = await chefe('POST', `/api/admin/users/${ele.id}/kick`, {});
    assert.equal(kick.dados.sessoes, 1);
    assert.equal((await leitor('GET', '/api/auth/me')).dados.loggedIn, false);

    const fala = await chefe('POST', `/api/admin/users/${ele.id}/fala`, { fala: '  oi   ' });
    assert.equal(fala.dados.fala, 'oi');
    assert.equal((await chefe('POST', `/api/admin/users/${ele.id}/fala`, { fala: 'veja www.x.com' })).status, 400);
    assert.equal((await chefe('GET', `/api/readers/${ele.id}`)).dados.fala, 'oi');
});

test('7. partidas: tirar do ranking, devolver e apagar', async (t) => {
    const { db, relogio, chefe, leitor } = await cenario();
    t.after(() => db.close());

    const { dados: { runToken } } = await leitor('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 60_000;
    assert.equal((await leitor('POST', '/api/games/session/submit', { runToken, score: 5 })).status, 200);

    const [partida] = (await chefe('GET', '/api/admin/scores?game=flappy-enzo')).dados.scores;
    assert.equal(partida.score, 5);
    assert.equal((await chefe('GET', '/api/admin/scores?game=xadrez')).status, 400);

    // Relógio anda entre as ações: o histórico sai na ordem certa.
    await chefe('POST', `/api/admin/scores/${partida.id}/verify`, { verified: false });
    relogio.agora += 1000;
    assert.equal((await chefe('GET', '/api/games/leaderboard/flappy-enzo')).dados.top.length, 0);
    await chefe('POST', `/api/admin/scores/${partida.id}/verify`, { verified: true });
    relogio.agora += 1000;
    assert.equal((await chefe('GET', '/api/games/leaderboard/flappy-enzo')).dados.top.length, 1);

    assert.equal((await chefe('POST', `/api/admin/scores/${partida.id}/delete`, {})).status, 200);
    assert.equal((await chefe('POST', `/api/admin/scores/${partida.id}/delete`, {})).status, 404);
    assert.equal((await chefe('GET', '/api/games/leaderboard/flappy-enzo')).dados.top.length, 0);

    const overview = await chefe('GET', '/api/admin/overview');
    assert.equal(overview.dados.numeros.contas, 2);
    assert.deepEqual(overview.dados.log.map((l) => l.acao), ['rm-score', 'score-on', 'score-off']);
});

test('8. POST de admin exige mesma origem (CSRF)', async (t) => {
    const { db, chefe, ele } = await cenario();
    t.after(() => db.close());
    // O navegador de teste sempre manda origin localhost; uma chamada sem JSON falha.
    const res = await chefe('POST', `/api/admin/users/${ele.id}/kick`, undefined);
    assert.equal(res.status, 415);
});
