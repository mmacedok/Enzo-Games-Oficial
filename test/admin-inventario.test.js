// ============================================================================
// Testes do inventário pelo admin: cartas, pacotes e conquistas em lote de qualquer conta.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const Baralho = require('../js/baralho-dados.js');
const Conquistas = require('../js/conquistas.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };

function montar() {
    const db = createLocalDb(null);
    const verificarGoogle = async (credencial) => {
        const [, sub, nome] = credencial.split(':');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => 1_700_000_000_000 });
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
    return { navegador };
}
const entrar = (c, sub) => c('POST', '/api/auth/google', { credential: `google:${sub}:${sub}-nome-completo-xxxxxxxx` });

async function cenario() {
    const { navegador } = montar();
    const chefe = navegador();
    const ana = navegador();
    await entrar(chefe, 'chefe');
    const a = (await entrar(ana, 'ana')).dados.user;
    return { chefe, ana, id: a.id };
}

test('I1: cartas: soma, tira, define, limpa e dá todas; só admin; carta inválida 400', async () => {
    const { chefe, ana, id } = await cenario();
    const c = Baralho.CARTAS[0].id;
    const rota = `/api/admin/users/${id}/cartas`;
    assert.equal((await ana('POST', rota, { carta: c, delta: 1 })).status, 404);
    assert.equal((await chefe('POST', rota, { carta: 'nao-existe', delta: 1 })).status, 400);
    assert.equal((await chefe('POST', rota, { carta: c })).status, 400);
    assert.equal((await chefe('POST', rota, { carta: c, delta: 0 })).status, 400);

    let e = (await chefe('POST', rota, { carta: c, delta: 3 })).dados;
    assert.equal(e.colecao[c], 3);
    e = (await chefe('POST', rota, { carta: c, delta: -1 })).dados;
    assert.equal(e.colecao[c], 2);
    e = (await chefe('POST', rota, { carta: c, qtd: 7 })).dados;
    assert.equal(e.colecao[c], 7);
    e = (await chefe('POST', rota, { carta: c, delta: -50 })).dados; // passa de zero: tira a carta
    assert.equal(c in e.colecao, false);

    e = (await chefe('POST', rota, { todas: true })).dados;
    assert.equal(e.diferentes, Baralho.CARTAS.length);
    await chefe('POST', rota, { carta: c, delta: 4 });
    e = (await chefe('POST', rota, { todas: true })).dados; // quem já tem não muda
    assert.equal(e.colecao[c], 5);
    e = (await chefe('POST', rota, { limpar: true })).dados;
    assert.equal(e.diferentes, 0);

    const log = (await chefe('GET', '/api/admin/log')).dados.log;
    assert.ok(log.some((l) => l.acao === 'carta' && l.detalhe.includes('0→3')));
    // a conta vê a mesma coleção pelo próprio Baralho
    await chefe('POST', rota, { carta: c, qtd: 2 });
    assert.equal((await ana('GET', '/api/baralho')).dados.colecao[c], 2);
});

test('I2: pacotes fechados: remove um pelo id ou todos; aberto ou de outra conta não some', async () => {
    const { chefe, ana, id } = await cenario();
    const tipo = Baralho.PACOTES[0].id;
    await chefe('POST', `/api/admin/users/${id}/baralho`, { pacote: tipo, quantidade: 3 });
    let e = (await ana('GET', '/api/baralho')).dados;
    const antes = e.pacotes.length;
    assert.ok(antes >= 3);
    const rota = `/api/admin/users/${id}/pacotes/remover`;
    assert.equal((await ana('POST', rota, { todos: true })).status, 404);
    assert.equal((await chefe('POST', rota, {})).status, 400);
    assert.equal((await chefe('POST', rota, { id: 'nao-existe' })).status, 404);
    e = (await chefe('POST', rota, { id: e.pacotes[0].id })).dados;
    assert.equal(e.pacotes.length, antes - 1);
    e = (await chefe('POST', rota, { todos: true })).dados;
    assert.equal(e.pacotes.length, 0);
    assert.equal((await chefe('POST', rota, { todos: true })).status, 404); // não há mais nenhum
});

test('I3: conquistas em lote: dá e tira conquistas, secretos ou tudo', async () => {
    const { chefe, id } = await cenario();
    const rota = `/api/admin/users/${id}/achievements`;
    assert.equal((await chefe('POST', rota, { grupo: 'nada', unlocked: true })).status, 400);
    assert.equal((await chefe('POST', rota, { grupo: 'todos' })).status, 400);
    const total = (await chefe('GET', `/api/admin/users/${id}`)).dados.achievements.length;
    assert.equal(total, 0);
    let r = (await chefe('POST', rota, { grupo: 'conquistas', unlocked: true })).dados;
    assert.equal(r.changed, Conquistas.LISTA.length);
    r = (await chefe('POST', rota, { grupo: 'todos', unlocked: true })).dados; // só falta os secretos
    assert.equal(r.changed, Conquistas.SECRETOS);
    assert.equal((await chefe('GET', `/api/admin/users/${id}`)).dados.achievements.length, Conquistas.LISTA.length + Conquistas.SECRETOS);
    r = (await chefe('POST', rota, { grupo: 'secretos', unlocked: false })).dados;
    assert.equal(r.changed, Conquistas.SECRETOS);
    r = (await chefe('POST', rota, { grupo: 'todos', unlocked: false })).dados;
    assert.equal(r.changed, Conquistas.LISTA.length);
    assert.equal((await chefe('GET', `/api/admin/users/${id}`)).dados.achievements.length, 0);
});
