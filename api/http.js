// ============================================================================
// Ferramentas HTTP da API (Request/Response padrão da web: funcionam igual no
// Express local, via adaptador, e nas Netlify Functions).
// ============================================================================
const LIMITE_CORPO = 16 * 1024;

class HttpError extends Error {
    constructor(status, mensagem, extra = {}) {
        super(mensagem);
        this.status = status;
        this.extra = extra;
    }
}

function json(status, corpo, headers = new Headers()) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(JSON.stringify(corpo), { status, headers });
}

/** Corpo JSON de um POST, com limite de tamanho. Sempre devolve um objeto. */
async function lerJson(request) {
    const texto = await request.text();
    if (texto.length > LIMITE_CORPO) throw new HttpError(413, 'corpo grande demais');
    if (!texto) return {};
    let dados;
    try { dados = JSON.parse(texto); } catch { throw new HttpError(400, 'JSON inválido'); }
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new HttpError(400, 'esperava um objeto JSON');
    return dados;
}

/**
 * Proteção contra CSRF em POST: exige Content-Type JSON (outro site não
 * consegue mandar isso sem a checagem prévia do CORS, que nós não liberamos)
 * e, quando o navegador informa, que a origem seja o próprio site.
 */
function checarMesmaOrigem(request) {
    const tipo = request.headers.get('content-type') || '';
    if (!/^application\/json\b/i.test(tipo)) throw new HttpError(415, 'use Content-Type: application/json');
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'origem não permitida');
    const origem = request.headers.get('origin');
    if (origem) {
        let host;
        try { host = new URL(origem).host; } catch { throw new HttpError(403, 'origem não permitida'); }
        if (host !== new URL(request.url).host) throw new HttpError(403, 'origem não permitida');
    }
}

function lerCookies(request) {
    const cookies = {};
    for (const parte of (request.headers.get('cookie') || '').split(';')) {
        const i = parte.indexOf('=');
        if (i < 0) continue;
        const nome = parte.slice(0, i).trim();
        if (nome && !(nome in cookies)) {
            try { cookies[nome] = decodeURIComponent(parte.slice(i + 1).trim()); } catch { /* cookie malformado: ignora */ }
        }
    }
    return cookies;
}

function montarCookie(nome, valor, { maxAge, secure }) {
    const partes = [`${nome}=${encodeURIComponent(valor)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.max(0, Math.floor(maxAge))}`];
    if (secure) partes.push('Secure');
    return partes.join('; ');
}

module.exports = { HttpError, json, lerJson, checarMesmaOrigem, lerCookies, montarCookie, LIMITE_CORPO };
