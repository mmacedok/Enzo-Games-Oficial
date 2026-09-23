// ============================================================================
// Coleções com estante 3D (js/shelf.js) e destaque do lançamento.
// A página escolhe a coleção em #comic-shelf[data-colecao]:
//   "serie"      -> home: um gibi por capítulo da série principal
//   "<id>"       -> página de spin-off (ex.: "degustador"): um gibi por capítulo
// Regras: valida o banco ANTES de tocar no DOM e nunca usa HTML interpolado
// com dados do catálogo (evita quebra de atributo e XSS).
// ============================================================================
(() => {
    'use strict';

    const state = { comics: [] };

    /** Índice numérico do capítulo, tolerante a ids não numéricos. */
    const chapterNumber = (comic) => {
        const match = String(comic.id || '').match(/(\d+)/);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };

    const byReleaseOrder = (a, b) =>
        (a.order ?? chapterNumber(a)) - (b.order ?? chapterNumber(b)) || String(a.id).localeCompare(String(b.id));

    const isSpinOff = (comic) => comic.featured === false;

    /**
     * Lista de edições da coleção. Cada edição: { comic, chapterId, cover,
     * firstPage, kicker ("Capítulo 3"), headline (nome da história), issue ("#3"),
     * isNew, spine (texto da lombada) }.
     */
    function editionsFor(colecao) {
        if (colecao === 'serie') {
            const series = [...state.comics].sort(byReleaseOrder).filter((comic) => !isSpinOff(comic));
            return series.map((comic, index) => ({
                comic,
                chapterId: null,
                cover: comic.cover,
                firstPage: comic.chapters[0]?.pages?.[0],
                kicker: comic.title || comic.id,
                headline: comic.description || comic.title || comic.id,
                issue: `#${index + 1}`,
                isNew: index === series.length - 1,
                spine: 'ENZO GAMES',
            }));
        }
        const comic = state.comics.find((entry) => entry.id === colecao);
        if (!comic) return [];
        return comic.chapters.map((chapter, index) => ({
            comic,
            chapterId: chapter.id,
            cover: chapter.cover || comic.cover,
            firstPage: chapter.pages?.[0],
            kicker: `Capítulo ${chapter.id}`,
            headline: chapter.title || `Capítulo ${chapter.id}`,
            issue: `#${index + 1}`,
            isNew: index === comic.chapters.length - 1,
            spine: String(comic.title || colecao).split(' ')[0].toUpperCase(),
        }));
    }

    const readerUrl = (edition) =>
        `reader.html?comic=${encodeURIComponent(edition.comic.id)}` +
        (edition.chapterId ? `&chapter=${encodeURIComponent(edition.chapterId)}` : '');

    /**
     * Abre a edição no leitor. Com `source` (a capa clicada), o gibi voa até a
     * tela e abre antes de carregar o leitor (js/comic-open.js).
     */
    async function openEdition(edition, source) {
        localStorage.setItem('currentComicId', edition.comic.id);
        if (edition.chapterId) localStorage.setItem('currentChapterId', edition.chapterId);
        else localStorage.removeItem('currentChapterId');
        const url = readerUrl(edition);
        if (!source || !window.EnzoOpen) {
            window.playMacaroniTransition(url);
            return;
        }
        const coverImg = source.querySelector('img');
        await window.EnzoOpen.fly({
            source,
            coverSrc: coverImg?.currentSrc || siteImageUrl(edition.cover),
            coverSource: edition.cover,
            pageSrc: window.EnzoOpen.largeImageUrl(edition.firstPage),
        });
        location.href = url;
    }

    function preloadFirstPage(edition) {
        window.EnzoOpen?.preload(window.EnzoOpen.largeImageUrl(edition.firstPage));
    }

    function makeActivatable(element, edition, getSource) {
        element.tabIndex = 0;
        element.setAttribute('role', 'link');
        element.addEventListener('click', () => openEdition(edition, getSource?.()));
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openEdition(edition, getSource?.());
            }
        });
        element.addEventListener('pointerenter', () => preloadFirstPage(edition), { once: true });
        element.addEventListener('focus', () => preloadFirstPage(edition), { once: true });
    }

    // ------------------------------------------------------------------ hero
    function buildHero(edition, colecao) {
        const { kicker, headline } = edition;
        const banner = document.createElement('div');
        banner.className = 'hero-banner';
        banner.setAttribute('aria-label', `Ler ${kicker}: ${headline}`);
        makeActivatable(banner, edition, () => banner.querySelector('.hero-cover-wrapper'));

        const bg = document.createElement('div');
        bg.className = 'hero-bg';
        bg.style.backgroundImage = `url('${siteImageUrl(edition.cover)}')`;

        const content = document.createElement('div');
        content.className = 'hero-content';

        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'hero-cover-wrapper';
        const cover = document.createElement('img');
        cover.className = 'hero-cover';
        applySiteImage(cover, edition.cover, '(max-width: 768px) 62vw, 240px');
        cover.alt = `Capa de ${kicker}`;
        cover.fetchPriority = 'high';
        coverWrapper.appendChild(cover);
        fitCover(coverWrapper, edition.cover);

        const text = document.createElement('div');
        text.className = 'hero-text';
        const tag = document.createElement('span');
        tag.className = 'hero-kicker';
        tag.textContent = headline === kicker ? 'Novo' : `Novo · ${kicker}`;
        const title = document.createElement('h2');
        title.textContent = headline;
        const description = document.createElement('p');
        description.textContent = colecao === 'serie'
            ? 'O capítulo mais recente da saga. Pegue sua macarronada e boa leitura!'
            : (edition.comic.description || 'A edição mais recente.');
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
            if (!valid) console.warn('[catálogo] gibi ignorado por falta de id/chapters:', comic);
            return valid;
        });
    }

    let shelf = null;

    function render() {
        const shelfElement = document.getElementById('comic-shelf');
        const heroSection = document.getElementById('hero-comic');
        if (!shelfElement) return;

        const colecao = shelfElement.dataset.colecao || 'serie';
        const editions = editionsFor(colecao);
        const latest = editions[editions.length - 1] || null;

        if (heroSection) heroSection.replaceChildren(latest ? buildHero(latest, colecao) : buildComingSoon());

        shelf?.destroy();
        shelf = null;
        if (editions.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'loading';
            empty.textContent = 'Sua coleção está vazia. Adicione páginas em "assets/".';
            shelfElement.replaceChildren(empty);
            return;
        }
        shelf = EnzoShelf.mount(shelfElement, editions, {
            onOpen: (edition, item) => openEdition(edition, item.querySelector('.book-front')),
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

    // ----------------------------------------------------- easter egg: jogo
    // Clicar no logo abre o Flappy Enzo. Os arquivos só baixam no 1º clique.
    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
            document.body.appendChild(script);
        });
    }

    let jogoCarregando = null;
    function abrirJogo() {
        jogoCarregando ??= carregarScript('js/game-dialog.js?v=1')
            .then(() => carregarScript('js/flappy-core.js?v=1'))
            .then(() => carregarScript('js/flappy.js?v=3'));
        jogoCarregando
            .then(() => window.FlappyEnzo.abrir())
            .catch((error) => { console.error('[jogo]', error); jogoCarregando = null; });
    }

    const logo = document.querySelector('[data-flappy-trigger]');
    if (logo) {
        logo.tabIndex = 0;
        logo.setAttribute('role', 'button');
        logo.addEventListener('click', abrirJogo);
        logo.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirJogo(); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
