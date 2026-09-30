// ============================================================================
// Acessos: de onde (IP, país, estado, cidade) vieram as ações importantes, para segurança.
// Só eventos sensíveis são gravados (login, partida do arcade, comentário, compra, sala da
// Batalha, ações de admin) mais uma "visita" por conta e IP a cada 30 minutos. Nada disso aparece
// para outros leitores: só o admin lê, pelo terminal (`ips`, `ip <endereço>`, ficha da conta).
// Os registros somem sozinhos depois de RETENCAO_DIAS.
//
//   POST /api/visita { pagina }                                       (público) visitante sem login; o site avisa 1x a cada 30 min
//   GET /api/admin/acessos?conta=&ip=&pais=&lugar=&anonimo=1&pagina=            lista (lugar = pedaço do estado ou da cidade) (mais novos primeiro)
//   GET /api/admin/acessos/resumo                                     estados/cidades e IPs repartidos entre contas
//
// O IP vem de CF-Connecting-IP (Cloudflare) e o lugar de request.cf (ou dos cabeçalhos de
// localização da Cloudflare). Localmente não existe nenhum dos dois: fica vazio.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const { exigirUuid } = require('./validacao.js');

const RETENCAO_DIAS = 60;
const DIA = 24 * 60 * 60 * 1000;
const VISITA_INTERVALO = 30 * 60 * 1000;
const POR_PAGINA = 50;

/** Ações (POST) que entram no registro, pelo nome que aparece no terminal. */
const EVENTOS = [
    [/^\/api\/auth\/google$/, 'login'],
    [/^\/api\/auth\/logout$/, 'logout'],
    [/^\/api\/games\/session\/submit$/, 'partida'],
    [/^\/api\/comments$/, 'carta'],
    [/^\/api\/comments\/[^/]+\/delete$/, 'carta-apagar'],
    [/^\/api\/user\/profile$/, 'perfil'],
    [/^\/api\/baralho\/comprar$/, 'compra'],
    [/^\/api\/baralho\/abrir$/, 'abrir'],
    [/^\/api\/baralho\/po$/, 'po'],
    [/^\/api\/baralho\/visitante\/resgatar$/, 'resgate'],
    [/^\/api\/tcg\/salas$/, 'sala'],
    [/^\/api\/tcg\/salas\/[^/]+\/entrar$/, 'entrar-sala'],
    [/^\/api\/tcg\/partidas\/[^/]+\/comentarios$/, 'comentario'],
    [/^\/api\/tcg\/npc$/, 'npc'],
    [/^\/api\/visita$/, 'visitante'],
    [/^\/api\/admin\//, 'admin'],
];

const limpo = (v, max) => {
    const t = String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
    return t || null;
};

/** Resume o User-Agent: "iPhone · Safari", "Android · Chrome", "iPhone · Instagram (app)"... (só para o admin entender o aparelho). */
function aparelhoDe(ua) {
    const u = String(ua || '');
    if (!u) return null;
    const sistema = /iPhone|iPod/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac OS X|Macintosh/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : '?';
    const app = /Instagram/.test(u) ? 'Instagram (app)' : /FBAN|FBAV/.test(u) ? 'Facebook (app)' : /Discord/i.test(u) ? 'Discord (app)' : /Line\//.test(u) ? 'Line (app)' : /TikTok|musical_ly/.test(u) ? 'TikTok (app)' : /Telegram/i.test(u) ? 'Telegram (app)' : null;
    const navegador = app || (/CriOS|Chrome\//.test(u) && !/Edg/.test(u) ? 'Chrome' : /FxiOS|Firefox/.test(u) ? 'Firefox' : /EdgiOS|Edg\//.test(u) ? 'Edge' : /Safari\//.test(u) ? 'Safari' : /iPhone|iPad/.test(u) ? 'WebView (app)' : '?');
    const ios = u.match(/OS (\d+)[_.]/)?.[1];
    return limpo(`${sistema}${ios && sistema !== 'Android' ? ` ${ios}` : ''} · ${navegador}`, 60);
}

/** Coordenada com 2 casas (~1 km) ou null se não for número dentro do limite. */
function coordenada(valor, max) {
    const n = Number.parseFloat(valor);
    return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 100) / 100 : null;
}

/** IP, lugar e operadora (cf.asOrganization) de quem fez a requisição. Campos ausentes voltam null. */
function origemDe(request) {
    const h = request.headers;
    const cf = request.cf || {};
    let ip = h.get('cf-connecting-ip') || (h.get('x-forwarded-for') || '').split(',')[0] || null;
    ip = limpo(ip, 64);
    const decodificar = (v) => { try { return decodeURIComponent(v); } catch { return v; } };
    return {
        ip,
        pais: limpo(cf.country || h.get('cf-ipcountry'), 2),
        estado: limpo(cf.region || (h.get('cf-region') && decodificar(h.get('cf-region'))), 80),
        cidade: limpo(cf.city || (h.get('cf-ipcity') && decodificar(h.get('cf-ipcity'))), 80),
        operadora: limpo(cf.asOrganization, 80),
        aparelho: aparelhoDe(h.get('user-agent')),
        lat: coordenada(cf.latitude ?? h.get('cf-iplatitude'), 90),
        lon: coordenada(cf.longitude ?? h.get('cf-iplongitude'), 180),
    };
}

const nomeDoEvento = (request, url) => {
    if (request.method !== 'POST') return null;
    const achou = EVENTOS.find(([re]) => re.test(url.pathname));
    return achou ? achou[1] : null;
};

let ultimaFaxina = 0;

async function gravar(ctx, evento, userId) {
    const o = origemDe(ctx.request);
    const agora = ctx.agora();
    await ctx.db.query(
        `INSERT INTO acessos (id, user_id, ip, pais, estado, cidade, operadora, aparelho, lat, lon, evento, pagina, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [crypto.randomUUID(), userId, o.ip, o.pais, o.estado, o.cidade, o.operadora, o.aparelho, o.lat, o.lon, evento, ctx.acessoPagina ?? null, agora]);
    // Faxina barata: no máximo uma por hora por processo.
    if (agora - ultimaFaxina > 60 * 60 * 1000) {
        ultimaFaxina = agora;
        await ctx.db.query('DELETE FROM acessos WHERE created_at < $1', [agora - RETENCAO_DIAS * DIA]);
    }
}

/**
 * Chamado pela API depois de uma resposta de sucesso. Nunca derruba a requisição.
 * Login ainda não tem ctx.usuario: a rota põe o id em ctx.acessoUsuario.
 */
async function registrarAcesso(ctx) {
    try {
        const { request, url } = ctx;
        const userId = ctx.usuario?.id ?? ctx.acessoUsuario ?? null;
        let evento = ctx.acessoEvento ?? nomeDoEvento(request, url);
        if (!evento && request.method === 'GET' && url.pathname === '/api/auth/me' && userId) {
            // Visita: uma por conta e IP a cada 30 minutos (assim dá para ver o IP mudar sem gravar toda página).
            const { ip } = origemDe(request);
            const [recente] = await ctx.db.query(
                `SELECT 1 AS x FROM acessos WHERE user_id = $1 AND ip IS NOT DISTINCT FROM $2 AND created_at > $3 LIMIT 1`,
                [userId, ip, ctx.agora() - VISITA_INTERVALO]);
            if (recente) return;
            evento = 'visita';
        }
        if (evento === 'visitante' || evento === 'sessao-perdida') {
            // Sem login: um registro por IP a cada 30 minutos (quem recarrega a página não enche o banco).
            const { ip } = origemDe(request);
            const [recente] = await ctx.db.query(
                `SELECT 1 AS x FROM acessos WHERE evento = $3 AND ip IS NOT DISTINCT FROM $1 AND created_at > $2 LIMIT 1`,
                [ip, ctx.agora() - VISITA_INTERVALO, evento]);
            if (recente) return;
        }
        if (evento) await gravar(ctx, evento, userId);
    } catch (erro) {
        console.error('[acessos]', erro);
    }
}

const linha = (l) => ({
    id: l.id, userId: l.user_id, nome: l.nome || null, email: l.email || null,
    ip: l.ip, pais: l.pais, estado: l.estado, cidade: l.cidade, operadora: l.operadora || null, aparelho: l.aparelho || null, evento: l.evento, pagina: l.pagina || null, em: Number(l.created_at),
});

const rotas = [
    {
        // Visitante sem login (o site chama uma vez a cada 30 min). O registro é feito por registrarAcesso.
        metodo: 'POST', caminho: '/api/visita',
        async executar(ctx) {
            const { pagina, perdida } = await ctx.corpo();
            // perdida: o navegador tinha login (lembrado no aparelho) e o servidor não recebeu o cookie
            if (perdida === true) ctx.acessoEvento = 'sessao-perdida';
            ctx.acessoPagina = typeof pagina === 'string' && pagina.startsWith('/') ? limpo(pagina, 80) : null;
            return { ok: true };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/acessos', admin: true,
        async executar(ctx) {
            const q = ctx.url.searchParams;
            const pagina = Math.max(0, Math.min(1000, Number.parseInt(q.get('pagina'), 10) || 0));
            const conta = q.get('conta') ? exigirUuid(q.get('conta'), 'conta não encontrada') : null;
            const ip = limpo(q.get('ip'), 64);
            const pais = limpo(q.get('pais'), 2)?.toUpperCase() ?? null;
            const anonimo = q.get('anonimo') === '1';
            const lugar = limpo(q.get('lugar'), 80);
            const filtroLugar = lugar ? `%${lugar.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
            const linhas = await ctx.db.query(
                `SELECT a.*, u.display_name AS nome, u.email
                   FROM acessos a LEFT JOIN users u ON u.id = a.user_id
                  WHERE ($1::text IS NULL OR a.user_id = $1) AND ($7::boolean IS NOT TRUE OR a.user_id IS NULL) AND ($2::text IS NULL OR a.ip = $2)
                    AND ($3::text IS NULL OR a.pais = $3) AND ($4::text IS NULL OR a.estado ILIKE $4 OR a.cidade ILIKE $4)
                  ORDER BY a.created_at DESC, a.id LIMIT $5 OFFSET $6`,
                [conta, ip, pais, filtroLugar, POR_PAGINA + 1, pagina * POR_PAGINA, anonimo]);
            return { acessos: linhas.slice(0, POR_PAGINA).map(linha), pagina, maisPaginas: linhas.length > POR_PAGINA, retencaoDias: RETENCAO_DIAS };
        },
    },
    {
        // Dados do painel ao vivo: tráfego por hora (24 h), pontos no mapa (30 dias) e os eventos mais recentes.
        metodo: 'GET', caminho: '/api/admin/acessos/radar', admin: true,
        async executar(ctx) {
            const agora = ctx.agora();
            const HORA = 60 * 60 * 1000;
            const horaAtual = Math.floor(agora / HORA);
            const porHora = await ctx.db.query(
                `SELECT (created_at / 3600000) AS h, COUNT(*) AS n, COUNT(*) FILTER (WHERE user_id IS NULL) AS anon
                   FROM acessos WHERE created_at > $1 GROUP BY (created_at / 3600000)`, [agora - 24 * HORA]);
            const horas = Array.from({ length: 24 }, (_, i) => ({ h: horaAtual - 23 + i, total: 0, semLogin: 0 }));
            for (const l of porHora) {
                const b = horas[Number(l.h) - (horaAtual - 23)];
                if (b) { b.total = Number(l.n); b.semLogin = Number(l.anon); }
            }
            const pontos = await ctx.db.query(
                `SELECT lat, lon, MAX(cidade) AS cidade, MAX(estado) AS estado, MAX(pais) AS pais, COUNT(*) AS n, MAX(created_at) AS ultimo
                   FROM acessos WHERE lat IS NOT NULL AND lon IS NOT NULL AND created_at > $1
                  GROUP BY lat, lon ORDER BY COUNT(*) DESC LIMIT 200`, [agora - 30 * DIA]);
            const recentes = await ctx.db.query(
                `SELECT a.*, u.display_name AS nome, u.email FROM acessos a LEFT JOIN users u ON u.id = a.user_id
                  ORDER BY a.created_at DESC, a.id LIMIT 14`);
            const [t] = await ctx.db.query(
                `SELECT COUNT(*) AS acessos, COUNT(DISTINCT ip) AS ips, COUNT(*) FILTER (WHERE user_id IS NULL) AS anon
                   FROM acessos WHERE created_at > $1`, [agora - 24 * HORA]);
            return {
                agora, horas,
                pontos: pontos.map((p) => ({ lat: Number(p.lat), lon: Number(p.lon), cidade: p.cidade, estado: p.estado, pais: p.pais, n: Number(p.n), ultimo: Number(p.ultimo) })),
                recentes: recentes.map(linha),
                totais: { acessos: Number(t.acessos), ips: Number(t.ips), semLogin: Number(t.anon) },
            };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/acessos/resumo', admin: true,
        async executar(ctx) {
            const desde = ctx.agora() - 30 * DIA;
            const lugares = await ctx.db.query(
                `SELECT pais, estado, cidade, COUNT(*) AS acessos, COUNT(DISTINCT user_id) AS contas, COUNT(DISTINCT ip) AS ips
                   FROM acessos WHERE created_at > $1
                  GROUP BY pais, estado, cidade ORDER BY COUNT(*) DESC, pais, estado, cidade LIMIT 40`, [desde]);
            const repartidos = await ctx.db.query(
                `SELECT ip, COUNT(DISTINCT user_id) AS contas, COUNT(*) AS acessos, MAX(created_at) AS ultimo
                   FROM acessos WHERE created_at > $1 AND ip IS NOT NULL AND user_id IS NOT NULL
                  GROUP BY ip HAVING COUNT(DISTINCT user_id) > 1
                  ORDER BY COUNT(DISTINCT user_id) DESC, MAX(created_at) DESC LIMIT 30`, [desde]);
            const [v] = await ctx.db.query(
                `SELECT COUNT(*) AS acessos, COUNT(DISTINCT ip) AS ips FROM acessos WHERE created_at > $1 AND user_id IS NULL`, [desde]);
            return {
                dias: 30, semLogin: { acessos: Number(v.acessos), ips: Number(v.ips) }, retencaoDias: RETENCAO_DIAS,
                lugares: lugares.map((l) => ({ pais: l.pais, estado: l.estado, cidade: l.cidade, acessos: Number(l.acessos), contas: Number(l.contas), ips: Number(l.ips) })),
                repartidos: repartidos.map((l) => ({ ip: l.ip, contas: Number(l.contas), acessos: Number(l.acessos), ultimo: Number(l.ultimo) })),
            };
        },
    },
];

module.exports = { rotas, registrarAcesso, origemDe, aparelhoDe, nomeDoEvento, linha, RETENCAO_DIAS, VISITA_INTERVALO };
