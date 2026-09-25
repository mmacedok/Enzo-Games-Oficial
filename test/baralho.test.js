// ============================================================================
// Testes do Baralho Enzo (api/baralho.js): carteira, compras, abertura de pacotes,
// conversão em pó, garantias de raridade e comandos de admin.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const Baralho = require('../js/baralho-dados.js');
const { sortearRaridade, sortearCarta, sortearFixa, aleatorioSeguro } = require('../api/baralho.js');

const ENV = {
    GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com',
    SESSION_SECRET: 'x'.repeat(40),
    ADMIN_EMAILS: 'chefe@exemplo.com',
};

function montar({ aleatorio } = {}) {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    const verificarGoogle = async (credencial) => {
        const [prefixo, sub, nome] = credencial.split(':');
        if (prefixo !== 'google') throw new Error('assinatura inválida');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({
        db, env: ENV, verificarGoogle,
        agora: () => relogio.agora,
        aleatorio: aleatorio || undefined,
    });
    function navegador() {
        let cookie = '';
        return async function chamar(metodo, caminho, corpo) {
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const resposta = await api(new Request(`http://localhost${caminho}`, {
                method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo),
            }));
            const setCookie = resposta.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            const texto = await resposta.text();
            let dados = null;
            try { dados = JSON.parse(texto); } catch {}
            return { status: resposta.status, dados, texto };
        };
    }
    return { db, relogio, navegador };
}

const entrar = async (chamar, sub, nome) =>
    (await chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}-${'x'.repeat(20)}` })).dados.user;

test('B1. Sem login: GET /api/baralho, POST comprar, abrir e po dão 401', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const visitante = navegador();

    assert.equal((await visitante('GET', '/api/baralho')).status, 401);
    assert.equal((await visitante('POST', '/api/baralho/comprar', { tipo: 'estacionamento' })).status, 401);
    assert.equal((await visitante('POST', '/api/baralho/abrir', { pacotes: ['abc'] })).status, 401);
    assert.equal((await visitante('POST', '/api/baralho/po', { todas: true })).status, 401);
});

test('B2. 1º GET /api/baralho: boasVindas true, 1 pacote estacionamento, carteira zero, colecao vazia, total 24', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor1', 'Leitor Um');

    const res = await leitor('GET', '/api/baralho');
    assert.equal(res.status, 200);
    assert.equal(res.dados.boasVindas, true);
    assert.equal(res.dados.pacotes.length, 1);
    assert.equal(res.dados.pacotes[0].tipo, 'estacionamento');
    assert.equal(res.dados.pacotes[0].origem, 'boas-vindas');
    assert.deepEqual(res.dados.carteira, { creditos: 0, po: 0 });
    assert.deepEqual(res.dados.colecao, {});
    assert.equal(res.dados.diferentes, 0);
    assert.equal(res.dados.total, 24);
});

test('B3. 2º e 3º GET: boasVindas false e continua 1 pacote só', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor2', 'Leitor Dois');

    const res1 = await leitor('GET', '/api/baralho');
    assert.equal(res1.dados.boasVindas, true);

    const res2 = await leitor('GET', '/api/baralho');
    assert.equal(res2.status, 200);
    assert.equal(res2.dados.boasVindas, false);
    assert.equal(res2.dados.pacotes.length, 1);

    const res3 = await leitor('GET', '/api/baralho');
    assert.equal(res3.status, 200);
    assert.equal(res3.dados.boasVindas, false);
    assert.equal(res3.dados.pacotes.length, 1);
});

test('B4. Comprar sem saldo {tipo: "estacionamento"}: 402, erro contém "insuficientes", preco 100', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor3', 'Leitor Tres');

    const res = await leitor('POST', '/api/baralho/comprar', { tipo: 'estacionamento' });
    assert.equal(res.status, 402);
    assert.match(res.dados.error, /insuficientes/i);
    assert.equal(res.dados.preco, 100);
});

test('B5. Partida verificada flappy score 30: submit dá credits 300, GET /api/baralho mostra creditos 300', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor4', 'Leitor Quatro');

    const start = await leitor('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    assert.equal(start.status, 200);
    relogio.agora += 120_000;

    const sub = await leitor('POST', '/api/games/session/submit', { runToken: start.dados.runToken, score: 30 });
    assert.equal(sub.status, 200);
    assert.equal(sub.dados.credits, 300);

    const baralho = await leitor('GET', '/api/baralho');
    assert.equal(baralho.status, 200);
    assert.equal(baralho.dados.carteira.creditos, 300);
});

test('B6. Partida com score 0 (credits 0) e partida anti-cheat (422): carteira não muda', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor5', 'Leitor Cinco');

    // Partida score 0
    const start1 = await leitor('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 120_000;
    const sub1 = await leitor('POST', '/api/games/session/submit', { runToken: start1.dados.runToken, score: 0 });
    assert.equal(sub1.status, 200);
    assert.equal(sub1.dados.credits, 0);

    let baralho = await leitor('GET', '/api/baralho');
    assert.equal(baralho.dados.carteira.creditos, 0);

    // Partida recusada pelo anti-cheat: score 999 com 1s de jogo
    const start2 = await leitor('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 1_000;
    const sub2 = await leitor('POST', '/api/games/session/submit', { runToken: start2.dados.runToken, score: 999 });
    assert.equal(sub2.status, 422);

    baralho = await leitor('GET', '/api/baralho');
    assert.equal(baralho.dados.carteira.creditos, 0);
});

test('B7. Clique duplo: com 300 créditos, Promise.all de 2x comprar {tipo: "toradolandia"} dá um 200 e um 402', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor6', 'Leitor Seis');

    // Ganha 300 créditos via partida
    const start = await leitor('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 120_000;
    await leitor('POST', '/api/games/session/submit', { runToken: start.dados.runToken, score: 30 });

    const [c1, c2] = await Promise.all([
        leitor('POST', '/api/baralho/comprar', { tipo: 'toradolandia' }),
        leitor('POST', '/api/baralho/comprar', { tipo: 'toradolandia' }),
    ]);

    const statuses = [c1.status, c2.status].sort();
    assert.deepEqual(statuses, [200, 402]);

    const baralho = await leitor('GET', '/api/baralho');
    assert.equal(baralho.dados.carteira.creditos, 0);
    // 1 de boas-vindas + 1 comprado = 2 pacotes fechados
    assert.equal(baralho.dados.pacotes.length, 2);
    assert.equal(baralho.dados.pacotes.filter((p) => p.tipo === 'toradolandia').length, 1);
});

test('B8. Comprar {tipo: "estacionamento", quantidade: 3}: 200, 3 comprados. Validações 11 (400), xyz (400), po no toradolandia (400)', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor7', 'Leitor Sete');

    // Ganha 300 créditos via partida
    const start = await leitor('POST', '/api/games/session/start', { gameId: 'flappy-enzo' });
    relogio.agora += 120_000;
    await leitor('POST', '/api/games/session/submit', { runToken: start.dados.runToken, score: 30 });

    // Compra 3
    const compra = await leitor('POST', '/api/baralho/comprar', { tipo: 'estacionamento', quantidade: 3 });
    assert.equal(compra.status, 200);
    assert.equal(compra.dados.comprados.length, 3);
    assert.equal(compra.dados.carteira.creditos, 0);

    // Quantidade inválida: 11
    assert.equal((await leitor('POST', '/api/baralho/comprar', { tipo: 'estacionamento', quantidade: 11 })).status, 400);
    // Tipo inválido: xyz
    assert.equal((await leitor('POST', '/api/baralho/comprar', { tipo: 'xyz' })).status, 400);
    // Moeda pó no toradolandia (não aceita pó): 400
    assert.equal((await leitor('POST', '/api/baralho/comprar', { tipo: 'toradolandia', moeda: 'po' })).status, 400);
});

test('B9. Abrir o pacote de boas-vindas: 200, 3 cartas válidas e coleção soma 3 cartas', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor8', 'Leitor Oito');

    const baralho = await leitor('GET', '/api/baralho');
    const pacoteId = baralho.dados.pacotes[0].id;

    const abrir = await leitor('POST', '/api/baralho/abrir', { pacotes: [pacoteId] });
    assert.equal(abrir.status, 200);
    assert.equal(abrir.dados.abertos.length, 1);
    const cartas = abrir.dados.abertos[0].cartas;
    assert.equal(cartas.length, 3);

    for (const c of cartas) {
        const def = Baralho.carta(c.id);
        assert.ok(def, `carta ${c.id} deve existir em Baralho.CARTAS`);
        assert.equal(c.raridade, def.raridade);
    }
    const totalQtd = Object.values(abrir.dados.colecao).reduce((acc, q) => acc + q, 0);
    assert.equal(totalQtd, 3);
});

test('B10. Abrir o mesmo pacote de novo dá 404; Promise.all de 2x abrir o mesmo pacote dá exatamente um 200 e um 404', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor9', 'Leitor Nove');

    const baralho = await leitor('GET', '/api/baralho');
    const pacoteId = baralho.dados.pacotes[0].id;

    // Concorrência: 2 chamadas simultâneas para o mesmo pacote
    const [a1, a2] = await Promise.all([
        leitor('POST', '/api/baralho/abrir', { pacotes: [pacoteId] }),
        leitor('POST', '/api/baralho/abrir', { pacotes: [pacoteId] }),
    ]);
    const statuses = [a1.status, a2.status].sort();
    assert.deepEqual(statuses, [200, 404]);

    const apos = await leitor('GET', '/api/baralho');
    const totalQtd = Object.values(apos.dados.colecao).reduce((acc, q) => acc + q, 0);
    assert.equal(totalQtd, 3);

    // Tenta abrir de novo
    const denovo = await leitor('POST', '/api/baralho/abrir', { pacotes: [pacoteId] });
    assert.equal(denovo.status, 404);
});

test('B11. Pacote de outra conta dá 404 e continua fechado para o dono', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const vitima = navegador();
    const ladrao = navegador();
    await entrar(vitima, 'vitima', 'Vitima Silva');
    await entrar(ladrao, 'ladrao', 'Ladrao Santos');

    const bVitima = await vitima('GET', '/api/baralho');
    const pacoteVitima = bVitima.dados.pacotes[0].id;

    // Ladrão tenta abrir o pacote da vítima
    const tentativa = await ladrao('POST', '/api/baralho/abrir', { pacotes: [pacoteVitima] });
    assert.equal(tentativa.status, 404);

    // Confere que continua fechado para a vítima
    const bVitimaApos = await vitima('GET', '/api/baralho');
    assert.equal(bVitimaApos.dados.pacotes.length, 1);
    assert.equal(bVitimaApos.dados.pacotes[0].id, pacoteVitima);
});

test('B12. Repetida: com aleatorio sempre 0 (Cara de Coração comum), colecao.cara-de-coracao === 3 e nova = true, false, false', async (t) => {
    // Sorteador fixo: sempre devolve 0 (raridade comum, carta cara-de-coracao)
    const { db, navegador } = montar({ aleatorio: () => 0 });
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor10', 'Leitor Dez');

    const baralho = await leitor('GET', '/api/baralho');
    const pacoteId = baralho.dados.pacotes[0].id;

    const abrir = await leitor('POST', '/api/baralho/abrir', { pacotes: [pacoteId] });
    assert.equal(abrir.status, 200);
    assert.equal(abrir.dados.colecao['cara-de-coracao'], 3);
    const cartas = abrir.dados.abertos[0].cartas;
    assert.deepEqual(cartas.map((c) => c.nova), [true, false, false]);
});

test('B13. Pó: continuar B12, converter 2 cara-de-coracao em 10 pó; erros 409 (tentar de novo), 400 (todas sem repetidas), 400 (inventada)', async (t) => {
    const { db, navegador } = montar({ aleatorio: () => 0 });
    t.after(() => db.close());
    const leitor = navegador();
    await entrar(leitor, 'leitor11', 'Leitor Onze');

    const baralho = await leitor('GET', '/api/baralho');
    await leitor('POST', '/api/baralho/abrir', { pacotes: [baralho.dados.pacotes[0].id] });

    // Transforma 2 cópias de cara-de-coracao (comum = 5 pó cada -> 10 pó)
    const poRes = await leitor('POST', '/api/baralho/po', { cartas: { 'cara-de-coracao': 2 } });
    assert.equal(poRes.status, 200);
    assert.equal(poRes.dados.ganhou, 10);
    assert.equal(poRes.dados.colecao['cara-de-coracao'], 1);
    assert.equal(poRes.dados.carteira.po, 10);

    // Tentar de novo com a última cópia restante dá 409
    const denovo = await leitor('POST', '/api/baralho/po', { cartas: { 'cara-de-coracao': 1 } });
    assert.equal(denovo.status, 409);

    // {todas: true} sem nenhuma repetida restante dá 400
    const todas = await leitor('POST', '/api/baralho/po', { todas: true });
    assert.equal(todas.status, 400);

    // Carta inventada dá 400
    const inventada = await leitor('POST', '/api/baralho/po', { cartas: { carta_inexistente: 1 } });
    assert.equal(inventada.status, 400);
});

test('B14. {todas: true} com repetidas de várias raridades: calcula pó exato e todas as cartas ficam com qtd 1', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    const chefe = navegador();
    const leitor = navegador();
    await entrar(chefe, 'chefe', 'Admin');
    const u = await entrar(leitor, 'leitor12', 'Leitor Doze');

    // Insere cartas na coleção do leitor diretamente no banco para testar o cálculo exato de várias raridades:
    // 3x cara-de-coracao (comum, 5): 2 repetidas = 10 pó
    // 2x hatsune-neves (raro, 15): 1 repetida = 15 pó
    // 4x chorao (épico, 50): 3 repetidas = 150 pó
    // 2x enzo-games (lendário, 200): 1 repetida = 200 pó
    // Total esperado: 10 + 15 + 150 + 200 = 375 pó
    await db.query(
        `INSERT INTO colecao (user_id, card_id, qtd, primeira_em) VALUES
         ($1, 'cara-de-coracao', 3, $2),
         ($1, 'hatsune-neves', 2, $2),
         ($1, 'chorao', 4, $2),
         ($1, 'enzo-games', 2, $2)`, [u.id, relogio.agora]);

    const res = await leitor('POST', '/api/baralho/po', { todas: true });
    assert.equal(res.status, 200);
    assert.equal(res.dados.ganhou, 375);
    assert.equal(res.dados.carteira.po, 375);
    assert.equal(res.dados.colecao['cara-de-coracao'], 1);
    assert.equal(res.dados.colecao['hatsune-neves'], 1);
    assert.equal(res.dados.colecao.chorao, 1);
    assert.equal(res.dados.colecao['enzo-games'], 1);
});

test('B15. Pó compra pacote: admin dá po: 60, comprar {tipo: "estacionamento", moeda: "po"} dá 200; com 59 dá 402', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chefe = navegador();
    const leitor = navegador();
    await entrar(chefe, 'chefe', 'Admin');
    const u = await entrar(leitor, 'leitor13', 'Leitor Treze');

    // Admin dá 59 de pó
    await chefe('POST', `/api/admin/users/${u.id}/baralho`, { po: 59 });
    const falha = await leitor('POST', '/api/baralho/comprar', { tipo: 'estacionamento', moeda: 'po' });
    assert.equal(falha.status, 402);
    assert.match(falha.dados.error, /pó de estrela insuficiente/i);

    // Admin dá mais 1 de pó (fica 60)
    await chefe('POST', `/api/admin/users/${u.id}/baralho`, { po: 1 });
    const sucesso = await leitor('POST', '/api/baralho/comprar', { tipo: 'estacionamento', moeda: 'po' });
    assert.equal(sucesso.status, 200);
    assert.equal(sucesso.dados.carteira.po, 0);
    assert.equal(sucesso.dados.comprados.length, 1);
});

test('B16. Garantias: 300 pacotes toradolandia têm >=1 raro/epico/lendario; 300 piscina-de-macarronada têm >=1 epico/lendario', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chefe = navegador();
    const leitor = navegador();
    await entrar(chefe, 'chefe', 'Admin');
    const u = await entrar(leitor, 'leitor14', 'Leitor Quatorze');

    // Dá 300 pacotes toradolandia
    for (let i = 0; i < 30; i++) {
        await chefe('POST', `/api/admin/users/${u.id}/baralho`, { pacote: 'toradolandia', quantidade: 10 });
    }
    let b = await leitor('GET', '/api/baralho');
    const pacotesTor = b.dados.pacotes.filter((p) => p.tipo === 'toradolandia').map((p) => p.id);
    assert.equal(pacotesTor.length, 300);

    for (let i = 0; i < 300; i += 10) {
        const lote = pacotesTor.slice(i, i + 10);
        const res = await leitor('POST', '/api/baralho/abrir', { pacotes: lote });
        assert.equal(res.status, 200);
        for (const aberto of res.dados.abertos) {
            const niveis = aberto.cartas.map((c) => Baralho.nivel(c.raridade));
            // Garantia raro (nível >= 1)
            assert.ok(niveis.some((n) => n >= 1), 'toradolandia deve ter pelo menos 1 carta raro ou melhor');
        }
    }

    // Dá 300 pacotes piscina-de-macarronada
    for (let i = 0; i < 30; i++) {
        await chefe('POST', `/api/admin/users/${u.id}/baralho`, { pacote: 'piscina-de-macarronada', quantidade: 10 });
    }
    b = await leitor('GET', '/api/baralho');
    const pacotesPis = b.dados.pacotes.filter((p) => p.tipo === 'piscina-de-macarronada').map((p) => p.id);
    assert.equal(pacotesPis.length, 300);

    for (let i = 0; i < 300; i += 10) {
        const lote = pacotesPis.slice(i, i + 10);
        const res = await leitor('POST', '/api/baralho/abrir', { pacotes: lote });
        assert.equal(res.status, 200);
        for (const aberto of res.dados.abertos) {
            const niveis = aberto.cartas.map((c) => Baralho.nivel(c.raridade));
            // Garantia épico (nível >= 2)
            assert.ok(niveis.some((n) => n >= 2), 'piscina-de-macarronada deve ter pelo menos 1 carta épico ou melhor');
        }
    }
});

test('B17. Distribuição: sortearRaridade 10 000x para estacionamento fica a <= 2 pp do esperado (72/22/5/1)', () => {
    const chances = { comum: 72, raro: 22, epico: 5, lendario: 1 };
    const contagem = { comum: 0, raro: 0, epico: 0, lendario: 0 };
    const TOTAL = 10_000;

    for (let i = 0; i < TOTAL; i++) {
        const r = sortearRaridade(chances, aleatorioSeguro);
        contagem[r]++;
    }

    for (const [r, esperada] of Object.entries(chances)) {
        const pct = (contagem[r] / TOTAL) * 100;
        const diff = Math.abs(pct - esperada);
        assert.ok(diff <= 2.0, `raridade ${r} variou ${diff.toFixed(2)} pp (obtido ${pct.toFixed(2)}%, esperado ${esperada}%)`);
    }
});

test('B18. Admin POST /api/admin/users/:id/baralho {creditos, po, pacote}: 200, log registrado, zera créditos e 404 para leitor comum', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chefe = navegador();
    const leitor = navegador();
    await entrar(chefe, 'chefe', 'Admin');
    const u = await entrar(leitor, 'leitor15', 'Leitor Quinze');

    // Admin dá 500 créditos, 20 pó e 2 pacotes piscina-de-macarronada
    const res = await chefe('POST', `/api/admin/users/${u.id}/baralho`, {
        creditos: 500, po: 20, pacote: 'piscina-de-macarronada', quantidade: 2,
    });
    assert.equal(res.status, 200);
    assert.equal(res.dados.carteira.creditos, 500);
    assert.equal(res.dados.carteira.po, 20);
    assert.equal(res.dados.pacotes.filter((p) => p.tipo === 'piscina-de-macarronada').length, 2);

    // Confere admin_log
    const log = await chefe('GET', '/api/admin/log');
    assert.equal(log.status, 200);
    const entradaBaralho = log.dados.log.find((l) => l.acao === 'baralho');
    assert.ok(entradaBaralho, 'deve registrar acao baralho no log');
    assert.equal(entradaBaralho.alvo, u.id);

    // Zerar com valor muito negativo (nunca fica negativo)
    const zera = await chefe('POST', `/api/admin/users/${u.id}/baralho`, { creditos: -99999 });
    assert.equal(zera.status, 200);
    assert.equal(zera.dados.carteira.creditos, 0);

    // Conta comum chamando rota de admin dá 404
    const comum = await leitor('POST', `/api/admin/users/${u.id}/baralho`, { creditos: 100 });
    assert.equal(comum.status, 404);
});

test('B19. GET /api/admin/users/:id retorna baralho.carteira, baralho.colecao e baralho.pacotes', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const chefe = navegador();
    const leitor = navegador();
    await entrar(chefe, 'chefe', 'Admin');
    const u = await entrar(leitor, 'leitor16', 'Leitor Dezesseis');

    await leitor('GET', '/api/baralho'); // cria boas-vindas

    const res = await chefe('GET', `/api/admin/users/${u.id}`);
    assert.equal(res.status, 200);
    assert.ok(res.dados.baralho, 'deve conter objeto baralho');
    assert.ok(res.dados.baralho.carteira, 'deve conter carteira');
    assert.ok(res.dados.baralho.colecao, 'deve conter colecao');
    assert.ok(Array.isArray(res.dados.baralho.pacotes), 'deve conter pacotes');
    assert.equal(res.dados.baralho.pacotes.length, 1);
});

test('B20. Cabo Côco: chance fixa de 0,5% por carta (200 mil sorteios, ±0,1 pp) e nunca sai no sorteio por raridade', () => {
    let saiu = 0;
    for (let i = 0; i < 200000; i++) if (sortearFixa(aleatorioSeguro)?.id === 'cabo-coco') saiu++;
    assert.ok(Math.abs(saiu / 2000 - 0.5) <= 0.1, `saiu ${saiu / 2000}%`);
    for (let i = 0; i < 5000; i++) assert.notEqual(sortearCarta('lendario', aleatorioSeguro).id, 'cabo-coco');
    assert.equal(sortearFixa(() => 0), null);
});
