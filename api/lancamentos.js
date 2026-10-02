// ============================================================================
// Lançamentos (aba "lançamentos" do terminal admin): publicar, agendar ou esconder
// um capítulo em um clique, sem deploy. O estado de cada capítulo fica no banco.
//
//   POST /api/admin/lancamentos   { comic, capitulo, acao: 'publicar' | 'agendar' | 'esconder', em?, avisar? }
//   GET  /api/admin/lancamentos/acessos   quem tem acesso antecipado a cada capítulo
//   POST /api/admin/lancamentos/acesso    { comic, capitulo, usuario, dar } dá ou tira o acesso antecipado de um leitor
//   (a leitura pública é GET /api/site/revelados, em api/admin.js: junta os capítulos e os avisos)
//
// Regra de visibilidade (a mesma no site, em js/lancamentos.js): se o capítulo tem linha aqui, ela manda
// (`no-ar`; `agendado` abre em `publicar_em`; `rascunho` fica escondido). Sem linha, vale o catálogo
// (`hidden` do gibi ou do capítulo no manifesto, mais o `reveal` antigo). Toda ação vai para o admin_log.
// ============================================================================
const { HttpError } = require('./http.js');
const { UUID } = require('./validacao.js');
const { registrar } = require('./admin.js');

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ACOES = ['publicar', 'agendar', 'esconder'];
const UM_ANO = 366 * 24 * 60 * 60 * 1000;

/** Valida o par gibi/capítulo do corpo de uma requisição. */
function exigirCapitulo(comic, capitulo) {
    if (typeof comic !== 'string' || !ID.test(comic)) throw new HttpError(400, 'id de gibi inválido');
    if (typeof capitulo !== 'string' || !ID.test(capitulo)) throw new HttpError(400, 'id de capítulo inválido');
}

const rotas = [
    {
        metodo: 'GET', caminho: '/api/admin/lancamentos/acessos', admin: true,
        async executar(ctx) {
            const linhas = await ctx.db.query(
                `SELECT a.comic_id, a.chapter_id, a.dado_em, u.id, u.display_name, u.email
                   FROM lancamentos_acesso a JOIN users u ON u.id = a.user_id
                  ORDER BY a.dado_em, u.display_name`);
            return {
                acessos: linhas.map((l) => ({
                    c: `${l.comic_id}/${l.chapter_id}`, em: Number(l.dado_em),
                    usuario: { id: l.id, name: l.display_name, email: l.email },
                })),
            };
        },
    },
    {
        metodo: 'POST', caminho: '/api/admin/lancamentos/acesso', admin: true,
        async executar(ctx) {
            const { comic, capitulo, usuario, dar } = await ctx.corpo();
            exigirCapitulo(comic, capitulo);
            if (typeof usuario !== 'string' || !UUID.test(usuario)) throw new HttpError(400, 'leitor inválido');
            if (typeof dar !== 'boolean') throw new HttpError(400, 'dar deve ser true ou false');
            const [alvo] = await ctx.db.query('SELECT id, display_name FROM users WHERE id = $1', [usuario]);
            if (!alvo) throw new HttpError(404, 'leitor não encontrado');
            const linhas = dar
                ? await ctx.db.query(
                    'INSERT INTO lancamentos_acesso (comic_id, chapter_id, user_id, dado_em) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING user_id',
                    [comic, capitulo, usuario, ctx.agora()])
                : await ctx.db.query('DELETE FROM lancamentos_acesso WHERE comic_id = $1 AND chapter_id = $2 AND user_id = $3 RETURNING user_id', [comic, capitulo, usuario]);
            if (linhas.length) await registrar(ctx, dar ? 'early-access' : 'early-revoke', usuario, `${comic}/${capitulo}`);
            return { comic, capitulo, usuario, dar, mudou: linhas.length > 0 };
        },
    },
    {
        metodo: 'POST', caminho: '/api/admin/lancamentos', admin: true,
        async executar(ctx) {
            const { comic, capitulo, acao, em, avisar } = await ctx.corpo();
            exigirCapitulo(comic, capitulo);
            if (!ACOES.includes(acao)) throw new HttpError(400, 'ação inválida (publicar, agendar ou esconder)');
            if (avisar !== undefined && typeof avisar !== 'boolean') throw new HttpError(400, 'avisar deve ser true ou false');
            const agora = ctx.agora();
            let estado;
            let publicarEm = null;
            let publicadoEm = null;
            if (acao === 'publicar') {
                estado = 'no-ar';
                publicadoEm = agora;
            } else if (acao === 'agendar') {
                if (!Number.isFinite(em) || em <= agora) throw new HttpError(400, 'o horário do agendamento tem que ser no futuro');
                if (em > agora + UM_ANO) throw new HttpError(400, 'agendamento longe demais (máximo 1 ano)');
                estado = 'agendado';
                publicarEm = Math.floor(em);
            } else {
                estado = 'rascunho';
            }
            await ctx.db.query(
                `INSERT INTO lancamentos (comic_id, chapter_id, estado, publicar_em, publicado_em, aviso, atualizado_por, atualizado_em)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (comic_id, chapter_id) DO UPDATE SET estado = $3, publicar_em = $4, publicado_em = $5,
                     aviso = $6, atualizado_por = $7, atualizado_em = $8`,
                [comic, capitulo, estado, publicarEm, publicadoEm, acao === 'esconder' ? false : avisar === true, ctx.usuario.id, agora]);
            await registrar(ctx, acao === 'publicar' ? 'publish' : acao === 'agendar' ? 'schedule' : 'unpublish', null,
                `${comic}/${capitulo}${publicarEm ? ` @${publicarEm}` : ''}`);
            return { comic, capitulo, estado, publicarEm, publicadoEm, avisar: acao !== 'esconder' && avisar === true };
        },
    },
];

module.exports = { rotas };
