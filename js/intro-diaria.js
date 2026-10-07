// Intro do dia: na primeira visita de cada dia, a animação "Macarronada Cósmica" toca por cima do site.
// Botão discreto de fechar no canto superior direito; também fecha com Esc e quando o vídeo termina.
// Não aparece para robôs de teste (navigator.webdriver), com ?semintro na URL nem com "reduzir movimento".
(function () {
    const CHAVE = 'enzo-intro-dia';
    const VIDEO = 'assets/intro/macarronada-cosmica.mp4';
    const CAPA = 'assets/intro/macarronada-cosmica.jpg';
    const d = new Date();
    const hoje = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    let visto = null;
    try { visto = localStorage.getItem(CHAVE); } catch (e) { /* armazenamento bloqueado: mostra mesmo assim */ }
    if (visto === hoje || navigator.webdriver || new URLSearchParams(location.search).has('semintro')) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { localStorage.setItem(CHAVE, hoje); } catch (e) { /* idem */ }

    const estilo = document.createElement('style');
    estilo.textContent = `
        .intro-dia { position: fixed; inset: 0; z-index: 2147483000; background: #000; opacity: 0; transition: opacity .45s ease; }
        .intro-dia.aberta { opacity: 1; }
        .intro-dia video { width: 100%; height: 100%; object-fit: contain; display: block; background: #000; }
        .intro-dia-btn { position: absolute; top: max(12px, env(safe-area-inset-top)); width: 34px; height: 34px; border-radius: 50%;
            border: 1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.35); color: rgba(255,255,255,.75);
            font: 18px/1 system-ui, sans-serif; display: grid; place-items: center; cursor: pointer; padding: 0;
            opacity: .5; transition: opacity .2s, background .2s, color .2s; }
        .intro-dia-btn:hover, .intro-dia-btn:focus-visible { opacity: 1; background: rgba(0,0,0,.65); color: #fff; outline: none; }
        .intro-dia-fechar { right: max(12px, env(safe-area-inset-right)); }
        .intro-dia-som { right: calc(max(12px, env(safe-area-inset-right)) + 44px); font-size: 15px; }
    `;
    document.head.appendChild(estilo);

    const caixa = document.createElement('div');
    caixa.className = 'intro-dia';
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    caixa.setAttribute('aria-label', 'Abertura: Macarronada Cósmica');
    caixa.innerHTML = `
        <video playsinline preload="auto" poster="${CAPA}"></video>
        <button type="button" class="intro-dia-btn intro-dia-som" aria-label="Ligar o som" hidden>🔇</button>
        <button type="button" class="intro-dia-btn intro-dia-fechar" aria-label="Fechar abertura">✕</button>`;
    const video = caixa.querySelector('video');
    const som = caixa.querySelector('.intro-dia-som');
    const fechar = caixa.querySelector('.intro-dia-fechar');
    const overflowAntes = document.documentElement.style.overflow;
    let fechada = false;

    function sair() {
        if (fechada) return;
        fechada = true;
        clearTimeout(desistir);
        document.removeEventListener('keydown', tecla);
        video.pause();
        caixa.classList.remove('aberta');
        setTimeout(() => { caixa.remove(); estilo.remove(); document.documentElement.style.overflow = overflowAntes; }, 480);
    }
    function tecla(e) { if (e.key === 'Escape') sair(); }

    fechar.addEventListener('click', sair);
    som.addEventListener('click', () => { video.muted = false; som.hidden = true; });
    video.addEventListener('ended', sair);
    video.addEventListener('error', sair);
    document.addEventListener('keydown', tecla);
    // internet lenta: se o vídeo não começar em 8 s, a abertura sai do caminho
    const desistir = setTimeout(() => { if (video.currentTime === 0) sair(); }, 8000);

    function abrir() {
        document.body.appendChild(caixa);
        document.documentElement.style.overflow = 'hidden';
        video.src = VIDEO;
        requestAnimationFrame(() => caixa.classList.add('aberta'));
        fechar.focus({ preventScroll: true });
        // tenta com som; se o navegador bloquear, toca mudo e mostra o botão de som
        video.play().catch(() => {
            video.muted = true;
            som.hidden = false;
            return video.play().catch(sair);
        });
    }
    if (document.body) abrir(); else document.addEventListener('DOMContentLoaded', abrir);
})();
