(() => {
    window.applySiteImage = (img, source, sizes = '(max-width: 800px) 100vw, 800px') => {
        const info = window.SiteImages?.[source];
        if (!info) { img.src = source; return; }
        img.dataset.original = source;
        img.width = info.width; img.height = info.height;
        img.sizes = sizes;
        img.srcset = info.variants.map(v => `${v.src} ${v.width}w`).join(', ');
        img.src = info.variants[0].src;
    };
    window.siteImageUrl = source => window.SiteImages?.[source]?.variants[0].src || source;
    /**
     * Capas fora do formato 9:16 (ex.: 2:3) não podem ser cortadas: entram
     * inteiras e o espaço que sobra é preenchido pela própria capa desfocada.
     * Retorna true quando aplicou esse modo.
     */
    window.fitCover = (wrapper, source) => {
        const info = window.SiteImages?.[source];
        const letterbox = Boolean(info) && Math.abs(info.width / info.height - 9 / 16) > 0.03;
        wrapper.classList.toggle('cover-letterbox', letterbox);
        if (letterbox) wrapper.style.setProperty('--cover-bg', `url('${siteImageUrl(source)}')`);
        return letterbox;
    };
    window.playMacaroniTransition = url => {
        const wipe = document.getElementById('macaroni-wipe');
        wipe?.classList.remove('is-leaving');
        wipe?.classList.add('is-active');
        setTimeout(() => { location.href = url; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350);
    };
    addEventListener('pageshow', () => document.getElementById('macaroni-wipe')?.classList.remove('is-active'));

    // Logo: após a entrada das letras, liga os pulinhos em repouso.
    const logo = document.querySelector('.garfield-classic-logo');
    if (logo) setTimeout(() => logo.classList.add('logo-ready'), 1500);
    document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        playMacaroniTransition(el.dataset.nav);
    }));
    const copy = document.querySelector('[data-pix]');
    copy?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(copy.dataset.pix);
            copy.textContent = 'Código copiado!';
        } catch {
            const text = document.querySelector('#pix-code');
            text.hidden = false; text.value = copy.dataset.pix; text.focus(); text.select();
            copy.textContent = 'Selecione e copie o código abaixo';
        }
    });
})();
