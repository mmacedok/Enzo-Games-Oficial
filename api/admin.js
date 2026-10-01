// ============================================================================
// Painel do administrador (admin.html): ver e mexer nas contas por baixo do capô.
// Quem é admin: e-mails da conta Google listados em ADMIN_EMAILS (variável de
// ambiente, separados por vírgula). Para os outros, estas rotas não existem (404).
//
//   GET  /api/admin/overview                      números do site + últimas ações
//   GET  /api/admin/users?q=&pagina=              contas (com e-mail)
//   GET  /api/admin/users/:id                     tudo de uma conta
//   POST /api/admin/users/:id/achievement         { achievement, unlocked }
//   POST /api/admin/users/:id/role                { role: 'player' | 'banned' }
//   POST /api/admin/users/:id/fala                { fala }
//   POST /api/admin/users/:id/censura             { liberada } libera/trava a censura (tarja do Cabo Côco) só para esta conta
//   POST /api/admin/users/:id/kick                derruba as sessões
//   GET  /api/admin/scores?game=                  partidas recentes de todo mundo
//   POST /api/admin/scores/:id/verify             { verified } (entra/sai do ranking)
//   POST /api/admin/scores/:id/delete
//   GET  /api/admin/tcg/partidas?q=&pagina=      histórico das partidas online da Batalha dos Torados (e as que estão rolando)
//   GET  /api/admin/acessos[/resumo]              IP, país, estado e cidade das ações (api/acessos.js)
//   GET  /api/admin/log                           histórico das ações de admin
//   POST /api/admin/reveal                        { id, revelar } mostra/esconde um gibi `hidden` do catálogo
//   GET  /api/site/revelados                      (público) ids dos gibis escondidos que já foram revelados, estado dos capítulos (lançamentos), avisos de capítulo novo + a hora do servidor
//   POST /api/admin/lancamentos                   (api/lancamentos.js) { comic, capitulo, acao, em?, avisar? }
// Toda mudança fica registrada em admin_log.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const { jogoValido } = require('./anti-cheat.js');
const { limparFala } = require('./leitores.js');
const { exigirUuid } = require('./validacao.js');
const Conquistas = require('../js/conquistas.js');

const POR_PAGINA = 50;
const SEGMENTO = '([^/]{1,64})';

/** Conjunto de e-mails (minúsculos) de ADMIN_EMAILS. */
function lerAdmins(valor) {
    return new Set(String(valor || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));
}

const ehAdmin = (config, usuario) => Boolean(usuario?.email) && config.admins.has(String(usuario.email).toLowerCase());

async function exigirUsuario(ctx, id) {
    const [usuario] = await ctx.db.query('SELECT id, display_name, email, role FROM users WHERE id = $1', [exigirUuid(id, 'conta não encontrada')]);
    if (!usuario) throw new HttpError(404, 'conta não encontrada');
    return usuario;
}

async function registrar(ctx, acao, alvo, detalhe = null) {
    await ctx.db.query(
        'INSERT INTO admin_log (id, admin_id, acao, alvo, detalhe, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), ctx.usuario.id, acao, alvo, detalhe === null ? null : String(detalhe).slice(0, 200), ctx.agora()]);
}

async function ultimasAcoes(db, limite) {
    const linhas = await db.query(
        `SELECT l.acao, l.alvo, l.detalhe, l.created_at, a.display_name AS admin, u.display_name AS alvo_nome
           FROM admin_log l
           LEFT JOIN users a ON a.id = l.admin_id
           LEFT JOIN users u ON u.id = l.alvo
          ORDER BY l.created_at DESC, l.id LIMIT $1`, [limite]);
    return linhas.map((l) => ({
        acao: l.acao, alvo: l.alvo, alvoNome: l.alvo_nome || null, detalhe: l.detalhe,
        admin: l.admin || '?', em: Number(l.created_at),
    }));
}

const partida = (s) => ({
    id: s.id, gameId: s.game_id, score: Number(s.score), durationMs: Number(s.duration_ms),
    verified: Boolean(s.verified), metadata: s.client_metadata, em: Number(s.created_at),
});

const rotas = [
    {
        // Público: o site pergunta antes de montar as estantes. Não é segredo, só decide o que listar.
        metodo: 'GET', caminho: '/api/site/revelados',
        async executar(ctx) {
            const linhas = await ctx.db.query('SELECT comic_id FROM gibis_revelados ORDER BY created_at');
            // `agora` (relógio do servidor) deixa o site liberar sozinho os gibis com `revealAt` (data/comics.manifest.json).
            const agora = ctx.agora();
            // Capítulos com estado próprio (aba "lançamentos"): `em` = quando abre/abriu; o aviso "Novo capítulo!" vale 7 dias.
            const estados = await ctx.db.query('SELECT comic_id, chapter_id, estado, publicar_em, publicado_em, aviso FROM lancamentos');
            const capitulos = estados.map((l) => ({
                c: `${l.comic_id}/${l.chapter_id}`, estado: l.estado,
                em: Number(l.estado === 'agendado' ? l.publicar_em : l.publicado_em) || null,
            }));
            const avisos = estados
                .filter((l) => l.aviso && (l.estado === 'no-ar' || (l.estado === 'agendado' && Number(l.publicar_em) <= agora)))
                .map((l) => ({ c: `${l.comic_id}/${l.chapter_id}`, em: Number(l.estado === 'agendado' ? l.publicar_em : l.publicado_em) }))
                .filter((a) => agora - a.em < 7 * 24 * 60 * 60 * 1000);
            // Capítulos que ESTE leitor (logado) vê antes da hora, por acesso antecipado dado pelo admin.
            const meus = ctx.usuario
                ? (await ctx.db.query('SELECT comic_id, chapter_id FROM lancamentos_acesso WHERE user_id = $1', [ctx.usuario.id])).map((l) => `${l.comic_id}/${l.chapter_id}`)
                : [];
            return { ids: linhas.map((l) => l.comic_id), capitulos, avisos, meus, agora };
        },
    },
    {
        metodo: 'POST', caminho: '/api/admin/reveal', admin: true,
        async executar(ctx) {
            const { id, revelar } = await ctx.corpo();
            if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new HttpError(400, 'id de gibi inválido');
            if (typeof revelar !== 'boolean') throw new HttpError(400, 'revelar deve ser true ou false');
            const linhas = revelar
                ? await ctx.db.query(
                    'INSERT INTO gibis_revelados (comic_id, created_at) VALUES ($1, $2) ON CONFLICT (comic_id) DO NOTHING RETURNING comic_id',
                    [id, ctx.agora()])
                : await ctx.db.query('DELETE FROM gibis_revelados WHERE comic_id = $1 RETURNING comic_id', [id]);
            if (linhas.length) await registrar(ctx, revelar ? 'reveal' : 'hide', null, id);
            return { id, revelado: revelar, mudou: linhas.length > 0 };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/overview', admin: true,
        async executar(ctx) {
            const agora = ctx.agora();
            const [n] = await ctx.db.query(
                `SELECT (SELECT COUNT(*) FROM users) AS contas,
                        (SELECT COUNT(*) FROM users WHERE role = 'banned') AS banidos,
                        (SELECT COUNT(*) FROM users WHERE last_login_at > $1) AS ativos_7d,
                        (SELECT COUNT(*) FROM sessions WHERE expires_at > $2 AND NOT lembrar) AS sessoes,
                        (SELECT COUNT(*) FROM game_scores WHERE verified) AS partidas,
                        (SELECT COUNT(*) FROM game_scores WHERE NOT verified) AS partidas_fora,
                        (SELECT COUNT(*) FROM user_achievements) AS conquistas,
                        (SELECT COUNT(*) FROM reading_progress WHERE completed) AS capitulos_lidos`,
                [agora - 7 * 24 * 60 * 60 * 1000, agora]);
            const numeros = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Number(v)]));
            return { agora, numeros, log: await ultimasAcoes(ctx.db, 8) };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/users', admin: true,
        async executar(ctx) {
            const pagina = Math.max(0, Math.min(1000, Number.parseInt(ctx.url.searchParams.get('pagina'), 10) || 0));
            const busca = String(ctx.url.searchParams.get('q') || '').trim().slice(0, 80);
            const filtro = busca ? `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
            const linhas = await ctx.db.query(
                `SELECT u.id, u.display_name, u.email, u.role, u.avatar_url, u.fala, u.censura_liberada, u.created_at, u.last_login_at,
                        COALESCE(a.conquistas, 0) AS conquistas, COALESCE(a.secretos, 0) AS secretos,
                        COALESCE(s.partidas, 0) AS partidas
                   FROM users u
                   LEFT JOIN (SELECT user_id,
                                     COUNT(*) FILTER (WHERE achievement_id NOT LIKE 'enzo-secreto-%') AS conquistas,
                                     COUNT(*) FILTER (WHERE achievement_id LIKE 'enzo-secreto-%') AS secretos
                                FROM user_achievements GROUP BY user_id) a ON a.user_id = u.id
                   LEFT JOIN (SELECT user_id, COUNT(*) AS partidas FROM game_scores GROUP BY user_id) s ON s.user_id = u.id
                  WHERE $1::text IS NULL OR u.display_name ILIKE $1 OR u.email ILIKE $1 OR u.id = $4
                  ORDER BY u.last_login_at DESC, u.id
                  LIMIT $2 OFFSET $3`,
                [filtro, POR_PAGINA + 1, pagina * POR_PAGINA, busca]);
            return {
                users: linhas.slice(0, POR_PAGINA).map((l) => ({
                    id: l.id, name: l.display_name, email: l.email, role: l.role, avatarUrl: l.avatar_url || null,
                    fala: l.fala || null, censuraLiberada: l.censura_liberada === true,
                    criadoEm: Number(l.created_at), ultimoLogin: Number(l.last_login_at),
                    conquistas: Number(l.conquistas), secretos: Number(l.secretos), partidas: Number(l.partidas),
                    admin: ehAdmin(ctx.config, l),
                })),
                pagina,
                maisPaginas: linhas.length > POR_PAGINA,
            };
        },
    },
    {
        metodo: 'GET', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}$`), admin: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'conta não encontrada');
            const [u] = await ctx.db.query('SELECT * FROM users WHERE id = $1', [id]);
            if (!u) throw new HttpError(404, 'conta não encontrada');
            const conquistas = await ctx.db.query(
                'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at', [id]);
            const partidas = await ctx.db.query(
                'SELECT * FROM game_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [id]);
            const leitura = await ctx.db.query(
                `SELECT comic_id, chapter_id, last_page, completed, updated_at FROM reading_progress
                  WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 300`, [id]);
            const [{ sessoes }] = await ctx.db.query(
                'SELECT COUNT(*) AS sessoes FROM sessions WHERE user_id = $1 AND expires_at > $2 AND NOT lembrar', [id, ctx.agora()]);
            const acessos = await ctx.db.query(
                'SELECT * FROM acessos WHERE user_id = $1 ORDER BY created_at DESC, id LIMIT 50', [id]);
            const [deckLinha] = await ctx.db.query('SELECT nome, publico, cartas FROM tcg_deck_custom WHERE user_id = $1', [id]);
            // require aqui dentro: api/baralho.js também usa este arquivo.
            const baralho = await require('./baralho.js').estado(ctx.db, id);
            return {
                id: u.id, name: u.display_name, email: u.email, role: u.role, avatarUrl: u.avatar_url || null,
                fala: u.fala || null, censuraLiberada: u.censura_liberada === true,
                criadoEm: Number(u.created_at), ultimoLogin: Number(u.last_login_at),
                admin: ehAdmin(ctx.config, u), sessoes: Number(sessoes),
                achievements: conquistas.map((c) => ({ id: c.achievement_id, em: Number(c.unlocked_at) })),
                scores: partidas.map(partida),
                baralho,
                acessos: acessos.map(require('./acessos.js').linha),
                deck: deckLinha ? { nome: deckLinha.nome || '', publico: deckLinha.publico === true, cartas: (JSON.parse(deckLinha.cartas) || []).length } : null,
                reading: leitura.map((p) => ({
                    comicId: p.comic_id, chapterId: p.chapter_id, page: Number(p.last_page),
                    completed: Boolean(p.completed), em: Number(p.updated_at),
                })),
            };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/achievement$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const { achievement, unlocked } = await ctx.corpo();
            if (!Conquistas.idValido(achievement)) throw new HttpError(400, 'conquista desconhecida');
            if (typeof unlocked !== 'boolean') throw new HttpError(400, 'unlocked deve ser true ou false');
            const linhas = unlocked
                ? await ctx.db.query(
                    `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3)
                     ON CONFLICT (user_id, achievement_id) DO NOTHING RETURNING achievement_id`,
                    [alvo.id, achievement, ctx.agora()])
                : await ctx.db.query(
                    'DELETE FROM user_achievements WHERE user_id = $1 AND achievement_id = $2 RETURNING achievement_id',
                    [alvo.id, achievement]);
            if (linhas.length) await registrar(ctx, unlocked ? 'grant' : 'revoke', alvo.id, achievement);
            return { achievement, unlocked, changed: linhas.length > 0 };
        },
    },
    {
        // Em lote: todas as conquistas, todos os Enzos secretos ou tudo. { grupo: 'conquistas'|'secretos'|'todos', unlocked }
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/achievements$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const { grupo, unlocked } = await ctx.corpo();
            if (!['conquistas', 'secretos', 'todos'].includes(grupo)) throw new HttpError(400, 'grupo deve ser conquistas, secretos ou todos');
            if (typeof unlocked !== 'boolean') throw new HttpError(400, 'unlocked deve ser true ou false');
            const ids = [];
            if (grupo !== 'secretos') ids.push(...Conquistas.LISTA.map((c) => c.id));
            if (grupo !== 'conquistas') for (let n = 1; n <= Conquistas.SECRETOS; n++) ids.push(Conquistas.idSecreto(n));
            const linhas = unlocked
                ? await ctx.db.query(
                    `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) SELECT $1, x, $3 FROM unnest($2::text[]) AS x
                     ON CONFLICT (user_id, achievement_id) DO NOTHING RETURNING achievement_id`, [alvo.id, ids, ctx.agora()])
                : await ctx.db.query('DELETE FROM user_achievements WHERE user_id = $1 AND achievement_id = ANY($2::text[]) RETURNING achievement_id', [alvo.id, ids]);
            if (linhas.length) await registrar(ctx, unlocked ? 'grant-lote' : 'revoke-lote', alvo.id, `${grupo}: ${linhas.length}`);
            return { grupo, unlocked, changed: linhas.length };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/role$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const { role } = await ctx.corpo();
            if (role !== 'player' && role !== 'banned') throw new HttpError(400, "role deve ser 'player' ou 'banned'");
            if (alvo.id === ctx.usuario.id) throw new HttpError(400, 'você não pode banir a própria conta');
            if (role === 'banned' && ehAdmin(ctx.config, alvo)) throw new HttpError(400, 'não dá para banir outro admin');
            await ctx.db.query('UPDATE users SET role = $2 WHERE id = $1', [alvo.id, role]);
            if (role === 'banned') await ctx.db.query('DELETE FROM sessions WHERE user_id = $1', [alvo.id]);
            if (alvo.role !== role) await registrar(ctx, role === 'banned' ? 'ban' : 'unban', alvo.id);
            return { role };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/censura$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const { liberada } = await ctx.corpo();
            if (typeof liberada !== 'boolean') throw new HttpError(400, 'liberada deve ser true ou false');
            const [antes] = await ctx.db.query('SELECT censura_liberada FROM users WHERE id = $1', [alvo.id]);
            await ctx.db.query('UPDATE users SET censura_liberada = $2 WHERE id = $1', [alvo.id, liberada]);
            const mudou = (antes?.censura_liberada === true) !== liberada;
            if (mudou) await registrar(ctx, liberada ? 'censura-on' : 'censura-off', alvo.id);
            return { liberada, mudou };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/fala$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            const fala = limparFala((await ctx.corpo()).fala);
            await ctx.db.query('UPDATE users SET fala = $2 WHERE id = $1', [alvo.id, fala]);
            await registrar(ctx, 'fala', alvo.id, fala ?? '(fala do Enzo)');
            return { fala };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/users/${SEGMENTO}/kick$`), admin: true,
        async executar(ctx) {
            const alvo = await exigirUsuario(ctx, ctx.params[0]);
            if (alvo.id === ctx.usuario.id) throw new HttpError(400, 'use "Sair da conta" para derrubar a sua sessão');
            // derruba também as chaves de aparelho (lembrar), mas só conta as sessões de verdade
            const linhas = (await ctx.db.query('DELETE FROM sessions WHERE user_id = $1 RETURNING id, lembrar', [alvo.id])).filter((l) => !l.lembrar);
            await registrar(ctx, 'kick', alvo.id, `${linhas.length} sessão(ões)`);
            return { sessoes: linhas.length };
        },
    },
    {
        // Histórico da Batalha dos Torados online: as partidas que acabaram (tcg_resultados, fica para sempre) e as em andamento.
        metodo: 'GET', caminho: '/api/admin/tcg/partidas', admin: true,
        async executar(ctx) {
            const pagina = Math.max(0, Math.min(1000, Number.parseInt(ctx.url.searchParams.get('pagina'), 10) || 0));
            const busca = String(ctx.url.searchParams.get('q') || '').trim().slice(0, 80);
            const filtro = busca ? `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
            const quem = (id, nome) => (id ? { id, name: nome || '(conta apagada)' } : null);
            const linhas = await ctx.db.query(
                `SELECT r.partida_id, r.vencedor, r.decks, r.turnos, r.motivo, r.fim_em,
                        COALESCE(r.jogador_a, r.vencedor) AS ja, COALESCE(r.jogador_b, r.perdedor) AS jb,
                        ua.display_name AS na, ub.display_name AS nb
                   FROM tcg_resultados r
                   LEFT JOIN users ua ON ua.id = COALESCE(r.jogador_a, r.vencedor)
                   LEFT JOIN users ub ON ub.id = COALESCE(r.jogador_b, r.perdedor)
                  WHERE $1::text IS NULL OR ua.display_name ILIKE $1 OR ub.display_name ILIKE $1 OR ua.email ILIKE $1 OR ub.email ILIKE $1
                        OR r.jogador_a = $4 OR r.jogador_b = $4
                  ORDER BY r.fim_em DESC, r.partida_id
                  LIMIT $2 OFFSET $3`,
                [filtro, POR_PAGINA + 1, pagina * POR_PAGINA, busca]);
            const partidas = linhas.slice(0, POR_PAGINA).map((l) => {
                let decks = [];
                try { decks = JSON.parse(l.decks); } catch { /* sem decks guardados */ }
                const turnos = Number(l.turnos);
                return {
                    id: l.partida_id, fimEm: Number(l.fim_em), turnos, rodadas: Math.max(1, Math.ceil(turnos / 2)),
                    motivo: l.motivo || null, empate: !l.vencedor,
                    vencedor: l.vencedor ? quem(l.vencedor, l.vencedor === l.ja ? l.na : l.nb) : null,
                    a: quem(l.ja, l.na), b: quem(l.jb, l.nb), decks: Array.isArray(decks) ? decks : [],
                };
            });
            let aoVivo = [];
            if (pagina === 0) {
                const vivas = await ctx.db.query(
                    `SELECT p.id, p.jogador_a, p.jogador_b, p.estado, p.criado_em, p.atualizado_em, ua.display_name AS na, ub.display_name AS nb
                       FROM tcg_partidas p JOIN users ua ON ua.id = p.jogador_a JOIN users ub ON ub.id = p.jogador_b
                      WHERE p.status = 'jogando'
                        AND ($1::text IS NULL OR ua.display_name ILIKE $1 OR ub.display_name ILIKE $1 OR p.jogador_a = $2 OR p.jogador_b = $2)
                      ORDER BY p.criado_em DESC LIMIT 20`, [filtro, busca]);
                // Partida 'jogando' sem nenhuma jogada há 10 minutos foi abandonada (ninguém voltou para o relógio encerrar): não é "ao vivo".
                aoVivo = vivas.map((p) => {
                    let turno = null;
                    try { turno = JSON.parse(p.estado).turno; } catch { /* estado ilegível */ }
                    const ultima = Number(p.atualizado_em);
                    return {
                        id: p.id, a: quem(p.jogador_a, p.na), b: quem(p.jogador_b, p.nb), desde: Number(p.criado_em), turnos: turno,
                        ultimaJogada: ultima, abandonada: ctx.agora() - ultima > 10 * 60 * 1000,
                    };
                });
            }
            return { partidas, aoVivo, temMais: linhas.length > POR_PAGINA, agora: ctx.agora() };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/scores', admin: true,
        async executar(ctx) {
            const jogo = ctx.url.searchParams.get('game') || null;
            if (jogo && !jogoValido(jogo)) throw new HttpError(400, 'jogo desconhecido');
            const linhas = await ctx.db.query(
                `SELECT s.*, u.display_name FROM game_scores s JOIN users u ON u.id = s.user_id
                  WHERE $1::text IS NULL OR s.game_id = $1
                  ORDER BY s.created_at DESC LIMIT 100`, [jogo]);
            return { scores: linhas.map((s) => ({ ...partida(s), userId: s.user_id, name: s.display_name })) };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/scores/${SEGMENTO}/verify$`), admin: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'partida não encontrada');
            const { verified } = await ctx.corpo();
            if (typeof verified !== 'boolean') throw new HttpError(400, 'verified deve ser true ou false');
            const [s] = await ctx.db.query(
                'UPDATE game_scores SET verified = $2 WHERE id = $1 RETURNING user_id, game_id, score', [id, verified]);
            if (!s) throw new HttpError(404, 'partida não encontrada');
            await registrar(ctx, verified ? 'score-on' : 'score-off', s.user_id, `${s.game_id} ${s.score}`);
            return { id, verified };
        },
    },
    {
        metodo: 'POST', caminho: new RegExp(`^/api/admin/scores/${SEGMENTO}/delete$`), admin: true,
        async executar(ctx) {
            const id = exigirUuid(ctx.params[0], 'partida não encontrada');
            const [s] = await ctx.db.query(
                'DELETE FROM game_scores WHERE id = $1 RETURNING user_id, game_id, score', [id]);
            if (!s) throw new HttpError(404, 'partida não encontrada');
            await registrar(ctx, 'rm-score', s.user_id, `${s.game_id} ${s.score}`);
            return { id, deleted: true };
        },
    },
    {
        metodo: 'GET', caminho: '/api/admin/log', admin: true,
        executar: async (ctx) => ({ log: await ultimasAcoes(ctx.db, 100) }),
    },
];

module.exports = { rotas, lerAdmins, ehAdmin, exigirUsuario, registrar };
