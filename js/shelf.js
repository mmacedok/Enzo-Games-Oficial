// ============================================================================
// Estante 3D de gibis da home.
//
// - Cada gibi é um livro 3D (capa, lombada, miolo) do MESMO tamanho, não
//   importa a proporção da imagem da capa (a capa é recortada em 9:16).
// - As prateleiras são montadas conforme a largura da tela: cabem N gibis por
//   prateleira e novas prateleiras surgem sozinhas. 6 ou 60 gibis, mesma regra.
// - Mouse: inclinação e brilho holográfico em cada gibi + paralaxe da estante.
//
// As funções puras (columnsFor, chunk) também rodam no Node para os testes.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.EnzoShelf = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    /** Quantos gibis cabem numa prateleira (mínimo 1). */
    function columnsFor(innerWidth, bookWidth, gap) {
        if (!(innerWidth > 0) || !(bookWidth > 0)) return 1;
        return Math.max(1, Math.floor((innerWidth + gap) / (bookWidth + gap)));
    }

    /** Divide a lista em prateleiras de `size` itens, preservando a ordem. */
    function chunk(items, size) {
        const rows = [];
        for (let i = 0; i < items.length; i += Math.max(1, size)) rows.push(items.slice(i, i + Math.max(1, size)));
        return rows;
    }

    if (typeof document === 'undefined') return { columnsFor, chunk };

    const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function px(element, property) {
        return Number.parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0;
    }

    /** Resolve uma variável CSS de tamanho (ex.: clamp(...)) em pixels reais. */
    function measure(container, variable) {
        const probe = document.createElement('div');
        probe.style.cssText = `position:absolute;visibility:hidden;height:0;width:var(${variable})`;
        container.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
    }

    /** Monta um gibi 3D. `entry` = { comic, chapterId, cover, issue, isNew, kicker, headline, spine }. */
    function buildBook(entry, onOpen, onIntent) {
        const { comic, issue, isNew, kicker, headline } = entry;

        const item = document.createElement('article');
        item.className = 'shelf-book';
        item.tabIndex = 0;
        item.setAttribute('role', 'link');
        item.setAttribute('aria-label', `Ler ${kicker}: ${headline}`);
        item.dataset.comicId = comic.id;
        if (entry.chapterId) item.dataset.chapterId = entry.chapterId;
        const coverSource = entry.cover || comic.cover;

        const book = document.createElement('div');
        book.className = 'book';

        // Capa (frente). Mantém a classe comic-cover-wrapper para os efeitos
        // gerados pelo build (ex.: olho do capítulo 2 em images.generated.css).
        const front = document.createElement('div');
        front.className = 'book-face book-front comic-cover-wrapper';
        const cover = document.createElement('img');
        cover.className = 'book-cover';
        applySiteImage(cover, coverSource, '(max-width: 600px) 45vw, 230px');
        cover.alt = `Capa de ${kicker}`;
        cover.loading = 'lazy';
        cover.decoding = 'async';
        cover.draggable = false;
        front.appendChild(cover);
        fitCover(front, coverSource);

        if (comic.id === 'capitulo-2') {
            item.classList.add('glitch-card');
            for (const tone of ['cyan', 'red']) {
                const layer = document.createElement('div');
                layer.className = `glitch-layer ${tone}`;
                layer.style.backgroundImage = `url('${siteImageUrl(coverSource)}')`;
                front.appendChild(layer);
            }
            const noise = document.createElement('div');
            noise.className = 'glitch-noise';
            front.appendChild(noise);
        }

        const foil = document.createElement('div');
        foil.className = 'book-foil';
        const glare = document.createElement('div');
        glare.className = 'book-glare';
        const badge = document.createElement('span');
        badge.className = `book-badge${isNew ? ' is-new' : ''}`;
        badge.textContent = isNew ? 'NOVO' : issue;
        front.append(foil, glare, badge);

        const spine = document.createElement('div');
        spine.className = 'book-face book-spine';
        const spineText = document.createElement('span');
        spineText.textContent = `${entry.spine || 'ENZO GAMES'} ${issue}`;
        spine.appendChild(spineText);

        const pages = document.createElement('div');
        pages.className = 'book-face book-pages';
        const top = document.createElement('div');
        top.className = 'book-face book-top';
        const back = document.createElement('div');
        back.className = 'book-face book-back';

        book.append(back, pages, top, spine, front);

        const caption = document.createElement('div');
        caption.className = 'book-caption';
        const small = document.createElement('small');
        small.textContent = headline === kicker ? issue : `${issue} · ${kicker}`;
        const title = document.createElement('h3');
        title.textContent = headline;
        caption.append(small, title);

        item.append(book, caption);

        item.addEventListener('click', () => onOpen(entry, item));
        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(entry, item);
            }
        });
        // Mouse em cima ou foco: já começa a baixar a 1ª página (para a animação).
        if (onIntent) {
            item.addEventListener('pointerenter', () => onIntent(entry), { once: true });
            item.addEventListener('focus', () => onIntent(entry), { once: true });
        }
        return item;
    }

    /** Inclinação + brilho holográfico seguindo o mouse. Devolve um cancelador. */
    function attachHolo(item) {
        if (!finePointer() || reducedMotion()) return null;
        const book = item.querySelector('.book');
        let frame = 0;
        let rect = null;
        // A caixa do gibi só é medida ao entrar com o mouse e ao redimensionar.
        const measure = () => { rect = book.getBoundingClientRect(); };
        const forget = () => { rect = null; }; // rolar move o gibi: a caixa medida deixa de valer

        item.addEventListener('pointerenter', measure);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', forget, { passive: true });

        item.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            if (!rect) measure();
            const nx = Math.min(1, Math.max(-1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
            const ny = Math.min(1, Math.max(-1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                item.classList.add('is-active');
                item.style.setProperty('--ry', `${(nx * 18).toFixed(2)}deg`);
                item.style.setProperty('--rx', `${(-ny * 10).toFixed(2)}deg`);
                item.style.setProperty('--mx', `${((nx + 1) * 50).toFixed(1)}%`);
                item.style.setProperty('--my', `${((ny + 1) * 50).toFixed(1)}%`);
            });
        });

        const reset = () => {
            cancelAnimationFrame(frame);
            item.classList.remove('is-active');
            for (const property of ['--ry', '--rx', '--mx', '--my']) item.style.removeProperty(property);
        };
        item.addEventListener('pointerleave', reset);
        item.addEventListener('pointercancel', reset);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', forget);
        };
    }

    /**
     * Monta a estante dentro de `container`.
     * entries: [{ comic, issue, isNew, kicker, headline }] na ordem de exibição.
     * Retorna { destroy }.
     */
    function mount(container, entries, { onOpen, onIntent }) {
        container.classList.add('bookcase');
        container.replaceChildren();

        const books = entries.map((entry) => buildBook(entry, onOpen, onIntent));
        const holos = books.map(attachHolo);
        let columns = 0;

        function layout() {
            const inner = container.clientWidth - px(container, 'padding-left') - px(container, 'padding-right');
            const next = columnsFor(inner, measure(container, '--book-w'), measure(container, '--shelf-gap'));
            if (next === columns && container.querySelector('.shelf-row')) return;
            columns = next;
            const rows = chunk(books, columns).map((rowBooks, index) => {
                const row = document.createElement('div');
                row.className = 'shelf-row';
                row.style.setProperty('--cols', String(columns));
                const plank = document.createElement('div');
                plank.className = 'shelf-plank';
                plank.setAttribute('aria-hidden', 'true');
                const label = document.createElement('span');
                label.className = 'shelf-label';
                const first = index * columns + 1;
                label.textContent = `#${first}–#${first + rowBooks.length - 1}`;
                plank.appendChild(label);
                const list = document.createElement('div');
                list.className = 'shelf-books';
                list.append(...rowBooks);
                row.append(list, plank);
                return row;
            });
            container.replaceChildren(...rows);
            container.dataset.columns = String(columns);
        }

        layout();
        // Um quadro, uma medição: o ResizeObserver dispara várias vezes durante o arrasto.
        let layoutFrame = 0;
        const scheduleLayout = () => {
            if (layoutFrame) return;
            layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; layout(); });
        };
        const observer = new ResizeObserver(scheduleLayout);
        observer.observe(container);

        // Paralaxe: o ponto de fuga da estante acompanha o mouse.
        let shelfRect = null;
        const measureShelf = () => { shelfRect = container.getBoundingClientRect(); };
        const onMove = (event) => {
            if (!shelfRect) measureShelf();
            container.style.setProperty('--vx', `${(((event.clientX - shelfRect.left) / shelfRect.width) * 100).toFixed(1)}%`);
        };
        const onLeave = () => container.style.removeProperty('--vx');
        const onScroll = () => { shelfRect = null; };
        if (finePointer() && !reducedMotion()) {
            container.addEventListener('pointerenter', measureShelf);
            window.addEventListener('resize', measureShelf);
            window.addEventListener('scroll', onScroll, { passive: true });
            container.addEventListener('pointermove', onMove);
            container.addEventListener('pointerleave', onLeave);
        }

        return {
            destroy() {
                observer.disconnect();
                cancelAnimationFrame(layoutFrame);
                for (const cancel of holos) cancel?.();
                container.removeEventListener('pointerenter', measureShelf);
                window.removeEventListener('resize', measureShelf);
                window.removeEventListener('scroll', onScroll);
                container.removeEventListener('pointermove', onMove);
                container.removeEventListener('pointerleave', onLeave);
            },
        };
    }

    return { columnsFor, chunk, mount };
});
