// Batalha dos Torados: empacota a batalha numa página só (para publicar como Artifact no claude.ai).
//
// Link fixo (republicar sempre no mesmo): https://claude.ai/artifact/VUPMuaHWcGXx732Y22wE47
// Uso: node tools/batalha-artifact.mjs <pasta-de-saída>
// Gera <saída>/batalha.html (CSS e JS embutidos), <saída>/cartas/*.webp (arte, menor versão web) e
// <saída>/files.json (o mapa para o `files` do Artifact, com `root` = <saída>).
// Imagens de assets/Batalha/ que já existirem vão junto; as que faltam ficam no placeholder.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saida = path.resolve(process.argv[2] || path.join(ROOT, 'dist-artifact'));
fs.mkdirSync(path.join(saida, 'cartas'), { recursive: true });

const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const imagens = JSON.parse(ler('data/images.json'));

// Só a arte das cartas e da batalha, com a menor variante web.
const siteImages = {};
for (const [original, info] of Object.entries(imagens)) {
    if (!/^assets\/(Cartas|Batalha)\//.test(original)) continue;
    const menor = info.variants[0];
    const destino = `cartas/${path.basename(menor.src)}`;
    fs.copyFileSync(path.join(ROOT, menor.src), path.join(saida, destino));
    siteImages[original] = { width: info.width, height: info.height, variants: [{ width: menor.width, src: destino }] };
}

const js = ['js/baralho-dados.js', 'js/baralho.js', 'js/tcg-cartas.js', 'js/tcg-regras.js', 'js/tcg-robo.js', 'js/batalha.js']
    .map((f) => `<script>/* ${f} */\n${ler(f).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');

const html = `<meta charset="utf-8">
<title>Batalha dos Torados</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Luckiest+Guy&display=swap" rel="stylesheet">
<style>
${ler('css/style.css')}
${ler('css/batalha.css')}
/* Artifact: sem o cabeçalho do site */
:root { color-scheme: dark; }
html, body { background: #121212; }
.bt-mesa, .batalha { min-height: 100dvh; }
</style>
<div class="pagina-batalha">
<main id="batalha" class="batalha" aria-label="Batalha dos Torados"></main>
</div>
<script>
window.SiteImages = ${JSON.stringify(siteImages)};
window.siteImageUrl = (s) => window.SiteImages?.[s]?.variants[0].src || s;
</script>
${js}
`;
fs.writeFileSync(path.join(saida, 'batalha.html'), html);
// Mapa pronto para o parâmetro `files` da ferramenta Artifact.
const arquivos = Object.fromEntries(Object.values(siteImages).map((i) => [i.variants[0].src, i.variants[0].src]));
fs.writeFileSync(path.join(saida, 'files.json'), JSON.stringify(arquivos, null, 1));
console.log(`${saida}/batalha.html (${(html.length / 1024).toFixed(0)} KB) + ${Object.keys(siteImages).length} imagens`);
