(() => {
    const viewer = document.createElement('dialog');
    viewer.className = 'character-viewer';
    viewer.innerHTML = '<button type="button" class="btn btn--small viewer-close" aria-label="Fechar ficha">Fechar ×</button><img alt=""><p></p>';
    document.body.appendChild(viewer);
    let previousFocus;
    const show = card => {
        if (viewer.open) return;
        previousFocus = card;
        const original = card.querySelector('img');
        const img = viewer.querySelector('img');
        applySiteImage(img, original.dataset.original || original.src, '90vw');
        img.alt = original.alt;
        viewer.querySelector('p').textContent = original.alt;
        viewer.showModal();
        document.body.classList.add('viewer-open');
    };
    document.querySelectorAll('.characters-roster .character-card').forEach(card => {
        card.tabIndex = 0; card.setAttribute('role', 'button');
        card.setAttribute('aria-label', card.dataset.locked === 'true' ? 'Ficha banida' : `Abrir ficha: ${card.querySelector('img').alt}`);
        card.addEventListener('click', () => {
            if (card.dataset.locked !== 'true') show(card);   // ficha banida: só o admin libera
        });
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
    });
    function unlock(card) {
        card.dataset.locked = 'false';
        card.querySelector('.crime-scene-overlay').hidden = true;
        const img = card.querySelector('img');
        if (img.dataset.nome) img.alt = img.dataset.nome;
        card.querySelector('.character-name').textContent = card.querySelector('img').alt;
        card.setAttribute('aria-label', `Abrir ficha: ${card.querySelector('img').alt}`);
    }
    // Só contas que o admin liberou no terminal veem a ficha banida.
    window.EnzoConta?.aoMudar(conta => {
        if (!conta.censuraLiberada()) return;
        document.querySelectorAll('.characters-roster .character-card[data-locked="true"]').forEach(unlock);
    });
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => { document.body.classList.remove('viewer-open'); previousFocus?.focus(); });
})();
