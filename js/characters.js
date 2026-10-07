// Galeria de personagens: carrossel de estátuas de mármore (assets/Personagens/estatuas/, tarefa 10 do Codex).
// No celular desliza; no PC, setas. Ao clicar, a moldura voa para a esquerda da tela e a ficha e a descrição
// aparecem à direita. Enquanto a estátua não existir, a moldura mostra a ficha em tons de mármore.
(() => {
    const P = 'assets/Personagens/';
    const PERSONAGENS = [
        { id: 'enzo', nome: 'Enzo Games', ficha: 'Enzo games ficha.png',
          texto: 'Gato laranja, cínico e preguiçoso, fanático por macarronada, Yu-Gi-Oh! e pela vírgula. Odeia quarta-feira. Quando aperta, solta o Poder do Autismo, o Olho de Sans e os Motores de Macarronada em 300%. Única fraqueza: levar um tiro.' },
        { id: 'italolol', nome: 'ItaloLOL', ficha: 'Italolol.png',
          texto: 'O Otis. Cão amarelo desgrenhado que só fala latidos e "aura". Joga LoL escondido dentro dos carros (0/14/2, culpa do jungle) e dorme abraçado com a pelúcia do Ezreal. Na forma Otis Mercy ganha armadura, asas e auréola.' },
        { id: 'inominavel', nome: 'O Inominável', ficha: 'O Inominavel Ficha.png',
          texto: 'Líder da Legião do Mal. Mora numa mansão gótica (que na verdade é um barraco), fala besteira no Discord de falar besteira e carrega uma sniper com a bala dourada "Blasfêmia" e um RPG de ombro.' },
        { id: 'degustador', nome: 'Degustador da Noite', ficha: 'Degustador da noite Ficha.png',
          texto: 'Herói de fantasia caseira de Batman, com o gorro do Teemo e uma MP5K laranja neon. Grita sem vírgula, joga batarangues de vírgula, se defende com parênteses e invoca o Stand do Joinha. Base secreta: a Toradolândia.' },
        { id: 'banida', nome: 'Cabo Côco', ficha: 'Cabo Côco.png', bloqueada: true,
          texto: 'Ficha liberada pelo terminal. O que foi visto aqui não sai daqui.' },
        { id: 'superkid', nome: 'SuperKid', ficha: 'Superkid Ficha.png',
          texto: 'Garoto baixinho, sério e de bigode de adulto. Fica mais forte quanto mais besteira falam perto dele e farma aura por 67 segundos, invulnerável. Fraqueza: o pod.' },
        { id: 'hatsune-neves', nome: 'Hatsune Neves', ficha: 'Hatsune Neves Ficha.png',
          texto: 'Hatsune Miku de barba cheia e óculos. Invoca qualquer coisa do Magic, se tranca no Hikikomori Absoluto e tem uma caixa de correio que devolve os golpes em dobro. Só sai de casa para torneio presencial ou batalha planetária.' },
        { id: 'robozao', nome: 'Felipe Robozão', ficha: 'Felipe Robozão Ficha.png',
          texto: 'Fortão sem camisa que virou ciborgue: manteve o rosto, os óculos e as tatuagens, ganhou placas de metal e uma roda no lugar de cada perna. Supervelocidade e superaudição.' },
    ];
    const trilho = document.querySelector('[data-galeria]');
    if (!trilho) {
        // Fichas clássicas do ZeZoVerso preservadas.
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

        return;
    }
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // a estátua; se ainda não existir, a ficha "em mármore"
    function imagemEstatua(img, p, sizes) {
        img.onerror = () => { img.onerror = null; img.removeAttribute('srcset'); img.closest('.estatua-moldura')?.classList.add('sem-estatua'); applySiteImage(img, P + p.ficha, sizes); };
        applySiteImage(img, `${P}estatuas/estatua-${p.id}.png`, sizes);
    }

    PERSONAGENS.forEach((p) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'estatua';
        card.dataset.id = p.id;
        if (p.bloqueada) card.dataset.bloqueada = 'true';
        card.innerHTML = `<span class="estatua-moldura"><img alt="" loading="lazy" decoding="async" draggable="false">${p.bloqueada ? '<span class="crime-scene-overlay estatua-banida"><span>CONTEÚDO BANIDO<small>EM 456 PAÍSES</small></span></span>' : ''}</span><span class="estatua-placa"></span>`;
        imagemEstatua(card.querySelector('img'), p, '(max-width: 600px) 70vw, 300px');
        card._p = p;
        trilho.appendChild(card);
        rotular(card);
    });
    function rotular(card) {
        const p = card._p, banida = card.dataset.bloqueada === 'true';
        card.querySelector('.estatua-placa').textContent = banida ? '???' : p.nome;
        card.setAttribute('aria-label', banida ? 'Ficha banida' : `Ver ficha: ${p.nome}`);
    }

    // setas (PC)
    const esq = document.querySelector('.galeria-seta--esq');
    const dir = document.querySelector('.galeria-seta--dir');
    const passo = () => (trilho.querySelector('.estatua')?.getBoundingClientRect().width || 300) + 28;
    esq.addEventListener('click', () => trilho.scrollBy({ left: -passo(), behavior: reduzir ? 'auto' : 'smooth' }));
    dir.addEventListener('click', () => trilho.scrollBy({ left: passo(), behavior: reduzir ? 'auto' : 'smooth' }));
    function setas() {
        esq.disabled = trilho.scrollLeft <= 4;
        dir.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
    }
    trilho.addEventListener('scroll', setas, { passive: true });
    addEventListener('resize', setas);
    setas();
    trilho.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); dir.click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); esq.click(); }
    });

    // palco: moldura à esquerda, ficha e descrição à direita
    const palco = document.createElement('div');
    palco.className = 'galeria-palco';
    palco.hidden = true;
    palco.setAttribute('role', 'dialog');
    palco.setAttribute('aria-modal', 'true');
    palco.innerHTML = `
        <button type="button" class="btn btn--small galeria-fechar" aria-label="Fechar ficha">Fechar ×</button>
        <div class="galeria-palco-grade">
            <div class="galeria-alvo" aria-hidden="true"></div>
            <div class="galeria-info">
                <h2 class="galeria-nome"></h2>
                <p class="galeria-texto"></p>
                <a class="galeria-ficha" target="_blank" rel="noopener" title="Abrir a ficha inteira"><img alt=""></a>
            </div>
        </div>`;
    document.body.appendChild(palco);
    const alvo = palco.querySelector('.galeria-alvo');
    let aberto = null, voando = null;

    const DUR = reduzir ? 0 : 520;
    function voar(el, de, para, ida) {
        const dx = de.left - para.left, dy = de.top - para.top, s = de.width / para.width;
        const quadros = [
            { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
            { transform: 'translate(0, -18px) scale(1.03) rotate(-1.5deg)', offset: 0.6 },
            { transform: 'none' },
        ];
        return el.animate(ida ? quadros : quadros.reverse(), { duration: DUR, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'both' }).finished;
    }

    async function abrir(card) {
        if (aberto || voando) return;
        const p = card._p;
        aberto = card;
        palco.querySelector('.galeria-nome').textContent = p.nome;
        palco.querySelector('.galeria-texto').textContent = p.texto;
        const ficha = palco.querySelector('.galeria-ficha');
        ficha.href = P + p.ficha;
        const fimg = ficha.querySelector('img');
        applySiteImage(fimg, P + p.ficha, '(max-width: 760px) 90vw, 40vw');
        fimg.alt = `Ficha de ${p.nome}`;
        palco.setAttribute('aria-label', `Ficha: ${p.nome}`);
        palco.hidden = false;
        document.body.classList.add('viewer-open');
        // a moldura viaja: clone posto no alvo, animado a partir do lugar do card
        const clone = card.querySelector('.estatua-moldura').cloneNode(true);
        clone.classList.add('galeria-voadora');
        const orig = card.querySelector('img');
        if (!(orig.complete && orig.naturalWidth)) {   // card ainda não carregado (lazy): carrega no clone
            const ci = clone.querySelector('img');
            ci.loading = 'eager';
            imagemEstatua(ci, p, '(max-width: 760px) 72vw, 40vw');
        }
        alvo.replaceChildren(clone);
        card.classList.add('estatua--fora');
        requestAnimationFrame(() => palco.classList.add('aberto'));
        voando = voar(clone, card.querySelector('.estatua-moldura').getBoundingClientRect(), alvo.getBoundingClientRect(), true);
        await voando; voando = null;
        palco.querySelector('.galeria-fechar').focus({ preventScroll: true });
    }
    async function fechar() {
        if (!aberto || voando) return;
        const card = aberto;
        const clone = alvo.firstElementChild;
        palco.classList.remove('aberto');
        voando = voar(clone, card.querySelector('.estatua-moldura').getBoundingClientRect(), alvo.getBoundingClientRect(), false);
        await voando; voando = null;
        palco.hidden = true;
        alvo.replaceChildren();
        card.classList.remove('estatua--fora');
        document.body.classList.remove('viewer-open');
        aberto = null;
        card.focus({ preventScroll: true });
    }

    trilho.addEventListener('click', (e) => {
        const card = e.target.closest('.estatua');
        if (!card) return;
        if (card.dataset.bloqueada === 'true') {   // ficha banida: só o admin libera
            card.classList.remove('estatua--nega'); void card.offsetWidth; card.classList.add('estatua--nega');
            return;
        }
        abrir(card);
    });
    palco.querySelector('.galeria-fechar').addEventListener('click', fechar);
    palco.addEventListener('click', (e) => { if (e.target === palco || e.target.classList.contains('galeria-palco-grade')) fechar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && aberto) fechar(); });

    // Só contas que o admin liberou no terminal veem a ficha banida.
    window.EnzoConta?.aoMudar((conta) => {
        if (!conta.censuraLiberada()) return;
        trilho.querySelectorAll('.estatua[data-bloqueada="true"]').forEach((card) => {
            card.dataset.bloqueada = 'false';
            card.querySelector('.estatua-banida')?.remove();
            rotular(card);
        });
    });
})();
