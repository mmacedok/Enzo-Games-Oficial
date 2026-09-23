// ============================================================================
// Home: hero de lançamento e estante 3D da série principal (js/shelf.js).
// Regras: valida o banco ANTES de tocar no DOM e nunca usa HTML interpolado
// com dados do catálogo (evita quebra de atributo e XSS).
// ============================================================================
(() => {
    'use strict';

    const state = { comics: [], latest: null };

    /** Índice numérico do capítulo, tolerante a ids não numéricos. */
    const chapterNumber = (comic) => {
        const match = String(comic.id || '').match(/(\d+)/);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };

    const byReleaseOrder = (a, b) =>
        (a.order ?? chapterNumber(a)) - (b.order ?? chapterNumber(b)) || String(a.id).localeCompare(String(b.id));

    const isSpinOff = (comic) => comic.featured === false;

    /** Título curto ("Capítulo 3") e título da história ("Mistério do Estacionamento"). */
    function labels(comic) {
        const kicker = comic.title || comic.id;
        const headline = comic.description || kicker;
        return { kicker, headline };
    }

    const firstPage = (comic) => comic.chapters?.[0]?.pages?.[0];

    /**
     * Abre o gibi no leitor. Com `source` (a capa clicada), o gibi voa até a
     * tela e abre antes de carregar o leitor (js/comic-open.js).
     */
    async function openComic(comic, source) {
        localStorage.setItem('currentComicId', comic.id);
        localStorage.removeItem('currentChapterId');
        const url = `reader.html?comic=${encodeURIComponent(comic.id)}`;
        if (!source || !window.EnzoOpen) {
            window.playMacaroniTransition(url);
            return;
        }
        const coverImg = source.querySelector('img');
        await window.EnzoOpen.fly({
            source,
            coverSrc: coverImg?.currentSrc || siteImageUrl(comic.cover),
            pageSrc: window.EnzoOpen.largeImageUrl(firstPage(comic)),
        });
        location.href = url;
    }

    function preloadFirstPage(comic) {
        window.EnzoOpen?.preload(window.EnzoOpen.largeImageUrl(firstPage(comic)));
    }

    function makeActivatable(element, comic, getSource) {
        element.tabIndex = 0;
        element.setAttribute('role', 'link');
        element.addEventListener('click', () => openComic(comic, getSource?.()));
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openComic(comic, getSource?.());
            }
        });
        element.addEventListener('pointerenter', () => preloadFirstPage(comic), { once: true });
        element.addEventListener('focus', () => preloadFirstPage(comic), { once: true });
    }

    // ------------------------------------------------------------------ hero
    function buildHero(comic) {
        const { kicker, headline } = labels(comic);
        const banner = document.createElement('div');
        banner.className = 'hero-banner';
        banner.setAttribute('aria-label', `Ler ${kicker}: ${headline}`);
        makeActivatable(banner, comic, () => banner.querySelector('.hero-cover-wrapper'));

        const bg = document.createElement('div');
        bg.className = 'hero-bg';
        bg.style.backgroundImage = `url('${siteImageUrl(comic.cover)}')`;

        const content = document.createElement('div');
        content.className = 'hero-content';

        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'hero-cover-wrapper';
        const cover = document.createElement('img');
        cover.className = 'hero-cover';
        applySiteImage(cover, comic.cover, '(max-width: 768px) 62vw, 240px');
        cover.alt = `Capa de ${kicker}`;
        cover.fetchPriority = 'high';
        coverWrapper.appendChild(cover);

        const text = document.createElement('div');
        text.className = 'hero-text';
        const tag = document.createElement('span');
        tag.className = 'hero-kicker';
        tag.textContent = `Novo · ${kicker}`;
        const title = document.createElement('h2');
        title.textContent = headline;
        const description = document.createElement('p');
        description.textContent = 'O capítulo mais recente da saga. Pegue sua macarronada e boa leitura!';
        const button = document.createElement('span');
        button.className = 'btn';
        button.textContent = 'Ler agora';
        text.append(tag, title, description, button);

        content.append(coverWrapper, text);
        banner.append(bg, content);
        return banner;
    }

    function buildComingSoon() {
        const banner = document.createElement('div');
        banner.className = 'hero-banner hero-banner-placeholder';

        const bg = document.createElement('div');
        bg.className = 'hero-bg is-muted';

        const content = document.createElement('div');
        content.className = 'hero-content is-centered';
        const text = document.createElement('div');
        text.className = 'hero-text is-centered';
        const title = document.createElement('h2');
        title.textContent = 'Preparando novo lançamento...';
        const description = document.createElement('p');
        description.textContent = 'Fique ligado para as próximas aventuras de Enzo!';
        text.append(title, description);
        content.appendChild(text);
        banner.append(bg, content);
        return banner;
    }

    // ------------------------------------------------------------------ load
    function validate(database) {
        if (!database || !Array.isArray(database.comics)) {
            throw new Error('database.json inválido: campo "comics" ausente ou não é uma lista.');
        }
        return database.comics.filter((comic) => {
            const valid = comic && typeof comic.id === 'string' && Array.isArray(comic.chapters);
            if (!valid) console.warn('[home] gibi ignorado por falta de id/chapters:', comic);
            return valid;
        });
    }

    let shelf = null;

    function render() {
        const shelfElement = document.getElementById('comic-shelf');
        const heroSection = document.getElementById('hero-comic');
        if (!shelfElement) return;

        // Spin-offs (featured: false) ficam só na página própria, não na home.
        const series = [...state.comics].sort(byReleaseOrder).filter((comic) => !isSpinOff(comic));
        state.latest = series.length > 0 ? series[series.length - 1] : null;

        // Páginas com hero próprio (ex.: degustador.html) usam data-keeper.
        if (heroSection && !heroSection.hasAttribute('data-keeper')) {
            heroSection.replaceChildren(state.latest ? buildHero(state.latest) : buildComingSoon());
        }

        shelf?.destroy();
        shelf = null;
        if (series.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'loading';
            empty.textContent = 'Sua coleção está vazia. Adicione páginas em "assets/".';
            shelfElement.replaceChildren(empty);
            return;
        }
        const entries = series.map((comic, index) => ({
            comic,
            issue: `#${index + 1}`,
            isNew: comic === state.latest,
            ...labels(comic),
        }));
        shelf = EnzoShelf.mount(shelfElement, entries, {
            onOpen: (comic, item) => openComic(comic, item.querySelector('.book-front')),
            onIntent: preloadFirstPage,
        });
    }

    function renderError(error) {
        const grid = document.getElementById('comic-shelf');
        if (!grid) return;
        const box = document.createElement('div');
        box.className = 'home-error';
        const title = document.createElement('h3');
        title.textContent = 'Não foi possível carregar os gibis.';
        const hint = document.createElement('p');
        hint.textContent = 'Tente novamente em instantes.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn btn--small';
        retry.textContent = 'Tentar novamente';
        retry.addEventListener('click', init);
        const detail = document.createElement('p');
        detail.className = 'home-error-detail';
        detail.textContent = `Erro técnico: ${error.message}`;
        box.append(title, hint, retry, detail);
        grid.replaceChildren(box);
    }

    async function init() {
        if (!document.getElementById('comic-shelf')) return;
        try {
            const response = await fetch('data/database.json');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            state.comics = validate(await response.json());
            render();
        } catch (error) {
            console.error('Erro ao carregar banco de dados:', error);
            renderError(error);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
