// ============================================================================
// Testes dos Leitores do site e fala editável da Ficha do Leitor.
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

test('1. fala salva e limpa', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    await entrar(chamar, 'u1', 'Henrique Macedo');

    const res = await chamar('POST', '/api/user/profile', { fala: '  Bora   ler\u202e mais uma?  ' });
    assert.equal(res.status, 200);
    assert.equal(res.dados.fala, 'Bora ler mais uma?');

    const me = await chamar('GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.dados.user.fala, 'Bora ler mais uma?');
});

test('2. fala recusada', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamarLogado = navegador();
    const chamarAnon = navegador();

    // Sem login -> 401
    const semLogin = await chamarAnon('POST', '/api/user/profile', { fala: 'oi' });
    assert.equal(semLogin.status, 401);

    await entrar(chamarLogado);

    // 81 letras -> 400
    const res81 = await chamarLogado('POST', '/api/user/profile', { fala: 'a'.repeat(81) });
    assert.equal(res81.status, 400);

    // com www.site.com -> 400
    const resWww = await chamarLogado('POST', '/api/user/profile', { fala: 'veja www.site.com' });
    assert.equal(resWww.status, 400);

    // com https://x -> 400
    const resHttps = await chamarLogado('POST', '/api/user/profile', { fala: 'https://x' });
    assert.equal(resHttps.status, 400);

    // { fala: 42 } -> 400
    const resNum = await chamarLogado('POST', '/api/user/profile', { fala: 42 });
    assert.equal(resNum.status, 400);

    // { fala: '' } -> 200 com fala: null
    const resVazia = await chamarLogado('POST', '/api/user/profile', { fala: '' });
    assert.equal(resVazia.status, 200);
    assert.equal(resVazia.dados.fala, null);

    // { fala: null } -> 200 com fala: null
    const resNull = await chamarLogado('POST', '/api/user/profile', { fala: null });
    assert.equal(resNull.status, 200);
    assert.equal(resNull.dados.fala, null);

    // com 80 letras exatas -> 200
    const res80 = await chamarLogado('POST', '/api/user/profile', { fala: 'a'.repeat(80) });
    assert.equal(res80.status, 200);
    assert.equal(res80.dados.fala, 'a'.repeat(80));
});

test('3. lista de leitores é pública e sem dados privados', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();
    const chamarB = navegador();
    const chamarAnon = navegador();

    await entrar(chamarA, 'u1', 'Henrique Macedo');
    relogio.agora += 1000;
    await entrar(chamarB, 'u2', 'Ana Paula Souza');

    const res = await chamarAnon('GET', '/api/readers');
    assert.equal(res.status, 200);
    assert.equal(res.dados.readers.length, 2);

    const leitorA = res.dados.readers.find((r) => r.name === 'Henrique M.');
    const leitorB = res.dados.readers.find((r) => r.name === 'Ana S.');
    assert.ok(leitorA, 'leitor A presente');
    assert.ok(leitorB, 'leitor B presente');

    for (const r of [leitorA, leitorB]) {
        assert.ok(r.id, 'possui id');
        assert.ok(r.name, 'possui name');
        assert.ok(typeof r.numero === 'number', 'possui numero');
        assert.ok(typeof r.conquistas === 'number', 'possui conquistas');
        assert.ok(typeof r.secretos === 'number', 'possui secretos');
        assert.equal(r.fala, null);
        assert.equal(r.isMe, false);
    }

    assert.equal(leitorA.numero, 1, 'primeiro a entrar tem número 1');
    assert.equal(leitorB.numero, 2, 'segundo a entrar tem número 2');

    const texto = JSON.stringify(res.dados);
    assert.equal(texto.includes('@exemplo.com'), false, 'não expõe e-mail');
    assert.equal(texto.includes('google'), false, 'não expõe google_id');
    assert.equal(texto.includes('Macedo'), false, 'não expõe sobrenome completo');
    assert.equal(texto.includes('Souza'), false, 'não expõe sobrenome completo');
});

test('4. contagem de conquistas', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();

    await entrar(chamarA, 'uA', 'Alice Silva');
    await chamarA('POST', '/api/user/achievement', { id: 'macarronada' });
    await chamarA('POST', '/api/user/achievement', { id: 'enzo-secreto-3' });

    const res = await chamarA('GET', '/api/readers');
    assert.equal(res.status, 200);
    const leitorA = res.dados.readers.find((r) => r.name === 'Alice S.');
    assert.ok(leitorA);
    assert.equal(leitorA.conquistas, 1);
    assert.equal(leitorA.secretos, 1);
    assert.equal(leitorA.isMe, true);
});

test('5. ficha pública', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();
    const chamarAnon = navegador();

    const loginA = await entrar(chamarA, 'uA', 'Alice Silva');
    const idA = loginA.dados.user.id;

    await chamarA('POST', '/api/user/profile', { fala: 'Lendo gibi!' });
    await chamarA('POST', '/api/user/achievement', { id: 'macarronada' });
    await chamarA('POST', '/api/user/achievement', { id: 'enzo-secreto-3' });

    // Recorde de convidado não verificado
    const syncGuest = await chamarA('POST', '/api/user/sync-guest', { records: { 'flappy-enzo': 40 } });
    assert.equal(syncGuest.status, 200);

    // Ficha pública sem login
    const ficha1 = await chamarAnon('GET', `/api/readers/${idA}`);
    assert.equal(ficha1.status, 200);
    assert.equal(ficha1.dados.name, 'Alice S.');
    assert.equal(ficha1.dados.fala, 'Lendo gibi!');
    assert.equal(ficha1.dados.numero, 1);
    assert.deepEqual(ficha1.dados.achievements.sort(), ['enzo-secreto-3', 'macarronada']);
    assert.equal(ficha1.dados.records['flappy-enzo'], undefined);

    // Partida real verificada
    const start = await chamarA('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    assert.equal(start.status, 200);
    relogio.agora += 30_000;
    const submit = await chamarA('POST', '/api/games/session/submit', { runToken: start.dados.runToken, score: 10 });
    assert.equal(submit.status, 200);

    // Recorde verificado aparece na ficha pública
    const ficha2 = await chamarAnon('GET', `/api/readers/${idA}`);
    assert.equal(ficha2.status, 200);
    assert.equal(ficha2.dados.records['flappy-enzo'], 10);
});

test('6. ids ruins', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chamar = navegador();

    const resInvalido = await chamar('GET', '/api/readers/nao-e-uuid');
    assert.equal(resInvalido.status, 404);

    const resInexistente = await chamar('GET', '/api/readers/00000000-0000-4000-8000-000000000000');
    assert.equal(resInexistente.status, 404);
});

test('7. banido some', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();
    const chamarB = navegador();
    const chamarAnon = navegador();

    await entrar(chamarA, 'u1', 'Alice Silva');
    relogio.agora += 1000;
    const loginB = await entrar(chamarB, 'u2', 'Bruno Souza');
    const idB = loginB.dados.user.id;

    const listaAntes = await chamarAnon('GET', '/api/readers');
    assert.equal(listaAntes.status, 200);
    assert.ok(listaAntes.dados.readers.some((r) => r.id === idB));

    const fichaAntes = await chamarAnon('GET', `/api/readers/${idB}`);
    assert.equal(fichaAntes.status, 200);

    // Marca B como banido
    await db.query("UPDATE users SET role = 'banned' WHERE google_id = 'u2'");

    const listaDepois = await chamarAnon('GET', '/api/readers');
    assert.equal(listaDepois.status, 200);
    assert.equal(listaDepois.dados.readers.some((r) => r.id === idB), false);

    const fichaDepois = await chamarAnon('GET', `/api/readers/${idB}`);
    assert.equal(fichaDepois.status, 404);
});

test('8. paginação', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());

    for (let i = 1; i <= 61; i++) {
        const chamar = navegador();
        relogio.agora += 1000;
        await entrar(chamar, `u${i}`, `Leitor ${i}`);
    }

    const chamarAnon = navegador();
    const p0 = await chamarAnon('GET', '/api/readers');
    assert.equal(p0.status, 200);
    assert.equal(p0.dados.readers.length, 60);
    assert.equal(p0.dados.maisPaginas, true);
    assert.equal(p0.dados.pagina, 0);

    const p1 = await chamarAnon('GET', '/api/readers?pagina=1');
    assert.equal(p1.status, 200);
    assert.equal(p1.dados.readers.length, 1);
    assert.equal(p1.dados.maisPaginas, false);
    assert.equal(p1.dados.pagina, 1);
});

test('9. placar traz o id do leitor', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chamarA = navegador();
    const chamarAnon = navegador();

    const loginA = await entrar(chamarA, 'uA', 'Alice Silva');
    const idA = loginA.dados.user.id;

    const start = await chamarA('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    assert.equal(start.status, 200);
    relogio.agora += 30_000;
    const submit = await chamarA('POST', '/api/games/session/submit', { runToken: start.dados.runToken, score: 10 });
    assert.equal(submit.status, 200);

    const lb = await chamarAnon('GET', '/api/games/leaderboard/flappy-enzo');
    assert.equal(lb.status, 200);
    assert.ok(lb.dados.top.length > 0);
    assert.equal(lb.dados.top[0].id, idA);

    const readers = await chamarAnon('GET', '/api/readers');
    assert.equal(readers.status, 200);
    assert.equal(readers.dados.readers[0].id, idA);
});
