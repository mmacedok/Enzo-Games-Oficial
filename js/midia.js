// ============================================================================
// Prateleira de mídia da página de personagens.
//
// - Músicas (assets/audio/musicas.json, as mesmas da Discografia): discos de vinil 3D
//   ainda lacrados no plástico. Clicar toca a música inteira: o disco sai da capa girando.
// - Vídeos (assets/midia/videos.json): fitas cassete em pé na prateleira. Clicar puxa a
//   fita para fora e ela aparece deitada, com o título na etiqueta; clicar nela abre o vídeo.
//   Sem vídeos ainda: duas fitas "EM BREVE".
//
// assets/midia/videos.json: [{ "id", "titulo", "video": "assets/midia/videos/x.mp4", "cor": "#ff8a1e" }]
// As peças desenhadas (vinil, plástico, fita) ficam em assets/midia/; sem elas, o CSS desenha tudo.
// ============================================================================
(function () {
    const VIDEOS = 'assets/midia/videos.json';
    const PECAS = [
        ['tem-disco', 'vinil-disco'], ['tem-plastico', 'vinil-plastico'], ['tem-adesivo', 'vinil-adesivo'],
        ['tem-fita', 'cassete-frente'], ['tem-lombada', 'cassete-lombada'], ['tem-brilho', 'cassete-caixa-brilho'],
    ];
    const EM_BREVE = [
        { id: 'em-breve-1', titulo: 'EM BREVE', cor: '#ff8a1e' },
        { id: 'em-breve-2', titulo: 'EM BREVE', cor: '#7b2cbf' },
    ];

    const criar = (tag, classe, texto) => {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto) e.textContent = texto;
        return e;
    };

    // ------------------------------------------------------------ vinis
    function vinil(faixa) {
        const botao = criar('button', 'vinil');
        botao.type = 'button';
        botao.setAttribute('aria-pressed', 'false');
        botao.setAttribute('aria-label', `Ouvir ${faixa.titulo}`);
        botao.style.setProperty('--capa', `url("${encodeURI(faixa.capa)}")`);

        const corpo = criar('span', 'vinil-corpo');
        const disco = criar('span', 'vinil-disco');
        disco.appendChild(criar('span', 'vinil-rotulo'));
        const capa = criar('span', 'vinil-capa');
        const arte = criar('img', 'vinil-arte');
        arte.src = faixa.capa;
        arte.alt = '';
        arte.loading = 'lazy';
        arte.decoding = 'async';
        capa.append(arte, criar('span', 'vinil-plastico'), criar('span', 'vinil-adesivo', 'LACRADO'));
        corpo.append(criar('span', 'vinil-lombada'), disco, capa);

        botao.append(corpo, criar('span', 'vinil-nome', faixa.titulo), criar('span', 'musica-estado', '▶ Ouvir'));
        botao.addEventListener('click', () => window.EnzoMusicas.alternar(faixa.completa, botao));
        return botao;
    }

    // ------------------------------------------------------------ fitas
    let palco = null;
    let fitaFora = null;

    function guardarFita() {
        if (!fitaFora) return;
        fitaFora.classList.remove('fita--fora');
        fitaFora.setAttribute('aria-expanded', 'false');
        fitaFora = null;
        palco.hidden = true;
        palco.replaceChildren();
    }

    function abrirVideo(video) {
        const dialogo = criar('dialog', 'fita-video');
        const player = criar('video');
        player.src = video.video;
        player.controls = true;
        player.autoplay = true;
        player.playsInline = true;
        const fechar = criar('button', 'fita-video-fechar', 'Fechar');
        fechar.type = 'button';
        fechar.addEventListener('click', () => dialogo.close());
        dialogo.addEventListener('close', () => { player.pause(); dialogo.remove(); });
        dialogo.append(player, fechar);
        document.body.appendChild(dialogo);
        window.EnzoMusicas?.parar();
        dialogo.showModal();
    }

    /** Fita deitada (vista de frente) com o título na etiqueta. */
    function fitaFrente(video) {
        const temVideo = Boolean(video.video);
        const fita = criar(temVideo ? 'button' : 'div', 'fita-frente');
        if (temVideo) {
            fita.type = 'button';
            fita.setAttribute('aria-label', `Assistir ${video.titulo}`);
            fita.addEventListener('click', () => abrirVideo(video));
        }
        fita.style.setProperty('--fita-cor', video.cor || '#ff8a1e');
        const etiqueta = criar('span', 'fita-etiqueta');
        etiqueta.append(criar('span', 'fita-titulo', video.titulo), criar('span', 'fita-lado', temVideo ? 'LADO A · ▶ ASSISTIR' : 'NOVIDADE CHEGANDO'));
        fita.append(criar('span', 'fita-carretel fita-carretel--e'), criar('span', 'fita-carretel fita-carretel--d'), etiqueta, criar('span', 'fita-brilho'));
        return fita;
    }

    function fitaLombada(video) {
        const botao = criar('button', 'fita');
        botao.type = 'button';
        botao.setAttribute('aria-expanded', 'false');
        botao.setAttribute('aria-label', `Tirar a fita ${video.titulo} da prateleira`);
        botao.style.setProperty('--fita-cor', video.cor || '#ff8a1e');
        botao.appendChild(criar('span', 'fita-lombada-titulo', video.titulo));
        botao.addEventListener('click', () => {
            if (fitaFora === botao) { guardarFita(); return; }
            guardarFita();
            fitaFora = botao;
            botao.classList.add('fita--fora');
            botao.setAttribute('aria-expanded', 'true');
            palco.replaceChildren(fitaFrente(video));
            palco.hidden = false;
        });
        return botao;
    }

    // ------------------------------------------------------------ montagem
    async function montar() {
        const secao = document.querySelector('[data-midia]');
        if (!secao) return;
        const estanteVinis = secao.querySelector('[data-midia-vinis]');
        const estanteFitas = secao.querySelector('[data-midia-fitas]');
        palco = secao.querySelector('[data-midia-palco]');

        // Peças desenhadas: cada uma liga sua classe só se a imagem existir (senão o CSS desenha).
        for (const [classe, nome] of PECAS) {
            const img = new Image();
            img.onload = () => secao.classList.add(classe);
            img.src = `assets/midia/${nome}.png`;
        }

        const musicas = (await window.EnzoMusicas?.carregar()) || {};
        const faixas = Object.values(musicas).flatMap((gibi) => gibi.faixas || []);
        for (const f of faixas) estanteVinis.appendChild(vinil(f));
        estanteVinis.closest('.midia-bloco').hidden = !faixas.length;

        const videos = await fetch(VIDEOS, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        for (const v of (Array.isArray(videos) && videos.length ? videos : EM_BREVE)) estanteFitas.appendChild(fitaLombada(v));

        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') guardarFita(); });
        secao.hidden = false;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
    else montar();
}());
