// ============================================================================
// Testes da biblioteca de máscara do Cabo Côco (decodificação/transparência).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const mask = require('../lib/cabo-coco-mask.js');

const OUTPUT = path.join(__dirname, '..', 'assets', 'Personagens', 'cabo-coco.png');

test('máscara gerada existe e é um PNG válido', () => {
    assert.ok(fs.existsSync(OUTPUT), 'assets/Personagens/cabo-coco.png precisa existir (rode npm run build)');
    const buffer = fs.readFileSync(OUTPUT);
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'assinatura PNG');
});

test('máscara tem pixels transparentes (não é cópia opaca do original)', () => {
    const buffer = fs.readFileSync(OUTPUT);
    assert.equal(mask.hasTransparency(buffer), true);
});

test('máscara é RGBA e tem fundo removido (bordas com transparência)', () => {
    const { width, height, rgba } = mask.decodePng(fs.readFileSync(OUTPUT));
    const alphaAt = (x, y) => rgba[(y * width + x) * 4 + 3];

    // O recorte é justo: nem toda borda é transparente, mas uma fração
    // relevante das bordas precisa ser (senão a remoção de fundo não rodou).
    let transparentEdges = 0;
    let totalEdges = 0;
    for (let x = 0; x < width; x++) {
        for (const y of [0, height - 1]) {
            totalEdges++;
            if (alphaAt(x, y) === 0) transparentEdges++;
        }
    }
    const ratio = transparentEdges / totalEdges;
    assert.ok(ratio > 0.05, `esperava bordas parcialmente transparentes, obteve ${(ratio * 100).toFixed(1)}%`);
});

test('decodePng rejeita arquivo que não é PNG', () => {
    assert.throws(() => mask.decodePng(Buffer.from('nao sou um png')), /PNG/);
});

test('encode/decode é reversível (roundtrip RGBA)', () => {
    const width = 4;
    const height = 3;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < rgba.length; i++) rgba[i] = (i * 17) % 256;

    const png = mask.encodePng({ width, height, rgba });
    const decoded = mask.decodePng(png);

    assert.equal(decoded.width, width);
    assert.equal(decoded.height, height);
    assert.deepEqual([...decoded.rgba], [...rgba]);
});

test('removeWhiteBackground ignora branco cercado pela arte (flood fill por borda)', () => {
    // 3x3: borda branca, centro preto com um pixel branco interno.
    const width = 3;
    const height = 3;
    const rgba = new Uint8Array(width * height * 4).fill(255);
    const set = (x, y, [r, g, b, a]) => {
        const offset = (y * width + x) * 4;
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = a;
    };
    set(1, 1, [0, 0, 0, 255]);

    const result = mask.removeWhiteBackground({ width, height, rgba: Uint8Array.from(rgba) });
    const alphaAt = (x, y) => result.rgba[(y * width + x) * 4 + 3];

    assert.equal(alphaAt(0, 0), 0, 'borda branca vira transparente');
    assert.equal(alphaAt(2, 2), 0, 'borda branca vira transparente');
});

test('zlib: PNG gerado pode ser reinflado (IDAT consistente)', () => {
    const png = mask.encodePng({ width: 2, height: 1, rgba: new Uint8Array(8).fill(128) });
    let offset = 8;
    let sawIdat = false;
    while (offset < png.length) {
        const length = png.readUInt32BE(offset);
        const type = png.toString('ascii', offset + 4, offset + 8);
        if (type === 'IDAT') {
            const data = png.subarray(offset + 8, offset + 8 + length);
            assert.doesNotThrow(() => zlib.inflateSync(data));
            sawIdat = true;
        }
        offset += 12 + length;
    }
    assert.equal(sawIdat, true, 'o PNG precisa conter um chunk IDAT');
});

test('removeWhiteBackground mantém o branco cercado pela arte', () => {
    // 5x5: fundo branco, anel preto 3x3 e um pixel branco no meio do anel.
    const width = 5;
    const height = 5;
    const rgba = new Uint8Array(width * height * 4).fill(255);
    for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
            if (x === 2 && y === 2) continue;
            rgba.set([0, 0, 0, 255], (y * width + x) * 4);
        }
    }
    const result = mask.removeWhiteBackground({ width, height, rgba });
    const meio = (result.width - 1) / 2;
    const centro = (meio * result.width + meio) * 4;
    assert.equal(result.rgba[3], 0, 'o fundo da borda some');
    assert.deepEqual([...result.rgba.slice(centro, centro + 4)], [255, 255, 255, 255], 'branco interno continua opaco');
});
