// ============================================================================
// Testes de integridade do catálogo: todo caminho de asset citado no
// database.json precisa existir no disco (pega link quebrado e o build falho).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATABASE = path.join(ROOT, 'data', 'database.json');
const MANIFEST = path.join(ROOT, 'data', 'comics.manifest.json');

const readDatabase = () => JSON.parse(fs.readFileSync(DATABASE, 'utf8'));
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

test('database.json e manifest existem e são JSON válido', () => {
    assert.ok(fs.existsSync(DATABASE), 'rode npm run build para gerar data/database.json');
    assert.ok(fs.existsSync(MANIFEST));
    assert.ok(Array.isArray(readDatabase().comics));
});

test('todo gibi tem id, título e pelo menos um capítulo com páginas', () => {
    for (const comic of readDatabase().comics) {
        assert.ok(comic.id, 'gibi sem id');
        assert.ok(comic.title, `gibi ${comic.id} sem título`);
        assert.ok(Array.isArray(comic.chapters) && comic.chapters.length > 0, `gibi ${comic.id} sem capítulos`);
        for (const chapter of comic.chapters) {
            assert.ok(chapter.pages.length > 0, `capítulo ${chapter.id} sem páginas`);
        }
    }
});

test('toda capa e página citada no catálogo existe no disco', () => {
    const database = readDatabase();
    const missing = [];
    for (const comic of database.comics) {
        if (comic.cover && !comic.cover.startsWith('http') && !exists(comic.cover)) missing.push(comic.cover);
        for (const chapter of comic.chapters) {
            for (const page of chapter.pages) if (!exists(page)) missing.push(page);
        }
    }
    assert.deepEqual(missing, [], `assets ausentes:\n${missing.join('\n')}`);
});

test('todo easter egg com imagem existe no disco', () => {
    const missing = (readDatabase().easterEggs || [])
        .filter((egg) => egg.image && !exists(egg.image))
        .map((egg) => egg.image);
    assert.deepEqual(missing, [], `imagens de easter egg ausentes:\n${missing.join('\n')}`);
});

test('censura aponta para gibis e páginas que existem', () => {
    const database = readDatabase();
    for (const [comicId, masks] of Object.entries(database.censorship || {})) {
        const comic = database.comics.find((entry) => entry.id === comicId);
        assert.ok(comic, `censura aponta para gibi inexistente: ${comicId}`);
        const total = comic.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0);
        for (const mask of masks) {
            assert.ok(
                mask.pageIndex >= 0 && mask.pageIndex < total,
                `censura fora do intervalo em ${comicId}: página ${mask.pageIndex} de ${total}`,
            );
        }
    }
});

test('o spin-off Degustador da Noite continua no catálogo (não pode sumir no build)', () => {
    const comic = readDatabase().comics.find((entry) => entry.id === 'degustador');
    assert.ok(comic, 'o gibi "degustador" precisa existir: degustador.html linka para ele');
    assert.ok(comic.chapters[0].pages.length >= 4, 'o capítulo 1 do spin-off deve ter páginas');
});

test('toda página de gibi é uma imagem com extensão conhecida', () => {
    const allowed = /\.(jpe?g|png|gif|webp|avif)$/i;
    for (const comic of readDatabase().comics) {
        for (const chapter of comic.chapters) {
            for (const page of chapter.pages) {
                assert.match(page, allowed, `extensão inesperada em ${page}`);
            }
        }
    }
});
