// Empacota a Netlify Function (netlify/functions-src/api.mjs + api/ + dependências)
// num arquivo único: netlify/functions/api.mjs. O empacotador do próprio Netlify
// deixava de fora pacotes carregados com require() dentro da function (502
// "Cannot find module"); assim a function não depende de node_modules no servidor.
// Roda no `npm run build:deploy`. O arquivo gerado fica fora do git.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const raiz = fileURLToPath(new URL('..', import.meta.url));

// Capítulos que existem (para os comentários): a Function não tem o catálogo,
// então a lista entra no código na hora do build (api/comentarios.js).
const catalogo = JSON.parse(readFileSync(`${raiz}data/database.json`, 'utf8'));
const capitulos = catalogo.comics.flatMap((c) => (c.chapters || []).map((cap) => `${c.id}/${cap.id}`));

await build({
    entryPoints: [`${raiz}netlify/functions-src/api.mjs`],
    outfile: `${raiz}netlify/functions/api.mjs`,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    // Pacotes CommonJS dentro de um módulo ESM precisam de um require de verdade.
    banner: { js: "import { createRequire as __criarRequire } from 'node:module'; const require = __criarRequire(import.meta.url);" },
    define: { 'process.env.ENZO_CAPITULOS': JSON.stringify(JSON.stringify(capitulos)) },
    logLevel: 'warning',
});
console.log('⚙️  netlify/functions/api.mjs empacotada.');
