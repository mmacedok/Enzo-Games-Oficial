// ============================================================================
// Flappy Enzo — mini-game do Enzo Games Site.
//
// Regras de ouro deste arquivo:
//  1. A física usa delta time normalizado: 60 fps ou 144 fps jogam igual.
//  2. A hitbox é SEMPRE derivada do desenho (drawPipe e collides usam os mesmos
//     retângulos), então nunca existe "cano invisível".
//  3. O jogo vive em #game-slot e nunca é destruído por re-render da home.
//  4. Nenhuma imagem precisa de pós-processamento em runtime: os PNGs já têm
//     transparência e o fundo é desenhado por código.
// ============================================================================
(() => {
    'use strict';

    const CONFIG = {
        canvas: { width: 420, height: 520 },
        bird: { x: 60, y: 180, size: 46, inset: 8, gravity: 1000, jump: -310 },
        pipes: { width: 64, gap: 230, speed: 125, spacing: 245, margin: 55, maxGapShift: 55 },
        // Passo de simulação fixo: o jogo roda igual em 60 Hz ou 144 Hz.
        stepSeconds: 1 / 60,
        scrollSpeed: 26,
        maxScore: 300,
    };

    const STORAGE = { highScore: 'flappyenzo-highscore', playerName: 'flappyenzo-name' };

    const core = window.FlappyCore;
    if (!core) {
        console.error('[flappy] js/game-core.js não foi carregado antes de js/game.js.');
        return;
    }

    // ------------------------------------------------------------------ DOM
    const slot = document.getElementById('game-slot');
    const trigger = document.querySelector('[data-game-trigger]');
    if (!slot || !trigger) return;

    slot.classList.add('game-slot');

    const style = document.createElement('style');
    style.textContent = `
        .game-slot { display: none; margin-top: 10px; }
        .game-slot.is-open { display: block; }
        .game-open #hero-comic { display: none; }
        .game-layout {
            display: flex; flex-wrap: wrap; gap: 20px;
            justify-content: center; align-items: flex-start;
            color: #fff; font-family: 'Comic Neue', 'Outfit', sans-serif;
        }
        .game-box {
            position: relative; background: #2b2b2b; border: 4px solid #f58220;
            border-radius: 12px; padding: 18px; text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,.5); width: 640px; max-width: 100%;
        }
        .game-hud {
            font-family: 'Bangers', cursive; font-size: 2rem; letter-spacing: 2px;
            display: flex; justify-content: space-between; padding: 0 6px; margin-bottom: 8px;
        }
        .game-canvas {
            background: #70c5ce; border: 2px solid #444; display: block;
            margin: 0 auto; width: 100%; height: auto; max-width: min(420px, calc((100dvh - 240px) * .8077));
            touch-action: none; cursor: pointer;
        }
        .game-status { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px; font-weight: bold; color: #ffd47a; }
        .game-canvas:focus-visible { outline: 3px solid #ffd47a; outline-offset: 3px; }
        .game-hint { margin-top: 6px; font-size: 1rem; opacity: .85; }
        .game-btn {
            background: #f58220; color: #fff; border: 2px solid #000; padding: 8px 16px;
            font-family: 'Bangers', cursive; font-size: 1.2rem; cursor: pointer;
            border-radius: 4px; margin: 6px 4px 0; box-shadow: 2px 2px 0 #000;
            transition: transform .15s ease, background .15s ease;
        }
        .game-btn:hover:not(:disabled) { background: #ff983f; transform: translate(1px,1px); box-shadow: 1px 1px 0 #000; }
        .game-btn:disabled { opacity: .6; cursor: not-allowed; }
        .game-btn.is-secondary { background: #888; }
        .game-ranking {
            background: #2b2b2b; border: 4px solid #f58220; border-radius: 12px;
            padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.5);
            width: 300px; max-width: 100%; max-height: 600px; overflow-y: auto;
        }
        .game-ranking h3 {
            font-family: 'Bangers', cursive; font-size: 2rem; color: #f58220;
            text-align: center; margin: 0 0 10px; text-shadow: 2px 2px 0 #000;
            border-bottom: 2px solid #444; padding-bottom: 8px;
        }
        .ranking-entry {
            display: flex; justify-content: space-between; gap: 10px;
            font-family: 'Bangers', cursive; font-size: 1.2rem;
            padding: 5px 0; border-bottom: 1px dashed #444;
        }
        .ranking-entry .score { color: #f58220; }
        .ranking-entry.is-top { color: #ffd700; }
        #game-name-modal {
            position: absolute; inset: 0; margin: auto; width: min(300px, 90%);
            height: fit-content; background: #fff; color: #000; padding: 20px;
            border: 4px solid #f58220; border-radius: 8px; text-align: center; z-index: 10;
        }
        #game-name-modal h3 { font-family: 'Bangers', cursive; font-size: 1.8rem; color: #d32f2f; margin: 0 0 6px; }
        #game-name-modal input {
            font-family: 'Bangers', cursive; font-size: 1.5rem; text-align: center;
            width: 170px; text-transform: uppercase; border: 2px solid #000; padding: 5px;
        }
    `;
    document.head.appendChild(style);

    slot.innerHTML = `
        <div class="game-layout">
            <div class="game-box">
                <div class="game-hud">
                    <span id="game-score">PONTOS: 0</span>
                    <span id="game-record">RECORDE: 0</span>
                </div>
                <div class="game-status"><span id="game-lives">CHANCES: 3</span><span id="game-level">RODADA 1 · META: 5</span></div>
                <canvas tabindex="0" id="game-canvas" class="game-canvas"
                        width="${CONFIG.canvas.width}" height="${CONFIG.canvas.height}"
                        role="img" aria-label="Flappy Enzo. Espaço ou seta para cima para voar. P para pausar."></canvas>
                <p class="game-hint" id="game-hint">Pressione ESPAÇO ou toque na tela para voar!</p>
                <button type="button" class="game-btn" id="game-retry-btn">RECOMEÇAR</button>
                <button type="button" class="game-btn" id="game-pause-btn">PAUSAR</button>
                <button type="button" class="game-btn" id="game-share-btn" hidden>SALVAR PLACAR</button>
                <button type="button" class="game-btn" id="game-close-btn">FECHAR</button>
                <div id="game-name-modal" hidden>
                    <h3>GAME OVER!</h3>
                    <p>Salve sua pontuação:</p>
                    <label class="sr-only" for="game-name-input" hidden>Seu nome</label>
                    <input type="text" id="game-name-input" maxlength="10" placeholder="SEU NOME">
                    <div>
                        <button type="button" class="game-btn" id="game-save-btn">ENVIAR</button>
                        <button type="button" class="game-btn is-secondary" id="game-skip-btn">IGNORAR</button>
                    </div>
                </div>
            </div>
            <aside class="game-ranking">
                <h3>RANKING</h3>
                <div id="ranking-list">Carregando...</div>
            </aside>
        </div>
    `;

    const el = {
        lives: slot.querySelector('#game-lives'),
        level: slot.querySelector('#game-level'),
        retryBtn: slot.querySelector('#game-retry-btn'),
        pauseBtn: slot.querySelector('#game-pause-btn'),
        shareBtn: slot.querySelector('#game-share-btn'),
        canvas: slot.querySelector('#game-canvas'),
        score: slot.querySelector('#game-score'),
        record: slot.querySelector('#game-record'),
        hint: slot.querySelector('#game-hint'),
        closeBtn: slot.querySelector('#game-close-btn'),
        modal: slot.querySelector('#game-name-modal'),
        nameInput: slot.querySelector('#game-name-input'),
        saveBtn: slot.querySelector('#game-save-btn'),
        skipBtn: slot.querySelector('#game-skip-btn'),
        ranking: slot.querySelector('#ranking-list'),
    };
    const ctx = el.canvas.getContext('2d');

    // -------------------------------------------------------------- assets
    const loadImage = (src, name) =>
        new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => {
                console.warn(`[flappy] sprite "${name}" não encontrado em ${src}; usando desenho vetorial.`);
                resolve(null);
            };
            image.src = src;
        });

    const sprites = { bird: null, pipe: null };
    loadImage('assets/flappy/bird.png', 'bird').then(bird => { sprites.bird = bird; });
    loadImage(siteImageUrl('assets/flappy/pasta-pipe-v2.png'), 'cano de macarronada').then(pipe => { sprites.pipe = pipe; });

    // ---------------------------------------------------------------- state
    // ---------------------------------------------------------------- estado
    const groundHeight = 24;

    const state = {
        open: false,
        gameOver: false,
        started: false,
        awaitingName: false,
        saving: false,
        score: 0,
        lives: 3,
        invulnerable: 0,
        paused: false,
        accumulator: 0,
        lastTime: null,
        runId: 0,
        session: null,
        highScore: Number.parseInt(localStorage.getItem(STORAGE.highScore) || '0', 10) || 0,
        distance: 0,
        scroll: 0,
        birdY: CONFIG.bird.y,
        velocity: 0,
        pipes: [],
        spawnAccumulator: 0,
        loopId: null,
    };

    /** Retângulos desenhados de um cano — usados no desenho E na colisão. */
    const pipeRects = (pipe) => core.pipeRects(pipe, CONFIG.pipes, CONFIG.canvas);

    const birdRect = () => core.birdRect(state.birdY, CONFIG.bird);

    // --------------------------------------------------------------- drawing
    function drawBackground() {
        const { width, height } = CONFIG.canvas;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#8ed0e8');
        gradient.addColorStop(0.65, '#70c5ce');
        gradient.addColorStop(1, '#b9e3a3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Macarronada ao fundo, rolando devagar para dar sensação de movimento.
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#f7c85a';
        const step = CONFIG.scrollSpeed;
        for (let i = -1; i < width / step + 2; i++) {
            const x = i * step - (state.scroll % step);
            const y = 40 + ((i * 37) % 60);
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Chão
        ctx.fillStyle = '#5aa02c';
        ctx.fillRect(0, height - 24, width, 24);
        ctx.fillStyle = '#3f7a1c';
        ctx.fillRect(0, height - 24, width, 6);
    }

    // Source regions omit the background around the generated sprite.
    // The shaft and lip use exactly the same destination rectangles as collision.
    function drawPipe(rect, isTop) {
        const parts = core.pipeParts(rect, isTop);
        const image = sprites.pipe;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!image) {
                ctx.fillStyle = i === 0 ? '#ffbd32' : '#d84913';
                ctx.fillRect(part.x, part.y, part.w, part.h);
                continue;
            }
            const scale = image.naturalWidth / 1024;
            const source = i === 0 ? [294, 50, 440, 148] : [303, 198, 419, 1145];
            ctx.save();
            ctx.translate(part.x, isTop ? part.y + part.h : part.y);
            if (isTop) ctx.scale(1, -1);
            ctx.drawImage(image, ...source.map(value => value * scale), 0, 0, part.w, part.h);
            ctx.restore();
        }
    }

    function drawPipes() {
        for (const pipe of state.pipes) {
            const rects = pipeRects(pipe);
            drawPipe(rects.top, true);
            drawPipe(rects.bottom, false);
        }
    }

    function drawBird() {
        const rect = { x: CONFIG.bird.x, y: state.birdY, w: CONFIG.bird.size, h: CONFIG.bird.size };
        ctx.save();
        if (state.invulnerable > 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(rect.x + 23, rect.y + 23, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = .65 + Math.sin(state.invulnerable * 25) * .2;
        }
        if (sprites.bird) {
            // Source bounds exclude the transparent padding in the original 896px sprite.
            ctx.drawImage(sprites.bird, 160, 164, 583, 526, rect.x, rect.y + 2, rect.w, rect.h - 4);
        } else {
            ctx.fillStyle = '#f58220';
            ctx.beginPath();
            ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawGameOver() {
        const { width } = CONFIG.canvas;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, width, CONFIG.canvas.height);
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.font = '36px Bangers, cursive';
        ctx.fillStyle = '#d32f2f';
        ctx.strokeText('ESCORREGOU NA', width / 2, 210);
        ctx.fillText('ESCORREGOU NA', width / 2, 210);
        ctx.strokeText('MACARRONADA', width / 2, 250);
        ctx.fillText('MACARRONADA', width / 2, 250);
        ctx.font = '16px "Comic Neue", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('ESPAÇO ou toque para tentar de novo', width / 2, 290);
    }

    /** Convite ao primeiro toque, desenhado sobre o cenário parado. */
    function drawStartPrompt() {
        const { width, height } = CONFIG.canvas;
        ctx.textAlign = 'center';
        ctx.font = '34px Bangers, cursive';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#f58220';
        ctx.strokeText('TOQUE PARA VOAR', width / 2, height / 2 - 10);
        ctx.fillText('TOQUE PARA VOAR', width / 2, height / 2 - 10);
        ctx.font = '15px "Comic Neue", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('Passe pelos canos. Você tem 3 chances.', width / 2, height / 2 + 18);
        ctx.fillText('Toques curtos · ESPAÇO ou ↑ · P pausa', width / 2, height / 2 + 42);
    }

    function draw() {
        drawBackground();
        drawPipes();

        drawBird();
        if (!state.started && !state.gameOver) drawStartPrompt();
        if (state.gameOver) drawGameOver();
        if (state.paused) {
            ctx.fillStyle = 'rgba(15, 23, 35, .75)';
            ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '32px Bangers, sans-serif';
            ctx.fillText('PAUSADO', 210, 230);
            ctx.font = '16px sans-serif';
            ctx.fillText('Toque ou pressione P para continuar', 210, 265);
        }
    }

    // ---------------------------------------------------------------- update
    function reset() {
        state.runId++;
        state.session = null;
        state.lives = 3;
        state.invulnerable = 0;
        state.paused = false;
        state.accumulator = 0;
        state.lastTime = null;
        el.lives.textContent = 'CHANCES: 3';
        el.level.textContent = 'RODADA 1 · META: 5';
        el.pauseBtn.textContent = 'PAUSAR';
        el.shareBtn.hidden = true;
        state.gameOver = false;
        state.started = false;
        state.score = 0;
        state.distance = 0;
        state.spawnAccumulator = 0;
        state.pipes = [];
        state.birdY = CONFIG.bird.y;
        state.velocity = 0;
        el.score.textContent = 'PONTOS: 0';
        el.hint.textContent = 'Toque ou aperte ESPAÇO para começar!';
        hideNameModal();
        updateRecord();
    }

    function spawnPipe() {
        const previous = state.pipes[state.pipes.length - 1];
        const difficulty = core.difficulty(state.score);
        const settings = { ...CONFIG.pipes, gap: difficulty.gap };
        state.pipes.push({
            x: CONFIG.canvas.width + CONFIG.pipes.width,
            gapY: core.nextGapY(previous ? previous.gapY : CONFIG.bird.y + CONFIG.bird.size / 2 - difficulty.gap / 2, previous ? Math.random() : .5, settings, CONFIG.canvas),
            gap: difficulty.gap,
            passed: false,
        });
    }

    function update(dt) {
        if (state.gameOver || state.paused) return;
        state.invulnerable = Math.max(0, state.invulnerable - dt);
        const speed = core.difficulty(state.score).speed;
        // Antes do primeiro toque o jogo espera: o pássaro não cai sozinho.
        if (!state.started) {
            state.birdY = CONFIG.bird.y;
            state.velocity = 0;
            return;
        }

        const step = core.stepBird(
            CONFIG.bird,
            { y: state.birdY, groundY: CONFIG.canvas.height - groundHeight },
            dt,
            state.velocity,
        );
        state.velocity = step.velocity;
        state.birdY = step.y;
        if (step.onGround) takeHit();
        if (state.gameOver) return;

        // Canos
        state.distance += speed * dt;
        state.spawnAccumulator += speed * dt;
        if (state.spawnAccumulator >= CONFIG.pipes.spacing) {
            state.spawnAccumulator -= CONFIG.pipes.spacing;
            spawnPipe();
        }

        const hitbox = birdRect();
        for (const pipe of state.pipes) {
            pipe.x -= speed * dt;
            if (core.collidesWithPipes(hitbox, [pipe], CONFIG.pipes, CONFIG.canvas)) takeHit(pipe);
            if (state.gameOver) return;
            if (!pipe.passed && pipe.x + CONFIG.pipes.width < CONFIG.bird.x) {
                pipe.passed = true;
                state.score = Math.min(CONFIG.maxScore, state.score + 1);
                const level = core.difficulty(state.score).level;
                el.level.textContent = `RODADA ${level} · META: ${Math.min(CONFIG.maxScore, (Math.floor(state.score / 5) + 1) * 5)}`;
                if (state.score % 5 === 0) el.hint.textContent = `${state.score} pontos! Ritmo aumentando — continue!`;
                el.score.textContent = `PONTOS: ${state.score}`;
            }
        }
        state.pipes = state.pipes.filter((pipe) => pipe.x + CONFIG.pipes.width > -10);

        state.scroll += CONFIG.scrollSpeed * dt;
        if (state.score >= CONFIG.maxScore) endGame();
    }

    // ----------------------------------------------------------------- loop
    function tick(time) {
        if (!state.open) return;
        const elapsed = state.lastTime === null ? 0 : (time - state.lastTime) / 1000;
        state.lastTime = time;
        if (!state.gameOver && !state.paused) {
            state.accumulator = core.advanceClock(state.accumulator, elapsed, CONFIG.stepSeconds, update);
        }
        draw();
        state.loopId = requestAnimationFrame(tick);
    }

    function startLoop() {
        stopLoop();
        state.lastTime = null;
        state.accumulator = 0;
        state.loopId = requestAnimationFrame(tick);
    }

    function stopLoop() {
        if (state.loopId !== null) cancelAnimationFrame(state.loopId);
        state.loopId = null;
    }

    function restart() {
        state.open = true;
        reset();
        startLoop();
        el.canvas.focus({ preventScroll: true });
        return true;
    }

    function setPaused(paused) {
        if (state.gameOver || !state.started) return;
        state.paused = paused;
        state.lastTime = null;
        state.accumulator = 0;
        el.pauseBtn.textContent = paused ? 'CONTINUAR' : 'PAUSAR';
        draw();
    }

    function takeHit(pipe) {
        if (state.invulnerable > 0 || state.gameOver) return;
        state.lives--;
        el.lives.textContent = `CHANCES: ${state.lives}`;
        if (state.lives === 0) { endGame(); return; }
        state.invulnerable = 1.6;
        state.birdY = pipe ? pipe.gapY + pipe.gap / 2 - CONFIG.bird.size / 2 : CONFIG.bird.y;
        state.velocity = 0;
        el.hint.textContent = 'Ops! Proteção por um instante. Continue voando!';
    }

    function endGame() {
        if (state.gameOver) return;
        state.gameOver = true;

        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem(STORAGE.highScore, String(state.highScore));
            updateRecord();
        }
        el.shareBtn.hidden = state.score === 0;
        el.hint.textContent = `${state.score} pontos. Toque para tentar de novo ou salve seu placar.`;
    }

    function updateRecord() {
        el.record.textContent = `RECORDE: ${state.highScore}`;
    }

    function flap() {
        if (!state.open || state.awaitingName) return;
        if (state.paused) { setPaused(false); return; }
        if (state.gameOver) restart();
        if (!state.started) {
            state.started = true;
            state.session = fetch('/api/leaderboard/session', { signal: AbortSignal.timeout(8000) })
                .then(res => { if (!res.ok) throw new Error('Sessão indisponível'); return res.json(); })
                .then(data => data.token).catch(() => null);
            spawnPipe();
            el.hint.textContent = 'Pressione ESPAÇO ou toque na tela para voar!';
        }
        state.velocity = CONFIG.bird.jump;
    }

    // ---------------------------------------------------------------- modal
    function showNameModal() {
        state.awaitingName = true;
        el.modal.hidden = false;
        el.nameInput.value = localStorage.getItem(STORAGE.playerName) || '';
        requestAnimationFrame(() => { if (state.awaitingName) el.nameInput.focus(); });
    }

    function hideNameModal() {
        state.awaitingName = false;
        el.modal.hidden = true;
    }

    // ------------------------------------------------------------- ranking
    async function loadRanking() {
        el.ranking.textContent = 'Carregando...';
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const entries = await response.json();
            renderRanking(Array.isArray(entries) ? entries : []);
        } catch (error) {
            console.warn('[flappy] ranking indisponível:', error.message);
            el.ranking.textContent = 'Ranking indisponível no momento.';
        }
    }

    function renderRanking(entries) {
        el.ranking.innerHTML = '';
        if (entries.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'Seja o primeiro a jogar!';
            empty.style.textAlign = 'center';
            el.ranking.appendChild(empty);
            return;
        }
        entries.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = `ranking-entry${index === 0 ? ' is-top' : ''}`;

            const name = document.createElement('span');
            name.textContent = `${index + 1}º ${entry.name}`;

            const score = document.createElement('span');
            score.className = 'score';
            score.textContent = String(entry.score);

            row.append(name, score);
            el.ranking.appendChild(row);
        });
    }

    async function submitScore() {
        if (state.saving) return;
        if (!state.awaitingName || !state.gameOver) return;
        const runId = state.runId;
        const finalScore = state.score;
        let saved = false;
        state.saving = true;
        el.saveBtn.disabled = true;
        el.saveBtn.textContent = 'SALVANDO...';

        const name = (el.nameInput.value.trim() || 'ANONIMO').slice(0, 10);
        localStorage.setItem(STORAGE.playerName, name);

        try {
            const token = await state.session;
            if (!token) throw new Error('Não foi possível abrir a sessão do ranking.');
            const response = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score: finalScore, token }),
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            renderRanking(await response.json());
            saved = true;
        } catch (error) {
            console.warn('[flappy] não foi possível enviar a pontuação:', error.message);
            if (state.runId === runId) el.hint.textContent = 'Não foi possível enviar. Você pode tentar salvar novamente.';
        } finally {
            state.saving = false;
            el.saveBtn.disabled = false;
            el.saveBtn.textContent = 'ENVIAR';
            if (state.runId === runId && saved) { hideNameModal(); el.shareBtn.hidden = true; el.canvas.focus(); }
        }
    }

    // ---------------------------------------------------------------- inputs
    function onKeyDown(event) {
        if (!state.open) return;
        if (event.key === 'Escape') {
            if (state.awaitingName) { hideNameModal(); el.canvas.focus(); }
            else closeGame();
            return;
        }
        if (event.target.closest('input, textarea, button, [contenteditable]')) return;
        if (event.code === 'KeyP' && !event.repeat) { event.preventDefault(); setPaused(!state.paused); return; }
        if (event.code === 'Space' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (event.repeat) return;
            flap();
        } else if (event.key === 'Escape') {
            closeGame();
        }
    }

    function onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        flap();
    }

    function openGame() {
        state.open = true;
        slot.classList.add('is-open');
        document.body.classList.add('game-open');
        trigger.setAttribute('aria-expanded', 'true');
        const banner = document.querySelector('#hero-comic .hero-banner');
        if (banner) banner.style.display = 'none';
        restart();
        loadRanking();
        el.canvas.scrollIntoView({ block: 'center', behavior: 'instant' });
    }

    function closeGame() {
        state.open = false;
        slot.classList.remove('is-open');
        document.body.classList.remove('game-open');
        hideNameModal();
        trigger.setAttribute('aria-expanded', 'false');
        const banner = document.querySelector('#hero-comic .hero-banner');
        if (banner) banner.style.display = '';
        stopLoop();
    }

    // ------------------------------------------------------------------ boot
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-controls', 'game-slot');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => (state.open ? closeGame() : openGame()));
    trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            state.open ? closeGame() : openGame();
        }
    });

    el.retryBtn.addEventListener('click', () => { restart(); flap(); });
    el.pauseBtn.addEventListener('click', () => { setPaused(!state.paused); el.canvas.focus(); });
    el.shareBtn.addEventListener('click', showNameModal);
    el.closeBtn.addEventListener('click', closeGame);
    el.saveBtn.addEventListener('click', submitScore);
    el.skipBtn.addEventListener('click', () => { hideNameModal(); el.canvas.focus(); });
    el.nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') submitScore();
    });
    el.canvas.addEventListener('pointerdown', onPointerDown);
    el.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { setPaused(true); stopLoop(); }
        else if (state.open) startLoop();
    });

    updateRecord();
    draw();

    window.flappyEnzoGame = {
        state,
        CONFIG,
        open: openGame,
        close: closeGame,
        restart,
        setPaused,
        flap,
        update,
        draw,
        pipeRects,
        birdRect,
        spawnPipe,
        loadRanking,
        get isOpen() { return state.open; },
        get isGameOver() { return state.gameOver; },
        get score() { return state.score; },
        get birdY() { return state.birdY; },
        get velocity() { return state.velocity; },
    };
})();
