// ============================================================================
// Regras puras do Flappy Enzo: geometria das hitboxes e detecção de colisão.
// Sem DOM e sem canvas — usado tanto por js/game.js quanto pelos testes.
// Regra de ouro: o desenho e a colisão leem SEMPRE os mesmos retângulos.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.FlappyCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    /** Retângulos do cano: topo (0..gapY) e base (gapY+gap..height). */
    function pipeRects(pipe, pipes, canvas) {
        const gap = pipe.gap ?? pipes.gap;
        const gapY = Math.min(Math.max(pipe.gapY, 0), canvas.height - gap);
        return {
            top: { x: pipe.x, y: 0, w: pipes.width, h: gapY },
            bottom: {
                x: pipe.x,
                y: gapY + gap,
                w: pipes.width,
                h: Math.max(0, canvas.height - (gapY + gap)),
            },
        };
    }

    function birdRect(birdY, bird) {
        const inset = bird.inset || 0;
        return { x: bird.x + inset, y: birdY + inset, w: bird.size - inset * 2, h: bird.size - inset * 2 };
    }

    // The same solid pieces are painted and tested; empty space is safe.
    function pipeParts(rect, top) {
        const { x, y, w, h } = rect;
        if (h <= 0) return [];
        const lip = Math.min(20, h);
        return [
            { x, y: top ? y + h - lip : y, w, h: lip },
            { x: x + 2, y: top ? y : y + lip, w: w - 4, h: h - lip },
        ].filter(part => part.h > 0);
    }

    function difficulty(score) {
        const level = Math.min(6, Math.floor(score / 5));
        return { level: level + 1, speed: 125 + level * 9, gap: 230 - level * 8 };
    }

    function advanceClock(accumulator, elapsed, step, update) {
        accumulator += Math.min(Math.max(elapsed, 0), 0.1);
        while (accumulator + 1e-9 >= step) {
            update(step);
            accumulator -= step;
        }
        return Math.max(0, accumulator);
    }

    function intersects(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function collidesWithPipes(rect, pipes, pipesConfig, canvas) {
        return pipes.some((pipe) => {
            const rects = pipeRects(pipe, pipesConfig, canvas);
            return [...pipeParts(rects.top, true), ...pipeParts(rects.bottom, false)]
                .some(part => intersects(rect, part));
        });
    }

    /** Posição vertical do Y do vão, sempre dentro dos limites do canvas. */
    function clampGapY(value, pipes, canvas) {
        const min = pipes.margin;
        const max = canvas.height - pipes.gap - pipes.margin;
        return Math.min(Math.max(value, min), Math.max(min, max));
    }

    /**
     * Sorteia o vão do próximo cano respeitando o quanto o pássaro consegue
     * subir/descer entre dois canos. Sem isso, um vão pode nascer alto demais
     * e a morte fica inevitável (jogo injusto).
     */
    function nextGapY(previousGapY, random, pipes, canvas) {
        const { margin, gap, maxGapShift } = pipes;
        const raw = margin + random * (canvas.height - gap - margin * 2);
        const bounded = previousGapY === null || previousGapY === undefined
            ? raw
            : Math.min(Math.max(raw, previousGapY - maxGapShift), previousGapY + maxGapShift);
        return clampGapY(bounded, pipes, canvas);
    }

    /**
     * Integra um passo de física (Euler semi-implícito).
     * Determinístico: N passos de 1/144 s equivalem a N/144 s simulados.
     */
    function stepBird(bird, state, stepSeconds, currentVelocity = 0) {
        let velocity = currentVelocity + bird.gravity * stepSeconds;
        let y = state.y + velocity * stepSeconds;
        let onGround = false;
        const groundY = state.groundY - bird.size;

        if (y >= groundY) {
            y = groundY;
            onGround = true;
        } else if (y < 0) {
            y = 0;
            velocity = 0;
        }
        return { y, velocity, onGround };
    }

    return { pipeRects, pipeParts, difficulty, advanceClock, birdRect, intersects, collidesWithPipes, clampGapY, nextGapY, stepBird };
});
