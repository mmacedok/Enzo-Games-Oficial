// ============================================================================
// Animação de "entrar no gibi": ao escolher uma edição, o gibi voa da estante
// para o centro da tela e fica lá como um objeto 3D (mouse ou giro do celular
// inclinam). Um novo clique abre a capa, a câmera mergulha na página e só então
// o leitor carrega (ele continua a entrada).
//
// Uso: EnzoOpen.fly({ source, coverSrc, pageSrc }).then((abrir) => abrir && (location.href = ...))
// Com "reduzir movimento" ativado, resolve na hora e não anima nada.
// ============================================================================
(() => {
    'use strict';

    const ENTER_FLAG = 'enzo-enter-comic';
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let running = false;

    /** Variante maior (1280px) de uma imagem do catálogo, para a página ampliada. */
    function largeImageUrl(source) {
        const variants = window.SiteImages?.[source]?.variants;
        if (!variants) return source;
        return variants[Math.min(1, variants.length - 1)].src;
    }

    const preloaded = new Set();
    function preload(url) {
        if (!url || preloaded.has(url)) return;
        preloaded.add(url);
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
    }

    function element(tag, className, parent) {
        const node = document.createElement(tag);
        node.className = className;
        parent?.appendChild(node);
        return node;
    }

    function cleanup() {
        document.querySelectorAll('.comic-fly').forEach(node => node.remove());
        document.querySelectorAll('.is-flying-source').forEach(node => node.classList.remove('is-flying-source'));
        running = false;
    }
    // Voltar pelo navegador (cache de página) não pode deixar a animação na tela.
    addEventListener('pageshow', (event) => { if (event.persisted) cleanup(); });

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    /** Com a aba escondida o navegador congela as animações: nunca espere além da duração + folga. */
    const finished = (animation, ms) => Promise.race([animation.finished.catch(() => {}), wait(ms + 1500)]);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    /**
     * 1) o gibi voa até o centro e fica lá como um objeto 3D: o mouse (ou o giro
     *    do celular) inclina, com brilho holográfico;
     * 2) um novo clique abre a capa e mergulha no leitor.
     * Resolve `true` quando é para abrir o leitor, `false` se a pessoa fechou (Esc, X, fundo).
     */
    function fly(options) {
        return animate(options)
            .then((result) => {
                if (result === 'read') {
                    try { sessionStorage.setItem(ENTER_FLAG, '1'); } catch { /* modo privado: só perde a entrada suave */ }
                }
                return result !== 'cancel';
            })
            .finally(() => { running = false; }); // sem isso um clique depois da animação ficaria preso
    }

    /** iOS exige permissão (e um gesto do usuário) para ler o giroscópio; chamar dentro do clique. */
    function askMotion() {
        const Orientation = window.DeviceOrientationEvent;
        if (!Orientation || !matchMedia('(pointer: coarse)').matches) return Promise.resolve(false);
        if (typeof Orientation.requestPermission === 'function') {
            return Orientation.requestPermission().then((state) => state === 'granted').catch(() => false);
        }
        return Promise.resolve(true);
    }

    async function animate({ source, coverSrc, coverSource, pageSrc, title }) {
        if (running) return new Promise(() => {}); // clique duplo: ignora
        if (!source || reducedMotion() || typeof Element.prototype.animate !== 'function') return 'read';
        running = true;
        const motion = askMotion();

        // Na estante a capa fica num contexto 3D (perspectiva + rotação): o rect dela sai projetado.
        // Mede o .shelf-book (sem transform) e o viewport SEM a barra de rolagem, como o palco fixed.
        const rect = (source.closest?.('.shelf-book') || source).getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        // Tamanho final do gibi no centro: 80% da altura, proporção 9:16.
        let height = vh * 0.8;
        let width = height * 9 / 16;
        if (width > vw * 0.7) { width = vw * 0.7; height = width * 16 / 9; }

        const stage = element('div', 'comic-fly');
        const backdrop = element('div', 'comic-fly-backdrop', stage);
        const book = element('div', 'comic-fly-book', stage);
        Object.assign(book.style, {
            width: `${width}px`,
            height: `${height}px`,
            left: `${(vw - width) / 2}px`,
            top: `${(vh - height) / 2}px`,
        });
        // O "tilt" recebe a inclinação do mouse/giroscópio; o book continua com o voo e a abertura.
        const tilt = element('div', 'comic-fly-tilt', book);
        // Espessura do gibi: lombada, verso e cortes das páginas aparecem ao girar.
        const depth = Math.round(width * 0.14);
        book.style.setProperty('--d', `${depth}px`);
        book.style.setProperty('--cover', `url("${String(coverSrc).replace(/"/g, '%22')}")`);
        const front = element('div', 'comic-fly-front', tilt);
        for (const face of ['back', 'right', 'top', 'bottom']) element('div', `comic-fly-face comic-fly-${face}`, tilt);
        const spine = element('div', 'comic-fly-face comic-fly-spine', tilt);
        const spineText = element('span', '', spine);
        spineText.textContent = title || '';
        element('span', 'comic-fly-back-mark', tilt.querySelector('.comic-fly-back')).textContent = 'ENZO GAMES';

        const page = element('div', 'comic-fly-page', front);
        const pageImg = element('img', '', page);
        pageImg.alt = '';
        // Página deitada (comum no Degustador): mostra inteira em vez de recortar.
        pageImg.onload = () => pageImg.classList.toggle('is-landscape', pageImg.naturalWidth > pageImg.naturalHeight);
        if (pageSrc) pageImg.src = pageSrc;

        const cover = element('div', 'comic-fly-cover', front);
        const coverFront = element('div', 'comic-fly-cover-front', cover);
        const coverImg = element('img', '', coverFront);
        coverImg.alt = '';
        coverImg.src = coverSrc;
        if (coverSource && window.fitCover) fitCover(coverFront, coverSource);
        element('div', 'comic-fly-foil', coverFront);
        element('div', 'comic-fly-glare', coverFront);
        element('div', 'comic-fly-cover-back', cover);
        const flash = element('div', 'comic-fly-flash', stage);
        const hint = element('div', 'comic-fly-hint', stage);
        const close = element('button', 'comic-fly-close', stage);
        close.type = 'button';
        close.setAttribute('aria-label', 'Fechar');
        close.textContent = '✕';

        document.body.appendChild(stage);
        source.classList.add('is-flying-source');

        // Ponto de partida: exatamente onde está o gibi clicado.
        // A caixa da estante inclui a legenda: o gibi (9:16) ocupa só o topo dela.
        const coverH = source.closest?.('.shelf-book') ? rect.width * 16 / 9 : rect.height;
        const dx = rect.left + rect.width / 2 - vw / 2;
        const dy = rect.top + coverH / 2 - vh / 2;
        const scale = Math.min(1, rect.width / width) || 1;
        const from = `translate(${dx}px, ${dy}px) scale(${scale}) rotateY(18deg)`;

        // 1) Voa até o centro enquanto o fundo escurece.
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'forwards', easing: 'ease-out' });
        await finished(book.animate(
            [{ transform: from }, { transform: 'translate(0, 0) scale(1.04) rotateY(-4deg)', offset: 0.8 }, { transform: 'translate(0, 0) scale(1.06) rotateY(0deg)' }],
            { duration: 560, fill: 'forwards', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        ), 560);

        // 2) Inspeção 3D: mouse, toque ou giro do celular inclinam o gibi. Outro clique abre; Esc/X/fundo fecham.
        const decision = await inspect({ stage, backdrop, book, tilt, hint, close, coverFront, motion, from, depth });
        document.removeEventListener('keydown', decision.onKey);
        if (decision.result === 'cancel') {
            tilt.style.transform = '';
            backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
            await finished(book.animate(
                [{ transform: 'translate(0, 0) scale(1.06) rotateY(0deg)' }, { transform: from, opacity: 1 }],
                { duration: 420, fill: 'forwards', easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)' },
            ), 420);
            cleanup();
            return 'cancel';
        }

        // 3) A capa abre para a esquerda, revelando a primeira página.
        stage.classList.add('is-opening');
        // Volta de frente pelo caminho mais curto (a rotação livre pode ter passado de 360°).
        const yaw = ((decision.yaw % 360) + 540) % 360 - 180;
        tilt.style.transition = 'none';
        tilt.style.transform = `rotateX(${decision.pitch}deg) rotateY(${yaw}deg) scale(${decision.zoom})`;
        void tilt.offsetWidth;
        tilt.style.transition = 'transform 0.4s ease-out';
        tilt.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
        if (yaw !== 0 || decision.pitch !== 0) await wait(380);
        book.animate(
            [{ transform: 'translateX(0) scale(1.06)' }, { transform: `translateX(${width * 0.18}px) scale(1)` }],
            { duration: 620, fill: 'forwards', easing: 'ease-in-out' },
        );
        await finished(cover.animate(
            [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-165deg)' }],
            { duration: 620, fill: 'forwards', easing: 'cubic-bezier(0.45, 0, 0.2, 1)' },
        ), 620);

        // 4) Mergulho: a página cresce até tomar a tela e tudo vira a cor do leitor.
        const zoom = Math.max(vw / width, vh / height) * 2.2;
        book.animate(
            [{ transform: `translateX(${width * 0.18}px) scale(1)` }, { transform: `translateX(${width * 0.18}px) scale(${zoom})` }],
            { duration: 520, fill: 'forwards', easing: 'cubic-bezier(0.6, 0, 0.9, 0.4)' },
        );
        await finished(flash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 520, fill: 'forwards' }), 520);
        return 'read';
    }

    /**
     * Fase de inspeção. Resolve { result: 'read' | 'cancel', onKey, yaw, pitch, zoom }.
     * Mouse (sem clicar) e giro do celular inclinam um pouco; arrastar gira o gibi
     * por inteiro (lombada, verso, cortes); roda/botões dão zoom; botões levam à lombada e ao verso.
     */
    function inspect({ stage, backdrop, book, tilt, hint, close, coverFront, motion }) {
        return new Promise((resolve) => {
            const MAX_X = 24; // inclinação do mouse/giro (graus)
            const MAX_Y = 32;
            const ZOOM_MIN = 0.6, ZOOM_MAX = 2.2;
            let baseX = 0, baseY = 0;          // rotação "de verdade" (arrasto, botões, setas)
            let hoverX = 0, hoverY = 0;        // inclinação leve do mouse/giroscópio
            let curX = 0, curY = 0, curZ = 1, zoom = 1;
            let frame = 0, spin = false, gyro = false;
            let down = null, dragged = false, done = false;

            const tools = element('div', 'comic-fly-tools', stage);
            const buttons = {};
            const addButton = (id, label, title, onClick) => {
                const button = element('button', 'comic-fly-tool', tools);
                button.type = 'button';
                button.textContent = label;
                button.title = title;
                button.setAttribute('aria-label', title);
                button.addEventListener('click', (event) => { event.stopPropagation(); onClick(); });
                buttons[id] = button;
                return button;
            };
            // Menor caminho até o ângulo desejado (evita dar voltas inteiras).
            const turnTo = (angle) => { baseY = angle + 360 * Math.round((baseY - angle) / 360); baseX = 0; spin = false; schedule(); };
            const setZoom = (value) => { zoom = clamp(value, ZOOM_MIN, ZOOM_MAX); schedule(); };

            addButton('frente', 'Frente', 'Ver a capa (1)', () => turnTo(0));
            addButton('lombada', 'Lombada', 'Ver a lombada (2)', () => turnTo(90));
            addButton('verso', 'Verso', 'Ver o verso (3)', () => turnTo(180));
            addButton('girar', '⟳ Girar', 'Girar sozinho (G)', () => { spin = !spin; buttons.girar.classList.toggle('is-on', spin); schedule(); });
            addButton('menos', '−', 'Diminuir (-)', () => setZoom(zoom / 1.25));
            addButton('mais', '+', 'Aumentar (+)', () => setZoom(zoom * 1.25));
            addButton('ler', 'Ler ▶', 'Abrir para ler (Enter)', () => finish('read')).classList.add('is-primary');

            const apply = () => {
                frame = 0;
                if (spin && !down) baseY += 0.7;
                const ease = 0.18;
                curX += (baseX + hoverX - curX) * ease;
                curY += (baseY + hoverY - curY) * ease;
                curZ += (zoom - curZ) * ease;
                tilt.style.transform = `rotateX(${curX.toFixed(2)}deg) rotateY(${curY.toFixed(2)}deg) scale(${curZ.toFixed(3)})`;
                // Brilho e reflexo seguem a inclinação (mesmos efeitos holográficos da estante).
                const px = clamp(50 + (((curY % 360) + 540) % 360 - 180) / 90 * 50, 0, 100);
                const py = clamp(50 - (curX / 90) * 50, 0, 100);
                coverFront.style.setProperty('--mx', `${px.toFixed(1)}%`);
                coverFront.style.setProperty('--my', `${py.toFixed(1)}%`);
                const settling = Math.abs(baseX + hoverX - curX) > 0.05 || Math.abs(baseY + hoverY - curY) > 0.05 || Math.abs(zoom - curZ) > 0.002;
                if (settling || spin) frame = requestAnimationFrame(apply);
            };
            function schedule() { if (!frame && !done) frame = requestAnimationFrame(apply); }

            const finish = (result) => {
                if (done) return;
                done = true;
                cancelAnimationFrame(frame);
                removeEventListener('deviceorientation', onOrient);
                stage.removeEventListener('pointermove', onMove);
                stage.removeEventListener('pointerdown', onDown);
                stage.removeEventListener('wheel', onWheel);
                removeEventListener('pointerup', onUp);
                tools.remove();
                resolve({ result, onKey, yaw: curY, pitch: curX, zoom: curZ });
            };

            const onDown = (event) => {
                if (event.target.closest('.comic-fly-tools, .comic-fly-close')) return;
                down = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
                dragged = false;
            };
            const onMove = (event) => {
                if (down) {
                    if (!dragged && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) dragged = true;
                    if (dragged) {
                        baseY += (event.clientX - down.lastX) * 0.5;
                        baseX = clamp(baseX - (event.clientY - down.lastY) * 0.4, -80, 80);
                        spin = false;
                        buttons.girar.classList.remove('is-on');
                        hoverX = 0; hoverY = 0;
                        schedule();
                    }
                    down.lastX = event.clientX; down.lastY = event.clientY;
                    return;
                }
                if (event.pointerType !== 'mouse' || gyro) return;
                hoverY = clamp((event.clientX / innerWidth - 0.5) * 2, -1, 1) * MAX_Y;
                hoverX = clamp(-(event.clientY / innerHeight - 0.5) * 2, -1, 1) * MAX_X;
                schedule();
            };
            const onUp = () => { down = null; };
            const onWheel = (event) => { event.preventDefault(); setZoom(zoom * Math.exp(-event.deltaY * 0.0015)); };

            // Celular: relativo à posição em que a pessoa estava segurando ao abrir.
            let beta0 = null, gamma0 = null;
            const onOrient = (event) => {
                if (event.beta == null || event.gamma == null) return;
                if (beta0 === null) { beta0 = event.beta; gamma0 = event.gamma; }
                gyro = true;
                hoverY = clamp((event.gamma - gamma0) * 1.1, -MAX_Y, MAX_Y);
                hoverX = clamp((event.beta - beta0) * 1.1, -MAX_X, MAX_X) * -1;
                schedule();
            };
            const onKey = (event) => {
                const key = event.key;
                if (key === 'Escape') finish('cancel');
                else if (key === 'Enter' || key === ' ') { event.preventDefault(); finish('read'); }
                else if (key === 'ArrowLeft') { baseY -= 20; spin = false; schedule(); }
                else if (key === 'ArrowRight') { baseY += 20; spin = false; schedule(); }
                else if (key === 'ArrowUp') { baseX = clamp(baseX + 12, -80, 80); schedule(); }
                else if (key === 'ArrowDown') { baseX = clamp(baseX - 12, -80, 80); schedule(); }
                else if (key === '+' || key === '=') setZoom(zoom * 1.25);
                else if (key === '-') setZoom(zoom / 1.25);
                else if (key === '1' || key === '0') turnTo(0);
                else if (key === '2') turnTo(90);
                else if (key === '3') turnTo(180);
                else if (key === 'g' || key === 'G') buttons.girar.click();
            };

            stage.addEventListener('pointermove', onMove);
            stage.addEventListener('pointerdown', onDown);
            stage.addEventListener('wheel', onWheel, { passive: false });
            addEventListener('pointerup', onUp);
            book.addEventListener('click', (event) => {
                event.stopPropagation();
                if (dragged) { dragged = false; return; } // arrastar para girar não abre
                finish('read');
            });
            backdrop.addEventListener('click', () => { if (dragged) { dragged = false; return; } finish('cancel'); });
            close.addEventListener('click', (event) => { event.stopPropagation(); finish('cancel'); });
            document.addEventListener('keydown', onKey);

            motion.then((granted) => {
                if (!granted || done) return;
                addEventListener('deviceorientation', onOrient);
            });
            const touch = matchMedia('(pointer: coarse)').matches;
            hint.textContent = touch
                ? 'Incline o celular ou arraste para girar · toque no gibi ou em Ler para abrir'
                : 'Mova o mouse ou arraste para girar · roda do mouse dá zoom · clique no gibi para ler · Esc fecha';
            stage.classList.add('is-inspecting');
        });
    }

    window.EnzoOpen = { fly, preload, largeImageUrl, ENTER_FLAG };
})();
