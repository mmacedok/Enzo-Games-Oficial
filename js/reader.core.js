// ============================================================================
// Leitor de gibis — ÚNICO motor de renderização de reader.html.
// ============================================================================
(() => {
    'use strict';

    const qs = (id) => document.getElementById(id);

    /** Botão de casa: volta para a página da coleção do gibi aberto. */
    const CASA = { degustador: 'degustador.html', torado: 'zezoverso.html#torado', superkid: 'zezoverso.html#superkid' };
    const casaDo = (comic) => CASA[comic?.id] || (comic?.featured === false ? 'zezoverso.html' : 'index.html');
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 3;
    const ZOOM_STEP = 0.25;

    const ui = {
        chapterSelect: qs('chapter-select'),
        viewport: qs('reader-viewport'),
        imageContainer: qs('image-container'),
        zoomInBtn: qs('zoom-in-btn'),
        zoomOutBtn: qs('zoom-out-btn'),
        zoomResetBtn: qs('zoom-reset-btn'),
        zoomText: qs('zoom-level-text'),
        fullscreenBtn: qs('fullscreen-btn'),
    };

    const state = {
        db: null,
        comic: null,
        chapterIndex: 0,
        zoom: readStoredZoom(),
        unlocked: false,
        lastScroll: 0,
        // Progresso na nuvem (js/auth-widget.js): restaura uma vez por capítulo aberto,
        // a menos que o leitor já tenha rolado/tocado a página.
        restoredKey: null,
        interacted: false,
        jumped: false,           // já pulou para a página salva
        finishedKey: null,       // edição já gravada como concluída
    };
    const conta = () => window.EnzoConta;

    // ---------------------------------------------------------------- helpers
    function readStoredZoom() {
        const stored = Number.parseFloat(localStorage.getItem('reader-zoom'));
        return Number.isFinite(stored) ? clampZoom(stored) : 1;
    }

    function clampZoom(value) {
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    }

    /** Índice numérico do capítulo, tolerante a ids não numéricos. */
    const chapterNumber = (comic) => {
        const match = String(comic.id || '').match(/(\d+)/);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };

    // Só o parâmetro `chapter` é confiável; o comicId pode vir do localStorage.
    function readUrlState() {
        const params = new URLSearchParams(window.location.search);
        return {
            comicId: params.get('comic') || localStorage.getItem('currentComicId'),
            chapterId: params.get('chapter'),
        };
    }

    /**
     * Gibis da mesma coleção do atual, em ordem: a série principal navega só
     * entre capítulos da série; um spin-off (featured: false) fica no próprio spin-off.
     */
    function sameCollection() {
        const spinOff = state.comic.featured === false;
        return [...state.db.comics]
            .filter((c) => (spinOff ? c.id === state.comic.id : c.featured !== false))
            .sort((a, b) => (a.order ?? chapterNumber(a)) - (b.order ?? chapterNumber(b)));
    }

    // ------------------------------------------------------------------ render
    function populateChapterSelect() {
        ui.chapterSelect.innerHTML = '';
        const comics = sameCollection();
        for (const comic of comics) {
            const group = document.createElement('optgroup');
            group.label = comic.title || comic.id;
            for (const chapter of comic.chapters || []) {
                const option = document.createElement('option');
                option.value = JSON.stringify([comic.id, chapter.id]);
                option.textContent = comic.chapters.length === 1 ? (comic.title || comic.id) : `${comic.title} · ${chapter.title || chapter.id}`;
                option.selected = comic.id === state.comic.id && chapter.id === state.comic.chapters[state.chapterIndex]?.id;
                group.appendChild(option);
            }
            ui.chapterSelect.appendChild(group);
        }
    }

    function buildPageImage(url, index) {
        const img = document.createElement('img');
        applySiteImage(img, url);
        img.className = 'webtoon-image';
        img.loading = index === 0 ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.alt = `Página ${index + 1}`;
        img.addEventListener('click', () => document.body.classList.toggle('ui-hidden'));
        return img;
    }

    function buildExpandButton(url, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'page-expand-btn';
        button.innerHTML = '<i class="ri-fullscreen-line" aria-hidden="true"></i><span>Ampliar</span>';
        button.setAttribute('aria-label', `Ampliar página ${index + 1}`);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            openPageViewer(url, index);
        });
        return button;
    }

    let pageViewer = null;
    function openPageViewer(url, index) {
        if (!pageViewer) {
            pageViewer = document.createElement('dialog');
            pageViewer.className = 'page-viewer';
            pageViewer.setAttribute('aria-label', 'Página ampliada');
            pageViewer.innerHTML = `
                <div class="page-viewer-scroll"><img alt=""></div>
                <button type="button" class="btn btn--small viewer-close">Fechar ×</button>
                <p class="page-viewer-hint">Arraste para os lados para ler</p>`;
            pageViewer.querySelector('.viewer-close').addEventListener('click', () => pageViewer.close());
            document.body.appendChild(pageViewer);
        }
        const img = pageViewer.querySelector('img');
        applySiteImage(img, url, '2000px');
        img.alt = `Página ${index + 1} ampliada`;
        pageViewer.showModal();
        pageViewer.querySelector('.page-viewer-scroll').scrollLeft = 0;
    }

    function buildCaboCocoMask(box) {
        const mask = document.createElement('div');
        mask.className = 'cabo-coco-mask';
        if (box) Object.assign(mask.style, box);
        mask.innerHTML =
            '<span class="cabo-coco-text">CONTEÚDO BANIDO<br>' +
            '<small>EM 456 PAÍSES</small></span>';
        mask.setAttribute('role', 'button');
        mask.tabIndex = 0;
        mask.setAttribute('aria-label', 'Desbloquear conteúdo');
        mask.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPasswordModal(); } });
        mask.addEventListener('click', (event) => {
            event.stopPropagation();
            openPasswordModal();
        });
        return mask;
    }

    function buildMacarronadaHotspot() {
        const hotspot = document.createElement('div');
        hotspot.className = 'macarronada-hotspot';
        hotspot.setAttribute('role', 'button');
        hotspot.setAttribute('tabindex', '0');
        hotspot.title = 'Macarronada escondida';
        hotspot.setAttribute('aria-label', 'Revelar macarronada escondida');
        hotspot.addEventListener('click', (event) => {
            event.stopPropagation();
            showAchievement();
        });
        hotspot.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                showAchievement();
            }
        });
        return hotspot;
    }

    /**
     * Enzo secreto nº N: área invisível sobre um elemento da página
     * (easter egg `kind: "enzo-secreto"`, `numero` e `box` no manifest).
     * Clicar coleciona (js/conquistas.js); achar de novo só lembra que já tem.
     */
    /** Coleciona o Enzo secreto nº `numero` (brilho na área + notificação). */
    async function collectSecret(numero, trigger) {
        const id = window.EnzoConquistas?.idSecreto(numero);
        if (!id || !conta()) return;
        trigger.classList.remove('is-found');
        void trigger.offsetWidth;
        trigger.classList.add('is-found');
        if (await conta().conquista(id)) conta().anunciarConquista(id);
        else if (conta().temConquista(id)) showPopup(`enzo-secreto-${numero}-repetido`, ['enzo-secreto', '🐱'], 'Enzo secreto', `O Nº ${numero} já está na sua coleção!`);
        else showPopup('enzo-secreto-erro', ['aviso', '⚠️'], 'Enzo secreto', 'Não deu para salvar agora. Clique de novo daqui a pouco.');
    }

    function buildEnzoSecreto(egg) {
        const trigger = document.createElement('div');
        trigger.className = 'enzo-secreto-hotspot';
        trigger.setAttribute('role', 'button');
        trigger.tabIndex = 0;
        trigger.setAttribute('aria-label', 'Algo escondido na página');
        Object.assign(trigger.style, egg.box || {});
        const collect = (event) => { event.stopPropagation(); collectSecret(egg.numero, trigger); };
        trigger.addEventListener('click', collect);
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); collect(event); }
        });
        return trigger;
    }

    function buildEasterEgg(egg) {
        const trigger = document.createElement('div');
        trigger.className = 'easter-egg-trigger';
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        trigger.title = 'Segredo escondido';
        Object.assign(trigger.style, egg.box || {});

        const image = document.createElement('img');
        applySiteImage(image, egg.image);
        image.className = 'easter-egg-image';
        image.alt = 'Easter egg';
        image.loading = 'lazy';

        let timeoutId = null;
        const reveal = () => {
            image.classList.add('show-secret');
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => image.classList.remove('show-secret'), 10000);
            // Imagem secreta com `numero` no manifest também é um Enzo secreto colecionável.
            if (egg.numero) collectSecret(egg.numero, trigger);
        };
        trigger.addEventListener('click', (event) => { event.stopPropagation(); reveal(); });
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); reveal(); }
        });

        trigger.appendChild(image);
        return trigger;
    }

    function buildNextChapterCard() {
        const { comic, chapterIndex, db } = state;
        let nextUrl = null;
        let nextTitle = '';

        if (chapterIndex < comic.chapters.length - 1) {
            const next = comic.chapters[chapterIndex + 1];
            nextUrl = `reader.html?comic=${encodeURIComponent(comic.id)}&chapter=${encodeURIComponent(next.id)}`;
            nextTitle = next.title || 'Próximo Capítulo';
        } else {
            const ordered = sameCollection();
            const position = ordered.findIndex((c) => c.id === comic.id);
            const nextComic = position !== -1 ? ordered[position + 1] : null;
            if (nextComic) {
                const firstChapter = nextComic.chapters?.[0];
                nextUrl = `reader.html?comic=${encodeURIComponent(nextComic.id)}` +
                    (firstChapter ? `&chapter=${encodeURIComponent(firstChapter.id)}` : '');
                nextTitle = nextComic.title || nextComic.id;
            }
        }

        if (!nextUrl) return null;

        const container = document.createElement('div');
        container.className = 'next-chapter-container';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'floating-island next-chapter-btn';
        button.innerHTML = `
            <span class="reader-title"></span>
            <span class="next-chapter-arrow"><i class="ri-arrow-right-line"></i></span>
        `;
        button.querySelector('.reader-title').textContent = `Ler ${nextTitle}`;
        button.addEventListener('click', () => {
            const url = new URL(nextUrl, window.location.href);
            localStorage.setItem('currentComicId', url.searchParams.get('comic'));
            const chapter = url.searchParams.get('chapter');
            if (chapter) localStorage.setItem('currentChapterId', chapter);
            else localStorage.removeItem('currentChapterId');
            loadComic(url.searchParams.get('comic'), chapter, 'push');
        });

        container.appendChild(button);
        return container;
    }

    /**
     * Fim do capítulo: última página + "Ler próximo" + Cartas dos Leitores (js/comentarios.js).
     * No computador as cartas ficam à direita da última página; no celular, embaixo do botão.
     */
    function buildChapterEnd(chapter) {
        const pages = ui.imageContainer.querySelectorAll('.page-wrapper:not(.cover-wrapper)');
        const lastPage = pages[pages.length - 1];
        const nextCard = buildNextChapterCard();
        const letters = window.EnzoComentarios?.criar({ comicId: state.comic.id, chapterId: chapter.id });
        if (!lastPage || !letters) {
            if (nextCard) ui.imageContainer.appendChild(nextCard);
            return;
        }
        const end = document.createElement('div');
        end.className = 'fim-capitulo';
        lastPage.replaceWith(end);
        end.append(lastPage, ...(nextCard ? [nextCard] : []), letters);
    }

    /** Cartas ao lado da página quando cabem (empurra as páginas um pouco para a esquerda se precisar). */
    function placeLetters() {
        const end = ui.imageContainer.querySelector('.fim-capitulo');
        ui.imageContainer.style.translate = '';
        if (!end) return;
        const free = (ui.viewport.clientWidth - ui.imageContainer.offsetWidth) / 2;
        const width = Math.min(380, Math.max(280, free - 44));
        const shift = Math.max(0, width + 44 - free);
        const side = window.innerWidth >= 1024 && state.zoom <= 1 && shift <= free - 16;
        end.classList.toggle('fim-capitulo--lado', side);
        end.style.setProperty('--cartas-largura', `${width}px`);
        if (side && shift) ui.imageContainer.style.translate = `${-Math.ceil(shift)}px 0`;
    }

    function renderChapter() {
        const chapter = state.comic.chapters[state.chapterIndex];
        ui.imageContainer.innerHTML = '';

        if (!chapter || !chapter.pages?.length) {
            const empty = document.createElement('p');
            empty.className = 'reader-empty';
            empty.textContent = 'Este capítulo ainda não tem páginas.';
            ui.imageContainer.appendChild(empty);
            return;
        }

        // Spin-offs têm capa por capítulo; a série usa a capa do gibi.
        const cover = chapter.cover || state.comic.cover;
        if (cover) {
            const coverWrapper = document.createElement('div');
            coverWrapper.className = 'page-wrapper cover-wrapper';
            const coverImage = buildPageImage(cover, 0);
            coverImage.alt = `Capa de ${state.comic.title}`;
            coverWrapper.appendChild(coverImage);
            ui.imageContainer.appendChild(coverWrapper);
        }

        const masks = (state.db.censorship?.[state.comic.id] || []).filter(entry => !entry.chapterId || entry.chapterId === chapter.id);
        chapter.pages.forEach((url, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'page-wrapper';
            const image = buildPageImage(url, index);
            wrapper.appendChild(image);
            // Páginas deitadas ficam ilegíveis no celular: oferece tela cheia com rolagem.
            if (image.width > image.height) wrapper.appendChild(buildExpandButton(url, index));

            const mask = masks.find((entry) => entry.pageIndex === index);
            if (mask && !state.unlocked) wrapper.appendChild(buildCaboCocoMask(mask.box));

            const eggs = (state.db.easterEggs || []).filter(
                (egg) => egg.comicId === state.comic.id && egg.pageIndex === index && (!egg.chapterId || egg.chapterId === chapter.id),
            );
            for (const egg of eggs) {
                if (egg.kind === 'macarronada') wrapper.appendChild(buildMacarronadaHotspot());
                else if (egg.kind === 'enzo-secreto') wrapper.appendChild(buildEnzoSecreto(egg));
                else wrapper.appendChild(buildEasterEgg(egg));
            }

            ui.imageContainer.appendChild(wrapper);
        });

        buildChapterEnd(chapter);

        ui.viewport.scrollTop = 0;
        ui.viewport.classList.toggle('zoomed', state.zoom > 1);
        updateZoomUI();
    }

    // -------------------------------------------------------------------- zoom
    function updateZoomUI() {
        const width = Math.min(800, ui.viewport.clientWidth - 40) * state.zoom;
        ui.imageContainer.style.width = `${Math.max(120, width)}px`;
        ui.imageContainer.querySelectorAll('.webtoon-image').forEach(img => { img.sizes = `${Math.round(width)}px`; });
        placeLetters();
        ui.zoomText.textContent = `${Math.round(state.zoom * 100)}%`;
        ui.viewport.classList.toggle('zoomed', state.zoom > 1);
    }

    function changeZoom(delta) {
        state.zoom = clampZoom(Math.round((state.zoom + delta) * 100) / 100);
        localStorage.setItem('reader-zoom', String(state.zoom));
        updateZoomUI();
    }

    function resetZoom() {
        state.zoom = 1;
        localStorage.setItem('reader-zoom', '1');
        updateZoomUI();
    }

    // ---------------------------------------------------------------- password
    let passwordReturnFocus = null;
    function openPasswordModal() {
        const overlay = qs('password-modal-overlay');
        const input = qs('password-input');
        const error = qs('password-error');
        if (!overlay || !input) return;
        input.value = '';
        if (error) error.style.display = 'none';
        passwordReturnFocus = document.activeElement;
        overlay.style.display = 'flex';
        input.focus();
    }

    function closePasswordModal() {
        const overlay = qs('password-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        passwordReturnFocus?.focus();
    }

    function setupPasswordModal() {
        const overlay = qs('password-modal-overlay');
        const input = qs('password-input');
        const error = qs('password-error');
        if (!overlay || !input || !error) return;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Desbloquear conteúdo');
        input.setAttribute('aria-label', 'Senha de acesso');
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); closePasswordModal(); }
            if (event.key !== 'Tab') return;
            const controls = [...overlay.querySelectorAll('input, button')];
            const index = controls.indexOf(document.activeElement);
            event.preventDefault(); controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
        });

        const check = () => {
            const normalized = input.value.toLowerCase().replace(/\s/g, '');
            if (normalized !== 'copodelagrimas') {
                error.style.display = 'block';
                input.value = '';
                setTimeout(() => { error.style.display = 'none'; }, 2000);
                return;
            }
            unlockCensorship();
            conta()?.conquista('cabo-coco');
            closePasswordModal();
        };

        qs('password-submit')?.addEventListener('click', check);
        qs('password-cancel')?.addEventListener('click', closePasswordModal);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') check();
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closePasswordModal();
        });
    }

    /** Tira as tarjas do Cabo Côco (senha certa agora ou conquista já salva na conta). */
    function unlockCensorship() {
        state.unlocked = true;
        document.querySelectorAll('.cabo-coco-mask').forEach((mask) => {
            mask.style.opacity = '0';
            setTimeout(() => mask.remove(), 500);
        });
    }

    // ------------------------------------------------------------ achievement
    /** Aviso de rodapé (recordatório de gibi, js/site.js). icon = [nome em assets/ui, emoji]. */
    function showPopup(id, icon, label, text, burst = '') {
        window.siteToast({ id, icon, label, text, burst });
    }
    function showAchievement() {
        if (qs('macarronada-achievement')) return;
        showPopup('macarronada-achievement', ['conquista-macarronada', '🍝'], 'Caçador de Macarronada', 'PARABÉNS! VOCÊ ACHOU 1 DE 999 MACARRONADAS!', 'CONQUISTA!');
        conta()?.conquista('macarronada');
    }

    // -------------------------------------------------------- cloud progress
    /** Página (sem contar a capa) que está no meio da tela agora. */
    function currentPage() {
        const pages = ui.imageContainer.querySelectorAll('.page-wrapper:not(.cover-wrapper)');
        const middle = ui.viewport.getBoundingClientRect().top + ui.viewport.clientHeight / 2;
        let page = 0;
        pages.forEach((wrapper, index) => { if (wrapper.getBoundingClientRect().top <= middle) page = index; });
        return { page, total: pages.length };
    }

    /** Leu a edição: chegou à última página (ou ao fim da rolagem, se ela for curta). */
    function readToEnd() {
        const { page, total } = currentPage();
        const atBottom = ui.viewport.scrollTop + ui.viewport.clientHeight >= ui.viewport.scrollHeight - 80;
        return { page, total, completed: total > 0 && (page === total - 1 || atBottom) };
    }

    function saveProgress(leaving = false) {
        const chapter = state.comic?.chapters?.[state.chapterIndex];
        if (!chapter || !conta()?.usuario) return;
        const { page, total, completed } = readToEnd();
        if (!total) return;
        conta().salvarLeitura({ comicId: state.comic.id, chapterId: chapter.id, page, zoom: state.zoom, completed }, leaving);
        // Conquistas "ler todas as edições de X" (js/conquistas.js).
        if (completed && !leaving) conta().verificarColecoes?.(state.db);
    }

    let saveTimer = 0;
    const saveProgressSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveProgress, 1500); };

    /**
     * Chegou ao fim da edição: grava NA HORA (sem esperar a pausa na rolagem),
     * senão quem sai logo depois de terminar perde a edição lida.
     */
    function saveIfFinished() {
        const chapter = state.comic?.chapters?.[state.chapterIndex];
        const key = chapter && `${state.comic.id}/${chapter.id}`;
        if (!key || state.finishedKey === key || !conta()?.usuario || !readToEnd().completed) return;
        state.finishedKey = key;
        clearTimeout(saveTimer);
        saveProgress();
    }

    /** Aplica a conta ao capítulo aberto: tarja liberada e "continuar de onde parou". */
    function applyAccount() {
        const account = conta();
        if (!account?.usuario || !state.comic) return;
        if (!state.unlocked && account.temConquista('cabo-coco')) unlockCensorship();
        // Edições lidas antes desta conquista existir também contam.
        account.verificarColecoes?.(state.db);
        const chapter = state.comic.chapters?.[state.chapterIndex];
        const key = chapter && `${state.comic.id}/${chapter.id}`;
        if (!key || state.restoredKey === key) return;
        state.restoredKey = key;
        const saved = account.progressoDe(state.comic.id, chapter.id);
        if (!saved || saved.page <= 0 || saved.completed || state.interacted) return;
        const target = ui.imageContainer.querySelectorAll('.page-wrapper:not(.cover-wrapper)')[saved.page];
        if (!target) return;
        const paddingTop = parseFloat(getComputedStyle(ui.viewport).paddingTop) || 0;
        // Pelas caixas na tela: a última página fica dentro de .fim-capitulo (offsetTop mudaria de referência).
        const top = target.getBoundingClientRect().top - ui.viewport.getBoundingClientRect().top + ui.viewport.scrollTop - paddingTop;
        state.lastScroll = top;
        state.jumped = true;
        ui.viewport.scrollTop = top;
        showPopup('reading-restored', ['marcador', '📖'], 'Continuando de onde parou', `Página ${saved.page + 1}`);
    }

    // ------------------------------------------------------------------ events
    function setupEventListeners() {
        ui.chapterSelect.addEventListener('change', (event) => {
            let value;
            try { value = JSON.parse(event.target.value); } catch { return; } // value vazio: ignora
            if (!Array.isArray(value)) return;
            const [comicId, chapterId] = value;
            loadComic(comicId, chapterId, 'push');
        });

        ui.zoomInBtn?.addEventListener('click', () => changeZoom(ZOOM_STEP));
        ui.zoomOutBtn?.addEventListener('click', () => changeZoom(-ZOOM_STEP));
        ui.zoomResetBtn?.addEventListener('click', resetZoom);

        ui.fullscreenBtn?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .catch((err) => console.error('Erro de fullscreen:', err.message));
            } else {
                document.exitFullscreen();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.target.matches('input, textarea, select, [contenteditable]')) return;
            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                    document.body.classList.add('ui-hidden');
                    break;
                case '+':
                case '=':
                    changeZoom(ZOOM_STEP);
                    break;
                case '-':
                    changeZoom(-ZOOM_STEP);
                    break;
                case '0':
                    resetZoom();
                    break;
                case 'Escape':
                    closePasswordModal();
                    break;
                default:
                    break;
            }
        });

        // Ctrl/Cmd + roda do mouse ajusta o zoom sem sair da página.
        ui.viewport.addEventListener('wheel', (event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        }, { passive: false });

        // Um quadro, um cálculo: resize e rolagem disparam várias vezes por quadro.
        let zoomFrame = 0;
        window.addEventListener('resize', () => {
            if (zoomFrame) return;
            zoomFrame = requestAnimationFrame(() => { zoomFrame = 0; updateZoomUI(); });
        });

        // Barra some ao rolar para baixo e volta ao rolar para cima.
        let scrollFrame = 0;
        ui.viewport.addEventListener('scroll', () => {
            if (scrollFrame) return;
            scrollFrame = requestAnimationFrame(() => {
                scrollFrame = 0;
                const top = ui.viewport.scrollTop;
                if (Math.abs(top - state.lastScroll) < 12) return;
                document.body.classList.toggle('ui-hidden', top > state.lastScroll && top > 120);
                state.lastScroll = top;
                saveProgressSoon();
                saveIfFinished();
            });
        }, { passive: true });
        // Leitor já mexeu na página: não pula mais para a página salva na conta.
        for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
            ui.viewport.addEventListener(type, () => { state.interacted = true; }, { passive: true });
        }
        document.addEventListener('keydown', () => { state.interacted = true; });
        // Saindo da página (ou trocando de aba): grava a página atual na conta.
        window.addEventListener('pagehide', () => { clearTimeout(saveTimer); saveProgress(true); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(saveTimer); saveProgress(true); } });
        window.addEventListener('popstate', () => {
            const { comicId, chapterId } = readUrlState();
            if (comicId) loadComic(comicId, chapterId, 'none');
        });
    }

    // -------------------------------------------------------------------- boot
    function loadComic(comicId, chapterId = null, navigation = 'replace') {
        const comic = state.db.comics.find((entry) => entry.id === comicId);
        if (!comic) {
            renderMissingComic(comicId);
            return;
        }

        // Trocou de capítulo: guarda onde parou no anterior antes de redesenhar.
        if (state.comic) { clearTimeout(saveTimer); saveProgress(); }
        state.comic = comic;
        state.unlocked = false;
        state.interacted = false;
        state.jumped = false;
        state.finishedKey = null;
        const casa = qs('back-btn');
        if (casa) casa.dataset.nav = casaDo(comic);

        document.body.classList.toggle('theme-degustador', comic.id === 'degustador');

        const wanted = chapterId
            || localStorage.getItem('currentChapterId')
            || comic.chapters?.[0]?.id;
        const index = comic.chapters?.findIndex((chapter) => chapter.id === wanted);
        state.chapterIndex = index === -1 ? 0 : index;

        localStorage.setItem('currentComicId', comic.id);
        const activeChapter = comic.chapters?.[state.chapterIndex];
        if (activeChapter) localStorage.setItem('currentChapterId', activeChapter.id);

        const url = new URL(window.location.href);
        url.searchParams.set('comic', comic.id);
        if (activeChapter) url.searchParams.set('chapter', activeChapter.id);
        if (navigation === 'push') history.pushState(null, '', url);
        else if (navigation === 'replace') history.replaceState(null, '', url);

        populateChapterSelect();
        renderChapter();
        if (navigation === 'push') ui.viewport.scrollTo(0, 0);
        document.title = `${comic.title || 'Leitura'} — Enzo Games`;
        applyAccount();
    }

    function renderMissingComic(comicId) {
        document.body.classList.remove('theme-degustador');
        ui.imageContainer.innerHTML = `
            <div class="reader-empty reader-error">
                <h2>Este gibi ainda não está disponível</h2>
                <p>Não encontramos o conteúdo <code></code>.</p>
                <a href="index.html" class="btn reader-error-link">Voltar para o Início</a>
            </div>
        `;
        ui.imageContainer.querySelector('code').textContent = comicId;
    }

    function renderNoComicSelected() {
        ui.imageContainer.innerHTML = `
            <div class="reader-empty reader-error">
                <h2>Nenhum gibi selecionado</h2>
                <a href="index.html" class="btn reader-error-link">Voltar para o Início</a>
            </div>
        `;
    }

    async function init() {
        qs('back-btn')?.addEventListener('click', (event) => { window.location.href = event.currentTarget.dataset.nav || 'index.html'; });
        // Veio da animação de abrir o gibi na home: entra direto.
        let enteringFromComic = false;
        try {
            enteringFromComic = sessionStorage.getItem('enzo-enter-comic') === '1';
            sessionStorage.removeItem('enzo-enter-comic');
        } catch { /* sem sessionStorage */ }
        if (enteringFromComic) document.body.classList.add('enter-from-comic');

        setupPasswordModal();
        setupEventListeners();
        updateZoomUI();
        conta()?.aoMudar(applyAccount);

        let { comicId, chapterId } = readUrlState();
        // Aparelho novo, sem gibi na URL nem no localStorage: usa o último lido na conta.
        if (!comicId && conta()) {
            const lastRead = (await conta().pronto).dados?.lastRead;
            if (lastRead) ({ comicId, chapterId } = lastRead);
        }
        if (!comicId) {
            renderNoComicSelected();
            return;
        }

        try {
            const response = await fetch('data/database.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            state.db = await response.json();
            if (!Array.isArray(state.db?.comics)) throw new Error('database.json sem a lista "comics"');
            loadComic(comicId, chapterId);
            if (enteringFromComic) {
                const pagina = ui.imageContainer.querySelector('.page-wrapper:not(.cover-wrapper)');
                if (pagina && !state.jumped) {
                    const paddingTopDoViewport = parseFloat(getComputedStyle(ui.viewport).paddingTop) || 0;
                    const alvo = ui.imageContainer.offsetTop + pagina.offsetTop - paddingTopDoViewport;
                    state.lastScroll = alvo;
                    ui.viewport.scrollTop = alvo;
                    document.body.classList.remove('ui-hidden');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar o banco de dados:', error);
            ui.imageContainer.innerHTML = `
                <div class="reader-empty reader-error">
                    <h2>Não foi possível carregar as páginas</h2>
                    <p class="reader-error-detail"></p>
                </div>
            `;
            ui.imageContainer.querySelector('.reader-error-detail').textContent = error.message;
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
