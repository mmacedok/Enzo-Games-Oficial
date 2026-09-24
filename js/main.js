// ============================================================================
// Coleções com estante 3D (js/shelf.js) e destaque do lançamento.
// Cada .bookcase[data-colecao] da página vira uma estante (pode haver várias):
//   "serie"      -> home: um gibi por capítulo da série principal
//   "<id>"       -> spin-off (ex.: "degustador"): um gibi por capítulo
// O destaque (#hero-comic) usa a primeira estante da página.
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

    const estantes = () => [...document.querySelectorAll('.bookcase[data-colecao]')];
    let montadas = [];

    function render() {
        const elementos = estantes();
        const heroSection = document.getElementById('hero-comic');
        if (elementos.length === 0) return;

        montadas.forEach((estante) => estante.destroy());
        montadas = [];
        elementos.forEach((shelfElement, indice) => {
            const colecao = shelfElement.dataset.colecao || 'serie';
            const editions = editionsFor(colecao);
            if (indice === 0 && heroSection) {
                const latest = editions[editions.length - 1] || null;
                heroSection.replaceChildren(latest ? buildHero(latest, colecao) : buildComingSoon());
            }
            if (editions.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'loading';
                empty.textContent = colecao === 'serie' ? 'Sua coleção está vazia. Adicione páginas em "assets/".' : 'Edições em breve.';
                shelfElement.replaceChildren(empty);
                return;
            }
            montadas.push(EnzoShelf.mount(shelfElement, editions, {
                onOpen: (edition, item) => openEdition(edition, item.querySelector('.book-front')),
                onIntent: preloadFirstPage,
            }));
        });
    }

    function renderError(error) {
        const grid = estantes()[0];
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
        if (estantes().length === 0) return;
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
    // Os arquivos de cada jogo só baixam no 1º clique.
    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
            document.body.appendChild(script);
        });
    }

    // Cada easter egg: scripts em ordem e o objeto global que abre o jogo.
    const JOGOS = {
        flappy: { scripts: ['js/game-dialog.js?v=4', 'js/flappy-core.js?v=1', 'js/flappy.js?v=4'], global: 'FlappyEnzo' },
        ronda: { scripts: ['js/game-dialog.js?v=4', 'js/ronda-core.js?v=2', 'js/ronda.js?v=7'], global: 'RondaDegustador' },
    };
    const carregando = {};
    function abrirJogo(nome) {
        const jogo = JOGOS[nome];
        carregando[nome] ??= jogo.scripts.reduce((fila, src) => fila.then(() => carregarScript(src)), Promise.resolve());
        carregando[nome]
            .then(() => window[jogo.global].abrir())
            .catch((error) => { console.error('[jogo]', error); carregando[nome] = null; });
    }

    // Logo da home abre o Flappy; título do Degustador abre a Ronda.
    for (const [seletor, nome] of [['[data-flappy-trigger]', 'flappy'], ['[data-ronda-trigger]', 'ronda']]) {
        const gatilho = document.querySelector(seletor);
        if (!gatilho) continue;
        gatilho.tabIndex = 0;
        gatilho.setAttribute('role', 'button');
        gatilho.addEventListener('click', () => abrirJogo(nome));
        gatilho.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirJogo(nome); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
