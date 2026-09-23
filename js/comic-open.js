// ============================================================================
// Animação de "entrar no gibi": ao escolher uma edição, o gibi voa da estante
// para o centro da tela, a capa abre mostrando a primeira página e a câmera
// mergulha na página. Só então o leitor carrega (ele continua a entrada).
//
// Uso: EnzoOpen.fly({ source, coverSrc, pageSrc }).then(() => location.href = ...)
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

    async function fly({ source, coverSrc, pageSrc }) {
        if (running) return new Promise(() => {}); // clique duplo: ignora
        if (!source || reducedMotion() || typeof Element.prototype.animate !== 'function') return;
        running = true;

        const rect = source.getBoundingClientRect();
        const vw = innerWidth;
        const vh = innerHeight;
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

        const page = element('div', 'comic-fly-page', book);
        const pageImg = element('img', '', page);
        pageImg.alt = '';
        if (pageSrc) pageImg.src = pageSrc;

        const cover = element('div', 'comic-fly-cover', book);
        const coverFront = element('div', 'comic-fly-cover-front', cover);
        const coverImg = element('img', '', coverFront);
        coverImg.alt = '';
        coverImg.src = coverSrc;
        element('div', 'comic-fly-cover-back', cover);
        const flash = element('div', 'comic-fly-flash', stage);

        document.body.appendChild(stage);
        source.classList.add('is-flying-source');

        // Ponto de partida: exatamente onde está o gibi clicado.
        const dx = rect.left + rect.width / 2 - vw / 2;
        const dy = rect.top + rect.height / 2 - vh / 2;
        const scale = rect.width / width;
        const from = `translate(${dx}px, ${dy}px) scale(${scale}) rotateY(18deg)`;

        // 1) Voa até o centro enquanto o fundo escurece.
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'forwards', easing: 'ease-out' });
        await book.animate(
            [{ transform: from }, { transform: 'translate(0, 0) scale(1.04) rotateY(-4deg)', offset: 0.8 }, { transform: 'translate(0, 0) scale(1) rotateY(0deg)' }],
            { duration: 560, fill: 'forwards', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        ).finished;

        // 2) A capa abre para a esquerda, revelando a primeira página.
        book.animate(
            [{ transform: 'translateX(0) scale(1)' }, { transform: `translateX(${width * 0.18}px) scale(1)` }],
            { duration: 620, fill: 'forwards', easing: 'ease-in-out' },
        );
        await cover.animate(
            [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-165deg)' }],
            { duration: 620, fill: 'forwards', easing: 'cubic-bezier(0.45, 0, 0.2, 1)' },
        ).finished;

        // 3) Mergulho: a página cresce até tomar a tela e tudo vira a cor do leitor.
        const zoom = Math.max(vw / width, vh / height) * 2.2;
        book.animate(
            [{ transform: `translateX(${width * 0.18}px) scale(1)` }, { transform: `translateX(${width * 0.18}px) scale(${zoom})` }],
            { duration: 520, fill: 'forwards', easing: 'cubic-bezier(0.6, 0, 0.9, 0.4)' },
        );
        await flash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 520, fill: 'forwards' }).finished;

        try { sessionStorage.setItem(ENTER_FLAG, '1'); } catch { /* modo privado: só perde a entrada suave */ }
    }

    window.EnzoOpen = { fly, preload, largeImageUrl, ENTER_FLAG };
})();
