// ============================================================================
// Testes da lista única de conquistas (js/conquistas.js).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/conquistas.js');

const catalogo = { comics: [
    { id: 'capitulo-1', chapters: [{ id: 'capitulo-1-unico' }] },
    { id: 'capitulo-2', chapters: [{ id: 'capitulo-2-unico' }] },
    { id: 'degustador', featured: false, chapters: [{ id: '1' }, { id: '2' }] },
    { id: 'torado', featured: false, chapters: [{ id: '1' }] },
] };

test('1. idValido valida conquistas fixas e enzos secretos', () => {
    // Válidos
    assert.equal(C.idValido('serie-completa'), true);
    assert.equal(C.idValido('degustador-completo'), true);
    assert.equal(C.idValido('macarronada'), true);
    assert.equal(C.idValido('cabo-coco'), true);
    assert.equal(C.idValido('enzo-secreto-1'), true);
    assert.equal(C.idValido('enzo-secreto-99'), true);

    // Inválidos
    assert.equal(C.idValido('enzo-secreto-0'), false);
    assert.equal(C.idValido('enzo-secreto-100'), false);
    assert.equal(C.idValido('enzo-secreto-07'), false);
    assert.equal(C.idValido('enzo-secreto-1.5'), false);
    assert.equal(C.idValido('enzo-secreto-'), false);
    assert.equal(C.idValido('hack'), false);
    assert.equal(C.idValido(''), false);
    assert.equal(C.idValido(null), false);
    assert.equal(C.idValido(42), false);
});

test('2. conversão de número e id secreto', () => {
    assert.equal(C.numeroSecreto('enzo-secreto-12'), 12);
    assert.equal(C.idSecreto(12), 'enzo-secreto-12');
    assert.equal(C.SECRETOS, 99);
});

test('3. capitulosDaColecao filtra corretamente', () => {
    assert.deepEqual(C.capitulosDaColecao(catalogo, 'serie'), [
        'capitulo-1/capitulo-1-unico',
        'capitulo-2/capitulo-2-unico',
    ]);
    assert.deepEqual(C.capitulosDaColecao(catalogo, 'degustador'), [
        'degustador/1',
        'degustador/2',
    ]);
    assert.deepEqual(C.capitulosDaColecao(catalogo, 'inexistente'), []);
    assert.deepEqual(C.capitulosDaColecao(null, 'serie'), []);
});

test('4. progressoDaColecao calcula lidos e total', () => {
    const parcial = [
        { comicId: 'degustador', chapterId: '1', completed: true },
        { comicId: 'degustador', chapterId: '2', completed: false },
    ];
    assert.deepEqual(C.progressoDaColecao(catalogo, 'degustador', parcial), { lidos: 1, total: 2 });
    assert.deepEqual(C.progressoDaColecao(catalogo, 'serie', parcial), { lidos: 0, total: 2 });

    const completo = [
        { comicId: 'degustador', chapterId: '1', completed: true },
        { comicId: 'degustador', chapterId: '2', completed: true },
    ];
    assert.deepEqual(C.progressoDaColecao(catalogo, 'degustador', completo), { lidos: 2, total: 2 });

    assert.equal(C.progressoDaColecao(catalogo, 'degustador', undefined).lidos, 0);
});

test('5. integridade da LISTA de conquistas com o catálogo real', () => {
    const catalogoReal = require('../data/database.json');
    const ids = new Set();
    for (const c of C.LISTA) {
        assert.ok(typeof c.id === 'string' && c.id.length > 0, `id inválido em ${JSON.stringify(c)}`);
        assert.ok(typeof c.icone === 'string' && c.icone.length > 0, `icone inválido em ${c.id}`);
        assert.ok(typeof c.titulo === 'string' && c.titulo.length > 0, `titulo inválido em ${c.id}`);
        assert.ok(typeof c.descricao === 'string' && c.descricao.length > 0, `descricao inválido em ${c.id}`);
        assert.equal(ids.has(c.id), false, `id repetido: ${c.id}`);
        ids.add(c.id);

        if (c.colecao) {
            const capitulos = C.capitulosDaColecao(catalogoReal, c.colecao);
            assert.ok(capitulos.length > 0, `coleção vazia ou inexistente no catálogo real: ${c.colecao}`);
        }
    }
});
