// ============================================================================
// Regras puras do Flappy Enzo: física, talheres, colisão e pontos.
// Sem DOM e sem canvas — usado por js/flappy.js e pelos testes
// (test/flappy-core.test.js é o contrato deste arquivo).
// Unidades lógicas: tela 360×640, tempo em segundos, velocidade em px/s.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.FlappyCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const CONFIG = Object.freeze({
        largura: 360, altura: 640, chao: 560, gravidade: 1500, impulso: -430, quedaMax: 620,
        velocidade: 150, vao: 150, distancia: 210, margem: 60, mudancaMaxVao: 120,
        larguraTalher: 64, enzoX: 100, raioEnzo: 18, inicioY: 280, passo: 1 / 120,
    });
    /** Estado novo de uma partida. `aleatorio` permite testes previsíveis. */
    function criarJogo(aleatorio = Math.random) {
        const jogo = { aleatorio };
        return reiniciar(jogo);
    }
    function reiniciar(jogo) {
        Object.assign(jogo, { fase: 'pronto', pontos: 0, y: CONFIG.inicioY, vy: 0, talheres: [], acumulador: 0, andado: 0 });
        return jogo;
    }
    /** Novo par garfo/faca na borda direita; o vão nunca foge do alcance do anterior. */
    function novoTalher(jogo) {
        const min = CONFIG.margem + CONFIG.vao / 2, max = CONFIG.chao - CONFIG.margem - CONFIG.vao / 2;
        const ultimo = jogo.talheres[jogo.talheres.length - 1];
        let vaoY = min + jogo.aleatorio() * (max - min);
        if (ultimo) vaoY = Math.min(Math.max(vaoY, ultimo.vaoY - CONFIG.mudancaMaxVao), ultimo.vaoY + CONFIG.mudancaMaxVao);
        vaoY = Math.min(Math.max(vaoY, min), max);
        jogo.talheres.push({ x: CONFIG.largura, vaoY, contado: false });
    }
    /** Bater de asa: no primeiro toque também começa a partida. No fim não faz nada. */
    function tocar(jogo) {
        if (jogo.fase === 'fim') return;
        if (jogo.fase === 'pronto') { jogo.fase = 'jogando'; novoTalher(jogo); }
        jogo.vy = CONFIG.impulso;
    }
    /** Retângulos usados na colisão E no desenho: garfo do teto ao vão, faca do vão ao chão. */
    function retangulosTalher(t) {
        const topo = t.vaoY - CONFIG.vao / 2, base = t.vaoY + CONFIG.vao / 2;
        return { garfo: { x: t.x, y: 0, w: CONFIG.larguraTalher, h: topo }, faca: { x: t.x, y: base, w: CONFIG.larguraTalher, h: CONFIG.chao - base } };
    }
    function colideCirculoRetangulo(cx, cy, r, q) {
        const px = Math.min(Math.max(cx, q.x), q.x + q.w), py = Math.min(Math.max(cy, q.y), q.y + q.h);
        return (cx - px) ** 2 + (cy - py) ** 2 < r * r;
    }
    /** Um passo fixo de simulação (CONFIG.passo segundos). */
    function passo(jogo) {
        const dt = CONFIG.passo;
        jogo.vy = Math.min(jogo.vy + CONFIG.gravidade * dt, CONFIG.quedaMax);
        jogo.y += jogo.vy * dt;
        if (jogo.y < CONFIG.raioEnzo) { jogo.y = CONFIG.raioEnzo; jogo.vy = Math.max(jogo.vy, 0); }
        if (jogo.y + CONFIG.raioEnzo >= CONFIG.chao) { jogo.y = CONFIG.chao - CONFIG.raioEnzo; jogo.fase = 'fim'; return; }
        const mov = CONFIG.velocidade * dt;
        jogo.andado += mov;
        for (const t of jogo.talheres) t.x -= mov;
        if (jogo.andado >= CONFIG.distancia) { jogo.andado -= CONFIG.distancia; novoTalher(jogo); }
        jogo.talheres = jogo.talheres.filter(t => t.x + CONFIG.larguraTalher >= 0);
        for (const t of jogo.talheres) {
            const { garfo, faca } = retangulosTalher(t);
            if (colideCirculoRetangulo(CONFIG.enzoX, jogo.y, CONFIG.raioEnzo, garfo) || colideCirculoRetangulo(CONFIG.enzoX, jogo.y, CONFIG.raioEnzo, faca)) { jogo.fase = 'fim'; return; }
            if (!t.contado && t.x + CONFIG.larguraTalher < CONFIG.enzoX - CONFIG.raioEnzo) { t.contado = true; jogo.pontos++; }
        }
    }
    /** Avança o tempo real do quadro em passos fixos: 60 Hz e 144 Hz jogam igual. */
    function avancar(jogo, segundos) {
        if (jogo.fase !== 'jogando') return 0;
        jogo.acumulador += Math.min(Math.max(segundos, 0), 0.25);
        let n = 0;
        while (jogo.acumulador >= CONFIG.passo - 1e-9 && jogo.fase === 'jogando') { passo(jogo); jogo.acumulador -= CONFIG.passo; n++; }
        if (jogo.fase !== 'jogando') jogo.acumulador = 0;
        return n;
    }
    return { CONFIG, criarJogo, tocar, avancar, reiniciar, retangulosTalher, colideCirculoRetangulo };
});
