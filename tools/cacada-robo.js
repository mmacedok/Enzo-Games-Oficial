// ============================================================================
// Robô da "Caçada ao Inominável": procura uma sequência de botões que leva o
// Degustador do início até o Inominável usando a MESMA física do jogo
// (js/cacada-core.js). Se acha, a fase é possível. Usado por
// test/cacada-core.test.js e pelo QA no navegador.
//
// Considera espinhos, serras (paradas e andando), plataformas móveis, molas e
// quedas. Ignora inimigos (dá para pisar ou atirar) e trata a telha que desaba
// como firme por pouco tempo (o robô só pode ficar nela até ela cair).
//
// Uso: node tools/cacada-robo.js [id-da-fase]
// ============================================================================
'use strict';

const C = require('../js/cacada-core.js');

const { CONFIG } = C;
const QUADROS_POR_ACAO = 8; // cada decisão vale 8 passos (1/15 s)

// Ações: direção × pulo (0 solto, 1 aperta, 2 segura) + baixo + cima.
const ACOES = [];
for (const dir of [-1, 0, 1]) for (const pulo of [0, 1, 2]) ACOES.push({ dir, pulo });
ACOES.push({ dir: 0, pulo: 0, baixo: true }, { dir: 0, pulo: 0, cima: true }, { dir: 1, pulo: 0, cima: true }, { dir: -1, pulo: 0, cima: true });

function entradaDe(a, primeiro) {
    return {
        esquerda: a.dir < 0,
        direita: a.dir > 0,
        cima: !!a.cima,
        baixo: !!a.baixo,
        pulo: a.pulo > 0,
        puloPedido: a.pulo === 1 && primeiro,
    };
}

/** Fila de prioridade (menor primeiro). */
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
                const l = i * 2 + 1, r = l + 1;
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

/**
 * Procura um caminho até o Inominável.
 * @returns {{ok: boolean, acoes?: number[], nos: number, tempo?: number}}
 */
function resolver(def, { limite = 600000, de = null } = {}) {
    const nivel = C.carregarFase(def);
    const alvo = { x: nivel.objetivo.x + nivel.objetivo.w / 2, y: nivel.objetivo.y + nivel.objetivo.h / 2 };
    // Telhas: o robô sabe quando pisou em cada uma (estado vai junto no nó).
    const inicio = { j: C.criarJogador(de || nivel.inicio), t: 0, telhas: null, pai: null, acao: -1 };
    const fila = new Fila();
    const vistos = new Set();
    const ciclo = nivel.temDinamicos ? Math.round(CONFIG.periodo * 4) : 1;

    const chave = (n) => {
        const j = n.j;
        const fase = nivel.temDinamicos ? Math.floor(((n.t % CONFIG.periodo) / CONFIG.periodo) * ciclo) : 0;
        return `${Math.round(j.x / 3)},${Math.round(j.y / 3)},${Math.round(j.vx / 40)},${Math.round(j.vy / 60)},${j.estado[0]},${j.noChao ? 1 : 0},${j.parede},${j.trava > 0 ? 1 : 0},${fase},${n.telhas ? n.telhas.size : 0}`;
    };
    const custo = (n) => Math.hypot(n.j.x - alvo.x, (n.j.y - alvo.y) * 1.2) + n.t * 20;

    fila.por(0, inicio);
    let nos = 0;
    while (fila.tamanho && nos < limite) {
        const n = fila.tirar();
        nos++;
        for (let ai = 0; ai < ACOES.length; ai++) {
            const a = ACOES[ai];
            const j = C.clonarJogador(n.j);
            let t = n.t;
            const telhas = n.telhas ? new Map(n.telhas) : new Map();
            const mundo = {
                nivel,
                caidas: new Map([...telhas].map(([k, t0]) => [k, { caiu: t - t0 >= CONFIG.tempoTelha }])),
                pisarTelha(tx, ty) { const k = `${tx},${ty}`; if (!telhas.has(k)) telhas.set(k, t); },
            };
            let morreu = false;
            let venceu = false;
            for (let q = 0; q < QUADROS_POR_ACAO; q++) {
                for (const [k, t0] of telhas) mundo.caidas.set(k, { caiu: t - t0 >= CONFIG.tempoTelha });
                C.passoJogador(mundo, j, entradaDe(a, q === 0), CONFIG.passo, t);
                t += CONFIG.passo;
                if (C.tocouPerigo(nivel, j, t)) { morreu = true; break; }
                if (C.chegou(nivel, j)) { venceu = true; break; }
            }
            if (morreu) continue;
            const filho = { j, t, telhas: telhas.size ? telhas : null, pai: n, acao: ai };
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
    return { ok: false, nos };
}

module.exports = { resolver, ACOES, QUADROS_POR_ACAO, entradaDe };

if (require.main === module) {
    const FASES = require('../js/cacada-fases.js');
    const pedido = process.argv[2];
    for (const def of FASES) {
        if (pedido && def.id !== pedido) continue;
        const inicio = Date.now();
        const r = resolver(def);
        const s = ((Date.now() - inicio) / 1000).toFixed(1);
        console.log(`${def.id} ${def.nome}: ${r.ok ? `OK em ${r.tempo.toFixed(1)} s de jogo` : 'SEM CAMINHO'} (${r.nos} nós, ${s} s)`);
    }
}
