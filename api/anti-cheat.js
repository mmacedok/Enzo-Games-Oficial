// ============================================================================
// Anti-cheat: teto de pontos possível no tempo real de uma partida.
// Os limites saem das MESMAS regras que o jogo usa (js/flappy-core.js):
// mudou a física, o teto acompanha sozinho. (A Ronda foi guardada em arquivo/ronda/.)
// O relógio é o do servidor (run_token criado no início da partida), então
// pausar ou jogar num computador lento só aumenta o tempo, nunca os pontos.
// ============================================================================
const FlappyCore = require('../js/flappy-core.js');

/** Folga para rede lenta: 5% do tempo e mais 1,5 s. */
const FOLGA_RELATIVA = 1.05;
const FOLGA_SEGUNDOS = 1.5;
const PONTOS_MAX = 10_000_000;

/** Flappy: 1 ponto por par de talheres; o 1º par precisa atravessar a tela toda. */
function tetoFlappy(segundos) {
    const c = FlappyCore.CONFIG;
    const primeiro = (c.largura + c.larguraTalher - (c.enzoX - c.raioEnzo)) / c.velocidade;
    const intervalo = c.distancia / c.velocidade;
    return segundos < primeiro ? 0 : Math.floor((segundos - primeiro) / intervalo) + 1;
}

const JOGOS = Object.freeze({
    'flappy-enzo': tetoFlappy,
});

const jogoValido = (gameId) => Object.hasOwn(JOGOS, gameId);

/** Maior pontuação aceita para uma partida que durou `ms` (relógio do servidor). */
function pontuacaoMaxima(gameId, ms) {
    const segundos = Math.max(0, ms) / 1000 * FOLGA_RELATIVA + FOLGA_SEGUNDOS;
    return JOGOS[gameId](segundos);
}

/** { ok: true } ou { ok: false, motivo }. */
function validarPontuacao(gameId, score, ms) {
    if (!jogoValido(gameId)) return { ok: false, motivo: 'jogo desconhecido' };
    if (!Number.isSafeInteger(score) || score < 0 || score > PONTOS_MAX) return { ok: false, motivo: 'pontuação inválida' };
    const maximo = pontuacaoMaxima(gameId, ms);
    if (score > maximo) return { ok: false, motivo: `pontuação impossível em ${Math.round(ms / 1000)} s (máximo ${maximo})` };
    return { ok: true };
}

module.exports = { JOGOS, jogoValido, pontuacaoMaxima, validarPontuacao, tetoFlappy, PONTOS_MAX };
