// ============================================================================
// Testes da API (login, sessão, recordes, ranking, progresso) com banco na memória.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40) };

/** API nova com banco vazio, Google falso e relógio controlado. */
function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    // Credencial falsa: "google:<sub>:<nome>"; qualquer outra coisa é inválida.
    const verificarGoogle = async (credencial) => {
        const [prefixo, sub, nome] = credencial.split(':');
        if (prefixo !== 'google') throw new Error('assinatura inválida');
        return { sub, name: nome, email: `${sub}@exemplo.com`, picture: 'https://exemplo.com/a.png' };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => relogio.agora });
    /** Um "navegador": guarda o cookie entre chamadas. */
    function navegador() {
        let cookie = '';
        return async function chamar(metodo, caminho, corpo, headers = {}) {
            const h = { ...headers };
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] ??= 'application/json'; h.origin ??= 'http://localhost'; }
            const resposta = await api(new Request(`http://localhost${caminho}`, {
                method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo),
            }));
            const setCookie = resposta.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            return { status: resposta.status, dados: await resposta.json(), setCookie };
        };
    }
    return { api, db, relogio, navegador };
}

const entrar = (chamar, sub = 'u1', nome = 'Henrique Macedo') =>
    chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}-${'x'.repeat(20)}` });

// ---------------------------------------------------------------------- testes

test('1. config e deslogado', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const config = await chamar('GET', '/api/auth/config');
    assert.equal(config.status, 200);
    assert.equal(config.dados.enabled, true);
    assert.equal(config.dados.clientId, ENV.GOOGLE_CLIENT_ID);

    const me = await chamar('GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.deepEqual(me.dados, { loggedIn: false });
});

test('2. login cria sessão com cookie seguro', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const res = await entrar(chamar, 'u1', 'Henrique Macedo');
    assert.equal(res.status, 200);
    assert.equal(res.dados.loggedIn, true);
    assert.equal(res.dados.firstLogin, true);

    assert.ok(res.setCookie.length > 0, 'cookie enviado');
    const cookieHeader = res.setCookie[0];
    assert.match(cookieHeader, /sid=/);
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    assert.match(cookieHeader, /Path=\//);

    const textoDados = JSON.stringify(res.dados);
    assert.equal(textoDados.includes('@exemplo.com'), false, 'não expõe e-mail');
    assert.equal(res.dados.email, undefined);
    assert.equal(res.dados.sub, undefined);
    assert.equal(res.dados.google_id, undefined);

    const me = await chamar('GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.dados.loggedIn, true);
    assert.equal(me.dados.user.firstName, 'Henrique');

    relogio.agora += 1000;
    const res2 = await entrar(chamar, 'u1', 'Henrique Macedo');
    assert.equal(res2.status, 200);
    assert.equal(res2.dados.firstLogin, false);
});

test('3. credencial inválida', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const inv = await chamar('POST', '/api/auth/google', { credential: 'falso:' + 'x'.repeat(30) });
    assert.equal(inv.status, 401);

    const curta = await chamar('POST', '/api/auth/google', { credential: 'abc' });
    assert.equal(curta.status, 400);

    const vazia = await chamar('POST', '/api/auth/google', {});
    assert.equal(vazia.status, 400);
});

test('4. sem configuração não há login', async (t) => {
    const { db, relogio } = montar();
    t.after(() => db.close());

    const apiSem = createApi({ db, env: {}, agora: () => relogio.agora });
    const resConfig = await apiSem(new Request('http://localhost/api/auth/config'));
    assert.equal(resConfig.status, 200);
    assert.equal((await resConfig.json()).enabled, false);

    const resLogin = await apiSem(new Request('http://localhost/api/auth/google', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ credential: 'x'.repeat(30) }),
    }));
    assert.equal(resLogin.status, 503);

    const apiCurto = createApi({
        db,
        env: { GOOGLE_CLIENT_ID: 'x', SESSION_SECRET: 'curto' },
        agora: () => relogio.agora,
    });
    const resCurto = await apiCurto(new Request('http://localhost/api/auth/config'));
    assert.equal(resCurto.status, 200);
    assert.equal((await resCurto.json()).enabled, false);
});

test('5. logout', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const login = await entrar(chamar);
    assert.equal(login.status, 200);
    const cookieAntigo = login.setCookie[0].split(';')[0];

    const logout = await chamar('POST', '/api/auth/logout', {});
    assert.equal(logout.status, 200);
    assert.equal(logout.dados.loggedIn, false);
    assert.ok(logout.setCookie[0].includes('Max-Age=0'));

    const me = await chamar('GET', '/api/auth/me', undefined, { cookie: cookieAntigo });
    assert.equal(me.status, 200);
    assert.deepEqual(me.dados, { loggedIn: false });
});

test('6. sessão vence em 30 dias', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);
    const me1 = await chamar('GET', '/api/auth/me');
    assert.equal(me1.dados.loggedIn, true);

    relogio.agora += 31 * 24 * 60 * 60 * 1000;
    const me2 = await chamar('GET', '/api/auth/me');
    assert.equal(me2.status, 200);
    assert.deepEqual(me2.dados, { loggedIn: false });
});

test('7. CSRF', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);

    const resOrigem = await chamar('POST', '/api/auth/logout', {}, { origin: 'https://site-malvado.com' });
    assert.equal(resOrigem.status, 403);

    const resTipo = await chamar('POST', '/api/auth/logout', {}, { 'content-type': 'text/plain' });
    assert.equal(resTipo.status, 415);

    const resSite = await chamar('POST', '/api/auth/logout', {}, { 'sec-fetch-site': 'cross-site' });
    assert.equal(resSite.status, 403);
});

test('8. rotas protegidas pedem login', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const start = await chamar('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    assert.equal(start.status, 401);

    const sync = await chamar('GET', '/api/user/sync');
    assert.equal(sync.status, 401);

    const prog = await chamar('POST', '/api/reader/progress', { comicId: 'capitulo-1', chapterId: '1' });
    assert.equal(prog.status, 401);
});

test('9. rota inexistente e método errado', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const nada = await chamar('GET', '/api/nada');
    assert.equal(nada.status, 404);

    const del = await chamar('DELETE', '/api/auth/me');
    assert.equal(del.status, 405);

    const jogoInv = await chamar('GET', '/api/games/leaderboard/jogo-que-nao-existe');
    assert.equal(jogoInv.status, 400);
});

test('10. partida válida entra no ranking', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar, 'u1', 'Henrique Macedo');
    const start = await chamar('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    assert.equal(start.status, 200);
    const runToken = start.dados.runToken;
    assert.ok(runToken);

    relogio.agora += 30_000;
    const sub = await chamar('POST', '/api/games/session/submit', { runToken, score: 15 });
    assert.equal(sub.status, 200);
    assert.equal(sub.dados.accepted, true);
    assert.equal(sub.dados.newRecord, true);
    assert.equal(sub.dados.position, 1);

    const lb = await chamar('GET', '/api/games/leaderboard/flappy-enzo');
    assert.equal(lb.status, 200);
    assert.equal(lb.dados.top[0].score, 15);
    assert.equal(lb.dados.top[0].isMe, true);
    assert.equal(lb.dados.me.position, 1);
    assert.equal(lb.dados.top[0].name, 'Henrique M.');
});

test('11. anti-cheat recusa pontuação impossível', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);
    const start = await chamar('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    const runToken = start.dados.runToken;

    relogio.agora += 30_000;
    const sub = await chamar('POST', '/api/games/session/submit', { runToken, score: 999 });
    assert.equal(sub.status, 422);
    assert.equal(sub.dados.accepted, false);

    const lb = await chamar('GET', '/api/games/leaderboard/flappy-enzo');
    assert.equal(lb.dados.top.length, 0);
});

test('12. token de uso único', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();
    const chamarB = navegador();

    await entrar(chamarA, 'u1', 'Usuario A');
    await entrar(chamarB, 'u2', 'Usuario B');

    const start = await chamarA('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    const runToken = start.dados.runToken;

    relogio.agora += 10_000;
    const sub1 = await chamarA('POST', '/api/games/session/submit', { runToken, score: 3 });
    assert.equal(sub1.status, 200);

    const sub2 = await chamarA('POST', '/api/games/session/submit', { runToken, score: 3 });
    assert.equal(sub2.status, 409);

    const subFake = await chamarA('POST', '/api/games/session/submit', { runToken: 'token-inventado', score: 3 });
    assert.equal(subFake.status, 409);

    const start2 = await chamarA('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    const runToken2 = start2.dados.runToken;

    const subOutro = await chamarB('POST', '/api/games/session/submit', { runToken: runToken2, score: 3 });
    assert.equal(subOutro.status, 409);
});

test('13. partida expira', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);
    const start = await chamar('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    const runToken = start.dados.runToken;

    relogio.agora += 4 * 60 * 60 * 1000;
    const sub = await chamar('POST', '/api/games/session/submit', { runToken, score: 1 });
    assert.ok([409, 410].includes(sub.status), `esperava 409 ou 410, veio ${sub.status}`);
});

test('14. ranking: melhor de cada jogador e ordem', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();
    const chamarB = navegador();
    const chamarAnon = navegador();

    await entrar(chamarA, 'uA', 'Alice Silva');
    await entrar(chamarB, 'uB', 'Bruno Souza');

    // A faz 10
    const startA1 = await chamarA('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 25_000;
    await chamarA('POST', '/api/games/session/submit', { runToken: startA1.dados.runToken, score: 10 });

    // A faz 5
    const startA2 = await chamarA('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 15_000;
    await chamarA('POST', '/api/games/session/submit', { runToken: startA2.dados.runToken, score: 5 });

    // B faz 12
    const startB1 = await chamarB('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 30_000;
    await chamarB('POST', '/api/games/session/submit', { runToken: startB1.dados.runToken, score: 12 });

    const lbA = await chamarA('GET', '/api/games/leaderboard/flappy-enzo');
    assert.equal(lbA.status, 200);
    assert.equal(lbA.dados.top.length, 2);
    assert.equal(lbA.dados.top[0].score, 12);
    assert.equal(lbA.dados.top[1].score, 10);
    assert.equal(lbA.dados.me.position, 2);

    const lbAnon = await chamarAnon('GET', '/api/games/leaderboard/flappy-enzo');
    assert.equal(lbAnon.status, 200);
    assert.equal(lbAnon.dados.me, null);
    assert.equal(lbAnon.dados.top.length, 2);
});

test('15. convidado migra recordes sem entrar no ranking', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);
    const mig = await chamar('POST', '/api/user/sync-guest', {
        records: { 'flappy-enzo': 40, 'ronda-noturna': 7, 'jogo-falso': 5 },
        achievements: ['macarronada', 'conquista-falsa'],
        lastRead: { comicId: 'capitulo-3', chapterId: 'capitulo-3-unico' },
    });
    assert.equal(mig.status, 200);
    assert.equal(mig.dados.records['flappy-enzo'].best, 40);
    assert.equal(mig.dados.records['flappy-enzo'].verifiedBest, 0);
    assert.equal(mig.dados.records['jogo-falso'], undefined);
    assert.deepEqual(mig.dados.achievements, ['macarronada']);
    assert.equal(mig.dados.lastRead.comicId, 'capitulo-3');

    const lb = await chamar('GET', '/api/games/leaderboard/flappy-enzo');
    assert.equal(lb.dados.top.length, 0);
});

test('16. progresso do leitor', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);
    const prog = await chamar('POST', '/api/reader/progress', {
        comicId: 'capitulo-4', chapterId: 'capitulo-4-unico', page: 7, zoom: 1.25,
    });
    assert.equal(prog.status, 200);
    assert.equal(prog.dados.saved, true);

    const sync = await chamar('GET', '/api/user/sync');
    assert.equal(sync.status, 200);
    assert.equal(sync.dados.lastRead.page, 7);
    assert.equal(sync.dados.lastRead.zoom, 1.25);

    assert.equal((await chamar('POST', '/api/reader/progress', { comicId: '../x', chapterId: '1', page: 1, zoom: 1 })).status, 400);
    assert.equal((await chamar('POST', '/api/reader/progress', { comicId: 'capitulo-1', chapterId: '1', page: -1, zoom: 1 })).status, 400);
    assert.equal((await chamar('POST', '/api/reader/progress', { comicId: 'capitulo-1', chapterId: '1', page: 1.5, zoom: 1 })).status, 400);
    assert.equal((await chamar('POST', '/api/reader/progress', { comicId: 'capitulo-1', chapterId: '1', page: 1, zoom: 9 })).status, 400);
});

test('17. conquistas', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar);
    const a1 = await chamar('POST', '/api/user/achievement', { id: 'cabo-coco' });
    assert.equal(a1.status, 200);
    assert.ok(a1.dados.achievements.includes('cabo-coco'));

    const a2 = await chamar('POST', '/api/user/achievement', { id: 'cabo-coco' });
    assert.equal(a2.status, 200);
    assert.equal(a2.dados.achievements.length, 1);

    const a3 = await chamar('POST', '/api/user/achievement', { id: 'hack' });
    assert.equal(a3.status, 400);
});

test('18. corpo grande demais', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const grande = await chamar('POST', '/api/auth/google', { credential: 'x'.repeat(20000) });
    assert.equal(grande.status, 413);
});
