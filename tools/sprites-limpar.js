// Limpa sobras de recorte dos sprites, sem tocar no desenho:
//   1) linhas fantasma: fileiras retas e longas de pixels quase transparentes (alfa 1..60), isoladas
//      (com vazio de um lado), deixadas pela borda da folha de onde o quadro foi recortado;
//   2) pedaços soltos (--pedacos): componentes pequenos (< 2% do desenho) a até 6 px da borda.
// Uso: node tools/sprites-limpar.js [--pedacos] [--ver] arquivo.png ...   (--ver = só mostra)
//      node tools/sprites-limpar.js --pastas degustador chefes ...          (linhas fantasma em pastas de assets/)
// Ver também tools/sprites-bordas.js, que acha os suspeitos.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const FRACO = 60;
const LINHA_MIN = 0.35;     // fileira com pelo menos 35% do lado da imagem
const LINHA_MIN_PX = 50;    // e 50 px (contorno reto de asa ou envelope pequeno fica)
const PERTO = 6;
const PEDACO_MAX = 0.02;

const args = process.argv.slice(2);
const pedacos = args.includes('--pedacos');
const soVer = args.includes('--ver');
let arquivos = args.filter((a) => !a.startsWith('--'));
if (args.includes('--pastas')) {
    const lista = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
        .flatMap((e) => e.isDirectory() ? lista(path.join(d, e.name)) : /\.png$/i.test(e.name) ? [path.join(d, e.name)] : []) : [];
    arquivos = arquivos.flatMap((p) => lista(path.join('assets', p)));
}

function linhasFantasma(data, w, h) {
    const a = (x, y) => data[(y * w + x) * 4 + 3];
    const apagar = new Set();
    const varrer = (n, len, pos, vizinhoVazio) => {
        for (let i = 0; i < n; i++) {
            let ini = 0, run = 0;
            for (let j = 0; j <= len; j++) {
                const fraco = j < len && (() => { const [x, y] = pos(i, j); const v = a(x, y); return v > 0 && v <= FRACO && vizinhoVazio(x, y); })();
                if (fraco) { if (!run) ini = j; run++; continue; }
                if (run >= Math.max(LINHA_MIN_PX, len * LINHA_MIN)) for (let k = ini; k < ini + run; k++) { const [x, y] = pos(i, k); apagar.add(y * w + x); }
                run = 0;
            }
        }
    };
    varrer(w, h, (x, y) => [x, y], (x, y) => x === 0 || x === w - 1 || a(x - 1, y) === 0 || a(x + 1, y) === 0);
    varrer(h, w, (y, x) => [x, y], (x, y) => y === 0 || y === h - 1 || a(x, y - 1) === 0 || a(x, y + 1) === 0);
    return apagar;
}

function pedacosSoltos(data, w, h) {
    const opaco = new Uint8Array(w * h);
    let total = 0;
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 24) { opaco[p] = 1; total++; }
    const visto = new Uint8Array(w * h);
    const apagar = new Set();
    for (let p0 = 0; p0 < w * h; p0++) {
        if (!opaco[p0] || visto[p0]) continue;
        const comp = [p0]; visto[p0] = 1;
        let x0 = w, y0 = h, x1 = 0, y1 = 0;
        for (let i = 0; i < comp.length; i++) {
            const p = comp[i], x = p % w, y = (p - x) / w;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy, q = ny * w + nx;
                if (nx >= 0 && ny >= 0 && nx < w && ny < h && opaco[q] && !visto[q]) { visto[q] = 1; comp.push(q); }
            }
        }
        const perto = x0 < PERTO || y0 < PERTO || x1 >= w - PERTO || y1 >= h - PERTO;
        if (perto && comp.length < total * PEDACO_MAX) {
            // leva junto a franja quase transparente em volta do pedaço
            for (const p of comp) {
                const x = p % w, y = (p - x) / w;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < w && ny < h && !opaco[ny * w + nx]) apagar.add(ny * w + nx);
                }
                apagar.add(p);
            }
        }
    }
    return apagar;
}

(async () => {
    let mexidos = 0;
    for (const arquivo of arquivos) {
        const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const { width: w, height: h } = info;
        const linhas = linhasFantasma(data, w, h);
        const soltos = pedacos ? pedacosSoltos(data, w, h) : new Set();
        const n = new Set([...linhas, ...soltos]).size;
        if (!n) continue;
        mexidos++;
        console.log(`${arquivo.replace(/\\/g, '/')}: ${linhas.size} px de linha fantasma${pedacos ? `, ${soltos.size} px de pedaço solto` : ''}`);
        if (soVer) continue;
        for (const p of [...linhas, ...soltos]) data[p * 4 + 3] = 0;
        const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
        fs.writeFileSync(arquivo, png);
    }
    console.log(`\n${arquivos.length} conferidos, ${mexidos} ${soVer ? 'para limpar' : 'limpos'}.`);
})();
