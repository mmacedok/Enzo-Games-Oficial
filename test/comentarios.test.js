// ============================================================================
// Testes das Cartas dos Leitores (api/comentarios.js): criar, listar, apagar,
// censurar (a palavra escondida nunca vai para o público) e anti-spam.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const catalogo = require('../data/database.json');

const ENV = {
    GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com',
    SESSION_SECRET: 'x'.repeat(40),
    ADMIN_EMAILS: 'chefe@exemplo.com',
};
const GIBI = catalogo.comics[0].id;
const CAP = catalogo.comics[0].chapters[0].id;
const LISTA = `/api/comments?comic=${GIBI}&chapter=${CAP}`;

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
            const resposta = await api(new Request(`http://localhost${caminho}`, {
                method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo),
            }));
            const setCookie = resposta.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            const texto = await resposta.text();
            return { status: resposta.status, dados: JSON.parse(texto), texto };
        };
    }
    return { db, relogio, navegador };
}

const entrar = async (chamar, sub, nome) =>
    (await chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}-${'x'.repeat(20)}` })).dados.user;

async function cenario() {
    const m = montar();
    const chefe = m.navegador();
    const leitor = m.navegador();
    const outro = m.navegador();
    const visitante = m.navegador();
    await entrar(chefe, 'chefe', 'Henrique Macedo');
    const ele = await entrar(leitor, 'leitor', 'Zé Leitor');
    await entrar(outro, 'outro', 'Ana Souza');
    const escrever = async (chamar, texto) => {
        m.relogio.agora += 60_000;
        return chamar('POST', '/api/comments', { comicId: GIBI, chapterId: CAP, texto });
    };
    return { ...m, chefe, leitor, outro, visitante, ele, escrever };
}

test('1. escrever e listar (mais novos primeiro, público sem e-mail)', async (t) => {
    const { db, leitor, outro, visitante, escrever } = await cenario();
    t.after(() => db.close());

    const r = await escrever(leitor, '  que   final!\n\n\n\nmuito bom  ');
    assert.equal(r.status, 200);
    assert.deepEqual(r.dados.comment.pedacos, [{ t: 'que final!\n\nmuito bom' }]);
    await escrever(outro, 'segunda carta');

    const lista = await visitante('GET', LISTA);
    assert.equal(lista.status, 200);
    assert.equal(lista.dados.total, 2);
    assert.deepEqual(lista.dados.comments.map((c) => c.pedacos[0].t), ['segunda carta', 'que final!\n\nmuito bom']);
    assert.equal(lista.dados.comments[0].autor.name, 'Ana S.');
    assert.equal(lista.dados.admin, false);
    assert.ok(!lista.texto.includes('@exemplo.com'));
    assert.ok(lista.dados.comments.every((c) => c.texto === undefined && !c.podeApagar && !c.isMe));
});

test('2. regras: login, tamanho, links, capítulo inexistente', async (t) => {
    const { db, leitor, visitante, escrever } = await cenario();
    t.after(() => db.close());

    assert.equal((await escrever(visitante, 'oi')).status, 401);
    assert.equal((await escrever(leitor, '   ')).status, 400);
    assert.equal((await escrever(leitor, 'a'.repeat(501))).status, 400);
    assert.equal((await escrever(leitor, 'a'.repeat(500))).status, 200);
    assert.equal((await escrever(leitor, 'olha www.site.com')).status, 400);
    assert.equal((await escrever(leitor, 42)).status, 400);
    const falso = await leitor('POST', '/api/comments', { comicId: GIBI, chapterId: 'nao-existe', texto: 'oi' });
    assert.equal(falso.status, 404);
    assert.equal((await visitante('GET', `/api/comments?comic=${GIBI}&chapter=NAO VALE`)).status, 400);
});

test('3. anti-spam: 30 s entre cartas e 30 por dia', async (t) => {
    const { db, relogio, leitor } = await cenario();
    t.after(() => db.close());
    const mandar = (texto) => leitor('POST', '/api/comments', { comicId: GIBI, chapterId: CAP, texto });

    assert.equal((await mandar('um')).status, 200);
    assert.equal((await mandar('dois')).status, 429);
    relogio.agora += 31_000;
    assert.equal((await mandar('dois')).status, 200);
    for (let i = 0; i < 28; i++) { relogio.agora += 31_000; assert.equal((await mandar(`n${i}`)).status, 200); }
    relogio.agora += 31_000;
    assert.equal((await mandar('a 31ª')).status, 429);
    relogio.agora += 24 * 60 * 60 * 1000;
    assert.equal((await mandar('dia seguinte')).status, 200);
});

test('4. apagar: autor e admin sim, outro leitor não', async (t) => {
    const { db, chefe, leitor, outro, visitante, escrever } = await cenario();
    t.after(() => db.close());

    const a = (await escrever(leitor, 'minha carta')).dados.comment;
    const b = (await escrever(leitor, 'outra carta')).dados.comment;
    assert.equal(a.isMe, true);
    assert.equal(a.podeApagar, true);

    assert.equal((await outro('POST', `/api/comments/${a.id}/delete`, {})).status, 403);
    assert.equal((await visitante('POST', `/api/comments/${a.id}/delete`, {})).status, 401);
    assert.equal((await leitor('POST', `/api/comments/${a.id}/delete`, {})).status, 200);
    assert.equal((await leitor('POST', `/api/comments/${a.id}/delete`, {})).status, 404);

    const vistoPeloChefe = await chefe('GET', LISTA);
    assert.equal(vistoPeloChefe.dados.admin, true);
    assert.ok(vistoPeloChefe.dados.comments.every((c) => c.podeApagar));
    assert.equal((await chefe('POST', `/api/comments/${b.id}/delete`, {})).status, 200);
    assert.equal((await visitante('GET', LISTA)).dados.total, 0);

    const log = await chefe('GET', '/api/admin/log');
    assert.deepEqual(log.dados.log.map((l) => l.acao), ['comment-rm']);   // o autor apagando o próprio não entra
});

test('5. censura: tarja no público, original só para o admin', async (t) => {
    const { db, chefe, leitor, visitante, escrever } = await cenario();
    t.after(() => db.close());

    const texto = 'o vilão é o Degustador, que spoiler';
    const c = (await escrever(leitor, texto)).dados.comment;
    const inicio = texto.indexOf('Degustador');
    const url = `/api/admin/comments/${c.id}/censor`;

    // Só admin censura (para os outros a rota não existe).
    assert.equal((await leitor('POST', url, { trechos: [[inicio, inicio + 10]] })).status, 404);

    const r = await chefe('POST', url, { trechos: [[inicio + 4, inicio + 10], [inicio, inicio + 5]] });
    assert.equal(r.status, 200);
    assert.deepEqual(r.dados.comment.trechos, [[inicio, inicio + 10]]);   // juntou os dois

    const publico = await visitante('GET', LISTA);
    assert.ok(!publico.texto.includes('Degustador'), 'a palavra censurada vazou para o público');
    assert.deepEqual(publico.dados.comments[0].pedacos, [{ t: 'o vilão é o ' }, { tarja: 10 }, { t: ', que spoiler' }]);
    assert.equal(publico.dados.comments[0].censurado, true);
    assert.ok(!(await leitor('GET', LISTA)).texto.includes('Degustador'), 'nem o autor vê o original');

    const doChefe = await chefe('GET', LISTA);
    assert.equal(doChefe.dados.comments[0].texto, texto);

    // Trechos inválidos.
    for (const trechos of [[[0, 999]], [[5, 5]], [[-1, 2]], [['a', 2]], 'x', Array.from({ length: 51 }, (_, i) => [i, i + 1])]) {
        assert.equal((await chefe('POST', url, { trechos })).status, 400, JSON.stringify(trechos).slice(0, 40));
    }
    // Lista vazia tira a tarja.
    await chefe('POST', url, { trechos: [] });
    assert.ok((await visitante('GET', LISTA)).texto.includes('Degustador'));

    const log = await chefe('GET', '/api/admin/log');
    assert.deepEqual(log.dados.log.map((l) => l.acao).sort(), ['comment-censor', 'comment-censor']);
});

test('6. banir o autor esconde as cartas dele; desbanir traz de volta', async (t) => {
    const { db, chefe, leitor, outro, visitante, ele, escrever } = await cenario();
    t.after(() => db.close());

    await escrever(leitor, 'carta do zé');
    await escrever(outro, 'carta da ana');
    assert.equal((await chefe('POST', `/api/admin/users/${ele.id}/role`, { role: 'banned' })).status, 200);
    const lista = await visitante('GET', LISTA);
    assert.equal(lista.dados.total, 1);
    assert.equal(lista.dados.comments[0].pedacos[0].t, 'carta da ana');
    await chefe('POST', `/api/admin/users/${ele.id}/role`, { role: 'player' });
    assert.equal((await visitante('GET', LISTA)).dados.total, 2);
});

test('7. paginação com "antes"', async (t) => {
    const { db, relogio, leitor, visitante, escrever } = await cenario();
    t.after(() => db.close());

    // Uma carta por hora: não esbarra no limite de 30 por dia.
    for (let i = 0; i < 31; i++) { relogio.agora += 60 * 60 * 1000; await escrever(leitor, `carta ${i}`); }
    const p1 = await visitante('GET', LISTA);
    assert.equal(p1.dados.comments.length, 30);
    assert.equal(p1.dados.maisAntigos, true);
    const ultimo = p1.dados.comments[29].em;
    const p2 = await visitante('GET', `${LISTA}&antes=${ultimo}`);
    assert.deepEqual(p2.dados.comments.map((c) => c.pedacos[0].t), ['carta 0']);
    assert.equal(p2.dados.maisAntigos, false);
});
