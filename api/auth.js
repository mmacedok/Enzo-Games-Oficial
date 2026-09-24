// ============================================================================
// Login com Google e sessões.
// - O navegador manda o ID Token do Google Identity Services; o servidor
//   confere assinatura, validade e audiência (GOOGLE_CLIENT_ID).
// - A sessão é um token aleatório de 32 bytes num cookie HttpOnly `sid`.
//   No banco fica só o HMAC-SHA256 dele (chave: SESSION_SECRET).
// ============================================================================
const crypto = require('node:crypto');
const { HttpError, montarCookie } = require('./http.js');

const COOKIE = 'sid';
const DIA = 24 * 60 * 60 * 1000;
const DURACAO_SESSAO = 30 * DIA;
/** Sessão usada com menos da metade do prazo restante ganha 30 dias novos. */
const RENOVAR_ABAIXO_DE = DURACAO_SESSAO / 2;

const hashDoToken = (token, segredo) => crypto.createHmac('sha256', segredo).update(token).digest('hex');

/** Verificador real do Google (a biblioteca só é carregada quando alguém faz login). */
function verificadorGoogle(clientId) {
    let cliente;
    return async (idToken) => {
        const { OAuth2Client } = require('google-auth-library');
        cliente ??= new OAuth2Client(clientId);
        const ticket = await cliente.verifyIdToken({ idToken, audience: clientId });
        return ticket.getPayload();
    };
}

/** "Henrique Macedo Silva" -> "Henrique S." (ranking é público: sem sobrenome inteiro). */
function nomePublico(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'Jogador';
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.` : partes[0];
}

const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || 'Jogador';

/** O que o navegador pode saber do usuário logado (sem e-mail, sem ids do Google). */
function usuarioPublico(usuario) {
    return {
        id: usuario.id,
        name: usuario.display_name,
        firstName: primeiroNome(usuario.display_name),
        avatarUrl: usuario.avatar_url || null,
        fala: usuario.fala || null,
    };
}

function cookieDaSessao(ctx, token, maxAge) {
    ctx.headers.append('Set-Cookie', montarCookie(COOKIE, token, { maxAge: maxAge / 1000, secure: ctx.cookieSeguro }));
}

/** Lê o cookie e carrega ctx.usuario / ctx.sessaoId. Sessão vencida ou de banido = deslogado. */
async function carregarSessao(ctx) {
    const token = ctx.cookies[COOKIE];
    if (!token || !ctx.config.loginAtivo || token.length > 128) return;
    const id = hashDoToken(token, ctx.config.sessionSecret);
    const agora = ctx.agora();
    const [linha] = await ctx.db.query(
        `SELECT s.id AS sessao_id, s.expires_at, u.*
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = $1`, [id]);
    if (!linha) return;
    if (Number(linha.expires_at) <= agora || linha.role === 'banned') {
        await ctx.db.query('DELETE FROM sessions WHERE id = $1', [id]);
        return;
    }
    ctx.sessaoId = id;
    ctx.usuario = linha;
    if (Number(linha.expires_at) - agora < RENOVAR_ABAIXO_DE) {
        await ctx.db.query('UPDATE sessions SET expires_at = $2 WHERE id = $1', [id, agora + DURACAO_SESSAO]);
        cookieDaSessao(ctx, token, DURACAO_SESSAO);
    }
}

async function criarSessao(ctx, usuarioId) {
    const agora = ctx.agora();
    const token = crypto.randomBytes(32).toString('base64url');
    // Faxina barata: sessões vencidas de todo mundo saem a cada login.
    await ctx.db.query('DELETE FROM sessions WHERE expires_at <= $1', [agora]);
    await ctx.db.query('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)',
        [hashDoToken(token, ctx.config.sessionSecret), usuarioId, agora + DURACAO_SESSAO, agora]);
    cookieDaSessao(ctx, token, DURACAO_SESSAO);
}

// ------------------------------------------------------------------ rotas
const rotas = [
    {
        metodo: 'GET', caminho: '/api/auth/config',
        executar: (ctx) => ({ enabled: ctx.config.loginAtivo, clientId: ctx.config.loginAtivo ? ctx.config.clientId : null }),
    },
    {
        metodo: 'POST', caminho: '/api/auth/google',
        async executar(ctx) {
            if (!ctx.config.loginAtivo) throw new HttpError(503, 'login com Google não configurado');
            const { credential } = await ctx.corpo();
            if (typeof credential !== 'string' || credential.length < 20 || credential.length > 4096) {
                throw new HttpError(400, 'credencial do Google ausente');
            }
            let dados;
            try { dados = await ctx.verificarGoogle(credential); } catch { throw new HttpError(401, 'credencial do Google inválida'); }
            if (!dados?.sub) throw new HttpError(401, 'credencial do Google inválida');

            const agora = ctx.agora();
            const avatar = /^https:\/\//.test(dados.picture || '') ? dados.picture.slice(0, 500) : null;
            const nome = String(dados.name || dados.given_name || String(dados.email || '').split('@')[0] || 'Jogador').slice(0, 80);
            const [usuario] = await ctx.db.query(
                `INSERT INTO users (id, google_id, email, display_name, avatar_url, created_at, last_login_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $6)
                 ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name,
                     avatar_url = EXCLUDED.avatar_url, last_login_at = EXCLUDED.last_login_at
                 RETURNING *`,
                [crypto.randomUUID(), String(dados.sub), String(dados.email || ''), nome, avatar, agora]);
            if (usuario.role === 'banned') throw new HttpError(403, 'conta bloqueada');

            // Login novo troca a sessão antiga (evita fixação de sessão).
            if (ctx.sessaoId) await ctx.db.query('DELETE FROM sessions WHERE id = $1', [ctx.sessaoId]);
            await criarSessao(ctx, usuario.id);
            return { loggedIn: true, firstLogin: Number(usuario.created_at) === agora, user: usuarioPublico(usuario) };
        },
    },
    {
        metodo: 'GET', caminho: '/api/auth/me',
        // admin: abre o link do painel (admin.html); a API confere de novo em cada rota.
        executar: (ctx) => (ctx.usuario
            ? { loggedIn: true, user: usuarioPublico(ctx.usuario), admin: ctx.config.admins.has(String(ctx.usuario.email).toLowerCase()) }
            : { loggedIn: false }),
    },
    {
        metodo: 'POST', caminho: '/api/auth/logout',
        async executar(ctx) {
            if (ctx.sessaoId) await ctx.db.query('DELETE FROM sessions WHERE id = $1', [ctx.sessaoId]);
            ctx.headers.append('Set-Cookie', montarCookie(COOKIE, '', { maxAge: 0, secure: ctx.cookieSeguro }));
            return { loggedIn: false };
        },
    },
];

module.exports = { rotas, carregarSessao, verificadorGoogle, nomePublico, primeiroNome, usuarioPublico, hashDoToken, COOKIE, DURACAO_SESSAO };
