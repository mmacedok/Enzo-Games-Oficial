// ============================================================================
// Home: transição de página, hero de lançamento e grid de edições.
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

    function openComic(comicId) {
        localStorage.setItem('currentComicId', comicId);
        localStorage.removeItem('currentChapterId');
        window.playMacaroniTransition(`reader.html?comic=${encodeURIComponent(comicId)}`);
    }

    // ------------------------------------------------------------------ hero
    function buildHero(comic) {
        const banner = document.createElement('div');
        banner.className = 'hero-banner';
        banner.tabIndex = 0;
        banner.setAttribute('role', 'link');
        banner.setAttribute('aria-label', `Ler ${comic.title}`);
        

        const bg = document.createElement('div');
        bg.className = 'hero-bg';
        bg.style.backgroundImage = `url('${siteImageUrl(comic.cover)}')`;

        const content = document.createElement('div');
        content.className = 'hero-content';

        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'hero-cover-wrapper';
        
        const cover = document.createElement('img');
        cover.className = 'hero-cover';
        applySiteImage(cover, comic.cover, '(max-width: 600px) 85vw, 420px');
        cover.alt = `Capa de ${comic.title}`;
        cover.fetchPriority = 'high';
        coverWrapper.appendChild(cover);

        const text = document.createElement('div');
        text.className = 'hero-text';
        const title = document.createElement('h2');
        title.textContent = comic.title;
        const description = document.createElement('p');
        description.textContent = comic.description || '';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hero-btn';
        button.textContent = 'LER AGORA';
        text.append(title, description, button);

        content.append(coverWrapper, text);
        banner.append(bg, content);
        const badge = document.createElement('div');
        badge.className = 'hero-badge';
        badge.textContent = 'ÚLTIMO CAPÍTULO';
        banner.appendChild(badge);

        banner.addEventListener('click', () => openComic(comic.id));
        banner.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openComic(comic.id);
            }
        });
        return banner;
    }

    function buildComingSoon() {
        const banner = document.createElement('div');
        banner.className = 'hero-banner hero-banner-placeholder';

        const badge = document.createElement('div');
        badge.className = 'hero-badge is-muted';
        badge.textContent = 'EM BREVE';

        const bg = document.createElement('div');
        bg.className = 'hero-bg is-muted';

        const content = document.createElement('div');
        content.className = 'hero-content is-centered';

        const text = document.createElement('div');
        text.className = 'hero-text is-centered';
        const title = document.createElement('h2');
        title.textContent = 'PREPARANDO NOVO LANÇAMENTO...';
        const description = document.createElement('p');
        description.textContent = 'Fique ligado para as próximas aventuras de Enzo!';
        text.append(title, description);

        content.appendChild(text);
        banner.append(bg, badge, content);
        return banner;
    }

    // ------------------------------------------------------------------ card
    function buildCard(comic) {
        const card = document.createElement('article');
        card.className = 'comic-card comic-book-style';
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', `Ler ${comic.title}`);

        const price = document.createElement('div');
        price.className = 'comic-price-tag';
        price.textContent = 'R$ 5,90';

        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'comic-cover-wrapper';
        

        const cover = document.createElement('img');
        cover.className = 'comic-cover';
        applySiteImage(cover, comic.cover, '(max-width: 600px) 85vw, 420px');
        cover.alt = comic.title;
        cover.loading = 'lazy';
        cover.decoding = 'async';
        coverWrapper.appendChild(cover);

        if (comic.id === 'capitulo-2') {
            // Edição especial com efeito glitch
            card.classList.add('glitch-card');
            for (const tone of ['cyan', 'red']) {
                const layer = document.createElement('div');
                layer.className = `glitch-layer ${tone}`;
                layer.style.backgroundImage = `url('${siteImageUrl(comic.cover)}')`;
                coverWrapper.appendChild(layer);
            }
            const noise = document.createElement('div');
            noise.className = 'glitch-noise';
            coverWrapper.appendChild(noise);
        }

        const info = document.createElement('div');
        info.className = 'comic-info';
        const title = document.createElement('h3');
        title.textContent = comic.title;
        const description = document.createElement('p');
        description.textContent = comic.description || '';
        info.append(title, description);

        card.append(price, coverWrapper, info);

        const activate = () => openComic(comic.id);
        card.addEventListener('click', activate);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate();
            }
        });
        attachTilt(card);
        return card;
    }

    /** Efeito 3D seguindo o mouse — só em dispositivos com ponteiro real. */
    function attachTilt(card) {
        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!finePointer) return;

        card.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            const rect = card.getBoundingClientRect();
            const offsetX = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
            const offsetY = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
            card.style.transition = 'transform 0.1s ease-out';
            card.style.transform =
                `perspective(1000px) rotateX(${(-offsetY * 15).toFixed(2)}deg) ` +
                `rotateY(${(offsetX * 15).toFixed(2)}deg) scale(1.05) translateZ(40px)`;
        });

        const reset = () => {
            card.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.transform = '';
        };
        card.addEventListener('pointerleave', reset);
        card.addEventListener('pointercancel', reset);
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

    function render() {
        const grid = document.getElementById('comic-grid');
        const heroSection = document.getElementById('hero-comic');
        if (!grid) return;

        const ordered = [...state.comics].sort(byReleaseOrder);
        // Só capítulos da série principal disputam o hero (spin-offs marcam featured: false).
        const eligible = ordered.filter((comic) => comic.featured !== false);
        state.latest = eligible.length > 0 ? eligible[eligible.length - 1] : null;
        const gridComics = state.latest
            ? ordered.filter((comic) => comic.id !== state.latest.id)
            : ordered;

        // Páginas com hero próprio (ex.: degustador.html) usam data-keeper.
        if (heroSection && !heroSection.hasAttribute('data-keeper')) {
            heroSection.replaceChildren(state.latest ? buildHero(state.latest) : buildComingSoon());
        }

        grid.replaceChildren();
        if (gridComics.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'loading';
            empty.textContent = 'Sua coleção está vazia. Adicione mais páginas em "assets/".';
            grid.appendChild(empty);
            return;
        }

        const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 4;
        gridComics.forEach((comic, index) => {
            const card = buildCard(comic);
            const isLast = index === gridComics.length - 1;
            if (isLast && gridComics.length % columns !== 0) card.classList.add('orphan');
            grid.appendChild(card);
        });
    }

    function renderError(error) {
        const grid = document.getElementById('comic-grid');
        if (!grid) return;
        const box = document.createElement('div');
        box.className = 'home-error';
        box.innerHTML = '<h3>Não foi possível carregar os gibis.</h3><p>Tente novamente em instantes.</p>';
        const retry = document.createElement('button');
        retry.className = 'hero-btn'; retry.textContent = 'Tentar novamente';
        retry.addEventListener('click', init); box.appendChild(retry);
        const detail = document.createElement('p');
        detail.className = 'home-error-detail';
        detail.textContent = `Erro técnico: ${error.message}`; // textContent: mensagem nunca vira HTML

        grid.replaceChildren(box);
    }

    async function init() {
        if (!document.getElementById('comic-grid')) return;
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
