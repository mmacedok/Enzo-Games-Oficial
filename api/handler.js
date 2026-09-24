// ============================================================================
// API do Enzo Games: recebe um Request (padrão da web) e devolve um Response.
// Usada pelo server.js (local) e por netlify/functions/api.mjs (produção).
//
//   const api = createApi({ db, env });   // db = { query(texto, params) -> linhas }
//   const response = await api(request);
//
// Configuração (env): GOOGLE_CLIENT_ID e SESSION_SECRET (>= 32 caracteres).
// ADMIN_EMAILS (opcional): e-mails Google que abrem o painel admin.html.
// Sem eles o site funciona, só que sem login (ranking continua visível).
// ============================================================================
const { HttpError, json, lerJson, checarMesmaOrigem, lerCookies } = require('./http.js');
const auth = require('./auth.js');
const games = require('./games.js');
const user = require('./user.js');
const leitores = require('./leitores.js');
const admin = require('./admin.js');
const SCHEMA = require('./schema.js');

const ROTAS = [...auth.rotas, ...games.rotas, ...user.rotas, ...leitores.rotas, ...admin.rotas];

function acharRota(metodo, caminho) {
    let caminhoExiste = false;
    for (const rota of ROTAS) {
        const params = typeof rota.caminho === 'string'
            ? (rota.caminho === caminho ? [] : null)
            : caminho.match(rota.caminho)?.slice(1) ?? null;
        if (!params) continue;
        caminhoExiste = true;
        if (rota.metodo === metodo) return { rota, params };
    }
    return { rota: null, caminhoExiste };
}

function lerConfig(env) {
    const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
    const sessionSecret = String(env.SESSION_SECRET || '');
    return {
        clientId, sessionSecret,
        loginAtivo: Boolean(clientId) && sessionSecret.length >= 32,
        admins: admin.lerAdmins(env.ADMIN_EMAILS),
    };
}

async function migrar(db) {
    for (const comando of SCHEMA) await db.query(comando);
}

/**
 * @param {object} opcoes
 * @param {{query: Function}} opcoes.db
 * @param {object} [opcoes.env] variáveis de ambiente (padrão: process.env)
 * @param {Function} [opcoes.verificarGoogle] troca o verificador do Google (testes)
 * @param {Function} [opcoes.agora] relógio em ms (testes)
 */
function createApi({ db, env = process.env, verificarGoogle, agora = Date.now } = {}) {
    const config = lerConfig(env);
    const producao = env.NODE_ENV === 'production';
    verificarGoogle ??= auth.verificadorGoogle(config.clientId);
    let pronto = null;

    return async function api(request) {
        const url = new URL(request.url);
        const { rota, params, caminhoExiste } = acharRota(request.method, url.pathname);
        if (!rota) return json(caminhoExiste ? 405 : 404, { error: caminhoExiste ? 'método não permitido' : 'rota não encontrada' });

        const ctx = {
            request, url, params, db, config, agora, verificarGoogle,
            headers: new Headers(),
            cookies: lerCookies(request),
            cookieSeguro: producao || url.protocol === 'https:',
            usuario: null,
            sessaoId: null,
            corpo: () => lerJson(request),
        };
        try {
            if (request.method !== 'GET' && request.method !== 'HEAD') checarMesmaOrigem(request);
            // Esquema criado uma vez por processo; se falhar, a próxima requisição tenta de novo.
            pronto ??= migrar(db).catch((erro) => { pronto = null; throw erro; });
            await pronto;
            await auth.carregarSessao(ctx);
            if (rota.login && !ctx.usuario) throw new HttpError(401, 'faça login para continuar');
            // Rotas de admin não existem para quem não é admin.
            if (rota.admin && !admin.ehAdmin(config, ctx.usuario)) throw new HttpError(404, 'rota não encontrada');
            return json(200, await rota.executar(ctx), ctx.headers);
        } catch (erro) {
            if (erro instanceof HttpError) return json(erro.status, { error: erro.message, ...erro.extra }, ctx.headers);
            console.error('[api]', request.method, url.pathname, erro);
            return json(500, { error: 'erro interno' }, ctx.headers);
        }
    };
}

module.exports = { createApi, migrar, lerConfig };
