// Empacota a Netlify Function (netlify/functions-src/api.mjs + api/ + dependências)
// num arquivo único: netlify/functions/api.mjs. O empacotador do próprio Netlify
// deixava de fora pacotes carregados com require() dentro da function (502
// "Cannot find module"); assim a function não depende de node_modules no servidor.
// Roda no `npm run build:deploy`. O arquivo gerado fica fora do git.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));

await build({
    entryPoints: [`${raiz}netlify/functions-src/api.mjs`],
    outfile: `${raiz}netlify/functions/api.mjs`,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    // Pacotes CommonJS dentro de um módulo ESM precisam de um require de verdade.
    banner: { js: "import { createRequire as __criarRequire } from 'node:module'; const require = __criarRequire(import.meta.url);" },
    logLevel: 'warning',
});
console.log('⚙️  netlify/functions/api.mjs empacotada.');
