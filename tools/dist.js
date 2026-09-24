// Monta dist/ com o que o site publica (Netlify e outros hosts estáticos).
// Mesmas regras do server.js: páginas .html da raiz, css/, js/, assets/ e o
// catálogo gerado (data/database.json e data/images.json). Nada de docs,
// testes, ferramentas, output/ ou node_modules.
// Uso: node atualizar.js && node tools/dist.js
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });

for (const nome of fs.readdirSync(ROOT)) {
    if (/^[a-z0-9-]+\.html$/.test(nome)) fs.copyFileSync(path.join(ROOT, nome), path.join(DIST, nome));
}
for (const pasta of ['css', 'js', 'assets']) {
    fs.cpSync(path.join(ROOT, pasta), path.join(DIST, pasta), {
        recursive: true,
        filter: (origem) => !path.basename(origem).startsWith('.'),
    });
}
for (const arquivo of ['database.json', 'images.json']) {
    const origem = path.join(ROOT, 'data', arquivo);
    if (!fs.existsSync(origem)) throw new Error(`Falta data/${arquivo}: rode "node atualizar.js" antes.`);
    fs.copyFileSync(origem, path.join(DIST, 'data', arquivo));
}

const paginas = fs.readdirSync(DIST).filter((nome) => nome.endsWith('.html'));
console.log(`📦 dist/ pronto: ${paginas.length} páginas (${paginas.join(', ')}), css, js, assets e catálogo.`);
