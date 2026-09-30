// ============================================================================
// Batalha dos Torados — Calibragem da regra nova (vida do jogador)
//
// Testa uma grade de combinações de VIDA_INICIAL e DANO_NOCAUTE rodando 2.000
// partidas por combinação para verificar as metas de equilíbrio do plano
// (docs/PLANO-VIDA-JOGADOR.md seção 5).
//
// Uso: node tools/tcg-calibrar.mjs
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PARTIDAS = 2000;
const NIVEL = 'normal';

// Verifica suporte a robô difícil
const roboBase = require('../js/tcg-robo.js');
// Nível 'dificil' não está implementado em js/tcg-robo.js (cai no fallback de 'normal')

const VIDAS = [5000, 6000, 7000, 8000];
const MULT_NOCAUTE = [
    { rotulo: '×0', dano: { comum: 0, raro: 0, epico: 0, lendario: 0 } },
    { rotulo: '×1', dano: { comum: 500, raro: 750, epico: 1000, lendario: 1500 } },
    { rotulo: '×1,5', dano: { comum: 750, raro: 1125, epico: 1500, lendario: 2250 } },
];

const METAS = {
    turnosMin: 16,
    turnosMax: 22,
    primeiroMin: 48.0,
    primeiroMax: 55.0,
    limiteMax: 3.0,
    golpesJogadorMin: 35.0,
    golpesJogadorMax: 70.0,
    cartaMin: 40.0,
    cartaMax: 60.0,
};

function PRNG(sementeInicial = 12345) {
    let s = sementeInicial;
    return function aleatorio() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function montarDeckAleatorio(Baralho, R, aleatorio) {
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

function simularCombinacao(pastaTemp, vidaInicial, danoNocaute, rotuloNocaute) {
    // Carrega módulos da pasta temporária com require limpo
    const Baralho = require(path.join(pastaTemp, 'baralho-dados.js'));
    const R = require(path.join(pastaTemp, 'tcg-regras.js'));
    const Robo = require(path.join(pastaTemp, 'tcg-robo.js'));

    const aleatorio = PRNG(12345);

    let vitoriasPrimeiro = 0;
    let empates = 0;
    let turnosTotais = 0;
    let totalAtaques = 0;
    let ataquesJogador = 0;
    let vidaVencedorTotal = 0;
    let partidasComVencedor = 0;
    const motivos = {};
    const porCarta = {};
    const recargaUsos = {
        'Macarronada a 300%': 0,
        'Vírgula-rangue': 0,
        'Bala Dourada': 0,
        'Ban de 7 Dias': 0,
    };

    const inicio = Date.now();

    for (let n = 0; n < PARTIDAS; n++) {
        const decks = [
            montarDeckAleatorio(Baralho, R, aleatorio),
            montarDeckAleatorio(Baralho, R, aleatorio),
        ];

        let estado = R.criarPartida({ semente: `sim-${n}`, decks });
        let passos = 0;

        while (estado.fase !== 'fim') {
            const j = Robo.quemJoga(estado);
            const jogada = Robo.escolherJogada(estado, j, { nivel: NIVEL, aleatorio });

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

            estado = R.aplicar(estado, jogada).estado;
            if (++passos > 5000) throw new Error(`partida travada (sim-${n})`);
        }

        motivos[estado.motivo] = (motivos[estado.motivo] || 0) + 1;
        turnosTotais += estado.turno;

        if (estado.vencedor === 'empate') {
            empates++;
        } else {
            if (estado.vencedor === estado.primeiro) vitoriasPrimeiro++;
            partidasComVencedor++;
            vidaVencedorTotal += estado.jogadores[estado.vencedor].vida;
        }

        decks.forEach((deck, j) => {
            for (const id of new Set(deck)) {
                porCarta[id] ||= { partidas: 0, vitorias: 0 };
                porCarta[id].partidas++;
                if (estado.vencedor === j) porCarta[id].vitorias++;
            }
        });
    }

    const duracaoS = (Date.now() - inicio) / 1000;
    const turnosMedio = turnosTotais / PARTIDAS;
    const pctPrimeiro = (vitoriasPrimeiro / (PARTIDAS - empates)) * 100;
    const pctLimite = ((motivos.limiteTurnos || 0) / PARTIDAS) * 100;
    const pctVida = ((motivos.vida || 0) / PARTIDAS) * 100;
    const pctEmpate = (empates / PARTIDAS) * 100;
    const pctGolpesJogador = totalAtaques ? (ataquesJogador / totalAtaques) * 100 : 0;
    const vidaVencedorMedio = partidasComVencedor ? vidaVencedorTotal / partidasComVencedor : 0;

    const cartasRanking = Object.entries(porCarta)
        .map(([id, s]) => ({ id, nome: Baralho.carta(id)?.nome || id, taxa: (s.vitorias / s.partidas) * 100, partidas: s.partidas }))
        .sort((a, b) => b.taxa - a.taxa);

    const cartasFora = cartasRanking.filter((c) => c.taxa < METAS.cartaMin || c.taxa > METAS.cartaMax);

    // Avaliação de metas
    const metasCheck = {
        turnos: turnosMedio >= METAS.turnosMin && turnosMedio <= METAS.turnosMax,
        primeiro: pctPrimeiro >= METAS.primeiroMin && pctPrimeiro <= METAS.primeiroMax,
        limite: pctLimite < METAS.limiteMax,
        golpesJogador: pctGolpesJogador >= METAS.golpesJogadorMin && pctGolpesJogador <= METAS.golpesJogadorMax,
        cartas: cartasFora.length === 0,
    };

    const pontuacaoMetas = Object.values(metasCheck).filter(Boolean).length;

    return {
        vidaInicial,
        rotuloNocaute,
        danoNocaute,
        duracaoS,
        turnosMedio,
        pctPrimeiro,
        motivos: { vida: pctVida, limite: pctLimite, empate: pctEmpate },
        pctGolpesJogador,
        vidaVencedorMedio,
        recargaUsos,
        cartasRanking,
        cartasFora,
        metasCheck,
        pontuacaoMetas,
    };
}

async function main() {
    console.log(`=== Batalha dos Torados — Calibragem de Regras (Grade de ${VIDAS.length * MULT_NOCAUTE.length} combinações) ===`);
    console.log(`Partidas por combinação: ${PARTIDAS} | Robô: ${NIVEL} | Metas: 16-22 turnos, 48-55% 1º, <3% limite, 35-70% rosto, 40-60% cartas\n`);

    const raizJs = path.resolve('js');
    const pastaTempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'tcg-grade-'));

    const resultados = [];

    try {
        for (const vida of VIDAS) {
            for (const nocaute of MULT_NOCAUTE) {
                const idCombo = `v${vida}_${nocaute.rotulo.replace('×', 'x').replace(',', '_')}`;
                const pastaCombo = path.join(pastaTempBase, idCombo);
                fs.mkdirSync(pastaCombo, { recursive: true });

                // Copia arquivos js necessários
                for (const arq of ['baralho-dados.js', 'tcg-cartas.js', 'tcg-regras.js', 'tcg-robo.js']) {
                    fs.copyFileSync(path.join(raizJs, arq), path.join(pastaCombo, arq));
                }

                // Modifica tcg-regras.js
                const regrasPath = path.join(pastaCombo, 'tcg-regras.js');
                let conteudo = fs.readFileSync(regrasPath, 'utf8');

                conteudo = conteudo.replace(
                    /const VIDA_INICIAL = \d+;/,
                    `const VIDA_INICIAL = ${vida};`
                );
                conteudo = conteudo.replace(
                    /const DANO_NOCAUTE = \{[^}]+\};/,
                    `const DANO_NOCAUTE = { comum: ${nocaute.dano.comum}, raro: ${nocaute.dano.raro}, epico: ${nocaute.dano.epico}, lendario: ${nocaute.dano.lendario} };`
                );
                fs.writeFileSync(regrasPath, conteudo, 'utf8');

                process.stdout.write(`Simulando Vida ${vida} | Nocaute ${nocaute.rotulo.padEnd(4)} ... `);
                const res = simularCombinacao(pastaCombo, vida, nocaute.dano, nocaute.rotulo);
                resultados.push(res);
                console.log(`concluído em ${res.duracaoS.toFixed(1)}s (Turnos: ${res.turnosMedio.toFixed(1)}, 1º: ${res.pctPrimeiro.toFixed(1)}%, Rosto: ${res.pctGolpesJogador.toFixed(1)}%, Metas: ${res.pontuacaoMetas}/5)`);
            }
        }
    } finally {
        fs.rmSync(pastaTempBase, { recursive: true, force: true });
    }

    // Tabela comparativa
    console.log('\n' + '='.repeat(110));
    console.log('GRADE COMPLETA DE CALIBRAGEM (2.000 partidas cada, robô normal)');
    console.log('='.repeat(110));
    console.log(
        'Vida'.padEnd(6) +
        'Nocaute'.padEnd(9) +
        'Turnos'.padEnd(8) +
        '1º Vence'.padEnd(10) +
        'Fim Vida'.padEnd(10) +
        'Limite'.padEnd(8) +
        '% Rosto'.padEnd(9) +
        'Vida Venc'.padEnd(11) +
        'Metas OK'.padEnd(10) +
        'Status'
    );
    console.log('-'.repeat(110));

    for (const r of resultados) {
        const metasStr = `${r.pontuacaoMetas}/5`;
        const status = r.pontuacaoMetas === 5 ? '★ PERFEITA' : r.pontuacaoMetas === 4 ? '✔ BOA' : '✖';
        console.log(
            String(r.vidaInicial).padEnd(6) +
            r.rotuloNocaute.padEnd(9) +
            r.turnosMedio.toFixed(1).padEnd(8) +
            `${r.pctPrimeiro.toFixed(1)}%`.padEnd(10) +
            `${r.motivos.vida.toFixed(1)}%`.padEnd(10) +
            `${r.motivos.limite.toFixed(1)}%`.padEnd(8) +
            `${r.pctGolpesJogador.toFixed(1)}%`.padEnd(9) +
            Math.round(r.vidaVencedorMedio).toString().padEnd(11) +
            metasStr.padEnd(10) +
            status
        );
    }
    console.log('='.repeat(110));

    // Usos de recarga
    console.log('\nUSO MÉDIO DOS ATAQUES COM RECARGA (vezes por partida):');
    console.log('Vida'.padEnd(6) + 'Nocaute'.padEnd(9) + 'Macarronada 300%'.padEnd(18) + 'Vírgula-rangue'.padEnd(16) + 'Bala Dourada'.padEnd(15) + 'Ban de 7 Dias');
    console.log('-'.repeat(80));
    for (const r of resultados) {
        const m = (r.recargaUsos['Macarronada a 300%'] / PARTIDAS).toFixed(2);
        const v = (r.recargaUsos['Vírgula-rangue'] / PARTIDAS).toFixed(2);
        const b = (r.recargaUsos['Bala Dourada'] / PARTIDAS).toFixed(2);
        const d = (r.recargaUsos['Ban de 7 Dias'] / PARTIDAS).toFixed(2);
        console.log(String(r.vidaInicial).padEnd(6) + r.rotuloNocaute.padEnd(9) + m.padEnd(18) + v.padEnd(16) + b.padEnd(15) + d);
    }

    // Escolha da melhor combinação
    // Ordena por pontuação de metas decrescente e proximidade do centro das metas de turnos (19) e 1º (51.5%)
    const pontuadas = [...resultados].sort((a, b) => {
        if (b.pontuacaoMetas !== a.pontuacaoMetas) return b.pontuacaoMetas - a.pontuacaoMetas;
        // Distância ao centro ideal de turnos (19) e primeiro (51.5%)
        const distA = Math.abs(a.turnosMedio - 19) + Math.abs(a.pctPrimeiro - 51.5) + Math.abs(a.pctGolpesJogador - 52.5) * 0.2;
        const distB = Math.abs(b.turnosMedio - 19) + Math.abs(b.pctPrimeiro - 51.5) + Math.abs(b.pctGolpesJogador - 52.5) * 0.2;
        return distA - distB;
    });

    const melhor = pontuadas[0];

    console.log('\n' + '*'.repeat(80));
    console.log(`MELHOR COMBINAÇÃO RECOMENDADA: Vida ${melhor.vidaInicial} com Nocaute ${melhor.rotuloNocaute}`);
    console.log('*'.repeat(80));
    console.log(`- Turnos em média: ${melhor.turnosMedio.toFixed(1)} (Meta: 16 a 22) -> ${melhor.metasCheck.turnos ? 'OK' : 'FORA'}`);
    console.log(`- Vitória de quem começa: ${melhor.pctPrimeiro.toFixed(1)}% (Meta: 48% a 55%) -> ${melhor.metasCheck.primeiro ? 'OK' : 'FORA'}`);
    console.log(`- Limite de turnos: ${melhor.motivos.limite.toFixed(1)}% (Meta: < 3%) -> ${melhor.metasCheck.limite ? 'OK' : 'FORA'}`);
    console.log(`- Golpes no jogador: ${melhor.pctGolpesJogador.toFixed(1)}% (Meta: 35% a 70%) -> ${melhor.metasCheck.golpesJogador ? 'OK' : 'FORA'}`);
    console.log(`- Vida média do vencedor: ${Math.round(melhor.vidaVencedorMedio)}`);
    console.log(`- Cartas fora da faixa 40%-60%: ${melhor.cartasFora.length}`);

    console.log('\nTaxa de vitória das cartas na melhor combinação:');
    melhor.cartasRanking.forEach((c) => {
        const flag = c.taxa < METAS.cartaMin ? ' [ABAIXO]' : c.taxa > METAS.cartaMax ? ' [ACIMA]' : '';
        console.log(`  ${c.taxa.toFixed(1).padStart(5)}% ${c.nome.padEnd(25)} (${c.partidas} partidas)${flag}`);
    });

    if (melhor.cartasFora.length > 0) {
        console.log('\nSugestões de ajuste para cartas fora da faixa:');
        melhor.cartasFora.forEach((c) => {
            if (c.taxa < METAS.cartaMin) {
                console.log(`  - ${c.nome} (${c.taxa.toFixed(1)}%): carta fraca; sugere-se aumentar HP (+10) ou dano (+10).`);
            } else {
                console.log(`  - ${c.nome} (${c.taxa.toFixed(1)}%): carta forte; sugere-se reduzir HP (-10) ou dano (-10).`);
            }
        });
    } else {
        console.log('\nTodas as 24 cartas estão equilibradas dentro da faixa ideal de 40% a 60%!');
    }
}

main().catch((err) => {
    console.error('Erro na calibragem:', err);
    process.exit(1);
});
