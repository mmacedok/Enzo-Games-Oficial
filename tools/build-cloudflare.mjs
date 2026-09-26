// Empacota a API para a Cloudflare Pages: cloudflare/worker-src.mjs + api/ +
// dependências viram dist/_worker.js (arquivo único). Também escreve em dist/
// o _routes.json (só /api/* chama o worker) e o _headers (o mesmo cache do
// netlify.toml). Roda depois de `node atualizar.js && node tools/dist.js`.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const raiz = fileURLToPath(new URL('..', import.meta.url));

// Capítulos que existem (para os comentários): igual ao tools/build-function.mjs.
const catalogo = JSON.parse(readFileSync(`${raiz}data/database.json`, 'utf8'));
const capitulos = catalogo.comics.flatMap((c) => (c.chapters || []).map((cap) => `${c.id}/${cap.id}`));

await build({
    entryPoints: [`${raiz}cloudflare/worker-src.mjs`],
    outfile: `${raiz}dist/_worker.js`,
    bundle: true,
    platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'],
    mainFields: ['module', 'main'],
    target: 'es2022',
    format: 'esm',
    // Módulos do Node vêm da própria Cloudflare (flag nodejs_compat no wrangler.toml).
    external: ['node:*'],
    // O código de api/ é CommonJS (require). Um require de verdade só com o que ele usa:
    // node:crypto vem da Cloudflare; fs e path só são lidos quando falta a lista de
    // capítulos, que aqui já vem embutida (define abaixo).
    banner: { js: "import * as __nodeCrypto from 'node:crypto'; const require = (nome) => { if (nome === 'node:crypto') return __nodeCrypto; if (nome === 'node:fs' || nome === 'node:path') return {}; throw new Error('módulo indisponível na Cloudflare: ' + nome); };" },
    // O verificador do Google da versão Node nunca roda aqui (o worker passa o dele).
    alias: { 'google-auth-library': `${raiz}cloudflare/sem-google-auth-library.mjs` },
    define: { 'process.env.ENZO_CAPITULOS': JSON.stringify(JSON.stringify(capitulos)) },
    logLevel: 'warning',
});

writeFileSync(`${raiz}dist/_routes.json`, JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }, null, 2));
writeFileSync(`${raiz}dist/_headers`, [
    '/*.html', '  Cache-Control: no-cache',
    '/data/*', '  Cache-Control: no-cache',
    '/assets/*', '  Cache-Control: public, max-age=604800',
    '',
].join('\n'));
console.log('⚙️  dist/_worker.js, _routes.json e _headers prontos para a Cloudflare.');
