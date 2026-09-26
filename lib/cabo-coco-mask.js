// ============================================================================
// Gera assets/Personagens/cabo-coco.png: cópia RGBA com o fundo branco removido
// por flood fill a partir das bordas, recortada pelo bounding box.
//
// Implementado com buffers tipados (Uint8Array) — a versão anterior criava um
// objeto JS por pixel (8,5M objetos numa arte 1750x2432) e estourava a memória.
// ============================================================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets', 'Personagens', 'Cabo Côco.png');
const FALLBACK_SOURCE = path.join(ROOT, 'assets', 'Capitulo 5', 'Paginas', 'CAP5 PAG5.png');
const OUTPUT = path.join(ROOT, 'assets', 'Personagens', 'cabo-coco.png');

const LIGHT_THRESHOLD = 220;
const MIN_RUN = 5; // pixels "sólidos" mínimos para uma linha/coluna não ser descartada

// ------------------------------------------------------------------- PNG read
const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([length, typeBuf, data, crc]);
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

/** Decodifica o PNG para RGBA (Uint8Array width*height*4). */
function decodePng(fileBuffer) {
    if (!fileBuffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error('Arquivo não é um PNG válido.');
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let colorType = 0;
    let palette = null;
    let transparency = null;
    const idat = [];

    while (offset < fileBuffer.length) {
        const length = fileBuffer.readUInt32BE(offset);
        const type = fileBuffer.toString('ascii', offset + 4, offset + 8);
        const data = fileBuffer.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            if (data[8] !== 8) throw new Error(`Profundidade de bits não suportada: ${data[8]}`);
            colorType = data[9];
            if (data[12] !== 0) throw new Error(`Interlace não suportado: ${data[12]}`);
        } else if (type === 'PLTE') {
            palette = data;
        } else if (type === 'tRNS') {
            transparency = data;
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
    }

    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
    if (!channels) throw new Error(`Color type não suportado: ${colorType}`);

    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = 1 + width * channels;
    const pixels = new Uint8Array(height * stride);

    for (let y = 0; y < height; y++) {
        const filter = raw[y * stride];
        pixels[y * stride] = filter;
        for (let x = 0; x < width * channels; x++) {
            const index = y * stride + 1 + x;
            const value = raw[index];
            const left = x >= channels ? pixels[index - channels] : 0;
            const up = y > 0 ? pixels[index - stride] : 0;
            const upLeft = y > 0 && x >= channels ? pixels[index - stride - channels] : 0;

            let result = value;
            if (filter === 1) result = (value + left) & 0xff;
            else if (filter === 2) result = (value + up) & 0xff;
            else if (filter === 3) result = (value + ((left + up) >> 1)) & 0xff;
            else if (filter === 4) result = (value + paeth(left, up, upLeft)) & 0xff;
            pixels[index] = result;
        }
    }

    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const src = y * stride + 1 + x * channels;
            const dst = (y * width + x) * 4;
            if (colorType === 6) {
                rgba[dst] = pixels[src];
                rgba[dst + 1] = pixels[src + 1];
                rgba[dst + 2] = pixels[src + 2];
                rgba[dst + 3] = pixels[src + 3];
            } else if (colorType === 2) {
                rgba[dst] = pixels[src];
                rgba[dst + 1] = pixels[src + 1];
                rgba[dst + 2] = pixels[src + 2];
                rgba[dst + 3] = 255;
            } else if (colorType === 3) {
                const entry = pixels[src] * 3;
                rgba[dst] = palette[entry];
                rgba[dst + 1] = palette[entry + 1];
                rgba[dst + 2] = palette[entry + 2];
                rgba[dst + 3] = transparency && pixels[src] < transparency.length ? transparency[pixels[src]] : 255;
            } else if (colorType === 4) {
                const grey = pixels[src];
                rgba[dst] = grey;
                rgba[dst + 1] = grey;
                rgba[dst + 2] = grey;
                rgba[dst + 3] = pixels[src + 1];
            } else {
                const grey = pixels[src];
                rgba[dst] = grey;
                rgba[dst + 1] = grey;
                rgba[dst + 2] = grey;
                rgba[dst + 3] = 255;
            }
        }
    }

    return { width, height, rgba };
}

// ---------------------------------------------------------------- processing
/** Remove o fundo claro conectado às bordas (flood fill) e recorta o bbox. */
function removeWhiteBackground({ width, height, rgba }) {
    const isLight = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
        if (rgba[i] > LIGHT_THRESHOLD && rgba[i + 1] > LIGHT_THRESHOLD && rgba[i + 2] > LIGHT_THRESHOLD && rgba[i + 3] > 0) {
            isLight[p] = 1;
        }
    }

    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const enqueue = (x, y) => {
        const p = y * width + x;
        if (!visited[p] && isLight[p]) {
            visited[p] = 1;
            queue[tail++] = p;
        }
    };

    for (let x = 0; x < width; x++) {
        enqueue(x, 0);
        enqueue(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        enqueue(0, y);
        enqueue(width - 1, y);
    }

    while (head < tail) {
        const p = queue[head++];
        const x = p % width;
        const y = (p - x) / width;
        if (x > 0) enqueue(x - 1, y);
        if (x < width - 1) enqueue(x + 1, y);
        if (y > 0) enqueue(x, y - 1);
        if (y < height - 1) enqueue(x, y + 1);
    }

    const rowCounts = new Int32Array(height);
    const colCounts = new Int32Array(width);
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = y * width + x;
            const offset = p * 4;
            if (isLight[p]) rgba[offset + 3] = 0; // fundo e brancos internos viram transparentes
            if (rgba[offset + 3] > 0) {
                rowCounts[y]++;
                colCounts[x]++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    while (minX <= maxX && colCounts[minX] < MIN_RUN) minX++;
    while (maxX >= minX && colCounts[maxX] < MIN_RUN) maxX--;
    while (minY <= maxY && rowCounts[minY] < MIN_RUN) minY++;
    while (maxY >= minY && rowCounts[maxY] < MIN_RUN) maxY--;

    if (maxX < minX || maxY < minY) return { width, height, rgba };

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const cropped = new Uint8Array(cropWidth * cropHeight * 4);
    for (let y = 0; y < cropHeight; y++) {
        const from = ((minY + y) * width + minX) * 4;
        cropped.set(rgba.subarray(from, from + cropWidth * 4), y * cropWidth * 4);
    }
    return { width: cropWidth, height: cropHeight, rgba: cropped };
}

function encodePng({ width, height, rgba }) {
    const stride = 1 + width * 4;
    const rawBuffer = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y++) {
        rawBuffer[y * stride] = 0; // filtro None: mantém o encode simples e previsível
        Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(rawBuffer, y * stride + 1);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6; // RGBA

    return Buffer.concat([
        PNG_SIGNATURE,
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(rawBuffer, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/** true quando o PNG tem pelo menos um pixel totalmente transparente. */
function hasTransparency(png) {
    try {
        const { rgba } = decodePng(png);
        for (let i = 3; i < rgba.length; i += 4) if (rgba[i] === 0) return true;
        return false;
    } catch {
        return false;
    }
}

/**
 * Garante que assets/Personagens/cabo-coco.png exista e seja transparente.
 * Só reescreve o arquivo quando o conteúdo muda de fato.
 */
function ensureCaboCocoMask({ force = false, quiet = false } = {}) {
    const source = fs.existsSync(SOURCE) ? SOURCE : FALLBACK_SOURCE;
    if (!fs.existsSync(source)) {
        throw new Error('Arte fonte do Cabo Côco não encontrada.');
    }

    const stampFile = path.join(path.dirname(OUTPUT), '.cabo-coco-meta.json');
    const signature = require('node:crypto').createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    let stamp;
    try { stamp = JSON.parse(fs.readFileSync(stampFile, 'utf8')); } catch {}
    if (!force && stamp?.source === signature && fs.existsSync(OUTPUT) && hasTransparency(fs.readFileSync(OUTPUT))) {
        if (!quiet) console.log('✅ Máscara do Cabo Côco já está pronta (cache).');
        return OUTPUT;
    }

    const decoded = decodePng(fs.readFileSync(source));
    const processed = removeWhiteBackground(decoded);
    const png = encodePng(processed);

    const previous = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT) : null;
    if (previous && previous.equals(png)) {
        if (!quiet) console.log('✅ Máscara do Cabo Côco inalterada.');
        fs.writeFileSync(stampFile, JSON.stringify({ source: signature }));
        return OUTPUT;
    }

    fs.writeFileSync(OUTPUT, png);
    fs.writeFileSync(stampFile, JSON.stringify({ source: signature }));
    if (!quiet) {
        console.log(`✅ Máscara do Cabo Côco gerada: ${processed.width}x${processed.height}, ${png.length} bytes.`);
    }
    return OUTPUT;
}

module.exports = { ensureCaboCocoMask, decodePng, removeWhiteBackground, encodePng, hasTransparency, OUTPUT, SOURCE };

if (require.main === module) {
    ensureCaboCocoMask({ force: process.argv.includes('--force') });
}
