// Run through tools/qa.mjs --eval-file tools/qa-game.js (desktop or mobile).
(async () => {
    const game = window.flappyEnzoGame;
    const checks = [];
    const check = (ok, label) => { if (!ok) throw new Error(label); checks.push(label); };
    const key = (code, target = document.activeElement) => target.dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'Space' ? ' ' : code, bubbles: true, cancelable: true }));
    document.querySelector('[data-game-trigger]').click();
    check(game.isOpen && !game.state.started, 'abre parado');
    key('Space');
    check(game.state.started && game.state.pipes.length === 1, 'espaço inicia com primeiro obstáculo');
    const distance = game.state.distance;
    game.setPaused(true);
    game.update(1 / 60);
    check(game.state.distance === distance, 'pausa congela simulação');
    game.setPaused(false);

    // Deterministic pilot: actual physics, geometry and scoring, no state teleport.
    let seed = 17;
    const originalRandom = Math.random;
    Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    try {
        for (let frame = 0; frame < 60 * 90 && !game.isGameOver; frame++) {
            const pipe = game.state.pipes.find(p => p.x + game.CONFIG.pipes.width > game.CONFIG.bird.x);
            const target = pipe ? pipe.gapY + pipe.gap / 2 : 240;
            if (game.birdY + 23 > target + 18 && game.velocity > 0) game.flap();
            game.update(1 / 60);
        }
        check(game.score >= 30 && !game.isGameOver, `90 segundos atravessáveis: ${game.score} pontos, ${game.state.lives} chances`);
    } finally { Math.random = originalRandom; }
    game.restart(); game.flap();
    game.state.birdY = 449; game.state.velocity = 300;
    game.update(1 / 60);
    check(game.state.lives === 2 && !game.isGameOver, 'primeiro impacto não encerra partida');
    game.state.birdY = 449; game.state.velocity = 300;
    game.update(1 / 60);
    check(game.state.lives === 2, 'proteção impede dano repetido');
    game.state.score = 2;
    for (let i = 0; i < 3000 && !game.isGameOver; i++) game.update(1 / 60);
    check(game.isGameOver && !game.state.awaitingName, 'fim de jogo não força ranking');
    document.querySelector('#game-share-btn').click();
    check(game.state.awaitingName, 'salvar é opcional');
    const originalFetch = window.fetch;
    game.state.session = Promise.resolve('qa-session');
    window.fetch = async () => ({ ok: false, status: 503 });
    document.querySelector('#game-save-btn').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    check(game.state.awaitingName && !document.querySelector('#game-save-btn').disabled, 'falha de envio permite tentar novamente');
    let posts = 0;
    window.fetch = async () => { posts++; return { ok: true, json: async () => [] }; };
    document.querySelector('#game-save-btn').click();
    document.querySelector('#game-save-btn').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    check(posts === 1 && !game.state.awaitingName, 'envio único fecha modal');
    window.fetch = originalFetch;
    document.querySelector('#game-share-btn').hidden = false;
    document.querySelector('#game-share-btn').click();
    game.close(); game.open();
    check(!game.isGameOver && !game.state.awaitingName && game.score === 0, 'fechar e reabrir não trava');
    document.querySelector('#game-canvas').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    check(game.state.started, 'toque inicia partida');
    const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
    check(canvas.left >= 0 && canvas.right <= innerWidth && canvas.height > 180, 'canvas cabe no viewport');
    // Exercise real animation loop, rather than only synchronous stepping.
    game.restart(); game.flap();
    const pilot = setInterval(() => {
        const pipe = game.state.pipes.find(p => p.x + game.CONFIG.pipes.width > game.CONFIG.bird.x);
        const target = pipe ? pipe.gapY + pipe.gap / 2 : 240;
        if (game.birdY + 23 > target + 18 && game.velocity > 0) key('Space', document.querySelector('#game-canvas'));
    }, 45);
    await new Promise(resolve => setTimeout(resolve, 10000));
    clearInterval(pilot);
    check(game.score >= 3 && !game.isGameOver, `loop real pontua: ${game.score}`);
    game.setPaused(true);
    return checks;
})()
