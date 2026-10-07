// ============================================================================
// Leituras: quem abriu cada capítulo e quantas vezes (só a equipe vê; o leitor comum não).
//   POST /api/reader/view { comicId, chapterId }     (logado) soma 1 visualização (no máximo 1 a cada 10 min por capítulo)
//   GET  /api/admin/leituras?q=&ordem=&pagina=        (moderador ou admin) leitores com total de visualizações,
//                                                      capítulos mais vistos e números do dia
//   GET  /api/admin/leitores/:id                      (moderador ou admin) uma pessoa: o que leu, quantas vezes, quando
// A equipe vê o nome da conta e a foto; e-mail e IP continuam só no terminal do admin.
// ============================================================================
const { HttpError } = require('./http.js');
const { exigirUuid } = require('./validacao.js');

const POR_PAGINA = 40;
const INTERVALO = 10 * 60 * 1000;
const DIA = 24 * 60 * 60 * 1000;
const ID = /^[A-Za-z0-9._-]{1,64}$/;

const rotas = [
    {
        metodo: 'POST', caminho: '/api/reader/view', login: true,
        async executar(ctx) {
            const { comicId, chapterId } = await ctx.corpo();
            if (!ID.test(String(comicId ?? '')) || !ID.test(String(chapterId ?? ''))) throw new HttpError(400, 'capítulo inválido');
            const agora = ctx.agora();
            await ctx.db.query(
                `INSERT INTO leituras (user_id, comic_id, chapter_id, visualizacoes, primeira_em, ultima_em)
                 VALUES ($1, $2, $3, 1, $4, $4)
                 ON CONFLICT (user_id, comic_id, chapter_id) DO UPDATE
                    SET visualizacoes = leituras.visualizacoes + 1, ultima_em = EXCLUDED.ultima_em
                  WHERE leituras.ultima_em < $5`,
                [ctx.usuario.id, comicId, chapterId, agora, agora - INTERVALO]);
            return { ok: true };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/leituras', moderador: true,
        async executar(ctx) {
            const agora = ctx.agora();
            const pagina = Math.max(0, Math.min(1000, Number.parseInt(ctx.url.searchParams.get('pagina'), 10) || 0));
            const busca = String(ctx.url.searchParams.get('q') || '').trim().slice(0, 80);
            const filtro = busca ? `%${busca.replace(/[\%_]/g, (c) => `\${c}`)}%` : null;
            const ordem = ctx.url.searchParams.get('ordem') === 'recente' ? 'ultima DESC' : 'total DESC, ultima DESC';
            const leitores = await ctx.db.query(
                `SELECT u.id, u.display_name, u.avatar_url, u.created_at,
                        COALESCE(SUM(l.visualizacoes), 0) AS total, COUNT(l.chapter_id) AS capitulos, COALESCE(MAX(l.ultima_em), 0) AS ultima
                   FROM users u JOIN leituras l ON l.user_id = u.id
                  WHERE u.role <> 'banned' AND ($1::text IS NULL OR u.display_name ILIKE $1)
                  GROUP BY u.id, u.display_name, u.avatar_url, u.created_at
                  ORDER BY ${ordem}, u.id
                  LIMIT $2 OFFSET $3`,
                [filtro, POR_PAGINA + 1, pagina * POR_PAGINA]);
            const [hoje] = await ctx.db.query(
                `SELECT COALESCE(SUM(visualizacoes), 0) AS visualizacoes, COUNT(DISTINCT user_id) AS leitores
                   FROM leituras WHERE ultima_em > $1`, [agora - DIA]);
            const [geral] = await ctx.db.query(
                'SELECT COALESCE(SUM(visualizacoes), 0) AS visualizacoes, COUNT(DISTINCT user_id) AS leitores FROM leituras');
            const top = await ctx.db.query(
                `SELECT comic_id, chapter_id, SUM(visualizacoes) AS visualizacoes, COUNT(*) AS leitores
                   FROM leituras GROUP BY comic_id, chapter_id ORDER BY visualizacoes DESC, comic_id, chapter_id LIMIT 10`);
            return {
                agora,
                hoje: { visualizacoes: Number(hoje.visualizacoes), leitores: Number(hoje.leitores) },
                geral: { visualizacoes: Number(geral.visualizacoes), leitores: Number(geral.leitores) },
                top: top.map((t) => ({ comicId: t.comic_id, chapterId: t.chapter_id, visualizacoes: Number(t.visualizacoes), leitores: Number(t.leitores) })),
                leitores: leitores.slice(0, POR_PAGINA).map((l) => ({
                    id: l.id, name: l.display_name, avatarUrl: l.avatar_url || null,
                    total: Number(l.total), capitulos: Number(l.capitulos), ultima: Number(l.ultima), desde: Number(l.created_at),
                })),
                pagina,
                maisPaginas: leitores.length > POR_PAGINA,
            };
        },
    },
    {
        metodo: 'GET', caminho: /^\/api\/admin\/leitores\/([^/]{1,64})$/, moderador: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'leitor não encontrado');
            const [u] = await ctx.db.query('SELECT id, display_name, avatar_url, created_at, last_login_at FROM users WHERE id = $1', [id]);
            if (!u) throw new HttpError(404, 'leitor não encontrado');
            const lidos = await ctx.db.query(
                `SELECT l.comic_id, l.chapter_id, l.visualizacoes, l.primeira_em, l.ultima_em,
                        p.last_page, p.completed
                   FROM leituras l LEFT JOIN reading_progress p
                     ON p.user_id = l.user_id AND p.comic_id = l.comic_id AND p.chapter_id = l.chapter_id
                  WHERE l.user_id = $1 ORDER BY l.ultima_em DESC LIMIT 300`, [id]);
            return {
                id: u.id, name: u.display_name, avatarUrl: u.avatar_url || null,
                desde: Number(u.created_at), ultimoLogin: Number(u.last_login_at),
                total: lidos.reduce((s, l) => s + Number(l.visualizacoes), 0),
                leituras: lidos.map((l) => ({
                    comicId: l.comic_id, chapterId: l.chapter_id, visualizacoes: Number(l.visualizacoes),
                    primeira: Number(l.primeira_em), ultima: Number(l.ultima_em),
                    pagina: l.last_page === null ? null : Number(l.last_page), completo: Boolean(l.completed),
                })),
            };
        },
    },
];

module.exports = { rotas };
