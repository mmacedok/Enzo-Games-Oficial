// ============================================================================
// Testes da API do ranking: validação de pontuação, sanitização e rate limit.
// Sobe o app numa porta efêmera, sem tocar no data/leaderboard.json real.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enzo-api-test-'));
process.env.LEADERBOARD_FILE = path.join(dir, 'leaderboard.json');
const { app, sanitizeName, MAX_SCORE, createSession, validateSession } = require('../server.js');
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('sanitizeName mantém apenas letras, números e espaço', () => {
    assert.equal(sanitizeName('enzo games'), 'ENZO GAMES');
    assert.equal(sanitizeName('<img onerror=alert(1)>'), 'IMG ONERRO', 'corta em 10 e remove símbolos');
    assert.equal(sanitizeName('  zé  '), 'Z');
    assert.equal(sanitizeName('namenamename'), 'NAMENAMENA', 'limita a 10 caracteres');
    assert.equal(sanitizeName(''), 'ANONIMO', 'nome vazio vira ANONIMO');
    assert.equal(sanitizeName(null), 'ANONIMO');
    assert.equal(sanitizeName(42), '42');
});

test('MAX_SCORE é um teto plausível e configurável', () => {
    assert.equal(typeof MAX_SCORE, 'number');
    assert.ok(MAX_SCORE > 0 && MAX_SCORE <= 10_000);
});

test('API: rejeita pontuações inválidas e aceita uma válida', async (t) => {
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, () => resolve(instance));
    });
    t.after(() => server.close());

    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (body) =>
        fetch(`${base}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

    assert.equal((await post({ name: 'HACK', score: 999999 })).status, 400, 'placar acima do teto');
    assert.equal((await post({ name: 'X', score: -1 })).status, 400, 'placar negativo');
    assert.equal((await post({ name: 'X', score: 4.5 })).status, 400, 'placar fracionado');
    assert.equal((await post({ name: 'X', score: 'abc' })).status, 400, 'placar não numérico');
    assert.equal((await post({ name: 'X', score: null })).status, 400, 'placar nulo');

    const token = createSession(Date.now() - 20000);
    const ok = await post({ name: 'enzo', score: 12, token });
    assert.equal(ok.status, 201);
    const entries = await ok.json();
    assert.equal(entries[0].name, 'ENZO');
    assert.equal(entries[0].score, 12);
    assert.ok(entries[0].date);
    assert.equal(JSON.parse(fs.readFileSync(process.env.LEADERBOARD_FILE))[0].score, 12);
    assert.equal((await post({ name: 'enzo', score: 12, token })).status, 400, 'sessão só salva uma vez');
    for (let i = 0; i < 5; i++) await post({ score: -1 });
    assert.equal((await post({ score: 12 })).status, 429);
});

test('sessões rejeitam assinatura falsa, expiração e placar rápido demais', () => {
    const now = Date.now();
    assert.ok(validateSession(createSession(now - 20000), 12, now));
    assert.equal(validateSession(createSession(now), 12, now), null);
    assert.equal(validateSession(createSession(now - 3600001), 1, now), null);
    assert.equal(validateSession(createSession(now) + 'alterado', 1, now), null);
});

test('servidor entrega somente conteúdo público, 404 real e cache correto', async t => {
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    t.after(() => server.close());
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const resource of ['/assets/..%2fserver.js', '/server.js', '/package.json', '/docs/CORRECOES.md', '/data/leaderboard.json', '/assets/nao-existe.png', '/nao-existe.html']) {
        assert.equal((await fetch(base + resource)).status, 404, resource);
    }
    assert.equal((await fetch(base + '/')).status, 200);
    const image = Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, '../data/images.json'))))[0].variants[0].src;
    const response = await fetch(`${base}/${image}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image\/webp/);
    assert.match(response.headers.get('cache-control'), /immutable/);
    assert.equal((await fetch(base + '/api/leaderboard')).headers.get('cache-control'), 'no-store');
    const foreign = await fetch(base + '/api/leaderboard', { method: 'POST', headers: { Origin: 'https://example.invalid', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(foreign.status, 403);
});
