const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const writeChanged = (file, value) => {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === value) return;
    fs.writeFileSync(`${file}.tmp`, value);
    fs.renameSync(`${file}.tmp`, file);
};
async function buildImages() {
    const out = path.join(ROOT, 'assets/web');
    fs.mkdirSync(out, { recursive: true });
    const sources = [];
    function walk(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, item.name);
            const rel = path.relative(ROOT, file).replaceAll('\\', '/');
            if (item.name === 'web' || item.name.startsWith('.') || rel === 'assets/flappy/game' || rel === 'assets/flappy/originais' || rel === 'assets/ronda') continue;
            if (item.isDirectory()) walk(file);
            else if (/\.(png|jpe?g)$/i.test(item.name)) sources.push(file);
        }
    }
    walk(path.join(ROOT, 'assets'));
    const images = {};
    for (const file of sources.sort()) {
        const source = fs.readFileSync(file);
        const relative = path.relative(ROOT, file).replaceAll('\\', '/');
        const meta = await sharp(source).metadata();
        const hash = crypto.createHash('sha256').update(source).update('web-v1-q84').digest('hex').slice(0, 16);
        const widths = [...new Set([Math.min(640, meta.width), Math.min(1280, meta.width), Math.min(2000, meta.width)])];
        const variants = [];
        for (const width of widths) {
            const name = `${hash}-${width}.webp`;
            if (!fs.existsSync(path.join(out, name))) {
                await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toFile(path.join(out, name));
            }
            variants.push({ width, src: `assets/web/${name}`, bytes: fs.statSync(path.join(out, name)).size });
        }
        images[relative] = { width: meta.width, height: meta.height, variants };
    }
    writeChanged(path.join(ROOT, 'data/images.json'), JSON.stringify(images, null, 2) + '\n');
    writeChanged(path.join(ROOT, 'js/images.generated.js'), `window.SiteImages = ${JSON.stringify(images)};\n`);
    // Static image markup keeps its source reference for subsequent builds.
    for (const name of ['index.html', 'personagens.html', 'degustador.html']) {
        const file = path.join(ROOT, name);
        let html = fs.readFileSync(file, 'utf8');
        html = html.replace(/<img\b[^>]*>/g, tag => {
            const original = (tag.match(/data-original="([^"]+)"/) || tag.match(/src="([^"]+)"/))?.[1]?.split('?')[0];
            const info = images[original];
            if (!info || /qrcode|cursor/i.test(original)) return tag;
            const sizes = tag.match(/\ssizes="([^"]+)"/)?.[1] || '(max-width: 600px) 90vw, 420px';
            tag = tag.replace(/\s(?:src|srcset|sizes|width|height|data-original)="[^"]*"/g, '');
            const srcset = info.variants.map(v => `${v.src} ${v.width}w`).join(', ');
            return tag.replace('<img', `<img data-original="${original}" src="${info.variants[0].src}" srcset="${srcset}" sizes="${sizes}" width="${info.width}" height="${info.height}"`);
        });
        // The spin-off background uses the same small cover as the visible card.
        if (name === 'degustador.html') {
            const cover = Object.entries(images).find(([key]) => key.includes('Spin Offs/') && key.includes('/Capa/'));
            if (cover) html = html.replace(/(<div class="hero-bg" style=")[^"]*(")/, `$1background-image: url('${cover[1].variants[0].src}'); background-position: center 25%;$2`);
        }
        writeChanged(file, html);
    }
    const css = [
        ['.glitch-card .comic-cover-wrapper::after', 'assets/eye.jpg'],
        ['.macaroni-wipe', 'assets/macaroni_meatballs.jpg'],
    ].map(([selector, source]) => `${selector} { background-image: url('../${images[source].variants[0].src}'); }`).join('\n');
    writeChanged(path.join(ROOT, 'css/images.generated.css'), css + '\n');
    console.log(`Imagens web: ${sources.length} originais preservados; variantes com hash e dimensões atualizadas.`);
    return images;
}
module.exports = { buildImages, writeChanged };
