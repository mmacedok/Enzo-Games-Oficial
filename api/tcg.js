// ============================================================================
// Batalha dos Torados online: o servidor é o juiz (plano em docs/PLANO-MULTIPLAYER.md).
// Guarda a partida completa, roda o mesmo motor da tela (js/tcg-regras.js) e cada
// jogador só recebe a própria visão (visaoDe) e os eventos que pode ver (eventosPara).
//
//   POST /api/tcg/salas                      { deck }  -> { codigo }
//   GET  /api/tcg/salas/:codigo              quem criou, deck e se a partida já começou
//   POST /api/tcg/salas/:codigo/entrar       { deck }  -> cria a partida
//   POST /api/tcg/salas/:codigo/cancelar     só quem criou, antes de alguém entrar
//   GET  /api/tcg/salas                      salas abertas com o dono esperando (para entrar com 1 clique)
//   GET  /api/tcg/placar                     placar permanente (vitórias/derrotas online) + o meu
//   GET  /api/tcg/ao-vivo                    partidas em andamento (para assistir)
//   GET  /api/tcg/assistir/:id               visão de quem assiste (sem as mãos), como a de jogar; ?desde=versão
//   GET/POST /api/tcg/partidas/:id/comentarios  comentários da partida (quem joga e quem assiste); somem ao terminar
//   GET  /api/tcg/atual                      partida em andamento e sala aberta do jogador
//   GET  /api/tcg/partidas/:id?desde=<n>     "teve jogada?": { versao } ou visão + eventos novos
//   POST /api/tcg/partidas/:id/jogada        { jogada, versao, regras }
//
// Sem nada rodando sozinho no servidor: o relógio do turno é conferido a cada
// chamada (quem estourou o prazo passa a vez; 3 estouros seguidos = derrota por inatividade).
// Sem transações (driver HTTP do Neon): cada gravação é UM comando com a
// condição no próprio UPDATE, então duas jogadas ao mesmo tempo nunca valem as duas.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const R = require('../js/tcg-regras.js');
const { DECKS_PRONTOS } = require('../js/tcg-cartas.js');
const Baralho = require('../js/baralho-dados.js');

/**
 * Sala pública: fica na lista por 5 minutos e o tempo recomeça enquanto a tela de espera do dono
 * estiver aberta (ela pergunta "entrou alguém?" o tempo todo). Sem a tela aberta, some sozinha.
 */
const SALA_DURA = 5 * 60 * 1000;
/** Só regrava a validade da sala se faltar menos que (SALA_DURA - isto): poupa escritas. */
const RENOVAR_SALA = 5 * 1000;
/** Depois que a partida termina, os dois têm este tempo para pedir a revanche. */
const REVANCHE_DURA = 2 * 60 * 1000;
/**
 * Contra o NPC a partida roda no navegador e o servidor não confere, então o prêmio tem trava:
 * poucas partidas premiadas por dia e um intervalo mínimo entre elas.
 */
const COMENTARIO_MAX = 140;
const COMENTARIOS_POR_PARTIDA = 300;
const COMENTARIO_INTERVALO = 2000;
/** Partida sem nenhuma jogada há mais que isso não aparece na lista "ao vivo". */
const AO_VIVO_FRESCA = 10 * 60 * 1000;
const AO_VIVO_NA_LISTA = 20;
const NPC_PREMIADAS_POR_DIA = 10;
const NPC_INTERVALO = 90 * 1000;
const SALAS_NA_LISTA = 20;
const PLACAR_TOP = 50;
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
    // Partida começada numa regra antiga (ex.: pontos, antes da vida): o estado não serve no
    // motor novo. Termina sem resultado (não conta no placar) e o jogador recarrega.
    if (Number(l.regras) !== R.REGRAS_VERSAO && p.status === 'jogando') {
        await ctx.db.query(
            `UPDATE tcg_partidas SET status = 'fim', motivo = 'atualizacao', atualizado_em = $2 WHERE id = $1 AND status = 'jogando'`,
            [id, ctx.agora()]);
        throw new HttpError(409, 'o jogo foi atualizado e essa partida foi encerrada sem resultado', { recarregar: true });
    }
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
    const novo = await ctx.db.query(
        `INSERT INTO tcg_resultados (partida_id, vencedor, perdedor, decks, turnos, motivo, fim_em, jogador_a, jogador_b)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (partida_id) DO NOTHING RETURNING partida_id`,
        [p.id, vencedor, perdedor, JSON.stringify(p.decks), p.estado.turno, p.estado.motivo, ctx.agora(),
            p.jogadores[0], p.jogadores[1]]);
    // Créditos do Baralho: 500 a quem venceu, 150 a quem perdeu (empate paga como derrota). Uma vez só por partida.
    // O chat da partida some junto com ela.
    await ctx.db.query('DELETE FROM tcg_comentarios WHERE partida_id = $1', [p.id]);
    if (novo.length) {
        const { creditarConta } = require('./baralho.js');
        for (const lado of [0, 1]) {
            await creditarConta(ctx, p.jogadores[lado], recompensaOnline(p.estado.vencedor, lado), 'batalha', `online:${p.id}`);
        }
    }
}

/** Créditos de quem jogou no `lado` numa partida online que acabou com `vencedor` (0, 1 ou 'empate'). */
function recompensaOnline(vencedor, lado) {
    const c = Baralho.CREDITOS_BATALHA.online;
    return vencedor === lado ? c.vitoria : c.derrota;
}

/**
 * Placar permanente: vitórias, derrotas e empates das partidas online (só as do servidor:
 * contra o NPC roda no navegador e não dá para conferir). Top 50 + a linha de quem pede.
 */
async function classificacao(db) {
    return db.query(
        `WITH r AS (
             SELECT vencedor AS id, 1 AS v, 0 AS d, 0 AS e FROM tcg_resultados WHERE vencedor IS NOT NULL
             UNION ALL SELECT perdedor, 0, 1, 0 FROM tcg_resultados WHERE perdedor IS NOT NULL
             UNION ALL SELECT jogador_a, 0, 0, 1 FROM tcg_resultados WHERE vencedor IS NULL AND jogador_a IS NOT NULL
             UNION ALL SELECT jogador_b, 0, 0, 1 FROM tcg_resultados WHERE vencedor IS NULL AND jogador_b IS NOT NULL
         ), t AS (
             SELECT r.id, u.display_name, SUM(r.v) AS vitorias, SUM(r.d) AS derrotas, SUM(r.e) AS empates
               FROM r JOIN users u ON u.id = r.id
              WHERE u.role <> 'banned'
              GROUP BY r.id, u.display_name
         )
         SELECT *, RANK() OVER (ORDER BY vitorias DESC, derrotas ASC) AS posicao FROM t
          ORDER BY posicao, display_name`);
}

async function placar(ctx) {
    const linhas = await classificacao(ctx.db);
    const linha = (l) => ({
        nome: l.display_name, vitorias: Number(l.vitorias), derrotas: Number(l.derrotas),
        empates: Number(l.empates), posicao: Number(l.posicao),
    });
    const eu = ctx.usuario ? linhas.find((l) => l.id === ctx.usuario.id) : null;
    return {
        top: linhas.slice(0, PLACAR_TOP).map((l) => ({ ...linha(l), eu: !!eu && l.id === eu.id })),
        meu: eu ? linha(eu) : null,
    };
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
                ? { tipo: 'desistir', jogador: j, motivo: 'inatividade' }
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

const respostaBase = (ctx, p) => ({
    id: p.id, versao: p.versao, prazo: p.prazo, agora: ctx.agora(), eu: p.eu,
    estouros: p.estouros, status: p.status, regras: R.REGRAS_VERSAO,
    // Partida online acabada com resultado: quanto rendeu de créditos para este jogador.
    ...(p.status === 'fim' && p.estado && p.estado.motivo !== 'atualizacao'
        ? { creditos: recompensaOnline(p.estado.vencedor, p.eu) } : {}),
});

/**
 * Resposta para o jogador: só a visão dele e os eventos novos desde `desde`.
 * `eventosProntos`: quem acabou de gravar a jogada já tem os eventos (poupa uma ida ao banco).
 */
async function resposta(ctx, p, desde, eventosProntos = null) {
    const base = respostaBase(ctx, p);
    if (desde === p.versao) return base;
    let eventos = [];
    if (eventosProntos) {
        eventos = R.eventosPara(eventosProntos, p.eu);
    } else if (Number.isInteger(desde) && desde >= 0 && desde < p.versao) {
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
        `SELECT id FROM tcg_partidas WHERE status = 'jogando' AND (jogador_a = $1 OR jogador_b = $1) AND regras = $2
          ORDER BY criado_em DESC LIMIT 1`, [userId, R.REGRAS_VERSAO]);
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

/** Texto do comentário: sem caracteres de controle, espaços juntos, até COMENTARIO_MAX. */
function limparComentario(texto) {
    return String(texto ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, COMENTARIO_MAX);
}

/** Partida em andamento (qualquer jogador logado pode ver e comentar). */
async function lerAoVivo(ctx, id) {
    if (!ID.test(id)) throw new HttpError(404, 'partida não encontrada');
    const [l] = await ctx.db.query('SELECT * FROM tcg_partidas WHERE id = $1', [id]);
    if (!l) throw new HttpError(404, 'partida não encontrada');
    return l;
}

async function lerParaRevanche(ctx, id) {
    if (!ID.test(id)) throw new HttpError(404, 'partida não encontrada');
    const [l] = await ctx.db.query('SELECT * FROM tcg_partidas WHERE id = $1', [id]);
    const eu = l ? [l.jogador_a, l.jogador_b].indexOf(ctx.usuario.id) : -1;
    if (eu < 0) throw new HttpError(404, 'partida não encontrada');
    return { l, eu };
}

function situacaoRevanche(ctx, l, eu) {
    const meu = eu === 0 ? l.revanche_a : l.revanche_b;
    const dele = eu === 0 ? l.revanche_b : l.revanche_a;
    return {
        euQuero: meu === true, outroQuer: dele === true, partida: l.revanche_id || null,
        expirou: !l.revanche_id && ctx.agora() > Number(l.atualizado_em) + REVANCHE_DURA,
    };
}

/** Os dois querem: nasce a partida nova com os mesmos decks e os lados trocados (quem abriu agora joga em segundo). */
async function criarRevanche(ctx, l) {
    const [a, b] = [l.jogador_b, l.jogador_a];
    for (const j of [a, b]) {
        if (await partidaEmAndamento(ctx, j)) throw new HttpError(409, 'alguém já está em outra partida');
        await conferirLimites(ctx, j);
    }
    const id = crypto.randomUUID();
    const agora = ctx.agora();
    // Marca num comando só: se os dois clicarem juntos, só uma partida nasce.
    const pegou = await ctx.db.query(
        `UPDATE tcg_partidas SET revanche_id = $2 WHERE id = $1 AND revanche_id IS NULL AND revanche_a AND revanche_b RETURNING id`,
        [l.id, id]);
    if (!pegou.length) return;
    const [nomeA] = await ctx.db.query('SELECT display_name FROM users WHERE id = $1', [a]);
    const [nomeB] = await ctx.db.query('SELECT display_name FROM users WHERE id = $1', [b]);
    const deckA = deckPronto(l.deck_b);
    const deckB = deckPronto(l.deck_a);
    const estado = R.criarPartida({
        semente: ctx.aleatorio(2 ** 31 - 1),
        decks: [deckA.cartas, deckB.cartas],
        nomes: [nomeA?.display_name || 'Jogador 1', nomeB?.display_name || 'Jogador 2'],
    });
    await ctx.db.query(
        `INSERT INTO tcg_partidas (id, jogador_a, jogador_b, deck_a, deck_b, estado, versao, regras, prazo, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $9)`,
        [id, a, b, deckA.id, deckB.id, JSON.stringify(estado), R.REGRAS_VERSAO, agora + TURNO, agora]);
}

const rotas = [
    {
        // Salas esperando alguém (sem as minhas), mais novas primeiro, com o placar de quem criou.
        metodo: 'GET', caminho: '/api/tcg/salas', login: true,
        async executar(ctx) {
            const agora = ctx.agora();
            const linhas = await ctx.db.query(
                `SELECT s.codigo, s.deck, s.criado_em, s.expira_em, u.display_name,
                        (SELECT COUNT(*) FROM tcg_resultados r WHERE r.vencedor = s.criador) AS vitorias,
                        (SELECT COUNT(*) FROM tcg_resultados r WHERE r.perdedor = s.criador) AS derrotas
                   FROM tcg_salas s JOIN users u ON u.id = s.criador
                  WHERE s.partida_id IS NULL AND s.expira_em >= $1
                    AND s.criador <> $2 AND u.role <> 'banned'
                  ORDER BY s.criado_em DESC LIMIT $3`,
                [agora, ctx.usuario.id, SALAS_NA_LISTA]);
            return {
                salas: linhas.map((l) => ({
                    codigo: l.codigo, deck: l.deck, criador: l.display_name, desde: Number(l.criado_em), expira: Number(l.expira_em),
                    vitorias: Number(l.vitorias), derrotas: Number(l.derrotas),
                })),
            };
        },
    },
    {
        metodo: 'GET', caminho: '/api/tcg/placar',
        executar: (ctx) => placar(ctx),
    },
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
                    `INSERT INTO tcg_salas (codigo, criador, deck, criado_em, expira_em, visto_em) VALUES ($1, $2, $3, $4, $5, $4)
                     ON CONFLICT (codigo) DO UPDATE SET criador = EXCLUDED.criador, deck = EXCLUDED.deck,
                         criado_em = EXCLUDED.criado_em, expira_em = EXCLUDED.expira_em, partida_id = NULL,
                         visto_em = EXCLUDED.visto_em
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
            const agora = ctx.agora();
            if (!s || (Number(s.expira_em) < agora && !s.partida_id)) throw new HttpError(404, 'sala não encontrada ou expirada');
            let expira = Number(s.expira_em);
            // O dono está com a tela de espera aberta: a sala ganha mais 5 minutos.
            if (s.criador === ctx.usuario.id && !s.partida_id && expira < agora + SALA_DURA - RENOVAR_SALA) {
                expira = agora + SALA_DURA;
                await ctx.db.query('UPDATE tcg_salas SET expira_em = $2 WHERE codigo = $1 AND partida_id IS NULL', [codigo, expira]);
            }
            return {
                codigo, deck: s.deck, criador: s.display_name, minha: s.criador === ctx.usuario.id,
                expira, partida: s.partida_id || null,
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
            if (s.criador === eu) throw new HttpError(400, 'essa sala é sua: espere alguém entrar');
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
            const desde = ctx.url.searchParams.has('desde') ? Number(ctx.url.searchParams.get('desde')) : -1;
            // "Teve jogada?" rápido: lê só a versão e o prazo (sem a mesa inteira). É a chamada
            // que o navegador de quem espera faz a cada segundo.
            if (!ID.test(ctx.params[0])) throw new HttpError(404, 'partida não encontrada');
            const [l] = await ctx.db.query(
                `SELECT jogador_a, jogador_b, versao, prazo, estouros_a, estouros_b, status
                   FROM tcg_partidas WHERE id = $1`, [ctx.params[0]]);
            const eu = l ? [l.jogador_a, l.jogador_b].indexOf(ctx.usuario.id) : -1;
            if (eu < 0) throw new HttpError(404, 'partida não encontrada');
            const leve = {
                id: ctx.params[0], versao: Number(l.versao), prazo: Number(l.prazo), eu,
                estouros: [Number(l.estouros_a), Number(l.estouros_b)], status: l.status,
            };
            const relogioVenceu = leve.status === 'jogando' && ctx.agora() > leve.prazo;
            if (desde === leve.versao && !relogioVenceu) return respostaBase(ctx, leve);
            let p = await carregar(ctx, ctx.params[0]);
            p = await conferirRelogio(ctx, p);
            return resposta(ctx, p, desde);
        },
    },
    {
        // Partidas em andamento, para entrar como espectador.
        metodo: 'GET', caminho: '/api/tcg/ao-vivo', login: true,
        async executar(ctx) {
            const agora = ctx.agora();
            const linhas = await ctx.db.query(
                `SELECT p.id, p.deck_a, p.deck_b, p.criado_em, p.versao, p.estado, ua.display_name AS nome_a, ub.display_name AS nome_b
                   FROM tcg_partidas p
                   JOIN users ua ON ua.id = p.jogador_a JOIN users ub ON ub.id = p.jogador_b
                  WHERE p.status = 'jogando' AND p.regras = $1 AND p.atualizado_em > $2
                  ORDER BY p.atualizado_em DESC LIMIT $3`,
                [R.REGRAS_VERSAO, agora - AO_VIVO_FRESCA, AO_VIVO_NA_LISTA]);
            return {
                partidas: linhas.map((l) => {
                    const e = JSON.parse(l.estado);
                    return {
                        id: l.id, jogadores: [l.nome_a, l.nome_b], decks: [l.deck_a, l.deck_b], desde: Number(l.criado_em),
                        turno: e.turno, vida: [e.jogadores[0].vida, e.jogadores[1].vida],
                    };
                }),
            };
        },
    },
    {
        // Quem assiste vê a mesa como um terceiro: as duas mãos e os baralhos só como quantidade.
        metodo: 'GET', caminho: /^\/api\/tcg\/assistir\/([^/]{1,64})$/, login: true,
        async executar(ctx) {
            const desde = ctx.url.searchParams.has('desde') ? Number(ctx.url.searchParams.get('desde')) : -1;
            const l = await lerAoVivo(ctx, ctx.params[0]);
            if (Number(l.regras) !== R.REGRAS_VERSAO && l.status === 'jogando') throw new HttpError(409, 'o jogo foi atualizado; recarregue', { recarregar: true });
            const base = {
                id: l.id, versao: Number(l.versao), prazo: Number(l.prazo), agora: ctx.agora(), eu: -1,
                estouros: [Number(l.estouros_a), Number(l.estouros_b)], status: l.status, regras: R.REGRAS_VERSAO,
            };
            if (desde === base.versao) return base;
            let eventos = [];
            if (Number.isInteger(desde) && desde >= 0 && desde < base.versao) {
                const linhas = await ctx.db.query('SELECT eventos FROM tcg_jogadas WHERE partida_id = $1 AND n > $2 ORDER BY n', [l.id, desde]);
                eventos = linhas.flatMap((x) => R.eventosPara(JSON.parse(x.eventos), -1));
            }
            return { ...base, decks: [l.deck_a, l.deck_b], visao: R.visaoDe(JSON.parse(l.estado), -1), eventos };
        },
    },
    {
        metodo: 'GET', caminho: /^\/api\/tcg\/partidas\/([^/]{1,64})\/comentarios$/, login: true,
        async executar(ctx) {
            const l = await lerAoVivo(ctx, ctx.params[0]);
            if (l.status !== 'jogando') return { ativa: false, comentarios: [] };
            const desde = Number.parseInt(ctx.url.searchParams.get('desde'), 10) || 0;
            const linhas = await ctx.db.query(
                'SELECT n, user_id, nome, lado, texto, criado_em FROM tcg_comentarios WHERE partida_id = $1 AND n > $2 ORDER BY n LIMIT 100',
                [l.id, desde]);
            return {
                ativa: true,
                comentarios: linhas.map((c) => ({
                    n: Number(c.n), nome: c.nome, lado: c.lado === null ? null : Number(c.lado), texto: c.texto,
                    em: Number(c.criado_em), meu: c.user_id === ctx.usuario.id,
                })),
            };
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/tcg\/partidas\/([^/]{1,64})\/comentarios$/, login: true,
        async executar(ctx) {
            const l = await lerAoVivo(ctx, ctx.params[0]);
            if (l.status !== 'jogando') throw new HttpError(409, 'a partida terminou: os comentários se foram');
            const texto = limparComentario((await ctx.corpo()).texto);
            if (!texto) throw new HttpError(400, 'escreva alguma coisa');
            const agora = ctx.agora();
            const [{ n, ultimo }] = await ctx.db.query(
                `SELECT COUNT(*) AS n, MAX(CASE WHEN user_id = $2 THEN criado_em END) AS ultimo FROM tcg_comentarios WHERE partida_id = $1`,
                [l.id, ctx.usuario.id]);
            if (Number(n) >= COMENTARIOS_POR_PARTIDA) throw new HttpError(429, 'os comentários dessa partida lotaram');
            if (ultimo !== null && agora - Number(ultimo) < COMENTARIO_INTERVALO) throw new HttpError(429, 'devagar: um comentário a cada 2 segundos');
            const lado = [l.jogador_a, l.jogador_b].indexOf(ctx.usuario.id);
            const nome = String(ctx.usuario.display_name || 'Leitor').trim().split(/\s+/)[0].slice(0, 20);
            const [c] = await ctx.db.query(
                `INSERT INTO tcg_comentarios (partida_id, user_id, nome, lado, texto, criado_em) VALUES ($1, $2, $3, $4, $5, $6) RETURNING n`,
                [l.id, ctx.usuario.id, nome, lado < 0 ? null : lado, texto, agora]);
            return { n: Number(c.n) };
        },
    },
    {
        // Prêmio da partida contra o NPC: { resultado: 'vitoria' | 'derrota' | 'empate' }.
        metodo: 'POST', caminho: '/api/tcg/npc', login: true,
        async executar(ctx) {
            const { resultado } = await ctx.corpo();
            if (!['vitoria', 'derrota', 'empate'].includes(resultado)) throw new HttpError(400, 'resultado deve ser vitoria, derrota ou empate');
            const agora = ctx.agora();
            const [{ n, ultima }] = await ctx.db.query(
                `SELECT COUNT(*) AS n, MAX(created_at) AS ultima FROM extrato
                  WHERE user_id = $1 AND motivo = 'batalha-npc' AND created_at > $2`, [ctx.usuario.id, agora - DIA]);
            if (Number(n) >= NPC_PREMIADAS_POR_DIA) return { creditos: 0, motivo: 'limite' };
            if (ultima !== null && agora - Number(ultima) < NPC_INTERVALO) return { creditos: 0, motivo: 'rapido' };
            const c = Baralho.CREDITOS_BATALHA.npc;
            const valor = resultado === 'vitoria' ? c.vitoria : c.derrota;
            const { creditarConta } = require('./baralho.js');
            await creditarConta(ctx, ctx.usuario.id, valor, 'batalha-npc', `npc:${crypto.randomUUID()}`);
            return { creditos: valor };
        },
    },
    {
        // Revanche: como está o pedido (meu, do outro) e, quando os dois querem, a partida nova.
        metodo: 'GET', caminho: /^\/api\/tcg\/partidas\/([^/]{1,64})\/revanche$/, login: true,
        async executar(ctx) {
            const { l, eu } = await lerParaRevanche(ctx, ctx.params[0]);
            return situacaoRevanche(ctx, l, eu);
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/tcg\/partidas\/([^/]{1,64})\/revanche$/, login: true,
        async executar(ctx) {
            const id = ctx.params[0];
            let { l, eu } = await lerParaRevanche(ctx, id);
            if (l.status !== 'fim' || l.motivo === 'atualizacao' || Number(l.regras) !== R.REGRAS_VERSAO) {
                throw new HttpError(409, 'essa partida não aceita revanche');
            }
            if (!l.revanche_id) {
                if (ctx.agora() > Number(l.atualizado_em) + REVANCHE_DURA) throw new HttpError(409, 'o tempo da revanche acabou');
                await ctx.db.query(`UPDATE tcg_partidas SET ${eu === 0 ? 'revanche_a' : 'revanche_b'} = TRUE WHERE id = $1`, [id]);
                [l] = await ctx.db.query('SELECT * FROM tcg_partidas WHERE id = $1', [id]);
                if (l.revanche_a && l.revanche_b) await criarRevanche(ctx, l);
                [l] = await ctx.db.query('SELECT * FROM tcg_partidas WHERE id = $1', [id]);
            }
            return situacaoRevanche(ctx, l, eu);
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
            return resposta(ctx, p, desde, r.eventos);
        },
    },
];

module.exports = { rotas, classificacao, quemDeve, jogadaAutomatica, TURNO, ESTOUROS_PARA_PERDER, PARTIDAS_POR_DIA, PARTIDAS_POR_JOGADOR, SALA_DURA, REVANCHE_DURA, NPC_PREMIADAS_POR_DIA, NPC_INTERVALO, recompensaOnline, COMENTARIO_MAX, COMENTARIO_INTERVALO };
