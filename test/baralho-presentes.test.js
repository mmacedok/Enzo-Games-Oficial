// ============================================================================
// Testes dos presentes do Baralho Enzo (api/baralho.js): boas-vindas (3 pacotes),
// presentes únicos, pacote do dia (Brasília) e o fluxo do visitante sem login.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const Baralho = require('../js/baralho-dados.js');

const ENV = {
    GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com',
    SESSION_SECRET: 'x'.repeat(40),
    ADMIN_EMAILS: 'chefe@exemplo.com',
};

const DIA = 24 * 60 * 60 * 1000;
// Meio do dia de Brasília (UTC−3): 15:00 UTC = 12:00 em Brasília.
const BASE = Date.parse('2023-11-15T15:00:00Z');

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

/** Abre as boas-vindas como visitante e devolve { codigo, abertos }. */
async function abrirVisitante(visitante) {
    const res = await visitante('POST', '/api/baralho/visitante', {});
    assert.equal(res.status, 200);
    return res.dados;
}

/** POST /api/baralho/entrada (corpo vazio, mas com Content-Type JSON). */
const entrada = (chamar) => chamar('POST', '/api/baralho/entrada', {});

test('P1. Visitante sem login: 200, codigo string, 3 pacotes, 3+5+5 cartas válidas, garantias', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());
    const visitante = navegador();

    const { codigo, abertos } = await abrirVisitante(visitante);
    assert.equal(typeof codigo, 'string');
    assert.ok(codigo.length > 0);
    assert.equal(abertos.length, 3);
    assert.equal(abertos[0].tipo, 'estacionamento');
    assert.equal(abertos[1].tipo, 'toradolandia');
    assert.equal(abertos[2].tipo, 'piscina-de-macarronada');

    const contagens = [3, 5, 5];
    abertos.forEach((pacote, i) => {
        assert.equal(pacote.cartas.length, contagens[i], `pacote ${pacote.tipo} deve ter ${contagens[i]} cartas`);
        for (const c of pacote.cartas) {
            const def = Baralho.carta(c.id);
            assert.ok(def, `carta ${c.id} deve existir em Baralho.CARTAS`);
            assert.equal(c.raridade, def.raridade);
        }
    });

    const niveisPiscina = abertos[2].cartas.map((c) => Baralho.nivel(c.raridade));
    assert.ok(niveisPiscina.some((n) => n >= Baralho.nivel('epico')), 'piscina deve ter >= 1 épica ou melhor');
    const niveisTor = abertos[1].cartas.map((c) => Baralho.nivel(c.raridade));
    assert.ok(niveisTor.some((n) => n >= Baralho.nivel('raro')), 'toradolandia deve ter >= 1 rara ou melhor');
});

test('P2. Resgatar em conta nova (depois de GET): 200, coleção soma 13 iguais às do visitante, 0 boas-vindas fechadas', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());

    const conta = navegador();
    await entrar(conta, 'p2', 'P Dois');
    const antes = await conta('GET', '/api/baralho');
    assert.equal(antes.dados.pacotes.filter((p) => p.origem === 'boas-vindas').length, 3);

    const visitante = navegador();
    const { codigo, abertos } = await abrirVisitante(visitante);
    const esperado = {};
    for (const pacote of abertos) for (const c of pacote.cartas) esperado[c.id] = (esperado[c.id] || 0) + 1;

    const res = await conta('POST', '/api/baralho/visitante/resgatar', { codigo });
    assert.equal(res.status, 200);
    const soma = Object.values(res.dados.colecao).reduce((a, b) => a + b, 0);
    assert.equal(soma, 13);
    assert.deepEqual(res.dados.colecao, esperado);
    assert.equal(res.dados.pacotes.filter((p) => p.origem === 'boas-vindas').length, 0);

    const depois = await conta('GET', '/api/baralho');
    assert.equal(depois.status, 200);
    assert.equal(depois.dados.boasVindas, false);
    assert.equal(depois.dados.pacotes.filter((p) => p.origem === 'boas-vindas').length, 0);
});

test('P3. Resgatar antes de qualquer GET: 200 e o GET seguinte não cria boas-vindas fechadas', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());

    const conta = navegador();
    await entrar(conta, 'p3', 'P Três');
    const visitante = navegador();
    const { codigo } = await abrirVisitante(visitante);

    const res = await conta('POST', '/api/baralho/visitante/resgatar', { codigo });
    assert.equal(res.status, 200);

    const depois = await conta('GET', '/api/baralho');
    assert.equal(depois.status, 200);
    assert.equal(depois.dados.boasVindas, false);
    assert.equal(depois.dados.pacotes.filter((p) => p.origem === 'boas-vindas').length, 0);
});

test('P4. Mesmo código em outra conta: 409. Mesma conta com outro código: 409', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());

    const visitante = navegador();
    const { codigo: codigo1 } = await abrirVisitante(visitante);

    const contaA = navegador();
    await entrar(contaA, 'p4a', 'P Quatro A');
    assert.equal((await contaA('POST', '/api/baralho/visitante/resgatar', { codigo: codigo1 })).status, 200);

    const contaB = navegador();
    await entrar(contaB, 'p4b', 'P Quatro B');
    assert.equal((await contaB('POST', '/api/baralho/visitante/resgatar', { codigo: codigo1 })).status, 409);

    const { codigo: codigo2 } = await abrirVisitante(visitante);
    assert.equal((await contaA('POST', '/api/baralho/visitante/resgatar', { codigo: codigo2 })).status, 409);
});

test('P5. Conta que já abriu um pacote: 409 e o código continua resgatável por outra conta nova', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());

    const conta = navegador();
    await entrar(conta, 'p5a', 'P Cinco A');
    await conta('GET', '/api/baralho');
    const baralho = await conta('GET', '/api/baralho');
    const abriu = await conta('POST', '/api/baralho/abrir', { pacotes: [baralho.dados.pacotes[0].id] });
    assert.equal(abriu.status, 200);

    const visitante = navegador();
    const { codigo } = await abrirVisitante(visitante);

    assert.equal((await conta('POST', '/api/baralho/visitante/resgatar', { codigo })).status, 409);

    const outra = navegador();
    await entrar(outra, 'p5b', 'P Cinco B');
    assert.equal((await outra('POST', '/api/baralho/visitante/resgatar', { codigo })).status, 200);
});

test('P6. Código inválido (../x e 123): 400. Sem login no resgatar: 401', async (t) => {
    const { db, navegador } = montar();
    t.after(() => db.close());

    const conta = navegador();
    await entrar(conta, 'p6', 'P Seis');
    assert.equal((await conta('POST', '/api/baralho/visitante/resgatar', { codigo: '../x' })).status, 400);
    assert.equal((await conta('POST', '/api/baralho/visitante/resgatar', { codigo: 123 })).status, 400);

    const anon = navegador();
    assert.equal((await anon('POST', '/api/baralho/visitante/resgatar', { codigo: 'abc' })).status, 401);
});

test('P7. Código de mais de 7 dias (relógio avançado): 409', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());

    const visitante = navegador();
    const { codigo } = await abrirVisitante(visitante);

    relogio.agora += 8 * DIA;

    const conta = navegador();
    await entrar(conta, 'p7', 'P Sete');
    assert.equal((await conta('POST', '/api/baralho/visitante/resgatar', { codigo })).status, 409);
});

test('P8. Entrada: 1ª dá boas-vindas (3) + presente único + diario toradolandia seq 1; 2ª no mesmo dia: vazio', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    relogio.agora = BASE;

    const conta = navegador();
    await entrar(conta, 'p8', 'P Oito');

    const e1 = await entrada(conta);
    assert.equal(e1.status, 200);
    const motivos = e1.dados.ganhos.map((g) => g.motivo);
    assert.equal(motivos.filter((m) => m === 'boas-vindas').length, 3);
    assert.equal(motivos.filter((m) => m === 'presente').length, 1);
    assert.equal(motivos.filter((m) => m === 'diario').length, 1);
    const tiposBoas = e1.dados.ganhos.filter((g) => g.motivo === 'boas-vindas').map((g) => g.tipo).sort();
    assert.deepEqual(tiposBoas, [...Baralho.BOAS_VINDAS].sort());
    const presente = e1.dados.ganhos.find((g) => g.motivo === 'presente');
    assert.equal(presente.tipo, Baralho.PRESENTES_UNICOS[0].tipo);
    const diario = e1.dados.ganhos.find((g) => g.motivo === 'diario');
    assert.equal(diario.tipo, 'toradolandia');
    assert.equal(diario.sequencia, 1);
    assert.equal(e1.dados.sequencia, 1);
    assert.equal(e1.dados.especialACada, Baralho.DIARIO.especialACada);

    const e2 = await entrada(conta);
    assert.equal(e2.status, 200);
    assert.deepEqual(e2.dados.ganhos, []);
    assert.equal(e2.dados.sequencia, 1);
});

test('P9. Dia seguinte: seq 2; pular um dia: volta a 1; 7 dias seguidos: no 7º vem piscina-de-macarronada', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());

    // Sequência: dia, dia+1, pula um (dia+3).
    relogio.agora = BASE;
    const conta = navegador();
    await entrar(conta, 'p9a', 'P Nove A');

    let r = await entrada(conta);
    assert.equal(r.dados.sequencia, 1);
    assert.equal(r.dados.ganhos.find((g) => g.motivo === 'diario').tipo, 'toradolandia');

    relogio.agora += DIA;
    r = await entrada(conta);
    assert.equal(r.dados.sequencia, 2);

    relogio.agora += 2 * DIA;
    r = await entrada(conta);
    assert.equal(r.dados.sequencia, 1, 'pulou um dia, volta a 1');

    // 7 dias seguidos.
    relogio.agora = BASE;
    const conta7 = navegador();
    await entrar(conta7, 'p9b', 'P Nove B');
    for (let i = 0; i < 7; i++) {
        if (i > 0) relogio.agora += DIA;
        const res = await entrada(conta7);
        assert.equal(res.dados.sequencia, i + 1);
        const dia = res.dados.ganhos.find((g) => g.motivo === 'diario');
        if (i === 6) assert.equal(dia.tipo, 'piscina-de-macarronada');
        else assert.equal(dia.tipo, 'toradolandia');
    }
});

test('P10. Virada do dia de Brasília: 02:59 UTC e 03:01 UTC do mesmo dia UTC são dias diferentes', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());

    const conta = navegador();
    await entrar(conta, 'p10', 'P Dez');

    // 2023-11-15 02:59 UTC = 2023-11-14 23:59 em Brasília.
    relogio.agora = Date.parse('2023-11-15T02:59:00Z');
    let r = await entrada(conta);
    assert.equal(r.dados.sequencia, 1);

    // 2023-11-15 03:01 UTC = 2023-11-15 00:01 em Brasília: dia seguinte.
    relogio.agora = Date.parse('2023-11-15T03:01:00Z');
    r = await entrada(conta);
    assert.equal(r.dados.sequencia, 2, 'as duas entradas são dias de Brasília diferentes');
});

test('P11. Duas entradas ao mesmo tempo (Promise.all) não dão o diário nem o presente único em dobro', async (t) => {
    const { db, relogio, navegador } = montar();
    t.after(() => db.close());
    relogio.agora = BASE;

    const conta = navegador();
    await entrar(conta, 'p11', 'P Onze');

    const [a, b] = await Promise.all([entrada(conta), entrada(conta)]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);

    const ganhos = [...a.dados.ganhos, ...b.dados.ganhos];
    assert.equal(ganhos.filter((g) => g.motivo === 'boas-vindas').length, 3);
    assert.equal(ganhos.filter((g) => g.motivo === 'presente').length, 1);
    assert.equal(ganhos.filter((g) => g.motivo === 'diario').length, 1);
});
