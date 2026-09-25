// ============================================================================
// Caçada ao Inominável — metroidvania do Degustador da Noite (easter egg).
// Abre ao clicar no título da página do Degustador, na janela compartilhada
// (js/game-dialog.js). Regras em js/cacada-core.js, inimigos em
// js/cacada-inimigos.js, mundo em js/cacada-mundo.js; aqui só desenho,
// controles, telas, mapa e save.
//
// Artes: por enquanto usa os sprites da antiga Ronda (assets/ronda/) e
// desenhos feitos por código. A lista das artes definitivas está em
// docs/ASSETS-CACADA.md; quando chegarem, é só trocar os caminhos em ARQUIVOS.
// ============================================================================
(() => {
    'use strict';

    const core = window.CacadaCore;
    const MUNDO = window.CacadaMundo;
    const { CONFIG, HABILIDADES, LOJA } = core;
    const W = CONFIG.largura;
    const H = CONFIG.altura;
    const TL = CONFIG.tile;
    const JL = CONFIG.jogadorL;
    const JA = CONFIG.jogadorA;
    const SAVE = 'cacada-save-v2';
    const toque = matchMedia('(any-pointer: coarse)').matches;
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const janela = GameDialog.create({
        titulo: 'Caçada ao Inominável',
        descricaoCanvas: 'Caçada ao Inominável: WASD anda e mira, Espaço pula, E golpeia, C dash, F rajada, segure Q para curar, segure Tab para o mapa, Esc pausa. Há também o esquema de Hollow Knight no menu.',
        largura: W,
        altura: H,
        // Celular deitado: os botões ficam por cima, nas laterais (sem roubar altura).
        espacoExtra: () => (toque && innerHeight >= innerWidth ? 150 : 0),
    });
    const { canvas, ctx } = janela;

    const COR = {
        tinta: '#111111',
        laranja: '#ff6600',
        amarelo: '#ffd400',
        rosa: '#ff4fd8',
        branco: '#ffffff',
        lilas: '#e6d6ff',
        verde: '#5aff78',
        roxo: '#a046ff',
    };

    // Cores de cada área (tiles e fundo).
    const TEMAS = {
        telhados: { parede: '#2a1450', tijolo: '#351a63', topo: '#8a2be2', topoClaro: '#b77cff', ceu: ['#07041a', '#1c0f45', '#3a1a6b'], fora: true },
        beco: { parede: '#3a1a14', tijolo: '#4d2419', topo: '#c0583a', topoClaro: '#e8876a', ceu: ['#0c0605', '#1d0d09', '#2d140e'], fora: false },
        fabrica: { parede: '#23262e', tijolo: '#2f333d', topo: '#e08a2c', topoClaro: '#ffc07a', ceu: ['#0b0c10', '#15171d', '#1f222a'], fora: false },
        torre: { parede: '#0f2430', tijolo: '#153140', topo: '#2bb3c0', topoClaro: '#8ff1ff', ceu: ['#03080d', '#081520', '#0d2030'], fora: false },
        covil: { parede: '#1a0f24', tijolo: '#241533', topo: '#5aff78', topoClaro: '#c4ffd0', ceu: ['#04020a', '#140a24', '#1f0f35'], fora: true },
    };

    // ------------------------------------------------------------- artes
    // Artes definitivas (docs/ASSETS-CACADA.md). O que ainda não tem arte continua
    // desenhado por código (hoje só o Emoji Raivoso).
    const serie = (base, n) => Array.from({ length: n }, (_, i) => `${base}-${String(i + 1).padStart(2, '0')}.png`);
    const AREAS_ARTE = ['telhados', 'beco', 'fabrica', 'torre', 'covil'];
    const ARQUIVOS = {
        // Degustador (quadros 128×128, pés na linha 125, corpo na coluna 64).
        parado: serie('degustador/parado', 2),
        correr: serie('degustador/correr', 6),
        golpeFrente: serie('degustador/golpe-frente', 2),
        golpeCima: ['degustador/golpe-cima.png'],
        golpeBaixo: ['degustador/golpe-baixo.png'],
        golpeDiagCima: ['degustador/golpe-diagonal-cima.png'],
        golpeDiagBaixo: ['degustador/golpe-diagonal-baixo.png'],
        golpeRasteira: ['degustador/golpe-rasteira.png'],
        pular: ['degustador/pular.png'],
        cair: ['degustador/cair.png'],
        parede: ['degustador/parede.png'],
        agarrado: ['degustador/agarrado.png'],
        subir: serie('degustador/subir', 2),
        dash: serie('degustador/dash', 2),
        puloDuplo: ['degustador/pulo-duplo.png'],
        atirar: serie('degustador/rajada', 2),
        degustar: serie('degustador/degustar', 2),
        sentado: ['degustador/sentado.png'],
        dano: ['degustador/dano.png'],
        morrer: ['degustador/morrer.png'],
        // Inimigos.
        capanga: serie('inimigos/capanga', 4),
        bug: serie('inimigos/bug', 2),
        drone: serie('inimigos/drone', 2),
        droneMirar: ['inimigos/drone-mirar.png'],
        feiticeira: serie('inimigos/feiticeira', 4),
        feiticeiraConjurar: ['inimigos/feiticeira-conjurar.png'],
        feiticeiraSumir: ['inimigos/feiticeira-sumir.png'],
        ping: serie('inimigos/ping', 2),
        trollAndar: serie('inimigos/troll-andar', 4),
        trollPreparar: ['inimigos/troll-preparar.png'],
        trollInvestida: serie('inimigos/troll-investida', 2),
        trollCansado: ['inimigos/troll-cansado.png'],
        spam: serie('inimigos/spam', 3),
        modGuarda: serie('inimigos/moderador-guarda', 2),
        modErguer: ['inimigos/moderador-erguer.png'],
        modGolpe: ['inimigos/moderador-golpe.png'],
        modRecuperar: ['inimigos/moderador-recuperar.png'],
        sombra: serie('inimigos/sombra', 2),
        // Chefes.
        cmOcioso: serie('chefes/capanga-mor-ocioso', 2),
        cmPreparar: ['chefes/capanga-mor-preparar.png'],
        cmSalto: ['chefes/capanga-mor-salto.png'],
        cmCorrida: serie('chefes/capanga-mor-corrida', 3),
        cmAtordoado: serie('chefes/capanga-mor-atordoado', 2),
        cmMarreta: serie('chefes/capanga-mor-marreta', 2),
        cmDerrotado: ['chefes/capanga-mor-derrotado.png'],
        opFlutuar: serie('chefes/opressor-flutuar', 4),
        opJoinha: ['chefes/opressor-joinha.png'],
        opGrito: ['chefes/opressor-grito.png'],
        opGlitch: ['chefes/opressor-glitch.png'],
        opDerrotado: ['chefes/opressor-derrotado.png'],
        punho: ['chefes/punho.png'],
        // O Inominável (parado, gritar e derrotado olham para a esquerda; fugir, para a direita).
        inoParado: serie('inominavel/parado', 4),
        inoFugir: serie('inominavel/fugir', 4),
        inoGritar: serie('inominavel/gritar', 2),
        inoDerrotado: ['inominavel/derrotado.png'],
        // Efeitos e projéteis.
        golpeArco: serie('efeitos/golpe', 3),
        acerto: serie('efeitos/acerto', 3),
        bolaVerde: ['efeitos/bola-verde.png'],
        glitch: serie('efeitos/glitch', 2),
        magia: serie('efeitos/magia', 2),
        onda: serie('efeitos/onda', 2),
        palavraCaixa: ['efeitos/palavra-caixa.png'],
        pedra: ['efeitos/pedra.png'],
        poeira: serie('efeitos/poeira', 3),
        rajada: serie('efeitos/rajada', 2),
        respingo: serie('efeitos/respingo', 4),
        // Objetos.
        alavanca: serie('objetos/alavanca', 2),
        banco: ['objetos/banco.png'],
        barraca: ['objetos/barraca-italolol.png'],
        espinhos: ['objetos/espinhos.png'],
        fragmento: ['objetos/fragmento.png'],
        gradeArena: ['objetos/grade-arena.png'],
        orbe: ['objetos/habilidade-orbe.png'],
        marquise: ['objetos/marquise.png'],
        mola: serie('objetos/mola', 2),
        rachada: serie('objetos/parede-rachada', 3),
        placa: ['objetos/placa.png'],
        plataforma: ['objetos/plataforma.png'],
        portao: ['objetos/portao.png'],
        serra: ['objetos/serra.png'],
        telha: ['objetos/telha.png'],
        telhaRachada: ['objetos/telha-rachada.png'],
        trilho: ['objetos/trilho.png'],
        saco: ['objetos/virgulas-saco.png'],
        // Interface.
        cogCheio: ['ui/cogumelo-cheio.png'],
        cogVazio: ['ui/cogumelo-vazio.png'],
        habDash: ['ui/habilidade-dash.png'],
        habParede: ['ui/habilidade-parede.png'],
        habPulo2: ['ui/habilidade-pulo2.png'],
        habRajada: ['ui/habilidade-rajada.png'],
        logo: ['ui/logo.png'],
        mapaBanco: ['ui/mapa-banco.png'],
        mapaChefe: ['ui/mapa-chefe.png'],
        mapaSombra: ['ui/mapa-sombra.png'],
        tituloFundo: ['ui/titulo-fundo.jpg'],
        vaso: ['ui/vaso-pontuacao.png'],
    };
    for (const a of AREAS_ARTE) {
        ARQUIVOS[`topo_${a}`] = [`areas/${a}/topo.png`];
        ARQUIVOS[`meio_${a}`] = [`areas/${a}/meio.png`];
        ARQUIVOS[`fundo_${a}`] = [`areas/${a}/fundo.jpg`];
    }
    // As artes olham para a direita.
    const OLHA_ESQUERDA = new Set();
    const ARTE = {};
    for (const [nome, lista] of Object.entries(ARQUIVOS)) {
        ARTE[nome] = lista.map((arquivo) => {
            const img = new Image();
            img.src = window.CACADA_ARTES?.[arquivo] || `assets/${arquivo}?v=2`;
            return img;
        });
    }
    const pronta = (img) => img && img.complete && img.naturalWidth > 0;
    /** Quadro `i` da arte `nome`, ou null se ainda não carregou (aí o jogo desenha por código). */
    const arte = (nome, i = 0) => {
        const l = ARTE[nome];
        const img = l && l[Math.abs(Math.floor(i)) % l.length];
        return pronta(img) ? img : null;
    };
    /** Desenha a arte com o ponto (ax, ay) da imagem em (x, y), na escala k, virada se lado < 0. */
    function pintar(img, x, y, k, ax, ay, lado = 1, ang = 0) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (ang) ctx.rotate(ang);
        if (lado < 0) ctx.scale(-1, 1);
        ctx.drawImage(img, -ax * k, -ay * k, img.naturalWidth * k, img.naturalHeight * k);
        ctx.restore();
    }
    const quadroDe = (nome, i = 0) => ARTE[nome][Math.abs(Math.floor(i)) % ARTE[nome].length];

    /** Sprite pintado de uma cor (piscar de dano, sombra, chefe). Guardado em cache. */
    const tintas = new Map();
    function tingido(img, cor) {
        const chave = `${img.src}|${cor}`;
        let c = tintas.get(chave);
        if (c) return c;
        c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = cor;
        g.fillRect(0, 0, c.width, c.height);
        tintas.set(chave, c);
        return c;
    }

    // ------------------------------------------------------------- save
    function lerSave() {
        try {
            const bruto = localStorage.getItem(SAVE);
            return bruto ? JSON.parse(bruto) : null;
        } catch {
            return null;
        }
    }
    function salvar() {
        if (!jogo.jogador) return;
        try { localStorage.setItem(SAVE, JSON.stringify(core.exportarSave(jogo))); } catch { /* modo privado */ }
        visual.salvouEm = visual.tempo;
    }

    // ------------------------------------------------------------- estado
    const jogo = core.criarJogo(MUNDO);
    const nivel = jogo.nivel;
    const entrada = {
        esquerda: false, direita: false, cima: false, baixo: false,
        pulo: false, puloPedido: false, golpePedido: false, dashPedido: false,
        magiaPedido: false, degustar: false, cimaPedido: false,
    };
    const visual = {
        tempo: 0,
        pausado: false,
        mapa: false,
        cam: { x: 0, y: 0, olhar: 0 },
        transicao: null,
        particulas: [],
        textos: [],
        hitstop: 0,
        tremor: 0,
        flashDano: 0,
        flashBranco: 0,
        area: null,
        opcao: 0,
        lojaSel: 0,
        lojaMsg: '',
        salvouEm: -9,
        fimEm: 0,
        morteEm: 0,
        molas: new Map(),   // "tx,ty" → quando o Degustador quicou nela
        fx: [],             // efeitos com arte (acerto, poeira, explosão…)
        puloDuploEm: -9,
        cadaveres: [],      // chefes derrotados caindo
    };
    let ultimoQuadro = null;
    let quadro = 0;
    let areas = []; // botões clicáveis da tela atual

    const tempoTexto = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = Math.floor(s % 60);
        return h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}:${String(r).padStart(2, '0')}`;
    };

    // ------------------------------------------------------------- tiles
    function tileProntinho(desenho) {
        const c = document.createElement('canvas');
        c.width = TL;
        c.height = TL;
        desenho(c.getContext('2d'));
        return c;
    }
    const TILES_AREA = {};
    for (const [area, t] of Object.entries(TEMAS)) {
        TILES_AREA[area] = {
            meio: tileProntinho((c) => {
                c.fillStyle = t.parede;
                c.fillRect(0, 0, TL, TL);
                c.fillStyle = t.tijolo;
                c.fillRect(1, 1, 8, 4); c.fillRect(11, 1, 8, 4);
                c.fillRect(-4, 7, 8, 4); c.fillRect(6, 7, 8, 4); c.fillRect(16, 7, 8, 4);
                c.fillRect(1, 13, 8, 4); c.fillRect(11, 13, 8, 4);
            }),
            topo: tileProntinho((c) => {
                c.fillStyle = t.parede;
                c.fillRect(0, 0, TL, TL);
                c.fillStyle = t.tijolo;
                c.fillRect(1, 9, 8, 4); c.fillRect(11, 9, 8, 4); c.fillRect(6, 15, 8, 4);
                c.fillStyle = t.topo;
                c.fillRect(0, 0, TL, 6);
                c.fillStyle = t.topoClaro;
                c.fillRect(0, 0, TL, 2);
                c.fillStyle = 'rgba(0, 0, 0, 0.35)';
                c.fillRect(0, 6, TL, 1);
            }),
            rachada: tileProntinho((c) => {
                c.fillStyle = t.parede;
                c.fillRect(0, 0, TL, TL);
                c.fillStyle = t.tijolo;
                c.fillRect(1, 1, 8, 4); c.fillRect(11, 1, 8, 4); c.fillRect(6, 7, 8, 4); c.fillRect(1, 13, 8, 4); c.fillRect(11, 13, 8, 4);
                c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                c.lineWidth = 1;
                c.beginPath(); c.moveTo(4, 2); c.lineTo(9, 9); c.lineTo(6, 14); c.lineTo(11, 19); c.moveTo(9, 9); c.lineTo(16, 7); c.stroke();
            }),
        };
    }
    const TILES = {
        caixa: tileProntinho((c) => {
            c.fillStyle = '#5b6270';
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
            c.fillStyle = '#c9a36a';
            c.fillRect(0, 0, TL, 5);
            c.fillStyle = '#7a5a2e';
            c.fillRect(0, 5, TL, 2);
            c.fillRect(3, 7, 2, 5); c.fillRect(15, 7, 2, 5);
        }),
        telha: tileProntinho((c) => {
            c.fillStyle = '#c0643b';
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
            c.fillStyle = '#d8dde6';
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
        portao: tileProntinho((c) => {
            c.fillStyle = 'rgba(20, 20, 30, 0.6)';
            c.fillRect(0, 0, TL, TL);
            c.fillStyle = '#8b93a3';
            for (let x = 2; x < TL; x += 6) c.fillRect(x, 0, 3, TL);
            c.fillStyle = '#5b6270';
            c.fillRect(0, 8, TL, 3);
        }),
    };
    TILES.espinhoTeto = tileProntinho((c) => { c.translate(0, TL); c.scale(1, -1); c.drawImage(TILES.espinho, 0, 0); });

    // Fundo de cada área: uma camada que se repete, com paralaxe.
    function camadaFundo(area) {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d');
        let s = area.length * 977;
        const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        if (area === 'beco') {
            for (let y = 0; y < H; y += 18) {
                for (let x = (y / 18) % 2 ? -20 : 0; x < W; x += 40) {
                    g.fillStyle = `rgba(90, 40, 28, ${0.25 + r() * 0.25})`;
                    g.fillRect(x + 1, y + 1, 38, 16);
                }
            }
            for (let i = 0; i < 7; i++) {
                const x = r() * W;
                g.fillStyle = 'rgba(0, 0, 0, 0.4)';
                g.fillRect(x, 0, 14 + r() * 20, H);
            }
        } else if (area === 'fabrica') {
            for (let i = 0; i < 9; i++) {
                const y = r() * H;
                g.fillStyle = 'rgba(60, 66, 80, 0.55)';
                g.fillRect(0, y, W, 8 + r() * 10);
            }
            for (let i = 0; i < 6; i++) {
                const x = r() * W;
                const y = r() * H;
                const raio = 20 + r() * 40;
                g.strokeStyle = 'rgba(80, 86, 100, 0.5)';
                g.lineWidth = 6;
                g.beginPath(); g.arc(x, y, raio, 0, Math.PI * 2); g.stroke();
                for (let k = 0; k < 8; k++) {
                    const a = (k / 8) * Math.PI * 2;
                    g.fillStyle = 'rgba(80, 86, 100, 0.5)';
                    g.fillRect(x + Math.cos(a) * raio - 4, y + Math.sin(a) * raio - 4, 8, 8);
                }
            }
        } else if (area === 'torre') {
            for (let x = 10; x < W; x += 70) {
                g.fillStyle = 'rgba(20, 50, 70, 0.7)';
                g.fillRect(x, 0, 50, H);
                for (let y = 8; y < H; y += 14) {
                    g.fillStyle = 'rgba(8, 20, 30, 0.9)';
                    g.fillRect(x + 4, y, 42, 10);
                }
            }
        } else {
            return null;
        }
        return c;
    }
    const FUNDOS = Object.fromEntries(Object.keys(TEMAS).map((a) => [a, camadaFundo(a)]));

    // ------------------------------------------------------------- câmera
    function alvoCamera() {
        const j = jogo.jogador;
        const s = jogo.sala.px;
        let x = j.x + JL / 2 - W / 2 + visual.cam.olhar;
        let y = j.y + JA / 2 - H * 0.55;
        x = s.w <= W ? s.x + (s.w - W) / 2 : Math.max(s.x, Math.min(x, s.x + s.w - W));
        y = s.h <= H ? s.y + (s.h - H) / 2 : Math.max(s.y, Math.min(y, s.y + s.h - H));
        return { x, y };
    }

    function ajustarCamera(dt, instantaneo = false) {
        const j = jogo.jogador;
        const cam = visual.cam;
        cam.olhar += (j.olhando * 40 - cam.olhar) * Math.min(1, dt * 2.5);
        const a = alvoCamera();
        if (instantaneo) { cam.x = a.x; cam.y = a.y; return; }
        const k = 1 - Math.exp(-dt * 10);
        cam.x += (a.x - cam.x) * k;
        cam.y += (a.y - cam.y) * k;
    }

    // ------------------------------------------------------------- cenário
    const temaAtual = () => TEMAS[jogo.sala?.area] || TEMAS.telhados;

    /**
     * Pintura de fundo da área já desfocada e escurecida (como a profundidade de
     * Hollow Knight), feita uma vez só para não pesar a cada quadro.
     */
    const fundosProntos = {};
    function fundoPronto(area) {
        if (fundosProntos[area]) return fundosProntos[area];
        const img = arte(`fundo_${area}`);
        if (!img) return null;
        const c = document.createElement('canvas');
        c.width = Math.round(W * 1.2);
        c.height = Math.round(H * 1.2);
        const g = c.getContext('2d');
        g.filter = 'blur(1.2px) saturate(0.85)';
        g.drawImage(img, 0, 0, c.width, c.height);
        g.filter = 'none';
        g.fillStyle = 'rgba(7, 4, 26, 0.46)';
        g.fillRect(0, 0, c.width, c.height);
        fundosProntos[area] = c;
        return c;
    }

    function desenharFundo() {
        const tema = temaAtual();
        const cam = visual.cam;
        const pintura = fundoPronto(jogo.sala.area);
        if (pintura) {
            // Pintura da área, maior que a tela, deslizando devagar com a câmera (paralaxe).
            const s = jogo.sala.px;
            const kx = s.w > W ? (cam.x - s.x) / (s.w - W) : 0.5;
            const ky = s.h > H ? (cam.y - s.y) / (s.h - H) : 0.5;
            const fw = W * 1.2;
            const fh = H * 1.2;
            ctx.drawImage(pintura, -(fw - W) * kx, -(fh - H) * ky, fw, fh);
            if (jogo.sala.area === 'covil') {
                for (let i = 0; i < 6; i++) {
                    const y = (i * 67 + visual.tempo * 40) % H;
                    ctx.fillStyle = i % 2 ? 'rgba(160, 70, 255, 0.06)' : 'rgba(90, 255, 120, 0.05)';
                    ctx.fillRect(0, y, W, 6);
                }
            }
            return;
        }
        const ceu = ctx.createLinearGradient(0, 0, 0, H);
        ceu.addColorStop(0, tema.ceu[0]);
        ceu.addColorStop(0.6, tema.ceu[1]);
        ceu.addColorStop(1, tema.ceu[2]);
        ctx.fillStyle = ceu;
        ctx.fillRect(0, 0, W, H);
        if (tema.fora) {
            if (jogo.sala.area === 'covil') {
                // Céu corrompido: faixas de glitch.
                for (let i = 0; i < 6; i++) {
                    const y = (i * 67 + visual.tempo * 40) % H;
                    ctx.fillStyle = i % 2 ? 'rgba(160, 70, 255, 0.08)' : 'rgba(90, 255, 120, 0.06)';
                    ctx.fillRect(0, y, W, 6);
                }
            }
        } else {
            const camada = FUNDOS[jogo.sala.area];
            if (camada) {
                const dx = ((cam.x * 0.35) % W + W) % W;
                const dy = ((cam.y * 0.35) % H + H) % H;
                for (const ox of [-dx, W - dx]) for (const oy of [-dy, H - dy]) ctx.drawImage(camada, ox, oy);
            }
            if (jogo.sala.area === 'torre') {
                // LEDs dos servidores piscando.
                for (let i = 0; i < 40; i++) {
                    const x = ((i * 97 - cam.x * 0.35) % W + W) % W;
                    const y = ((i * 53 - cam.y * 0.35) % H + H) % H;
                    if (Math.sin(visual.tempo * 3 + i * 1.7) > 0.3) {
                        ctx.fillStyle = i % 3 ? 'rgba(43, 179, 192, 0.8)' : 'rgba(90, 255, 120, 0.7)';
                        ctx.fillRect(x, y, 3, 2);
                    }
                }
            } else if (jogo.sala.area === 'fabrica') {
                const brilho = ctx.createRadialGradient(W / 2, H + 60, 20, W / 2, H + 60, 360);
                brilho.addColorStop(0, 'rgba(255, 120, 30, 0.22)');
                brilho.addColorStop(1, 'rgba(255, 120, 30, 0)');
                ctx.fillStyle = brilho;
                ctx.fillRect(0, 0, W, H);
            }
        }
    }

    function desenharTiles() {
        const cam = visual.cam;
        const x0 = Math.max(0, Math.floor(cam.x / TL));
        const x1 = Math.min(nivel.largura - 1, Math.floor((cam.x + W) / TL));
        const y0 = Math.max(0, Math.floor(cam.y / TL));
        const y1 = Math.min(nivel.altura - 1, Math.floor((cam.y + H) / TL));
        const p = jogo.progresso;
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const c = nivel.grade[ty][tx];
                if (c === '.') continue;
                const x = Math.round(tx * TL - cam.x);
                const y = Math.round(ty * TL - cam.y);
                const idx = nivel.salaIdx[ty * nivel.largura + tx];
                const area = idx >= 0 ? nivel.salas[idx].area : jogo.sala.area;
                const tiles = TILES_AREA[area] || TILES_AREA.telhados;
                if (c === '#') {
                    const acima = ty > 0 ? nivel.grade[ty - 1][tx] : '#';
                    const dentro = acima === '#' || acima === 'X' || acima === 'r' || acima === 'B';
                    const img = arte(`${dentro ? 'meio' : 'topo'}_${area}`);
                    if (img) ctx.drawImage(img, x, y, TL, TL);
                    else ctx.drawImage(dentro ? tiles.meio : tiles.topo, x, y);
                } else if (c === 'r') {
                    ctx.fillStyle = '#050308';
                    ctx.fillRect(x, y, TL, TL);
                } else if (c === 'B') {
                    const id = nivel.grupoB.get(ty * nivel.largura + tx);
                    if (p.quebrados.has(id)) continue;
                    const vida = jogo.vidaParedes.get(id) ?? CONFIG.vidaParede;
                    const treme = vida < CONFIG.vidaParede && !calmo ? Math.sin(visual.tempo * 50) * 0.6 : 0;
                    const rach = area === 'telhados' && arte('rachada', CONFIG.vidaParede - Math.max(1, vida));
                    const meio = arte(`meio_${area}`);
                    if (rach) ctx.drawImage(rach, x + treme, y, TL, TL);
                    else if (meio) {
                        // Outras áreas: o tijolo da área com rachaduras por cima.
                        ctx.drawImage(meio, x + treme, y, TL, TL);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x + treme + 4, y + 2); ctx.lineTo(x + treme + 9, y + 9); ctx.lineTo(x + treme + 6, y + 14); ctx.lineTo(x + treme + 11, y + 19);
                        if (vida < CONFIG.vidaParede) { ctx.moveTo(x + treme + 9, y + 9); ctx.lineTo(x + treme + 16, y + 7); }
                        if (vida < CONFIG.vidaParede - 1) { ctx.moveTo(x + treme + 6, y + 14); ctx.lineTo(x + treme + 1, y + 17); ctx.moveTo(x + treme + 13, y + 3); ctx.lineTo(x + treme + 17, y + 12); }
                        ctx.stroke();
                    } else ctx.drawImage(tiles.rachada, x + treme, y);
                } else if (c === 'P') {
                    if (!p.abertos.has(nivel.salas[idx].id)) ctx.drawImage(arte('portao') || TILES.portao, x, y, TL, TL);
                } else if (c === '|') {
                    const grade = arte('gradeArena');
                    if (jogo.arena === idx && grade) {
                        ctx.globalAlpha = 0.85 + Math.sin(visual.tempo * 6) * 0.15;
                        ctx.drawImage(grade, x, y, TL, TL);
                        ctx.globalAlpha = 1;
                    } else if (jogo.arena === idx) {
                        ctx.fillStyle = 'rgba(160, 70, 255, 0.35)';
                        ctx.fillRect(x, y, TL, TL);
                        ctx.fillStyle = '#c77dff';
                        for (let k = 3; k < TL; k += 7) ctx.fillRect(x + k, y, 2, TL);
                    }
                } else if (c === 'X') ctx.drawImage(TILES.caixa, x, y);
                else if (c === '=') {
                    // Faixa de tábuas com mãos-francesas (420×118) que se repete a cada 3 tiles,
                    // então uma fila de marquises vira uma prancha contínua.
                    const img = arte('marquise');
                    const fatia = img ? img.naturalWidth / 3 : 0;
                    if (img) ctx.drawImage(img, (tx % 3) * fatia, 0, fatia, img.naturalHeight, x, y - 1, TL, TL * img.naturalHeight / fatia);
                    else ctx.drawImage(TILES.marquise, x, y);
                } else if (c === 'T') {
                    const pulou = visual.tempo - (visual.molas.get(`${tx},${ty}`) ?? -9) < 0.25;
                    const img = arte('mola', pulou ? 1 : 0);
                    if (img) ctx.drawImage(img, x, y, TL, TL);
                    else ctx.drawImage(TILES.mola, x, y);
                } else if (c === '^' || c === 'v') {
                    const img = arte('espinhos');
                    if (!img) ctx.drawImage(c === '^' ? TILES.espinho : TILES.espinhoTeto, x, y);
                    else if (c === '^') ctx.drawImage(img, x, y, TL, TL);
                    else { ctx.save(); ctx.translate(x, y + TL); ctx.scale(1, -1); ctx.drawImage(img, 0, 0, TL, TL); ctx.restore(); }
                }
                else if (c === 'Q') desenharTelha(tx, ty, x, y);
            }
        }
    }

    function desenharTelha(tx, ty, x, y) {
        const estado = jogo.caidas.get(`${tx},${ty}`);
        const inteira = arte('telha');
        const telha = (px, py, rachada) => {
            const img = rachada ? arte('telhaRachada') || inteira : inteira;
            if (img) ctx.drawImage(img, px, py - 4, TL, TL + 4);
            else ctx.drawImage(TILES.telha, px, py);
        };
        if (!estado) { telha(x, y, false); return; }
        if (estado.caiu) {
            const t = estado.t - CONFIG.tempoTelha;
            if (t < 0.4) {
                ctx.globalAlpha = 1 - t / 0.4;
                telha(x, y + t * 120, true);
                ctx.globalAlpha = 1;
            } else if (t > CONFIG.voltaTelha - 0.4) {
                ctx.globalAlpha = 0.3;
                telha(x, y, false);
                ctx.globalAlpha = 1;
            }
            return;
        }
        telha(x + (calmo ? 0 : Math.sin(visual.tempo * 60) * 1.5), y, true);
    }

    const naTela = (x, y, margem = 60) => x > visual.cam.x - margem && x < visual.cam.x + W + margem && y > visual.cam.y - margem && y < visual.cam.y + H + margem;

    function desenharSerras() {
        const cam = visual.cam;
        for (const s of nivel.serras) {
            if (!naTela(s.cx, s.cy, 120)) continue;
            const trilho = arte('trilho');
            if (s.tipo !== 'O' && trilho) {
                const A = CONFIG.amplitude;
                for (let d = -A - TL / 2; d < A + TL / 2; d += TL) {
                    if (s.tipo === 'H') ctx.drawImage(trilho, s.cx + d - cam.x, s.cy - TL / 2 - cam.y, TL, TL);
                    else pintar(trilho, s.cx - cam.x, s.cy + d + TL / 2 - cam.y, TL / 64, 32, 32, 1, Math.PI / 2);
                }
            } else if (s.tipo !== 'O') {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                if (s.tipo === 'H') { ctx.moveTo(s.cx - CONFIG.amplitude - cam.x, s.cy - cam.y); ctx.lineTo(s.cx + CONFIG.amplitude - cam.x, s.cy - cam.y); }
                else { ctx.moveTo(s.cx - cam.x, s.cy - CONFIG.amplitude - cam.y); ctx.lineTo(s.cx - cam.x, s.cy + CONFIG.amplitude - cam.y); }
                ctx.stroke();
            }
            const p = core.posSerra(s, jogo.tempo);
            desenharSerra(p.x - cam.x, p.y - cam.y, CONFIG.raioSerra + 2, jogo.tempo * 14);
        }
    }

    function desenharSerra(x, y, r, giro) {
        const img = arte('serra');
        if (img) { pintar(img, x, y, (r * 2 + 4) / 56, 30, 32, 1, giro); return; }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(giro);
        ctx.fillStyle = '#b9c0cc';
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
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
        for (const p of nivel.plataformas) {
            const q = core.posPlataforma(p, jogo.tempo);
            if (!naTela(q.x, q.y, 100)) continue;
            const x = q.x - cam.x;
            const y = q.y - cam.y;
            const img = arte('plataforma');
            if (img) {
                ctx.drawImage(img, 62, 2, 69, 20, x - 2, y - 1, q.w + 4, Math.min(16, (q.w + 4) * 20 / 69));
                continue;
            }
            ctx.fillStyle = '#6d7482';
            ctx.fillRect(x, y, q.w, q.h);
            ctx.fillStyle = '#aab2c0';
            ctx.fillRect(x, y, q.w, 2);
            ctx.fillStyle = COR.tinta;
            for (let i = 6; i < q.w; i += 12) ctx.fillRect(x + i, y + 4, 2, 2);
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.5, y + 0.5, q.w - 1, q.h - 1);
            ctx.fillStyle = Math.floor(visual.tempo * 2) % 2 ? COR.laranja : '#7a3000';
            ctx.fillRect(x + q.w / 2 - 2, y + q.h, 4, 3);
        }
    }

    function virgula(x, y, escala = 1, cor = COR.amarelo) {
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

    function cogumelo(x, y, cheio, escala = 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(escala, escala);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = cheio ? COR.tinta : 'rgba(230, 214, 255, 0.5)';
        ctx.fillStyle = cheio ? '#f4ead0' : 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath(); ctx.roundRect(-3, -1, 6, 8, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = cheio ? '#e0243c' : 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (cheio) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-4, -3, 1.6, 0, Math.PI * 2); ctx.arc(2, -5, 1.4, 0, Math.PI * 2); ctx.arc(4, -1.5, 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function desenharColetaveis() {
        const cam = visual.cam;
        const p = jogo.progresso;
        for (const it of nivel.itens) {
            if (it.sala !== jogo.sala.idx || p.coletados.has(it.id)) continue;
            if (it.premioDe && !p.chefes.has(it.premioDe)) continue;
            const x = it.x + it.w / 2 - cam.x;
            const y = it.y + it.h / 2 - cam.y + Math.sin(visual.tempo * 3 + it.x) * 2;
            const img = arte({ virgulas: 'saco', fragmento: 'fragmento', habilidade: 'orbe' }[it.tipo]);
            if (img) {
                const tam = it.tipo === 'habilidade' ? 26 : it.tipo === 'fragmento' ? 20 : 18;
                const brilho = ctx.createRadialGradient(x, y, 2, x, y, tam);
                brilho.addColorStop(0, it.tipo === 'fragmento' ? 'rgba(255, 140, 160, 0.45)' : 'rgba(255, 210, 63, 0.45)');
                brilho.addColorStop(1, 'rgba(255, 210, 63, 0)');
                ctx.fillStyle = brilho;
                ctx.beginPath(); ctx.arc(x, y, tam, 0, Math.PI * 2); ctx.fill();
                ctx.drawImage(img, x - tam / 2, y - tam / 2, tam, tam);
                continue;
            }
            if (it.tipo === 'virgulas') {
                // Saquinho de vírgulas.
                ctx.fillStyle = '#8a5a2b';
                ctx.strokeStyle = COR.tinta;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(x, y + 2, 7, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillRect(x - 3, y - 6, 6, 4);
                virgula(x, y + 2, 0.55);
            } else if (it.tipo === 'fragmento') {
                ctx.fillStyle = 'rgba(255, 80, 100, 0.25)';
                ctx.beginPath(); ctx.arc(x, y, 12 + Math.sin(visual.tempo * 4) * 2, 0, Math.PI * 2); ctx.fill();
                ctx.save();
                ctx.beginPath(); ctx.rect(x - 9, y - 10, 9, 20); ctx.clip();
                cogumelo(x, y + 2, true, 1.1);
                ctx.restore();
                ctx.strokeStyle = '#fff';
                ctx.setLineDash([2, 2]);
                ctx.beginPath(); ctx.arc(x, y + 2, 9, Math.PI, 0); ctx.stroke();
                ctx.setLineDash([]);
            } else if (it.tipo === 'habilidade') {
                const brilho = ctx.createRadialGradient(x, y, 2, x, y, 22);
                brilho.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                brilho.addColorStop(0.5, 'rgba(255, 180, 60, 0.45)');
                brilho.addColorStop(1, 'rgba(255, 180, 60, 0)');
                ctx.fillStyle = brilho;
                ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = COR.laranja;
                ctx.strokeStyle = COR.tinta;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                const letra = { rajada: 'R', dash: 'C', parede: 'L', pulo2: '( )' }[it.habilidade] || '?';
                texto(letra, x, y + 1, 11, '#fff', 3);
            }
        }
        // Bancos, placas, loja, alavancas.
        for (const b of nivel.bancos) {
            if (b.sala !== jogo.sala.idx) continue;
            const x = b.x - cam.x;
            const y = b.y - cam.y;
            const img = arte('banco');
            if (img) {
                if (!(jogo.fase === 'sentado' && jogo.progresso.banco === b.id)) pintar(img, x + b.w / 2, y + b.h, 0.62, 48, 46);
                if (jogo.progresso.banco === b.id) virgula(x + b.w / 2, y - 20, 0.5, COR.laranja);
                continue;
            }
            ctx.fillStyle = '#6b4a2b';
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.fillRect(x + 2, y, b.w - 4, 4); ctx.strokeRect(x + 2, y, b.w - 4, 4);
            ctx.fillRect(x + 2, y - 8, b.w - 4, 3); ctx.strokeRect(x + 2, y - 8, b.w - 4, 3);
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 4, y + 4, 3, b.h - 4); ctx.fillRect(x + b.w - 7, y + 4, 3, b.h - 4);
            if (jogo.progresso.banco === b.id) virgula(x + b.w / 2, y - 14, 0.5, COR.laranja);
        }
        for (const pl of nivel.placas) {
            if (pl.sala !== jogo.sala.idx) continue;
            const x = pl.x + pl.w / 2 - cam.x;
            const y = pl.y - cam.y;
            const img = arte('placa');
            if (img) { pintar(img, x, y + pl.h, 0.47, 32, 71); continue; }
            ctx.fillStyle = '#5a3d22';
            ctx.fillRect(x - 2, y + 12, 4, pl.h - 12);
            ctx.fillStyle = '#c9a36a';
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.fillRect(x - 12, y + 2, 24, 14); ctx.strokeRect(x - 12, y + 2, 24, 14);
            ctx.fillStyle = '#5a3d22';
            ctx.fillRect(x - 8, y + 6, 16, 2); ctx.fillRect(x - 8, y + 10, 11, 2);
        }
        for (const l of nivel.lojas) {
            if (l.sala !== jogo.sala.idx) continue;
            desenharLoja(l.x - cam.x, l.y - cam.y, l);
        }
        for (const a of nivel.alavancas) {
            if (a.sala !== jogo.sala.idx) continue;
            const aberta = jogo.progresso.abertos.has(jogo.sala.id);
            const x = a.x + a.w / 2 - cam.x;
            const y = a.y + a.h - cam.y;
            const img = arte('alavanca', aberta ? 1 : 0);
            if (img) { pintar(img, x, y, 0.38, 24, 62); continue; }
            ctx.fillStyle = '#444';
            ctx.fillRect(x - 6, y - 4, 12, 4);
            ctx.strokeStyle = '#aab2c0';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + (aberta ? 9 : -9), y - 18); ctx.stroke();
            ctx.fillStyle = aberta ? COR.verde : '#e0245e';
            ctx.beginPath(); ctx.arc(x + (aberta ? 9 : -9), y - 19, 3.5, 0, Math.PI * 2); ctx.fill();
        }
    }

    /** Barraca do ItaloLOL (provisória). */
    function desenharLoja(x, y, l) {
        const img = arte('barraca');
        if (img) { pintar(img, x + l.w / 2, y + l.h, 0.52, 64, 110); return; }
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x - 10, y + 12, l.w + 20, l.h - 12);
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 2 ? '#fff' : '#e0243c';
            ctx.fillRect(x - 12 + i * 9, y, 9, 10);
        }
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 12, y, 54, 10);
        // ItaloLOL atrás do balcão.
        ctx.fillStyle = '#e0a57a';
        ctx.beginPath(); ctx.arc(x + l.w / 2, y + 18, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b1b1b';
        ctx.fillRect(x + l.w / 2 - 8, y + 12, 16, 3);
        ctx.fillStyle = '#2b6cb0';
        ctx.fillRect(x - 10, y + 24, l.w + 20, 10);
        ctx.strokeRect(x - 10, y + 24, l.w + 20, 10);
        virgula(x + l.w / 2, y + 30, 0.5);
    }

    /** Salas secretas ficam cobertas de parede até o Degustador entrar nelas. */
    const revelados = new Set();
    function desenharSegredos() {
        const j = jogo.jogador;
        const cx = j.x + JL / 2;
        const cy = j.y + JA / 2;
        nivel.segredos.forEach((sg, i) => {
            if (revelados.has(i) || sg.sala !== jogo.sala.idx) return;
            if (cx > sg.x && cx < sg.x + sg.w && cy > sg.y && cy < sg.y + sg.h) { revelados.add(i); return; }
            const tiles = TILES_AREA[jogo.sala.area] || TILES_AREA.telhados;
            for (let y = sg.y; y < sg.y + sg.h; y += TL) {
                const meio = arte(`meio_${jogo.sala.area}`);
                for (let x = sg.x; x < sg.x + sg.w; x += TL) {
                    if (meio) ctx.drawImage(meio, Math.round(x - visual.cam.x), Math.round(y - visual.cam.y), TL, TL);
                    else ctx.drawImage(tiles.meio, Math.round(x - visual.cam.x), Math.round(y - visual.cam.y));
                }
            }
        });
    }

    // ------------------------------------------------------------- Degustador
    function poseDoJogador() {
        const j = jogo.jogador;
        if (jogo.fase === 'morto') return ['morrer', 0];
        if (jogo.fase === 'sentado') return ['sentado', 0];
        if (j.estado === 'subindo') return ['subir', j.subir && j.subir.t > CONFIG.tempoSubir * 0.5 ? 1 : 0];
        if (j.estado === 'agarrado') return ['agarrado', 0];
        if (j.golpe && j.golpe.t < 0.14) {
            const g = j.golpe;
            if (g.dir === 'cima') return ['golpeCima', 0];
            if (g.dir === 'baixo') return [g.noChao ? 'golpeRasteira' : 'golpeBaixo', 0];
            if (g.dir === 'cimaDiag') return ['golpeDiagCima', 0];
            if (g.dir === 'baixoDiag') return ['golpeDiagBaixo', 0];
            return ['golpeFrente', g.t < 0.05 ? 0 : 1];
        }
        if (j.recargaMagia > CONFIG.rajadaRecarga - 0.2) return ['atirar', j.recargaMagia > CONFIG.rajadaRecarga - 0.08 ? 1 : 0];
        if (j.estado === 'dash') return ['dash', j.dashT > CONFIG.dashTempo * 0.5 ? 0 : 1];
        if (j.estado === 'degustando') return ['degustar', visual.tempo * 5];
        if (j.invencivel > CONFIG.invencivel - 0.25 && jogo.fase === 'jogando') return ['dano', 0];
        if (j.grudado || (!j.noChao && j.parede !== 0 && j.vy > 0 && jogo.progresso.habilidades.has('parede'))) return ['parede', 0];
        if (!j.noChao && visual.tempo - visual.puloDuploEm < 0.3) return ['puloDuplo', 0];
        if (!j.noChao) return [j.vy < 0 ? 'pular' : 'cair', 0];
        if (Math.abs(j.vx) > 20) return ['correr', (j.x / 9) | 0];
        return ['parado', visual.tempo * 3];
    }

    // Tamanho do Degustador na tela: o quadro de 128 px vira 44 px (corpo de pé ≈ 40 px).
    const TAM_JOGADOR = 44;

    function desenharJogador() {
        const j = jogo.jogador;
        const cam = visual.cam;
        if (jogo.fase === 'morto' && visual.tempo - visual.morteEm > 0.15) return;
        if (jogo.fase === 'perigo' && jogo.faseT > CONFIG.tempoPerigo * 0.35 && jogo.faseT < CONFIG.tempoPerigo * 0.75) return;
        if (j.invencivel > 0 && jogo.fase === 'jogando' && Math.floor(visual.tempo * 16) % 2 === 0) return;
        const [pose, i] = poseDoJogador();
        let olhando = j.olhando;
        if (pose === 'parede') olhando = -(j.grudado || j.parede);
        if (pose === 'agarrado' || pose === 'subir') olhando = j.lado || j.olhando;
        if (pose.startsWith('golpe')) olhando = j.golpe.lado;
        const cx = j.x + JL / 2 - cam.x;
        let base = j.y + JA - cam.y;
        if (pose === 'agarrado') base += 10;
        const img = quadroDe(pose, i);
        if (j.estado === 'dash') {
            // Rastro da capa.
            for (let k = 1; k <= 3; k++) {
                ctx.globalAlpha = 0.18 * (4 - k);
                ctx.fillStyle = '#1b1b1b';
                ctx.fillRect(cx - j.dashLado * k * 12 - 7, base - 24, 14, 22);
            }
            ctx.globalAlpha = 1;
        }
        if (pronta(img)) {
            const k = TAM_JOGADOR / 128;
            pintar(img, cx, base, k, 64, 125, olhando);
        } else {
            ctx.fillStyle = '#e040fb';
            ctx.fillRect(cx - 7, base - 26, 14, 26);
            ctx.fillStyle = '#4c8c2b';
            ctx.fillRect(cx - 9, base - 30, 18, 6);
        }
        if (j.estado === 'degustando') {
            // Lanche e anel de carga.
            const k = j.degustarT / (jogo.progresso.loja.has('lanche') ? CONFIG.tempoDegustarRapido : CONFIG.tempoDegustar);
            ctx.strokeStyle = COR.amarelo;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, base - 38, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#d98a3a';
            ctx.beginPath(); ctx.moveTo(cx, base - 44); ctx.quadraticCurveTo(cx + 6, base - 33, cx, base - 33); ctx.quadraticCurveTo(cx - 6, base - 33, cx, base - 44); ctx.fill();
        }
        if (jogo.fase === 'sentado') texto('SALVO', cx, base - 44, 12, COR.verde, 3);
    }

    /** Arco branco da coronhada. */
    function desenharGolpe() {
        const j = jogo.jogador;
        const g = j.golpe;
        if (!g) return;
        const cam = visual.cam;
        const k = g.t / CONFIG.golpeVisual;
        const cx = j.x + JL / 2 - cam.x;
        const cy = j.y + JA / 2 - cam.y;
        ctx.save();
        ctx.translate(cx, cy);
        const gx = g.gx ?? g.lado;
        const gy = g.gy ?? 0;
        let ang = Math.atan2(gy, gx);
        if (g.dir === 'baixo' && g.noChao) ang = g.lado > 0 ? 0.35 : Math.PI - 0.35;   // rasteira
        const arco = arte('golpeArco', Math.min(2, k * 3));
        if (arco) {
            ctx.restore();
            // A meia-lua abre para a direita; gira para a direção do golpe.
            const d = 14;
            const tam = 50;
            ctx.globalAlpha = 1 - k * k * 0.7;
            pintar(arco, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, tam / 96, 48, 48, 1, ang);
            ctx.globalAlpha = 1;
            return;
        }
        ctx.rotate(ang);
        ctx.globalAlpha = 1 - k * k;
        const raio = 22 + k * 10;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(4, 0, raio, -1.1, 1.1);
        ctx.arc(-2, 0, raio - 9, 1.1, -1.1, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COR.laranja;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------- inimigos
    function desenharInimigos() {
        const cam = visual.cam;
        // Chefes derrotados: ficam no chão uns segundos e somem.
        visual.cadaveres = visual.cadaveres.filter((c) => c.sala === jogo.sala.idx && visual.tempo - c.inicio < 6);
        for (const c of visual.cadaveres) {
            const img = arte(c.nome);
            if (!img) continue;
            const t = visual.tempo - c.inicio;
            ctx.save();
            ctx.globalAlpha = Math.min(1, (6 - t) / 1.5);
            if (c.voa) pintar(img, c.x - cam.x, c.base - cam.y - 20 + Math.min(1, t) * 20, 116 / 256, 128, 205, c.lado);
            else pintar(img, c.x - cam.x, c.base - cam.y + 2, 76 / 192, 96, 187, c.lado);
            ctx.restore();
        }
        for (const e of jogo.inimigos) {
            if (!e.vivo) continue;
            const cx = e.x + e.w / 2 - cam.x;
            const cy = e.y + e.h / 2 - cam.y;
            if (cx < -80 || cx > W + 80 || cy < -80 || cy > H + 80) continue;
            const flash = e.flash > 0;
            ctx.save();
            ctx.globalAlpha = e.alpha ?? 1;
            const desenho = DESENHOS[e.tipo];
            if (desenho) desenho(e, cx, cy, flash);
            ctx.restore();
        }
    }

    function spriteInimigo(nome, i, cx, base, tam, ancoraY, virar, flash, tinta) {
        const img = quadroDe(nome, i);
        if (!pronta(img)) return false;
        let fonte = img;
        if (flash) fonte = tingido(img, '#ffffff');
        else if (tinta) fonte = tingido(img, tinta);
        const q = img.naturalWidth;
        const k = tam / q;
        ctx.save();
        ctx.translate(Math.round(cx), Math.round(base));
        if (virar) ctx.scale(-1, 1);
        const h = img.naturalHeight * k;
        if (tinta && !flash) {
            ctx.drawImage(img, -tam / 2, -ancoraY * k, tam, h);
            ctx.globalAlpha *= 0.45;
        }
        ctx.drawImage(fonte, -tam / 2, -ancoraY * k, tam, h);
        ctx.restore();
        return true;
    }

    const contorno = (flash, cor) => { ctx.fillStyle = flash ? '#fff' : cor; ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.5; };

    const DESENHOS = {
        capanga(e, cx, cy, flash) {
            if (!spriteInimigo('capanga', visual.tempo * 8 + e.fase * 4, cx, e.y + e.h - visual.cam.y, 34, 125, e.dir < 0, flash)) {
                contorno(flash, '#e0245e');
                ctx.fillRect(cx - e.w / 2, cy - e.h / 2, e.w, e.h);
            }
        },
        ping(e, cx, cy, flash) {
            const caca = e.estado === 'caca';
            if (caca) {
                ctx.fillStyle = 'rgba(255, 60, 60, 0.3)';
                ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
            }
            if (spriteInimigo('ping', visual.tempo * (caca ? 16 : 9) + e.fase * 3, cx, cy, 30, 32, e.dir < 0, flash)) return;
            const asa = Math.sin(visual.tempo * 30 + e.fase * 9) * 5;
            ctx.fillStyle = flash ? '#fff' : '#3a0d14';
            ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 14, cy - 4 - asa); ctx.lineTo(cx - 9, cy + 3); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy - 4 - asa); ctx.lineTo(cx + 9, cy + 3); ctx.fill();
            if (e.estado === 'caca') {
                ctx.fillStyle = 'rgba(255, 60, 60, 0.3)';
                ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
            }
            contorno(flash, '#ff3b3b');
            ctx.beginPath(); ctx.roundRect(cx - 8, cy - 7, 16, 14, 7); ctx.fill(); ctx.stroke();
            texto('!', cx, cy + 1, 12, '#fff', 0);
        },
        emoji(e, cx, cy, flash) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.sin(visual.tempo * 6 + e.fase) * 0.3);
            contorno(flash, '#ffcc22');
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255, 60, 40, 0.5)';
            ctx.beginPath(); ctx.arc(0, 2, 6, 0, Math.PI); ctx.fill();
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-1, -3); ctx.moveTo(6, -5); ctx.lineTo(1, -3); ctx.stroke();
            ctx.fillStyle = COR.tinta;
            ctx.fillRect(-4, -2, 2, 2); ctx.fillRect(2, -2, 2, 2);
            ctx.beginPath(); ctx.arc(0, 5, 3, Math.PI, 0); ctx.stroke();
            ctx.restore();
        },
        drone(e, cx, cy, flash) {
            if (e.estado === 'mirar' && Math.floor(visual.tempo * 16) % 2) {
                ctx.fillStyle = 'rgba(90, 255, 120, 0.35)';
                ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
            }
            const mirando = e.estado === 'mirar';
            if (!spriteInimigo(mirando ? 'droneMirar' : 'drone', visual.tempo * 20, cx, cy, 34, 64, e.dir < 0, flash)) {
                contorno(flash, '#2ecc71');
                ctx.fillRect(cx - e.w / 2, cy - e.h / 2, e.w, e.h);
            }
        },
        troll(e, cx, cy, flash) {
            const treme = e.estado === 'preparar' && !calmo ? Math.sin(visual.tempo * 70) * 1.5 : 0;
            const x = cx + treme;
            const base = e.y + e.h - visual.cam.y;
            const quadro = { preparar: ['trollPreparar', 0], investida: ['trollInvestida', visual.tempo * 12], cansado: ['trollCansado', 0] }[e.estado] || ['trollAndar', visual.tempo * 8 + e.fase * 4];
            if (spriteInimigo(quadro[0], quadro[1], x, base + 1, 40, 93, e.dir < 0, flash)) return;
            if (e.estado === 'investida') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - e.dir * (14 + k * 6), base - 6 - k * 6); ctx.lineTo(x - e.dir * (24 + k * 6), base - 6 - k * 6); ctx.stroke(); }
            }
            contorno(flash, '#3f7a3a');
            ctx.beginPath(); ctx.ellipse(x, base - 11, 12, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // corpo (moletom)
            ctx.beginPath(); ctx.arc(x + e.dir * 6, base - 19, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // cabeça
            ctx.fillStyle = e.estado === 'preparar' || e.estado === 'investida' ? '#ff3b3b' : '#fff';
            ctx.fillRect(x + e.dir * 8 - 1, base - 22, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + e.dir * 4 - 4, base - 16, 8, 3); // sorriso de troll
            ctx.fillStyle = COR.tinta;
            ctx.fillRect(x - 8, base - 3, 5, 3); ctx.fillRect(x + 3, base - 3, 5, 3);
        },
        spam(e, cx, cy, flash) {
            const amassa = e.noChao && e.t < 0.12 ? 3 : 0;
            const x = cx;
            const base = e.y + e.h - visual.cam.y;
            // 1 parado, 2 agachado (logo antes de pular ou ao pousar), 3 no ar.
            const agachado = e.noChao && (e.t < 0.12 || e.t > (e.espera || 1) - 0.25);
            if (spriteInimigo('spam', !e.noChao ? 2 : agachado ? 1 : 0, x, base + 1, 28, 61, e.dir < 0, flash)) return;
            contorno(flash, '#f4f4f4');
            ctx.beginPath(); ctx.rect(x - 9, base - 16 + amassa, 18, 16 - amassa); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - 9, base - 16 + amassa); ctx.lineTo(x, base - 8); ctx.lineTo(x + 9, base - 16 + amassa); ctx.stroke();
            ctx.fillStyle = '#e0243c';
            ctx.fillRect(x - 6, base - 5, 12, 3);
            ctx.fillStyle = '#fff';
            for (let k = -6; k < 6; k += 3) { ctx.beginPath(); ctx.moveTo(x + k, base - 11); ctx.lineTo(x + k + 1.5, base - 8); ctx.lineTo(x + k + 3, base - 11); ctx.fill(); }
        },
        bug(e, cx, cy, flash) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.atan2(e.ny ?? -1, e.nx ?? 0) + Math.PI / 2);
            const img = quadroDe('bug', visual.tempo * 8);
            if (pronta(img)) {
                // Pés do besouro (linha ~40 do quadro de 48) encostados na superfície.
                const k = 22 / 48;
                ctx.drawImage(flash ? tingido(img, '#ffffff') : img, -24 * k, e.h / 2 - 40 * k, 48 * k, 48 * k);
                ctx.restore();
                return;
            }
            const perna = Math.sin(visual.tempo * 20) * 2;
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            for (const k of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(k, 2); ctx.lineTo(k + perna, 7); ctx.stroke(); }
            contorno(flash, '#4b1f7a');
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = Math.floor(visual.tempo * 8) % 2 ? '#ff4fd8' : '#2bb3c0';
            ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(2, -3, 2, 2);
            ctx.restore();
        },
        moderador(e, cx, cy, flash) {
            const base = e.y + e.h - visual.cam.y;
            const d = e.dir;
            const quadro = { erguer: ['modErguer', 0], golpe: ['modGolpe', 0], recuperar: ['modRecuperar', 0] }[e.estado] || ['modGuarda', visual.tempo * 3];
            if (spriteInimigo(quadro[0], quadro[1], cx, base + 1, 44, 93, d < 0, flash)) return;
            contorno(flash, '#6d7482');
            ctx.beginPath(); ctx.roundRect(cx - 9, base - 24, 18, 24, 4); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, base - 26, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e0243c';
            ctx.fillRect(cx - 5, base - 28, 10, 2);
            // Martelo do BAN.
            const ang = e.estado === 'erguer' ? -2.2 : e.estado === 'golpe' ? 0.6 : -0.6;
            ctx.save();
            ctx.translate(cx + d * 4, base - 18);
            ctx.scale(d, 1);
            ctx.rotate(ang);
            ctx.fillStyle = '#6b4a2b';
            ctx.fillRect(0, -2, 20, 4);
            contorno(flash, '#9aa1ad');
            ctx.fillRect(16, -7, 9, 14); ctx.strokeRect(16, -7, 9, 14);
            ctx.restore();
            // Escudo na frente.
            if (e.escudo) {
                contorno(flash, '#2b6cb0');
                ctx.beginPath(); ctx.roundRect(cx + d * 9 - 4, base - 26, 8, 22, 3); ctx.fill(); ctx.stroke();
                texto('M', cx + d * 9, base - 15, 9, '#fff', 0);
            }
        },
        feiticeira(e, cx, cy, flash) {
            const j = jogo.jogador;
            const olhaDireita = j.x > e.x;
            if (e.estado === 'conjurar') {
                ctx.fillStyle = 'rgba(255, 79, 216, 0.4)';
                ctx.beginPath(); ctx.arc(cx + e.dir * 10, cy - 4, 6 + e.t * 10, 0, Math.PI * 2); ctx.fill();
            }
            const quadro = e.estado === 'conjurar' ? ['feiticeiraConjurar', 0] : e.estado === 'sumir' || e.estado === 'aparecer' ? ['feiticeiraSumir', 0] : ['feiticeira', visual.tempo * 6];
            if (!spriteInimigo(quadro[0], quadro[1], cx, cy, 42, 64, OLHA_ESQUERDA.has('feiticeira') ? olhaDireita : !olhaDireita, flash)) {
                contorno(flash, '#b04dff');
                ctx.fillRect(cx - e.w / 2, cy - e.h / 2, e.w, e.h);
            }
        },
        sombra(e, cx, cy, flash) {
            ctx.fillStyle = 'rgba(160, 70, 255, 0.22)';
            ctx.beginPath(); ctx.arc(cx, cy, 18 + Math.sin(visual.tempo * 5) * 2, 0, Math.PI * 2); ctx.fill();
            const treme = e.estado === 'preparar' && !calmo ? Math.sin(visual.tempo * 60) * 1.2 : 0;
            if (spriteInimigo('sombra', visual.tempo * 5, cx + treme, e.y + e.h - visual.cam.y, 46, 125, e.dir < 0, flash)) return;
            const img = quadroDe('cair', 0);
            ctx.globalAlpha *= 0.85;
            ctx.fillStyle = 'rgba(160, 70, 255, 0.25)';
            ctx.beginPath(); ctx.arc(cx, cy, 18 + Math.sin(visual.tempo * 5) * 2, 0, Math.PI * 2); ctx.fill();
            if (pronta(img)) {
                const k = 44 / 128;
                ctx.save();
                ctx.translate(cx, e.y + e.h - visual.cam.y);
                if (e.dir < 0) ctx.scale(-1, 1);
                ctx.drawImage(tingido(img, flash ? '#ffffff' : '#12051f'), -64 * k, -125 * k, 44, 44);
                ctx.restore();
            }
            ctx.fillStyle = COR.roxo;
            ctx.fillRect(cx - 4, cy - 8, 2, 2); ctx.fillRect(cx + 2, cy - 8, 2, 2);
        },
        capangaMor(e, cx, cy, flash) {
            const base = e.y + e.h - visual.cam.y;
            const est = e.estado;
            const quadro = est === 'corrida' ? ['cmCorrida', visual.tempo * 12]
                : est === 'atordoado' ? ['cmAtordoado', visual.tempo * 4]
                : est === 'marretaPrep' ? ['cmMarreta', 0]
                : est === 'marreta' || est === 'recuperar' ? ['cmMarreta', 1]
                : est === 'saltoPrep' || est === 'corridaPrep' ? ['cmPreparar', 0]
                : est === 'salto' || est === 'inicio' ? ['cmSalto', 0]
                : ['cmOcioso', visual.tempo * 3];
            const fase2 = e.vida <= e.vidaMax / 2 && !flash ? 'rgba(200, 0, 40, 1)' : null;
            if (spriteInimigo(quadro[0], quadro[1], cx, base + 2, 76, 187, e.dir < 0, flash, fase2 && Math.sin(visual.tempo * 8) > 0.6 ? fase2 : null)) return;
            // Sem arte: o capanga normal tingido e a marreta desenhada.
            if (!spriteInimigo('capanga', est === 'corrida' ? visual.tempo * 12 : 0, cx, base + 2, 84, 125, e.dir < 0, flash, 'rgba(120, 0, 30, 1)')) {
                contorno(flash, '#8a1030');
                ctx.fillRect(e.x - visual.cam.x, e.y - visual.cam.y, e.w, e.h);
            }
            if (est === 'atordoado') {
                for (let k = 0; k < 3; k++) {
                    const a = visual.tempo * 5 + (k * Math.PI * 2) / 3;
                    texto('★', cx + Math.cos(a) * 16, e.y - visual.cam.y - 6 + Math.sin(a) * 4, 10, COR.amarelo, 2);
                }
            }
        },
        opressor(e, cx, cy, flash) {
            if (e.aviso) {
                // Mira do punho: marca no chão e coluna de onde ele desce.
                const a = e.aviso;
                ctx.fillStyle = `rgba(255, 59, 59, ${0.3 + a.t * 0.5})`;
                ctx.fillRect(a.x - visual.cam.x, a.y - visual.cam.y, a.w, a.h);
                ctx.fillStyle = `rgba(160, 70, 255, ${0.08 + a.t * 0.12})`;
                ctx.fillRect(a.x - visual.cam.x, jogo.sala.px.y - visual.cam.y, a.w, a.y - jogo.sala.px.y);
            }
            const nome = { joinha: 'opJoinha', grito: 'opGrito', invocar: 'opGrito', glitch: 'opGlitch' }[e.estado] || 'opFlutuar';
            const fase2 = e.vida <= e.vidaMax / 2 && !flash && Math.sin(visual.tempo * 10) > 0.7 ? 'rgba(90, 255, 120, 1)' : null;
            if (spriteInimigo(nome, visual.tempo * 6, cx, cy, 116, 128, e.dir < 0, flash, fase2)) return;
            // O Stand "Opressor do Chat": sombra de código com olhos roxos e joinha.
            const pulso = 0.5 + 0.5 * Math.sin(visual.tempo * 4);
            const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 70);
            aura.addColorStop(0, `rgba(160, 70, 255, ${0.35 + pulso * 0.2})`);
            aura.addColorStop(0.7, 'rgba(90, 255, 120, 0.12)');
            aura.addColorStop(1, 'rgba(90, 255, 120, 0)');
            ctx.fillStyle = aura;
            ctx.fillRect(cx - 80, cy - 80, 160, 160);
            ctx.fillStyle = flash ? '#fff' : 'rgba(12, 4, 22, 0.95)';
            ctx.beginPath(); ctx.ellipse(cx, cy, e.w / 2 + 4, e.h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill();
            // Texto corrompido por dentro.
            if (!flash) {
                ctx.font = "bold 7px 'Courier New', monospace";
                ctx.fillStyle = 'rgba(90, 255, 120, 0.5)';
                ctx.textAlign = 'center';
                const linhas = ['#OTETPL', 'u/0ve/35', 'BAN L RATIO', '<X> ###', 'CORRUPÇÃO'];
                linhas.forEach((l, i) => ctx.fillText(l, cx + Math.sin(visual.tempo * 3 + i) * 3, cy - 18 + i * 9));
            }
            ctx.fillStyle = '#c77dff';
            ctx.fillRect(cx - 16, cy - 20, 10, 4);
            ctx.fillRect(cx + 6, cy - 20, 10, 4);
            // Joinha.
            const lado = e.dir;
            ctx.fillStyle = flash ? '#fff' : 'rgba(12, 4, 22, 0.95)';
            ctx.beginPath(); ctx.arc(cx + lado * 38, cy + 6, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(cx + lado * 38 - 4, cy - 16, 8, 16);
            if (e.aviso) {
                const a = e.aviso;
                ctx.fillStyle = `rgba(160, 70, 255, ${0.3 + a.t * 0.5})`;
                ctx.fillRect(a.x - visual.cam.x, a.y - visual.cam.y, a.w, a.h);
                ctx.fillStyle = `rgba(160, 70, 255, ${0.08 + a.t * 0.12})`;
                ctx.fillRect(a.x - visual.cam.x, jogo.sala.px.y - visual.cam.y, a.w, a.y - jogo.sala.px.y);
            }
        },
    };

    function desenharProjeteis() {
        const cam = visual.cam;
        for (const p of jogo.projeteis) {
            const x = p.x - cam.x;
            const y = p.y - cam.y;
            if (p.espera > 0) {
                // Aviso: poeira caindo do teto.
                if (p.tipo === 'pedra') {
                    ctx.fillStyle = 'rgba(200, 180, 150, 0.6)';
                    for (let k = 0; k < 3; k++) ctx.fillRect(x - 6 + k * 5, y - 20 + ((visual.tempo * 90 + k * 13) % 30), 2, 3);
                }
                continue;
            }
            const giro = Math.atan2(p.vy || 0, p.vx || 1);
            const img = arte({ bola: 'bolaVerde', magia: 'magia', glitch: 'glitch', pedra: 'pedra', onda: 'onda', punho: 'punho' }[p.tipo], visual.tempo * 10);
            if (img && p.tipo === 'bola') { pintar(img, x, y, (p.r * 2 + 10) / 24, 16, 12, 1, giro); continue; }
            if (img && p.tipo === 'magia') { pintar(img, x, y, (p.r * 2 + 12) / 32, 16, 16); continue; }
            if (img && p.tipo === 'glitch') { pintar(img, x, y, (p.r * 2 + 6) / 16, 8, 8); continue; }
            if (img && p.tipo === 'pedra') { pintar(img, x, y, (p.r * 2 + 8) / 32, 16, 16, 1, visual.tempo * 6); continue; }
            if (img && p.tipo === 'onda') { pintar(img, x + p.w / 2, y + p.h, (p.h + 12) / 32, 24, 40, Math.sign(p.vx) || 1); continue; }
            if (img && p.tipo === 'punho') {
                // O braço de sombra desce do teto; o punho de joinha fica embaixo.
                ctx.drawImage(img, x - 6, y, p.w + 12, p.h);
                continue;
            }
            if (p.tipo === 'bola') {
                ctx.fillStyle = 'rgba(120, 255, 90, 0.35)';
                ctx.beginPath(); ctx.arc(x, y, p.r + 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#7dff5a';
                ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
            } else if (p.tipo === 'magia') {
                ctx.fillStyle = 'rgba(255, 79, 216, 0.35)';
                ctx.beginPath(); ctx.arc(x, y, p.r + 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = COR.rosa;
                ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffd1f4';
                ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2); ctx.fill();
            } else if (p.tipo === 'glitch') {
                ctx.fillStyle = Math.floor(visual.tempo * 20 + p.x) % 2 ? COR.verde : COR.roxo;
                ctx.fillRect(x - p.r, y - p.r, p.r * 2, p.r * 2);
                ctx.fillStyle = '#fff';
                ctx.fillRect(x - 1, y - 1, 2, 2);
            } else if (p.tipo === 'pedra') {
                ctx.fillStyle = '#8a7a66';
                ctx.strokeStyle = COR.tinta;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            } else if (p.tipo === 'onda') {
                ctx.fillStyle = 'rgba(255, 200, 120, 0.85)';
                ctx.beginPath();
                ctx.moveTo(x, y + p.h);
                ctx.quadraticCurveTo(x + p.w / 2, y - 6, x + p.w, y + p.h);
                ctx.fill();
                ctx.strokeStyle = COR.laranja;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (p.tipo === 'palavra') {
                const caixa = arte('palavraCaixa');
                if (caixa) ctx.drawImage(caixa, 34, 6, 61, 20, x - 2, y - 1, p.w + 4, p.h + 2);
                else {
                    ctx.fillStyle = '#1b1b1b';
                    ctx.strokeStyle = '#ff3b3b';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.roundRect(x, y, p.w, p.h, 4); ctx.fill(); ctx.stroke();
                }
                ctx.font = "bold 13px Bangers, 'Arial Black', sans-serif";
                ctx.fillStyle = '#ff5b5b';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.texto, x + p.w / 2, y + p.h / 2 + 1);
            } else if (p.tipo === 'punho') {
                ctx.fillStyle = 'rgba(12, 4, 22, 0.9)';
                ctx.fillRect(x, y, p.w, p.h);
                ctx.strokeStyle = COR.roxo;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, p.w, p.h);
                ctx.fillStyle = COR.roxo;
                ctx.fillRect(x + 4, y + p.h - 26, p.w - 8, 22);
            }
        }
        // Rajada da MP5K.
        for (const b of jogo.tiros) {
            const x = b.x - cam.x;
            const y = b.y + b.h / 2 - cam.y;
            const img = arte('rajada', visual.tempo * 16);
            if (img) { pintar(img, x + b.w / 2, y, 46 / 96, 48, 16, Math.sign(b.vx) || 1); continue; }
            ctx.fillStyle = 'rgba(255, 140, 40, 0.35)';
            ctx.beginPath(); ctx.ellipse(x + b.w / 2, y, b.w / 2 + 6, 9, 0, 0, Math.PI * 2); ctx.fill();
            for (let k = 0; k < 3; k++) {
                ctx.fillStyle = '#ffb347';
                ctx.fillRect(x + 4 + k * 6, y - 7 + k * 5, 12, 4);
            }
        }
    }

    /**
     * O Inominável com arte: pose ('parado', 'fugir', 'gritar', 'derrotado') e o lado
     * para onde ele deve olhar. Devolve false se a arte ainda não carregou.
     */
    function inominavelArte(x, base, pose, lado, alpha = 1) {
        // [arte, fps, para que lado a arte olha]
        const nomes = { parado: ['inoParado', 4, -1], fugir: ['inoFugir', 12, 1], gritar: ['inoGritar', 8, -1], derrotado: ['inoDerrotado', 1, -1] };
        const [nome, fps, olha] = nomes[pose];
        const img = arte(nome, visual.tempo * fps);
        if (!img) return false;
        ctx.save();
        ctx.globalAlpha = alpha;
        pintar(img, x, base, 0.43, 80, 155, lado * olha);
        ctx.restore();
        return true;
    }

    /** O Inominável (desenhado por código a partir da ficha). */
    function inominavel(x, base, alpha = 1, derrotado = false) {
        const bob = derrotado ? 0 : Math.sin(visual.tempo * 3) * 1.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (derrotado) {
            ctx.translate(x, base);
            ctx.rotate(0.35);
            ctx.translate(-x, -base + 6);
        }
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#4a6fa5';
        ctx.fillRect(x - 10, base - 18, 8, 15); ctx.strokeRect(x - 10, base - 18, 8, 15);
        ctx.fillRect(x + 2, base - 18, 8, 15); ctx.strokeRect(x + 2, base - 18, 8, 15);
        ctx.fillStyle = '#6b5b4b';
        ctx.fillRect(x - 12, base - 4, 11, 4); ctx.fillRect(x + 1, base - 4, 11, 4);
        ctx.fillStyle = '#1b1b1b';
        ctx.beginPath(); ctx.ellipse(x, base - 28 + bob * 0.5, 15, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ['#c65d7b', '#6a8caf', '#b98b5e', '#7d5ba6'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - 6 + (i % 2) * 6, base - 34 + Math.floor(i / 2) * 6 + bob * 0.5, 5, 5); });
        ctx.fillStyle = '#e0a57a';
        ctx.fillRect(x + 11, base - 32 + bob * 0.5, 5, 10);
        ctx.fillStyle = '#9aa1ad';
        ctx.fillRect(x + 10, base - 24 + bob * 0.5, 14, 3);
        ctx.fillStyle = '#5865f2';
        ctx.fillRect(x + 15, base - 30 + bob * 0.5, 6, 6);
        const hy = base - 47 + bob;
        ctx.fillStyle = '#5a3b22';
        ctx.beginPath(); ctx.ellipse(x - 9, hy + 6, 3, 8, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e0a57a';
        ctx.beginPath(); ctx.arc(x, hy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5a3b22';
        ctx.beginPath(); ctx.arc(x, hy - 2, 8.5, Math.PI, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, hy + 3, 7, 0.1, Math.PI - 0.1); ctx.fill();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x - 3, hy - 1, 2.5, 0, Math.PI * 2); ctx.arc(x + 3.5, hy - 1, 2.5, 0, Math.PI * 2); ctx.stroke();
        if (derrotado) texto('x_x', x, hy - 16, 11, '#fff', 3);
        ctx.restore();
    }

    function desenharCameos() {
        const cam = visual.cam;
        const j = jogo.jogador;
        for (const c of jogo.cameos) {
            if (c.estado === 'sumiu') continue;
            const x = c.x + c.w / 2 - cam.x;
            const base = c.y + c.h - cam.y;
            const ladoJogador = j.x + JL / 2 - cam.x < x ? -1 : 1;
            if (c.final) {
                const derrotado = jogo.progresso.final || jogo.progresso.chefes.has(jogo.sala.chefeDef?.id);
                const pose = derrotado ? 'derrotado' : jogo.arena != null ? 'gritar' : 'parado';
                if (!inominavelArte(x, base, pose, ladoJogador)) inominavel(x, base, 1, derrotado);
                if (!derrotado && jogo.arena != null) {
                    const i = Math.floor(visual.tempo / 3) % Math.max(1, c.falas.length);
                    if (c.falas[i]) balao(c.falas[i], x, base - 60);
                }
                continue;
            }
            const alpha = c.estado === 'fugindo' ? Math.max(0, 1 - c.t) : 1;
            const fugindo = c.estado === 'fugindo';
            if (!inominavelArte(x, base, fugindo ? 'fugir' : 'parado', fugindo ? 1 : ladoJogador, alpha)) inominavel(x, base, alpha);
            const perto = Math.abs(j.x - c.x) < 280 && Math.abs(j.y - c.y) < 140;
            if (perto && c.estado === 'parado' && c.falas[0]) balao(c.falas[0], x, base - 60);
            if (c.estado === 'fugindo' && c.t < 0.6) balao('Fui!', x, base - 60);
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
            visual.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - forca * 0.4, vida: 0.35 + Math.random() * 0.4, cor, r: 1.5 + Math.random() * 2 });
        }
    }

    /** Efeito com arte animada (acerto, poeira, explosão) no ponto do mundo (x, y). */
    function efeito(nome, x, y, tam, duracao = 0.25, lado = 1, ang = 0) {
        if (!ARTE[nome] || calmo && nome === 'poeira') return;
        visual.fx.push({ nome, x, y, tam, duracao, lado, ang, inicio: visual.tempo });
    }

    function textoFlutuante(conteudo, x, y, cor = COR.amarelo, tamanho = 16) {
        visual.textos.push({ conteudo, x, y, cor, tamanho, inicio: visual.tempo });
    }

    function parar(s) { if (!calmo) visual.hitstop = Math.max(visual.hitstop, s); }
    function tremer(s) { if (!calmo) visual.tremor = Math.max(visual.tremor, s); }

    function tratarEventos() {
        for (const e of jogo.eventos) {
            switch (e.tipo) {
                case 'pulo': case 'subiu': particulas(e.x, e.y, 4, 'rgba(230, 214, 255, 0.8)', 50); efeito('poeira', e.x, e.y - 5, 22); break;
                case 'pulo2':
                    visual.puloDuploEm = visual.tempo;
                    textoFlutuante('( )', e.x, e.y, COR.lilas, 14);
                    particulas(e.x, e.y, 8, COR.lilas, 70);
                    break;
                case 'parede': particulas(e.x, e.y - 12, 5, 'rgba(230, 214, 255, 0.8)', 60); break;
                case 'dash': particulas(e.x, e.y - 12, 6, 'rgba(40, 40, 60, 0.8)', 60); break;
                case 'mola':
                    visual.molas.set(`${Math.floor(e.x / TL)},${Math.floor((e.y + 2) / TL)}`, visual.tempo);
                    particulas(e.x, e.y, 8, COR.amarelo, 90);
                    textoFlutuante('BOING!', e.x, e.y - 20);
                    break;
                case 'pogo': particulas(e.x, e.y + 6, 6, '#fff', 70); break;
                case 'acerto':
                    efeito('acerto', e.x, e.y, e.chefe ? 40 : 30, 0.18);
                    particulas(e.x, e.y, 6, '#fff', 110);
                    parar(e.chefe ? 0.03 : 0.045);
                    break;
                case 'bloqueio':
                    particulas(e.x, e.y, 6, COR.amarelo, 120);
                    textoFlutuante('CLANG!', e.x, e.y - 12, '#aab2c0', 14);
                    parar(0.05);
                    break;
                case 'derrubou':
                    efeito('respingo', e.x, e.y, 40, 0.35);
                    particulas(e.x, e.y, 14, '#ff3b3b', 130);
                    if (e.virgulas) textoFlutuante(`+${e.virgulas} ,`, e.x, e.y - 12, COR.amarelo, 14);
                    break;
                case 'paredeRachou': particulas(e.x, e.y, 5, '#aaa', 90); tremer(0.08); break;
                case 'paredeQuebrou': particulas(e.x, e.y, 22, '#aaa', 150); tremer(0.2); textoFlutuante('CRACK!', e.x, e.y); salvar(); break;
                case 'alavanca': textoFlutuante('CLIQUE!', e.x, e.y - 10, COR.verde); salvar(); break;
                case 'virgulas': textoFlutuante(`+${e.valor} ,`, e.x, e.y); salvar(); break;
                case 'fragmento': textoFlutuante(`Fragmento ${e.fragmentos}/4`, e.x, e.y - 8, '#ff8ca0'); salvar(); break;
                case 'cogumeloNovo': textoFlutuante('+1 COGUMELO!', e.x, e.y - 8, '#ff8ca0', 20); particulas(e.x, e.y, 20, '#ff8ca0', 120); salvar(); break;
                case 'habilidade': visual.flashBranco = 0.4; salvar(); break;
                case 'dano':
                    visual.flashDano = 0.35;
                    parar(0.12);
                    tremer(0.25);
                    particulas(e.x, e.y, 10, '#b04dff', 140);
                    break;
                case 'perigo': textoFlutuante('AI!', e.x, e.y - 20, '#ff4f4f'); break;
                case 'morte':
                    visual.morteEm = visual.tempo;
                    efeito('respingo', e.x, e.y - 10, 64, 0.5);
                    particulas(e.x, e.y, 30, '#b04dff', 200);
                    particulas(e.x, e.y, 12, COR.laranja, 160);
                    tremer(0.35);
                    salvar();
                    break;
                case 'curou': textoFlutuante('+1', e.x, e.y - 20, '#ff8ca0'); particulas(e.x, e.y, 8, '#ff8ca0', 60); break;
                case 'impacto': tremer(e.forte ? 0.25 : 0.12); particulas(e.x, e.y, 10, '#d8c4a0', 120); efeito('poeira', e.x, e.y - 8, e.forte ? 48 : 34, 0.3); break;
                case 'tiroInimigo': case 'magia': break;
                case 'rajada': particulas(e.x, e.y, 8, COR.laranja, 90); tremer(0.06); break;
                case 'faisca': particulas(e.x, e.y, 5, COR.amarelo, 80); break;
                case 'rebateu': particulas(e.x, e.y, 8, COR.rosa, 100); textoFlutuante('TOC!', e.x, e.y - 10, COR.rosa, 12); break;
                case 'alerta': textoFlutuante('!', e.x, e.y - 8, '#ff3b3b', 14); break;
                case 'sala':
                    if (e.de) {
                        visual.transicao = { de: { x: visual.cam.x, y: visual.cam.y }, t: 0 };
                    } else {
                        ajustarCamera(0, true);
                    }
                    if (e.areaNova) visual.area = { nome: MUNDO.areas[jogo.sala.area]?.nome || '', inicio: visual.tempo };
                    break;
                case 'banco': salvar(); particulas(e.x, e.y, 10, COR.verde, 60); break;
                case 'arena':
                    visual.chefeNome = core.Inimigos.TIPOS[e.chefe].nome;
                    tremer(0.3);
                    break;
                case 'chefeDerrotado': {
                    // O chefe fica caído no chão da arena (arte de derrotado), sumindo devagar.
                    const nome = e.chefe === 'capangaMor' ? 'cmDerrotado' : e.chefe === 'opressor' ? 'opDerrotado' : null;
                    const ch = jogo.inimigos.find((i) => i.tipo === e.chefe);
                    if (nome && ch) visual.cadaveres.push({ nome, x: ch.x + ch.w / 2, base: ch.y + ch.h, voa: e.chefe === 'opressor', lado: ch.dir, inicio: visual.tempo, sala: jogo.sala.idx });
                    efeito('respingo', e.x, e.y, 90, 0.6);
                    parar(0.35);
                    tremer(0.6);
                    visual.flashBranco = 0.5;
                    particulas(e.x, e.y, 40, '#fff', 220);
                    textoFlutuante('DERROTADO!', e.x, e.y - 30, COR.amarelo, 26);
                    salvar();
                    break;
                }
                case 'sombraDerrotada': textoFlutuante(`+${e.virgulas} , de volta!`, e.x, e.y - 12); particulas(e.x, e.y, 20, COR.roxo, 140); salvar(); break;
                case 'comprou': salvar(); break;
                case 'invocou': particulas(e.x, e.y, 12, COR.roxo, 100); break;
                case 'final': visual.fimEm = visual.tempo; salvar(); break;
                default: break;
            }
        }
        jogo.eventos.length = 0;
    }

    function desenharEfeitos(dt) {
        const cam = visual.cam;
        visual.fx = visual.fx.filter((f) => visual.tempo - f.inicio < f.duracao);
        for (const f of visual.fx) {
            const lista = ARTE[f.nome];
            const k = (visual.tempo - f.inicio) / f.duracao;
            const img = arte(f.nome, Math.min(lista.length - 1, k * lista.length));
            if (!img) continue;
            pintar(img, f.x - cam.x, f.y - cam.y, f.tam / img.naturalWidth, img.naturalWidth / 2, img.naturalHeight / 2, f.lado, f.ang);
        }
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
        if (visual.particulas.length > 400) visual.particulas.splice(0, visual.particulas.length - 400);
        visual.textos = visual.textos.filter((t) => visual.tempo - t.inicio < 0.9);
        for (const t of visual.textos) {
            const k = (visual.tempo - t.inicio) / 0.9;
            ctx.globalAlpha = 1 - k * k;
            texto(t.conteudo, t.x - cam.x, t.y - cam.y - k * 22, t.tamanho, t.cor, 4);
        }
        ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------- HUD e telas
    function texto(conteudo, x, y, tamanho, cor = '#fff', contornoL = 5, alinhar = 'center') {
        ctx.font = `${tamanho}px Bangers, 'Arial Black', sans-serif`;
        ctx.textAlign = alinhar;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        if (contornoL > 0) {
            ctx.lineWidth = contornoL;
            ctx.strokeStyle = COR.tinta;
            ctx.strokeText(conteudo, x, y);
        }
        ctx.fillStyle = cor;
        ctx.fillText(conteudo, x, y);
    }

    function paragrafo(conteudo, x, y, largura, tamanho = 14, cor = '#fff') {
        ctx.font = `bold ${tamanho}px 'Comic Neue', sans-serif`;
        ctx.fillStyle = cor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const palavras = conteudo.split(' ');
        const linhas = [];
        let linha = '';
        for (const p of palavras) {
            const teste = linha ? `${linha} ${p}` : p;
            if (ctx.measureText(teste).width > largura && linha) { linhas.push(linha); linha = p; } else linha = teste;
        }
        if (linha) linhas.push(linha);
        linhas.forEach((l, i) => ctx.fillText(l, x, y + i * (tamanho + 4)));
        return linhas.length;
    }

    function botaoTela(rotulo, x, y, w, h, cor, id, ativo = false) {
        ctx.fillStyle = cor;
        ctx.strokeStyle = ativo ? COR.amarelo : COR.tinta;
        ctx.lineWidth = ativo ? 4 : 3;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();
        texto(rotulo, x + w / 2, y + h / 2 + 1, 18, '#fff', 4);
        areas.push({ x, y, w, h, id });
    }

    function desenharHud() {
        const j = jogo.jogador;
        const p = jogo.progresso;
        // Vaso de Pontuação (a "alma").
        const vx = 32;
        const vy = 34;
        const vaso = arte('vaso');
        if (vaso) {
            // Moldura de 128 px (miolo preto: círculo de raio 40 em 64,65) desenhada em 56 px.
            const k = 56 / 128;
            ctx.drawImage(vaso, vx - 64 * k, vy - 64 * k, 128 * k, 128 * k);
            const mx = vx + 0.5 * k;
            const my = vy + 1 * k;
            const r = 38 * k;
            ctx.save();
            ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.clip();
            const nivelTinta = j.pontuacao / CONFIG.pontuacaoMax;
            const topo = my + r - nivelTinta * r * 2;
            ctx.fillStyle = j.pontuacao >= CONFIG.custoMagia ? '#fff5d1' : '#b9a6d9';
            ctx.beginPath();
            ctx.moveTo(mx - r - 2, my + r + 2);
            for (let x = -r - 2; x <= r + 2; x += 3) ctx.lineTo(mx + x, topo + Math.sin(visual.tempo * 4 + x * 0.3) * 1.5);
            ctx.lineTo(mx + r + 2, my + r + 2);
            ctx.fill();
            ctx.restore();
            virgula(mx, my, 1.1, j.pontuacao >= CONFIG.custoMagia ? COR.laranja : 'rgba(255, 255, 255, 0.3)');
        } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath(); ctx.arc(vx, vy, 22, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.arc(vx, vy, 20, 0, Math.PI * 2); ctx.clip();
        const nivelTinta = j.pontuacao / CONFIG.pontuacaoMax;
        const topo = vy + 20 - nivelTinta * 40;
        ctx.fillStyle = j.pontuacao >= CONFIG.custoMagia ? '#fff5d1' : '#b9a6d9';
        ctx.beginPath();
        ctx.moveTo(vx - 22, vy + 22);
        for (let x = -22; x <= 22; x += 4) ctx.lineTo(vx + x, topo + Math.sin(visual.tempo * 4 + x * 0.3) * 1.5);
        ctx.lineTo(vx + 22, vy + 22);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(vx, vy, 21, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(vx, vy, 23, 0, Math.PI * 2); ctx.stroke();
        virgula(vx, vy + 1, 1.3, j.pontuacao >= CONFIG.custoMagia ? COR.laranja : 'rgba(255, 255, 255, 0.35)');
        }
        // Cogumelos (vida).
        for (let i = 0; i < p.vidaMax; i++) {
            const img = arte(i < j.vida ? 'cogCheio' : 'cogVazio');
            if (img) ctx.drawImage(img, 66 + i * 20 - 9, 24 - 11, 19, 19);
            else cogumelo(66 + i * 20, 24, i < j.vida, 1);
        }
        // Fragmentos.
        if (p.fragmentos > 0) {
            const fx = 66 + p.vidaMax * 20 + 2;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(fx - 7, 17, 14, 14);
            ctx.fillStyle = '#ff8ca0';
            for (let k = 0; k < p.fragmentos; k++) ctx.fillRect(fx - 7 + (k % 2) * 7, 17 + Math.floor(k / 2) * 7, 6, 6);
        }
        // Vírgulas.
        virgula(66, 46, 0.9);
        texto(`${p.virgulas}`, 76, 47, 16, COR.amarelo, 4, 'left');
        // Salvando…
        if (visual.tempo - visual.salvouEm < 1.2) texto('salvo', W - 12, H - 14, 12, COR.verde, 3, 'right');
        // Chefe.
        const chefe = jogo.arena != null ? jogo.inimigos.find((e) => e.chefe && e.vivo) : null;
        if (chefe) {
            const w = 300;
            const x = (W - w) / 2;
            texto(visual.chefeNome || '', W / 2, H - 34, 16, '#fff', 4);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x - 2, H - 24, w + 4, 10);
            ctx.fillStyle = '#e0243c';
            ctx.fillRect(x, H - 22, (w * Math.max(0, chefe.vida)) / chefe.vidaMax, 6);
        }
        // Nome da área ao entrar.
        if (visual.area) {
            const t = visual.tempo - visual.area.inicio;
            if (t < 3) {
                ctx.globalAlpha = Math.min(1, t * 2, (3 - t) * 1.5);
                texto(visual.area.nome.toUpperCase(), W / 2, 110, 34, '#fff', 6);
                ctx.fillStyle = '#fff';
                ctx.fillRect(W / 2 - 120, 132, 240, 2);
                ctx.globalAlpha = 1;
            }
        }
        // Placa por perto.
        const placa = nivel.placas.find((pl) => pl.sala === jogo.sala.idx && core.colide({ x: j.x, y: j.y, w: JL, h: JA }, { x: pl.x - 20, y: pl.y - 10, w: pl.w + 40, h: pl.h + 10 }));
        if (placa && placa.texto && jogo.fase === 'jogando') {
            ctx.fillStyle = 'rgba(7, 4, 26, 0.82)';
            ctx.fillRect(40, H - 70, W - 80, 52);
            ctx.strokeStyle = COR.lilas;
            ctx.lineWidth = 1;
            ctx.strokeRect(40.5, H - 69.5, W - 81, 51);
            paragrafo(textoTeclas(placa.texto), W / 2, H - 52, W - 110, 14, '#fff');
        }
        // Dica de ↑ perto de banco ou loja.
        const perto = [...nivel.bancos, ...nivel.lojas].find((b) => b.sala === jogo.sala.idx && core.colide({ x: j.x, y: j.y, w: JL, h: JA }, core.zonaDeUso(b)));
        if (perto && jogo.fase === 'jogando') texto(textoTeclas('[CIMA]'), j.x + JL / 2 - visual.cam.x, j.y - 14 - visual.cam.y + Math.sin(visual.tempo * 6) * 2, 16, COR.amarelo, 3);
    }

    /** Troca [PULO], [GOLPE]… pelo nome da tecla do esquema atual (ou do botão, no celular). */
    function textoTeclas(t) {
        const nomes = toque ? NOMES_TOQUE : esquema.nomes;
        return t.replace(/\[([A-Z]+)\]/g, (m, k) => nomes[k] ?? m);
    }

    function desenharMapa() {
        ctx.fillStyle = 'rgba(7, 4, 26, 0.92)';
        ctx.fillRect(0, 0, W, H);
        texto('MAPA DA TORADOLÂNDIA', W / 2, 24, 24, COR.laranja, 5);
        const p = jogo.progresso;
        const escala = Math.min((W - 60) / nivel.largura, (H - 90) / nivel.altura);
        const ox = (W - nivel.largura * escala) / 2;
        const oy = 48;
        for (const s of nivel.salas) {
            if (!p.visitadas.has(s.id)) continue;
            const x = ox + s.tx * escala;
            const y = oy + s.ty * escala;
            const w = s.w * escala;
            const h = s.h * escala;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(x, y, w, h);
            // Contorno do terreno (paredes).
            ctx.fillStyle = MUNDO.areas[s.area]?.cor || '#fff';
            ctx.globalAlpha = 0.75;
            const passo = Math.max(1, Math.round(1 / escala));
            for (let ty = 0; ty < s.h; ty += passo) {
                for (let tx = 0; tx < s.w; tx += passo) {
                    const c = nivel.grade[s.ty + ty][s.tx + tx];
                    if (c === '#' || c === 'X') {
                        const vizinhoVazio = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
                            const cc = nivel.grade[s.ty + ty + b]?.[s.tx + tx + a];
                            return cc && cc !== '#' && cc !== 'X' && cc !== 'r';
                        });
                        if (vizinhoVazio) ctx.fillRect(x + tx * escala, y + ty * escala, Math.max(1, escala * passo), Math.max(1, escala * passo));
                    }
                }
            }
            ctx.globalAlpha = 1;
            ctx.strokeStyle = s === jogo.sala ? COR.amarelo : 'rgba(230, 214, 255, 0.5)';
            ctx.lineWidth = s === jogo.sala ? 2 : 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            if (s.chefeDef && !p.chefes.has(s.chefeDef.id)) {
                const img = arte('mapaChefe');
                if (img) ctx.drawImage(img, x + w / 2 - 8, y + h / 2 - 8, 16, 16);
                else texto('☠', x + w / 2, y + h / 2, 12, '#ff5b5b', 3);
            }
        }
        for (const b of nivel.bancos) {
            if (!p.visitadas.has(nivel.salas[b.sala].id)) continue;
            const img = arte('mapaBanco');
            if (img) ctx.drawImage(img, ox + (b.x / TL) * escala - 6, oy + (b.y / TL) * escala - 10, 12, 12);
            else texto('b', ox + (b.x / TL) * escala, oy + (b.y / TL) * escala - 3, 12, COR.verde, 3);
        }
        if (p.sombra) {
            const s = nivel.salaPorId.get(p.sombra.sala);
            const img = arte('mapaSombra');
            if (s && img) ctx.drawImage(img, ox + (p.sombra.x / TL) * escala - 7, oy + (p.sombra.y / TL) * escala - 7, 14, 14);
            else if (s) texto('✦', ox + (p.sombra.x / TL) * escala, oy + (p.sombra.y / TL) * escala, 12, COR.roxo, 3);
        }
        const j = jogo.jogador;
        if (Math.floor(visual.tempo * 3) % 2) {
            ctx.fillStyle = COR.laranja;
            ctx.beginPath(); ctx.arc(ox + (j.x / TL) * escala, oy + (j.y / TL) * escala, 3, 0, Math.PI * 2); ctx.fill();
        }
        const habs = [...p.habilidades].map((h) => HABILIDADES[h].nome).join(' · ') || 'nenhuma habilidade ainda';
        texto(habs, W / 2, H - 38, 14, COR.lilas, 3);
        texto(`${tempoTexto(p.tempo)} · ${p.mortes} mortes · ${p.coletados.size} itens`, W / 2, H - 18, 13, '#fff', 3);
        areas = [];
        if (toque) botaoTela('FECHAR', W - 100, 8, 90, 30, '#2a2a3a', 'mapa');
    }

    function desenharPegou() {
        const hab = HABILIDADES[jogo.pegou];
        if (!hab) return;
        ctx.fillStyle = 'rgba(7, 4, 26, 0.86)';
        ctx.fillRect(0, 0, W, H);
        const icone = arte({ rajada: 'habRajada', dash: 'habDash', parede: 'habParede', pulo2: 'habPulo2' }[jogo.pegou]);
        if (icone) {
            const brilho = ctx.createRadialGradient(W / 2, 62, 4, W / 2, 62, 60);
            brilho.addColorStop(0, 'rgba(255, 210, 63, 0.5)');
            brilho.addColorStop(1, 'rgba(255, 210, 63, 0)');
            ctx.fillStyle = brilho;
            ctx.fillRect(W / 2 - 60, 2, 120, 120);
            ctx.drawImage(icone, W / 2 - 36, 26, 72, 72);
        }
        const dy = icone ? 34 : 0;
        texto('NOVA HABILIDADE', W / 2, (icone ? 16 : 80), icone ? 14 : 20, COR.lilas, 4);
        texto(hab.nome.toUpperCase(), W / 2, 100 + dy, icone ? 36 : 44, COR.laranja, 7);
        ctx.fillStyle = '#fff';
        ctx.fillRect(W / 2 - 150, 126 + dy, 300, 2);
        paragrafo(hab.texto, W / 2, 152 + dy, 440, 16, '#fff');
        const tecla = textoTeclas(hab.tecla);
        texto(`Botão: ${tecla}`, W / 2, 206 + dy, 20, COR.amarelo, 4);
        areas = [];
        botaoTela('CONTINUAR', W / 2 - 80, 276 + (icone ? 20 : 0) - (icone ? 20 : 0), 160, 40, COR.laranja, 'continuar');
    }

    function desenharLojaTela() {
        ctx.fillStyle = 'rgba(7, 4, 26, 0.9)';
        ctx.fillRect(0, 0, W, H);
        texto('LOJA DO ITALOLOL', W / 2, 36, 30, COR.laranja, 6);
        virgula(W / 2 - 30, 70, 1);
        texto(`${jogo.progresso.virgulas}`, W / 2 - 18, 71, 20, COR.amarelo, 4, 'left');
        areas = [];
        LOJA.forEach((item, i) => {
            const y = 96 + i * 62;
            const comprado = jogo.progresso.loja.has(item.id);
            const sel = visual.lojaSel === i;
            ctx.fillStyle = sel ? '#4b1f7a' : '#24103f';
            ctx.strokeStyle = sel ? COR.laranja : COR.tinta;
            ctx.lineWidth = sel ? 3 : 2;
            ctx.beginPath(); ctx.roundRect(90, y, W - 180, 54, 8); ctx.fill(); ctx.stroke();
            texto(item.nome, 106, y + 17, 18, comprado ? '#888' : '#fff', 4, 'left');
            ctx.font = "bold 13px 'Comic Neue', sans-serif";
            ctx.fillStyle = COR.lilas;
            ctx.textAlign = 'left';
            ctx.fillText(item.texto, 106, y + 39);
            texto(comprado ? 'COMPRADO' : `${item.preco} ,`, W - 106, y + 27, 18, comprado ? '#888' : COR.amarelo, 4, 'right');
            areas.push({ x: 90, y, w: W - 180, h: 54, id: `loja:${i}` });
        });
        if (visual.lojaMsg) texto(visual.lojaMsg, W / 2, H - 50, 16, COR.amarelo, 4);
        botaoTela('SAIR', W / 2 - 60, H - 36, 120, 30, '#2a2a3a', 'sairLoja');
        if (!toque) texto(textoTeclas('[CIMA]/[BAIXO] escolhe · [CONFIRMA] compra · [BAIXO] no fim ou ESC sai'), W / 2, H - 70, 12, COR.lilas, 3);
    }

    function desenharPausa() {
        ctx.fillStyle = 'rgba(7, 4, 26, 0.8)';
        ctx.fillRect(0, 0, W, H);
        texto('PAUSADO', W / 2, 80, 44, '#fff', 7);
        areas = [];
        const opcoes = opcoesPausa();
        const passo = opcoes.length > 3 ? 44 : 50;
        opcoes.forEach(([rotulo, id], i) => botaoTela(rotulo, W / 2 - 150, 118 + i * passo, 300, 38, i === 0 ? COR.laranja : '#2a2a3a', id, visual.opcao === i));
        if (!toque) texto(textoTeclas('[CIMA]/[BAIXO] escolhe · [CONFIRMA] confirma · ESC continua'), W / 2, 118 + opcoes.length * passo + 14, 14, COR.lilas, 3);
        if (!toque) texto(textoTeclas('[MIRA] anda/mira · [PULO] pula · [GOLPE] golpe · [DASH] dash · [MAGIA] rajada · segure [CURA] cura · segure TAB mapa'), W / 2, H - 22, 11, '#fff', 3);
    }

    function desenharTitulo() {
        desenharFundoTitulo();
        const logo = arte('logo');
        if (logo) {
            // Logo 1024×256 (conteúdo de 128 a 894 na horizontal).
            ctx.drawImage(logo, 128, 0, 766, 256, W / 2 - 165, 6, 330, 110);
        } else {
            texto('CAÇADA AO', W / 2, 48, 30, '#fff', 6);
            texto('INOMINÁVEL', W / 2, 88, 54, COR.laranja, 8);
        }
        texto('um metroidvania do Degustador da Noite', W / 2, 128, 15, COR.lilas, 4);
        const save = lerSave();
        const opcoes = opcoesTitulo();
        areas = [];
        const passo = opcoes.length > 2 ? 44 : 48;
        opcoes.forEach(([rotulo, id], i) => botaoTela(rotulo, W / 2 - 150, 142 + i * passo, 300, 38, i === 0 ? COR.laranja : '#2a2a3a', id, visual.opcao === i));
        if (save) {
            const habs = (save.habilidades || []).length;
            texto(`${tempoTexto(save.tempo || 0)} · ${habs}/4 habilidades · ${save.mortes || 0} mortes`, W / 2, 142 + opcoes.length * passo + 4, 12, COR.lilas, 3);
        }
        const ajuda = toque
            ? 'Botões: ◀▶▲▼ andam · PULAR · GOLPE · DASH · RAJADA · CURA (segure)'
            : esquema === ESQUEMAS.hk
                ? 'setas andam/miram · Z pula · X golpe · C dash · A: toque = rajada, segure = cura · F rajada · ↑ senta · segure TAB mapa · ESC pausa'
                : 'WASD anda/mira · ESPAÇO pula · E golpe · C dash · F rajada · segure Q cura · W senta · segure TAB mapa · ESC pausa';
        texto(ajuda, W / 2, H - 22, toque ? 13 : 11, '#fff', 3);
    }

    function desenharFundoTitulo() {
        const ceu = ctx.createLinearGradient(0, 0, 0, H);
        ceu.addColorStop(0, '#07041a');
        ceu.addColorStop(1, '#3a1a6b');
        ctx.fillStyle = ceu;
        ctx.fillRect(0, 0, W, H);
        const fundo = arte('tituloFundo');
        if (fundo) {
            ctx.drawImage(fundo, 0, 0, W, H);
            // Véu no meio, onde ficam o logo e os botões.
            const veu = ctx.createLinearGradient(0, 0, 0, H);
            veu.addColorStop(0, 'rgba(7, 4, 26, 0.35)');
            veu.addColorStop(0.55, 'rgba(7, 4, 26, 0.45)');
            veu.addColorStop(1, 'rgba(7, 4, 26, 0.2)');
            ctx.fillStyle = veu;
            ctx.fillRect(0, 0, W, H);
            return;
        }
        ctx.fillStyle = 'rgba(7, 4, 26, 0.55)';
        ctx.fillRect(0, 0, W, H);
        inominavel(W - 90, H - 60, 0.9);
    }

    function desenharMorte() {
        const t = visual.tempo - visual.morteEm;
        ctx.fillStyle = `rgba(20, 0, 30, ${Math.min(0.85, t * 0.9)})`;
        ctx.fillRect(0, 0, W, H);
        if (t > 0.3) {
            texto('O DEGUSTADOR CAIU…', W / 2, H / 2 - 10, 34, '#fff', 6);
            if (jogo.progresso.sombra) texto('Suas vírgulas ficaram com a Sombra. Derrote-a para recuperar.', W / 2, H / 2 + 26, 14, COR.lilas, 3);
        }
    }

    function desenharFinal() {
        const t = visual.tempo - visual.fimEm;
        ctx.fillStyle = `rgba(7, 4, 26, ${Math.min(0.9, t * 0.6)})`;
        ctx.fillRect(0, 0, W, H);
        if (t < 0.8) return;
        const p = jogo.progresso;
        texto('VOCÊ PEGOU O INOMINÁVEL!', W / 2, 70, 38, COR.amarelo, 7);
        paragrafo('O Opressor do Chat se desfez em pixels e a Toradolândia voltou a ter paz… por enquanto.', W / 2, 112, 480, 15, COR.lilas);
        const totalItens = nivel.itens.length;
        texto(`Tempo: ${tempoTexto(p.tempo)}`, W / 2, 170, 20, '#fff', 4);
        texto(`Mortes: ${p.mortes}`, W / 2, 198, 20, '#fff', 4);
        texto(`Itens: ${[...p.coletados].length}/${totalItens} · Cogumelos: ${p.vidaMax}`, W / 2, 226, 20, '#fff', 4);
        areas = [];
        botaoTela('CONTINUAR EXPLORANDO', W / 2 - 120, 262, 240, 38, COR.laranja, 'explorar', visual.opcao === 0);
        botaoTela('TELA INICIAL', W / 2 - 120, 308, 240, 38, '#2a2a3a', 'titulo', visual.opcao === 1);
    }

    function desenhar(dt) {
        areas = [];
        if (jogo.fase === 'titulo') { desenharTitulo(); return; }
        visual.tremor = Math.max(0, visual.tremor - dt);
        const tremor = !calmo && visual.tremor > 0 ? (Math.random() - 0.5) * 7 : 0;
        ctx.save();
        ctx.translate(tremor, tremor * 0.6);
        desenharFundo();
        desenharTiles();
        desenharPlataformas();
        desenharColetaveis();
        desenharSerras();
        desenharCameos();
        desenharInimigos();
        desenharProjeteis();
        desenharSegredos();
        desenharJogador();
        desenharGolpe();
        desenharEfeitos(dt);
        ctx.restore();
        // Fade do "voltar ao lugar seguro".
        if (jogo.fase === 'perigo') {
            const k = jogo.faseT / CONFIG.tempoPerigo;
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.sin(k * Math.PI) * 0.9})`;
            ctx.fillRect(0, 0, W, H);
        }
        if (visual.flashDano > 0) {
            visual.flashDano -= dt;
            const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
            v.addColorStop(0, 'rgba(255, 0, 40, 0)');
            v.addColorStop(1, `rgba(255, 0, 40, ${Math.max(0, visual.flashDano)})`);
            ctx.fillStyle = v;
            ctx.fillRect(0, 0, W, H);
        }
        if (visual.flashBranco > 0) {
            visual.flashBranco -= dt;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, visual.flashBranco)})`;
            ctx.fillRect(0, 0, W, H);
        }
        desenharHud();
        if (jogo.fase === 'morto') desenharMorte();
        if (toque && jogo.fase !== 'final' && !visual.pausado && !visual.mapa) {
            botaoTela('II', W - 44, 8, 34, 28, 'rgba(42, 42, 58, 0.8)', 'pausar');
            botaoTela('MAPA', W - 104, 8, 54, 28, 'rgba(42, 42, 58, 0.8)', 'mapa');
        }
        if (jogo.fase === 'pegou') desenharPegou();
        if (jogo.fase === 'loja') desenharLojaTela();
        if (jogo.fase === 'final') desenharFinal();
        if (visual.mapa) desenharMapa();
        else if (visual.pausado) desenharPausa();
    }

    // ------------------------------------------------------------- fluxo
    function novoJogo(save = null) {
        core.iniciar(jogo, save);
        visual.pausado = false;
        visual.mapa = false;
        visual.particulas = [];
        visual.textos = [];
        visual.opcao = 0;
        soltarTudo();
        tratarEventos();
        visual.transicao = null;
        ajustarCamera(0, true);
        if (!save) salvar();
    }

    function acao(id) {
        if (id === 'novo') { novoJogo(null); return; }
        if (id === 'continuarSave') { novoJogo(lerSave()); return; }
        if (id === 'continuar') {
            if (jogo.fase === 'pegou') core.continuar(jogo);
            visual.pausado = false;
            return;
        }
        if (id === 'mapa') { visual.mapa = !visual.mapa; soltarTudo(); return; }
        if (id === 'controles') { trocarEsquema(); return; }
        if (id === 'pausar') { pausar(); return; }
        if (id === 'titulo') { salvar(); jogo.fase = 'titulo'; visual.pausado = false; visual.mapa = false; visual.opcao = 0; return; }
        if (id === 'explorar') { core.iniciar(jogo, core.exportarSave(jogo)); visual.opcao = 0; tratarEventos(); ajustarCamera(0, true); return; }
        if (id === 'sairLoja') { core.sairLoja(jogo); visual.lojaMsg = ''; return; }
        if (id.startsWith('loja:')) {
            visual.lojaSel = Number(id.slice(5));
            comprarSelecionado();
        }
    }

    function comprarSelecionado() {
        const item = LOJA[visual.lojaSel];
        const r = core.comprar(jogo, item.id);
        visual.lojaMsg = r === 'ok' ? `Comprou ${item.nome}!` : r === 'caro' ? 'Vírgulas insuficientes.' : 'Você já tem isso.';
        tratarEventos();
    }

    function pausar() {
        if (jogo.fase === 'titulo' || jogo.fase === 'final') return;
        visual.pausado = !visual.pausado;
        visual.opcao = 0;
        soltarTudo();
    }

    // ------------------------------------------------------------- laço
    function laco(agora) {
        if (!janela.aberta) return;
        const dt = ultimoQuadro === null ? 0 : Math.min(0.1, (agora - ultimoQuadro) / 1000);
        ultimoQuadro = agora;
        visual.tempo += dt;
        const ativo = jogo.fase !== 'titulo' && !visual.pausado && !visual.mapa;
        if (foco.apertado && visual.tempo - foco.desde >= TEMPO_FOCO) entrada.degustar = true;
        if (ativo) {
            if (visual.transicao) {
                // Troca de sala: a câmera desliza e o jogo espera.
                const tr = visual.transicao;
                tr.t += dt / 0.3;
                const alvo = alvoCamera();
                const k = Math.min(1, tr.t);
                const s = k * k * (3 - 2 * k);
                visual.cam.x = tr.de.x + (alvo.x - tr.de.x) * s;
                visual.cam.y = tr.de.y + (alvo.y - tr.de.y) * s;
                if (tr.t >= 1) visual.transicao = null;
            } else if (visual.hitstop > 0) {
                visual.hitstop -= dt;
            } else {
                core.avancar(jogo, dt, entrada);
                tratarEventos();
                if (!visual.transicao && jogo.jogador) ajustarCamera(dt);
            }
        }
        desenhar(dt);
        quadro = requestAnimationFrame(laco);
    }

    // ------------------------------------------------------------- controles
    const foco = { apertado: false, desde: 0 };   // tecla A: toque = magia, segurar = cura
    function soltarTudo() {
        for (const k of Object.keys(entrada)) entrada[k] = false;
        foco.apertado = false;
    }

    // Dois esquemas de teclado. O padrão usa WASD; o opcional copia Hollow Knight no PC
    // (setas, Z pula, X golpe, A tocado = magia e segurado = cura). Tab (mapa segurado),
    // Esc (pausa) e C (dash) valem nos dois.
    const ESQUEMAS = {
        padrao: {
            nome: 'PADRÃO (WASD)',
            mover: { KeyA: 'esquerda', KeyD: 'direita', KeyW: 'cima', KeyS: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita', ArrowUp: 'cima', ArrowDown: 'baixo' },
            pulo: ['Space'], golpe: ['KeyE'], dash: ['KeyC', 'ShiftLeft', 'ShiftRight'], magia: ['KeyF'],
            cura: 'KeyQ', foco: null,
            confirma: ['Space', 'Enter', 'KeyE'],
            nomes: { MOVE: 'A D', PULO: 'ESPAÇO', GOLPE: 'E', CURA: 'Q', CIMA: 'W', BAIXO: 'S', MIRA: 'W A S D', MAGIA: 'F', DASH: 'C', CONFIRMA: 'ESPAÇO' },
        },
        hk: {
            nome: 'HOLLOW KNIGHT',
            mover: { ArrowLeft: 'esquerda', ArrowRight: 'direita', ArrowUp: 'cima', ArrowDown: 'baixo' },
            pulo: ['KeyZ'], golpe: ['KeyX'], dash: ['KeyC'], magia: ['KeyF'],
            cura: null, foco: 'KeyA',
            confirma: ['KeyZ', 'Space', 'Enter'],
            nomes: { MOVE: '← →', PULO: 'Z', GOLPE: 'X', CURA: 'A', CIMA: '↑', BAIXO: '↓', MIRA: 'Setas', MAGIA: 'A (toque) ou F', DASH: 'C', CONFIRMA: 'Z' },
        },
    };
    const NOMES_TOQUE = { MOVE: '◀ ▶', PULO: 'PULAR', GOLPE: 'GOLPE', CURA: 'CURA', CIMA: '▲', BAIXO: '▼', MIRA: 'Direcional', MAGIA: 'RAJADA', DASH: 'DASH', CONFIRMA: 'PULAR' };
    const CHAVE_CONTROLES = 'cacada-controles';
    let esquema = ESQUEMAS.padrao;
    try { if (localStorage.getItem(CHAVE_CONTROLES) === 'hk') esquema = ESQUEMAS.hk; } catch { /* modo privado */ }
    function trocarEsquema() {
        esquema = esquema === ESQUEMAS.padrao ? ESQUEMAS.hk : ESQUEMAS.padrao;
        try { localStorage.setItem(CHAVE_CONTROLES, esquema === ESQUEMAS.hk ? 'hk' : 'padrao'); } catch { /* modo privado */ }
        soltarTudo();
    }
    const TEMPO_FOCO = 0.2;       // Hollow Knight: segurou A mais que isso, vira cura em vez de magia

    // Menus: as opções de cada tela (a de controles só aparece no teclado).
    function opcoesTitulo() {
        const o = lerSave() ? [['CONTINUAR', 'continuarSave'], ['NOVO JOGO', 'novo']] : [['NOVO JOGO', 'novo']];
        if (!toque) o.push([`CONTROLES: ${esquema.nome}`, 'controles']);
        return o;
    }
    function opcoesPausa() {
        const o = [['▶ CONTINUAR', 'continuar'], ['MAPA', 'mapa']];
        if (!toque) o.push([`CONTROLES: ${esquema.nome}`, 'controles']);
        o.push(['TELA INICIAL', 'titulo']);
        return o;
    }
    function totalMenu() {
        if (jogo.fase === 'titulo') return opcoesTitulo().length;
        if (jogo.fase === 'final') return 2;
        return opcoesPausa().length;
    }

    function navegarMenu(delta, total) {
        visual.opcao = (visual.opcao + delta + total) % total;
    }

    function confirmarMenu() {
        if (jogo.fase === 'titulo') {
            const ids = opcoesTitulo().map((o) => o[1]);
            acao(ids[Math.min(visual.opcao, ids.length - 1)]);
        } else if (jogo.fase === 'final') {
            acao(visual.opcao === 0 ? 'explorar' : 'titulo');
        } else if (visual.pausado) {
            acao(opcoesPausa()[visual.opcao][1]);
        } else if (jogo.fase === 'pegou') {
            acao('continuar');
        }
    }

    janela.dialog.addEventListener('keydown', (event) => {
        const c = event.code;
        const nome = esquema.mover[c];
        const conhecida = nome || esquema.pulo.includes(c) || esquema.golpe.includes(c) || esquema.dash.includes(c) || esquema.magia.includes(c)
            || c === esquema.cura || c === esquema.foco || esquema.confirma.includes(c) || c === 'Escape' || c === 'Tab';
        if (conhecida) event.preventDefault();
        if (event.repeat) return;
        const confirma = esquema.confirma.includes(c);
        // Menus.
        if (jogo.fase === 'titulo' || jogo.fase === 'final' || visual.pausado || jogo.fase === 'pegou') {
            if (visual.mapa) { if (c === 'Tab' || c === 'Escape' || confirma) visual.mapa = false; return; }
            const total = totalMenu();
            if (nome === 'cima') navegarMenu(-1, total);
            else if (nome === 'baixo') navegarMenu(1, total);
            else if (confirma) confirmarMenu();
            else if (c === 'Escape' && visual.pausado) visual.pausado = false;
            return;
        }
        if (jogo.fase === 'loja') {
            if (nome === 'cima') visual.lojaSel = (visual.lojaSel + LOJA.length - 1) % LOJA.length;
            else if (nome === 'baixo') {
                if (visual.lojaSel === LOJA.length - 1) acao('sairLoja');
                else visual.lojaSel++;
            } else if (confirma) comprarSelecionado();
            else if (c === 'Escape' || c === 'Tab') acao('sairLoja');
            return;
        }
        // Mapa rápido: aparece enquanto Tab estiver segurado.
        if (c === 'Tab') { visual.mapa = true; soltarTudo(); return; }
        if (visual.mapa) return;
        if (c === 'Escape') { pausar(); return; }
        if (c === esquema.foco) { foco.apertado = true; foco.desde = visual.tempo; return; }
        if (c === esquema.cura) entrada.degustar = true;
        if (nome) {
            entrada[nome] = true;
            if (nome === 'cima') entrada.cimaPedido = true;
        }
        if (esquema.pulo.includes(c)) { entrada.pulo = true; entrada.puloPedido = true; }
        if (esquema.golpe.includes(c)) entrada.golpePedido = true;
        if (esquema.dash.includes(c)) entrada.dashPedido = true;
        if (esquema.magia.includes(c)) entrada.magiaPedido = true;
    });
    janela.dialog.addEventListener('keyup', (event) => {
        const c = event.code;
        const nome = esquema.mover[c];
        if (nome) entrada[nome] = false;
        if (esquema.pulo.includes(c)) entrada.pulo = false;
        if (c === esquema.cura) entrada.degustar = false;
        if (c === 'Tab' && visual.mapa && !visual.pausado) visual.mapa = false;
        if (c === esquema.foco && foco.apertado) {
            // Toque rápido no A: magia. Segurado: era cura, e soltar para de curar.
            if (visual.tempo - foco.desde < TEMPO_FOCO && jogo.fase === 'jogando') entrada.magiaPedido = true;
            foco.apertado = false;
            entrada.degustar = false;
        }
    });
    // O Esc do navegador fecharia a janela do jogo: durante a partida ele pausa.
    janela.dialog.addEventListener('cancel', (event) => {
        if (jogo.fase !== 'titulo') event.preventDefault();
    });

    // Clique/toque nos botões desenhados na tela.
    canvas.addEventListener('pointerdown', (event) => {
        if (event.button > 0) return;
        const caixa = canvas.getBoundingClientRect();
        const x = ((event.clientX - caixa.left) / caixa.width) * W;
        const y = ((event.clientY - caixa.top) / caixa.height) * H;
        const alvo = areas.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
        if (alvo) {
            event.preventDefault();
            acao(alvo.id);
        } else if (visual.mapa) {
            visual.mapa = false;
        }
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    // Celular: direcional à esquerda e botões de ação à direita.
    if (toque) {
        const controles = document.createElement('div');
        controles.className = 'cacada-controles cacada-controles--v2';
        controles.innerHTML = `
            <div class="cacada-direcional">
                <button type="button" class="ronda-botao cacada-botao" data-tecla="cima" aria-label="Cima (mirar, subir, sentar)">▲</button>
                <button type="button" class="ronda-botao cacada-botao" data-tecla="esquerda" aria-label="Esquerda">◀</button>
                <button type="button" class="ronda-botao cacada-botao" data-tecla="direita" aria-label="Direita">▶</button>
                <button type="button" class="ronda-botao cacada-botao" data-tecla="baixo" aria-label="Baixo (mirar para baixo, soltar)">▼</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--diagonal" data-tecla="cima esquerda" aria-label="Diagonal cima e esquerda">◤</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--diagonal" data-tecla="cima direita" aria-label="Diagonal cima e direita">◥</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--diagonal" data-tecla="baixo esquerda" aria-label="Diagonal baixo e esquerda">◣</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--diagonal" data-tecla="baixo direita" aria-label="Diagonal baixo e direita">◢</button>
            </div>
            <div class="cacada-acoes">
                <button type="button" class="ronda-botao cacada-botao cacada-botao--menor" data-tecla="degustar" aria-label="Curar (segure)">CURA</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--menor" data-tecla="magia" aria-label="Rajada">RAJADA</button>
                <button type="button" class="ronda-botao cacada-botao cacada-botao--menor" data-tecla="dash" aria-label="Dash">DASH</button>
                <button type="button" class="ronda-botao ronda-botao--atirar cacada-botao" data-tecla="golpe" aria-label="Golpe">GOLPE</button>
                <button type="button" class="ronda-botao ronda-botao--pular cacada-botao" data-tecla="pulo" aria-label="Pular (segure para pular mais alto)">PULAR</button>
            </div>`;
        janela.dialog.appendChild(controles);
        for (const botao of controles.querySelectorAll('button')) {
            const tecla = botao.dataset.tecla;
            botao.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                botao.setPointerCapture?.(event.pointerId);
                botao.classList.add('is-apertado');
                const emMenu = jogo.fase === 'titulo' || jogo.fase === 'final' || visual.pausado || jogo.fase === 'pegou' || visual.mapa || jogo.fase === 'loja';
                const teclas = tecla.split(' ');
                if (emMenu && teclas.length > 1) return;
                if (emMenu) {
                    if (visual.mapa) { visual.mapa = false; return; }
                    if (jogo.fase === 'loja') {
                        if (tecla === 'cima') visual.lojaSel = (visual.lojaSel + LOJA.length - 1) % LOJA.length;
                        else if (tecla === 'baixo') visual.lojaSel = (visual.lojaSel + 1) % LOJA.length;
                        else if (tecla === 'pulo' || tecla === 'golpe') comprarSelecionado();
                        return;
                    }
                    const total = totalMenu();
                    if (tecla === 'cima') navegarMenu(-1, total);
                    else if (tecla === 'baixo') navegarMenu(1, total);
                    else if (tecla === 'pulo' || tecla === 'golpe') confirmarMenu();
                    return;
                }
                if (tecla === 'pulo') { entrada.pulo = true; entrada.puloPedido = true; }
                else if (tecla === 'golpe') entrada.golpePedido = true;
                else if (tecla === 'dash') entrada.dashPedido = true;
                else if (tecla === 'magia') entrada.magiaPedido = true;
                else {
                    for (const t of teclas) entrada[t] = true;
                    if (tecla === 'cima') entrada.cimaPedido = true;
                }
            });
            for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
                botao.addEventListener(tipo, () => {
                    if (!botao.classList.contains('is-apertado')) return;
                    botao.classList.remove('is-apertado');
                    if (tecla === 'pulo') entrada.pulo = false;
                    else for (const t of tecla.split(' ')) if (t in entrada) entrada[t] = false;
                });
            }
            botao.addEventListener('contextmenu', (event) => event.preventDefault());
        }
    }

    janela.aoFechar(() => {
        cancelAnimationFrame(quadro);
        soltarTudo();
        if (jogo.fase !== 'titulo') { salvar(); visual.pausado = jogo.fase !== 'final'; }
    });
    document.addEventListener('visibilitychange', () => {
        ultimoQuadro = null;
        soltarTudo();
        if (document.hidden && jogo.fase !== 'titulo' && jogo.fase !== 'final') visual.pausado = true;
    });

    function abrir() {
        if (janela.aberta) return;
        janela.abrir();
        ultimoQuadro = null;
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(laco);
    }

    window.CacadaInominavel = { abrir, jogo, entrada, visual, core, salvar, novoJogo, lerSave };
})();
