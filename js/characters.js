(() => {
    const overlay = document.getElementById('password-modal-overlay');
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');
    let lockedCard = null;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Desbloquear personagem');
    input.setAttribute('aria-label', 'Senha de acesso');
    const viewer = document.createElement('dialog');
    viewer.className = 'character-viewer';
    viewer.innerHTML = '<button class="game-btn viewer-close" aria-label="Fechar ficha">Fechar ×</button><img alt=""><p></p>';
    document.body.appendChild(viewer);
    let previousFocus;
    const closePassword = () => { overlay.style.display = 'none'; lockedCard?.focus(); };
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
    document.querySelectorAll('.characters-roster .comic-book-style').forEach(card => {
        card.tabIndex = 0; card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Abrir ficha: ${card.querySelector('img').alt}`);
        card.addEventListener('click', () => {
            if (card.dataset.locked === 'true') {
                lockedCard = card; input.value = ''; error.style.display = 'none';
                overlay.style.display = 'flex'; input.focus();
            } else show(card);
        });
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
    });
    const check = () => {
        if (!lockedCard) return;
        if (input.value.toLowerCase().replace(/\s/g, '') !== 'copodelagrimas') {
            error.style.display = 'block'; input.select(); return;
        }
        lockedCard.dataset.locked = 'false';
        lockedCard.querySelector('.crime-scene-overlay').hidden = true;
        closePassword(); show(lockedCard);
    };
    document.getElementById('password-submit').addEventListener('click', check);
    document.getElementById('password-cancel').addEventListener('click', closePassword);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePassword(); });
    overlay.addEventListener('keydown', e => {
        if (e.key === 'Escape') closePassword();
        if (e.key === 'Enter' && e.target === input) check();
        if (e.key === 'Tab') {
            const items = [...overlay.querySelectorAll('input,button')];
            e.preventDefault(); items[(items.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
        }
    });
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => { document.body.classList.remove('viewer-open'); previousFocus?.focus(); });
    document.querySelector('[data-nav][role="link"]')?.addEventListener('keydown', e => { if (e.key === 'Enter') e.currentTarget.click(); });
})();
