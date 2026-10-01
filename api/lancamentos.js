// ============================================================================
// Lançamentos (aba "lançamentos" do terminal admin): publicar, agendar ou esconder
// um capítulo em um clique, sem deploy. O estado de cada capítulo fica no banco.
//
//   POST /api/admin/lancamentos   { comic, capitulo, acao: 'publicar' | 'agendar' | 'esconder', em?, avisar? }
//   (a leitura pública é GET /api/site/revelados, em api/admin.js: junta os capítulos e os avisos)
//
// Regra de visibilidade (a mesma no site, em js/lancamentos.js): se o capítulo tem linha aqui, ela manda
// (`no-ar`; `agendado` abre em `publicar_em`; `rascunho` fica escondido). Sem linha, vale o catálogo
// (`hidden` do gibi ou do capítulo no manifesto, mais o `reveal` antigo). Toda ação vai para o admin_log.
// ============================================================================
const { HttpError } = require('./http.js');
const { registrar } = require('./admin.js');

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ACOES = ['publicar', 'agendar', 'esconder'];
const UM_ANO = 366 * 24 * 60 * 60 * 1000;

const rotas = [
    {
        metodo: 'POST', caminho: '/api/admin/lancamentos', admin: true,
        async executar(ctx) {
            const { comic, capitulo, acao, em, avisar } = await ctx.corpo();
            if (typeof comic !== 'string' || !ID.test(comic)) throw new HttpError(400, 'id de gibi inválido');
            if (typeof capitulo !== 'string' || !ID.test(capitulo)) throw new HttpError(400, 'id de capítulo inválido');
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
