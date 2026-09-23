// ============================================================================
// Leitor de gibis — ÚNICO motor de renderização de reader.html.
// Não carregue js/reader.js: ele é um fork obsoleto deste arquivo.
// ============================================================================
(() => {
    'use strict';

    const qs = (id) => document.getElementById(id);
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
    };

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

    const goTo = (url, { wipe = true } = {}) => {
        const wipeEl = qs('macaroni-wipe');
        if (!wipe || !wipeEl) {
            window.location.href = url;
            return;
        }
        wipeEl.classList.remove('is-leaving');
        wipeEl.classList.add('is-active');
        setTimeout(() => { window.location.href = url; }, wipe ? 600 : 0);
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

        chapter.pages.forEach((url, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'page-wrapper';
            const image = buildPageImage(url, index);
            wrapper.appendChild(image);
            // Páginas deitadas ficam ilegíveis no celular: oferece tela cheia com rolagem.
            if (image.width > image.height) wrapper.appendChild(buildExpandButton(url, index));

            const masks = (state.db.censorship?.[state.comic.id] || []).filter(entry => !entry.chapterId || entry.chapterId === chapter.id);
            const mask = masks.find((entry) => entry.pageIndex === index);
            if (mask && !state.unlocked) wrapper.appendChild(buildCaboCocoMask(mask.box));

            const eggs = (state.db.easterEggs || []).filter(
                (egg) => egg.comicId === state.comic.id && egg.pageIndex === index && (!egg.chapterId || egg.chapterId === chapter.id),
            );
            for (const egg of eggs) {
                if (egg.kind === 'macarronada') wrapper.appendChild(buildMacarronadaHotspot());
                else wrapper.appendChild(buildEasterEgg(egg));
            }

            ui.imageContainer.appendChild(wrapper);
        });

        const nextCard = buildNextChapterCard();
        if (nextCard) ui.imageContainer.appendChild(nextCard);

        ui.viewport.scrollTop = 0;
        ui.viewport.classList.toggle('zoomed', state.zoom > 1);
        updateZoomUI();
    }

    // -------------------------------------------------------------------- zoom
    function updateZoomUI() {
        ui.imageContainer.style.setProperty('--zoom-level', state.zoom);
        const width = Math.min(800, ui.viewport.clientWidth - 40) * state.zoom;
        ui.imageContainer.style.width = `${Math.max(120, width)}px`;
        ui.imageContainer.querySelectorAll('.webtoon-image').forEach(img => { img.sizes = `${Math.round(width)}px`; });
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
            state.unlocked = true;
            document.querySelectorAll('.cabo-coco-mask').forEach((mask) => {
                mask.style.opacity = '0';
                setTimeout(() => mask.remove(), 500);
            });
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

    // ------------------------------------------------------------ achievement
    function showAchievement() {
        if (qs('macarronada-achievement')) return;
        const popup = document.createElement('div');
        popup.id = 'macarronada-achievement';
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div>
                <div class="achievement-label">Conquista desbloqueada</div>
                <div>PARABÉNS! VOCÊ ACHOU 1 DE 999 MACARRONADAS!</div>
            </div>
        `;
        document.body.appendChild(popup);
        void popup.offsetWidth;
        popup.classList.add('show');
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 600);
        }, 4000);
    }

    // ------------------------------------------------------------------ events
    function setupEventListeners() {
        ui.chapterSelect.addEventListener('change', (event) => {
            const [comicId, chapterId] = JSON.parse(event.target.value);
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

        window.addEventListener('resize', updateZoomUI);

        // Barra some ao rolar para baixo e volta ao rolar para cima.
        ui.viewport.addEventListener('scroll', () => {
            const top = ui.viewport.scrollTop;
            if (Math.abs(top - state.lastScroll) < 12) return;
            document.body.classList.toggle('ui-hidden', top > state.lastScroll && top > 120);
            state.lastScroll = top;
        }, { passive: true });
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

        state.comic = comic;
        state.unlocked = false;

        document.body.classList.toggle('theme-degustador', comic.id === 'degustador');

        const wanted = chapterId
            || localStorage.getItem('currentChapterId')
            || comic.chapters?.[0]?.id;
        const index = comic.chapters?.findIndex((chapter) => chapter.id === wanted) ?? -1;
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
        const wipe = qs('macaroni-wipe');
        // Veio da animação de abrir o gibi na home: entra direto, sem macarronada.
        let enteringFromComic = false;
        try {
            enteringFromComic = sessionStorage.getItem('enzo-enter-comic') === '1';
            sessionStorage.removeItem('enzo-enter-comic');
        } catch { /* sem sessionStorage: usa a transição normal */ }
        if (enteringFromComic) {
            document.body.classList.add('enter-from-comic');
            wipe?.classList.remove('is-active');
        } else if (wipe) {
            setTimeout(() => {
                wipe.classList.remove('is-active');
                wipe.classList.add('is-leaving');
            }, 100);
        }

        setupPasswordModal();
        setupEventListeners();
        updateZoomUI();

        const { comicId, chapterId } = readUrlState();
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
                if (pagina) {
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
