// ============================================================================
// Testes do motor anti-cheat (api/anti-cheat.js).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { tetoFlappy, validarPontuacao, pontuacaoMaxima } = require('../api/anti-cheat.js');

test('tetoFlappy respeita o tempo físico dos talheres', () => {
    // Primeiro par leva 2,28 s para atravessar a tela
    assert.equal(tetoFlappy(2), 0, 'antes do primeiro par');
    assert.equal(tetoFlappy(2.3), 1, 'logo após o primeiro par');
    // Intervalo entre talheres é 210 px / 150 px/s = 1,4 s
    assert.equal(tetoFlappy(2.3 + 1.4 * 10), 11, '10 intervalos depois');
});

test('validarPontuacao aceita partidas possíveis e recusa violações', () => {
    // Partida honesta: 10 pontos em 30 s
    assert.deepEqual(validarPontuacao('flappy-enzo', 10, 30_000), { ok: true });

    // Pontuação impossível (999 pontos em 30 s)
    const impossivel = validarPontuacao('flappy-enzo', 999, 30_000);
    assert.equal(impossivel.ok, false);
    assert.match(impossivel.motivo, /pontuação impossível/);

    // Tipos e valores inválidos
    assert.equal(validarPontuacao('flappy-enzo', -1, 30_000).ok, false);
    assert.equal(validarPontuacao('flappy-enzo', 1.5, 30_000).ok, false);
    assert.equal(validarPontuacao('flappy-enzo', '10', 30_000).ok, false);
    assert.equal(validarPontuacao('jogo-inexistente', 10, 30_000).ok, false);
});
