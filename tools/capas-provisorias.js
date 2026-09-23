// Gera capas provisórias para capítulos de spin-offs que não possuem capa.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SPIN_OFFS_DIR = path.join(ROOT, 'assets/Spin Offs');
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;

function buildSvgOverlay(chapterNumber) {
    const numStr = String(chapterNumber).padStart(2, '0');
    return `
    <svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="overlay-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#140028" stop-opacity="0.85" />
                <stop offset="45%" stop-color="#140028" stop-opacity="0" />
                <stop offset="70%" stop-color="#140028" stop-opacity="0" />
                <stop offset="100%" stop-color="#140028" stop-opacity="0.9" />
            </linearGradient>
        </defs>
        <rect width="720" height="1280" fill="url(#overlay-grad)" />
        <rect x="18" y="18" width="684" height="1244" fill="none" stroke="#8a2be2" stroke-width="14" />
        <text x="360" y="150" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="110" fill="#ffffff" stroke="#111111" stroke-width="8" paint-order="stroke">DEGUSTADOR</text>
        <text x="360" y="240" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="90" fill="#ffffff" stroke="#111111" stroke-width="8" paint-order="stroke">DA NOITE</text>
        <text x="360" y="1180" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="96" fill="#ff6600" stroke="#111111" stroke-width="8" paint-order="stroke">Nº ${numStr}</text>
    </svg>
    `.trim();
}

async function processChapter(spinOffName, chapterName, chapterNum) {
    const chapterDir = path.join(SPIN_OFFS_DIR, spinOffName, chapterName);
    const capaDir = path.join(chapterDir, 'Capa');
    const paginasDir = path.join(chapterDir, 'Paginas');
    const relChapter = `assets/Spin Offs/${spinOffName}/${chapterName}`;

    // Só processa capítulos que tenham a primeira página disponível
    if (!fs.existsSync(paginasDir)) return;
    const pag1File = fs.readdirSync(paginasDir).find((f) => /^PAG1\.(jpe?g|png|webp|avif)$/i.test(f));
    if (!pag1File) return;

    fs.mkdirSync(capaDir, { recursive: true });
    const existingImages = fs.readdirSync(capaDir).filter((f) => IMAGE_RE.test(f));
    if (existingImages.length > 0) {
        console.log(`Pulado: ${relChapter} (já possui capa)`);
        return;
    }

    const pag1Path = path.join(paginasDir, pag1File);
    const destPath = path.join(capaDir, 'capa-provisoria.png');
    const relDest = `${relChapter}/Capa/capa-provisoria.png`;

    const background = await sharp(pag1Path)
        .resize(720, 1280, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();

    const svg = buildSvgOverlay(chapterNum);

    await sharp(background)
        .composite([{ input: Buffer.from(svg, 'utf8') }])
        .png()
        .toFile(destPath);

    console.log(`Gerada: ${relDest}`);
}

async function main() {
    if (!fs.existsSync(SPIN_OFFS_DIR)) return;

    const spinOffs = fs.readdirSync(SPIN_OFFS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory());

    for (const spinOff of spinOffs) {
        const spinOffPath = path.join(SPIN_OFFS_DIR, spinOff.name);
        const entries = fs.readdirSync(spinOffPath, { withFileTypes: true })
            .filter((d) => d.isDirectory());

        const chapters = [];
        for (const entry of entries) {
            const match = entry.name.match(/^Capitulo\s+(\d+)$/i);
            if (match) {
                chapters.push({
                    name: entry.name,
                    number: Number(match[1]),
                });
            }
        }

        chapters.sort((a, b) => a.number - b.number);

        for (const ch of chapters) {
            await processChapter(spinOff.name, ch.name, ch.number);
        }
    }
}

main().catch((err) => {
    console.error('Erro ao gerar capas provisórias:', err);
    process.exitCode = 1;
});
