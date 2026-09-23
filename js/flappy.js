// ============================================================================
// Flappy Enzo — easter egg da home (abre ao clicar no logo).
// Janela em tela cheia (<dialog>) com um canvas 360×640 lógico.
// As regras ficam em js/flappy-core.js; aqui só desenho, controles e recorde.
// Artes: assets/flappy/game/ (geradas por tools/prepare-flappy-assets.js).
// ============================================================================
(() => {
    'use strict';

    const core = window.FlappyCore;
    const { CONFIG } = core;
    const W = CONFIG.largura;
    const H = CONFIG.altura;
    const RECORDE = 'flappyenzo-recorde';
    const ENZO_LARGURA = 58;          // tamanho do desenho do Enzo (a colisão é o círculo do core)
    const MACARRONADA_LARGURA = 74;

    // ------------------------------------------------------------- janela
    const dialog = document.createElement('dialog');
    dialog.className = 'flappy-dialog';
    dialog.setAttribute('aria-label', 'Flappy Enzo');
    dialog.innerHTML = `
        <button type="button" class="btn btn--small flappy-close" aria-label="Fechar o jogo">Fechar ×</button>
        <canvas class="flappy-canvas" tabindex="0" role="img"
            aria-label="Flappy Enzo. Toque, clique, espaço ou seta para cima para voar."></canvas>`;
    document.body.appendChild(dialog);
    const canvas = dialog.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    // ------------------------------------------------------------- estado
    const jogo = core.criarJogo();
    const visual = { tempo: 0, ultimoToque: -1, fimEm: 0, fuga: 0, novoRecorde: false };
    let recorde = lerRecorde();
    let ultimoQuadro = null;
    let quadro = 0;
    let escala = 1;

    function lerRecorde() {
        try { return Number.parseInt(localStorage.getItem(RECORDE), 10) || 0; } catch { return 0; }
    }
    function salvarRecorde(valor) {
        try { localStorage.setItem(RECORDE, String(valor)); } catch { /* modo privado */ }
    }

    // ------------------------------------------------------------- artes
    const sprites = {};
    const carregarImagem = (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // sem a arte, desenha a forma simples
        img.src = src;
    });
    const artesProntas = fetch('assets/flappy/game/sprites.json')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
        .then(async (meta) => {
            if (!meta) return;
            const [enzo, macarronada, facaPonta, facaCabo, garfoPonta, garfoCabo] = await Promise.all([
                meta.enzo.arquivo, meta.macarronada.arquivo,
                meta.faca.ponta.arquivo, meta.faca.cabo.arquivo,
                meta.garfo.ponta.arquivo, meta.garfo.cabo.arquivo,
            ].map(carregarImagem));
            Object.assign(sprites, {
                enzo, macarronada,
                faca: facaPonta && { ponta: facaPonta, cabo: facaCabo },
                garfo: garfoPonta && { ponta: garfoPonta, cabo: garfoCabo },
            });
        });

    // Retícula de bolinhas do site, desenhada uma vez.
    const reticula = (() => {
        const tile = document.createElement('canvas');
        tile.width = tile.height = 12;
        const t = tile.getContext('2d');
        t.fillStyle = 'rgba(0, 0, 0, 0.07)';
        for (const [x, y] of [[3, 3], [9, 9]]) { t.beginPath(); t.arc(x, y, 1.6, 0, Math.PI * 2); t.fill(); }
        return ctx.createPattern(tile, 'repeat');
    })();

    // ------------------------------------------------------------- tamanho
    function ajustarTamanho() {
        const margem = 16;
        const livreW = innerWidth - margem * 2;
        const livreH = innerHeight - margem * 2 - 56; // espaço do botão Fechar
        escala = Math.max(0.3, Math.min(livreW / W, livreH / H));
        const dpr = Math.min(devicePixelRatio || 1, 3);
        canvas.style.width = `${Math.round(W * escala)}px`;
        canvas.style.height = `${Math.round(H * escala)}px`;
        canvas.width = Math.round(W * escala * dpr);
        canvas.height = Math.round(H * escala * dpr);
        ctx.setTransform(escala * dpr, 0, 0, escala * dpr, 0, 0);
        ctx.imageSmoothingQuality = 'high';
    }

    // ------------------------------------------------------------- desenho
    function texto(conteudo, x, y, tamanho, cor = '#fff', contorno = 5) {
        ctx.font = `${tamanho}px Bangers, 'Arial Black', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = contorno;
        ctx.strokeStyle = '#111';
        ctx.strokeText(conteudo, x, y);
        ctx.fillStyle = cor;
        ctx.fillText(conteudo, x, y);
    }

    function desenharCeu() {
        const ceu = ctx.createLinearGradient(0, 0, 0, CONFIG.chao);
        ceu.addColorStop(0, '#7cc6ec');
        ceu.addColorStop(0.7, '#bfe3f2');
        ceu.addColorStop(1, '#ffd9a0');
        ctx.fillStyle = ceu;
        ctx.fillRect(0, 0, W, CONFIG.chao);
        ctx.fillStyle = reticula;
        ctx.fillRect(0, 0, W, CONFIG.chao);

        // Silhueta da cidade, rolando devagar (paralaxe).
        const passo = 46;
        const desloc = (visual.tempo * 18) % passo;
        ctx.fillStyle = 'rgba(60, 70, 110, 0.35)';
        for (let i = -1; i < W / passo + 2; i++) {
            const altura = 50 + ((i * 37 + 1000) % 5) * 22;
            ctx.fillRect(i * passo - desloc, CONFIG.chao - altura, passo - 6, altura);
        }
    }

    function desenharChao() {
        ctx.fillStyle = '#3b3b3b';
        ctx.fillRect(0, CONFIG.chao, W, H - CONFIG.chao);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, CONFIG.chao, W, 5);
        // Faixa amarela de estacionamento andando na velocidade dos talheres.
        const passo = 48;
        const andado = jogo.fase === 'jogando' || jogo.fase === 'pronto' ? visual.tempo * CONFIG.velocidade : visual.fimEm * CONFIG.velocidade;
        const desloc = andado % passo;
        ctx.fillStyle = '#ffcc00';
        for (let i = -1; i < W / passo + 2; i++) ctx.fillRect(i * passo - desloc, CONFIG.chao + 34, 26, 7);
    }

    /** Desenha um talher: ponta junto ao vão e cabo esticado até a borda. */
    function desenharTalher(rect, arte, pontaNoFundo) {
        if (rect.h <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.x - 2, rect.y, rect.w + 4, rect.h);
        ctx.clip();
        if (!arte?.ponta) {
            ctx.fillStyle = '#e0b040';
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 3;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            ctx.restore();
            return;
        }
        const k = rect.w / arte.ponta.naturalWidth;
        const pontaH = arte.ponta.naturalHeight * k;
        if (pontaNoFundo) {
            // Garfo: vem do teto, dentes para baixo (arte original aponta para cima).
            const topoPonta = rect.y + rect.h - pontaH;
            if (arte.cabo && topoPonta > rect.y) ctx.drawImage(arte.cabo, rect.x, rect.y, rect.w, topoPonta - rect.y + 1);
            ctx.translate(rect.x, rect.y + rect.h);
            ctx.scale(1, -1);
            ctx.drawImage(arte.ponta, 0, 0, rect.w, pontaH);
        } else {
            // Faca: sobe do chão, lâmina para cima.
            ctx.drawImage(arte.ponta, rect.x, rect.y, rect.w, pontaH);
            const fimPonta = rect.y + pontaH;
            if (arte.cabo && fimPonta < rect.y + rect.h) ctx.drawImage(arte.cabo, rect.x, fimPonta - 1, rect.w, rect.y + rect.h - fimPonta + 1);
        }
        ctx.restore();
    }

    function desenharTalheres() {
        for (const talher of jogo.talheres) {
            const { garfo, faca } = core.retangulosTalher(talher);
            desenharTalher(garfo, sprites.garfo, true);
            desenharTalher(faca, sprites.faca, false);
        }
    }

    /** A Macarronada Sagrada voa sempre à frente; no fim, escapa. */
    function desenharMacarronada() {
        const img = sprites.macarronada;
        const w = MACARRONADA_LARGURA;
        const h = img ? img.naturalHeight * (w / img.naturalWidth) : w * 0.8;
        const alvoY = Math.min(Math.max(jogo.y - 60, 90), CONFIG.chao - 140);
        const fuga = visual.fuga;
        const x = 292 + fuga * 260;
        const y = alvoY + Math.sin(visual.tempo * 2.4) * 14 - fuga * 180;
        ctx.save();
        ctx.globalAlpha = 0.95;
        // Brilho sagrado.
        const brilho = ctx.createRadialGradient(x, y, 4, x, y, w * 0.9);
        brilho.addColorStop(0, 'rgba(255, 236, 150, 0.55)');
        brilho.addColorStop(1, 'rgba(255, 236, 150, 0)');
        ctx.fillStyle = brilho;
        ctx.fillRect(x - w, y - w, w * 2, w * 2);
        if (img) ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
        else { ctx.fillStyle = '#d84913'; ctx.beginPath(); ctx.arc(x, y, w / 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }

    function desenharEnzo() {
        const img = sprites.enzo;
        const w = ENZO_LARGURA;
        const h = img ? img.naturalHeight * (w / img.naturalWidth) : w;
        // Bico para cima ao subir; vai apontando para baixo conforme cai.
        let angulo = jogo.vy < 0 ? -0.35 : Math.min(0.55, -0.35 + (jogo.vy / CONFIG.quedaMax) * 1.1);
        let y = jogo.y;
        if (jogo.fase === 'pronto') { angulo = Math.sin(visual.tempo * 3) * 0.08; y += Math.sin(visual.tempo * 4) * 6; }
        // Esticadinha logo após o toque (no lugar de quadros de asa).
        const desdeToque = visual.tempo - visual.ultimoToque;
        const estica = desdeToque >= 0 && desdeToque < 0.14 ? Math.sin((desdeToque / 0.14) * Math.PI) * 0.16 : 0;
        ctx.save();
        ctx.translate(CONFIG.enzoX, y);
        ctx.rotate(angulo);
        ctx.scale(1 - estica * 0.6, 1 + estica);
        if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
        else { ctx.fillStyle = '#f58220'; ctx.beginPath(); ctx.arc(0, 0, CONFIG.raioEnzo, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }

    function desenharTelas() {
        if (jogo.fase !== 'pronto') texto(String(jogo.pontos), W / 2, 64, 58);
        if (jogo.fase === 'pronto') {
            texto('FLAPPY ENZO', W / 2, 150, 54, '#ff9900', 7);
            texto('TOQUE PARA VOAR', W / 2, 400, 32);
            texto('Clique, toque, espaço ou ↑', W / 2, 440, 18, '#ffe7b0', 4);
            texto('Pegue a macarronada! Desvie dos talheres!', W / 2, 470, 16, '#ffe7b0', 4);
            if (recorde > 0) texto(`RECORDE: ${recorde}`, W / 2, 205, 22, '#fff', 4);
        }
        if (jogo.fase === 'fim') {
            const t = Math.min(1, (visual.tempo - visual.fimEm) / 0.35);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * t})`;
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.translate(W / 2, 170);
            ctx.rotate(-0.12);
            ctx.scale(0.6 + 0.4 * t, 0.6 + 0.4 * t);
            texto('CLANG!', 0, 0, 72, '#ffcc00', 8);
            ctx.restore();
            texto('A MACARRONADA ESCAPOU!', W / 2, 250, 26, '#fff', 5);
            // Quadro de gibi com o placar.
            ctx.fillStyle = '#fff5d1';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 4;
            ctx.fillRect(70, 290, 220, 130);
            ctx.strokeRect(70, 290, 220, 130);
            ctx.font = "bold 18px 'Comic Neue', sans-serif";
            ctx.fillStyle = '#3b3024';
            ctx.textAlign = 'center';
            ctx.fillText('PONTOS', W / 2, 312);
            ctx.fillText('RECORDE', W / 2, 372);
            texto(String(jogo.pontos), W / 2, 342, 34, '#ff9900', 5);
            texto(String(recorde), W / 2, 402, 28, '#fff', 5);
            if (visual.novoRecorde) texto('NOVO RECORDE!', W / 2, 450, 26, '#ffcc00', 5);
            if (visual.tempo - visual.fimEm > 0.6) texto('Toque para tentar de novo', W / 2, 500, 22, '#fff', 4);
        }
    }

    function desenhar() {
        desenharCeu();
        desenharMacarronada();
        desenharTalheres();
        desenharChao();
        desenharEnzo();
        desenharTelas();
    }

    // ------------------------------------------------------------- laço
    function laco(agora) {
        if (!dialog.open) return;
        const dt = ultimoQuadro === null ? 0 : (agora - ultimoQuadro) / 1000;
        ultimoQuadro = agora;
        visual.tempo += Math.min(dt, 0.25);
        const antes = jogo.fase;
        core.avancar(jogo, dt);
        if (antes === 'jogando' && jogo.fase === 'fim') terminou();
        if (jogo.fase === 'fim') visual.fuga = Math.min(1, visual.fuga + Math.min(dt, 0.25) * 1.2);
        desenhar();
        quadro = requestAnimationFrame(laco);
    }

    function terminou() {
        visual.fimEm = visual.tempo;
        visual.novoRecorde = jogo.pontos > recorde;
        if (visual.novoRecorde) { recorde = jogo.pontos; salvarRecorde(recorde); }
    }

    // ------------------------------------------------------------- controles
    function acao() {
        if (jogo.fase === 'fim') {
            if (visual.tempo - visual.fimEm < 0.6) return; // evita recomeçar sem querer
            core.reiniciar(jogo);
            visual.fuga = 0;
            visual.novoRecorde = false;
            return;
        }
        core.tocar(jogo);
        visual.ultimoToque = visual.tempo;
    }

    canvas.addEventListener('pointerdown', (event) => {
        if (event.button > 0) return;
        event.preventDefault();
        acao();
    });
    dialog.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!event.repeat) acao();
        }
    });
    dialog.querySelector('.flappy-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        cancelAnimationFrame(quadro);
        document.body.classList.remove('flappy-open');
        // Partida em andamento volta para o "toque para voar" ao reabrir.
        if (jogo.fase === 'jogando') core.reiniciar(jogo);
    });
    addEventListener('resize', () => { if (dialog.open) ajustarTamanho(); });
    // Aba escondida: o laço para sozinho (requestAnimationFrame) e o core
    // limita o salto de tempo; ao voltar, zera o relógio para não pular.
    document.addEventListener('visibilitychange', () => { ultimoQuadro = null; });

    function abrir() {
        if (dialog.open) return;
        ajustarTamanho();
        document.body.classList.add('flappy-open');
        dialog.showModal();
        canvas.focus({ preventScroll: true });
        ultimoQuadro = null;
        artesProntas.then(() => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(laco); });
        desenhar();
    }

    window.FlappyEnzo = { abrir, jogo, CONFIG };
})();
