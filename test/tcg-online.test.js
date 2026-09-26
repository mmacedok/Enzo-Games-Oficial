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
async function comecar(m, a, b, decks = ['turma', 'legiao']) {
    const sala = await a('POST', '/api/tcg/salas', { deck: decks[0] });
    assert.equal(sala.status, 200, sala.texto);
    const entrou = await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: decks[1] });
    assert.equal(entrou.status, 200, entrou.texto);
    return { id: entrou.dados.id, codigo: sala.dados.codigo, primeira: entrou.dados };
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

test('T3. Sala expira em 15 minutos', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const sala = await a('POST', '/api/tcg/salas', { deck: 'turma' });
    m.relogio.agora += 16 * 60 * 1000;
    assert.equal((await b('POST', `/api/tcg/salas/${sala.dados.codigo}/entrar`, { deck: 'turma' })).status, 404);
});

test('T4. Partida inteira pela API com dois robôs: ninguém vê a mão do outro e o final confere com o motor', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    const { id } = await comecar(m, a, b);
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
            assert.equal(typeof outro.deck, 'number');
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
    ], nomes: ['Ana', 'Beto'] }, lista), estado);
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
    const r = await b('POST', `/api/tcg/partidas/${id}/jogada`, { jogada: { ...prep, jogador: 0 }, versao: 0, regras: R.REGRAS_VERSAO });
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

test('T6. Relógio: estourou o turno passa a vez; 3 estouros seguidos = derrota', async (t) => {
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
    assert.ok(linha.motivo);
});

test('T7. Limite de partidas por jogador por dia', async (t) => {
    const m = montar();
    t.after(() => m.db.close());
    const a = await jogador(m, 'a', 'Ana');
    const b = await jogador(m, 'b', 'Beto');
    for (let i = 0; i < Tcg.PARTIDAS_POR_JOGADOR; i++) {
        const { id } = await comecar(m, a, b);
        const d = (await a('GET', `/api/tcg/partidas/${id}`)).dados;
        assert.equal((await a('POST', `/api/tcg/partidas/${id}/jogada`, {
            jogada: { tipo: 'desistir' }, versao: d.versao, regras: R.REGRAS_VERSAO })).status, 200);
    }
    const r = await a('POST', '/api/tcg/salas', { deck: 'turma' });
    assert.equal(r.status, 429);
    m.relogio.agora += 25 * 3600 * 1000;
    assert.equal((await a('POST', '/api/tcg/salas', { deck: 'turma' })).status, 200);
});
