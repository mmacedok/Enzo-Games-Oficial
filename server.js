// ============================================================================
// Servidor estático do Enzo Games Site.
// - Publica só páginas, JS, CSS, assets e catálogo; o resto é 404.
// - Cache: HTML sempre revalidado; assets versionados podem ser imutáveis.
// ============================================================================
const express = require('express');
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
for (const page of ['index.html', 'reader.html', 'personagens.html', 'degustador.html']) {
    app.get(`/${page}`, (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, page)); });
}
app.get('/', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'index.html')); });
for (const file of ['database.json', 'images.json']) {
    app.get(`/data/${file}`, (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(DATA_DIR, file)); });
}
app.use((req, res) => res.status(404).type('text').send('Página ou arquivo não encontrado.'));

function start() {
    return app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
}

module.exports = { app, start };

if (require.main === module) start();
