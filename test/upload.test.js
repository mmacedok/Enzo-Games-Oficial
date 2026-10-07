// ============================================================================
// Testes do upload de capítulos pelo terminal (api/upload.js): validação, caminhos escolhidos pelo servidor,
// manifesto (série principal, spin-off existente e spin-off novo), escondido, substituir e segurança.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const { backendDisco, slug } = require('../api/upload.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };
const MANIFESTO_INICIAL = '{\r\n  "comics": {\r\n    "capitulo-1": {\r\n      "description": "Primeiro"\r\n    },\r\n    "degustador-da-noite": {\r\n      "id": "degustador",\r\n      "title": "Degustador da Noite",\r\n      "order": 100,\r\n      "featured": false,\r\n      "chapters": {\r\n        "1": {\r\n          "title": "Um"\r\n        }\r\n      }\r\n    }\r\n  },\r\n  "censorship": {}\r\n}\r\n';

async function png(cor) {
    return sharp({ create: { width: 8, height: 8, channels: 3, background: cor } }).png().toBuffer();
}

async function montar() {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
    fs.mkdirSync(path.join(raiz, 'data'), { recursive: true });
    fs.mkdirSync(path.join(raiz, 'assets/Spin Offs/Degustador da noite/Capitulo 1/Capa'), { recursive: true });
    fs.writeFileSync(path.join(raiz, 'data/comics.manifest.json'), MANIFESTO_INICIAL);
    const db = createLocalDb(null);
    const verificarGoogle = async (c) => { const [, sub, nome] = c.split(':'); return { sub, name: nome, email: `${sub}@exemplo.com` }; };
    const api = createApi({ db, env: ENV, verificarGoogle, backendUpload: backendDisco(raiz) });
    function navegador() {
        let cookie = '';
        return async function chamar(metodo, caminho, corpo, extra = {}) {
            const h = { ...extra };
            if (cookie) h.cookie = cookie;
            let body;
            if (Buffer.isBuffer(corpo)) { body = corpo; h['x-enzo-upload'] = h['x-enzo-upload'] ?? '1'; } else if (corpo !== undefined) { h['content-type'] = 'application/json'; body = JSON.stringify(corpo); }
            const r = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body }));
            const sc = r.headers.getSetCookie();
            if (sc.length) cookie = sc[0].split(';')[0];
            return { status: r.status, dados: await r.json() };
        };
    }
    const chefe = navegador();
    const leitor = navegador();
    await chefe('POST', '/api/auth/google', { credential: `google:chefe:Henrique-${'x'.repeat(20)}` });
    await leitor('POST', '/api/auth/google', { credential: `google:leitor:Ze-${'x'.repeat(20)}` });
    const enviar = async (cor) => (await chefe('POST', '/api/admin/upload/arquivo', await png(cor))).dados;
    return { raiz, db, chefe, leitor, navegador, enviar, lerManifesto: () => fs.readFileSync(path.join(raiz, 'data/comics.manifest.json'), 'utf8') };
}

test('upload: só o admin usa; imagem inválida e cabeçalho ausente são recusados', async (t) => {
    const { db, chefe, leitor, navegador } = await montar();
    t.after(() => db.close());
    for (const chamar of [leitor, navegador()]) assert.equal((await chamar('GET', '/api/admin/upload/estado')).status, 404);
    assert.deepEqual((await chefe('GET', '/api/admin/upload/estado')).dados, { configurado: true, modo: 'disco' });
    assert.equal((await chefe('POST', '/api/admin/upload/arquivo', Buffer.from('não sou imagem'))).status, 415);
    assert.equal((await chefe('POST', '/api/admin/upload/arquivo', await png('red'), { 'x-enzo-upload': '0' })).status, 415);
    assert.equal((await chefe('POST', '/api/admin/upload/arquivo', await png('red'), { origin: 'http://outro.site' })).status, 403);
    const ok = await chefe('POST', '/api/admin/upload/arquivo', await png('red'));
    assert.equal(ok.status, 200);
    assert.equal(ok.dados.ext, 'png');
    assert.match(ok.dados.sha, /^[0-9a-f]{40}$/);
});

test('upload: capítulo da série principal vai para assets/Capitulo N com a ordem escolhida', async (t) => {
    const { raiz, db, chefe, enviar, lerManifesto } = await montar();
    t.after(() => db.close());
    const capa = await enviar('red'); const p1 = await enviar('green'); const p2 = await enviar('blue');
    const lote = [{ tipo: 'serie', capitulo: '9', descricao: 'Invasão na madrugada!', capa, paginas: [p2, p1] }];
    const r = await chefe('POST', '/api/admin/upload/publicar', { lote });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    const dir = path.join(raiz, 'assets/Capitulo 9');
    assert.deepEqual(fs.readdirSync(path.join(dir, 'Paginas')).sort(), ['PAG1.png', 'PAG2.png']);
    // a ordem do array vale: PAG1 é a "blue" (p2)
    assert.ok((await sharp(path.join(dir, 'Paginas/PAG1.png')).raw().toBuffer()).equals(await sharp(await png('blue')).raw().toBuffer()));
    assert.ok(fs.existsSync(path.join(dir, 'Capa/capa.png')));
    const m = JSON.parse(lerManifesto());
    assert.equal(m.comics['capitulo-9'].description, 'Invasão na madrugada!');
    assert.equal(m.comics['capitulo-9'].hidden, undefined);
    assert.ok(lerManifesto().includes('\r\n') && lerManifesto().endsWith('}\r\n'), 'mantém CRLF');
    // repetir sem "substituir" é recusado; com "substituir" troca e apaga o que sobrou
    assert.equal((await chefe('POST', '/api/admin/upload/publicar', { lote })).status, 409);
    const r2 = await chefe('POST', '/api/admin/upload/publicar', { lote: [{ ...lote[0], substituir: true, paginas: [p1] }] });
    assert.equal(r2.status, 200);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'Paginas')), ['PAG1.png']);
});

test('upload: spin-off existente acha a pasta e o gibi; escondido marca o capítulo', async (t) => {
    const { raiz, db, chefe, enviar, lerManifesto } = await montar();
    t.after(() => db.close());
    const capa = await enviar('red'); const p1 = await enviar('green');
    const r = await chefe('POST', '/api/admin/upload/publicar', { lote: [{ tipo: 'spin', gibi: 'degustador', capitulo: '2', tituloCapitulo: 'Dois', escondido: true, capa, paginas: [p1] }] });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.ok(fs.existsSync(path.join(raiz, 'assets/Spin Offs/Degustador da noite/Capitulo 2/Paginas/PAG1.png')), 'usa a pasta que já existe');
    const g = JSON.parse(lerManifesto()).comics['degustador-da-noite'];
    assert.deepEqual(g.chapters['2'], { title: 'Dois', hidden: true });
    assert.deepEqual(g.chapters['1'], { title: 'Um' });
});

test('upload: spin-off novo cria o gibi no fim da fila e a pasta sem acento', async (t) => {
    const { raiz, db, chefe, enviar, lerManifesto } = await montar();
    t.after(() => db.close());
    const capa = await enviar('red'); const p1 = await enviar('green');
    const r = await chefe('POST', '/api/admin/upload/publicar', { lote: [{ tipo: 'spin', gibi: 'Dóug Xbox', titulo: 'Dóug Xbox', descricao: 'O Besterol começa', capitulo: '1', tituloCapitulo: 'O Besterol começa', capa, paginas: [p1] }] });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.ok(fs.existsSync(path.join(raiz, 'assets/Spin Offs/Doug Xbox/Capitulo 1/Capa/capa.png')));
    const g = JSON.parse(lerManifesto()).comics['doug-xbox'];
    assert.equal(g.id, 'doug-xbox'); assert.equal(g.featured, false); assert.equal(g.order, 110); assert.equal(g.title, 'Dóug Xbox');
    assert.deepEqual(g.chapters['1'], { title: 'O Besterol começa' });
});

test('upload: o lote é validado (capítulo, páginas, imagem não enviada, duplicado)', async (t) => {
    const { db, chefe, enviar } = await montar();
    t.after(() => db.close());
    const capa = await enviar('red'); const p1 = await enviar('green');
    const base = { tipo: 'serie', capitulo: '9', capa, paginas: [p1] };
    const pub = (lote) => chefe('POST', '/api/admin/upload/publicar', { lote });
    assert.equal((await pub([])).status, 400);
    assert.equal((await pub([{ ...base, capitulo: '../x' }])).status, 400);
    assert.equal((await pub([{ ...base, tipo: 'outro' }])).status, 400);
    assert.equal((await pub([{ ...base, paginas: [] }])).status, 400);
    assert.equal((await pub([{ ...base, capa: { sha: 'zz', ext: 'png' } }])).status, 400);
    assert.equal((await pub([{ ...base, paginas: [{ sha: 'a'.repeat(40), ext: 'png' }] }])).status, 400, 'imagem que nunca foi enviada');
    assert.equal((await pub([base, base])).status, 400, 'mesmo capítulo duas vezes');
    assert.equal((await pub([{ ...base, tipo: 'spin' }])).status, 400, 'spin sem gibi');
});

test('upload: slug tira acento e símbolos', () => {
    assert.equal(slug('Degustador da noite'), 'degustador-da-noite');
    assert.equal(slug('Felipe Robozão!'), 'felipe-robozao');
});

test('gibis/trocar: troca página e capa existentes (extensão nova apaga a antiga) e recusa o que não existe', async (t) => {
    const { raiz, db, chefe, leitor, enviar } = await montar();
    t.after(() => db.close());
    const pasta = path.join(raiz, 'assets/Capitulo 3/Paginas');
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, 'PAG1.png'), 'velha1');
    fs.writeFileSync(path.join(pasta, 'PAG2.png'), 'velha2');
    const nova = await enviar('blue');
    const caminho = 'assets/Capitulo 3/Paginas/PAG1.png';

    assert.equal((await leitor('POST', '/api/admin/gibis/trocar', { trocas: [{ path: caminho, ...nova }] })).status, 404, 'leitor não troca');
    const r = await chefe('POST', '/api/admin/gibis/trocar', { trocas: [{ path: caminho, ...nova }] });
    assert.equal(r.status, 200);
    assert.deepEqual(fs.readFileSync(path.join(pasta, 'PAG1.png')), await png('blue'));
    assert.equal(fs.readFileSync(path.join(pasta, 'PAG2.png'), 'utf8'), 'velha2', 'as outras não mudam');

    // extensão diferente: a antiga sai
    const jpg = await chefe('POST', '/api/admin/upload/arquivo', await require('sharp')({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).jpeg().toBuffer());
    assert.equal(jpg.dados.ext, 'jpg');
    assert.equal((await chefe('POST', '/api/admin/gibis/trocar', { trocas: [{ path: 'assets/Capitulo 3/Paginas/PAG2.png', ...jpg.dados }] })).status, 200);
    assert.ok(fs.existsSync(path.join(pasta, 'PAG2.jpg')) && !fs.existsSync(path.join(pasta, 'PAG2.png')));

    for (const p of ['assets/Capitulo 3/Paginas/NAO-EXISTE.png', 'assets/../server.js', 'assets/Capitulo 3/Paginas/../../../x.png', 'data/comics.manifest.json', 'assets/Batalha/aura.png']) {
        const x = await chefe('POST', '/api/admin/gibis/trocar', { trocas: [{ path: p, ...nova }] });
        assert.ok([400, 404].includes(x.status), p);
    }
    assert.equal((await chefe('POST', '/api/admin/gibis/trocar', { trocas: [{ path: caminho, ...nova }, { path: caminho, ...nova }] })).status, 400, 'repetida');
    assert.equal((await chefe('POST', '/api/admin/gibis/trocar', { trocas: [] })).status, 400);
});
