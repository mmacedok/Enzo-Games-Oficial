// ============================================================================
// Robô da "Caçada ao Inominável": procura uma sequência de botões que leva o
// Degustador de um ponto a outro do mundo usando a MESMA física do jogo
// (js/cacada-core.js) e só as habilidades informadas. Se acha, o caminho
// existe. Usado por test/cacada-robo.test.js.
//
// Considera espinhos, chorume, serras (paradas e andando), plataformas móveis,
// molas, telhas que desabam, portões fechados, a tampa do bueiro (opção `loja`),
// grades (quebra com a Queda de Bigorna), vidro (quebra com o Buzz!) e vento
// (sobe planando com a Pipa). Ignora inimigos (dá para bater neles) e não
// quebra paredes rachadas (segredos são opcionais).
//
// Uso: node tools/cacada-robo.js   (confere as etapas de ETAPAS)
// ============================================================================
'use strict';

const C = require('../js/cacada-core.js');

const { CONFIG } = C;
const T = CONFIG.tile;
const QUADROS_POR_ACAO = 8; // cada decisão vale 8 passos (1/15 s)

// Ações: direção × pulo (0 solto, 1 aperta, 2 segura) + baixo + cima + dash.
const ACOES = [];
for (const dir of [-1, 0, 1]) for (const pulo of [0, 1, 2]) ACOES.push({ dir, pulo });
ACOES.push({ dir: 0, pulo: 0, baixo: true }, { dir: 0, pulo: 0, cima: true }, { dir: 1, pulo: 0, cima: true }, { dir: -1, pulo: 0, cima: true });
ACOES.push({ dir: -1, pulo: 2, dash: true }, { dir: 1, pulo: 2, dash: true });
// ↓ + dash: no ar mergulha (Queda de Bigorna); no chão carrega o Buzz! (solta com outra ação).
ACOES.push({ dir: 0, pulo: 0, baixo: true, dash: true, especial: true });

function entradaDe(a, primeiro) {
    return {
        esquerda: a.dir < 0,
        direita: a.dir > 0,
        cima: !!a.cima,
        baixo: !!a.baixo,
        pulo: a.pulo > 0,
        puloPedido: a.pulo === 1 && primeiro,
        dash: !!a.dash,
        dashPedido: !!a.dash && primeiro,
    };
}

class Fila {
    constructor() { this.itens = []; }
    get tamanho() { return this.itens.length; }
    por(prio, valor) {
        const a = this.itens;
        a.push([prio, valor]);
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p][0] <= a[i][0]) break;
            [a[p], a[i]] = [a[i], a[p]];
            i = p;
        }
    }
    tirar() {
        const a = this.itens;
        const topo = a[0];
        const fim = a.pop();
        if (a.length) {
            a[0] = fim;
            let i = 0;
            for (;;) {
                const l = i * 2 + 1;
                const r = l + 1;
                let m = i;
                if (l < a.length && a[l][0] < a[m][0]) m = l;
                if (r < a.length && a[r][0] < a[m][0]) m = r;
                if (m === i) break;
                [a[m], a[i]] = [a[i], a[m]];
                i = m;
            }
        }
        return topo[1];
    }
}

/** Onde o Degustador fica em pé sobre um item, banco ou chefe (por id). */
function ponto(nivel, id) {
    if (id === 'inicio') return { x: nivel.inicio.x, y: nivel.inicio.y };
    const coisa = [...nivel.itens, ...nivel.bancos].find((i) => i.id === id);
    if (coisa) return { x: coisa.x + coisa.w / 2 - CONFIG.jogadorL / 2, y: coisa.y + coisa.h - CONFIG.jogadorA };
    const sala = nivel.salas.find((s) => s.chefeDef && s.chefeDef.id === id);
    if (sala) {
        const d = sala.chefeDef;
        return { x: d.x + 10, y: d.chaoY - CONFIG.jogadorA };
    }
    throw new Error(`Ponto desconhecido: ${id}`);
}

/** Retângulo de chegada para um id (item, banco, chefe) ou uma sala ("sala:id"). */
function alvo(nivel, id) {
    if (id.startsWith('sala:')) {
        const s = nivel.salaPorId.get(id.slice(5));
        if (!s) throw new Error(`Sala desconhecida: ${id}`);
        return { x: s.px.x + T, y: s.px.y + T, w: s.px.w - 2 * T, h: s.px.h - 2 * T };
    }
    const p = ponto(nivel, id);
    return { x: p.x - 4, y: p.y - 4, w: CONFIG.jogadorL + 8, h: CONFIG.jogadorA + 8 };
}

/**
 * Distância (em tiles) de cada célula até o alvo, andando pelo vazio e sem
 * passar por espinhos. Com `gravidade`, só deixa subir para células até
 * `alcance` tiles acima de um chão (ou encostadas numa parede, com as Luvas).
 * Só guia a busca; não precisa ser exata.
 */
function campoDeDistancia(nivel, mundo, r, habilidades) {
    const W = nivel.largura;
    const H = nivel.altura;
    const vazio = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !C.solido(mundo, x, y);
    const apoio = (x, y) => !vazio(x, y) || C.tileEm(nivel, x, y) === '=';
    // Altura de cada célula vazia acima do chão mais próximo (e se o chão é mola).
    const altura = new Int16Array(W * H).fill(999);
    for (let x = 0; x < W; x++) {
        let h = 999;
        let mola = false;
        for (let y = H - 1; y >= 0; y--) {
            if (!vazio(x, y) || C.tileEm(nivel, x, y) === '=') {
                h = 0;
                mola = C.tileEm(nivel, x, y) === 'T';
                if (!vazio(x, y)) continue;
            } else {
                h = h + 1;
            }
            altura[y * W + x] = mola ? Math.max(0, h - 6) : h;
        }
    }
    for (const p of nivel.plataformas) {
        for (let x = Math.floor((p.x0 - CONFIG.amplitude) / T); x <= Math.floor((p.x0 + p.w + CONFIG.amplitude) / T); x++) {
            for (let k = 1; k <= 6; k++) {
                const y = Math.floor(p.y / T) - k;
                if (x >= 0 && y >= 0 && x < W) altura[y * W + x] = Math.min(altura[y * W + x], k);
            }
        }
    }
    const parede = habilidades.has('parede');
    const alcance = habilidades.has('pulo2') ? 8 : 5;
    const comGravidade = !!habilidades.gravidade;
    const pipa = habilidades.has('pipa');
    const podeSubirPara = (x, y) => !comGravidade || altura[y * W + x] <= alcance || (parede && (apoio(x - 1, y) || apoio(x + 1, y)))
        || (pipa && C.tileEm(nivel, x, y) === 'w');
    const dist = new Int32Array(W * H).fill(-1);
    const fila = [];
    for (let ty = Math.floor(r.y / T); ty <= Math.floor((r.y + r.h) / T); ty++) {
        for (let tx = Math.floor(r.x / T); tx <= Math.floor((r.x + r.w) / T); tx++) {
            if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
            dist[ty * W + tx] = 0;
            fila.push(ty * W + tx);
        }
    }
    for (let i = 0; i < fila.length; i++) {
        const k = fila[i];
        const x = k % W;
        const y = (k - x) / W;
        // Quem pode chegar em (x, y)? Vizinhos de lado, de cima (caindo) e de baixo (subindo, se der).
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
            const nx = x + ox;
            const ny = y + oy;
            if (!vazio(nx, ny)) continue;
            const tn = C.tileEm(nivel, nx, ny);
            if (tn === '^' || tn === 'v' || tn === '~') continue;
            const nk = ny * W + nx;
            if (dist[nk] !== -1) continue;
            if (oy === 1 && !podeSubirPara(x, y)) continue; // de baixo para cima
            dist[nk] = dist[k] + 1;
            fila.push(nk);
        }
    }
    return dist;
}

/**
 * Procura um caminho de `de` até `ate`.
 * opcoes: habilidades (lista), abertos (salas com portão aberto), salas (lista
 * de ids permitidos: fora delas o robô não vai), limite de nós.
 * @returns {{ok: boolean, acoes?: number[], nos: number, tempo?: number, esgotou?: boolean}}
 */
function resolver(def, de, ate, opcoes = {}) {
    const nivel = opcoes.nivel || C.carregarMundo(def);
    const habilidades = new Set(opcoes.habilidades || []);
    const permitidas = opcoes.salas ? new Set(opcoes.salas.map((id) => nivel.salaPorId.get(id).idx)) : null;
    const base = { nivel, habilidades, abertos: new Set(opcoes.abertos || []), quebrados: new Set(), arena: null, loja: new Set(opcoes.loja || []) };
    const destino = typeof ate === 'string' ? alvo(nivel, ate) : ate;
    const partida = typeof de === 'string' ? ponto(nivel, de) : de;
    // O campo que guia a busca já trata grade/vidro que dá para quebrar como passagem.
    const quebraveis = new Set();
    for (const g of nivel.gruposB.values()) {
        if ((g.letra === 'G' && habilidades.has('bigorna')) || (g.letra === 'Y' && habilidades.has('buzz'))) quebraveis.add(g.id);
    }
    const campo = campoDeDistancia(nivel, { ...base, quebrados: quebraveis }, destino, Object.assign(new Set(habilidades), { gravidade: !!opcoes.gravidade }));
    const W = nivel.largura;
    const limite = opcoes.limite || 1500000;
    const ciclo = Math.round(CONFIG.periodo * 4);
    // Carga do Buzz! contada em ações (cada uma soma 1/15 s): arredondar em décimos juntava
    // duas ações seguidas na mesma chave e a carga nunca chegava ao ponto de soltar.
    const TEMPO_ACAO = QUADROS_POR_ACAO * CONFIG.passo;
    const CARGA_MAX = Math.ceil(CONFIG.buzzCarga / TEMPO_ACAO) + 1; // +1: a soma em float pode ficar um tiquinho abaixo

    const j0 = C.criarJogador(partida);
    const inicio = { j: j0, t: 0, telhas: null, quebrados: null, pai: null, acao: -1 };
    const fila = new Fila();
    const vistos = new Set();
    const chave = (n) => {
        const j = n.j;
        const sala = nivel.salas[C.salaEm(nivel, j.x + 7, j.y + 13)];
        const fase = sala && sala.temDinamicos ? Math.floor(((n.t % CONFIG.periodo) / CONFIG.periodo) * ciclo) : 0;
        return `${Math.round(j.x / 3)},${Math.round(j.y / 3)},${Math.round(j.vx / 40)},${Math.round(j.vy / 60)},${j.estado[0]}${j.estado[1]},${j.noChao ? 1 : 0},${j.parede},${j.trava > 0 ? 1 : 0},${j.dashDisponivel ? 1 : 0}${j.puloDuploUsado ? 1 : 0}${j.dashRecarga > 0 ? 1 : 0},${fase},${n.telhas ? n.telhas.size : 0},${n.quebrados ? n.quebrados.size : 0},${Math.min(CARGA_MAX, Math.round(j.carga / TEMPO_ACAO))}${j.planando ? 1 : 0}${j.atordoado > 0 ? 1 : 0}`;
    };
    const custo = (n) => {
        const j = n.j;
        const tx = Math.floor((j.x + CONFIG.jogadorL / 2) / T);
        const ty = Math.floor((j.y + CONFIG.jogadorA / 2) / T);
        const d = tx >= 0 && ty >= 0 && tx < W && ty < nivel.altura ? campo[ty * W + tx] : -1;
        return (d < 0 ? 9999 : d) * T + n.t * 20;
    };
    const chegou = (j) => C.colide({ x: j.x, y: j.y, w: CONFIG.jogadorL, h: CONFIG.jogadorA }, destino);

    fila.por(0, inicio);
    let nos = 0;
    while (fila.tamanho && nos < limite) {
        const n = fila.tirar();
        nos++;
        for (let ai = 0; ai < ACOES.length; ai++) {
            const a = ACOES[ai];
            if (a.especial ? !habilidades.has('bigorna') && !habilidades.has('buzz') : a.dash && !habilidades.has('dash')) continue;
            const j = C.clonarJogador(n.j);
            let t = n.t;
            const telhas = n.telhas ? new Map(n.telhas) : new Map();
            const quebrados = n.quebrados ? new Set(n.quebrados) : new Set();
            const mundo = {
                ...base,
                quebrados,
                caidas: new Map(),
                pisarTelha(tx, ty) { const k = `${tx},${ty}`; if (!telhas.has(k)) telhas.set(k, t); },
                quebrar(id) { quebrados.add(id); },
            };
            let morreu = false;
            let venceu = false;
            for (let q = 0; q < QUADROS_POR_ACAO; q++) {
                for (const [k, t0] of telhas) mundo.caidas.set(k, { caiu: t - t0 >= CONFIG.tempoTelha });
                C.passoJogador(mundo, j, entradaDe(a, q === 0), CONFIG.passo, t);
                t += CONFIG.passo;
                if (C.tocouPerigo(nivel, j, t)) { morreu = true; break; }
                if (chegou(j)) { venceu = true; break; }
            }
            if (morreu) continue;
            if (permitidas && !permitidas.has(C.salaEm(nivel, j.x + CONFIG.jogadorL / 2, j.y + CONFIG.jogadorA / 2))) continue;
            const filho = { j, t, telhas: telhas.size ? telhas : null, quebrados: quebrados.size ? quebrados : null, pai: n, acao: ai };
            if (venceu) {
                const acoes = [];
                for (let p = filho; p.pai; p = p.pai) acoes.push(p.acao);
                acoes.reverse();
                return { ok: true, acoes, nos, tempo: t };
            }
            const k = chave(filho);
            if (vistos.has(k)) continue;
            vistos.add(k);
            fila.por(custo(filho), filho);
        }
    }
    return { ok: false, nos, esgotou: fila.tamanho === 0 };
}

/**
 * Etapas da progressão: cada uma diz de onde a onde o jogador precisa
 * conseguir ir com as habilidades que já tem naquele momento.
 */
const ETAPAS = [
    { nome: 'Esconderijo → Rajada (Torre da Antena)', de: 'inicio', ate: 'antena:habilidade1', habilidades: [] },
    { nome: 'Rajada → Arena do Capanga-Mor', de: 'antena:habilidade1', ate: 'arena:chefe', habilidades: ['rajada'] },
    { nome: 'Capa Janky → Luvas de Fita (Poço)', de: 'arena:chefe', ate: 'poco:habilidade1', habilidades: ['rajada', 'dash'] },
    { nome: 'Luvas → Parênteses', de: 'poco:habilidade1', ate: 'parenteses:habilidade1', habilidades: ['rajada', 'dash', 'parede'] },
    { nome: 'Parênteses → Covil (chefe final)', de: 'parenteses:habilidade1', ate: 'covil:chefe', habilidades: ['rajada', 'dash', 'parede', 'pulo2'] },
    // Expansão (a Chave do Bueiro sai na loja do ItaloLOL depois do Capanga-Mor).
    { nome: 'Beco → Trono do Ratão (Esgoto, com a Chave)', de: 'beco:banco1', ate: 'trono:chefe', habilidades: ['rajada', 'dash'], loja: ['chave'] },
    { nome: 'Queda de Bigorna → volta do Esgoto ao Beco', de: 'trono:chefe', ate: 'beco:banco1', habilidades: ['rajada', 'dash', 'bigorna'], loja: ['chave'] },
    { nome: 'Queda de Bigorna → Palco do Coach (Feira)', de: 'esconderijo:banco1', ate: 'palco:chefe', habilidades: ['rajada', 'dash', 'bigorna'] },
    { nome: 'Pipa → volta da Feira aos Telhados', de: 'palco:chefe', ate: 'sala:telhados', habilidades: ['rajada', 'dash', 'bigorna', 'pipa'] },
    { nome: 'Pipa → Salão da Scrapeira (Orkut)', de: 'parenteses:habilidade1', ate: 'salao:chefe', habilidades: ['rajada', 'dash', 'parede', 'pulo2', 'bigorna', 'pipa'] },
    { nome: 'Buzz! → volta do Salão às Comunidades', de: 'salao:chefe', ate: 'comunidades:banco1', habilidades: ['rajada', 'dash', 'parede', 'pulo2', 'bigorna', 'pipa', 'buzz'] },
    { nome: 'Comunidades → Parênteses (vento do Portal)', de: 'comunidades:banco1', ate: 'sala:parenteses', habilidades: ['rajada', 'dash', 'parede', 'pulo2', 'bigorna', 'pipa', 'buzz'] },
    { nome: 'Buzz! → Servidor Esquecido (chefe secreto)', de: 'alto:banco1', ate: 'servidor:chefe', habilidades: ['rajada', 'dash', 'parede', 'pulo2', 'bigorna', 'pipa', 'buzz'] },
];

/** Portões de habilidade: sem ela, não passa (a busca esgota sem achar). */
const BLOQUEIOS = [
    { nome: 'sem dash não atravessa o vão do Beco', de: 'beco:banco1', ate: 'sala:esteira', habilidades: ['rajada'], salas: ['beco', 'esteira'] },
    { nome: 'sem Luvas não sobe a chaminé da Fábrica', de: 'fabrica:banco1', ate: 'sala:chamine2', habilidades: ['rajada', 'dash'], salas: ['fabrica', 'chamine2'] },
    { nome: 'sem Parênteses não atravessa o Telhado Alto', de: 'alto:banco1', ate: 'sala:covil', habilidades: ['rajada', 'dash', 'parede'], salas: ['alto', 'covil'] },
    { nome: 'sem a Chave do Bueiro não entra no Esgoto', de: 'beco:banco1', ate: 'sala:boca', habilidades: ['rajada', 'dash'], salas: ['beco', 'boca'] },
    { nome: 'sem Queda de Bigorna não entra na Feira', de: 'esconderijo:banco1', ate: 'sala:feira', habilidades: ['rajada', 'dash', 'parede', 'pulo2'], salas: ['esconderijo', 'telhados', 'feira'] },
    { nome: 'sem Pipa não atravessa o Portal de Recados', de: 'parenteses:habilidade1', ate: 'sala:comunidades', habilidades: ['rajada', 'dash', 'parede', 'pulo2', 'bigorna'], salas: ['parenteses', 'portal', 'comunidades'] },
    { nome: 'sem Buzz! não entra no Servidor Esquecido', de: 'alto:banco1', ate: 'sala:servidor', habilidades: ['rajada', 'dash', 'parede', 'pulo2', 'bigorna', 'pipa'], salas: ['alto', 'covil', 'servidor'] },
];

module.exports = { resolver, ponto, alvo, ACOES, QUADROS_POR_ACAO, entradaDe, ETAPAS, BLOQUEIOS };

if (require.main === module) {
    const M = require('../js/cacada-mundo.js');
    const nivel = C.carregarMundo(M);
    for (const e of ETAPAS) {
        const inicio = Date.now();
        const r = resolver(M, e.de, e.ate, { ...e, nivel });
        console.log(`${r.ok ? 'OK ' : 'FALHOU'} ${e.nome}: ${r.ok ? `${r.tempo.toFixed(1)} s de jogo` : 'sem caminho'} (${r.nos} nós, ${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
    }
    for (const b of BLOQUEIOS) {
        const inicio = Date.now();
        const r = resolver(M, b.de, b.ate, { ...b, nivel });
        const certo = !r.ok && r.esgotou;
        console.log(`${certo ? 'OK ' : 'FALHOU'} bloqueio: ${b.nome} (${r.ok ? 'PASSOU!' : r.esgotou ? 'esgotou' : 'limite'}; ${r.nos} nós, ${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
    }
}
