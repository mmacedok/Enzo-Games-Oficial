// ============================================================================
// Músicas dos gibis (assets/audio/musicas.json): arquivos existem, trechos têm no máximo 30 s e as áreas cabem na página.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const musicas = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/audio/musicas.json'), 'utf8'));
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'data/database.json'), 'utf8'));
const existe = (rel) => fs.existsSync(path.join(raiz, rel));
const tamanho = (rel) => fs.statSync(path.join(raiz, rel)).size;

test('musicas.json: faixas completas e capas existem e os ids não repetem', () => {
    for (const [gibi, conf] of Object.entries(musicas)) {
        assert.ok(catalogo.comics.some((c) => c.id === gibi), `gibi "${gibi}" existe no catálogo`);
        const ids = conf.faixas.map((f) => f.id);
        assert.equal(new Set(ids).size, ids.length, 'ids de faixa repetidos');
        for (const f of conf.faixas) {
            assert.ok(f.titulo, `faixa ${f.id} sem título`);
            assert.ok(existe(f.capa), `capa de ${f.id}`);
            assert.ok(existe(f.completa), `música completa de ${f.id}`);
        }
    }
});

test('musicas.json: cada trecho aponta para uma faixa, uma página e um clipe de até 30 s', () => {
    for (const [gibi, conf] of Object.entries(musicas)) {
        const comic = catalogo.comics.find((c) => c.id === gibi);
        for (const t of conf.trechos) {
            assert.ok(conf.faixas.some((f) => f.id === t.faixa), `faixa "${t.faixa}" existe`);
            const capitulo = comic.chapters.find((c) => c.id === String(t.capitulo));
            assert.ok(capitulo, `capítulo ${t.capitulo} existe`);
            assert.ok(t.pagina >= 1 && t.pagina <= capitulo.pages.length, `página ${t.pagina} existe`);
            assert.ok(existe(t.clipe), `clipe ${t.clipe}`);
            // Os clipes são MP3 de 96 kbps: 30 s = 360 KB. Passar disso (com folga de 2%) é mais de 30 s.
            assert.ok(tamanho(t.clipe) <= 30 * 12000 * 1.02, `${t.clipe} passa de 30 s`);
            assert.ok(t.letra && t.letra.length > 5, 'trecho sem a letra relevante');
            assert.ok(t.areas.length >= 1, 'trecho sem área clicável');
            for (const a of t.areas) {
                for (const lado of ['left', 'top', 'width', 'height']) assert.match(a[lado], /^\d+(\.\d+)?%$/, `área ${lado}`);
                assert.ok(parseFloat(a.left) + parseFloat(a.width) <= 100.01, 'área passa da borda direita');
                assert.ok(parseFloat(a.top) + parseFloat(a.height) <= 100.01, 'área passa da borda de baixo');
            }
        }
    }
});
