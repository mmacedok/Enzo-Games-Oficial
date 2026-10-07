const test = require('node:test');
const assert = require('node:assert/strict');
const { podeMostrar, INTERVALO } = require('../js/intro-diaria.js');
const agora = Date.UTC(2026, 9, 6, 23, 55);

test('primeira visita e registro inválido permitem a abertura', () => {
    for (const valor of [null, '', 'inválido', 'NaN', '0']) assert.equal(podeMostrar(valor, agora), true);
});
test('virar o dia e recarregar não repetem a abertura antes de 24 horas', () => {
    const visto = String(agora);
    for (const depois of [0, 10 * 60 * 1000, INTERVALO - 1]) assert.equal(podeMostrar(visto, agora + depois), false);
});
test('a abertura volta exatamente depois de 24 horas', () => {
    assert.equal(podeMostrar(String(agora), agora + INTERVALO), true);
    assert.equal(podeMostrar(String(agora), agora + INTERVALO + 1), true);
});
test('relógio atrasado não causa novas aberturas em cada recarregamento', () => {
    assert.equal(podeMostrar(String(agora + 1000), agora), false);
});
