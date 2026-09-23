// ============================================================================
// Servidor estático + API do ranking do Flappy Enzo.
// - Valida e limita pontuações (o ranking é público na home).
// - Cache: HTML sempre revalidado; assets versionados podem ser imutáveis.
// ============================================================================
const express = require('express');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LEADERBOARD_FILE = process.env.LEADERBOARD_FILE || path.join(DATA_DIR, 'leaderboard.json');

// Limite do jogo. Sessão assinada e tempo mínimo complementam a validação.
// O cliente ainda simula o jogo: isto não é proteção completa contra trapaça.
const MAX_SCORE = Number(process.env.MAX_SCORE) || 300;
const MAX_ENTRIES = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (req.method === 'POST' && origin && origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'Origem não permitida.' });
    next();
});
app.use(express.json({ limit: '10kb' }));

// --------------------------------------------------------------- leaderboard
function readLeaderboard() {
    try {
        const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(entry => entry && Number.isInteger(entry.score) && entry.score >= 0 && entry.score <= MAX_SCORE).map(entry => ({ ...entry, name: sanitizeName(entry.name) })).sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES) : [];
    } catch {
        return [];
    }
}

function writeLeaderboard(entries) {
    const temp = `${LEADERBOARD_FILE}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(entries, null, 2)}\n`);
    fs.renameSync(temp, LEADERBOARD_FILE);
}

/** Só letras, números e espaço; máximo de 10 caracteres. */
function sanitizeName(value) {
    const cleaned = String(value ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .trim()
        .slice(0, 10);
    return cleaned || 'ANONIMO';
}

const hits = new Map();

function rateLimited(ip) {
    const now = Date.now();
    if (hits.size > 500) {
        for (const [key, times] of hits) {
            if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
        }
    }
    const recent = (hits.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > RATE_LIMIT_MAX;
}

const secret = process.env.LEADERBOARD_SECRET || crypto.randomBytes(32).toString('hex');
const usedSessions = new Map();
const SESSION_TTL = 60 * 60 * 1000;
function createSession(now = Date.now()) {
    const payload = Buffer.from(JSON.stringify({ id: crypto.randomUUID(), started: now })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}
function validateSession(token, score, now = Date.now()) {
    try {
        if (typeof token !== 'string' || token.length > 512) return null;
        const [payload, signature] = token.split('.');
        const expected = crypto.createHmac('sha256', secret).update(payload).digest();
        const supplied = Buffer.from(signature || '', 'base64url');
        if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
        const age = now - session.started;
        if (age < 0 || age > SESSION_TTL || age < Math.max(0, score - 1) * 1200 || usedSessions.has(session.id)) return null;
        return session;
    } catch { return null; }
}
app.get('/api/leaderboard/session', (req, res) => res.json({ token: createSession() }));

app.get('/api/leaderboard', (req, res) => {
    res.json(readLeaderboard().slice(0, 10));
});

app.post('/api/leaderboard', (req, res) => {
    const ip = req.ip || 'unknown';
    if (rateLimited(ip)) {
        return res.status(429).json({ error: 'Muitos envios seguidos. Tente novamente em um minuto.' });
    }

    const rawScore = req.body?.score;
    const score = typeof rawScore === 'number' ? rawScore : Number.NaN;
    if (!Number.isInteger(score) || score < 0) {
        return res.status(400).json({ error: 'Pontuação inválida.' });
    }
    if (score > MAX_SCORE) {
        return res.status(400).json({ error: `Pontuação acima do limite permitido (${MAX_SCORE}).` });
    }

    const session = validateSession(req.body?.token, score);
    if (!session) return res.status(400).json({ error: 'Sessão inválida ou pontuação incompatível com a duração da partida.' });

    const entry = { name: sanitizeName(req.body?.name), score, date: new Date().toISOString() };
    const entries = [...readLeaderboard(), entry]
        .sort((a, b) => b.score - a.score || String(a.date).localeCompare(String(b.date)))
        .slice(0, MAX_ENTRIES);

    try {
        writeLeaderboard(entries);
    } catch (error) {
        console.error('Falha ao gravar o ranking:', error.message);
        return res.status(500).json({ error: 'Não foi possível salvar a pontuação.' });
    }

    for (const [id, time] of usedSessions) if (Date.now() - time > SESSION_TTL) usedSessions.delete(id);
    usedSessions.set(session.id, Date.now());
    res.status(201).json(entries.slice(0, 10));
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
app.use((error, req, res, next) => {
    const status = error.status === 413 ? 413 : 400;
    res.status(status).json({ error: status === 413 ? 'Requisição muito grande.' : 'Requisição inválida.' });
});

function ensureDataFiles() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(LEADERBOARD_FILE)) writeLeaderboard([]);
}

function start() {
    ensureDataFiles();
    return app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Leaderboard API ready at /api/leaderboard (score máximo: ${MAX_SCORE})`);
    });
}

module.exports = { app, start, sanitizeName, readLeaderboard, MAX_SCORE, createSession, validateSession };

if (require.main === module) start();
