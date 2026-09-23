(async () => {
    const select = document.querySelector('#chapter-select');
    const start = location.href;
    for (const el of document.querySelectorAll('.floating-island')) {
        const box = el.getBoundingClientRect();
        if (box.left < 0 || box.right > innerWidth) throw new Error('controle do leitor fora da tela');
    }
    const marker = window.__readerQa = {};
    const assert = (ok, message) => { if (!ok) throw new Error(message); };
    document.querySelector('#zoom-in-btn').click();
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    assert(location.href !== start, 'URL muda na seleção');
    assert(window.__readerQa === marker, 'sem reload');
    assert(localStorage.getItem('reader-zoom') === '1.25', 'zoom persistente');
    const back = new Promise(resolve => addEventListener('popstate', resolve, { once: true }));
    history.back(); await back;
    assert(location.href === start && select.selectedIndex === 0, 'voltar restaura gibi e seleção');
    const forward = new Promise(resolve => addEventListener('popstate', resolve, { once: true }));
    history.forward(); await forward;
    assert(select.selectedIndex === 1, 'avançar restaura seleção');
    return { history: 'ok', zoom: localStorage.getItem('reader-zoom'), images: document.querySelectorAll('.webtoon-image').length };
})()
