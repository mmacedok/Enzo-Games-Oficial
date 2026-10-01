// ============================================================================
// Músicas dos gibis (assets/audio/musicas.json): botões e balões que tocam um trecho de até 30 s dentro das páginas
// e a "Discografia" com as músicas completas (fim do capítulo no leitor e abaixo das fichas do ZeZoVerso).
//
// assets/audio/musicas.json:
//   { "<gibi>": {
//       "faixas":  [{ id, titulo, capa, completa }],
//       "trechos": [{ capitulo, pagina (1 = primeira página), faixa, clipe, letra, areas: [{ left, top, width, height }] }]
//   } }
// Os arquivos ficam em assets/audio/<gibi>/. Só uma música toca por vez no site inteiro.
// ============================================================================
(function () {
    const ARQUIVO = 'assets/audio/musicas.json';
    let dados = null;
    let promessa = null;

    function carregar() {
        promessa ??= fetch(ARQUIVO, { cache: 'no-cache' })
            .then((r) => (r.ok ? r.json() : {}))
            .catch(() => ({}))
            .then((d) => { dados = d || {}; return dados; });
        return promessa;
    }

    // ------------------------------------------------------------ um tocador só
    const audio = new Audio();
    audio.preload = 'none';
    let botaoAtivo = null;

    function marcar(botao, tocando) {
        if (!botao) return;
        botao.classList.toggle('musica-tocando', tocando);
        botao.setAttribute('aria-pressed', tocando ? 'true' : 'false');
        const rotulo = botao.querySelector('.musica-estado');
        if (rotulo) rotulo.textContent = tocando ? '⏸ Pausar' : '▶ Ouvir';
    }

    function parar() {
        audio.pause();
        marcar(botaoAtivo, false);
        botaoAtivo = null;
    }

    /** Toca (ou pausa) `src` no `botao`. Clicar em outro botão troca de música. */
    function alternar(src, botao) {
        if (botaoAtivo === botao && !audio.paused) { parar(); return; }
        parar();
        botaoAtivo = botao;
        audio.src = src;
        audio.currentTime = 0;
        marcar(botao, true);
        audio.play().catch(() => { marcar(botao, false); if (botaoAtivo === botao) botaoAtivo = null; });
    }
    audio.addEventListener('ended', parar);
    audio.addEventListener('error', parar);
    // Progresso das músicas completas (a barra do cartão da discografia).
    audio.addEventListener('timeupdate', () => {
        const barra = botaoAtivo?.closest('.disco-faixa')?.querySelector('.disco-progresso');
        if (barra && audio.duration) barra.style.setProperty('--progresso', `${(audio.currentTime / audio.duration) * 100}%`);
    });
    // Quem sai da página (ou troca de capítulo) não deixa a música tocando.
    window.addEventListener('pagehide', parar);

    // ------------------------------------------------------------ dentro das páginas
    /** Áreas clicáveis (botão da página ou balões de fala) de uma página: [] se ela não tem música. */
    function areasDaPagina(comicId, capituloId, indicePagina) {
        const trechos = dados?.[comicId]?.trechos || [];
        const achado = trechos.filter((t) => String(t.capitulo) === String(capituloId) && Number(t.pagina) === indicePagina + 1);
        const faixas = dados?.[comicId]?.faixas || [];
        const elementos = [];
        for (const trecho of achado) {
            const faixa = faixas.find((f) => f.id === trecho.faixa);
            const areas = [];
            for (const [i, caixa] of (trecho.areas || []).entries()) {
                const a = document.createElement('button');
                a.type = 'button';
                a.className = 'musica-area';
                a.style.left = caixa.left;
                a.style.top = caixa.top;
                a.style.width = caixa.width;
                a.style.height = caixa.height;
                a.setAttribute('aria-pressed', 'false');
                a.setAttribute('aria-label', `Ouvir um trecho de ${faixa?.titulo || 'a música'}`);
                a.title = `Ouvir um trecho: ${faixa?.titulo || ''}`.trim();
                a.appendChild(Object.assign(document.createElement('span'), { className: 'musica-estado', textContent: '▶ Ouvir' }));
                a.addEventListener('click', (e) => { e.stopPropagation(); areas.forEach((x) => x.classList.remove('musica-tocando')); alternar(trecho.clipe, a); });
                if (i > 0) a.classList.add('musica-area--sem-rotulo');
                areas.push(a);
            }
            // Várias áreas da mesma página (balões) acendem juntas, mas só a clicada guarda o estado de "tocando".
            elementos.push(...areas);
        }
        return elementos;
    }

    // ------------------------------------------------------------ discografia
    function formatarTempo(s) {
        if (!Number.isFinite(s)) return '';
        return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    }

    /** Seção "Discografia": capa, título e botão para tocar a música inteira. `comicId` limita a um gibi (senão, todos). */
    function criarDiscografia(comicId = null) {
        const gibis = comicId ? [comicId] : Object.keys(dados || {});
        const faixas = gibis.flatMap((id) => (dados?.[id]?.faixas || []).map((f) => ({ ...f, gibi: id })));
        if (!faixas.length) return null;
        const secao = document.createElement('section');
        secao.className = 'discografia';
        secao.setAttribute('aria-label', 'Discografia');
        const titulo = document.createElement('h2');
        titulo.className = 'discografia-titulo';
        titulo.textContent = '💿 Discografia';
        const lista = document.createElement('div');
        lista.className = 'discografia-lista';
        for (const f of faixas) {
            const cartao = document.createElement('article');
            cartao.className = 'disco-faixa';
            const capa = document.createElement('img');
            capa.className = 'disco-capa';
            capa.src = f.capa;
            capa.alt = `Capa de ${f.titulo}`;
            capa.loading = 'lazy';
            capa.decoding = 'async';
            const nome = document.createElement('h3');
            nome.className = 'disco-nome';
            nome.textContent = f.titulo;
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'disco-tocar';
            botao.setAttribute('aria-pressed', 'false');
            botao.appendChild(Object.assign(document.createElement('span'), { className: 'musica-estado', textContent: '▶ Ouvir' }));
            botao.addEventListener('click', (e) => { e.stopPropagation(); alternar(f.completa, botao); });
            const barra = document.createElement('div');
            barra.className = 'disco-progresso';
            barra.setAttribute('aria-hidden', 'true');
            cartao.append(capa, nome, botao, barra);
            lista.appendChild(cartao);
        }
        secao.append(titulo, lista);
        return secao;
    }

    window.EnzoMusicas = { carregar, areasDaPagina, criarDiscografia, parar, formatarTempo };
}());
