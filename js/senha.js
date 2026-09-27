// ============================================================================
// Janela da senha do conteúdo banido — uma cópia só, para o leitor e as fichas.
// ============================================================================
(() => {
    'use strict';

    const SENHA = 'copodelagrimas';
    const ERRO_MS = 2000;

    /** Texto comparável: sem maiúsculas, espaços nem acentos. */
    const normalizar = (texto) => String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s/g, '');

    const confere = (texto) => normalizar(texto) === SENHA;

    let overlay = null;
    let input = null;
    let erro = null;
    let aberto = false;
    let focoAntes = null;
    let responder = null;

    function montar() {
        if (overlay) return;
        document.getElementById('password-modal-overlay')?.remove(); // cópia antiga que ainda esteja no HTML
        overlay = document.createElement('div');
        overlay.id = 'password-modal-overlay';
        overlay.className = 'password-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Desbloquear conteúdo');
        overlay.innerHTML = `
            <div id="password-modal" class="password-modal">
                <h3><span data-icone="sirene">🚨</span> Alerta <span data-icone="sirene">🚨</span></h3>
                <p><strong>Conteúdo banido em 456 países</strong><br>Insira a senha de acesso confidencial:</p>
                <input type="password" id="password-input" placeholder="Sua senha..." autocomplete="off">
                <div id="password-error" class="password-error"><span data-icone="acesso-negado">❌</span> Senha incorreta! Acesso negado.</div>
                <div class="password-actions">
                    <button type="button" id="password-submit" class="btn btn--danger">Decodificar</button>
                    <button type="button" id="password-cancel" class="btn btn--muted">Cancelar</button>
                </div>
            </div>`;
        for (const s of overlay.querySelectorAll('[data-icone]')) s.replaceWith(window.siteIcon?.(s.dataset.icone, s.textContent) ?? s);
        input = overlay.querySelector('#password-input');
        erro = overlay.querySelector('#password-error');
        input.setAttribute('aria-label', 'Senha de acesso');
        overlay.querySelector('#password-submit').addEventListener('click', confirmar);
        overlay.querySelector('#password-cancel').addEventListener('click', () => fechar(false));
        overlay.addEventListener('click', (event) => { if (event.target === overlay) fechar(false); });
        overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') { event.preventDefault(); fechar(false); return; }
            if (event.key === 'Enter' && event.target === input) { confirmar(); return; }
            if (event.key !== 'Tab') return;
            const itens = [...overlay.querySelectorAll('input, button')];
            event.preventDefault();
            itens[(itens.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1) + itens.length) % itens.length].focus();
        });
        document.body.appendChild(overlay);
    }

    function confirmar() {
        if (confere(input.value)) { fechar(true); return; }
        erro.style.display = 'block';
        input.value = '';
        setTimeout(() => { erro.style.display = 'none'; }, ERRO_MS);
    }

    /** Fecha a janela (se aberta) e devolve o foco a quem a abriu. */
    function fechar(confirmou = false) {
        if (!aberto) return;
        aberto = false;
        overlay.style.display = 'none';
        const resolver = responder;
        responder = null;
        focoAntes?.focus();
        resolver?.(confirmou);
    }

    /** Abre a janela e resolve true só quando a senha certa entra. */
    function pedir() {
        montar();
        return new Promise((resolve) => {
            aberto = true;
            focoAntes = document.activeElement;
            responder = resolve;
            input.value = '';
            erro.style.display = 'none';
            overlay.style.display = 'flex';
            input.focus();
        });
    }

    window.EnzoSenha = { pedir, confere, fechar };
})();
