// tools/copiar-banco.mjs: copia as linhas de um banco para outro com o mesmo esquema.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLocalDb } = require('../api/db-local.js');
const { migrar } = require('../api/handler.js');

test('copia usuários, recordes (JSON e booleano) e não duplica ao rodar de novo', async () => {
    const { copiar } = await import('../tools/copiar-banco.mjs');
    const origem = createLocalDb();
    const destino = createLocalDb();
    await migrar(origem);
    await migrar(destino);
    await origem.query(`INSERT INTO users (id, google_id, email, display_name, created_at, last_login_at)
        VALUES ('u1', 'g1', 'a@b.com', 'Ana "A" O''Neil', 1700000000000, 1700000000001)`);
    await origem.query(`INSERT INTO game_scores (id, user_id, game_id, score, duration_ms, verified, client_metadata, created_at)
        VALUES ('s1', 'u1', 'flappy-enzo', 7, 1234, TRUE, $1, 1700000000002)`, [JSON.stringify({ a: [1, 2], b: 'x' })]);
    const q = (db) => (texto, params) => db.query(texto, params);

    const resumo = await copiar(q(origem), q(destino), () => {});
    assert.deepEqual(resumo.users, { lidas: 1, novas: 1 });
    assert.deepEqual(resumo.game_scores, { lidas: 1, novas: 1 });
    const [u] = await destino.query('SELECT * FROM users');
    assert.equal(u.display_name, 'Ana "A" O\'Neil');
    assert.equal(Number(u.last_login_at), 1700000000001);
    const [s] = await destino.query('SELECT * FROM game_scores');
    assert.equal(s.verified, true);
    assert.equal(s.score, 7);
    assert.deepEqual(typeof s.client_metadata === 'string' ? JSON.parse(s.client_metadata) : s.client_metadata, { a: [1, 2], b: 'x' });

    const deNovo = await copiar(q(origem), q(destino), () => {});
    assert.equal(deNovo.users.novas, 0);
    assert.equal(deNovo.game_scores.novas, 0);
    await origem.close();
    await destino.close();
});
