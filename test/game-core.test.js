// ============================================================================
// Testes das regras puras do jogo (sem DOM/canvas).
// Rodar: npm test
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/game-core.js');

const CANVAS = { width: 420, height: 520 };
const PIPES = { width: 82, gap: 200, margin: 60, maxGapShift: 90 };
const BIRD = { x: 60, y: 180, size: 46, gravity: 1500, jump: -430 };

test('pipeRects: cano de cima e de baixo preenchem exatamente o vão', () => {
    const rects = core.pipeRects({ x: 300, gapY: 150 }, PIPES, CANVAS);

    assert.equal(rects.top.y, 0);
    assert.equal(rects.top.h, 150, 'cano de cima termina no início do vão');
    assert.equal(rects.bottom.y, 150 + PIPES.gap, 'cano de baixo começa no fim do vão');
    assert.equal(
        rects.bottom.h,
        CANVAS.height - (150 + PIPES.gap),
        'cano de baixo vai até o fim do canvas',
    );
    assert.equal(rects.top.h + PIPES.gap + rects.bottom.h, CANVAS.height, 'sem buraco entre os canos');
});

test('pipeRects: gapY fora da tela é limitado ao intervalo válido', () => {
    const tooSmall = core.pipeRects({ x: 0, gapY: -50 }, PIPES, CANVAS);
    assert.equal(tooSmall.top.h, 0);

    const tooBig = core.pipeRects({ x: 0, gapY: 9999 }, PIPES, CANVAS);
    assert.equal(tooBig.bottom.h, 0);
    assert.equal(tooBig.top.h, CANVAS.height - PIPES.gap);
});

test('clampGapY mantém o vão inteiro dentro do canvas', () => {
    const min = core.clampGapY(-100, PIPES, CANVAS);
    const max = core.clampGapY(9999, PIPES, CANVAS);
    assert.equal(min, PIPES.margin);
    assert.equal(max, CANVAS.height - PIPES.gap - PIPES.margin);
    assert.ok(max > min, 'faixa de alturas possível não pode ser vazia');
});

test('colisão: pássaro no centro do vão passa; encostando nas bordas morre', () => {
    const pipe = { x: BIRD.x, gapY: 200 };

    const center = core.birdRect(pipe.gapY + PIPES.gap / 2 - BIRD.size / 2, BIRD);
    assert.equal(core.collidesWithPipes(center, [pipe], PIPES, CANVAS), false, 'centro do vão é seguro');

    // Encostando no fim do cano de cima (1px de sobreposição) já colide.
    const touchingTop = core.birdRect(pipe.gapY - BIRD.size + 1, BIRD);
    assert.equal(core.collidesWithPipes(touchingTop, [pipe], PIPES, CANVAS), true);

    // Exatamente no limite (sem sobreposição) não colide.
    const exactlyAtTop = core.birdRect(pipe.gapY, BIRD);
    assert.equal(core.collidesWithPipes(exactlyAtTop, [pipe], PIPES, CANVAS), false);

    // Encostando no cano de baixo.
    const touchingBottom = core.birdRect(pipe.gapY + PIPES.gap - 1, BIRD);
    assert.equal(core.collidesWithPipes(touchingBottom, [pipe], PIPES, CANVAS), true);
});

test('colisão: não morre fora da faixa horizontal do cano', () => {
    const pipe = { x: BIRD.x + 200, gapY: 100 };
    const bird = core.birdRect(0, BIRD);
    assert.equal(core.collidesWithPipes(bird, [pipe], PIPES, CANVAS), false);
});

test('todos os canos possíveis são atravessáveis por um pássaro que centraliza', () => {
    const birdHeight = BIRD.size;
    for (let gapY = PIPES.margin; gapY <= CANVAS.height - PIPES.gap - PIPES.margin; gapY += 5) {
        const pipe = { x: BIRD.x, gapY };
        const centered = core.birdRect(gapY + PIPES.gap / 2 - birdHeight / 2, BIRD);
        assert.equal(
            core.collidesWithPipes(centered, [pipe], PIPES, CANVAS),
            false,
            `vão em gapY=${gapY} deveria ser atravessável`,
        );
    }
});

test('nextGapY: o vão nunca exige mais subida do que o pássaro consegue', () => {
    // Pior caso: vão anterior no topo e sorteio pedindo o vão lá embaixo.
    const from = 60;
    const jump = core.nextGapY(from, 1, PIPES, CANVAS);
    assert.ok(
        jump - from <= PIPES.maxGapShift,
        `salto de vão grande demais: ${from} -> ${jump} (máx ${PIPES.maxGapShift})`,
    );

    // E o contrário: vão anterior embaixo e sorteio pedindo o topo.
    const upper = core.nextGapY(320, 0, PIPES, CANVAS);
    assert.ok(upper - 320 >= -PIPES.maxGapShift, `descida grande demais: 320 -> ${upper}`);

    // O primeiro cano aceita qualquer altura válida.
    for (const random of [0, 0.5, 1]) {
        const first = core.nextGapY(null, random, PIPES, CANVAS);
        assert.ok(first >= PIPES.margin && first <= CANVAS.height - PIPES.gap - PIPES.margin);
    }
});

test('nextGapY: uma sequência longa continua sempre atravessável', () => {
    let gapY = core.nextGapY(null, 0.5, PIPES, CANVAS);
    let climbs = 0;
    for (let i = 0; i < 2000; i++) {
        const next = core.nextGapY(gapY, Math.random(), PIPES, CANVAS);
        const delta = next - gapY;
        assert.ok(
            Math.abs(delta) <= PIPES.maxGapShift + 1e-9,
            `delta fora do limite no cano ${i}: ${delta.toFixed(1)}`,
        );
        assert.ok(next >= PIPES.margin && next <= CANVAS.height - PIPES.gap - PIPES.margin);
        if (delta < 0) climbs++;
        gapY = next;
    }
    assert.ok(climbs > 100, 'a sequência precisa realmente variar de altura');
});

test('stepBird: cai com gravidade e para no chão', () => {
    const state = { y: 100, groundY: CANVAS.height - 24 };
    let y = state.y;
    let velocity = 0;
    let steps = 0;
    let onGround = false;

    while (!onGround && steps < 600) {
        const result = core.stepBird(BIRD, { y, groundY: state.groundY }, 1 / 60, velocity);
        y = result.y;
        velocity = result.velocity;
        onGround = result.onGround;
        steps++;
        assert.ok(y >= 0, 'nunca sai pelo topo sem flap');
        assert.ok(y <= state.groundY - BIRD.size + 0.001, 'nunca atravessa o chão');
    }

    assert.equal(onGround, true, 'deve alcançar o chão');
    assert.equal(y, state.groundY - BIRD.size);
});

test('stepBird: flap segura o pássaro e não permite sair pelo topo', () => {
    const groundY = CANVAS.height - 24;
    let y = BIRD.y;
    let velocity = BIRD.jump;
    let highest = y;

    for (let i = 0; i < 400; i++) {
        if (velocity > 0 && y > 200) velocity = BIRD.jump; // piloto simples
        const result = core.stepBird(BIRD, { y, groundY }, 1 / 60, velocity);
        y = result.y;
        velocity = result.velocity;
        highest = Math.min(highest, y);
        assert.ok(!result.onGround, 'não deveria cair mantendo o ritmo de flapes');
    }
    assert.ok(highest < BIRD.y, 'o flap precisa realmente subir o pássaro');
});

test('physics: passo fixo é determinístico independente da taxa de quadros', () => {
    const groundY = CANVAS.height - 24;
    const simulate = (steps, dt) => {
        let y = 180;
        let velocity = 0;
        for (let i = 0; i < steps; i++) {
            const result = core.stepBird(BIRD, { y, groundY }, dt, velocity);
            y = result.y;
            velocity = result.velocity;
        }
        return { y, velocity };
    };

    const sixty = simulate(60, 1 / 60);
    const oneFortyFour = simulate(144, 1 / 144);

    assert.ok(
        Math.abs(sixty.y - oneFortyFour.y) < 3,
        `1 segundo deve dar a mesma altura em 60 e 144 fps (${sixty.y.toFixed(1)} vs ${oneFortyFour.y.toFixed(1)})`,
    );
});

test('colisão dos novos canos respeita a largura do corpo e da boca', () => {
    const pipe = { x: 100, gapY: 180 };
    assert.equal(core.collidesWithPipes({ x: 100, y: 20, w: 1, h: 8 }, [pipe], PIPES, CANVAS), false);
    assert.equal(core.collidesWithPipes({ x: 103, y: 20, w: 8, h: 8 }, [pipe], PIPES, CANVAS), true);
    assert.equal(core.collidesWithPipes({ x: 100, y: 165, w: 1, h: 8 }, [pipe], PIPES, CANVAS), true);
});

test('dificuldade cresce com limite e não altera obstáculos já criados', () => {
    assert.ok(core.difficulty(30).speed > core.difficulty(0).speed);
    assert.deepEqual(core.difficulty(300), core.difficulty(30));
    assert.equal(core.pipeRects({ x: 100, gapY: 100, gap: 230 }, { ...PIPES, gap: 182 }, CANVAS).bottom.y, 330);
});

test('relógio acumula o mesmo movimento em 30, 60 e 144 Hz', () => {
    const simulate = fps => {
        let accumulator = 0, distance = 0, y = 200, velocity = -310, steps = 0;
        for (let frame = 0; frame < fps * 10; frame++) {
            accumulator = core.advanceClock(accumulator, 1 / fps, 1 / 60, dt => {
                if (steps % 30 === 0) velocity = -310;
                const next = core.stepBird({ ...BIRD, gravity: 1000 }, { y, groundY: 496 }, dt, velocity);
                y = next.y; velocity = next.velocity; distance += 125 * dt; steps++;
            });
        }
        return { y, velocity, distance, steps };
    };
    assert.deepEqual(simulate(30), simulate(60));
    assert.deepEqual(simulate(144), simulate(60));
    let steps = 0;
    core.advanceClock(0, 20, 1 / 60, () => steps++);
    assert.equal(steps, 6, 'retorno de suspensão não simula segundos de queda');
});
