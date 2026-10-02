// Batalha dos Torados: roda partidas robô contra robô e mostra o equilíbrio das cartas.
//
// Uso: node tools/tcg-simular.mjs [partidas=2000] [nivel=normal]
// Cada partida usa dois decks sorteados (válidos) e o robô nos dois lados.
// Mostra: vitória de quem começa, turnos, como as partidas acabam e a taxa de
// vitória de cada carta (dos decks que tinham a carta). Carta muito acima ou
// muito abaixo de 50% está forte ou fraca demais.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Baralho = require('../js/baralho-dados.js');
const R = require('../js/tcg-regras.js');
const Robo = require('../js/tcg-robo.js');

const PARTIDAS = Number(process.argv[2]) || 2000;
const NIVEL = process.argv[3] || 'normal';

let semente = 12345;
function aleatorio() {
    semente = (semente + 0x6D2B79F5) >>> 0;
    let t = semente;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function deckAleatorio() {
    for (;;) {
        const deck = [];
        const contagem = {};
        while (deck.length < R.TAMANHO_DECK) {
            const c = Baralho.CARTAS[Math.floor(aleatorio() * Baralho.CARTAS.length)];
            const max = c.raridade === 'lendario' ? R.MAX_COPIAS_LENDARIO : R.MAX_COPIAS;
            if ((contagem[c.id] || 0) >= max) continue;
            contagem[c.id] = (contagem[c.id] || 0) + 1;
            deck.push(c.id);
        }
        if (!R.validarDeck(deck).length) return deck;
    }
}

export function jogarPartida(decks, semente, niveis = [NIVEL, NIVEL], onJogada = null) {
    let estado = R.criarPartida({ semente, decks, banimento: process.env.BANIR !== "0" });
    let passos = 0;
    while (estado.fase !== 'fim') {
        const j = Robo.quemJoga(estado);
        const jogada = Robo.escolherJogada(estado, j, { nivel: niveis[j], aleatorio });
        if (onJogada) onJogada(estado, j, jogada);
        estado = R.aplicar(estado, jogada).estado;
        if (++passos > 5000) throw new Error(`partida travada (semente ${semente})`);
    }
    return estado;
}

const porCarta = {};
const motivos = {};
let vitoriasPrimeiro = 0;
let empates = 0;
let turnos = 0;
let totalAtaques = 0;
let ataquesJogador = 0;
let vidaVencedorTotal = 0;
let partidasComVencedor = 0;
const recargaUsos = {
    'Macarronada a 300%': 0,
    'Vírgula-rangue': 0,
    'Bala Dourada': 0,
    'Ban de 7 Dias': 0,
};
const inicio = Date.now();

for (let n = 0; n < PARTIDAS; n++) {
    const decks = [deckAleatorio(), deckAleatorio()];
    const fim = jogarPartida(decks, `sim-${n}`, [NIVEL, NIVEL], (estado, j, jogada) => {
        if (jogada.tipo === 'atacar') {
            totalAtaques++;
            if (jogada.alvo === 'jogador' || jogada.alvo === R.JOGADOR) {
                ataquesJogador++;
            }
            const ativo = estado.jogadores[j].ativo;
            if (ativo) {
                const atk = R.combate(ativo.id)?.ataques[jogada.ataque];
                if (atk && recargaUsos[atk.nome] !== undefined) {
                    recargaUsos[atk.nome]++;
                }
            }
        }
    });
    motivos[fim.motivo] = (motivos[fim.motivo] || 0) + 1;
    turnos += fim.turno;
    if (fim.vencedor === 'empate') { empates++; continue; }
    if (fim.vencedor === fim.primeiro) vitoriasPrimeiro++;
    partidasComVencedor++;
    vidaVencedorTotal += fim.jogadores[fim.vencedor].vida;
    decks.forEach((deck, j) => {
        for (const id of new Set(deck)) {
            porCarta[id] ||= { partidas: 0, vitorias: 0 };
            porCarta[id].partidas++;
            if (fim.vencedor === j) porCarta[id].vitorias++;
        }
    });
}

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');
console.log(`${PARTIDAS} partidas (robô ${NIVEL}) em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
console.log(`Quem começa vence: ${pct(vitoriasPrimeiro, PARTIDAS - empates)} · empates: ${empates} · turnos em média: ${(turnos / PARTIDAS).toFixed(1)}`);
console.log('Como acabam:', Object.entries(motivos).map(([m, q]) => `${m} ${pct(q, PARTIDAS)}`).join(' · '));
console.log('\nVitória por carta (decks que tinham a carta):');
Object.entries(porCarta)
    .map(([id, s]) => ({ id, taxa: s.vitorias / s.partidas, s }))
    .sort((a, b) => b.taxa - a.taxa)
    .forEach(({ id, taxa, s }) => {
        const carta = Baralho.carta(id);
        const barra = '#'.repeat(Math.round(taxa * 40));
        console.log(`${(taxa * 100).toFixed(1).padStart(5)}%  ${barra.padEnd(40)} ${carta.nome} (${carta.raridade}, ${s.partidas})`);
    });

console.log(`\nAtaques no jogador: ${pct(ataquesJogador, totalAtaques)} (${ataquesJogador}/${totalAtaques})`);
console.log(`Vida média do vencedor no fim: ${partidasComVencedor ? (vidaVencedorTotal / partidasComVencedor).toFixed(0) : '-'}`);
console.log('Usos de ataques com recarga (por partida):');
for (const [nome, qtd] of Object.entries(recargaUsos)) {
    console.log(`  ${nome}: ${(qtd / PARTIDAS).toFixed(2)} por partida (${qtd} total)`);
}

