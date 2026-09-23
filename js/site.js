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
    window.playMacaroniTransition = url => {
        const wipe = document.getElementById('macaroni-wipe');
        wipe?.classList.remove('is-leaving');
        wipe?.classList.add('is-active');
        setTimeout(() => { location.href = url; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350);
    };
    addEventListener('pageshow', () => document.getElementById('macaroni-wipe')?.classList.remove('is-active'));

    // Logo: após a entrada das letras, liga os pulinhos; os olhos do Enzo seguem o mouse.
    const logo = document.querySelector('.garfield-classic-logo');
    if (logo) {
        setTimeout(() => logo.classList.add('logo-ready'), 1500);
        const pupils = logo.querySelector('.logo-pupils');
        const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (pupils && !calmo && matchMedia('(hover: hover)').matches) {
            let frame = 0;
            addEventListener('pointermove', (event) => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    const box = logo.querySelector('.logo-cat').getBoundingClientRect();
                    const dx = event.clientX - (box.left + box.width / 2);
                    const dy = event.clientY - (box.top + box.height * 0.75);
                    const dist = Math.hypot(dx, dy) || 1;
                    const alcance = Math.min(1, dist / 300);
                    pupils.style.transform = `translate(${(dx / dist) * 7 * alcance}px, ${(dy / dist) * 7 * alcance - 4}px)`;
                });
            }, { passive: true });
        }
    }
    // Links reais (<a href>) continuam funcionando com Ctrl/⌘ ou botão do meio.
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
