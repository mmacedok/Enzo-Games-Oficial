// ============================================================================
// Painel de guerra do terminal admin (dados reais de /api/admin/acessos/radar):
//   RADAR    mapa-múndi de pontos com varredura; cada IP rastreado vira um alvo, e acesso novo dá um "ping"
//   TRÁFEGO  acessos por hora nas últimas 24 h (logados x sem login) + osciloscópio
//   FEED     os últimos eventos, ao vivo (clique numa linha para investigar o IP)
//   MEMÓRIA  hexdump rolando (enfeite)
// window.EnzoDeck.montar(container, { compacto }) desenha tudo dentro de `container` e devolve { parar }.
// Cores seguem a regra do admin-hacker.css (laranja = rede/lugar, violeta = tempo, etc.).
// ============================================================================
(() => {
    'use strict';
    const COR = { neon: '#39ff88', ciano: '#26f3ff', magenta: '#ff3df0', ambar: '#ffc247', laranja: '#ff8a3d', violeta: '#a78bff', azul: '#5aa8ff', vermelho: '#ff5a4d' };
    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto !== undefined) e.textContent = texto; return e; };

    // ---------------------------------------------------------------- continentes (grosseiros, [lon, lat])
    const TERRA = [
        [[-168, 66], [-162, 70], [-140, 70], [-125, 70], [-95, 72], [-80, 73], [-62, 66], [-55, 52], [-66, 45], [-70, 41], [-76, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 21], [-90, 21], [-87, 21], [-88, 16], [-83, 10], [-78, 8], [-80, 7], [-85, 10], [-92, 14], [-105, 20], [-110, 24], [-113, 31], [-117, 32], [-121, 35], [-124, 41], [-124, 48], [-130, 54], [-140, 60], [-150, 60], [-158, 57], [-165, 60], [-166, 64]],
        [[-73, 78], [-60, 82], [-30, 83], [-20, 78], [-20, 70], [-30, 68], [-43, 60], [-52, 65], [-58, 75]],
        [[-78, 8], [-72, 12], [-62, 11], [-52, 5], [-50, 0], [-44, -2], [-35, -5], [-35, -9], [-39, -14], [-39, -19], [-42, -23], [-48, -26], [-49, -29], [-53, -34], [-58, -35], [-57, -38], [-62, -39], [-65, -41], [-64, -46], [-68, -50], [-69, -54], [-72, -53], [-74, -47], [-73, -40], [-72, -30], [-70, -18], [-76, -14], [-81, -6], [-80, -1], [-78, 2]],
        [[-10, 36], [-9, 43], [-1, 44], [-4, 48], [2, 51], [8, 54], [9, 57], [5, 60], [5, 63], [14, 68], [24, 71], [40, 68], [60, 70], [70, 73], [90, 76], [105, 77], [130, 72], [160, 70], [180, 68], [180, 65], [170, 60], [160, 55], [157, 51], [143, 53], [140, 48], [135, 43], [128, 40], [127, 35], [122, 39], [121, 31], [119, 25], [110, 21], [108, 18], [106, 10], [100, 13], [104, 1], [98, 8], [97, 16], [92, 22], [88, 22], [80, 15], [77, 8], [73, 17], [68, 23], [57, 25], [57, 27], [50, 30], [48, 29], [51, 25], [56, 26], [59, 22], [53, 17], [44, 12], [38, 22], [34, 28], [35, 33], [30, 36], [27, 37], [26, 40], [23, 37], [19, 40], [14, 45], [12, 44], [16, 38], [10, 44], [3, 43], [-1, 37]],
        [[-17, 21], [-16, 28], [-10, 35], [-5, 36], [10, 37], [11, 33], [20, 31], [32, 31], [35, 28], [43, 12], [51, 12], [43, -2], [40, -10], [40, -16], [35, -24], [33, -28], [27, -34], [20, -35], [17, -30], [12, -17], [13, -8], [9, -1], [9, 4], [4, 6], [-8, 4], [-14, 10], [-17, 14]],
        [[114, -22], [122, -18], [130, -12], [136, -12], [142, -11], [146, -19], [153, -26], [151, -34], [146, -39], [138, -35], [130, -32], [115, -34]],
        [[-5, 50], [2, 51], [0, 54], [-3, 58], [-6, 56]],
        [[130, 31], [141, 35], [142, 41], [140, 44], [135, 36]],
        [[44, -25], [50, -15], [47, -13]],
    ];
    const LAT_MAX = 80;
    const LAT_MIN = -58;
    const dentro = (x, y, poli) => {
        let d = false;
        for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
            const [xi, yi] = poli[i];
            const [xj, yj] = poli[j];
            if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
        }
        return d;
    };
    const projetar = (lon, lat, w, h) => [((lon + 180) / 360) * w, ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h];

    /** Pontinhos da terra, desenhados uma vez por tamanho. */
    function mascaraTerra(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        x.fillStyle = 'rgba(57, 255, 136, .34)';
        const passo = Math.max(4, Math.round(w / 90));
        for (let py = passo / 2; py < h; py += passo) {
            for (let px = passo / 2; px < w; px += passo) {
                const lon = (px / w) * 360 - 180;
                const lat = LAT_MAX - (py / h) * (LAT_MAX - LAT_MIN);
                if (TERRA.some((p) => dentro(lon, lat, p))) { x.beginPath(); x.arc(px, py, passo * 0.17, 0, 6.3); x.fill(); }
            }
        }
        return c;
    }

    // ---------------------------------------------------------------- janela (moldura com título)
    function janela(titulo, cor, corpo, extra = '') {
        const j = el('section', `jan ${extra}`.trim());
        j.style.setProperty('--j', COR[cor]);
        const t = el('header', 'jan-tit');
        t.append(el('span', 'jan-nome', titulo), el('span', 'jan-luz'));
        j.append(t, corpo);
        return j;
    }

    // ---------------------------------------------------------------- montagem
    function montar(raiz, { compacto = false } = {}) {
        raiz.replaceChildren();
        raiz.classList.add('deck--montado');
        let dados = null;
        let parado = false;
        const pings = [];
        const vistos = new Set();
        let falhou = false;

        // RADAR
        const cvRadar = el('canvas', 'jan-canvas');
        const chips = el('div', 'jan-chips');
        const radar = janela('RADAR :: GEO-TRACE', 'laranja', el('div', 'jan-corpo'));
        radar.querySelector('.jan-corpo').append(cvRadar, chips);
        // TRÁFEGO
        const cvTrafego = el('canvas', 'jan-canvas jan-canvas--baixo');
        const trafego = janela('TRÁFEGO :: 24H', 'ciano', el('div', 'jan-corpo'));
        trafego.querySelector('.jan-corpo').append(cvTrafego);
        // FEED
        const lista = el('div', 'feed');
        const feed = janela('FEED :: AO VIVO', 'violeta', el('div', 'jan-corpo'));
        feed.querySelector('.jan-corpo').append(lista);
        // MEMÓRIA
        const dump = el('pre', 'hexdump');
        const memoria = janela('MEM :: HEXDUMP', 'azul', el('div', 'jan-corpo'));
        memoria.querySelector('.jan-corpo').append(dump);

        raiz.append(radar, trafego, feed);
        if (!compacto) raiz.append(memoria);

        // ---- dados
        async function carregar() {
            try {
                const r = await window.EnzoApi.pedir('/api/admin/acessos/radar');
                if (!r.ok) throw new Error(String(r.status));
                falhou = false;
                novos(r.dados);
                dados = r.dados;
                desenharChips();
                desenharFeed();
            } catch { falhou = true; }
        }
        function novos(d) {
            const primeira = dados === null;
            for (const a of d.recentes) {
                if (vistos.has(a.id)) continue;
                vistos.add(a.id);
                if (!primeira) {
                    const p = d.pontos.find((q) => q.cidade && q.cidade === a.cidade && q.estado === a.estado);
                    if (p) pings.push({ lon: p.lon, lat: p.lat, t0: performance.now() });
                    a.novo = true;
                }
            }
        }
        function desenharChips() {
            const t = dados.totais;
            chips.replaceChildren(
                chip('24h', t.acessos, 'neon'), chip('IPs', t.ips, 'laranja'), chip('sem login', t.semLogin, 'laranja'), chip('alvos', dados.pontos.length, 'magenta'));
        }
        const chip = (rotulo, valor, cor) => { const c = el('span', 'chip'); c.style.setProperty('--c', COR[cor]); c.append(el('b', '', String(valor)), ` ${rotulo}`); return c; };

        const corDoEvento = (e) => (/^(login|logout|admin|perfil)$/.test(e) ? 'magenta'
            : /^(compra|abrir|po|resgate)$/.test(e) ? 'ambar'
            : /^(partida|npc|sala|entrar-sala)$/.test(e) ? 'azul'
            : /^(visitante|visita)$/.test(e) ? 'laranja' : 'ciano');
        function desenharFeed() {
            lista.replaceChildren();
            if (!dados.recentes.length) { lista.append(el('p', 'jan-vazio', 'aguardando tráfego…')); return; }
            for (const a of dados.recentes) {
                const linha = el('button', `feed-linha${a.novo ? ' feed-linha--novo' : ''}`);
                linha.type = 'button';
                linha.title = a.ip ? `ip ${a.ip}` : '';
                const hora = el('span', 'f-hora', new Date(a.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                const ev = el('span', 'f-ev', a.evento);
                ev.style.color = COR[corDoEvento(a.evento)];
                const quem = el('span', 'f-quem', a.nome ? a.nome.split(/\s+/)[0] : 'anônimo');
                if (!a.nome) quem.classList.add('f-anon');
                const ip = el('span', 'f-ip', a.ip || '—');
                const onde = el('span', 'f-onde', [a.cidade, a.estado].filter(Boolean).join(', ') || a.pais || '');
                linha.append(hora, ev, quem, ip, onde);
                linha.addEventListener('click', () => { if (a.ip) window.EnzoAdmin?.rodar(`ip ${a.ip}`); });
                lista.append(linha);
            }
        }

        // ---- desenho
        let terra = null;
        let terraW = 0;
        function dimensionar(cv) {
            const d = Math.min(window.devicePixelRatio || 1, 2);
            const w = cv.clientWidth;
            const h = cv.clientHeight;
            if (!w || !h) return null;
            if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
            const x = cv.getContext('2d');
            x.setTransform(d, 0, 0, d, 0, 0);
            return { x, w, h };
        }
        function desenharRadar(t) {
            const g = dimensionar(cvRadar);
            if (!g) return;
            const { x, w, h } = g;
            x.clearRect(0, 0, w, h);
            if (!terra || terraW !== w) { terra = mascaraTerra(w, h); terraW = w; }
            // grade de latitude/longitude
            x.strokeStyle = 'rgba(38, 243, 255, .12)';
            x.lineWidth = 1;
            for (let lon = -150; lon <= 180; lon += 30) { const [px] = projetar(lon, 0, w, h); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
            for (let lat = -30; lat <= 60; lat += 30) { const [, py] = projetar(0, lat, w, h); x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke(); }
            x.drawImage(terra, 0, 0, w, h);
            // varredura
            const vel = calmo ? 0 : (t / 7000) % 1;
            const sx = vel * w;
            const faixa = x.createLinearGradient(sx - 70, 0, sx, 0);
            faixa.addColorStop(0, 'rgba(255, 138, 61, 0)');
            faixa.addColorStop(1, 'rgba(255, 138, 61, .28)');
            x.fillStyle = faixa;
            x.fillRect(sx - 70, 0, 70, h);
            x.fillStyle = COR.laranja;
            x.fillRect(sx - 1, 0, 1.5, h);
            // alvos
            if (dados) {
                for (const p of dados.pontos) {
                    const [px, py] = projetar(p.lon, p.lat, w, h);
                    const atras = (sx - px + w) % w;
                    const brilho = calmo ? 0.6 : Math.max(0.35, 1 - atras / (w * 0.6));
                    const r = 2 + Math.min(5, Math.log2(p.n + 1) * 1.1);
                    x.globalAlpha = brilho;
                    x.fillStyle = COR.laranja;
                    x.shadowColor = COR.laranja;
                    x.shadowBlur = 10;
                    x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill();
                    x.shadowBlur = 0;
                    x.globalAlpha = 1;
                }
                // rótulo dos 3 maiores alvos
                x.font = '10px monospace';
                x.fillStyle = COR.ciano;
                const ocupados = [];
                for (const p of dados.pontos.slice(0, 5)) {
                    if (!p.cidade) continue;
                    const [px, py] = projetar(p.lon, p.lat, w, h);
                    const texto = `${p.cidade.toUpperCase()} ×${p.n}`;
                    const larg = x.measureText(texto).width;
                    const direita = px > w * 0.7;
                    const x0 = direita ? px - 8 - larg : px + 8;
                    const y0 = py - 7;
                    // pula o rótulo que cairia em cima de outro já escrito
                    if (ocupados.some((o) => x0 < o[2] && x0 + larg > o[0] && y0 - 10 < o[3] && y0 + 2 > o[1])) continue;
                    ocupados.push([x0, y0 - 10, x0 + larg, y0 + 2]);
                    x.textAlign = 'left';
                    x.fillText(texto, x0, y0);
                }
            }
            // pings (anéis que se expandem)
            for (let i = pings.length - 1; i >= 0; i--) {
                const p = pings[i];
                const k = (performance.now() - p.t0) / 1800;
                if (k >= 1) { pings.splice(i, 1); continue; }
                const [px, py] = projetar(p.lon, p.lat, w, h);
                x.strokeStyle = `rgba(255, 138, 61, ${1 - k})`;
                x.lineWidth = 2;
                x.beginPath(); x.arc(px, py, 4 + k * 26, 0, 6.3); x.stroke();
            }
            if (!dados) {
                x.fillStyle = COR.laranja;
                x.font = '11px monospace';
                x.textAlign = 'center';
                x.fillText(falhou ? 'SEM LINK COM O SERVIDOR…' : 'ACQUIRING SIGNAL…', w / 2, h / 2);
            } else if (!dados.pontos.length) {
                x.fillStyle = COR.apagado || 'rgba(255, 138, 61, .8)';
                x.font = '11px monospace';
                x.textAlign = 'center';
                x.fillText('NENHUM ALVO COM COORDENADA AINDA', w / 2, h - 10);
            }
        }
        function desenharTrafego(t) {
            const g = dimensionar(cvTrafego);
            if (!g) return;
            const { x, w, h } = g;
            x.clearRect(0, 0, w, h);
            const base = h - 34;
            const horas = dados?.horas || Array.from({ length: 24 }, () => ({ total: 0, semLogin: 0 }));
            const max = Math.max(4, ...horas.map((q) => q.total));
            const bw = w / 24;
            x.strokeStyle = 'rgba(38, 243, 255, .14)';
            x.lineWidth = 1;
            for (let i = 1; i <= 3; i++) { const y = (base * i) / 4; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
            horas.forEach((q, i) => {
                const logados = q.total - q.semLogin;
                const hl = (logados / max) * (base - 4);
                const ha = (q.semLogin / max) * (base - 4);
                x.fillStyle = COR.neon; x.shadowColor = COR.neon; x.shadowBlur = 6;
                x.fillRect(i * bw + 2, base - hl, bw - 4, hl);
                x.fillStyle = COR.laranja; x.shadowColor = COR.laranja;
                x.fillRect(i * bw + 2, base - hl - ha, bw - 4, ha);
                x.shadowBlur = 0;
            });
            x.fillStyle = 'rgba(167, 139, 255, .9)';
            x.font = '9px monospace';
            x.textAlign = 'left'; x.fillText('-24h', 2, base + 11);
            x.textAlign = 'center'; x.fillText('-12h', w / 2, base + 11);
            x.textAlign = 'right'; x.fillText('agora', w - 2, base + 11);
            // osciloscópio: amplitude segue o ritmo da última hora
            const ritmo = Math.min(1, (horas[23]?.total || 0) / max);
            x.strokeStyle = COR.ciano; x.shadowColor = COR.ciano; x.shadowBlur = 6; x.lineWidth = 1.4;
            x.beginPath();
            for (let px = 0; px <= w; px += 2) {
                const y = h - 10 + Math.sin(px * 0.09 + t / 160) * (2 + ritmo * 5) + Math.sin(px * 0.31 - t / 70) * (1 + ritmo * 2);
                if (px === 0) x.moveTo(px, y); else x.lineTo(px, y);
            }
            x.stroke();
            x.shadowBlur = 0;
        }

        // ---- hexdump
        const linhasHex = [];
        const PALAVRAS = ['ENZO', 'ROOT', 'TORADO', 'NOITE', 'MACARRON', 'CABO-COCO', 'SUPERKID'];
        function novaLinhaHex() {
            const end = (0x7ffe0000 + linhasHex.length * 16 + Math.floor(Math.random() * 4096) * 16).toString(16).toUpperCase().padStart(8, '0');
            const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
            if (Math.random() < 0.18) { const p = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)]; for (let i = 0; i < p.length && i < 16; i++) bytes[i + 2] = p.charCodeAt(i); }
            const hex = bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            const asc = bytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
            return `${end}  ${hex}  |${asc}|`;
        }
        for (let i = 0; i < 9; i++) linhasHex.push(novaLinhaHex());
        dump.textContent = linhasHex.join('\n');

        // ---- laço
        const timers = [];
        let ultimo = 0;
        function quadro(t) {
            if (parado) return;
            if (!raiz.isConnected) { parar(); return; }
            requestAnimationFrame(quadro);
            if (document.hidden || t - ultimo < (window.innerWidth < 760 ? 70 : 40)) return; // celular: menos quadros, menos bateria
            ultimo = t;
            desenharRadar(t);
            desenharTrafego(t);
        }
        function parar() { parado = true; timers.forEach(clearInterval); }
        carregar().then(() => { if (falhou) setTimeout(carregar, 2500); });
        timers.push(setInterval(() => { if (!document.hidden) carregar(); }, 15000));
        if (!compacto && !calmo) {
            timers.push(setInterval(() => {
                if (!raiz.isConnected) return;
                linhasHex.shift(); linhasHex.push(novaLinhaHex());
                dump.textContent = linhasHex.join('\n');
            }, 650));
        }
        requestAnimationFrame(quadro);
        return { parar };
    }

    window.EnzoDeck = { montar };

    // Coluna da direita (telas largas): monta quando cabe, desmonta quando a tela estreita.
    const lateral = document.getElementById('deck');
    if (lateral) {
        const largo = window.matchMedia('(min-width: 1180px)');
        let ativo = null;
        const ajustar = () => {
            if (largo.matches && !ativo) ativo = montar(lateral);
            else if (!largo.matches && ativo) { ativo.parar(); ativo = null; lateral.replaceChildren(); }
        };
        largo.addEventListener('change', ajustar);
        ajustar();
    }
})();
