// ============================================================================
// Testes de regressão do Agente 3 (caça-bugs: backend, segurança e contas).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const { backendDisco } = require('../api/upload.js');

const ENV = {
    GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com',
    SESSION_SECRET: 'x'.repeat(40),
    ADMIN_EMAILS: 'dono@exemplo.com',
};

function montar(extra = {}) {
    let agora = 1_700_000_000_000;
    const db = createLocalDb(null);
    const verificarGoogle = async (c) => {
        const [, sub, nome] = c.split(':');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => agora, ...extra });
    const navegador = () => {
        let cookie = '';
        return async (metodo, caminho, corpo, headers = {}) => {
            const h = { ...headers };
            if (cookie) h.cookie = cookie;
            let body;
            if (Buffer.isBuffer(corpo)) {
                body = corpo;
                h['x-enzo-upload'] = h['x-enzo-upload'] ?? '1';
            } else if (corpo !== undefined) {
                h['content-type'] = 'application/json';
                h.origin = 'http://localhost';
                body = JSON.stringify(corpo);
            }
            const r = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body }));
            const sc = r.headers.getSetCookie();
            if (sc.length) cookie = sc[sc.length - 1].split(';')[0];
            return { status: r.status, dados: await r.json() };
        };
    };
    const entrar = (chamar, sub, nome = sub) =>
        chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}-${'x'.repeat(20)}` });
    return { db, api, navegador, entrar, passar: (ms) => { agora += ms; } };
}

test('leituras: busca com curingas (% e _) escapa corretamente sem retornar falsos positivos', async (t) => {
    const { db, navegador, entrar } = montar();
    t.after(() => db.close());
    const dono = navegador();
    const u1 = navegador();
    const u2 = navegador();
    await entrar(dono, 'dono', 'Dono');
    await entrar(u1, 'u1', 'ana_silva');
    await entrar(u2, 'u2', 'anaxsilva');

    await u1('POST', '/api/reader/view', { comicId: 'degustador', chapterId: '1' });
    await u2('POST', '/api/reader/view', { comicId: 'degustador', chapterId: '1' });

    const porUnderline = await dono('GET', '/api/admin/leituras?q=ana_silva');
    assert.equal(porUnderline.status, 200);
    assert.equal(porUnderline.dados.leitores.length, 1);
    assert.ok(porUnderline.dados.leitores[0].name.startsWith('ana_silva'));

    const porPorcento = await dono('GET', '/api/admin/leituras?q=%25');
    assert.equal(porPorcento.status, 200);
    assert.equal(porPorcento.dados.leitores.length, 0);
});

test('admin: detalhe da conta não quebra (500) se tcg_deck_custom.cartas estiver corrompido', async (t) => {
    const { db, navegador, entrar } = montar();
    t.after(() => db.close());
    const dono = navegador();
    const leitor = navegador();
    await entrar(dono, 'dono', 'Dono');
    const login = await entrar(leitor, 'leitor', 'Leitor');
    const id = login.dados.user.id;

    await db.query(
        'INSERT INTO tcg_deck_custom (user_id, cartas, atualizado_em, nome, publico) VALUES ($1, $2, $3, $4, FALSE)',
        [id, '{json-quebrado', 1_700_000_000_000, 'Quebrado']
    );

    const detalhe = await dono('GET', `/api/admin/users/${id}`);
    assert.equal(detalhe.status, 200);
    assert.deepEqual(detalhe.dados.deck, { nome: 'Quebrado', publico: false, cartas: 0 });
});

test('upload: bloqueia path traversal (".." / "."), slug vazio, gibi não-string e capítulo duplicado "1"/"01"', async (t) => {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-sec-'));
    t.after(() => fs.rmSync(raiz, { recursive: true, force: true }));
    fs.mkdirSync(path.join(raiz, 'data'), { recursive: true });
    fs.writeFileSync(path.join(raiz, 'data/comics.manifest.json'), JSON.stringify({ comics: {}, censorship: {} }));

    const { db, navegador, entrar } = montar({ backendUpload: backendDisco(raiz) });
    t.after(() => db.close());
    const dono = navegador();
    await entrar(dono, 'dono', 'Dono');

    const img = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } }).png().toBuffer();
    const { dados: capa } = await dono('POST', '/api/admin/upload/arquivo', img);
    const { dados: p1 } = await dono('POST', '/api/admin/upload/arquivo', img);

    for (const item of [
        { tipo: 'spin', gibi: 123, capitulo: '1', capa, paginas: [p1] },
        { tipo: 'spin', gibi: '..', titulo: '..', capitulo: '1', capa, paginas: [p1] },
        { tipo: 'spin', gibi: '.', titulo: '.', capitulo: '1', capa, paginas: [p1] },
        { tipo: 'spin', gibi: '!!!', titulo: '!!!', capitulo: '1', capa, paginas: [p1] },
    ]) {
        const r = await dono('POST', '/api/admin/upload/publicar', { lote: [item] });
        assert.equal(r.status, 400, JSON.stringify(item));
    }
    assert.equal(fs.existsSync(path.join(raiz, 'assets/Capitulo 1')), false, 'não criou fora de Spin Offs');

    const dup = await dono('POST', '/api/admin/upload/publicar', {
        lote: [
            { tipo: 'serie', capitulo: '1', capa, paginas: [p1] },
            { tipo: 'serie', capitulo: '01', capa, paginas: [p1] },
        ],
    });
    assert.equal(dup.status, 400);
});

test('tcg: comentarios com ?desde fora do limite de bigint não retornam 500 e deck corrompido ao copiar retorna 409', async (t) => {
    const { db, navegador, entrar } = montar();
    t.after(() => db.close());
    const a = navegador();
    const b = navegador();
    const uA = (await entrar(a, 'a', 'Jogador A')).dados.user;
    const uB = (await entrar(b, 'b', 'Jogador B')).dados.user;

    const partidaId = '11111111-1111-4111-8111-111111111111';
    await db.query(
        `INSERT INTO tcg_partidas (id, jogador_a, jogador_b, deck_a, deck_b, estado, versao, regras, prazo, criado_em, atualizado_em)
         VALUES ($1, $2, $3, 'custom', 'custom', '{}', 0, 15, 1800000000000, 1700000000000, 1700000000000)`,
        [partidaId, uA.id, uB.id]
    );

    const grande = await a('GET', `/api/tcg/partidas/${partidaId}/comentarios?desde=99999999999999999999999`);
    assert.equal(grande.status, 200);
    const negativo = await a('GET', `/api/tcg/partidas/${partidaId}/comentarios?desde=-10`);
    assert.equal(negativo.status, 200);

    await db.query(
        'INSERT INTO tcg_deck_custom (user_id, cartas, atualizado_em, nome, publico) VALUES ($1, $2, $3, $4, TRUE)',
        [uA.id, 'nao-json', 1_700_000_000_000, 'Deck Ruim']
    );
    const copia = await b('POST', `/api/tcg/decks-publicos/${uA.id}/copiar`, {});
    assert.equal(copia.status, 409);
});

test('auth: POST /api/auth/google devolve admin e cargo; auth-widget preserva moderador na restauração de sessão', async (t) => {
    const { db, api, navegador, entrar } = montar();
    t.after(() => db.close());
    const dono = navegador();
    const mod = navegador();
    const rDono = await entrar(dono, 'dono', 'Dono');
    assert.equal(rDono.dados.admin, true);
    assert.equal(rDono.dados.cargo, 'dono');

    const rMod = await entrar(mod, 'mod', 'Moderador');
    assert.equal(rMod.dados.admin, false);
    assert.equal(rMod.dados.cargo, null);

    await dono('POST', `/api/admin/users/${rMod.dados.user.id}/cargo`, { cargo: 'moderador' });

    // Testa o fluxo do js/auth-widget.js ao restaurar a sessão via enzoLembrar (sem cookie sid).
    const storage = new Map([['enzoLembrar', rMod.dados.lembrar]]);
    const pedir = async (caminho, corpo) => {
        const h = corpo !== undefined ? { 'content-type': 'application/json', origin: 'http://localhost' } : {};
        const r = await api(new Request(`http://localhost${caminho}`, {
            method: corpo === undefined ? 'GET' : 'POST',
            headers: h,
            body: corpo === undefined ? undefined : JSON.stringify(corpo),
        }));
        let dados = null;
        try { dados = await r.json(); } catch {}
        return { ok: r.ok, status: r.status, dados };
    };
    const sandbox = {
        console,
        Promise,
        Set,
        Map,
        Object,
        Array,
        String,
        Number,
        Boolean,
        Math,
        Date,
        JSON,
        encodeURIComponent,
        location: { pathname: '/' },
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
        },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        document: {
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: () => ({ style: {}, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, append() {}, appendChild() {}, addEventListener() {}, replaceChildren() {} }),
            head: { appendChild() {} },
            body: { appendChild() {} },
        },
    };
    sandbox.window = sandbox;
    sandbox.EnzoApi = { pedir };
    sandbox.siteIcon = () => sandbox.document.createElement('span');

    const code = fs.readFileSync(path.join(__dirname, '../js/auth-widget.js'), 'utf8');
    vm.runInNewContext(code, sandbox, { filename: 'js/auth-widget.js' });
    await sandbox.EnzoConta.pronto;
    assert.equal(sandbox.EnzoConta.usuario.id, rMod.dados.user.id);
    assert.equal(sandbox.EnzoConta.admin, false);
    assert.equal(sandbox.EnzoConta.moderador, true, 'cargo moderador mantido ao restaurar sessão');
});
