// ============================================================================
// Testes do servidor estático: só conteúdo público, 404 real e cache correto.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('../server.js');

test('servidor entrega somente conteúdo público, 404 real e cache correto', async t => {
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    t.after(() => server.close());
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const resource of ['/assets/..%2fserver.js', '/server.js', '/package.json', '/docs/CORRECOES.md', '/assets/nao-existe.png', '/nao-existe.html', '/api/leaderboard']) {
        assert.equal((await fetch(base + resource)).status, 404, resource);
    }
    assert.equal((await fetch(base + '/')).status, 200);
    assert.match((await fetch(base + '/')).headers.get('cache-control'), /no-cache/);
    const image = Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, '../data/images.json'))))[0].variants[0].src;
    const response = await fetch(`${base}/${image}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image\/webp/);
    assert.match(response.headers.get('cache-control'), /immutable/);
});
