(async () => {
    const checks = [];
    const check = (ok, name) => { if (!ok) throw new Error(name); checks.push(name); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const path = location.pathname;
    check(document.documentElement.scrollWidth <= innerWidth + 2, 'sem overflow horizontal da página');
    if (path === '/' || path === '/index.html') {
        check(document.querySelectorAll('#hero-comic .hero-banner').length === 1, 'um hero');
        check(document.querySelector('#hero-comic .hero-kicker')?.textContent.includes('Capítulo 6'), 'destaque correto');
        const books = [...document.querySelectorAll('#comic-shelf .shelf-book')];
        check(books.length === 6, 'seis capítulos na estante');
        check(!books.some(b => b.dataset.comicId === 'degustador'), 'Degustador fora da home');
        check(!document.querySelector('#spinoffs'), 'sem seção de spin-off na home');
        const sizes = new Set(books.map(b => { return Math.round(b.querySelector('.book').offsetWidth) + 'x' + Math.round(b.querySelector('.book').offsetHeight); }));
        check(sizes.size === 1, 'todos os gibis do mesmo tamanho');
        const columns = Number(document.querySelector('#comic-shelf').dataset.columns);
        check(document.querySelectorAll('.shelf-row').length === Math.ceil(6 / columns), 'prateleiras conforme a largura');
        check(document.querySelectorAll('a[data-nav]').length === 3, 'navegação para extras');
        const copy = document.querySelector('[data-pix]');
        const original = navigator.clipboard.writeText;
        let copied;
        navigator.clipboard.writeText = async value => { copied = value; };
        copy.click(); await wait(0);
        check(copied === copy.dataset.pix && copy.textContent.includes('copiado'), 'PIX confirma somente após cópia');
        navigator.clipboard.writeText = async () => { throw new Error('negado'); };
        copy.click(); await wait(0);
        check(!document.querySelector('#pix-code').hidden, 'PIX oferece seleção manual quando negado');
        navigator.clipboard.writeText = original;
        document.querySelector('#pix-code').hidden = true;
    }
    if (path === '/personagens.html') {
        const cards = [...document.querySelectorAll('.characters-roster .character-card')];
        check(cards.length === 7 && cards.every(c => c.tabIndex === 0), 'sete fichas acessíveis por teclado');
        cards[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const viewer = document.querySelector('.character-viewer');
        check(viewer.open, 'ficha abre pelo teclado');
        viewer.querySelector('button').click();
        await wait(50);
        check(!viewer.open && document.activeElement === cards[0], 'fechar devolve foco');
        const locked = document.querySelector('[data-locked="true"]');
        locked.click();
        const input = document.querySelector('#password-input');
        input.value = 'errada'; document.querySelector('#password-submit').click();
        check(getComputedStyle(document.querySelector('#password-error')).display !== 'none', 'senha incorreta dá feedback');
        input.value = 'copodelagrimas'; document.querySelector('#password-submit').click();
        check(locked.dataset.locked === 'false' && viewer.open, 'senha correta revela e abre ficha');
        viewer.close();
    }
    if (path === '/reader.html') {
        check(document.querySelectorAll('.webtoon-image').length > 1, 'capítulo renderizado');
        const page = document.querySelector('.page-wrapper:not(.cover-wrapper)');
        const viewport = document.querySelector('#reader-viewport');
        document.querySelector('#zoom-reset-btn').click();
        await wait(250);
        const initial = page.getBoundingClientRect().width;
        document.querySelector('#zoom-in-btn').click();
        document.querySelector('#zoom-in-btn').click();
        await wait(250);
        check(page.getBoundingClientRect().width > initial * 1.4, 'zoom aumenta página de verdade');
        if (innerWidth < 800) check(viewport.scrollWidth > viewport.clientWidth, 'zoom permite rolagem horizontal');
        document.querySelector('#zoom-reset-btn').click();
        const mask = document.querySelector('.cabo-coco-mask');
        if (mask) {
            mask.click();
            const input = document.querySelector('#password-input');
            input.value = 'errada'; document.querySelector('#password-submit').click();
            check(getComputedStyle(document.querySelector('#password-error')).display !== 'none', 'leitor rejeita senha incorreta');
            input.value = 'copodelagrimas'; document.querySelector('#password-submit').click();
            await wait(550);
            check(!document.querySelector('.cabo-coco-mask'), 'leitor remove censura após senha');
        }
        const bar = document.querySelector('.floating-ui-container').getBoundingClientRect();
        check(document.querySelector('.page-wrapper').getBoundingClientRect().top >= bar.bottom - 12, 'barra não cobre a primeira página');
        const expand = document.querySelector('.page-expand-btn');
        if (expand) {
            expand.click();
            const viewer = document.querySelector('.page-viewer');
            check(viewer.open, 'página deitada abre ampliada');
            viewer.querySelector('.viewer-close').click();
        }
        const egg = document.querySelector('.easter-egg-trigger');
        if (egg) { egg.click(); check(!!egg.querySelector('.show-secret'), 'easter egg revela imagem'); }
        const pasta = document.querySelector('.macarronada-hotspot');
        if (pasta) { pasta.click(); check(!!document.querySelector('#macarronada-achievement'), 'conquista funciona'); }
        document.querySelector('#image-container img').click();
        check(document.body.classList.contains('ui-hidden'), 'toque esconde controles');
        document.querySelector('#image-container img').click();
    }
    if (path === '/degustador.html') {
        const livros = [...document.querySelectorAll('#comic-shelf .shelf-book')];
        check(livros.length >= 1 && livros.every(b => b.dataset.comicId === 'degustador' && b.dataset.chapterId), 'estante com as edições do spin-off');
        check(new Set(livros.map(b => b.querySelector('.book').offsetHeight)).size === 1, 'edições do mesmo tamanho');
        check(document.querySelector('#hero-comic .hero-banner'), 'destaque da edição mais recente');
        const title = document.querySelector('.batman-style-title');
        check(title.scrollWidth <= title.clientWidth + 2, 'título do Degustador cabe na tela');
        check(getComputedStyle(document.body).cursor.includes('mp5k'), 'cursor do tema ativo');
    }
    // Load every image, including below-the-fold panels, to catch broken assets.
    const images = [...document.images];
    await Promise.all(images.map(async img => {
        img.loading = 'eager';
        await Promise.race([img.decode().catch(() => {}), wait(10000)]);
        check(img.complete && img.naturalWidth > 0, `imagem carregada: ${img.alt || img.src}`);
    }));
    const bytes = performance.getEntriesByType('resource').filter(r => r.name.startsWith(location.origin)).reduce((sum, r) => sum + r.transferSize, 0);
    return { checks, localTransferBytes: bytes, imageCount: images.length };
})()
