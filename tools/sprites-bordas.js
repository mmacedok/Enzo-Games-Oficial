// Confere as bordas dos sprites (Caçada e outros): acha desenho cortado na borda da imagem e
// pedaços soltos perto da borda (sobras do quadro vizinho), que aparecem quando o sprite vira.
// Uso: node tools/sprites-bordas.js [pastas...] [--json saida.json] [--folha pasta-das-folhas]
//   --folha gera, para cada sprite com problema, uma imagem com o original e o espelhado
//   lado a lado, sobre xadrez, com os problemas marcados em vermelho.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const args = process.argv.slice(2);
const opc = { pastas: [], json: null, folha: null };
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') opc.json = args[++i];
    else if (args[i] === '--folha') opc.folha = args[++i];
    else opc.pastas.push(args[i]);
}
if (!opc.pastas.length) {
    opc.pastas = ['degustador', 'chefes', 'inimigos', 'npcs', 'inominavel', 'objetos', 'perigos', 'efeitos', 'ronda']
        .map((p) => path.join('assets', p));
}

const ALFA = 24;            // acima disso o pixel conta como desenho
const PERTO = 6;            // pedaço solto a até 6 px da borda
const PEDACO_MAX = 0.02;    // pedaço solto = menos de 2% do desenho

function pngs(pasta) {
    if (!fs.existsSync(pasta)) return [];
    return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(pasta, d.name);
        if (d.isDirectory()) return pngs(p);
        return /\.png$/i.test(d.name) ? [p] : [];
    });
}

/** Componentes conectados (8 vizinhos) dos pixels com desenho. */
function componentes(opaco, w, h) {
    const rotulo = new Int32Array(w * h).fill(-1);
    const lista = [];
    const fila = new Int32Array(w * h);
    for (let p0 = 0; p0 < w * h; p0++) {
        if (!opaco[p0] || rotulo[p0] >= 0) continue;
        const c = { n: 0, x0: w, y0: h, x1: 0, y1: 0 };
        let ini = 0, fim = 0;
        fila[fim++] = p0; rotulo[p0] = lista.length;
        while (ini < fim) {
            const p = fila[ini++];
            const x = p % w, y = (p - x) / w;
            c.n++;
            if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
            if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const q = ny * w + nx;
                if (opaco[q] && rotulo[q] < 0) { rotulo[q] = lista.length; fila[fim++] = q; }
            }
        }
        lista.push(c);
    }
    return lista;
}

async function conferir(arquivo) {
    const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const opaco = new Uint8Array(w * h);
    let total = 0;
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > ALFA) { opaco[p] = 1; total++; }
    const r = { arquivo: arquivo.replace(/\\/g, '/'), w, h, problemas: [], marcas: [] };
    if (!total) { r.problemas.push('imagem vazia'); return r; }
    // 1) desenho encostando na borda (cortado)
    const borda = { cima: 0, baixo: 0, esquerda: 0, direita: 0 };
    for (let x = 0; x < w; x++) { borda.cima += opaco[x]; borda.baixo += opaco[(h - 1) * w + x]; }
    for (let y = 0; y < h; y++) { borda.esquerda += opaco[y * w]; borda.direita += opaco[y * w + w - 1]; }
    for (const [lado, n] of Object.entries(borda)) {
        if (n >= 2) {
            r.problemas.push(`encosta na borda ${lado} (${n} px)`);
            r.marcas.push(lado === 'cima' ? { x: 0, y: 0, w, h: 3 } : lado === 'baixo' ? { x: 0, y: h - 3, w, h: 3 }
                : lado === 'esquerda' ? { x: 0, y: 0, w: 3, h } : { x: w - 3, y: 0, w: 3, h });
        }
    }
    // 2) corte reto: a coluna/linha mais de fora do desenho tem muitos pixels (faca de recorte),
    //    mesmo com margem transparente depois (recorte feito antes de pôr a margem)
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (opaco[y * w + x]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const conta = (fixo, vertical) => {
        let n = 0;
        for (let i = 0; i < (vertical ? h : w); i++) n += vertical ? opaco[i * w + fixo] : opaco[fixo * w + i];
        return n;
    };
    const lados = [['esquerda', x0, true], ['direita', x1, true], ['cima', y0, false], ['baixo', y1, false]];
    for (const [lado, pos, vertical] of lados) {
        const naBorda = pos === 0 || pos === (vertical ? w - 1 : h - 1);
        const n = conta(pos, vertical);
        const minimo = Math.max(8, Math.round((vertical ? y1 - y0 : x1 - x0) * 0.15));
        if (!naBorda && n >= minimo && lado !== 'baixo') {
            r.problemas.push(`corte reto na ${lado} (${n} px na coluna/linha ${pos})`);
            r.marcas.push(vertical ? { x: pos - 1, y: 0, w: 3, h } : { x: 0, y: pos - 1, w, h: 3 });
        }
    }
    // 3) pedaços soltos pequenos perto da borda
    for (const c of componentes(opaco, w, h)) {
        const pequeno = c.n < total * PEDACO_MAX;
        const pertoDaBorda = c.x0 < PERTO || c.y0 < PERTO || c.x1 >= w - PERTO || c.y1 >= h - PERTO;
        if (pequeno && pertoDaBorda && c.n >= 3) {
            r.problemas.push(`pedaço solto de ${c.n} px em x ${c.x0}-${c.x1}, y ${c.y0}-${c.y1}`);
            r.marcas.push({ x: c.x0 - 2, y: c.y0 - 2, w: c.x1 - c.x0 + 5, h: c.y1 - c.y0 + 5 });
        }
    }
    r.margem = { cima: null };
    return r;
}

/** Original + espelhado sobre xadrez, com os problemas em vermelho. */
async function folha(r, pasta) {
    const { w, h } = r;
    const xadrez = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2 + 12}" height="${h}">
        <defs><pattern id="x" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#ddd"/><rect width="8" height="8" fill="#aaa"/><rect x="8" y="8" width="8" height="8" fill="#aaa"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#x)"/><rect x="${w}" width="12" height="${h}" fill="#222"/></svg>`);
    const marcas = (espelho) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${r.marcas.map((m) => {
        const x = espelho ? w - m.x - m.w : m.x;
        return `<rect x="${x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="none" stroke="red" stroke-width="2"/>`;
    }).join('')}</svg>`);
    const orig = await sharp(r.arquivo).ensureAlpha().png().toBuffer();
    const esp = await sharp(r.arquivo).ensureAlpha().flop().png().toBuffer();
    const nome = r.arquivo.replace(/^assets\//, '').replace(/[\\/]/g, '__');
    await sharp(xadrez).composite([
        { input: orig, left: 0, top: 0 }, { input: marcas(false), left: 0, top: 0 },
        { input: esp, left: w + 12, top: 0 }, { input: marcas(true), left: w + 12, top: 0 },
    ]).png().toFile(path.join(pasta, nome));
}

(async () => {
    const arquivos = opc.pastas.flatMap(pngs);
    const resultados = [];
    for (const a of arquivos) resultados.push(await conferir(a));
    const ruins = resultados.filter((r) => r.problemas.length);
    if (opc.folha) {
        fs.mkdirSync(opc.folha, { recursive: true });
        for (const r of ruins) await folha(r, opc.folha);
    }
    for (const r of ruins) console.log(`${r.arquivo} (${r.w}x${r.h}): ${r.problemas.join('; ')}`);
    console.log(`\n${arquivos.length} sprites conferidos, ${ruins.length} com possível problema.`);
    if (opc.json) fs.writeFileSync(opc.json, JSON.stringify(ruins, null, 1));
})();
