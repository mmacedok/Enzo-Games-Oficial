// ============================================================================
// Testes dos lançamentos (api/lancamentos.js + js/lancamentos.js): publicar, agendar e esconder capítulos.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const L = require('../js/lancamentos.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40), ADMIN_EMAILS: 'chefe@exemplo.com' };
const DIA = 24 * 60 * 60 * 1000;

function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    const verificarGoogle = async (credencial) => {
        const [prefixo, sub, nome] = credencial.split(':');
        if (prefixo !== 'google') throw new Error('assinatura inválida');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => relogio.agora });
    function navegador() {
        let cookie = '';
        return async function chamar(metodo, caminho, corpo) {
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const resposta = await api(new Request(`http://localhost${caminho}`, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }));
            const setCookie = resposta.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            return { status: resposta.status, dados: await resposta.json() };
        };
    }
    return { db, relogio, navegador };
}

async function cenario() {
    const m = montar();
    const chefe = m.navegador();
    const leitor = m.navegador();
    await chefe('POST', '/api/auth/google', { credential: `google:chefe:Henrique-${'x'.repeat(20)}` });
    await leitor('POST', '/api/auth/google', { credential: `google:leitor:Ze-${'x'.repeat(20)}` });
    return { ...m, chefe, leitor };
}

test('lançamentos: só admin mexe e os dados são validados', async (t) => {
    const { db, chefe, leitor, navegador } = await cenario();
    t.after(() => db.close());
    const corpo = { comic: 'degustador', capitulo: '5', acao: 'publicar' };
    for (const chamar of [leitor, navegador()]) assert.equal((await chamar('POST', '/api/admin/lancamentos', corpo)).status, 404);
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { ...corpo, comic: 'Degustador!' })).status, 400);
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { ...corpo, capitulo: '' })).status, 400);
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { ...corpo, acao: 'apagar' })).status, 400);
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { ...corpo, avisar: 'sim' })).status, 400);
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { ...corpo, acao: 'agendar' })).status, 400, 'agendar pede horário');
});

test('lançamentos: publicar, agendar (só no futuro), esconder e o aviso de 7 dias', async (t) => {
    const { db, relogio, chefe, navegador } = await cenario();
    t.after(() => db.close());
    const publico = () => navegador()('GET', '/api/site/revelados').then((r) => r.dados);
    const inicial = await publico();
    assert.deepEqual(inicial.capitulos, []);
    assert.deepEqual(inicial.avisos, []);

    // publicar com aviso
    const pub = await chefe('POST', '/api/admin/lancamentos', { comic: 'hatsune-neves', capitulo: '2', acao: 'publicar', avisar: true });
    assert.equal(pub.status, 200);
    assert.equal(pub.dados.estado, 'no-ar');
    let dados = await publico();
    assert.deepEqual(dados.capitulos, [{ c: 'hatsune-neves/2', estado: 'no-ar', em: relogio.agora }]);
    assert.deepEqual(dados.avisos, [{ c: 'hatsune-neves/2', em: relogio.agora }]);
    relogio.agora += 8 * DIA;
    assert.deepEqual((await publico()).avisos, [], 'o aviso vale só 7 dias');

    // agendar: no passado é recusado; no futuro vira agendado e só avisa depois do horário
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { comic: 'capitulo-9', capitulo: 'capitulo-9-unico', acao: 'agendar', em: relogio.agora - 1 })).status, 400);
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { comic: 'capitulo-9', capitulo: 'capitulo-9-unico', acao: 'agendar', em: relogio.agora + 400 * DIA })).status, 400);
    const quando = relogio.agora + 2 * DIA;
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { comic: 'capitulo-9', capitulo: 'capitulo-9-unico', acao: 'agendar', em: quando, avisar: true })).status, 200);
    dados = await publico();
    assert.deepEqual(dados.capitulos.find((c) => c.c === 'capitulo-9/capitulo-9-unico'), { c: 'capitulo-9/capitulo-9-unico', estado: 'agendado', em: quando });
    assert.deepEqual(dados.avisos, [], 'agendado ainda não avisa');
    relogio.agora = quando + 1000;
    assert.deepEqual((await publico()).avisos, [{ c: 'capitulo-9/capitulo-9-unico', em: quando }], 'passou o horário: avisa');

    // esconder tira o aviso
    assert.equal((await chefe('POST', '/api/admin/lancamentos', { comic: 'capitulo-9', capitulo: 'capitulo-9-unico', acao: 'esconder' })).status, 200);
    dados = await publico();
    assert.equal(dados.capitulos.find((c) => c.c === 'capitulo-9/capitulo-9-unico').estado, 'rascunho');
    assert.deepEqual(dados.avisos, []);

    // tudo fica no histórico do admin
    const log = (await chefe('GET', '/api/admin/log')).dados;
    const acoes = (log.acoes || log.log || log).map((l) => l.acao);
    for (const a of ['publish', 'schedule', 'unpublish']) assert.ok(acoes.includes(a), `log tem ${a}`);
});

test('visibilidade: banco manda; sem banco vale o catálogo (hidden, reveal antigo e revealAt)', () => {
    const agora = 1_700_000_000_000;
    const idx = (extra = {}) => L.indexar({ ids: [], capitulos: [], agora, ...extra });
    const publico = { id: 'torado', chapters: [{ id: '1' }] };
    const escondido = { id: 'capitulo-9', hidden: true, chapters: [{ id: 'u' }] };
    const capEscondido = { id: 'degustador', chapters: [{ id: '4' }, { id: '5', hidden: true }] };

    assert.equal(L.situacao(publico, publico.chapters[0], idx()).estado, 'no-ar');
    assert.equal(L.situacao(escondido, escondido.chapters[0], idx()).estado, 'escondido');
    assert.equal(L.situacao(capEscondido, capEscondido.chapters[0], idx()).estado, 'no-ar');
    assert.equal(L.situacao(capEscondido, capEscondido.chapters[1], idx()).estado, 'escondido', 'esconder só um capítulo do spin-off');
    // reveal antigo (por gibi) e revealAt
    assert.equal(L.situacao(escondido, escondido.chapters[0], idx({ ids: ['capitulo-9'] })).estado, 'no-ar');
    assert.equal(L.situacao({ ...escondido, revealAt: agora - 1 }, escondido.chapters[0], idx()).estado, 'no-ar');
    assert.equal(L.situacao({ ...escondido, revealAt: agora + DIA }, escondido.chapters[0], idx()).estado, 'agendado');
    // o banco ganha do catálogo, nos dois sentidos
    assert.equal(L.situacao(escondido, escondido.chapters[0], idx({ capitulos: [{ c: 'capitulo-9/u', estado: 'no-ar', em: agora }] })).estado, 'no-ar');
    assert.equal(L.situacao(publico, publico.chapters[0], idx({ capitulos: [{ c: 'torado/1', estado: 'rascunho', em: null }] })).estado, 'escondido', 'dá para esconder o que já estava no ar (retroativo)');
    assert.equal(L.situacao(publico, publico.chapters[0], idx({ capitulos: [{ c: 'torado/1', estado: 'agendado', em: agora + DIA }] })).estado, 'agendado');
    assert.equal(L.situacao(publico, publico.chapters[0], idx({ capitulos: [{ c: 'torado/1', estado: 'agendado', em: agora - 1 }] })).estado, 'no-ar', 'agendado vencido já está no ar');
});

test('filtrar: tira capítulos escondidos e gibis sem nenhum capítulo no ar', () => {
    const db = { comics: [
        { id: 'a', chapters: [{ id: '1' }, { id: '2', hidden: true }] },
        { id: 'b', hidden: true, chapters: [{ id: '1' }] },
        { id: 'c', chapters: [{ id: '1' }] },
    ], censorship: {} };
    const vistos = L.filtrar(db, { ids: [], capitulos: [], agora: 1 });
    assert.deepEqual(vistos.comics.map((c) => [c.id, c.chapters.map((x) => x.id)]), [['a', ['1']], ['c', ['1']]]);
    assert.deepEqual(vistos.censorship, {});
    assert.equal(vistos.comics[1], db.comics[2], 'gibi inteiro no ar volta o mesmo objeto');
});

test('horário de Fortaleza: ida e volta (UTC-3, sem horário de verão)', () => {
    const ms = L.deFortaleza('2026-10-02T09:30');
    assert.equal(new Date(ms).toISOString(), '2026-10-02T12:30:00.000Z');
    assert.equal(L.paraCampo(ms), '2026-10-02T09:30');
    assert.ok(Number.isNaN(L.deFortaleza('amanhã')));
    assert.match(L.formatar(ms), /02\/10\/2026.*09:30.*Fortaleza/);
});

test('acesso antecipado: o admin escolhe quem vê antes; só o leitor escolhido recebe o capítulo em `meus`', async (t) => {
    const { db, chefe, leitor, navegador } = await cenario();
    t.after(() => db.close());
    const eu = (await leitor('GET', '/api/auth/me')).dados.user;
    const outro = navegador();
    await outro('POST', '/api/auth/google', { credential: `google:outro:Bia-${'x'.repeat(20)}` });
    const dar = (corpo) => chefe('POST', '/api/admin/lancamentos/acesso', { comic: 'degustador', capitulo: '5', usuario: eu.id, dar: true, ...corpo });

    // só admin e com dados válidos
    assert.equal((await leitor('POST', '/api/admin/lancamentos/acesso', { comic: 'degustador', capitulo: '5', usuario: eu.id, dar: true })).status, 404);
    assert.equal((await dar({ usuario: 'nao-e-uuid' })).status, 400);
    assert.equal((await dar({ dar: 'sim' })).status, 400);
    assert.equal((await dar({ comic: 'Degustador!' })).status, 400);
    assert.equal((await dar({ usuario: '00000000-0000-4000-8000-000000000000' })).status, 404, 'leitor que não existe');

    assert.deepEqual((await leitor('GET', '/api/site/revelados')).dados.meus, []);
    const r = await dar({});
    assert.equal(r.status, 200);
    assert.equal(r.dados.mudou, true);
    assert.equal((await dar({})).dados.mudou, false, 'dar de novo não muda nada');

    assert.deepEqual((await leitor('GET', '/api/site/revelados')).dados.meus, ['degustador/5']);
    assert.deepEqual((await outro('GET', '/api/site/revelados')).dados.meus, [], 'outro leitor não ganha acesso');
    assert.deepEqual((await navegador()('GET', '/api/site/revelados')).dados.meus, [], 'visitante também não');

    const lista = (await chefe('GET', '/api/admin/lancamentos/acessos')).dados.acessos;
    assert.equal(lista.length, 1);
    assert.equal(lista[0].c, 'degustador/5');
    assert.equal(lista[0].usuario.id, eu.id);
    assert.equal((await leitor('GET', '/api/admin/lancamentos/acessos')).status, 404);

    assert.equal((await dar({ dar: false })).dados.mudou, true);
    assert.deepEqual((await leitor('GET', '/api/site/revelados')).dados.meus, []);
    const log = (await chefe('GET', '/api/admin/log')).dados;
    const acoes = (log.acoes || log.log || log).map((l) => l.acao);
    assert.ok(acoes.includes('early-access') && acoes.includes('early-revoke'));
});

test('acesso antecipado: vê o capítulo escondido ou agendado, mas não muda o que os outros veem', () => {
    const agora = 1_700_000_000_000;
    const gibi = { id: 'degustador', chapters: [{ id: '4' }, { id: '5', hidden: true }] };
    const comAcesso = L.indexar({ ids: [], capitulos: [], meus: ['degustador/5'], agora });
    const semAcesso = L.indexar({ ids: [], capitulos: [], meus: [], agora });
    assert.equal(L.situacao(gibi, gibi.chapters[1], comAcesso).estado, 'no-ar');
    assert.equal(L.situacao(gibi, gibi.chapters[1], comAcesso).origem, 'acesso');
    assert.equal(L.situacao(gibi, gibi.chapters[1], semAcesso).estado, 'escondido');
    assert.equal(L.situacaoPublica(gibi, gibi.chapters[1], comAcesso).estado, 'escondido', 'a visão pública ignora o acesso');
    // agendado e rascunho do banco também
    const agendado = L.indexar({ capitulos: [{ c: 'degustador/5', estado: 'agendado', em: agora + 1000 }], meus: ['degustador/5'], agora });
    assert.equal(L.situacao(gibi, gibi.chapters[1], agendado).estado, 'no-ar');
    // e o filtro do site mostra o capítulo só para quem tem acesso
    const db = { comics: [gibi] };
    assert.deepEqual(L.filtrar(db, { meus: ['degustador/5'], agora }).comics[0].chapters.map((c) => c.id), ['4', '5']);
    assert.deepEqual(L.filtrar(db, { meus: [], agora }).comics[0].chapters.map((c) => c.id), ['4']);
});
