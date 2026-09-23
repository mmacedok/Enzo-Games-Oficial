// ============================================================================
// Build do catálogo: varre assets/, casa com data/comics.manifest.json e grava
// data/database.json. É IDEMPOTENTE: rodar duas vezes não muda o arquivo.
//
// Fontes de verdade:
//   - assets/Capitulo N/{Capa,Paginas}      -> gibis da série principal
//   - assets/Spin Offs/<Nome>/Capitulo N/   -> spin-offs (ex.: degustador)
//   - data/comics.manifest.json             -> títulos, descrições, censura,
//                                              easter eggs (preservados sempre)
// ============================================================================
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ASSETS_DIR = path.join(ROOT, 'assets');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'database.json');
const MANIFEST_FILE = path.join(DATA_DIR, 'comics.manifest.json');

const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;
const natural = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const listImages = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((file) => IMAGE_RE.test(file))
        .sort(natural.compare);
};

const toAssetPath = (...parts) => ['assets', ...parts].join('/');

/** Lê a capa de uma pasta "Capa" e devolve o caminho relativo (ou null). */
function findCover(...assetParts) {
    const files = listImages(path.join(ASSETS_DIR, ...assetParts));
    return files.length ? toAssetPath(...assetParts, files[0]) : null;
}

/** Converte "Degustador da noite" -> "degustador". */
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function scanChapter(folderName, { id, title, assetParts }) {
    const pagesDir = path.join(ASSETS_DIR, ...assetParts, 'Paginas');
    const pages = listImages(pagesDir).map((file) => toAssetPath(...assetParts, 'Paginas', file));
    if (pages.length === 0) return null;

    const cover = findCover(...assetParts, 'Capa');
    return {
        id,
        title,
        cover: cover || 'assets/cover-placeholder.svg',
        description: `Páginas do ${folderName}`,
        chapters: [{ id: `${id}-unico`, title: 'Páginas', pages }],
    };
}

/** Gibis da série principal: assets/Capitulo N/ */
function scanMainSeries() {
    const found = [];
    for (const entry of fs.readdirSync(ASSETS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const match = entry.name.match(/^Capitulo\s+(\d+)$/i);
        if (!match) continue;
        const number = Number(match[1]);
        const comic = scanChapter(entry.name, {
            id: `capitulo-${number}`,
            title: `Capítulo ${number}`,
            assetParts: [entry.name],
        });
        if (comic) found.push({ order: number, comic });
    }
    return found;
}

/** Spin-offs: assets/Spin Offs/<Nome>/Capitulo N/ vira um gibi com N capítulos. */
function scanSpinOffs() {
    const spinOffsDir = path.join(ASSETS_DIR, 'Spin Offs');
    if (!fs.existsSync(spinOffsDir)) return [];

    const found = [];
    for (const entry of fs.readdirSync(spinOffsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const chapters = [];
        let cover = null;
        const comicDir = path.join(spinOffsDir, entry.name);

        for (const inner of fs.readdirSync(comicDir, { withFileTypes: true }).sort((a, b) => natural.compare(a.name, b.name))) {
            if (!inner.isDirectory()) continue;
            const match = inner.name.match(/^Capitulo\s+(\d+)$/i);
            if (!match) continue;

            const number = Number(match[1]);
            const pagesDir = path.join(comicDir, inner.name, 'Paginas');
            const pages = listImages(pagesDir).map((file) =>
                toAssetPath('Spin Offs', entry.name, inner.name, 'Paginas', file),
            );
            if (pages.length === 0) continue;

            chapters.push({ order: number, id: `${number}`, title: `Capítulo ${number}`, pages });
            cover = cover || findCover('Spin Offs', entry.name, inner.name, 'Capa');
        }

        if (chapters.length === 0) continue;
        chapters.sort((a, b) => a.order - b.order);

        found.push({
            order: 100,
            comic: {
                id: slugify(entry.name),
                title: entry.name,
                cover: cover || 'assets/cover-placeholder.svg',
                description: '',
                chapters: chapters.map(({ id, title, pages }) => ({ id, title, pages })),
            },
        });
    }
    return found;
}

function readManifest() {
    if (!fs.existsSync(MANIFEST_FILE)) {
        console.warn('⚠️  data/comics.manifest.json não encontrado: usando apenas o que foi varrido.');
        return { comics: {}, censorship: {}, easterEggs: [] };
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    return {
        comics: manifest.comics || {},
        censorship: manifest.censorship || {},
        easterEggs: manifest.easterEggs || [],
    };
}

/** Avisa (sem quebrar) quando um caminho de asset do manifest não existe. */
function warnMissingAssets(comics, easterEggs) {
    const missing = [];
    for (const egg of easterEggs) {
        if (egg.image && !fs.existsSync(path.join(ROOT, egg.image))) missing.push(egg.image);
    }
    if (missing.length) {
        throw new Error(`Assets do manifest não encontrados: ${missing.join(', ')}`);
    }
    const withoutPages = comics.filter((comic) => !comic.chapters.some((c) => c.pages.length));
    if (withoutPages.length) {
        console.warn(`⚠️  Gibis sem páginas: ${withoutPages.map((c) => c.id).join(', ')}`);
    }
}

function build() {
    if (!fs.existsSync(ASSETS_DIR)) {
        throw new Error('Pasta "assets" não encontrada.');
    }
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const manifest = readManifest();
    const scanned = [...scanMainSeries(), ...scanSpinOffs()].sort((a, b) => a.order - b.order);

    const comics = scanned.map(({ comic }) => {
        const custom = manifest.comics[comic.id] || {};
        return {
            id: custom.id || comic.id,
            title: custom.title || comic.title,
            cover: comic.cover,
            description: custom.description ?? comic.description,
            order: custom.order ?? scanned.find(entry => entry.comic === comic).order,
            featured: custom.featured === undefined ? true : Boolean(custom.featured),
            chapters: comic.chapters,
        };
    });

    // Mantém a ordem declarada no manifest (order) e depois a ordem natural.
    const orderOf = (comic) => {
        const entry = manifest.comics[comic.id] || {};
        return comic.order ?? entry.order ?? Number.MAX_SAFE_INTEGER;
    };
    comics.sort((a, b) => orderOf(a) - orderOf(b));

    const database = {
        comics,
        censorship: manifest.censorship,
        easterEggs: manifest.easterEggs,
    };

    warnMissingAssets(comics, manifest.easterEggs);
    if (new Set(comics.map(comic => comic.id)).size !== comics.length) throw new Error('IDs de gibis duplicados no manifest.');

    const serialized = `${JSON.stringify(database, null, 2)}\n`;
    const previous = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : null;

    if (previous === serialized) {
        console.log('✅ database.json já estava atualizado (nada mudou).');
    } else {
        if (previous !== null) fs.writeFileSync(`${OUTPUT_FILE}.bak`, previous);
        fs.writeFileSync(`${OUTPUT_FILE}.tmp`, serialized);
        fs.renameSync(`${OUTPUT_FILE}.tmp`, OUTPUT_FILE);
        console.log('✅ database.json atualizado.');
    }

    const pageCount = comics.reduce(
        (total, comic) => total + comic.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0),
        0,
    );
    console.log(`📚 ${comics.length} gibi(s), ${pageCount} página(s), ${manifest.easterEggs.length} easter egg(s).`);

    return database;
}

module.exports = { build };

if (require.main === module) {
    (async () => {
        const { ensureCaboCocoMask } = require('./lib/cabo-coco-mask');
        ensureCaboCocoMask();
        await require('./lib/web-images').buildImages();
        build();
    })().catch(error => { console.error('Falha no build:', error.message); process.exitCode = 1; });
}
