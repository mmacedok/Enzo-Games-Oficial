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
    const tempo = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--');
    const players = []; // { faixa, barra, rotulo, volume, duracao }

    /** Inclinação 3D que segue o mouse: o mesmo código dos gibis da estante (js/shelf.js). */
    function seguirMouse(item) {
        let rect = null;
        let frame = 0;
        const medir = () => { rect = item.getBoundingClientRect(); };
        item.addEventListener('pointerenter', medir);
        window.addEventListener('resize', () => { rect = null; });
        window.addEventListener('scroll', () => { rect = null; }, { passive: true });
        item.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            if (!rect) medir();
            const nx = Math.min(1, Math.max(-1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
            const ny = Math.min(1, Math.max(-1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                item.classList.add('is-active');
                item.style.setProperty('--ry', `${(nx * 18).toFixed(2)}deg`);
                item.style.setProperty('--rx', `${(-ny * 10).toFixed(2)}deg`);
                item.style.setProperty('--mx', `${((nx + 1) * 50).toFixed(1)}%`);
                item.style.setProperty('--my', `${((ny + 1) * 50).toFixed(1)}%`);
            });
        });
        const soltar = () => {
            cancelAnimationFrame(frame);
            item.classList.remove('is-active');
            for (const p of ['--ry', '--rx', '--mx', '--my']) item.style.removeProperty(p);
        };
        item.addEventListener('pointerleave', soltar);
        item.addEventListener('pointercancel', soltar);
    }

    function vinil(faixa) {
        const caixa = criar('div', 'vinil');
        caixa.style.setProperty('--capa', `url("${encodeURI(faixa.capa)}")`);

        // o disco (clicar toca/pausa)
        const disco3d = criar('button', 'vinil-corpo');
        disco3d.type = 'button';
        disco3d.setAttribute('aria-label', `Ouvir ${faixa.titulo}`);
        const disco = criar('span', 'vinil-disco');
        disco.appendChild(criar('span', 'vinil-rotulo'));
        const capa = criar('span', 'vinil-capa');
        const arte = criar('img', 'vinil-arte');
        arte.src = faixa.capa;
        arte.alt = '';
        arte.loading = 'lazy';
        arte.decoding = 'async';
        capa.append(arte, criar('span', 'vinil-plastico'), criar('span', 'vinil-adesivo', 'LACRADO'));
        disco3d.append(criar('span', 'vinil-lombada'), disco, capa);

        // plaquinha com o player
        const player = criar('div', 'vinil-player');
        const play = criar('button', 'vinil-play');
        play.type = 'button';
        play.setAttribute('aria-pressed', 'false');
        play.setAttribute('aria-label', `Tocar ou pausar ${faixa.titulo}`);
        play.appendChild(criar('span', 'musica-estado', '▶'));
        const barra = criar('input', 'vinil-barra');
        Object.assign(barra, { type: 'range', min: 0, max: 1000, value: 0 });
        barra.setAttribute('aria-label', `Posição em ${faixa.titulo}`);
        const rotulo = criar('span', 'vinil-tempo', '0:00 / --:--');
        const volume = criar('input', 'vinil-volume');
        Object.assign(volume, { type: 'range', min: 0, max: 1, step: 0.05, value: window.EnzoMusicas.audio.volume });
        volume.setAttribute('aria-label', 'Volume');
        const linha = criar('div', 'vinil-player-linha');
        linha.append(rotulo, criar('span', 'vinil-som', '🔊'), volume);
        player.append(criar('span', 'vinil-nome', faixa.titulo), play, barra, linha);

        const info = { faixa, barra, rotulo, volume, duracao: NaN };
        players.push(info);
        // duração antes de tocar (só os metadados)
        const meta = new Audio();
        meta.preload = 'metadata';
        meta.addEventListener('loadedmetadata', () => { info.duracao = meta.duration; rotulo.textContent = `0:00 / ${tempo(meta.duration)}`; meta.removeAttribute('src'); });
        meta.src = faixa.completa;

        const tocar = () => window.EnzoMusicas.alternar(faixa.completa, play);
        play.addEventListener('click', tocar);
        disco3d.addEventListener('click', tocar);
        barra.addEventListener('input', () => {
            const audio = window.EnzoMusicas.audio;
            if (!ehAtual(faixa)) tocar();
            const ir = () => { if (audio.duration) audio.currentTime = (barra.value / 1000) * audio.duration; };
            if (audio.duration) ir(); else audio.addEventListener('loadedmetadata', ir, { once: true });
        });
        volume.addEventListener('input', () => {
            window.EnzoMusicas.audio.volume = Number(volume.value);
            for (const p of players) if (p.volume !== volume) p.volume.value = volume.value;
        });

        seguirMouse(caixa);
        caixa.append(disco3d, player);
        return caixa;
    }

    function ehAtual(faixa) {
        const src = window.EnzoMusicas.audio.src;
        return Boolean(src) && decodeURI(src).endsWith(faixa.completa);
    }

    // Barra e tempo do disco que está tocando.
    function acompanharAudio() {
        const audio = window.EnzoMusicas?.audio;
        if (!audio) return;
        audio.addEventListener('timeupdate', () => {
            const p = players.find((x) => ehAtual(x.faixa));
            if (!p || !audio.duration) return;
            p.barra.value = Math.round((audio.currentTime / audio.duration) * 1000);
            p.rotulo.textContent = `${tempo(audio.currentTime)} / ${tempo(audio.duration)}`;
        });
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
        acompanharAudio();
        estanteVinis.closest('.midia-bloco').hidden = !faixas.length;

        const videos = await fetch(VIDEOS, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        for (const v of (Array.isArray(videos) && videos.length ? videos : EM_BREVE)) estanteFitas.appendChild(fitaLombada(v));

        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') guardarFita(); });
        secao.hidden = false;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
    else montar();
}());
