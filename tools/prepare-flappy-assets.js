// Prepara os sprites recortados e redimensionados para o jogo Flappy Enzo.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ORIGINAIS_DIR = path.join(ROOT, 'assets/flappy/originais');
const GAME_DIR = path.join(ROOT, 'assets/flappy/game');
const ALPHA_THRESHOLD = 16;

/**
 * Encontra a bounding box justa de pixels com alfa > limiar.
 */
function getVisibleBBox(data, width, height, channels = 4, threshold = ALPHA_THRESHOLD) {
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const a = data[(y * width + x) * channels + 3];
            if (a > threshold) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX === -1) return null;
    return {
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
    };
}

/**
 * Identifica grupos de colunas correspondentes a objetos visíveis.
 * Filtra ruídos/artefatos isolados para identificar os talheres reais.
 */
function detectUtensilColumnGroups(data, width, height, channels = 4, threshold = ALPHA_THRESHOLD) {
    const colCounts = new Array(width).fill(0);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * channels + 3] > threshold) {
                colCounts[x]++;
            }
        }
    }

    const groups = [];
    let inGroup = false;
    let start = 0;
    let totalPixels = 0;

    for (let x = 0; x < width; x++) {
        if (colCounts[x] > 0) {
            if (!inGroup) {
                inGroup = true;
                start = x;
                totalPixels = 0;
            }
            totalPixels += colCounts[x];
        } else if (inGroup) {
            inGroup = false;
            groups.push({ start, end: x - 1, width: x - start, totalPixels });
        }
    }
    if (inGroup) {
        groups.push({ start, end: width - 1, width: width - start, totalPixels });
    }

    // Filtra artefatos espúrios exigindo largura e volume de pixels expressivos
    return groups.filter((g) => g.width >= 20 && g.totalPixels >= 100);
}

/**
 * Delimita a bounding box vertical de um talher dentro de sua faixa de colunas.
 */
function getUtensilBBox(data, width, height, startX, endX, channels = 4, threshold = ALPHA_THRESHOLD) {
    let minY = height;
    let maxY = -1;

    for (let x = startX; x <= endX; x++) {
        for (let y = 0; y < height; y++) {
            const a = data[(y * width + x) * channels + 3] > threshold;
            if (a) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    return {
        left: startX,
        top: minY,
        width: endX - startX + 1,
        height: maxY - minY + 1,
    };
}

async function prepareAssets() {
    const originais = ['enzo.png', 'macarronada.png', 'talheres.png'];
    for (const file of originais) {
        if (!fs.existsSync(path.join(ORIGINAIS_DIR, file))) {
            console.error(`Erro: Arquivo original não encontrado: ${file}`);
            process.exitCode = 1;
            return;
        }
    }

    fs.mkdirSync(GAME_DIR, { recursive: true });

    // 1. Personagem: Enzo (largura 168 px)
    const enzoSrc = path.join(ORIGINAIS_DIR, 'enzo.png');
    const enzoRaw = await sharp(enzoSrc).raw().toBuffer({ resolveWithObject: true });
    const enzoBBox = getVisibleBBox(enzoRaw.data, enzoRaw.info.width, enzoRaw.info.height);
    if (!enzoBBox) {
        console.error('Erro: Nenhum pixel visível encontrado em enzo.png');
        process.exitCode = 1;
        return;
    }
    const enzoWidth = 168;
    const enzoHeight = Math.round(enzoBBox.height * (enzoWidth / enzoBBox.width));
    const enzoDest = path.join(GAME_DIR, 'enzo.png');
    await sharp(enzoSrc)
        .extract(enzoBBox)
        .resize(enzoWidth, enzoHeight)
        .png()
        .toFile(enzoDest);

    // 2. Macarronada (largura 192 px)
    const macSrc = path.join(ORIGINAIS_DIR, 'macarronada.png');
    const macRaw = await sharp(macSrc).raw().toBuffer({ resolveWithObject: true });
    const macBBox = getVisibleBBox(macRaw.data, macRaw.info.width, macRaw.info.height);
    if (!macBBox) {
        console.error('Erro: Nenhum pixel visível encontrado em macarronada.png');
        process.exitCode = 1;
        return;
    }
    const macWidth = 192;
    const macHeight = Math.round(macBBox.height * (macWidth / macBBox.width));
    const macDest = path.join(GAME_DIR, 'macarronada.png');
    await sharp(macSrc)
        .extract(macBBox)
        .resize(macWidth, macHeight)
        .png()
        .toFile(macDest);

    // 3. Talheres: faca (esquerda) e garfo (direita)
    const talheresSrc = path.join(ORIGINAIS_DIR, 'talheres.png');
    const talheresRaw = await sharp(talheresSrc).raw().toBuffer({ resolveWithObject: true });
    const groups = detectUtensilColumnGroups(
        talheresRaw.data,
        talheresRaw.info.width,
        talheresRaw.info.height,
    );

    if (groups.length !== 2) {
        console.error(`Erro: Esperava encontrar exatamente 2 objetos em talheres.png, mas foram detectados ${groups.length}.`);
        process.exitCode = 1;
        return;
    }

    // Ordenados da esquerda para a direita: faca e garfo
    groups.sort((a, b) => a.start - b.start);
    const facaBBox = getUtensilBBox(
        talheresRaw.data,
        talheresRaw.info.width,
        talheresRaw.info.height,
        groups[0].start,
        groups[0].end,
    );
    const garfoBBox = getUtensilBBox(
        talheresRaw.data,
        talheresRaw.info.width,
        talheresRaw.info.height,
        groups[1].start,
        groups[1].end,
    );

    // Fator de escala comum: o mais largo fica com 192 px de largura
    const maxUtensilWidth = Math.max(facaBBox.width, garfoBBox.width);
    const scale = 192 / maxUtensilWidth;

    const talheresConfigs = [
        { nome: 'faca', bbox: facaBBox },
        { nome: 'garfo', bbox: garfoBBox },
    ];

    const talheresInfo = {};

    for (const item of talheresConfigs) {
        const sw = Math.round(item.bbox.width * scale);
        const sh = Math.round(item.bbox.height * scale);

        // Imagem inteira redimensionada em memória
        const scaledBuffer = await sharp(talheresSrc)
            .extract(item.bbox)
            .resize(sw, sh)
            .png()
            .toBuffer();

        // Ponta: do topo até 55% da altura
        const pontaHeight = Math.round(sh * 0.55);
        const pontaDest = path.join(GAME_DIR, `${item.nome}-ponta.png`);
        await sharp(scaledBuffer)
            .extract({ left: 0, top: 0, width: sw, height: pontaHeight })
            .png()
            .toFile(pontaDest);

        // Cabo: fatia de 8 px de altura começando em 62% da altura
        const caboTop = Math.round(sh * 0.62);
        const caboHeight = 8;
        const caboDest = path.join(GAME_DIR, `${item.nome}-cabo.png`);
        const caboRaw = await sharp(scaledBuffer)
            .extract({ left: 0, top: caboTop, width: sw, height: caboHeight })
            .raw()
            .toBuffer({ resolveWithObject: true });

        await sharp(caboRaw.data, {
            raw: { width: sw, height: caboHeight, channels: 4 },
        })
            .png()
            .toFile(caboDest);

        // Largura visível do cabo na linha do meio
        const midRow = Math.floor(caboHeight / 2);
        let larguraVisivelCabo = 0;
        for (let x = 0; x < sw; x++) {
            if (caboRaw.data[(midRow * sw + x) * 4 + 3] > ALPHA_THRESHOLD) {
                larguraVisivelCabo++;
            }
        }

        talheresInfo[item.nome] = {
            ponta: {
                arquivo: `assets/flappy/game/${item.nome}-ponta.png`,
                largura: sw,
                altura: pontaHeight,
            },
            cabo: {
                arquivo: `assets/flappy/game/${item.nome}-cabo.png`,
                largura: sw,
                altura: caboHeight,
            },
            larguraVisivelCabo,
        };
    }

    // 4. Metadados sprites.json
    const sprites = {
        enzo: {
            arquivo: 'assets/flappy/game/enzo.png',
            largura: enzoWidth,
            altura: enzoHeight,
        },
        macarronada: {
            arquivo: 'assets/flappy/game/macarronada.png',
            largura: macWidth,
            altura: macHeight,
        },
        faca: talheresInfo.faca,
        garfo: talheresInfo.garfo,
    };

    const spritesJsonDest = path.join(GAME_DIR, 'sprites.json');
    fs.writeFileSync(spritesJsonDest, JSON.stringify(sprites, null, 2) + '\n');

    // Imprime resumo com nome e tamanho de cada arquivo gerado
    const generatedFiles = [
        'enzo.png',
        'macarronada.png',
        'faca-ponta.png',
        'faca-cabo.png',
        'garfo-ponta.png',
        'garfo-cabo.png',
        'sprites.json',
    ];

    for (const name of generatedFiles) {
        const fullPath = path.join(GAME_DIR, name);
        const stats = fs.statSync(fullPath);
        console.log(`${name}: ${stats.size} bytes`);
    }
}

prepareAssets().catch((err) => {
    console.error('Erro inesperado:', err);
    process.exitCode = 1;
});
