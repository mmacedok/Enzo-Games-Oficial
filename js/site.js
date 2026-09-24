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
        // Endereço completo: url() dentro de variável CSS seria lido a partir de css/.
        if (letterbox) wrapper.style.setProperty('--cover-bg', `url('${new URL(siteImageUrl(source), document.baseURI).href}')`);
        return letterbox;
    };
    /**
     * Ícone de gibi: usa assets/ui/<nome>.png quando a arte já existe (o build
     * registra em SiteImages); até lá, mostra o emoji. Lista em docs/ICONES-GIBI.md.
     */
    window.siteIcon = (nome, emoji, className = 'ui-icone') => {
        const source = `assets/ui/${nome}.png`;
        if (window.SiteImages?.[source]) {
            const img = document.createElement('img');
            img.className = className;
            img.alt = '';
            img.src = siteImageUrl(source);
            img.decoding = 'async';
            return img;
        }
        const span = document.createElement('span');
        span.className = `${className} ui-icone--emoji`;
        span.setAttribute('aria-hidden', 'true');
        span.textContent = emoji;
        return span;
    };

    /**
     * Aviso de rodapé no estilo recordatório de gibi (conquistas, leitura retomada).
     * { id, icon: [nome, emoji], burst: 'CONQUISTA!', label, text }. Mesmo id não repete.
     */
    window.siteToast = ({ id, icon, burst = '', label = '', text = '' }) => {
        if (id && document.getElementById(id)) return;
        const popup = document.createElement('div');
        if (id) popup.id = id;
        popup.className = 'achievement-popup';
        popup.setAttribute('role', 'status');
        if (burst) {
            const estouro = document.createElement('span');
            estouro.className = 'achievement-burst';
            estouro.textContent = burst;
            popup.appendChild(estouro);
        }
        const icone = document.createElement('div');
        icone.className = 'achievement-icon';
        icone.appendChild(window.siteIcon(icon[0], icon[1]));
        const corpo = document.createElement('div');
        const rotulo = document.createElement('div');
        rotulo.className = 'achievement-label';
        rotulo.textContent = label;
        const texto = document.createElement('div');
        texto.className = 'achievement-text';
        texto.textContent = text;
        corpo.append(rotulo, texto);
        popup.append(icone, corpo);
        document.body.appendChild(popup);
        void popup.offsetWidth;
        popup.classList.add('show');
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 600);
        }, 4200);
    };

    // Navegação direta (a antiga cortina de macarronada foi removida a pedido).
    window.playMacaroniTransition = url => { location.href = url; };

    // Logo: após a entrada das letras, liga os pulinhos em repouso.
    const logo = document.querySelector('.garfield-classic-logo');
    if (logo) setTimeout(() => logo.classList.add('logo-ready'), 1500);
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
