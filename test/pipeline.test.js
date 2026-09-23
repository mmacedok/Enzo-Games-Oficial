const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

test('build preserva curadoria, ordena páginas e spin-offs, e não regrava catálogo idêntico', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enzo-build-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.copyFileSync(path.join(__dirname, '../atualizar.js'), path.join(dir, 'atualizar.js'));
    for (const chapter of ['Capitulo 2', 'Capitulo 10', 'Spin Offs/Teste/Capitulo 10', 'Spin Offs/Teste/Capitulo 2']) {
        for (const part of ['Paginas', 'Capa']) fs.mkdirSync(path.join(dir, 'assets', chapter, part), { recursive: true });
        for (const page of ['PAG10.png', 'PAG2.png']) fs.writeFileSync(path.join(dir, 'assets', chapter, 'Paginas', page), 'fixture');
        fs.writeFileSync(path.join(dir, 'assets', chapter, 'Capa', 'cover.png'), 'fixture');
    }
    fs.mkdirSync(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'data/comics.manifest.json'), JSON.stringify({ comics: { teste: { id: 'novo-id', order: 1, title: 'Curado', description: '', featured: false } }, censorship: { 'capitulo-2': [{ pageIndex: 0 }] }, easterEggs: [{ comicId: 'capitulo-2', pageIndex: 1, kind: 'macarronada' }] }));
    const run = () => execFileSync(process.execPath, ['-e', "require('./atualizar').build()"], { cwd: dir });
    run();
    const file = path.join(dir, 'data/database.json');
    const before = fs.statSync(file).mtimeMs;
    const db = JSON.parse(fs.readFileSync(file));
    assert.deepEqual(db.comics.map(c => c.id), ['novo-id', 'capitulo-2', 'capitulo-10']);
    assert.equal(db.comics[0].title, 'Curado');
    assert.equal(db.comics[0].description, '');
    assert.deepEqual(db.comics[0].chapters.map(c => c.id), ['2', '10']);
    assert.match(db.comics[0].cover, /Capitulo 2/);
    assert.match(db.comics[1].chapters[0].pages[0], /PAG2.png$/);
    assert.equal(db.easterEggs.length, 1); assert.ok(db.censorship['capitulo-2']);
    run();
    assert.equal(fs.statSync(file).mtimeMs, before);
});

test('variantes web têm dimensões, arquivos e orçamento adequado para capas e fichas', () => {
    const root = path.join(__dirname, '..');
    const images = JSON.parse(fs.readFileSync(path.join(root, 'data/images.json')));
    let covers = 0, characters = 0;
    for (const [source, item] of Object.entries(images)) {
        assert.ok(item.width > 0 && item.height > 0);
        for (const variant of item.variants) {
            assert.ok(fs.existsSync(path.join(root, variant.src)));
            assert.ok(variant.width <= item.width);
        }
        if (source.includes('/Capa/')) covers += item.variants[0].bytes;
        if (source.startsWith('assets/Personagens/')) characters += item.variants[0].bytes;
    }
    assert.ok(covers < 3_000_000, `capas: ${covers}`);
    assert.ok(characters < 6_000_000, `fichas: ${characters}`);
});
