// ============================================================================
// Prateleira de mídia da página Enzo Games.
//
// - Músicas (assets/audio/musicas.json, as mesmas da Discografia): discos de vinil 3D
//   ainda lacrados no plástico. Clicar toca a música inteira: o disco sai da capa girando.
// - Vídeos (assets/midia/videos.json): fitas cassete em pé na prateleira. Clicar faz a fita
//   voar (mostrando título e arte) para dentro do projetor, que projeta o vídeo na tela de cima.
//   Sem vídeos ainda: duas fitas "EM BREVE".
//
// assets/midia/videos.json: [{ "id", "titulo", "video": "assets/midia/videos/x.mp4",
//                              "arte": "assets/midia/videos/x.webp" (quadrada), "cor": "#ff8a1e" }]
// As peças desenhadas (vinil, plástico, fita) ficam em assets/midia/; sem elas, o CSS desenha tudo.
// ============================================================================
(function () {
    const VIDEOS = 'assets/midia/videos.json';
    const PECAS = [
        ['tem-disco', 'vinil-disco'], ['tem-plastico', 'vinil-plastico'], ['tem-adesivo', 'vinil-adesivo'],
        ['tem-fita', 'cassete-frente'], ['tem-lombada', 'cassete-lombada'], ['tem-brilho', 'cassete-caixa-brilho'],
        ['tem-projetor', 'projetor-corpo'], ['tem-rolo', 'projetor-rolo'],
        // Estantes próprias (tarefa 13): Discoteca = loja de discos, Videoteca = locadora.
        ['tem-dparede', 'discoteca/discoteca-parede'], ['tem-dtabua', 'discoteca/discoteca-tabua'],
        ['tem-dmoldura', 'discoteca/discoteca-moldura'], ['tem-dplaca', 'discoteca/discoteca-placa'],
        ['tem-vparede', 'videoteca/videoteca-parede'], ['tem-vtabua', 'videoteca/videoteca-tabua'],
        ['tem-vmoldura', 'videoteca/videoteca-moldura'], ['tem-vplaca', 'videoteca/videoteca-placa'],
        ['tem-vtela', 'videoteca/videoteca-tela-moldura'], ['tem-vsinal', 'videoteca/videoteca-sem-sinal'],
    ];
    // Enfeites soltos: [estante, classe, imagem]. Só aparecem se a imagem existir (e em telas largas, no CSS).
    const ENFEITES = [
        ['[data-midia-vinis]', 'disco-caixa', 'discoteca/discoteca-caixa-som'],
        ['[data-midia-vinis]', 'disco-toca', 'discoteca/discoteca-toca-discos'],
        ['[data-midia-vinis]', 'disco-cartaz', 'discoteca/discoteca-cartaz'],
        ['[data-midia-fitas]', 'video-pipoca', 'videoteca/videoteca-pipoca'],
        ['[data-midia-fitas]', 'video-claquete', 'videoteca/videoteca-claquete'],
        ['[data-midia-fitas]', 'video-pilha', 'videoteca/videoteca-pilha-fitas'],
        ['[data-midia-fitas]', 'video-cartaz', 'videoteca/videoteca-cartaz'],
    ];
    const EM_BREVE = [
        { id: 'em-breve-1', titulo: 'EM BREVE', cor: '#ff8a1e' },
        { id: 'em-breve-2', titulo: 'EM BREVE', cor: '#7b2cbf' },
    ];

    const ico = (nome) => {
        const e = document.createElement('span');
        e.className = `ico ico-${nome}`;
        e.setAttribute('aria-hidden', 'true');
        return e;
    };

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
        // url() em variável CSS é resolvida a partir do .css (css/assets/...): usa o caminho absoluto da página.
        caixa.style.setProperty('--capa', `url("${new URL(encodeURI(faixa.capa), document.baseURI).href}")`);

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
        linha.append(rotulo, (() => { const som = criar('span', 'vinil-som'); som.appendChild(ico('volume')); return som; })(), volume);
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

    // ------------------------------------------------------------ fitas + projetor
    // Clicar numa fita: ela sai da prateleira, voa para o meio da tela mostrando título e arte,
    // entra no projetor (canto superior direito da prateleira), os rolos giram e o vídeo
    // aparece na tela de cima, com os controles normais de vídeo. O projetor tem
    // fita anterior / tocar-pausar / próxima fita.
    const ARTE_PADRAO = 'assets/midia/fita-arte-em-breve.png';
    const cinema = { lista: [], lombadas: [], atual: -1, ocupado: false };

    /** Fita de frente (a que voa): etiqueta com arte e título. */
    function fitaFrente(video) {
        const fita = criar('div', 'fita-frente');
        fita.style.setProperty('--fita-cor', video.cor || '#ff8a1e');
        const etiqueta = criar('span', 'fita-etiqueta');
        const arte = criar('span', 'fita-arte');
        arte.style.backgroundImage = `url("${encodeURI(video.arte || ARTE_PADRAO)}")`;
        const textos = criar('span', 'fita-textos');
        textos.append(criar('span', 'fita-titulo', video.titulo), criar('span', 'fita-lado', video.video ? 'LADO A' : 'NOVIDADE CHEGANDO'));
        etiqueta.append(arte, textos);
        fita.append(criar('span', 'fita-carretel fita-carretel--e'), criar('span', 'fita-carretel fita-carretel--d'), etiqueta, criar('span', 'fita-brilho'));
        return fita;
    }

    function fitaLombada(video, indice) {
        const botao = criar('button', 'fita');
        botao.type = 'button';
        botao.setAttribute('aria-label', `Colocar a fita ${video.titulo} no projetor`);
        botao.style.setProperty('--fita-cor', video.cor || '#ff8a1e');
        const arte = criar('img', 'fita-lombada-arte');
        arte.src = video.arte || ARTE_PADRAO;
        arte.alt = '';
        arte.loading = 'lazy';
        botao.title = video.titulo;
        botao.append(arte, criar('span', 'fita-lombada-titulo', video.titulo));
        botao.addEventListener('click', () => colocarFita(indice));
        return botao;
    }

    const centro = (r) => [r.left + r.width / 2, r.top + r.height / 2];

    /** Voo da fita: lombada → meio da tela (de frente) → fenda do projetor. */
    async function voar(indice) {
        const de = cinema.lombadas[indice].getBoundingClientRect();
        const para = cinema.projetor.querySelector('.projetor-fenda').getBoundingClientRect();
        const voando = fitaFrente(cinema.lista[indice]);
        voando.classList.add('fita-voando');
        cinema.cinemaEl.closest('[data-midia]').appendChild(voando); // dentro da seção, para valerem as classes .tem-*
        const w = voando.getBoundingClientRect().width;
        const [x0, y0] = centro(de), [x2, y2] = centro(para);
        const x1 = innerWidth / 2, y1 = innerHeight / 2;
        const pos = (x, y, giro, escala) => `translate(${x - w / 2}px, ${y}px) translateY(-50%) rotate(${giro}deg) scale(${escala})`;
        const sEstreita = de.height / w;
        const animacao = voando.animate([
            { transform: pos(x0, y0, -90, sEstreita), opacity: 0.6 },
            { transform: pos(x1, y1, -4, 1), opacity: 1, offset: 0.32 },
            { transform: pos(x1, y1, 0, 1.04), opacity: 1, offset: 0.62 },
            { transform: pos(x2, y2, 18, 0.1), opacity: 1, offset: 0.94 },
            { transform: pos(x2, y2, 18, 0.06), opacity: 0 },
        ], { duration: 2400, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' });
        await animacao.finished.catch(() => {});
        voando.remove();
    }

    async function colocarFita(indice) {
        if (cinema.ocupado) return;
        if (indice === cinema.atual) { alternarVideo(); return; }
        cinema.ocupado = true;
        pararTela();
        cinema.lombadas.forEach((l, i) => l.classList.toggle('fita--fora', i === indice));
        cinema.projetor.classList.add('projetor--recebendo');
        const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduzir) await voar(indice);
        cinema.projetor.classList.remove('projetor--recebendo');
        cinema.atual = indice;
        cinema.ocupado = false;
        ligarTela(cinema.lista[indice]);
    }

    function pararTela() {
        const { video } = cinema;
        video.pause();
        video.removeAttribute('src');
        video.load();
        cinema.tela.classList.remove('midia-tela--ligada', 'midia-tela--video');
        cinema.feixe.classList.remove('midia-feixe--ligado');
        rodar(false);
    }

    /** Liga o projetor e mostra a fita na tela (vídeo ou cartão "em breve"). */
    function ligarTela(fita) {
        const { tela, video, espera } = cinema;
        espera.replaceChildren(fitaCartao(fita));
        tela.classList.add('midia-tela--ligada');
        cinema.feixe.classList.add('midia-feixe--ligado');
        desenharFeixe();
        if (fita.video) {
            window.EnzoMusicas?.parar();
            tela.classList.add('midia-tela--video');
            video.poster = fita.poster || fita.arte || ARTE_PADRAO;
            video.src = fita.video;
            video.play().catch(() => rodar(false));
        } else {
            rodar(true);
        }
    }

    function fitaCartao(fita) {
        const cartao = criar('div', 'tela-cartao');
        const arte = criar('img', 'tela-arte');
        arte.src = fita.arte || ARTE_PADRAO;
        arte.alt = '';
        cartao.append(arte, criar('span', 'tela-titulo', fita.titulo), criar('span', 'tela-sub', fita.video ? '' : 'Novidade chegando na Videoteca'));
        return cartao;
    }

    function rodar(ligado) {
        cinema.projetor.classList.toggle('projetor--rodando', ligado);
        cinema.botaoPlay.replaceChildren(ico(ligado ? 'pause' : 'play'));
        cinema.botaoPlay.setAttribute('aria-label', ligado ? 'Pausar' : 'Tocar');
    }

    function alternarVideo() {
        if (cinema.atual < 0) { colocarFita(0); return; }
        const fita = cinema.lista[cinema.atual];
        if (!fita.video) { rodar(!cinema.projetor.classList.contains('projetor--rodando')); return; }
        if (cinema.video.paused) cinema.video.play().catch(() => {});
        else cinema.video.pause();
    }

    const trocar = (passo) => {
        const n = cinema.lista.length;
        colocarFita(cinema.atual < 0 ? 0 : (cinema.atual + passo + n) % n);
    };

    /** Projetor (desenhado em CSS até chegarem as peças do Codex) com os três botões. */
    function montarProjetor() {
        const p = criar('div', 'projetor');
        const rolos = criar('span', 'projetor-rolos');
        rolos.append(criar('span', 'projetor-rolo projetor-rolo--tras'), criar('span', 'projetor-rolo projetor-rolo--frente'));
        p.append(rolos, criar('span', 'projetor-corpo'), criar('span', 'projetor-lente'), criar('span', 'projetor-fenda'));
        const botoes = criar('div', 'projetor-botoes');
        const b = (nome, rotulo, fn) => {
            const e = criar('button', 'projetor-botao');
            e.appendChild(ico(nome));
            e.type = 'button';
            e.setAttribute('aria-label', rotulo);
            e.addEventListener('click', fn);
            botoes.appendChild(e);
            return e;
        };
        b('anterior', 'Fita anterior', () => trocar(-1));
        cinema.botaoPlay = b('play', 'Tocar', alternarVideo);
        b('proximo', 'Próxima fita', () => trocar(1));
        p.appendChild(botoes);
        return p;
    }

    // Feixe de luz: polígono da lente até os cantos da tela (fecho convexo).
    function desenharFeixe() {
        const { feixe, cinemaEl, tela, projetor } = cinema;
        const base = cinemaEl.getBoundingClientRect();
        const t = tela.getBoundingClientRect();
        const l = projetor.querySelector('.projetor-lente').getBoundingClientRect();
        const lx = l.left + l.width * 0.25 - base.left, ly = l.top + l.height * 0.25 - base.top;
        // Com a moldura de cortina, a luz mira só a abertura (x 120→1160, y 90→640 de 1280×720).
        const aberta = cinemaEl.closest('[data-midia]').classList.contains('tem-vtela');
        const [ax, ay, aw, ah] = aberta ? [120 / 1280, 90 / 720, 1040 / 1280, 550 / 720] : [0, 0, 1, 1];
        const tx = t.left - base.left + t.width * ax, ty = t.top - base.top + t.height * ay;
        const tw = t.width * aw, th = t.height * ah;
        const pts = [[lx, ly], [tx, ty], [tx + tw, ty], [tx + tw, ty + th], [tx, ty + th]];
        feixe.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
        feixe.querySelector('polygon').setAttribute('points', fecho(pts).map((p) => p.map(Math.round).join(',')).join(' '));
        const g = feixe.querySelector('linearGradient');
        g.setAttribute('x1', lx); g.setAttribute('y1', ly);
        g.setAttribute('x2', tx + tw / 2); g.setAttribute('y2', ty + th / 2);
    }

    function fecho(pontos) {
        const p = pontos.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const meia = (lista) => {
            const h = [];
            for (const q of lista) {
                while (h.length >= 2 && cruz(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
                h.push(q);
            }
            h.pop();
            return h;
        };
        return meia(p).concat(meia(p.reverse()));
    }

    function montarCinema(secao, videos) {
        const cinemaEl = secao.querySelector('[data-midia-cinema]');
        const tela = secao.querySelector('[data-midia-tela]');
        const video = tela.querySelector('video');
        const espera = tela.querySelector('[data-midia-espera]');
        const feixe = secao.querySelector('[data-midia-feixe]');
        const estante = secao.querySelector('[data-midia-fitas]');
        Object.assign(cinema, { cinemaEl, tela, video, espera, feixe, lista: videos });
        cinema.projetor = montarProjetor();
        estante.appendChild(cinema.projetor);
        cinema.lombadas = videos.map((v, i) => estante.appendChild(fitaLombada(v, i)));
        video.addEventListener('play', () => rodar(true));
        video.addEventListener('pause', () => rodar(false));
        video.addEventListener('ended', () => rodar(false));
        addEventListener('resize', () => { if (cinema.atual >= 0) desenharFeixe(); });
    }

    // ------------------------------------------------------------ montagem
    async function montar() {
        const secao = document.querySelector('body.enzo-page [data-midia]');
        if (!secao) return;
        const estanteVinis = secao.querySelector('[data-midia-vinis]');

        // Peças desenhadas: cada uma liga sua classe só se a imagem existir (senão o CSS desenha).
        for (const [classe, nome] of PECAS) {
            const img = new Image();
            img.onload = () => secao.classList.add(classe);
            img.src = `assets/midia/${nome}.png`;
        }
        for (const [alvo, classe, nome] of ENFEITES) {
            const img = new Image();
            img.onload = () => {
                const e = criar('img', `enfeite enfeite--${classe}`);
                e.src = img.src;
                e.alt = '';
                e.setAttribute('aria-hidden', 'true');
                secao.querySelector(alvo)?.appendChild(e);
            };
            img.src = `assets/midia/${nome}.png`;
        }

        const musicas = (await window.EnzoMusicas?.carregar()) || {};
        const faixas = Object.values(musicas).flatMap((gibi) => gibi.faixas || []);
        for (const f of faixas) estanteVinis.appendChild(vinil(f));
        acompanharAudio();
        estanteVinis.closest('.midia-bloco').hidden = !faixas.length;

        const videos = await fetch(VIDEOS, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        montarCinema(secao, Array.isArray(videos) && videos.length ? videos : EM_BREVE);
        secao.hidden = false;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
    else montar();
}());
