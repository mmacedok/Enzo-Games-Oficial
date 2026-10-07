// A abertura aparece no máximo uma vez a cada 24 horas neste navegador.
(function () {
    const INTERVALO = 24 * 60 * 60 * 1000;
    const CHAVE = 'enzo-intro-macarronada-ultima-exibicao';
    // Cada página tem a sua abertura, com contagem de 24 h própria (a da Degustador não gasta a da home).
    const ABERTURAS = {
        padrao: { chave: CHAVE, video: 'assets/midia/videos/macarronada-cosmica.mp4', capa: 'assets/midia/videos/macarronada-cosmica-poster.jpg', nome: 'Macarronada Cósmica' },
        degustador: { chave: 'enzo-intro-degustador-ultima-exibicao', video: 'assets/midia/videos/degustador-cidade.mp4', capa: 'assets/midia/videos/degustador-cidade-poster.jpg', nome: 'Degustador da Noite' },
    };

    function podeMostrar(ultimo, agora = Date.now()) {
        const quando = Number(ultimo);
        if (ultimo === null || ultimo === '' || !Number.isFinite(quando) || quando <= 0) return true;
        return agora - quando >= INTERVALO;
    }
    if (typeof document === 'undefined') {
        if (typeof module !== 'undefined') module.exports = { podeMostrar, INTERVALO, CHAVE };
        return;
    }

    const ABERTURA = document.body?.classList.contains('theme-degustador') ? ABERTURAS.degustador : ABERTURAS.padrao;
    const VIDEO = ABERTURA.video;
    const CAPA = ABERTURA.capa;
    const CHAVE_PAGINA = ABERTURA.chave;

    let ultimo = null;
    try { ultimo = localStorage.getItem(CHAVE_PAGINA); } catch { /* navegador sem armazenamento */ }
    const mostrar = podeMostrar(ultimo) && !new URLSearchParams(location.search).has('semintro');
    let liberar;
    const pronto = new Promise(resolve => { liberar = resolve; });
    window.EnzoIntro = { pronto };
    if (!mostrar) { liberar(); return; }

    function iniciar() {
        // Reconfere: outra aba pode ter iniciado a abertura enquanto esta página carregava.
        try { if (!podeMostrar(localStorage.getItem(CHAVE_PAGINA))) { liberar(); return; } } catch { /* idem */ }
        const anterior = document.activeElement;
        const caixa = document.createElement('dialog');
        caixa.className = 'intro-dia';
        caixa.setAttribute('aria-label', 'Abertura: ' + ABERTURA.nome);
        caixa.innerHTML = `<video playsinline preload="auto" poster="${CAPA}"></video>
            <button type="button" class="intro-dia-btn intro-dia-som" aria-label="Ligar o som" hidden>🔇 Ligar som</button>
            <button type="button" class="intro-dia-btn intro-dia-tocar" hidden>Reproduzir abertura</button>
            <button type="button" class="intro-dia-btn intro-dia-fechar" aria-label="Fechar abertura">Fechar ×</button>`;
        const video = caixa.querySelector('video');
        const som = caixa.querySelector('.intro-dia-som');
        const tocar = caixa.querySelector('.intro-dia-tocar');
        const fechar = caixa.querySelector('.intro-dia-fechar');
        const overflowAntes = document.documentElement.style.overflow;
        let fechada = false;
        let desistir;

        function sair() { if (!fechada) caixa.close(); }
        caixa.addEventListener('close', () => {
            if (fechada) return;
            fechada = true;
            clearTimeout(desistir);
            video.pause();
            video.removeAttribute('src');
            video.load();
            caixa.remove();
            document.documentElement.style.overflow = overflowAntes;
            if (anterior?.isConnected) anterior.focus({ preventScroll: true });
            liberar();
            // O convite de visitante espera a abertura, sem disputar a tela com o filme.
            window.EnzoBaralhoUI?.chegadaVisitante?.();
        });
        caixa.addEventListener('cancel', e => { e.preventDefault(); sair(); });
        fechar.addEventListener('click', sair);
        som.addEventListener('click', () => {
            video.muted = false;
            som.hidden = true;
            video.play().catch(() => { tocar.hidden = false; });
        });
        tocar.addEventListener('click', () => {
            video.muted = false;
            video.play().then(() => { tocar.hidden = true; som.hidden = true; }).catch(() => {});
        });
        video.addEventListener('playing', () => { clearTimeout(desistir); tocar.hidden = true; });
        video.addEventListener('ended', sair);
        video.addEventListener('error', sair);
        document.body.appendChild(caixa);
        caixa.showModal();
        document.documentElement.style.overflow = 'hidden';
        // Conta a exibição da abertura, inclusive quando a pessoa escolhe fechar.
        try { localStorage.setItem(CHAVE_PAGINA, String(Date.now())); } catch { /* sem persistência */ }
        fechar.focus({ preventScroll: true });
        window.EnzoMusicas?.parar();
        video.src = VIDEO;
        desistir = setTimeout(() => { if (!video.currentTime && !fechada) sair(); }, 15000);
        video.play().catch(() => {
            if (fechada) return;
            video.muted = true;
            som.hidden = false;
            return video.play().catch(() => {
                if (fechada) return;
                clearTimeout(desistir);
                tocar.hidden = false;
            });
        });
        window.addEventListener('pagehide', sair, { once: true });
    }
    if (document.body) iniciar();
    else document.addEventListener('DOMContentLoaded', iniciar, { once: true });
})();
