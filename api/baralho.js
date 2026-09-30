// ============================================================================
// Baralho Enzo: carteira (créditos e pó de estrela), pacotes e coleção.
// Cartas, preços e chances vêm de js/baralho-dados.js; o sorteio é SÓ aqui.
//
//   GET  /api/baralho                      carteira, pacotes fechados, coleção
//                                          (no 1º acesso: carteira + pacotes de boas-vindas)
//   POST /api/baralho/entrada              boas-vindas, presentes únicos e pacote do dia
//   POST /api/baralho/visitante            (sem login) abre as boas-vindas; devolve { codigo, abertos }
//   POST /api/baralho/visitante/resgatar   { codigo }  cartas do visitante vão para a conta
//   POST /api/baralho/comprar              { tipo, moeda: 'creditos'|'po', quantidade? }
//   POST /api/baralho/abrir                { pacotes: [ids] }  (até MAX_POR_VEZ)
//   POST /api/baralho/po                   { cartas: { cardId: quantas } } ou { todas: true }
//   POST /api/admin/users/:id/baralho      { creditos?, po?, pacote?, quantidade? }  (admin)
// Créditos entram por creditarPartida(), chamada no submit de api/games.js.
//
// Sem transações (o driver HTTP do Neon roda um comando por vez): cada
// operação com saldo é UM comando SQL (CTE) com a condição no próprio UPDATE,
// então dois cliques ao mesmo tempo nunca gastam em dobro nem abrem 2×.
// ============================================================================
const crypto = require('node:crypto');
const { HttpError } = require('./http.js');
const admin = require('./admin.js');
const Baralho = require('../js/baralho-dados.js');

const ID = /^[0-9a-z-]{1,64}$/i;

/** Sorteador padrão: inteiro em [0, max). Os testes trocam por um previsível. */
const aleatorioSeguro = (max) => crypto.randomInt(max);

/** Sorteia uma raridade pelas chances (%). `minimo` = nível mais baixo aceito (garantia). */
function sortearRaridade(chances, aleatorio, minimo = 0) {
    const opcoes = Baralho.RARIDADES.filter((r, i) => i >= minimo && (chances[r.id] || 0) > 0);
    if (!opcoes.length) return Baralho.RARIDADES[minimo].id;
    const total = opcoes.reduce((soma, r) => soma + chances[r.id], 0);
    let x = aleatorio(total);
    for (const r of opcoes) {
        x -= chances[r.id];
        if (x < 0) return r.id;
    }
    return opcoes[opcoes.length - 1].id;
}

/** Sorteia uma carta da raridade pelo `peso`; raridade vazia desce para a de baixo. */
function sortearCarta(raridadeId, aleatorio) {
    for (let i = Baralho.nivel(raridadeId); i >= 0; i--) {
        const lista = Baralho.cartasDaRaridade(Baralho.RARIDADES[i].id).filter((c) => !c.chanceFixa);
        if (!lista.length) continue;
        const total = lista.reduce((soma, c) => soma + c.peso, 0);
        let x = aleatorio(total);
        for (const c of lista) {
            x -= c.peso;
            if (x < 0) return c;
        }
        return lista[lista.length - 1];
    }
    throw new Error('baralho sem cartas');
}

/** Cartas com chance própria (% por carta, em qualquer pacote), fora do sorteio por raridade. */
const FIXAS = Baralho.CARTAS.filter((c) => c.chanceFixa > 0);
const ESCALA_FIXA = 100000;

/** Antes de cada carta: sai uma das FIXAS? (sorteio alto, então o aleatório "sempre 0" dos testes nunca cai nela) */
function sortearFixa(aleatorio) {
    for (const c of FIXAS) {
        if (aleatorio(ESCALA_FIXA) >= ESCALA_FIXA - Math.round(c.chanceFixa * ESCALA_FIXA / 100)) return c;
    }
    return null;
}

/**
 * Ids das cartas de um pacote. Garantia: se nenhuma carta chegou à raridade
 * mínima, a última é sorteada de novo só entre as raridades aceitas.
 */
function sortearPacote(tipo, aleatorio = aleatorioSeguro) {
    const p = Baralho.pacote(tipo);
    if (!p) throw new Error(`pacote desconhecido: ${tipo}`);
    const raridades = Array.from({ length: p.cartas }, () => sortearRaridade(p.chances, aleatorio));
    if (p.garantia) {
        const minimo = Baralho.nivel(p.garantia);
        if (!raridades.some((r) => Baralho.nivel(r) >= minimo)) {
            raridades[raridades.length - 1] = sortearRaridade(p.chances, aleatorio, minimo);
        }
    }
    return raridades.map((r) => (sortearFixa(aleatorio) || sortearCarta(r, aleatorio)).id);
}

const garantirCarteira = (ctx, usuarioId = ctx.usuario.id) => ctx.db.query(
    'INSERT INTO carteira (user_id, created_at) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
    [usuarioId, ctx.agora()]);

/** Tudo o que a aba Baralho mostra. */
async function estado(db, usuarioId) {
    const [[carteira], pacotes, colecao] = await Promise.all([
        db.query('SELECT creditos, po, diario_dia, diario_seq FROM carteira WHERE user_id = $1', [usuarioId]),
        db.query(
            `SELECT id, tipo, origem, created_at FROM pacotes
              WHERE user_id = $1 AND aberto_em IS NULL ORDER BY created_at, id`, [usuarioId]),
        db.query('SELECT card_id, qtd FROM colecao WHERE user_id = $1', [usuarioId]),
    ]);
    const cartas = Object.fromEntries(colecao
        .filter((l) => Baralho.carta(l.card_id))
        .map((l) => [l.card_id, Number(l.qtd)]));
    return {
        carteira: { creditos: Number(carteira?.creditos ?? 0), po: Number(carteira?.po ?? 0) },
        pacotes: pacotes.map((l) => ({ id: l.id, tipo: l.tipo, origem: l.origem, criadoEm: Number(l.created_at) })),
        colecao: cartas,
        diferentes: Object.keys(cartas).length,
        diario: { dia: carteira?.diario_dia ?? null, sequencia: Number(carteira?.diario_seq ?? 0) },
        total: Baralho.CARTAS.length,
    };
}

/** Créditos de uma partida verificada. Devolve quantos entraram (0 = jogo sem créditos). */
async function creditarPartida(ctx, gameId, score, ref) {
    const valor = Math.floor(Number(score) * (Baralho.CREDITOS_POR_PONTO[gameId] || 0));
    if (!(valor > 0)) return 0;
    await ctx.db.query(
        `WITH somou AS (
             INSERT INTO carteira (user_id, creditos, created_at) VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET creditos = carteira.creditos + EXCLUDED.creditos
             RETURNING user_id)
         INSERT INTO extrato (id, user_id, moeda, delta, motivo, ref, created_at)
         SELECT gen_random_uuid()::text, user_id, 'creditos', $2, 'partida', $4, $3 FROM somou`,
        [ctx.usuario.id, valor, ctx.agora(), `${gameId}:${ref}`]);
    return valor;
}

/** Dá `quantidade` pacotes do tipo (boas-vindas, admin). */
const darPacotes = (ctx, usuarioId, tipo, quantidade, origem) => ctx.db.query(
    `INSERT INTO pacotes (id, user_id, tipo, origem, created_at)
     SELECT gen_random_uuid()::text, $1, $2, $3, $4 FROM generate_series(1, $5::int)`,
    [usuarioId, tipo, origem, ctx.agora(), quantidade]);

/** Dia de Brasília (UTC−3, sem horário de verão) no formato AAAA-MM-DD. */
const DIA_MS = 24 * 60 * 60 * 1000;
const diaBrasilia = (ms) => new Date(ms - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Pacote de visitante não resgatado some depois de 7 dias. */
const VISITANTE_VALIDADE = 7 * DIA_MS;

/** Boas-vindas uma vez só (1 de cada pacote): marcar e dar os pacotes no mesmo comando. */
async function darBoasVindas(ctx, eu) {
    const dados = await ctx.db.query(
        `WITH marcou AS (
             UPDATE carteira SET boas_vindas = TRUE WHERE user_id = $1 AND NOT boas_vindas RETURNING user_id)
         INSERT INTO pacotes (id, user_id, tipo, origem, created_at)
         SELECT gen_random_uuid()::text, marcou.user_id, t.tipo, 'boas-vindas', $3
           FROM marcou, jsonb_array_elements_text($2::jsonb) AS t(tipo) RETURNING tipo`,
        [eu, JSON.stringify(Baralho.BOAS_VINDAS), ctx.agora()]);
    return dados.map((l) => l.tipo);
}

/**
 * Presentes da entrada no site: boas-vindas, presentes únicos e o pacote do dia.
 * Cada um é um comando só com a condição dentro, então duas abas ao mesmo tempo
 * não ganham em dobro. Devolve a lista do que entrou agora e a sequência.
 */
async function darPresentes(ctx, eu) {
    const agora = ctx.agora();
    const hoje = diaBrasilia(agora);
    const ontem = diaBrasilia(agora - DIA_MS);
    const ganhos = (await darBoasVindas(ctx, eu)).map((tipo) => ({ motivo: 'boas-vindas', tipo }));

    const unicos = await ctx.db.query(
        `WITH lista AS (
             SELECT g->>'id' AS id, g->>'tipo' AS tipo FROM jsonb_array_elements($2::jsonb) g),
         marcou AS (
             INSERT INTO presentes (user_id, presente_id, created_at)
             SELECT $1, id, $3 FROM lista ON CONFLICT DO NOTHING RETURNING presente_id)
         INSERT INTO pacotes (id, user_id, tipo, origem, created_at)
         SELECT gen_random_uuid()::text, $1, lista.tipo, 'presente:' || lista.id, $3
           FROM marcou JOIN lista ON lista.id = marcou.presente_id RETURNING tipo, origem`,
        [eu, JSON.stringify(Baralho.PRESENTES_UNICOS), agora]);
    for (const l of unicos) {
        const p = Baralho.PRESENTES_UNICOS.find((g) => `presente:${g.id}` === l.origem);
        ganhos.push({ motivo: 'presente', tipo: l.tipo, nome: p?.nome ?? null });
    }

    // Pacote do dia: ontem → sequência + 1; outro dia → volta a 1. No SET, diario_dia
    // ainda é o valor antigo.
    const { tipo, especial, especialACada } = Baralho.DIARIO;
    const diario = await ctx.db.query(
        `WITH marcou AS (
             UPDATE carteira
                SET diario_seq = CASE WHEN diario_dia = $3 THEN diario_seq + 1 ELSE 1 END, diario_dia = $2
              WHERE user_id = $1 AND diario_dia IS DISTINCT FROM $2 RETURNING diario_seq)
         INSERT INTO pacotes (id, user_id, tipo, origem, created_at)
         SELECT gen_random_uuid()::text, $1,
                CASE WHEN diario_seq % $4 = 0 THEN $5 ELSE $6 END, 'diario', $7
           FROM marcou RETURNING tipo`,
        [eu, hoje, ontem, especialACada, especial, tipo, agora]);
    const [carteira] = await ctx.db.query(
        'SELECT diario_seq, diario_dia FROM carteira WHERE user_id = $1', [eu]);
    // Sequência que vale hoje (quem não entrou ontem nem hoje está em 0).
    const seq = carteira && (carteira.diario_dia === hoje || carteira.diario_dia === ontem)
        ? Number(carteira.diario_seq) : 0;
    if (diario.length) ganhos.push({ motivo: 'diario', tipo: diario[0].tipo, sequencia: seq });
    return { ganhos, sequencia: seq, especialACada };
}

function lerQuantidade(valor, padrao = 1) {
    if (valor === undefined || valor === null) return padrao;
    if (!Number.isInteger(valor) || valor < 1 || valor > Baralho.MAX_POR_VEZ) {
        throw new HttpError(400, `quantidade: de 1 a ${Baralho.MAX_POR_VEZ}`);
    }
    return valor;
}

const rotas = [
    {
        metodo: 'GET', caminho: '/api/baralho', login: true,
        async executar(ctx) {
            const eu = ctx.usuario.id;
            await garantirCarteira(ctx);
            const presente = await darBoasVindas(ctx, eu);
            return { ...(await estado(ctx.db, eu)), boasVindas: presente.length > 0 };
        },
    },
    {
        // Chamada pela página ao entrar no site com login: boas-vindas, presentes
        // únicos e o pacote do dia. { ganhos: [{ motivo, tipo, nome?, sequencia? }], sequencia }
        metodo: 'POST', caminho: '/api/baralho/entrada', login: true,
        async executar(ctx) {
            await garantirCarteira(ctx);
            return darPresentes(ctx, ctx.usuario.id);
        },
    },
    {
        // Visitante sem login abre os pacotes de boas-vindas. O resultado fica guardado
        // no servidor; o navegador guarda só o código para resgatar depois do login.
        metodo: 'POST', caminho: '/api/baralho/visitante',
        async executar(ctx) {
            const agora = ctx.agora();
            const sorteio = Baralho.BOAS_VINDAS.map((tipo) => ({ tipo, cartas: sortearPacote(tipo, ctx.aleatorio) }));
            const [linha] = await ctx.db.query(
                `WITH limpou AS (
                     DELETE FROM pacotes_visitante WHERE resgatado_em IS NULL AND created_at < $3)
                 INSERT INTO pacotes_visitante (id, resultado, created_at)
                 VALUES (gen_random_uuid()::text, $1, $2) RETURNING id`,
                [JSON.stringify(sorteio), agora, agora - VISITANTE_VALIDADE]);
            const vistas = new Set();
            return {
                codigo: linha.id,
                abertos: sorteio.map((p, i) => ({
                    pacote: `visitante-${i}`,
                    tipo: p.tipo,
                    cartas: p.cartas.map((cardId) => {
                        const nova = !vistas.has(cardId);
                        vistas.add(cardId);
                        return { id: cardId, raridade: Baralho.carta(cardId)?.raridade ?? null, nova };
                    }),
                })),
            };
        },
    },
    {
        // Depois do login: as cartas abertas como visitante entram na conta, no lugar
        // das boas-vindas. Só para conta que ainda não abriu nenhum pacote e nunca
        // resgatou; os pacotes de boas-vindas ainda fechados são trocados pelos abertos.
        metodo: 'POST', caminho: '/api/baralho/visitante/resgatar', login: true,
        async executar(ctx) {
            const { codigo } = await ctx.corpo();
            if (typeof codigo !== 'string' || !ID.test(codigo)) throw new HttpError(400, 'código inválido');
            const eu = ctx.usuario.id;
            const agora = ctx.agora();
            await garantirCarteira(ctx);
            const resgate = await ctx.db.query(
                `WITH pode AS (
                     SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM pacotes WHERE user_id = $1 AND aberto_em IS NOT NULL)
                                AND NOT EXISTS (SELECT 1 FROM presentes WHERE user_id = $1 AND presente_id = 'visitante')),
                 resgatou AS (
                     UPDATE pacotes_visitante SET resgatado_por = $1, resgatado_em = $2
                      WHERE id = $3 AND resgatado_em IS NULL AND created_at >= $4 AND EXISTS (SELECT 1 FROM pode)
                     RETURNING resultado),
                 marcou AS (
                     INSERT INTO presentes (user_id, presente_id, created_at)
                     SELECT $1, 'visitante', $2 FROM resgatou ON CONFLICT DO NOTHING RETURNING user_id),
                 lista AS (
                     SELECT p->>'tipo' AS tipo, p->'cartas' AS cartas
                       FROM resgatou, marcou, jsonb_array_elements(resgatou.resultado::jsonb) p),
                 boas AS (
                     UPDATE carteira SET boas_vindas = TRUE WHERE user_id = $1 AND EXISTS (SELECT 1 FROM marcou)),
                 trocou AS (
                     DELETE FROM pacotes WHERE user_id = $1 AND origem = 'boas-vindas' AND aberto_em IS NULL
                        AND EXISTS (SELECT 1 FROM marcou)),
                 guardou AS (
                     INSERT INTO pacotes (id, user_id, tipo, origem, created_at, aberto_em, resultado)
                     SELECT gen_random_uuid()::text, $1, tipo, 'boas-vindas', $2, $2, cartas::text FROM lista),
                 contagem AS (
                     SELECT c.card_id, COUNT(*)::int AS n
                       FROM lista CROSS JOIN LATERAL jsonb_array_elements_text(lista.cartas) AS c(card_id)
                      GROUP BY c.card_id)
                 INSERT INTO colecao (user_id, card_id, qtd, primeira_em)
                 SELECT $1, card_id, n, $2 FROM contagem
                 ON CONFLICT (user_id, card_id) DO UPDATE SET qtd = colecao.qtd + EXCLUDED.qtd
                 RETURNING card_id`,
                [eu, agora, codigo, agora - VISITANTE_VALIDADE]);
            if (!resgate.length) throw new HttpError(409, 'esses pacotes não podem ser resgatados nesta conta');
            return { resgatadas: resgate.length, ...(await estado(ctx.db, eu)) };
        },
    },
    {
        metodo: 'POST', caminho: '/api/baralho/comprar', login: true,
        async executar(ctx) {
            const { tipo, moeda = 'creditos', quantidade } = await ctx.corpo();
            const p = Baralho.pacote(tipo);
            if (!p) throw new HttpError(400, 'pacote desconhecido');
            const coluna = moeda === 'creditos' || moeda === 'po' ? moeda : null;
            if (!coluna) throw new HttpError(400, 'moeda: creditos ou po');
            if (!(p.preco[moeda] > 0)) throw new HttpError(400, `${p.nome} não se compra com ${moeda === 'po' ? 'pó' : 'créditos'}`);
            const n = lerQuantidade(quantidade);
            const custo = p.preco[moeda] * n;
            const eu = ctx.usuario.id;
            await garantirCarteira(ctx);
            // Cobrar, criar os pacotes e anotar no extrato num comando só.
            const novos = await ctx.db.query(
                `WITH pago AS (
                     UPDATE carteira SET ${coluna} = ${coluna} - $2 WHERE user_id = $1 AND ${coluna} >= $2 RETURNING user_id),
                 novos AS (
                     INSERT INTO pacotes (id, user_id, tipo, origem, created_at)
                     SELECT gen_random_uuid()::text, pago.user_id, $3, 'compra', $4 FROM pago, generate_series(1, $5::int)
                     RETURNING id),
                 anotou AS (
                     INSERT INTO extrato (id, user_id, moeda, delta, motivo, ref, created_at)
                     SELECT gen_random_uuid()::text, user_id, $6, -($2::bigint), 'compra', $7, $4 FROM pago)
                 SELECT id FROM novos`,
                [eu, custo, p.id, ctx.agora(), n, moeda, `${n}x ${p.id}`]);
            if (!novos.length) {
                throw new HttpError(402, moeda === 'po' ? 'pó de estrela insuficiente' : 'créditos insuficientes', { preco: custo });
            }
            return { comprados: novos.map((l) => l.id), ...(await estado(ctx.db, eu)) };
        },
    },
    {
        metodo: 'POST', caminho: '/api/baralho/abrir', login: true,
        async executar(ctx) {
            const { pacotes } = await ctx.corpo();
            if (!Array.isArray(pacotes) || !pacotes.length || pacotes.length > Baralho.MAX_POR_VEZ
                || !pacotes.every((id) => typeof id === 'string' && ID.test(id))) {
                throw new HttpError(400, `pacotes: lista de 1 a ${Baralho.MAX_POR_VEZ} ids`);
            }
            const eu = ctx.usuario.id;
            const pedidos = [...new Set(pacotes)];
            const fechados = await ctx.db.query(
                `SELECT id, tipo FROM pacotes
                  WHERE user_id = $1 AND aberto_em IS NULL AND id IN (SELECT jsonb_array_elements_text($2::jsonb))`,
                [eu, JSON.stringify(pedidos)]);
            const sorteio = fechados
                .filter((l) => Baralho.pacote(l.tipo))
                .map((l) => ({ id: l.id, cartas: sortearPacote(l.tipo, ctx.aleatorio) }));
            if (!sorteio.length) throw new HttpError(404, 'pacote não encontrado ou já aberto');

            const antes = new Set((await ctx.db.query(
                'SELECT card_id FROM colecao WHERE user_id = $1', [eu])).map((l) => l.card_id));
            // Marca como aberto (só se ainda estava fechado) e soma as cartas, num comando só:
            // um segundo clique não encontra mais nada para abrir.
            const abertos = await ctx.db.query(
                `WITH sorteio AS (
                     SELECT s->>'id' AS id, s->'cartas' AS cartas FROM jsonb_array_elements($3::jsonb) s),
                 aberto AS (
                     UPDATE pacotes k SET aberto_em = $2, resultado = s.cartas::text
                       FROM sorteio s
                      WHERE k.id = s.id AND k.user_id = $1 AND k.aberto_em IS NULL
                     RETURNING k.id, k.tipo, k.resultado),
                 contagem AS (
                     SELECT c.card_id, COUNT(*)::int AS n
                       FROM aberto a CROSS JOIN LATERAL jsonb_array_elements_text(a.resultado::jsonb) AS c(card_id)
                      GROUP BY c.card_id),
                 somou AS (
                     INSERT INTO colecao (user_id, card_id, qtd, primeira_em)
                     SELECT $1, card_id, n, $2 FROM contagem
                     ON CONFLICT (user_id, card_id) DO UPDATE SET qtd = colecao.qtd + EXCLUDED.qtd
                     RETURNING card_id)
                 SELECT id, tipo, resultado FROM aberto`,
                [eu, ctx.agora(), JSON.stringify(sorteio)]);
            if (!abertos.length) throw new HttpError(404, 'pacote não encontrado ou já aberto');

            // Na ordem pedida; "nova" = primeira cópia na coleção.
            const porId = new Map(abertos.map((l) => [l.id, l]));
            const vistas = new Set(antes);
            const resultado = pedidos.filter((id) => porId.has(id)).map((id) => {
                const l = porId.get(id);
                return {
                    pacote: id,
                    tipo: l.tipo,
                    cartas: JSON.parse(l.resultado).map((cardId) => {
                        const nova = !vistas.has(cardId);
                        vistas.add(cardId);
                        return { id: cardId, raridade: Baralho.carta(cardId)?.raridade ?? null, nova };
                    }),
                };
            });
            return { abertos: resultado, ...(await estado(ctx.db, eu)) };
        },
    },
    {
        metodo: 'POST', caminho: '/api/baralho/po', login: true,
        async executar(ctx) {
            const corpo = await ctx.corpo();
            const eu = ctx.usuario.id;
            const tenho = new Map((await ctx.db.query(
                'SELECT card_id, qtd FROM colecao WHERE user_id = $1', [eu])).map((l) => [l.card_id, Number(l.qtd)]));

            const pedido = {};
            if (corpo.todas === true) {
                for (const [cardId, qtd] of tenho) {
                    if (qtd > 1 && Baralho.carta(cardId)) pedido[cardId] = qtd - 1;
                }
            } else {
                const cartas = corpo.cartas;
                if (!cartas || typeof cartas !== 'object' || Array.isArray(cartas)) {
                    throw new HttpError(400, 'cartas: { cardId: quantas } ou todas: true');
                }
                for (const [cardId, n] of Object.entries(cartas)) {
                    if (!Baralho.carta(cardId)) throw new HttpError(400, `carta desconhecida: ${cardId}`);
                    if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'quantas: número inteiro a partir de 1');
                    if (n > (tenho.get(cardId) ?? 0) - 1) throw new HttpError(409, 'fique com pelo menos 1 de cada carta');
                    pedido[cardId] = n;
                }
            }
            const itens = Object.entries(pedido);
            if (!itens.length) throw new HttpError(400, 'nenhuma carta repetida para transformar');

            await garantirCarteira(ctx);
            // Tira as cópias (nunca abaixo de 1) e soma o pó do que saiu de fato, num comando só.
            const dados = Object.fromEntries(itens.map(([cardId, n]) => [cardId, { n, valor: Baralho.valorPo(cardId) }]));
            const [ganho] = await ctx.db.query(
                `WITH pedido AS (
                     SELECT key AS card_id, (value->>'n')::int AS n, (value->>'valor')::int AS valor
                       FROM jsonb_each($2::jsonb)),
                 tirou AS (
                     UPDATE colecao c SET qtd = c.qtd - p.n FROM pedido p
                      WHERE c.user_id = $1 AND c.card_id = p.card_id AND c.qtd - p.n >= 1
                     RETURNING p.n, p.valor),
                 ganho AS (
                     SELECT COALESCE(SUM(n * valor), 0)::bigint AS po, COALESCE(SUM(n), 0)::int AS cartas FROM tirou),
                 somou AS (
                     UPDATE carteira SET po = carteira.po + ganho.po FROM ganho
                      WHERE carteira.user_id = $1 AND ganho.po > 0 RETURNING carteira.user_id),
                 anotou AS (
                     INSERT INTO extrato (id, user_id, moeda, delta, motivo, ref, created_at)
                     SELECT gen_random_uuid()::text, $1, 'po', ganho.po, 'po', $3, $4 FROM ganho WHERE ganho.po > 0)
                 SELECT po, cartas FROM ganho`,
                [eu, JSON.stringify(dados), itens.map(([id, n]) => `${n}x ${id}`).join(', ').slice(0, 500), ctx.agora()]);
            const po = Number(ganho.po);
            if (!po) throw new HttpError(409, 'as repetidas já tinham sido transformadas');
            return { ganhou: po, cartas: Number(ganho.cartas), ...(await estado(ctx.db, eu)) };
        },
    },
    {
        metodo: 'POST', caminho: /^\/api\/admin\/users\/([^/]{1,64})\/baralho$/, admin: true,
        async executar(ctx) {
            const alvo = await admin.exigirUsuario(ctx, ctx.params[0]);
            const { creditos = 0, po = 0, pacote = null, quantidade } = await ctx.corpo();
            for (const [nome, v] of [['creditos', creditos], ['po', po]]) {
                if (!Number.isSafeInteger(v) || Math.abs(v) > 1e9) throw new HttpError(400, `${nome}: número inteiro`);
            }
            if (pacote !== null && !Baralho.pacote(pacote)) throw new HttpError(400, 'pacote desconhecido');
            const n = lerQuantidade(quantidade);
            if (!creditos && !po && !pacote) throw new HttpError(400, 'nada para mudar');

            await garantirCarteira(ctx, alvo.id);
            if (creditos || po) {
                // Tirar mais do que a pessoa tem zera (o saldo nunca fica negativo).
                await ctx.db.query(
                    `WITH antes AS (SELECT creditos, po FROM carteira WHERE user_id = $1),
                     mudou AS (
                         UPDATE carteira SET creditos = GREATEST(0, carteira.creditos + $2), po = GREATEST(0, carteira.po + $3)
                          WHERE user_id = $1 RETURNING creditos, po)
                     INSERT INTO extrato (id, user_id, moeda, delta, motivo, ref, created_at)
                     SELECT gen_random_uuid()::text, $1, m.moeda, m.delta, 'admin', $4, $5
                       FROM antes, mudou, LATERAL (VALUES ('creditos', mudou.creditos - antes.creditos),
                                                          ('po', mudou.po - antes.po)) AS m(moeda, delta)
                      WHERE m.delta <> 0`,
                    [alvo.id, creditos, po, ctx.usuario.id, ctx.agora()]);
            }
            if (pacote) await darPacotes(ctx, alvo.id, pacote, n, 'admin');
            const partes = [creditos && `créditos ${creditos > 0 ? '+' : ''}${creditos}`, po && `pó ${po > 0 ? '+' : ''}${po}`, pacote && `${n}x ${pacote}`];
            await admin.registrar(ctx, 'baralho', alvo.id, partes.filter(Boolean).join(', '));
            return estado(ctx.db, alvo.id);
        },
    },
];

module.exports = {
    rotas, estado, creditarPartida, sortearPacote, sortearRaridade, sortearCarta, sortearFixa, aleatorioSeguro };
