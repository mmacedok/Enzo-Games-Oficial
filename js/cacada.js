// ============================================================================
// Caçada ao Inominável — jogo de plataforma do Degustador da Noite (easter egg).
// Abre ao clicar no título da página do Degustador, na janela compartilhada
// (js/game-dialog.js). Regras em js/cacada-core.js, fases em js/cacada-fases.js;
// aqui só desenho, controles, telas e progresso salvo.
//
// Artes: por enquanto usa os sprites da antiga Ronda (assets/ronda/) e desenhos
// feitos por código. A lista das artes definitivas está em
// docs/ASSETS-CACADA.md; quando chegarem, é só trocar os caminhos em ARQUIVOS.
// ============================================================================
(() => {
    'use strict';

    const core = window.CacadaCore;
    const FASES = window.CacadaFases;
    const { CONFIG } = core;
    const W = CONFIG.largura;
    const H = CONFIG.altura;
    const TL = CONFIG.tile;
    const PROGRESSO = 'cacada-progresso';
    const toque = matchMedia('(any-pointer: coarse)').matches;
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const janela = GameDialog.create({
        titulo: 'Caçada ao Inominável',
        descricaoCanvas: 'Caçada ao Inominável. Setas andam, Espaço pula, F atira, R recomeça a fase, P pausa. No celular: botões abaixo do jogo.',
        largura: W,
        altura: H,
        espacoExtra: toque ? 104 : 0,
    });
    const { canvas, ctx } = janela;

    const COR = {
        tinta: '#111111',
        telhado: '#8a2be2',
        telhadoClaro: '#b77cff',
        parede: '#2a1450',
        paredeEscura: '#1d0f38',
        tijolo: '#351a63',
        caixa: '#5b6270',
        marquise: '#c9a36a',
        telha: '#c0643b',
        espinho: '#d8dde6',
        serra: '#b9c0cc',
        laranja: '#ff6600',
        amarelo: '#ffd400',
        rosa: '#ff4fd8',
        jogador: '#e040fb',
    };

    // ------------------------------------------------------------- artes
    // Temporárias: sprites da Ronda. Os nomes finais estão em docs/ASSETS-CACADA.md.
    const ARQUIVOS = {
        parado: ['ronda/degustador/correr-01.png'],
        correr: ['ronda/degustador/correr-01.png', 'ronda/degustador/correr-02.png', 'ronda/degustador/correr-03.png', 'ronda/degustador/correr-04.png'],
        atirar: ['ronda/degustador/atirar-01.png', 'ronda/degustador/atirar-02.png'],
        pular: ['ronda/degustador/pular.png'],
        cair: ['ronda/degustador/cair.png'],
        parede: ['ronda/degustador/cair.png'],
        agarrado: ['ronda/degustador/pular.png'],
        morrer: ['ronda/degustador/tropecar.png'],
        coracao: ['ronda/inimigos/coracao-01.png', 'ronda/inimigos/coracao-02.png', 'ronda/inimigos/coracao-03.png', 'ronda/inimigos/coracao-04.png'],
        feiticeira: ['ronda/inimigos/feiticeira-01.png', 'ronda/inimigos/feiticeira-02.png', 'ronda/inimigos/feiticeira-03.png', 'ronda/inimigos/feiticeira-04.png'],
        drone: ['ronda/objetos/drone-01.png', 'ronda/objetos/drone-02.png'],
        projetil: ['ronda/objetos/projetil.png'],
        ceu: ['ronda/cidade-distante.png'],
        cidade: ['ronda/cidade-proxima.png'],
        sinal: ['ronda/sinal-virgula.png'],
    };
    // Os sprites temporários olham para a direita, menos a feiticeira.
    const OLHA_ESQUERDA = new Set(['feiticeira']);
    const ARTE = {};
    for (const [nome, lista] of Object.entries(ARQUIVOS)) {
        ARTE[nome] = lista.map((arquivo) => {
            const img = new Image();
            img.src = `assets/${arquivo}?v=1`;
            return img;
        });
    }
    const pronta = (img) => img && img.complete && img.naturalWidth > 0;
    const quadroDe = (nome, i = 0) => ARTE[nome][Math.abs(Math.floor(i)) % ARTE[nome].length];

    // ------------------------------------------------------------- progresso
    function lerProgresso() {
        try {
            const p = JSON.parse(localStorage.getItem(PROGRESSO) || '{}');
            return { liberadas: Math.max(1, p.liberadas || 1), recordes: p.recordes || {} };
        } catch {
            return { liberadas: 1, recordes: {} };
        }
    }
    function salvarProgresso() {
        try { localStorage.setItem(PROGRESSO, JSON.stringify(progresso)); } catch { /* modo privado */ }
    }
    let progresso = lerProgresso();

    // ------------------------------------------------------------- estado
    const jogo = core.criarJogo(FASES);
    const entrada = { esquerda: false, direita: false, cima: false, baixo: false, pulo: false, tiro: false, puloPedido: false };
    const visual = {
        tempo: 0,
        pausado: false,
        selecionada: 0,
        cam: { x: 0, y: 0, olhar: 0 },
        particulas: [],
        textos: [],
        ultimoTiro: -1,
        inicioFase: 0,
        vitoriaEm: 0,
        resultado: null,
        tremor: 0,
    };
    let ultimoQuadro = null;
    let quadro = 0;

    const tempoTexto = (s) => {
        const m = Math.floor(s / 60);
        const r = s - m * 60;
        return `${m}:${r.toFixed(2).padStart(5, '0')}`;
    };

    // ------------------------------------------------------------- tiles
    /** Cada tile desenhado uma vez num canvas pequeno (rápido de repetir). */
    function tileProntinho(desenho) {
        const c = document.createElement('canvas');
        c.width = TL;
        c.height = TL;
        desenho(c.getContext('2d'));
        return c;
    }
    const TILES = {
        tijolo: tileProntinho((c) => {
            c.fillStyle = COR.parede;
            c.fillRect(0, 0, TL, TL);
            c.fillStyle = COR.tijolo;
            c.fillRect(1, 1, 8, 4); c.fillRect(11, 1, 8, 4);
            c.fillRect(-4, 7, 8, 4); c.fillRect(6, 7, 8, 4); c.fillRect(16, 7, 8, 4);
            c.fillRect(1, 13, 8, 4); c.fillRect(11, 13, 8, 4);
        }),
        telhado: tileProntinho((c) => {
            c.fillStyle = COR.parede;
            c.fillRect(0, 0, TL, TL);
            c.fillStyle = COR.tijolo;
            c.fillRect(1, 9, 8, 4); c.fillRect(11, 9, 8, 4); c.fillRect(6, 15, 8, 4);
            c.fillStyle = COR.telhado;
            c.fillRect(0, 0, TL, 6);
            c.fillStyle = COR.telhadoClaro;
            c.fillRect(0, 0, TL, 2);
            c.fillStyle = 'rgba(0, 0, 0, 0.35)';
            c.fillRect(0, 6, TL, 1);
        }),
        caixa: tileProntinho((c) => {
            c.fillStyle = COR.caixa;
            c.fillRect(0, 0, TL, TL);
            c.strokeStyle = '#8b93a3';
            c.lineWidth = 2;
            c.strokeRect(2, 2, TL - 4, TL - 4);
            c.beginPath(); c.moveTo(3, 3); c.lineTo(TL - 3, TL - 3); c.moveTo(TL - 3, 3); c.lineTo(3, TL - 3); c.stroke();
            c.strokeStyle = COR.tinta;
            c.lineWidth = 1;
            c.strokeRect(0.5, 0.5, TL - 1, TL - 1);
        }),
        marquise: tileProntinho((c) => {
            c.fillStyle = COR.marquise;
            c.fillRect(0, 0, TL, 5);
            c.fillStyle = '#7a5a2e';
            c.fillRect(0, 5, TL, 2);
            c.fillRect(3, 7, 2, 5); c.fillRect(15, 7, 2, 5);
        }),
        telha: tileProntinho((c) => {
            c.fillStyle = COR.telha;
            c.fillRect(0, 0, TL, TL);
            c.fillStyle = '#e08a5a';
            for (let x = 0; x < TL; x += 5) { c.beginPath(); c.arc(x + 2.5, 3, 2.5, Math.PI, 0); c.fill(); }
            c.strokeStyle = '#5e2a14';
            c.lineWidth = 1;
            c.beginPath(); c.moveTo(4, 8); c.lineTo(9, 13); c.lineTo(7, 18); c.moveTo(13, 6); c.lineTo(15, 12); c.stroke();
            c.strokeStyle = COR.tinta;
            c.strokeRect(0.5, 0.5, TL - 1, TL - 1);
        }),
        mola: tileProntinho((c) => {
            c.fillStyle = '#444';
            c.fillRect(2, 16, 16, 4);
            c.strokeStyle = '#cfd4dc';
            c.lineWidth = 2;
            c.beginPath();
            for (let i = 0; i < 4; i++) { c.moveTo(4, 15 - i * 3); c.lineTo(16, 13 - i * 3); }
            c.stroke();
            c.fillStyle = '#e0245e';
            c.fillRect(1, 2, 18, 4);
            c.strokeStyle = COR.tinta;
            c.lineWidth = 1;
            c.strokeRect(1.5, 2.5, 17, 3);
        }),
        espinho: tileProntinho((c) => {
            c.fillStyle = COR.espinho;
            c.strokeStyle = COR.tinta;
            c.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                c.beginPath();
                c.moveTo(1 + i * 6, TL);
                c.lineTo(4 + i * 6, 8);
                c.lineTo(7 + i * 6, TL);
                c.closePath();
                c.fill();
                c.stroke();
            }
            c.fillStyle = '#c0203a';
            for (let i = 0; i < 3; i++) c.fillRect(3 + i * 6, 8, 2, 3);
        }),
    };
    TILES.espinhoTeto = tileProntinho((c) => { c.translate(0, TL); c.scale(1, -1); c.drawImage(TILES.espinho, 0, 0); });

    // ------------------------------------------------------------- câmera
    function ajustarCamera(dt, instantaneo = false) {
        const nivel = jogo.nivel;
        const j = jogo.jogador;
        const cam = visual.cam;
        const alvoOlhar = j.olhando * 45;
        cam.olhar += (alvoOlhar - cam.olhar) * Math.min(1, dt * 2.5);
        let x = j.x + CONFIG.jogadorL / 2 - W / 2 + cam.olhar;
        let y = j.y + CONFIG.jogadorA / 2 - H * 0.55;
        x = nivel.larguraPx <= W ? (nivel.larguraPx - W) / 2 : Math.max(0, Math.min(x, nivel.larguraPx - W));
        y = nivel.alturaPx <= H ? nivel.alturaPx - H : Math.max(0, Math.min(y, nivel.alturaPx - H));
        if (instantaneo) { cam.x = x; cam.y = y; return; }
        const k = 1 - Math.exp(-dt * 9);
        cam.x += (x - cam.x) * k;
        cam.y += (y - cam.y) * k;
    }

    // ------------------------------------------------------------- cenário
    function desenharFundo() {
        const cam = visual.cam;
        if (pronta(ARTE.ceu[0])) {
            ctx.drawImage(ARTE.ceu[0], 0, 0, W, H);
        } else {
            const ceu = ctx.createLinearGradient(0, 0, 0, H);
            ceu.addColorStop(0, '#07041a');
            ceu.addColorStop(0.6, '#1c0f45');
            ceu.addColorStop(1, '#3a1a6b');
            ctx.fillStyle = ceu;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#f3e9c6';
            ctx.beginPath(); ctx.arc(90, 60, 22, 0, Math.PI * 2); ctx.fill();
        }
        if (pronta(ARTE.sinal[0])) ctx.drawImage(ARTE.sinal[0], 430 - cam.x * 0.03, 10 - cam.y * 0.05, 130, 130);
        if (pronta(ARTE.cidade[0])) {
            const img = ARTE.cidade[0];
            const desloc = (cam.x * 0.3) % W;
            const alturaMax = Math.max(0, (jogo.nivel?.alturaPx || H) - H);
            const y = H - 300 + (alturaMax - cam.y) * 0.25;
            ctx.drawImage(img, -desloc, y, W, 320);
            ctx.drawImage(img, W - desloc, y, W, 320);
        }
    }

    function desenharTiles() {
        const nivel = jogo.nivel;
        const cam = visual.cam;
        const x0 = Math.max(0, Math.floor(cam.x / TL));
        const x1 = Math.min(nivel.largura - 1, Math.floor((cam.x + W) / TL));
        const y0 = Math.max(0, Math.floor(cam.y / TL));
        const y1 = Math.min(nivel.altura - 1, Math.floor((cam.y + H) / TL));
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const c = nivel.grade[ty][tx];
                if (c === '.') continue;
                const x = Math.round(tx * TL - cam.x);
                const y = Math.round(ty * TL - cam.y);
                if (c === '#') {
                    const topo = ty === 0 || !['#', 'X'].includes(nivel.grade[ty - 1][tx]);
                    ctx.drawImage(topo ? TILES.telhado : TILES.tijolo, x, y);
                } else if (c === 'X') ctx.drawImage(TILES.caixa, x, y);
                else if (c === '=') ctx.drawImage(TILES.marquise, x, y);
                else if (c === 'T') ctx.drawImage(TILES.mola, x, y);
                else if (c === '^') ctx.drawImage(TILES.espinho, x, y);
                else if (c === 'v') ctx.drawImage(TILES.espinhoTeto, x, y);
                else if (c === 'Q') desenharTelha(tx, ty, x, y);
            }
        }
    }

    function desenharTelha(tx, ty, x, y) {
        const estado = jogo.caidas.get(`${tx},${ty}`);
        if (!estado) { ctx.drawImage(TILES.telha, x, y); return; }
        if (estado.caiu) {
            // Caindo: some descendo e voltando aos poucos.
            const t = estado.t - CONFIG.tempoTelha;
            if (t < 0.4) {
                ctx.globalAlpha = 1 - t / 0.4;
                ctx.drawImage(TILES.telha, x, y + t * 120);
                ctx.globalAlpha = 1;
            } else if (t > CONFIG.voltaTelha - 0.4) {
                ctx.globalAlpha = 0.3;
                ctx.drawImage(TILES.telha, x, y);
                ctx.globalAlpha = 1;
            }
            return;
        }
        const treme = calmo ? 0 : Math.sin(visual.tempo * 60) * 1.5;
        ctx.drawImage(TILES.telha, x + treme, y);
    }

    function desenharSerras() {
        const cam = visual.cam;
        for (const s of jogo.nivel.serras) {
            // Trilho de quem anda.
            if (s.tipo !== 'O') {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                if (s.tipo === 'H') { ctx.moveTo(s.cx - CONFIG.amplitude - cam.x, s.cy - cam.y); ctx.lineTo(s.cx + CONFIG.amplitude - cam.x, s.cy - cam.y); }
                else { ctx.moveTo(s.cx - cam.x, s.cy - CONFIG.amplitude - cam.y); ctx.lineTo(s.cx - cam.x, s.cy + CONFIG.amplitude - cam.y); }
                ctx.stroke();
                ctx.restore();
            }
            const p = core.posSerra(s, jogo.tempo);
            desenharSerra(p.x - cam.x, p.y - cam.y, CONFIG.raioSerra + 2, jogo.tempo * 14);
        }
    }

    function desenharSerra(x, y, r, giro) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(giro);
        ctx.fillStyle = COR.serra;
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const dentes = 12;
        for (let i = 0; i < dentes * 2; i++) {
            const a = (i / (dentes * 2)) * Math.PI * 2;
            const rr = i % 2 === 0 ? r : r - 4;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6d7482';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0203a';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function desenharPlataformas() {
        const cam = visual.cam;
        for (const p of jogo.nivel.plataformas) {
            const q = core.posPlataforma(p, jogo.tempo);
            const x = q.x - cam.x;
            const y = q.y - cam.y;
            ctx.fillStyle = '#6d7482';
            ctx.fillRect(x, y, q.w, q.h);
            ctx.fillStyle = '#aab2c0';
            ctx.fillRect(x, y, q.w, 2);
            ctx.fillStyle = COR.tinta;
            for (let i = 6; i < q.w; i += 12) ctx.fillRect(x + i, y + 4, 2, 2);
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.5, y + 0.5, q.w - 1, q.h - 1);
            // Luzinha laranja: plataforma do Degustador.
            ctx.fillStyle = Math.floor(visual.tempo * 2) % 2 ? COR.laranja : '#7a3000';
            ctx.fillRect(x + q.w / 2 - 2, y + q.h, 4, 3);
        }
    }

    function desenharVirgula(x, y, escala = 1, cor = COR.amarelo) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(escala, escala);
        ctx.fillStyle = cor;
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -2, 5, 0, Math.PI * 2);
        ctx.moveTo(4, 0);
        ctx.quadraticCurveTo(4, 7, -3, 9);
        ctx.quadraticCurveTo(1, 5, -1, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function desenharColetaveis() {
        const cam = visual.cam;
        for (const v of jogo.nivel.virgulas) {
            if (jogo.pegas.has(v.id)) continue;
            const x = v.x + v.w / 2 - cam.x;
            const y = v.y + v.h / 2 - cam.y + Math.sin(visual.tempo * 3 + v.id) * 2;
            ctx.fillStyle = 'rgba(255, 212, 0, 0.25)';
            ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
            desenharVirgula(x, y);
        }
        for (const c of jogo.nivel.checkpoints) {
            const ativo = jogo.checkpoint && jogo.checkpoint.id >= c.id;
            const x = c.x - cam.x;
            const y = c.y - cam.y;
            ctx.fillStyle = '#9aa1ad';
            ctx.fillRect(x + 4, y, 3, c.h);
            ctx.fillStyle = COR.tinta;
            ctx.fillRect(x + 1, y + c.h - 3, 10, 3);
            const onda = ativo && !calmo ? Math.sin(visual.tempo * 8) * 2 : 0;
            ctx.fillStyle = ativo ? COR.laranja : '#4a3a66';
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 7, y + 1);
            ctx.lineTo(x + 24, y + 6 + onda);
            ctx.lineTo(x + 7, y + 13);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if (ativo) desenharVirgula(x + 13, y + 6, 0.55, '#fff');
        }
    }

    // ------------------------------------------------------------- personagens
    /** Sprite 128×128 com âncora (px no quadro original) no ponto (x, y) do mundo. */
    function sprite(img, x, y, tamanho, ancoraX, ancoraY, virar) {
        const k = tamanho / 128;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (virar) ctx.scale(-1, 1);
        ctx.drawImage(img, -ancoraX * k, -ancoraY * k, tamanho, tamanho);
        ctx.restore();
    }

    function poseDoJogador() {
        const j = jogo.jogador;
        if (jogo.fase === 'morto') return ['morrer', 0];
        if (j.estado === 'agarrado' || j.estado === 'subindo') return ['agarrado', 0];
        if (!j.noChao && j.parede !== 0 && j.vy > 0) return ['parede', 0];
        if (!j.noChao) return [j.vy < 0 ? 'pular' : 'cair', 0];
        const passo = (j.x / 11) | 0;
        if (visual.tempo - visual.ultimoTiro < 0.15) return ['atirar', passo];
        if (Math.abs(j.vx) > 20) return ['correr', passo];
        return ['parado', 0];
    }

    function desenharJogador() {
        const j = jogo.jogador;
        const cam = visual.cam;
        if (jogo.fase === 'morto' && jogo.morteT > 0.12) return; // virou respingo
        const [pose, i] = poseDoJogador();
        let olhando = j.olhando;
        if (pose === 'parede') olhando = -j.parede;
        if (pose === 'agarrado') olhando = j.lado || j.olhando;
        const img = quadroDe(pose, i);
        const cx = j.x + CONFIG.jogadorL / 2 - cam.x;
        const base = j.y + CONFIG.jogadorA - cam.y;
        if (pronta(img)) {
            // Tronco (coluna 76) no centro da caixa e pés (linha 123) no chão.
            sprite(img, cx, base + (pose === 'agarrado' ? 6 : 0), 44, 76, 123, olhando < 0);
        } else {
            ctx.fillStyle = COR.jogador;
            ctx.fillRect(cx - 7, base - 26, 14, 26);
            ctx.fillStyle = '#4c8c2b';
            ctx.fillRect(cx - 9, base - 30, 18, 6);
        }
        if (visual.tempo - visual.ultimoTiro < 0.05 && pose !== 'atirar') {
            const lado = j.parede !== 0 && !j.noChao ? -j.parede : j.olhando;
            ctx.fillStyle = COR.amarelo;
            ctx.beginPath();
            ctx.arc(cx + lado * 16, j.y + CONFIG.alturaArma - cam.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function desenharInimigos() {
        const cam = visual.cam;
        const j = jogo.jogador;
        for (const d of jogo.inimigos) {
            if (!d.vivo) continue;
            const cx = d.x + d.w / 2 - cam.x;
            if (cx < -40 || cx > W + 40) continue;
            const base = d.y + d.h - cam.y;
            let img;
            if (d.tipo === 'coracao') {
                img = quadroDe('coracao', visual.tempo * 8 + d.fase * 4);
                if (pronta(img)) { sprite(img, cx, base, 32, 64, 125, d.vx < 0); continue; }
            } else if (d.tipo === 'drone') {
                img = quadroDe('drone', visual.tempo * 20);
                if (pronta(img)) { sprite(img, cx, base + 6, 30, 64, 100, d.vx < 0); continue; }
            } else if (d.tipo === 'feiticeira') {
                img = quadroDe('feiticeira', visual.tempo * 6);
                const olhaDireita = j.x > d.x;
                if (pronta(img)) { sprite(img, cx, base + 6, 44, 64, 100, OLHA_ESQUERDA.has('feiticeira') ? olhaDireita : !olhaDireita); continue; }
            }
            ctx.fillStyle = { coracao: '#e0245e', drone: '#2ecc71', feiticeira: '#b04dff' }[d.tipo];
            ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
            ctx.strokeStyle = COR.tinta;
            ctx.strokeRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
        }
        for (const m of jogo.magias) {
            const x = m.x - cam.x;
            const y = m.y - cam.y;
            ctx.fillStyle = 'rgba(255, 79, 216, 0.35)';
            ctx.beginPath(); ctx.arc(x, y, CONFIG.magiaRaio + 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = COR.rosa;
            ctx.beginPath(); ctx.arc(x, y, CONFIG.magiaRaio, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd1f4';
            ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2); ctx.fill();
        }
    }

    function desenharTiros() {
        const cam = visual.cam;
        const img = ARTE.projetil[0];
        for (const b of jogo.tiros) {
            const x = b.x - cam.x;
            const y = b.y - cam.y;
            if (pronta(img)) {
                ctx.save();
                ctx.translate(x, y);
                if (b.vx < 0) ctx.scale(-1, 1);
                ctx.drawImage(img, 9, 50, 93, 19, -16, -2.5, 20, 5);
                ctx.restore();
            } else {
                ctx.fillStyle = '#ffb347';
                ctx.fillRect(x - 5, y - 2, 10, 4);
            }
        }
    }

    /**
     * O Inominável (provisório, desenhado por código a partir da ficha):
     * rabo de cavalo, barba, óculos, camisa preta do Gorillaz, jeans e o
     * Stand "Opressor do Chat" atrás, com aura roxa e verde.
     */
    function desenharInominavel() {
        const o = jogo.nivel.objetivo;
        const cam = visual.cam;
        let x = o.x + o.w / 2 - cam.x;
        let base = o.y + o.h - cam.y;
        let alpha = 1;
        if (jogo.fase === 'vitoria' && !ultimaFase()) {
            // Foge para a próxima fase.
            const t = visual.tempo - visual.vitoriaEm;
            x += t * 260;
            base -= Math.max(0, t * 220 - t * t * 300);
            alpha = Math.max(0, 1 - t * 1.2);
        }
        if (x < -80 || x > W + 80) return;
        const bob = Math.sin(visual.tempo * 3) * 1.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        // Aura.
        const pulso = 0.5 + 0.5 * Math.sin(visual.tempo * 4);
        const aura = ctx.createRadialGradient(x, base - 28, 4, x, base - 28, 46);
        aura.addColorStop(0, `rgba(160, 70, 255, ${0.35 + pulso * 0.2})`);
        aura.addColorStop(0.7, 'rgba(90, 255, 120, 0.12)');
        aura.addColorStop(1, 'rgba(90, 255, 120, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(x - 50, base - 80, 100, 90);
        // Stand "Opressor do Chat": sombra com olhos roxos e joinha.
        ctx.fillStyle = 'rgba(15, 5, 25, 0.85)';
        ctx.beginPath(); ctx.ellipse(x + 14, base - 52 + bob, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 34, base - 44 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x + 31, base - 58 + bob, 5, 12); // polegar para cima
        ctx.fillStyle = '#c77dff';
        ctx.fillRect(x + 6, base - 60 + bob, 6, 3);
        ctx.fillRect(x + 17, base - 60 + bob, 6, 3);
        // Pernas (jeans) e tênis.
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#4a6fa5';
        ctx.fillRect(x - 10, base - 18, 8, 15); ctx.strokeRect(x - 10, base - 18, 8, 15);
        ctx.fillRect(x + 2, base - 18, 8, 15); ctx.strokeRect(x + 2, base - 18, 8, 15);
        ctx.fillStyle = '#6b5b4b';
        ctx.fillRect(x - 12, base - 4, 11, 4); ctx.fillRect(x + 1, base - 4, 11, 4);
        // Barriga e camisa preta.
        ctx.fillStyle = '#1b1b1b';
        ctx.beginPath(); ctx.ellipse(x, base - 28 + bob * 0.5, 15, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Estampa (quatro quadradinhos coloridos).
        const cores = ['#c65d7b', '#6a8caf', '#b98b5e', '#7d5ba6'];
        cores.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - 6 + (i % 2) * 6, base - 34 + Math.floor(i / 2) * 6 + bob * 0.5, 5, 5); });
        // Braço com o notebook.
        ctx.fillStyle = '#e0a57a';
        ctx.fillRect(x + 11, base - 32 + bob * 0.5, 5, 10);
        ctx.fillStyle = '#9aa1ad';
        ctx.fillRect(x + 10, base - 24 + bob * 0.5, 14, 3);
        ctx.fillStyle = '#5865f2';
        ctx.fillRect(x + 15, base - 30 + bob * 0.5, 6, 6);
        // Cabeça.
        const hy = base - 47 + bob;
        ctx.fillStyle = '#5a3b22';
        ctx.beginPath(); ctx.ellipse(x - 9, hy + 6, 3, 8, 0.4, 0, Math.PI * 2); ctx.fill(); // rabo de cavalo
        ctx.fillStyle = '#e0a57a';
        ctx.beginPath(); ctx.arc(x, hy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5a3b22';
        ctx.beginPath(); ctx.arc(x, hy - 2, 8.5, Math.PI, Math.PI * 2); ctx.fill(); // cabelo
        ctx.beginPath(); ctx.arc(x, hy + 3, 7, 0.1, Math.PI - 0.1); ctx.fill(); // barba
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x - 3, hy - 1, 2.5, 0, Math.PI * 2); ctx.arc(x + 3.5, hy - 1, 2.5, 0, Math.PI * 2); ctx.stroke(); // óculos
        ctx.restore();

        // Provocação quando o Degustador chega perto.
        const j = jogo.jogador;
        const perto = Math.abs(j.x - o.x) < 220 && Math.abs(j.y - o.y) < 120;
        if (perto && jogo.fase === 'jogando') {
            const frases = ['Me pega se for capaz!', 'Chat, olha esse aí…', 'Tá lento, Degustador!', 'Vai ter que correr mais!'];
            balao(frases[jogo.indice % frases.length], x, base - 72);
        }
    }

    function balao(conteudo, x, y) {
        ctx.font = "bold 12px 'Comic Neue', sans-serif";
        const w = ctx.measureText(conteudo).width + 14;
        const bx = Math.max(4, Math.min(W - w - 4, x - w / 2));
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, y - 20, w, 20, 6);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 4, y); ctx.lineTo(x, y + 7); ctx.lineTo(x + 4, y);
        ctx.fill();
        ctx.fillStyle = COR.tinta;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(conteudo, bx + 7, y - 10);
    }

    // ------------------------------------------------------------- efeitos
    function particulas(x, y, n, cor, forca = 120) {
        if (calmo) n = Math.ceil(n / 3);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = forca * (0.3 + Math.random());
            visual.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - forca * 0.4, vida: 0.4 + Math.random() * 0.4, cor, r: 1.5 + Math.random() * 2 });
        }
    }

    function textoFlutuante(conteudo, x, y, cor = COR.amarelo) {
        visual.textos.push({ conteudo, x, y, cor, inicio: visual.tempo });
    }

    function tratarEventos() {
        for (const e of jogo.eventos) {
            if (e.tipo === 'pulo' || e.tipo === 'subiu') particulas(e.x, e.y, 5, 'rgba(230, 214, 255, 0.8)', 50);
            else if (e.tipo === 'parede') particulas(e.x + (e.lado || 0) * 8, e.y - 12, 6, 'rgba(230, 214, 255, 0.8)', 60);
            else if (e.tipo === 'mola') { particulas(e.x, e.y, 8, COR.amarelo, 90); textoFlutuante('BOING!', e.x, e.y - 20); }
            else if (e.tipo === 'tiro') visual.ultimoTiro = visual.tempo;
            else if (e.tipo === 'acerto') particulas(e.x, e.y, 4, COR.laranja, 70);
            else if (e.tipo === 'derrubou' || e.tipo === 'pisao') { particulas(e.x, e.y, 12, '#ff3b3b', 120); textoFlutuante(e.tipo === 'pisao' ? 'PISÃO!' : 'POW!', e.x, e.y - 10); }
            else if (e.tipo === 'virgula') { particulas(e.x, e.y, 8, COR.amarelo, 80); textoFlutuante('+ ,', e.x, e.y - 12); }
            else if (e.tipo === 'checkpoint') textoFlutuante('SALVO!', e.x, e.y - 8, '#7CFC00');
            else if (e.tipo === 'morte') {
                particulas(e.x, e.y, 26, '#b04dff', 190);
                particulas(e.x, e.y, 10, COR.laranja, 150);
                const falas = { espinho: 'AI!', serra: 'SPLAT!', queda: 'AAAH!', magia: 'ZAP!', coracao: 'POW!', drone: 'BZZT!', feiticeira: 'ZAP!' };
                textoFlutuante(falas[e.causa] || 'SPLAT!', e.x, e.y - 20, '#ff4f4f');
                visual.tremor = 0.25;
            } else if (e.tipo === 'vitoria') venceu();
        }
        jogo.eventos.length = 0;
    }

    function desenharEfeitos(dt) {
        const cam = visual.cam;
        for (const p of visual.particulas) {
            p.vida -= dt;
            p.vy += 500 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 2));
            ctx.fillStyle = p.cor;
            ctx.fillRect(p.x - cam.x - p.r / 2, p.y - cam.y - p.r / 2, p.r, p.r);
        }
        ctx.globalAlpha = 1;
        visual.particulas = visual.particulas.filter((p) => p.vida > 0);
        visual.textos = visual.textos.filter((t) => visual.tempo - t.inicio < 0.8);
        for (const t of visual.textos) {
            const k = (visual.tempo - t.inicio) / 0.8;
            ctx.globalAlpha = 1 - k * k;
            texto(t.conteudo, t.x - cam.x, t.y - cam.y - k * 22, 18, t.cor, 4);
        }
        ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------- telas
    function texto(conteudo, x, y, tamanho, cor = '#fff', contorno = 5, alinhar = 'center') {
        ctx.font = `${tamanho}px Bangers, 'Arial Black', sans-serif`;
        ctx.textAlign = alinhar;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = contorno;
        ctx.strokeStyle = COR.tinta;
        ctx.strokeText(conteudo, x, y);
        ctx.fillStyle = cor;
        ctx.fillText(conteudo, x, y);
    }

    function botaoTela(rotulo, x, y, w, h, cor, id) {
        ctx.fillStyle = cor;
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();
        texto(rotulo, x + w / 2, y + h / 2 + 1, 18, '#fff', 4);
        areas.push({ x, y, w, h, id });
    }
    let areas = []; // botões clicáveis da tela atual

    const ultimaFase = () => jogo.indice === FASES.length - 1;

    function cartaoFase(i, x, y, w, h) {
        const def = FASES[i];
        const liberada = i < progresso.liberadas;
        const sel = visual.selecionada === i;
        const rec = progresso.recordes[def.id];
        ctx.fillStyle = liberada ? (sel ? '#4b1f7a' : '#24103f') : '#15101f';
        ctx.strokeStyle = sel ? COR.laranja : COR.tinta;
        ctx.lineWidth = sel ? 4 : 3;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.stroke();
        texto(def.id, x + 14, y + 20, 22, liberada ? COR.laranja : '#666', 4, 'left');
        ctx.font = "bold 13px 'Comic Neue', sans-serif";
        ctx.fillStyle = liberada ? '#fff' : '#777';
        ctx.textAlign = 'left';
        ctx.fillText(liberada ? def.nome : '???', x + 14, y + 44);
        if (!liberada) {
            texto('🔒', x + w - 22, y + 22, 18, '#999', 0);
        } else if (rec) {
            const total = core.carregarFase(def).virgulas.length;
            ctx.fillStyle = '#e6d6ff';
            ctx.fillText(`⏱ ${tempoTexto(rec.tempo)}`, x + 14, y + 64);
            ctx.fillText(`, ${rec.virgulas.length}/${total}`, x + w - 58, y + 64);
            if (rec.virgulas.length === total) texto('★', x + w - 18, y + 20, 20, COR.amarelo, 3);
        } else {
            ctx.fillStyle = '#b9a6d9';
            ctx.fillText('nova!', x + 14, y + 64);
        }
        areas.push({ x, y, w, h, id: `fase:${i}` });
    }

    function desenharMenu() {
        desenharFundo();
        ctx.fillStyle = 'rgba(7, 4, 26, 0.6)';
        ctx.fillRect(0, 0, W, H);
        texto('CAÇADA AO INOMINÁVEL', W / 2, 42, 40, COR.laranja, 7);
        texto('Degustador da Noite · Mundo 1: Toradolândia', W / 2, 76, 17, '#e6d6ff', 4);
        const w = 180;
        const h = 78;
        const gx = (W - w * 3 - 24) / 2;
        for (let i = 0; i < FASES.length; i++) {
            const col = i % 3;
            const lin = Math.floor(i / 3);
            cartaoFase(i, gx + col * (w + 12), 100 + lin * (h + 12), w, h);
        }
        const ajuda = toque
            ? 'Toque numa fase para jogar'
            : '← → escolhe · ESPAÇO joga · no jogo: setas andam, ESPAÇO pula, F atira, R recomeça';
        texto(ajuda, W / 2, 300, toque ? 18 : 14, '#fff', 4);
        const total = FASES.reduce((s, def) => s + (progresso.recordes[def.id]?.virgulas.length || 0), 0);
        texto(`Vírgulas: ${total}`, W / 2, 330, 16, COR.amarelo, 4);
    }

    function desenharHud() {
        const nivel = jogo.nivel;
        ctx.fillStyle = 'rgba(7, 4, 26, 0.55)';
        ctx.fillRect(0, 0, W, 30);
        texto(`${nivel.id}  ${nivel.nome}`, 10, 16, 18, COR.laranja, 4, 'left');
        texto(tempoTexto(jogo.tempoFase), W / 2 + 40, 16, 20, '#fff', 4);
        desenharVirgula(W - 132, 15, 1);
        texto(`${jogo.pegas.size}/${nivel.virgulas.length}`, W - 120, 16, 18, COR.amarelo, 4, 'left');
        texto(`✖ ${jogo.mortes}`, W - 12, 16, 18, '#ff6b6b', 4, 'right');

        // Nome da fase e dica no começo.
        const t = jogo.fase === 'vitoria' ? Infinity : visual.tempo - visual.inicioFase;
        if (t < 2.2) {
            ctx.globalAlpha = Math.min(1, (2.2 - t) * 2);
            texto(`${nivel.id}`, W / 2, 120, 30, COR.laranja, 6);
            texto(nivel.nome.toUpperCase(), W / 2, 156, 40, '#fff', 7);
            ctx.globalAlpha = 1;
        }
        if (t < 7 && nivel.dica) {
            ctx.globalAlpha = Math.min(1, (7 - t) * 1.5);
            ctx.fillStyle = 'rgba(7, 4, 26, 0.75)';
            ctx.fillRect(0, H - 34, W, 34);
            const dica = toque
                ? nivel.dica.replace('← → anda · ESPAÇO pula', '◀ ▶ anda · PULAR pula').replace(/ESPAÇO|PULAR/g, 'PULAR').replace('F atira', 'TIRO atira').replace('↑ ou PULAR', 'PULAR')
                : nivel.dica;
            texto(dica, W / 2, H - 17, 16, '#fff', 4);
            ctx.globalAlpha = 1;
        }
    }

    function desenharVitoria() {
        const r = visual.resultado;
        const t = Math.min(1, (visual.tempo - visual.vitoriaEm) / 0.4);
        ctx.fillStyle = `rgba(7, 4, 26, ${0.65 * t})`;
        ctx.fillRect(0, 0, W, H);
        if (visual.tempo - visual.vitoriaEm < 0.5) return;
        const fim = ultimaFase();
        ctx.save();
        ctx.translate(W / 2, 62);
        ctx.rotate(-0.05);
        texto(fim ? 'PEGOU O INOMINÁVEL!' : 'ELE FUGIU!', 0, 0, fim ? 44 : 52, COR.amarelo, 8);
        ctx.restore();
        texto(fim ? 'A Toradolândia está a salvo… por enquanto.' : 'O Inominável correu para a próxima fase!', W / 2, 104, 18, '#fff', 4);
        ctx.fillStyle = '#fff5d1';
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 4;
        ctx.fillRect(W / 2 - 150, 124, 300, 120);
        ctx.strokeRect(W / 2 - 150, 124, 300, 120);
        ctx.font = "bold 17px 'Comic Neue', sans-serif";
        ctx.fillStyle = '#3b3024';
        ctx.textAlign = 'left';
        ctx.fillText(`Tempo: ${tempoTexto(r.tempo)}`, W / 2 - 130, 148);
        ctx.fillText(`Mortes: ${r.mortes}`, W / 2 - 130, 176);
        ctx.fillText(`Vírgulas: ${r.virgulas}/${r.totalVirgulas}`, W / 2 - 130, 204);
        ctx.fillText(`Recorde: ${tempoTexto(r.recorde)}`, W / 2 - 130, 232);
        if (r.novoRecorde) texto('NOVO RECORDE!', W / 2 + 78, 232, 16, COR.laranja, 3);
        if (r.todasVirgulas) texto('★ TODAS!', W / 2 + 78, 204, 16, COR.amarelo, 3);
        areas = [];
        const proxima = fim ? 'MENU' : 'PRÓXIMA ▶';
        botaoTela(proxima, W / 2 + 10, 262, 150, 40, COR.laranja, fim ? 'menu' : 'proxima');
        botaoTela('↻ DE NOVO', W / 2 - 160, 262, 150, 40, '#7b2cbf', 'repetir');
        if (!toque) texto(fim ? 'ESPAÇO: menu · R: de novo' : 'ESPAÇO: próxima · R: de novo · M: menu', W / 2, 326, 15, '#e6d6ff', 4);
    }

    function desenharPausa() {
        ctx.fillStyle = 'rgba(7, 4, 26, 0.75)';
        ctx.fillRect(0, 0, W, H);
        texto('PAUSADO', W / 2, 110, 44, '#fff', 7);
        areas = [];
        botaoTela('▶ CONTINUAR', W / 2 - 90, 150, 180, 40, COR.laranja, 'continuar');
        botaoTela('↻ RECOMEÇAR', W / 2 - 90, 200, 180, 40, '#7b2cbf', 'repetir');
        botaoTela('☰ FASES', W / 2 - 90, 250, 180, 40, '#2a2a3a', 'menu');
        if (!toque) texto('P continua · R recomeça · M fases', W / 2, 320, 15, '#e6d6ff', 4);
    }

    function desenhar(dt) {
        areas = [];
        if (jogo.fase === 'menu') { desenharMenu(); return; }
        visual.tremor = Math.max(0, visual.tremor - dt);
        const tremor = !calmo && visual.tremor > 0 ? (Math.random() - 0.5) * 6 : 0;
        ctx.save();
        ctx.translate(tremor, tremor * 0.5);
        desenharFundo();
        desenharTiles();
        desenharPlataformas();
        desenharColetaveis();
        desenharSerras();
        desenharInominavel();
        desenharInimigos();
        desenharTiros();
        desenharJogador();
        desenharEfeitos(dt);
        ctx.restore();
        desenharHud();
        if (toque && jogo.fase === 'jogando' && !visual.pausado) botaoTela('II', W - 44, 36, 34, 28, 'rgba(42, 42, 58, 0.8)', 'pausar');
        if (jogo.fase === 'vitoria') desenharVitoria();
        if (visual.pausado) desenharPausa();
    }

    // ------------------------------------------------------------- fluxo
    function jogarFase(i) {
        if (i >= progresso.liberadas) return;
        visual.selecionada = i;
        core.iniciarFase(jogo, i);
        visual.inicioFase = visual.tempo;
        visual.particulas = [];
        visual.textos = [];
        visual.pausado = false;
        soltarTudo();
        ajustarCamera(0, true);
    }

    function venceu() {
        visual.vitoriaEm = visual.tempo;
        const def = FASES[jogo.indice];
        const anterior = progresso.recordes[def.id];
        const virgulas = [...new Set([...(anterior?.virgulas || []), ...jogo.pegas])];
        const recorde = Math.min(anterior?.tempo ?? Infinity, jogo.tempoFase);
        progresso.recordes[def.id] = { tempo: recorde, mortes: Math.min(anterior?.mortes ?? Infinity, jogo.mortes), virgulas };
        progresso.liberadas = Math.max(progresso.liberadas, Math.min(FASES.length, jogo.indice + 2));
        salvarProgresso();
        visual.resultado = {
            tempo: jogo.tempoFase,
            mortes: jogo.mortes,
            virgulas: jogo.pegas.size,
            totalVirgulas: jogo.nivel.virgulas.length,
            recorde,
            novoRecorde: !anterior || jogo.tempoFase < anterior.tempo,
            todasVirgulas: jogo.pegas.size === jogo.nivel.virgulas.length,
        };
        soltarTudo();
    }

    function voltarAoMenu() {
        jogo.fase = 'menu';
        visual.pausado = false;
        soltarTudo();
    }

    function acao(id) {
        if (id.startsWith('fase:')) { jogarFase(Number(id.slice(5))); return; }
        if (id === 'proxima') jogarFase(Math.min(FASES.length - 1, jogo.indice + 1));
        else if (id === 'repetir') jogarFase(jogo.indice);
        else if (id === 'menu') voltarAoMenu();
        else if (id === 'continuar') visual.pausado = false;
        else if (id === 'pausar') pausar();
    }

    // ------------------------------------------------------------- laço
    function laco(agora) {
        if (!janela.aberta) return;
        const dt = ultimoQuadro === null ? 0 : Math.min(0.1, (agora - ultimoQuadro) / 1000);
        ultimoQuadro = agora;
        visual.tempo += dt;
        if (jogo.fase !== 'menu' && !visual.pausado) {
            core.avancar(jogo, dt, entrada);
            tratarEventos();
            ajustarCamera(dt);
        }
        desenhar(dt);
        quadro = requestAnimationFrame(laco);
    }

    // ------------------------------------------------------------- controles
    function soltarTudo() {
        for (const k of Object.keys(entrada)) entrada[k] = false;
    }

    function pausar() {
        if (jogo.fase !== 'jogando' && jogo.fase !== 'morto') return;
        visual.pausado = !visual.pausado;
        soltarTudo();
    }

    function apertarPulo() {
        entrada.pulo = true;
        entrada.puloPedido = true;
    }

    /** Tecla de "confirmar" fora da partida (menu, vitória, pausa). */
    function confirmar() {
        if (jogo.fase === 'menu') jogarFase(visual.selecionada);
        else if (visual.pausado) visual.pausado = false;
        else if (jogo.fase === 'vitoria' && visual.tempo - visual.vitoriaEm > 0.6) acao(ultimaFase() ? 'menu' : 'proxima');
    }

    const TECLAS = {
        ArrowLeft: 'esquerda', KeyA: 'esquerda',
        ArrowRight: 'direita', KeyD: 'direita',
        ArrowUp: 'cima', KeyW: 'cima',
        ArrowDown: 'baixo', KeyS: 'baixo',
        KeyF: 'tiro', KeyJ: 'tiro', KeyX: 'tiro',
    };
    const TECLAS_PULO = ['Space', 'KeyZ', 'KeyK', 'ArrowUp', 'KeyW'];

    janela.dialog.addEventListener('keydown', (event) => {
        const nome = TECLAS[event.code];
        const pulo = TECLAS_PULO.includes(event.code);
        if (nome || pulo || ['Enter', 'KeyR', 'KeyP', 'KeyM'].includes(event.code)) event.preventDefault();
        if (event.repeat) return;
        if (jogo.fase === 'menu') {
            const n = FASES.length;
            if (nome === 'esquerda') visual.selecionada = (visual.selecionada + n - 1) % n;
            else if (nome === 'direita') visual.selecionada = (visual.selecionada + 1) % n;
            else if (nome === 'cima' || nome === 'baixo') visual.selecionada = (visual.selecionada + 3) % n;
            else if (pulo || event.code === 'Enter') confirmar();
            return;
        }
        if (visual.pausado || jogo.fase === 'vitoria') {
            if (event.code === 'KeyR') acao('repetir');
            else if (event.code === 'KeyM') voltarAoMenu();
            else if (event.code === 'KeyP' && visual.pausado) visual.pausado = false;
            else if (event.code === 'Space' || event.code === 'Enter') confirmar();
            return;
        }
        if (event.code === 'KeyP') { pausar(); return; }
        if (event.code === 'KeyR') { acao('repetir'); return; }
        if (nome) entrada[nome] = true;
        if (pulo) apertarPulo();
    });
    janela.dialog.addEventListener('keyup', (event) => {
        const nome = TECLAS[event.code];
        if (nome) entrada[nome] = false;
        if (TECLAS_PULO.includes(event.code) && !TECLAS_PULO.some((k) => k !== event.code && teclasApertadas.has(k))) entrada.pulo = false;
    });
    // ↑ e ESPAÇO pulam os dois: o pulo só solta quando nenhuma das teclas de pulo está apertada.
    const teclasApertadas = new Set();
    janela.dialog.addEventListener('keydown', (event) => teclasApertadas.add(event.code), true);
    janela.dialog.addEventListener('keyup', (event) => teclasApertadas.delete(event.code), true);

    // Clique/toque nos botões desenhados na tela (menu, vitória, pausa).
    canvas.addEventListener('pointerdown', (event) => {
        if (event.button > 0) return;
        const caixa = canvas.getBoundingClientRect();
        const x = ((event.clientX - caixa.left) / caixa.width) * W;
        const y = ((event.clientY - caixa.top) / caixa.height) * H;
        const alvo = areas.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
        if (alvo) {
            event.preventDefault();
            if (alvo.id.startsWith('fase:')) visual.selecionada = Number(alvo.id.slice(5));
            acao(alvo.id);
        }
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    // Celular: botões de verdade abaixo do jogo.
    if (toque) {
        const controles = document.createElement('div');
        controles.className = 'cacada-controles';
        controles.innerHTML = `
            <div class="cacada-controles__lado">
                <button type="button" class="ronda-botao cacada-botao" data-tecla="esquerda" aria-label="Andar para a esquerda">◀</button>
                <button type="button" class="ronda-botao cacada-botao" data-tecla="direita" aria-label="Andar para a direita">▶</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--baixo" data-tecla="baixo" aria-label="Abaixar / soltar da beirada">▼</button>
            </div>
            <div class="cacada-controles__lado">
                <button type="button" class="ronda-botao ronda-botao--atirar cacada-botao" data-tecla="tiro" aria-label="Atirar">TIRO</button>
                <button type="button" class="ronda-botao ronda-botao--pular cacada-botao" data-tecla="pulo" aria-label="Pular (segure para pular mais alto)">PULAR</button>
            </div>`;
        janela.dialog.appendChild(controles);
        for (const botao of controles.querySelectorAll('button')) {
            const tecla = botao.dataset.tecla;
            botao.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                botao.setPointerCapture?.(event.pointerId);
                botao.classList.add('is-apertado');
                if (tecla === 'pulo' && (jogo.fase !== 'jogando' || visual.pausado)) { confirmar(); return; }
                if (tecla === 'pulo') apertarPulo();
                else entrada[tecla] = true;
                if (jogo.fase === 'menu' && (tecla === 'esquerda' || tecla === 'direita')) {
                    const n = FASES.length;
                    visual.selecionada = (visual.selecionada + (tecla === 'direita' ? 1 : n - 1)) % n;
                    entrada[tecla] = false;
                }
            });
            for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
                botao.addEventListener(tipo, () => {
                    if (!botao.classList.contains('is-apertado')) return;
                    botao.classList.remove('is-apertado');
                    entrada[tecla] = false;
                });
            }
            botao.addEventListener('contextmenu', (event) => event.preventDefault());
        }
    }

    janela.aoFechar(() => {
        cancelAnimationFrame(quadro);
        soltarTudo();
        if (jogo.fase === 'jogando' || jogo.fase === 'morto') visual.pausado = true;
    });
    document.addEventListener('visibilitychange', () => {
        ultimoQuadro = null;
        if (document.hidden && (jogo.fase === 'jogando' || jogo.fase === 'morto')) visual.pausado = true;
        soltarTudo();
    });

    function abrir() {
        if (janela.aberta) return;
        progresso = lerProgresso();
        if (jogo.fase === 'menu') visual.selecionada = Math.min(progresso.liberadas, FASES.length) - 1;
        janela.abrir();
        ultimoQuadro = null;
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(laco);
    }

    window.CacadaInominavel = { abrir, jogo, entrada, visual, arte: ARTE, jogarFase, progresso: () => progresso };
})();
