const test = require('node:test');
const assert = require('node:assert');
const { columnsFor, chunk } = require('../js/shelf.js');

test('estante: quantos gibis cabem por prateleira', () => {
    // Desktop largo: 1120px úteis, gibi de 150px e vão de 38px -> 6 por prateleira.
    assert.strictEqual(columnsFor(1120, 150, 38), 6);
    // Celular: 307px úteis, gibi de 84px e vão de 14px -> 3 por prateleira.
    assert.strictEqual(columnsFor(307, 84, 14), 3);
    // Nunca menos que 1, mesmo com medidas inválidas.
    assert.strictEqual(columnsFor(0, 150, 38), 1);
    assert.strictEqual(columnsFor(100, 0, 10), 1);
    assert.strictEqual(columnsFor(60, 150, 38), 1);
});

test('estante: prateleiras crescem sem perder nem reordenar gibis', () => {
    const comics = Array.from({ length: 18 }, (_, i) => i + 1);
    for (const columns of [1, 3, 4, 6, 7]) {
        const rows = chunk(comics, columns);
        assert.strictEqual(rows.length, Math.ceil(18 / columns));
        assert.ok(rows.every(row => row.length <= columns && row.length > 0));
        assert.deepStrictEqual(rows.flat(), comics);
    }
    assert.deepStrictEqual(chunk([], 6), []);
    assert.deepStrictEqual(chunk([1, 2], 0), [[1], [2]]);
});
