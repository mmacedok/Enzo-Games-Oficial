// ============================================================================
// Batalha dos Torados online: o servidor é o juiz (plano em docs/PLANO-MULTIPLAYER.md).
// Guarda a partida completa, roda o mesmo motor da tela (js/tcg-regras.js) e cada
// jogador só recebe a própria visão (visaoDe) e os eventos que pode ver (eventosPara).
//
//   POST /api/tcg/salas                      { deck }  -> { codigo }
//   GET  /api/tcg/salas/:codigo              quem criou, deck e se a partida já começou
//   POST /api/tcg/salas/:codigo/entrar       { deck }  -> cria a partida
//   POST /api/tcg/salas/:codigo/cancelar     só quem criou, antes de alguém entrar
//   GET  /api/tcg/atual                      partida em andamento e sala aberta do jogador
//   GET  /api/tcg/partidas/:id?desde=<n>     "teve jogada?": { versao } ou visão + eventos novos
//   POST /api/tcg/partidas/:id/jogada        { jogada, versao, regras }
//
// Sem nada rodando sozinho no servidor: o relógio do turno é conferido a cada
// chamada (quem estourou o prazo passa a vez; 3 estouros seguidos = derrota).
// Sem transações (driver HTTP do Neon): cada gravação é UM comando com a
// condição no próprio UPDATE, então duas jogadas ao mesmo tempo nunca valem as duas.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const R = require('../js/tcg-regras.js');
const { DECKS_PRONTOS } = require('../js/tcg-cartas.js');

const SALA_DURA = 15 * 60 * 1000;
const TURNO = 60 * 1000;
const ESTOUROS_PARA_PERDER = 3;
const PARTIDAS_POR_DIA = 50;
const PARTIDAS_POR_JOGADOR = 10;
const GUARDAR_TERMINADAS = 7 * 24 * 3600 * 1000;
const DIA = 24 * 3600 * 1000;
/** Estouros resolvidos numa chamada só (se os dois sumiram há muito tempo). */
const MAX_ESTOUROS_POR_VEZ = 12;
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODIGO = /^TORA-[A-Z0-9]{3}$/;
const ID = /^[0-9a-f-]{36}$/;

const deckPronto = (id) => DECKS_PRONTOS.find((d) => d.id === id) || null;

function lerDeck(id) {
    const d = typeof id === 'string' ? deckPronto(id) : null;
    if (!d) throw new HttpError(400, `deck: ${DECKS_PRONTOS.map((x) => x.id).join(', ')}`);
    return d;
}

function lerCodigo(texto) {
    const codigo = String(texto || '').toUpperCase();
    if (!CODIGO.test(codigo)) throw new HttpError(404, 'sala não encontrada');
    return codigo;
}

function novoCodigo(aleatorio) {
    let s = 'TORA-';
    for (let i = 0; i < 3; i++) s += LETRAS[aleatorio(LETRAS.length)];
    return s;
}

const quemDeve = R.quemDeve;

/** O que o servidor joga por quem estourou o tempo. */
function jogadaAutomatica(estado, j) {
    if (estado.fase === 'preparacao' || estado.pendentes.length) return R.jogadasValidas(estado, j)[0];
    return { tipo: 'passar', jogador: j };
}

function linhaParaPartida(l) {
    return {
        id: l.id,
        jogadores: [l.jogador_a, l.jogador_b],
        decks: [l.deck_a, l.deck_b],
        estado: JSON.parse(l.estado),
        versao: Number(l.versao),
        prazo: Number(l.prazo),
        estouros: [Number(l.estouros_a), Number(l.estouros_b)],
        status: l.status,
    };
}

async function carregar(ctx, id) {
    if (!ID.test(id)) throw new HttpError(404, 'partida não encontrada');
    const [l] = await ctx.db.query('SELECT * FROM tcg_partidas WHERE id = $1', [id]);
    if (!l) throw new HttpError(404, 'partida não encontrada');
    const p = linhaParaPartida(l);
    p.eu = p.jogadores.indexOf(ctx.usuario.id);
    if (p.eu < 0) throw new HttpError(404, 'partida não encontrada');
    return p;
}

/**
 * Grava uma jogada: UPDATE só se a versão ainda for a lida, e a jogada no mesmo comando.
 * Devolve false se alguém gravou antes.
 */
async function gravar(ctx, p, novo, { jogador, jogada, eventos, automatica, prazo, estouros }) {
    const agora = ctx.agora();
    const status = novo.fase === 'fim' ? 'fim' : 'jogando';
    const linhas = await ctx.db.query(
        `WITH up AS (
             UPDATE tcg_partidas
                SET estado = $3, versao = versao + 1, prazo = $4, estouros_a = $5, estouros_b = $6,
                    status = $7, vencedor = $8, motivo = $9, atualizado_em = $10
              WHERE id = $1 AND versao = $2
          RETURNING id, versao)
         INSERT INTO tcg_jogadas (partida_id, n, jogador, jogada, eventos, automatica, criado_em)
         SELECT id, versao, $11, $12, $13, $14, $10 FROM up RETURNING n`,
        [p.id, p.versao, JSON.stringify(novo), prazo, estouros[0], estouros[1],
            status, novo.vencedor, novo.motivo, agora,
            jogador, JSON.stringify(jogada), JSON.stringify(eventos), automatica]);
    if (!linhas.length) return false;
    p.estado = novo;
    p.versao += 1;
    p.prazo = prazo;
    p.estouros = estouros;
    p.status = status;
    if (status === 'fim') await registrarResultado(ctx, p);
    return true;
}

async function registrarResultado(ctx, p) {
    const v = p.estado.vencedor;
    const vencedor = v === 0 || v === 1 ? p.jogadores[v] : null;
    const perdedor = v === 0 || v === 1 ? p.jogadores[1 - v] : null;
    await ctx.db.query(
        `INSERT INTO tcg_resultados (partida_id, vencedor, perdedor, decks, turnos, motivo, fim_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (partida_id) DO NOTHING`,
        [p.id, vencedor, perdedor, JSON.stringify(p.decks), p.estado.turno, p.estado.motivo, ctx.agora()]);
}

/**
 * O relógio do turno, conferido a cada chamada: quem estourou o prazo passa a vez
 * (ou tem a escolha feita por ele); 3 estouros seguidos = desistência.
 */
async function conferirRelogio(ctx, p) {
    for (let i = 0; i < MAX_ESTOUROS_POR_VEZ && p.status === 'jogando' && ctx.agora() > p.prazo; i++) {
        const atrasados = quemDeve(p.estado);
        let novo = p.estado;
        const eventos = [];
        const estouros = p.estouros.slice();
        const jogadas = [];
        for (const j of atrasados) {
            if (novo.fase === 'fim') break;
            estouros[j] += 1;
            const jogada = estouros[j] >= ESTOUROS_PARA_PERDER
                ? { tipo: 'desistir', jogador: j }
                : jogadaAutomatica(novo, j);
            const r = R.aplicar(novo, jogada);
            novo = r.estado;
            eventos.push({ tipo: 'tempo', jogador: j, estouros: estouros[j] }, ...r.eventos);
            jogadas.push(jogada);
        }
        // O próximo prazo conta do prazo que estourou: se os dois sumiram, as vezes perdidas se acumulam.
        const prazo = p.prazo + TURNO;
        const gravou = await gravar(ctx, p, novo, {
            jogador: atrasados.length === 1 ? atrasados[0] : -1,
            jogada: jogadas.length === 1 ? jogadas[0] : { tipo: 'varias', jogadas },
            eventos, automatica: true, prazo, estouros,
        });
        if (!gravou) return recarregarSeMudou(ctx, p);
    }
    return p;
}

async function recarregarSeMudou(ctx, p) {
    const novo = await carregar(ctx, p.id);
    return conferirRelogio(ctx, novo);
}

/** Resposta para o jogador: só a visão dele e os eventos novos desde `desde`. */
async function resposta(ctx, p, desde) {
    const base = {
        id: p.id, versao: p.versao, prazo: p.prazo, agora: ctx.agora(), eu: p.eu,
        estouros: p.estouros, status: p.status, regras: R.REGRAS_VERSAO,
    };
    if (desde === p.versao) return base;
    let eventos = [];
    if (Number.isInteger(desde) && desde >= 0 && desde < p.versao) {
        const linhas = await ctx.db.query(
            'SELECT eventos FROM tcg_jogadas WHERE partida_id = $1 AND n > $2 ORDER BY n', [p.id, desde]);
        eventos = linhas.flatMap((l) => R.eventosPara(JSON.parse(l.eventos), p.eu));
    }
    return { ...base, decks: p.decks, visao: R.visaoDe(p.estado, p.eu), eventos };
}

async function limpar(ctx) {
    const agora = ctx.agora();
    await ctx.db.query('DELETE FROM tcg_salas WHERE expira_em < $1', [agora - DIA]);
    await ctx.db.query(`DELETE FROM tcg_partidas WHERE status = 'fim' AND atualizado_em < $1`, [agora - GUARDAR_TERMINADAS]);
}

async function partidaEmAndamento(ctx, userId) {
    const [l] = await ctx.db.query(
        `SELECT id FROM tcg_partidas WHERE status = 'jogando' AND (jogador_a = $1 OR jogador_b = $1)
          ORDER BY criado_em DESC LIMIT 1`, [userId]);
    return l?.id || null;
}

async function conferirLimites(ctx, userId) {
    const desde = ctx.agora() - DIA;
    const [site] = await ctx.db.query('SELECT COUNT(*) AS n FROM tcg_partidas WHERE criado_em > $1', [desde]);
    if (Number(site.n) >= PARTIDAS_POR_DIA) throw new HttpError(429, 'o limite de partidas online de hoje acabou; jogue contra o NPC');
    const [meu] = await ctx.db.query(
        'SELECT COUNT(*) AS n FROM tcg_partidas WHERE criado_em > $1 AND (jogador_a = $2 OR jogador_b = $2)', [desde, userId]);
    if (Number(meu.n) >= PARTIDAS_POR_JOGADOR) throw new HttpError(429, `você já jogou ${PARTIDAS_POR_JOGADOR} partidas online hoje`);
}

async function semPartidaAberta(ctx) {
    const id = await partidaEmAndamento(ctx, ctx.usuario.id);
    if (id) throw new HttpError(409, 'você já está numa partida', { partida: id });
}

const rotas = [
    {
        metodo: 'POST', caminho: '/api/tcg/salas', login: true,
        async executar(ctx) {
            const { deck } = await ctx.corpo();
            const d = lerDeck(deck);
            await semPartidaAberta(ctx);
            await conferirLimites(ctx, ctx.usuario.id);
            await limpar(ctx);
            // Uma sala aberta por jogador: a nova substitui a antiga.
            await ctx.db.query('DELETE FROM tcg_salas WHERE criador = $1 AND partida_id IS NULL', [ctx.usuario.id]);
            const agora = ctx.agora();
            for (let tentativa = 0; tentativa < 8; tentativa++) {
                const codigo = novoCodigo(ctx.aleatorio);
                const linhas = await ctx.db.query(
                    `INSERT INTO tcg_salas (codigo, criador, deck, criado_em, expira_em) VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (codigo) DO UPDATE SET criador = EXCLUDED.criador, deck = EXCLUDED.deck,
                         criado_em = EXCLUDED.criado_em, expira_em = EXCLUDED.expira_em, partida_id = NULL
                      WHERE tcg_salas.expira_em < $4 AND tcg_salas.partida_id IS NULL
                     RETURNING codigo`,
                    [codigo, ctx.usuario.id, d.id, agora, agora + SALA_DURA]);
                if (linhas.length) return { codigo, expira: agora + SALA_DURA, deck: d.id };
            }
            throw new HttpError(503, 'não consegui criar a sala, tente de novo');
        },
    },
    {
        metodo: 'GET', caminho: /^\/api\/tcg\/salas\/([^/]{1,16})$/, login: true,
        async executar(ctx) {
            const codigo = lerCodigo(ctx.params[0]);
            const [s] = await ctx.db.query(
                `SELECT s.*, u.display_name FROM tcg_salas s JOIN users u ON u.id = s.criador WHERE s.codigo = $1`, [codigo]);
            if (!s || (Number(s.expira_em) < ctx.agora() && !s.partida_id)) throw new HttpError(404, 'sala não encontrada ou expirada');
            return {
                codigo, deck: s.deck, criador: s.display_name, minha: s.criador === ctx.usuario.id,
                expira: Number(s.expira_em), partida: s.partida_id || null,
            };
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/tcg\/salas\/([^/]{1,16})\/entrar$/, login: true,
        async executar(ctx) {
            const codigo = lerCodigo(ctx.params[0]);
            const { deck } = await ctx.corpo();
            const d = lerDeck(deck);
            const eu = ctx.usuario.id;
            await semPartidaAberta(ctx);
            const [s] = await ctx.db.query('SELECT * FROM tcg_salas WHERE codigo = $1', [codigo]);
            if (!s || Number(s.expira_em) < ctx.agora() || s.partida_id) throw new HttpError(404, 'sala não encontrada ou expirada');
            if (s.criador === eu) throw new HttpError(400, 'essa sala é sua: mande o código para um amigo');
            await conferirLimites(ctx, eu);
            if (await partidaEmAndamento(ctx, s.criador)) throw new HttpError(409, 'quem criou a sala já está em outra partida');

            const id = crypto.randomUUID();
            const agora = ctx.agora();
            // Pega a sala num comando só: dois entrando ao mesmo tempo, só um consegue.
            const pegou = await ctx.db.query(
                `UPDATE tcg_salas SET partida_id = $2 WHERE codigo = $1 AND partida_id IS NULL AND expira_em >= $3 RETURNING criador, deck`,
                [codigo, id, agora]);
            if (!pegou.length) throw new HttpError(409, 'alguém entrou nessa sala antes');
            const [nomeA] = await ctx.db.query('SELECT display_name FROM users WHERE id = $1', [s.criador]);
            const deckA = deckPronto(pegou[0].deck);
            const estado = R.criarPartida({
                semente: ctx.aleatorio(2 ** 31 - 1),
                decks: [deckA.cartas, d.cartas],
                nomes: [nomeA?.display_name || 'Jogador 1', ctx.usuario.display_name || 'Jogador 2'],
            });
            await ctx.db.query(
                `INSERT INTO tcg_partidas (id, jogador_a, jogador_b, deck_a, deck_b, estado, versao, regras, prazo, criado_em, atualizado_em)
                 VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $9)`,
                [id, s.criador, eu, deckA.id, d.id, JSON.stringify(estado), R.REGRAS_VERSAO, agora + TURNO, agora]);
            const p = await carregar(ctx, id);
            return resposta(ctx, p, -1);
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/tcg\/salas\/([^/]{1,16})\/cancelar$/, login: true,
        async executar(ctx) {
            const codigo = lerCodigo(ctx.params[0]);
            await ctx.db.query('DELETE FROM tcg_salas WHERE codigo = $1 AND criador = $2 AND partida_id IS NULL', [codigo, ctx.usuario.id]);
            return { ok: true };
        },
    },
    {
        metodo: 'GET', caminho: '/api/tcg/atual', login: true,
        async executar(ctx) {
            const partida = await partidaEmAndamento(ctx, ctx.usuario.id);
            const [s] = await ctx.db.query(
                `SELECT codigo, expira_em FROM tcg_salas WHERE criador = $1 AND partida_id IS NULL AND expira_em >= $2
                  ORDER BY criado_em DESC LIMIT 1`, [ctx.usuario.id, ctx.agora()]);
            return { partida, sala: s ? { codigo: s.codigo, expira: Number(s.expira_em) } : null, regras: R.REGRAS_VERSAO };
        },
    },
    {
        metodo: 'GET', caminho: /^\/api\/tcg\/partidas\/([^/]{1,64})$/, login: true,
        async executar(ctx) {
            let p = await carregar(ctx, ctx.params[0]);
            p = await conferirRelogio(ctx, p);
            const desde = ctx.url.searchParams.has('desde') ? Number(ctx.url.searchParams.get('desde')) : -1;
            return resposta(ctx, p, desde);
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/tcg\/partidas\/([^/]{1,64})\/jogada$/, login: true,
        async executar(ctx) {
            const { jogada, versao, regras } = await ctx.corpo();
            if (regras !== R.REGRAS_VERSAO) throw new HttpError(409, 'o jogo foi atualizado: recarregue a página', { recarregar: true });
            if (!jogada || typeof jogada !== 'object' || Array.isArray(jogada)) throw new HttpError(400, 'jogada vazia');
            let p = await carregar(ctx, ctx.params[0]);
            p = await conferirRelogio(ctx, p);
            if (p.status !== 'jogando') throw new HttpError(409, 'a partida acabou', { versao: p.versao });
            if (versao !== p.versao) throw new HttpError(409, 'a mesa mudou: atualize', { versao: p.versao });
            // O lado de quem joga vem do login, nunca do navegador.
            const minha = { ...jogada, jogador: p.eu };
            let r;
            try {
                r = R.aplicar(p.estado, minha);
            } catch (erro) {
                if (erro instanceof R.JogadaInvalida) throw new HttpError(400, erro.message);
                throw erro;
            }
            const estouros = p.estouros.slice();
            estouros[p.eu] = 0;
            // O prazo recomeça quando muda quem precisa agir (vez nova, escolha pendente, preparo).
            const antes = quemDeve(p.estado).join();
            const depois = quemDeve(r.estado).join();
            const prazo = antes === depois ? p.prazo : ctx.agora() + TURNO;
            const desde = p.versao;
            const gravou = await gravar(ctx, p, r.estado, {
                jogador: p.eu, jogada: minha, eventos: r.eventos, automatica: false, prazo, estouros,
            });
            if (!gravou) throw new HttpError(409, 'a mesa mudou: atualize', { versao: p.versao + 1 });
            return resposta(ctx, p, desde);
        },
    },
];

module.exports = { rotas, quemDeve, jogadaAutomatica, TURNO, ESTOUROS_PARA_PERDER, PARTIDAS_POR_DIA, PARTIDAS_POR_JOGADOR };
