// ============================================================================
// Servidor estático do Enzo Games Site.
// - Publica só páginas, JS, CSS, assets e catálogo; o resto é 404.
// - Cache: HTML sempre revalidado; assets versionados podem ser imutáveis.
// ============================================================================
const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});
// Mount each public directory separately: encoded traversal cannot expose sources.
function publicHeaders(res, filePath) {
    if (filePath.includes(`${path.sep}web${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (/\.(png|jpe?g|webp|avif|gif|svg|woff2?)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
    else res.setHeader('Cache-Control', 'no-cache');
}
for (const directory of ['assets', 'css', 'js']) {
    app.use(`/${directory}`, express.static(path.join(__dirname, directory), { dotfiles: 'deny', setHeaders: publicHeaders }));
}
// Páginas: qualquer .html da pasta principal (nome simples, sem subpastas).
// Página nova não precisa ser registrada aqui nem reiniciar o servidor.
app.get(/^\/([a-z0-9-]+)\.html$/, (req, res, next) => {
    const file = path.join(__dirname, `${req.params[0]}.html`);
    if (!fs.existsSync(file)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(file);
});
app.get('/', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'index.html')); });
// API (login, recordes, progresso): o mesmo código da Netlify Function (api/handler.js).
// Banco local em data/local-db/ (PGlite), aberto só na primeira consulta.
// ENZO_DB=memoria usa um banco temporário na memória (testes).
let api = null;
app.use('/api', express.raw({ type: () => true, limit: '32kb' }), async (req, res, next) => {
    try {
        if (!api) {
            const { createApi } = require('./api/handler.js');
            const { createLocalDb } = require('./api/db-local.js');
            const pasta = process.env.ENZO_DB === 'memoria' ? null : path.join(DATA_DIR, 'local-db');
            api = createApi({ db: createLocalDb(pasta), env: process.env });
        }
        const headers = new Headers();
        for (const [nome, valor] of Object.entries(req.headers)) {
            if (valor !== undefined) headers.set(nome, Array.isArray(valor) ? valor.join(', ') : valor);
        }
        const temCorpo = !['GET', 'HEAD'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;
        const resposta = await api(new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
            method: req.method, headers, body: temCorpo ? req.body : undefined,
        }));
        res.status(resposta.status);
        resposta.headers.forEach((valor, nome) => { if (nome !== 'set-cookie') res.setHeader(nome, valor); });
        const cookies = resposta.headers.getSetCookie();
        if (cookies.length) res.setHeader('Set-Cookie', cookies);
        res.send(Buffer.from(await resposta.arrayBuffer()));
    } catch (erro) {
        next(erro);
    }
});
for (const file of ['database.json', 'images.json']) {
    app.get(`/data/${file}`, (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(DATA_DIR, file)); });
}
app.use((req, res) => res.status(404).type('text').send('Página ou arquivo não encontrado.'));

function start() {
    return app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
}

module.exports = { app, start };

if (require.main === module) {
    // Segredos locais (GOOGLE_CLIENT_ID, SESSION_SECRET) ficam em .env, fora do git.
    try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* sem .env: site sem login */ }
    start();
}
