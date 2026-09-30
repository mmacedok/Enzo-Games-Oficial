// ============================================================================
// Testes da Batalha dos Torados online (api/tcg.js): salas, partida inteira jogada
// pela API por dois robôs que só enxergam a própria visão, segredos, versão da
// mesa, relógio do turno e limites.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler.js');
const { createLocalDb } = require('../api/db-local.js');
const R = require('../js/tcg-regras.js');
const Robo = require('../js/tcg-robo.js');
const Tcg = require('../api/tcg.js');

const ENV = { GOOGLE_CLIENT_ID: 'teste.apps.googleusercontent.com', SESSION_SECRET: 'x'.repeat(40) };

function montar() {
    const relogio = { agora: 1_700_000_000_000 };
    const db = createLocalDb(null);
    let sorte = 7;
    const aleatorio = (max) => ((sorte = (sorte * 16807) % 2147483647) % max);
    const verificarGoogle = async (credencial) => {
        const [, sub, nome] = credencial.split(':');
        return { sub, name: nome, email: `${sub}@exemplo.com` };
    };
    const api = createApi({ db, env: ENV, verificarGoogle, agora: () => relogio.agora, aleatorio });
    const contagem = { chamadas: 0 };
    function navegador() {
        let cookie = '';
        return async function chamar(metodo, caminho, corpo) {
            contagem.chamadas++;
            const h = {};
            if (cookie) h.cookie = cookie;
            if (corpo !== undefined) { h['content-type'] = 'application/json'; h.origin = 'http://localhost'; }
            const r = await api(new Request(`http://localhost${caminho}`, {
                method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo),
            }));
            const setCookie = r.headers.getSetCookie();
            if (setCookie.length) cookie = setCookie[0].split(';')[0];
            const texto = await r.text();
            let dados = null;
            try { dados = JSON.parse(texto); } catch {}
            return { status: r.status, dados, texto };
        };
    }
    return { db, relogio, navegador, contagem };
}

async function jogador(m, sub, nome) {
    const chamar = m.navegador();
    const r = await chamar('POST', '/api/auth/google', { credential: `google:${sub}:${nome}:${"x".repeat(20)}` });
    assert.equal(r.status, 200, r.texto);
    return chamar;
}

/** Cria a sala com A e faz B entrar; devolve o id da partida e a primeira resposta de B. */
async function comecar(m, a, b, decks = ['turma', 'legiao'], { banir = true } = {}) {
    const sala = await a('POST', '/api/tcg/salas', { deck: decks[0] });
    assert.equal(sala.status, 200, sala.texto);
    const entrou = await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: decks[1] });
    assert.equal(entrou.status, 200, entrou.texto);
    const id = entrou.dados.id;
    let primeira = entrou.dados;
    // A partida começa com o banimento (os dois banem 2 cartas não lendárias); os testes que não tratam disso já passam por ele.
    if (banir) {
        for (const [j, lado] of [[0, a], [1, b]]) {
            const d = (await lado('GET', `/api/tcg/partidas/${id}`)).dados;
            assert.equal(d.visao.fase, 'banimento');
            const r = await lado('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: R.jogadasValidas(d.visao, j)[0], versao: d.versao, regras: R.REGRAS_VERSAO });
            assert.equal(r.status, 200, r.texto);
            primeira = r.dados;
        }
    }
    return { id, codigo: sala.dados.codigo, primeira };
}

test('T1. Sem login as rotas dão 401; deck desconhecido dá 400', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const visitante = m.navegador();
    assert.equal((await visitante('POST', '/api/tcg/salas', { deck: 'turma' })).status, 401);
    assert.equal((await visitante('GET', '/api/tcg/atual')).status, 401);
    const a = await jogador(m, 'a', 'Ana');
    assert.equal((await a('POST', '/api/tcg/salas', { deck: 'trapaca' })).status, 400);
});

test('T2. Sala: criar, ver, não entrar na própria, entrar, e só um consegue entrar', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const c = await jogador(m, 'c', 'Caio');
    const sala = await a('POST', '/api/tcg/salas', { deck: 'turma' });
    assert.match(sala.dados.codigo, /^TORA-[A-Z0-9]{3}$/);
    const vista = await b('GET', `/api/tcg/salas/${sala.dados.codigo.toLowerCase()}`);
    assert.equal(vista.dados.criador, 'Ana');
    assert.equal(vista.dados.partida, null);
    assert.equal((await a('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'turma' })).status, 400);
    const entrou = await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'internet' });
    assert.equal(entrou.status, 200, entrou.texto);
    assert.equal(entrou.dados.eu, 1);
    assert.equal((await c('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'turma' })).status, 404);
    // Quem criou descobre pela sala (ou pelo /atual) que a partida começou.
    assert.equal((await a('GET', `/api/tcg/salas/${sala.dados.codigo}`)).dados.partida, entrou.dados.id);
    assert.equal((await a('GET', '/api/tcg/atual')).dados.partida, entrou.dados.id);
    // Quem está jogando não cria outra sala.
    assert.equal((await a('POST', '/api/tcg/salas', { deck: 'turma' })).status, 409);
});

test('T3. Sala expira em 5 minutos sem o dono na tela de espera', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const sala = await a('POST', '/api/tcg/salas', { deck: 'turma' });
    m.relogio.agora += 4 * 60 * 1000;
    assert.equal((await b('GET', `/api/tcg/salas/${sala.dados.codigo}`)).status, 200);
    m.relogio.agora += 90 * 1000;   // 5min30 sem o dono perguntar
    assert.equal((await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'turma' })).status, 404);
});

test('T4. Partida inteira pela API com dois robôs: ninguém vê a mão do outro e o final confere com o motor', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const { id } = await comecar(m, a, b, undefined, { banir: false });   // os robôs também banem, pela API
    const lados = [a, b];
    const versoes = [-1, -1];
    const visoes = [null, null];
    let sorte = 3;
    const aleatorio = () => ((sorte = (sorte * 16807) % 2147483647) / 2147483647);
    let jogadas = 0;
    const antes = m.contagem.chamadas;
    let tempoMotor = 0;

    async function atualizar(j) {
        const r = await lados[j]('GET', `/api/tcg/partidas/${id}?desde=${versoes[j]}`);
        assert.equal(r.status, 200, r.texto);
        if (r.dados.visao) {
            visoes[j] = r.dados.visao;
            // Segredos: a mão e o deck do outro são só números; sem a sorte.
            const outro = r.dados.visao.jogadores[1 - j];
            assert.equal(typeof outro.mao, 'number');
            // (só na hora de banir cada um vê a lista do deck do outro, para escolher as cartas)
            if (r.dados.visao.fase !== 'banimento') assert.equal(typeof outro.deck, 'number');
            assert.equal(r.dados.visao.rng, undefined);
            assert.equal(r.dados.visao.semente, undefined);
            for (const ev of r.dados.eventos) {
                if (ev.tipo === 'compra' && ev.jogador !== j) assert.equal(ev.id, undefined);
                if (ev.privado) assert.equal(ev.jogador, j);
            }
        }
        versoes[j] = r.dados.versao;
        return r.dados;
    }

    for (let guarda = 0; guarda < 3000; guarda++) {
        const d0 = await atualizar(0);
        await atualizar(1);
        if (d0.status === 'fim') break;
        for (const j of [0, 1]) {
            const v = visoes[j];
            const inicio = performance.now();
            const validas = R.jogadasValidas(v, j);
            if (!validas.length) continue;
            const jogada = Robo.escolherJogada(v, j, { nivel: 'normal', aleatorio });
            tempoMotor += performance.now() - inicio;
            const r = await lados[j]('POST', `/api/tcg/partidas/${id}/jogada`, { jogada, versao: versoes[j], regras: R.REGRAS_VERSAO });
            assert.equal(r.status, 200, r.texto);
            jogadas++;
            break;
        }
    }
    const final = await atualizar(0);
    assert.equal(final.status, 'fim');
    // O servidor guardou tudo: refazer a partida com as jogadas dá o mesmo final.
    const [linha] = await m.db.query('SELECT estado FROM tcg_partidas WHERE id = $1', [id]);
    const estado = JSON.parse(linha.estado);
    const lista = (await m.db.query('SELECT jogada FROM tcg_jogadas WHERE partida_id = $1 ORDER BY n', [id])).map((l) => JSON.parse(l.jogada));
    assert.deepEqual(R.repetir({ semente: estado.semente, decks: [
        require('../js/tcg-cartas.js').DECKS_PRONTOS[0].cartas, require('../js/tcg-cartas.js').DECKS_PRONTOS[1].cartas,
    ], nomes: ['Ana', 'Beto'], banimento: true }, lista), estado);
    const [res] = await m.db.query('SELECT * FROM tcg_resultados WHERE partida_id = $1', [id]);
    assert.ok(res, 'resultado guardado');
    // Terminada, a partida não aparece mais como em andamento e dá para criar outra sala.
    assert.equal((await a('GET', '/api/tcg/atual')).dados.partida, null);
    t.diagnostic(`${jogadas} jogadas, ${m.contagem.chamadas - antes} chamadas (sem as perguntas de espera), robô ${tempoMotor.toFixed(0)} ms`);
});

test('T5. Jogada fora da vez, de lado trocado ou com versão velha é recusada', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const { id, primeira } = await comecar(m, a, b);
    const v = primeira.visao;
    // B prepara com uma jogada que diz ser do jogador 0: o servidor usa o lado do login.
    const prep = R.jogadasValidas(v, 1)[0];
    const r = await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { ...prep, jogador: 0 }, versao: primeira.versao, regras: R.REGRAS_VERSAO });
    assert.equal(r.status, 200, r.texto);
    assert.equal(r.dados.visao.jogadores[1].preparado, true);
    assert.equal(r.dados.visao.jogadores[0].preparado, false);
    // Versão velha.
    const velha = await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'passar' }, versao: 0, regras: R.REGRAS_VERSAO });
    assert.equal(velha.status, 409);
    // Regras de outra versão.
    const regras = await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'passar' }, versao: 1, regras: 999 });
    assert.equal(regras.status, 409);
    assert.equal(regras.dados.recarregar, true);
    // Quem não é da partida nem vê que ela existe.
    const c = await jogador(m, 'c', 'Caio');
    assert.equal((await c('GET', `/api/tcg/partidas/${id}`)).status, 404);
    // A prepara e a partida começa; quem não é da vez não joga.
    const va = (await a('GET', `/api/tcg/partidas/${id}`)).dados;
    assert.equal((await a('POST', `/api/tcg/partidas/${id}/jogada`, {
        jogada: R.jogadasValidas(va.visao, 0)[0], versao: va.versao, regras: R.REGRAS_VERSAO })).status, 200);
    const d = (await a('GET', `/api/tcg/partidas/${id}`)).dados;
    const fora = 1 - d.visao.vez;
    const quem = fora === 0 ? a : b;
    const recusada = await quem('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'passar' }, versao: d.versao, regras: R.REGRAS_VERSAO });
    assert.equal(recusada.status, 400);
    assert.match(recusada.dados.error, /não é a sua vez/);
});

test('T6. Relógio: estourou o turno passa a vez; 3 estouros seguidos = derrota por inatividade', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const { id } = await comecar(m, a, b);
    // Ninguém se prepara: depois do prazo o servidor escolhe por eles (1 estouro cada).
    m.relogio.agora += Tcg.TURNO + 1000;
    let d = (await a('GET', `/api/tcg/partidas/${id}?desde=0`)).dados;
    assert.equal(d.visao.fase, 'jogo');
    assert.deepEqual(d.estouros, [1, 1]);
    assert.ok(d.eventos.some((e) => e.tipo === 'tempo'));
    // Quem tem a vez joga (zera os estouros dele); o outro some e perde por tempo.
    const ativo = d.visao.vez;
    const quem = ativo === 0 ? a : b;
    const dq = (await quem('GET', `/api/tcg/partidas/${id}`)).dados;
    assert.equal((await quem('POST', `/api/tcg/partidas/${id}/jogada`, {
        jogada: { tipo: 'passar' }, versao: dq.versao, regras: R.REGRAS_VERSAO })).status, 200);
    // Depois disso o ativo também some: cada um vai estourando até alguém chegar a 3.
    for (let i = 0; i < 10; i++) {
        m.relogio.agora += Tcg.TURNO + 1000;
        d = (await a('GET', `/api/tcg/partidas/${id}`)).dados;
        if (d.status === 'fim') break;
    }
    assert.equal(d.status, 'fim');
    const [linha] = await m.db.query('SELECT motivo, vencedor FROM tcg_partidas WHERE id = $1', [id]);
    assert.equal(linha.vencedor, ativo, 'quem sumiu primeiro (e mais vezes) perde');
    assert.equal(linha.motivo, 'inatividade');
    assert.deepEqual(d.visao.jogadores.map((x) => x.vida), [R.VIDA_INICIAL, R.VIDA_INICIAL], 'inatividade não tira vida');
});

test('T8. "Teve jogada?" sem novidade só lê a versão (1 consulta, sem a mesa); quem não joga não vê', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const c = await jogador(m, 'c', 'Caio');
    const { id, primeira } = await comecar(m, a, b);
    const consultas = [];
    const original = m.db.query.bind(m.db);
    m.db.query = (sql, params) => { consultas.push(sql); return original(sql, params); };
    const d = (await a('GET', `/api/tcg/partidas/${id}?desde=${primeira.versao}`)).dados;
    assert.equal(d.versao, primeira.versao);
    assert.equal(d.visao, undefined, 'sem novidade não manda a mesa');
    assert.deepEqual(d.estouros, [0, 0]);
    assert.equal(consultas.filter((s) => /tcg_/.test(s)).length, 1, `consultas: ${consultas.join(' | ')}`);
    m.db.query = original;
    assert.equal((await c('GET', `/api/tcg/partidas/${id}?desde=0`)).status, 404);
    // Com novidade (ou pedindo do zero) vem a mesa inteira.
    const tudo = (await a('GET', `/api/tcg/partidas/${id}?desde=-1`)).dados;
    assert.ok(tudo.visao);
});

test('T9. Salas abertas: aparece para os outros enquanto o dono espera; some ao sumir, entrar ou cancelar', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const c = await jogador(m, 'c', 'Caio');
    const lista = async (quem) => (await quem('GET', '/api/tcg/salas')).dados.salas;
    assert.equal((await m.navegador()('GET', '/api/tcg/salas')).status, 401);
    const sala = await a('POST', '/api/tcg/salas', { deck: 'turma' });
    assert.deepEqual((await lista(b)).map((s) => [s.codigo, s.criador, s.deck]), [[sala.dados.codigo, 'Ana', 'turma']]);
    assert.deepEqual(await lista(a), [], 'a própria sala não aparece para o dono');
    // Sala pública: 5 minutos na lista (SALA_DURA)...
    assert.equal(Tcg.SALA_DURA, 5 * 60 * 1000);
    m.relogio.agora += Tcg.SALA_DURA - 1000;
    assert.equal((await lista(b)).length, 1);
    // ...e enquanto a tela de espera do dono pergunta, o tempo recomeça (outros 5 minutos)...
    await a('GET', `/api/tcg/salas/${sala.dados.codigo}`);
    m.relogio.agora += Tcg.SALA_DURA - 1000;
    assert.equal((await lista(b)).length, 1);
    // ...e quando o dono para de perguntar (fechou a aba), some sozinha e não dá mais para entrar.
    m.relogio.agora += 2000;
    assert.deepEqual(await lista(b), []);
    assert.equal((await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'legiao' })).status, 404);
    const nova = await a('POST', '/api/tcg/salas', { deck: 'turma' });   // criar outra é permitido
    assert.equal((await lista(b)).length, 1);
    sala.dados.codigo = nova.dados.codigo;
    // Entrou alguém: sai da lista de todo mundo.
    assert.equal((await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'legiao' })).status, 200);
    assert.deepEqual(await lista(c), []);
    // Cancelada também some.
    const outra = await c('POST', '/api/tcg/salas', { deck: 'turma' });
    const d = await jogador(m, 'd', 'Duda');
    assert.equal((await lista(d)).length, 1);
    await c('POST', `/api/tcg/salas/${outra.dados.codigo}/cancelar`, {});
    assert.deepEqual(await lista(d), []);
});

test('T10. Placar permanente: vitória, derrota e empate por conta; visitante vê o top', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    // Duas partidas: B desiste nas duas (A vence 2×).
    for (let i = 0; i < 2; i++) {
        const { id } = await comecar(m, a, b);
        const d = (await b('GET', `/api/tcg/partidas/${id}`)).dados;
        assert.equal((await b('POST', `/api/tcg/partidas/${id}/jogada`, {
            jogada: { tipo: 'desistir' }, versao: d.versao, regras: R.REGRAS_VERSAO })).status, 200);
    }
    // Um empate gravado direto (o empate não tem vencedor, mas conta para os dois).
    const [ua] = await m.db.query(`SELECT id FROM users WHERE display_name = 'Ana'`);
    const [ub] = await m.db.query(`SELECT id FROM users WHERE display_name = 'Beto'`);
    await m.db.query(
        `INSERT INTO tcg_resultados (partida_id, vencedor, perdedor, decks, turnos, motivo, fim_em, jogador_a, jogador_b)
         VALUES ('empate-1', NULL, NULL, '[]', 30, 'limiteTurnos', 1, $1, $2)`, [ua.id, ub.id]);
    const pa = (await a('GET', '/api/tcg/placar')).dados;
    assert.deepEqual(pa.meu, { nome: 'Ana', vitorias: 2, derrotas: 0, empates: 1, posicao: 1 });
    assert.deepEqual(pa.top.map((l) => [l.nome, l.vitorias, l.derrotas, l.empates, l.eu]),
        [['Ana', 2, 0, 1, true], ['Beto', 0, 2, 1, false]]);
    const visitante = (await m.navegador()('GET', '/api/tcg/placar')).dados;
    assert.equal(visitante.meu, null);
    assert.equal(visitante.top.length, 2);
    // O perfil público de cada leitor traz o mesmo placar (a ficha do site mostra).
    const perfilAna = (await m.navegador()('GET', `/api/readers/${ua.id}`)).dados;
    assert.deepEqual(perfilAna.batalha, { vitorias: 2, derrotas: 0, empates: 1, posicao: 1 });
    const perfilBeto = (await m.navegador()('GET', `/api/readers/${ub.id}`)).dados;
    assert.deepEqual(perfilBeto.batalha, { vitorias: 0, derrotas: 2, empates: 1, posicao: 2 });
    // A sala de quem tem placar mostra as vitórias dele na lista.
    await a('POST', '/api/tcg/salas', { deck: 'turma' });
    const [s] = (await b('GET', '/api/tcg/salas')).dados.salas;
    assert.deepEqual([s.vitorias, s.derrotas], [2, 0]);
});

test('T11. Partida da regra antiga é encerrada sem resultado e não trava o jogador', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const { id } = await comecar(m, a, b);
    await m.db.query('UPDATE tcg_partidas SET regras = $2 WHERE id = $1', [id, R.REGRAS_VERSAO - 1]);
    assert.equal((await a('GET', '/api/tcg/atual')).dados.partida, null, 'não conta como partida em andamento');
    const r = await a('GET', `/api/tcg/partidas/${id}?desde=-1`);
    assert.equal(r.status, 409);
    assert.equal(r.dados.recarregar, true);
    const [linha] = await m.db.query('SELECT status, motivo FROM tcg_partidas WHERE id = $1', [id]);
    assert.deepEqual([linha.status, linha.motivo], ['fim', 'atualizacao']);
    assert.equal((await m.db.query('SELECT * FROM tcg_resultados WHERE partida_id = $1', [id])).length, 0);
    assert.equal((await a('POST', '/api/tcg/salas', { deck: 'turma' })).status, 200, 'pode criar sala nova');
});

test('T12. Revanche: os dois pedem, nasce outra partida com os mesmos decks e os lados trocados', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const c = await jogador(m, 'c', 'Caio');
    const { id } = await comecar(m, a, b, ['turma', 'legiao']);
    // Partida em andamento não aceita revanche.
    assert.equal((await a('POST', `/api/tcg/partidas/${id}/revanche`, {})).status, 409);
    const d = (await b('GET', `/api/tcg/partidas/${id}`)).dados;
    await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'desistir' }, versao: d.versao, regras: R.REGRAS_VERSAO });

    // De fora: 404. Sem pedido de ninguém: nada.
    assert.equal((await c('GET', `/api/tcg/partidas/${id}/revanche`)).status, 404);
    assert.deepEqual((await a('GET', `/api/tcg/partidas/${id}/revanche`)).dados, { euQuero: false, outroQuer: false, partida: null, expirou: false });
    // Ana pede: Beto vê que ela quer, e ainda não há partida.
    assert.deepEqual((await a('POST', `/api/tcg/partidas/${id}/revanche`, {})).dados, { euQuero: true, outroQuer: false, partida: null, expirou: false });
    assert.deepEqual((await b('GET', `/api/tcg/partidas/${id}/revanche`)).dados, { euQuero: false, outroQuer: true, partida: null, expirou: false });
    // Beto aceita: nasce a partida; pedir de novo não cria outra.
    const aceite = (await b('POST', `/api/tcg/partidas/${id}/revanche`, {})).dados;
    assert.equal(aceite.euQuero && aceite.outroQuer, true);
    assert.ok(aceite.partida);
    assert.equal((await b('POST', `/api/tcg/partidas/${id}/revanche`, {})).dados.partida, aceite.partida);
    const daAna = (await a('GET', `/api/tcg/partidas/${id}/revanche`)).dados;
    assert.equal(daAna.partida, aceite.partida);

    // Lados trocados (Beto agora é o jogador 0), decks trocados junto, partida em andamento.
    const nova = (await a('GET', `/api/tcg/partidas/${aceite.partida}?desde=-1`)).dados;
    assert.equal(nova.eu, 1);
    assert.equal((await b('GET', `/api/tcg/partidas/${aceite.partida}?desde=-1`)).dados.eu, 0);
    assert.deepEqual(nova.decks, ['legiao', 'turma']);
    assert.equal(nova.status, 'jogando');

    // Depois do tempo da revanche, ninguém mais consegue pedir.
    const { id: id2 } = await comecar(m, c, await jogador(m, 'd', 'Duda'));
    const d2 = (await c('GET', `/api/tcg/partidas/${id2}`)).dados;
    await c('POST', `/api/tcg/partidas/${id2}/jogada`, { jogada: { tipo: 'desistir' }, versao: d2.versao, regras: R.REGRAS_VERSAO });
    m.relogio.agora += Tcg.REVANCHE_DURA + 1000;
    assert.equal((await c('GET', `/api/tcg/partidas/${id2}/revanche`)).dados.expirou, true);
    assert.equal((await c('POST', `/api/tcg/partidas/${id2}/revanche`, {})).status, 409);
});

test('T13. Créditos da Batalha: online 500/150 (uma vez só), NPC 250/50 com limite diário e intervalo', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const creditos = async (quem) => (await quem('GET', '/api/baralho')).dados.carteira.creditos;
    const antesA = await creditos(a);
    const antesB = await creditos(b);

    // Online: Beto desiste, Ana vence.
    const { id } = await comecar(m, a, b);
    const d = (await b('GET', `/api/tcg/partidas/${id}`)).dados;
    await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'desistir' }, versao: d.versao, regras: R.REGRAS_VERSAO });
    assert.equal((await creditos(a)) - antesA, 500);
    assert.equal((await creditos(b)) - antesB, 150);
    // A resposta da partida diz quanto cada um levou; ler de novo não paga de novo.
    assert.equal((await a('GET', `/api/tcg/partidas/${id}?desde=-1`)).dados.creditos, 500);
    assert.equal((await b('GET', `/api/tcg/partidas/${id}?desde=-1`)).dados.creditos, 150);
    assert.equal((await creditos(a)) - antesA, 500);

    // NPC: vitória 250, derrota 50; validação, intervalo mínimo e limite por dia.
    assert.equal((await a('POST', '/api/tcg/npc', { resultado: 'ganhei' })).status, 400);
    assert.equal((await m.navegador()('POST', '/api/tcg/npc', { resultado: 'vitoria' })).status, 401);
    const base = await creditos(a);
    assert.equal((await a('POST', '/api/tcg/npc', { resultado: 'vitoria' })).dados.creditos, 250);
    assert.equal((await a('POST', '/api/tcg/npc', { resultado: 'vitoria' })).dados.motivo, 'rapido');
    m.relogio.agora += Tcg.NPC_INTERVALO + 1000;
    assert.equal((await a('POST', '/api/tcg/npc', { resultado: 'derrota' })).dados.creditos, 50);
    assert.equal((await creditos(a)) - base, 300);
    for (let i = 0; i < Tcg.NPC_PREMIADAS_POR_DIA - 2; i++) {
        m.relogio.agora += Tcg.NPC_INTERVALO + 1000;
        assert.equal((await a('POST', '/api/tcg/npc', { resultado: 'empate' })).dados.creditos, 50);
    }
    m.relogio.agora += Tcg.NPC_INTERVALO + 1000;
    assert.equal((await a('POST', '/api/tcg/npc', { resultado: 'vitoria' })).dados.motivo, 'limite');
});

test('T14. Assistir: lista ao vivo, visão sem as mãos, e nenhuma jogada de quem só assiste', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const c = await jogador(m, 'c', 'Caio');
    assert.equal((await m.navegador()('GET', '/api/tcg/ao-vivo')).status, 401);
    assert.deepEqual((await c('GET', '/api/tcg/ao-vivo')).dados.partidas, []);
    const { id } = await comecar(m, a, b);
    const lista = (await c('GET', '/api/tcg/ao-vivo')).dados.partidas;
    assert.equal(lista.length, 1);
    assert.deepEqual([lista[0].id, lista[0].jogadores], [id, ['Ana', 'Beto']]);

    const v = (await c('GET', `/api/tcg/assistir/${id}?desde=-1`)).dados;
    assert.equal(v.eu, -1);
    assert.equal(typeof v.visao.jogadores[0].mao, 'number', 'mão de Ana escondida');
    assert.equal(typeof v.visao.jogadores[1].mao, 'number', 'mão de Beto escondida');
    assert.equal(typeof v.visao.jogadores[0].deck, 'number');
    assert.equal(v.status, 'jogando');
    // Sem novidade: só a versão.
    assert.equal((await c('GET', `/api/tcg/assistir/${id}?desde=${v.versao}`)).dados.visao, undefined);
    // Quem assiste não joga nem vê a visão de jogador.
    assert.equal((await c('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'desistir' }, versao: v.versao, regras: R.REGRAS_VERSAO })).status, 404);
    assert.equal((await c('GET', `/api/tcg/partidas/${id}`)).status, 404);
    assert.equal((await c('GET', '/api/tcg/assistir/naoexiste')).status, 404);

    // Terminada, sai da lista ao vivo.
    const d = (await b('GET', `/api/tcg/partidas/${id}`)).dados;
    await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'desistir' }, versao: d.versao, regras: R.REGRAS_VERSAO });
    assert.deepEqual((await c('GET', '/api/tcg/ao-vivo')).dados.partidas, []);
    assert.equal((await c('GET', `/api/tcg/assistir/${id}?desde=-1`)).dados.status, 'fim');
});

test('T15. Comentários da partida: jogadores e espectadores, sem limite de ritmo, e tudo some quando a partida termina', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana Silva');
    const b = await jogador(m, 'b', 'Beto');
    const c = await jogador(m, 'c', 'Caio Souza');
    const { id } = await comecar(m, a, b);
    const url = `/api/tcg/partidas/${id}/comentarios`;

    assert.equal((await m.navegador()('GET', url)).status, 401);
    assert.equal((await a('POST', url, { texto: '   ' })).status, 400);
    assert.equal((await a('POST', url, { texto: 'Boa sorte!' })).status, 200);
    assert.equal((await a('POST', url, { texto: 'de novo' })).status, 200, 'sem limite de ritmo');
    for (let i = 0; i < 350; i++) await b('POST', url, { texto: `spam ${i}` });   // nem de quantidade
    const total = (await c('GET', `${url}?desde=0`)).dados.comentarios;
    assert.equal(total.length, 100, 'a leitura entrega 100 por vez');
    await m.db.query('DELETE FROM tcg_comentarios');
    await a('POST', url, { texto: 'Boa sorte!' });
    assert.equal((await c('POST', url, { texto: `torcendo\u0007 pela   Ana ${'x'.repeat(600)}` })).status, 200);
    m.relogio.agora += 2500;
    assert.equal((await b('POST', url, { texto: 'valeu' })).status, 200);

    // Todos leem (quem joga e quem assiste); o lado diz quem é jogador; o texto vem limpo e curto.
    const lidos = (await c('GET', `${url}?desde=0`)).dados;
    assert.equal(lidos.ativa, true);
    assert.deepEqual(lidos.comentarios.map((x) => [x.nome, x.lado, x.meu]), [['Ana', 0, false], ['Caio', null, true], ['Beto', 1, false]]);
    assert.ok(lidos.comentarios[1].texto.startsWith('torcendo pela Ana x'));
    assert.equal(lidos.comentarios[1].texto.length, 500, 'teto técnico de tamanho');
    // Incremental.
    assert.equal((await a('GET', `${url}?desde=${lidos.comentarios[1].n}`)).dados.comentarios.length, 1);

    // A partida acaba: os comentários somem do banco e ninguém comenta mais.
    const d = (await b('GET', `/api/tcg/partidas/${id}`)).dados;
    await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { tipo: 'desistir' }, versao: d.versao, regras: R.REGRAS_VERSAO });
    assert.deepEqual((await c('GET', url)).dados, { ativa: false, comentarios: [] });
    assert.equal((await c('POST', url, { texto: 'e agora?' })).status, 409);
    const [{ n }] = await m.db.query('SELECT COUNT(*) AS n FROM tcg_comentarios');
    assert.equal(Number(n), 0);
});
