// ============================================================================
// "Da macarronada à Toradolândia" — animação em código puro (Canvas 2D).
// Sem bibliotecas e sem imagens: tudo é desenhado aqui.
// Estilo Enzo Games: tinta preta grossa, cores chapadas, retícula (pontinhos)
// nas sombras, balão e onomatopeia de gibi. Da referência (zoom infinito)
// vem a câmera que nunca corta e o traço que "ferve" levemente.
// Roteiro: docs/PLANO-ANIMACAO.md
// Controles: espaço pausa, ← → 1 s, R recomeça, ?t=20 abre no segundo 20.
// ============================================================================
(() => {
    'use strict';

    const W = 1920;
    const H = 1080;
    const DURACAO = 45;

    const tela = document.getElementById('tela');
    const ctxTela = tela.getContext('2d');
    const camada = document.createElement('canvas'); // cena da mesa durante o fade
    const ctxCamada = camada.getContext('2d');
    let ctx = ctxTela;

    const COR = {
        tinta: '#141014',
        papel: '#fbf3e1',
        laranja: '#f5a02e',
        laranjaSombra: '#d9771c',
        focinho: '#fbe08c',
        nariz: '#f29aa6',
        barba: '#161214',
        parede: '#34a39e',
        paredeFundo: '#236e6b',
        massa: '#f3c95e',
        massaFio: '#ffe391',
        massaTraco: '#b8872b',
        molho: '#c7321e',
        carne: '#7c3f22',
        carneEscura: '#4c2311',
        noite: '#07041a',
        noiteClara: '#3a1a6b',
        predioLonge: '#2b1a55',
        predioPerto: '#1c1135',
        janela: '#ffd86b',
        lavanda: '#cdbdf5',
    };

    // ------------------------------------------------------------- utilidades
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const faixa = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
    const suave = (k) => k * k * (3 - 2 * k);
    const entraSai = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const entra = (k) => k * k * k;
    const sai = (k) => 1 - Math.pow(1 - k, 3);
    const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

    function hash(n) {
        n = (n ^ 61) ^ (n >>> 16);
        n = Math.imul(n, 9);
        n ^= n >>> 4;
        n = Math.imul(n, 0x27d4eb2d);
        n ^= n >>> 15;
        return (n >>> 0) / 4294967296;
    }
    function semente(s) {
        return () => {
            s = (s + 0x6d2b79f5) | 0;
            let x = Math.imul(s ^ (s >>> 15), 1 | s);
            x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
            return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
        };
    }
    function rgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function misturar(a, b, k) {
        const A = rgb(a);
        const B = rgb(b);
        return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
    }

    // ------------------------------------------------------------- tela e câmera
    let baseK = 1;
    function ajustar(gravando = false) {
        const s = Math.min(innerWidth / W, innerHeight / H);
        const dpr = gravando ? 1 : Math.min(devicePixelRatio || 1, 2);
        const pw = gravando ? W : Math.round(W * s * dpr);
        const ph = gravando ? H : Math.round(H * s * dpr);
        tela.width = pw; tela.height = ph;
        camada.width = pw; camada.height = ph;
        tela.style.width = `${W * s}px`;
        tela.style.height = `${H * s}px`;
        baseK = pw / W;
        cachePontos.clear();
        if (typeof prepararAcabamentos === 'function' && grao) prepararAcabamentos();
    }

    let zAtual = 1; // escala mundo→tela no momento (linhas ficam com espessura fixa na tela)
    function telaCheia() {
        ctx.setTransform(baseK, 0, 0, baseK, 0, 0);
        zAtual = 1;
    }
    function camera(c) {
        const z = c.z * baseK;
        ctx.setTransform(z, 0, 0, z, baseK * (W / 2 - c.x * c.z), baseK * (H / 2 - c.y * c.z));
        zAtual = c.z;
    }
    const naTela = (c, x, y) => [W / 2 + (x - c.x) * c.z, H / 2 + (y - c.y) * c.z];
    function local(x, y, s, desenho, giro = 0) {
        ctx.save();
        const z0 = zAtual;
        ctx.translate(x, y);
        if (giro) ctx.rotate(giro);
        ctx.scale(s, s);
        zAtual = z0 * Math.abs(s);
        desenho();
        zAtual = z0;
        ctx.restore();
    }

    // ------------------------------------------------------------- traço de lápis
    // Cada forma treme um pouco e o tremor muda 8 vezes por segundo (a linha "ferve").
    let formaId = 0;
    let quadroLapis = 0;
    const TREMOR = 1.5;
    function tremer(pts) {
        const id = formaId++;
        const a = TREMOR / zAtual;
        return pts.map((p, i) => [
            p[0] + (hash(id * 977 + i * 31 + quadroLapis * 7919) - 0.5) * 2 * a,
            p[1] + (hash(id * 1013 + i * 57 + quadroLapis * 6007 + 1) - 0.5) * 2 * a,
        ]);
    }
    function caminho(pts, fechado = true, reta = false) {
        const n = pts.length;
        ctx.beginPath();
        if (reta) {
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            if (fechado) ctx.closePath();
            return;
        }
        if (fechado) {
            const m0 = meio(pts[n - 1], pts[0]);
            ctx.moveTo(m0[0], m0[1]);
            for (let i = 0; i < n; i++) {
                const m = meio(pts[i], pts[(i + 1) % n]);
                ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
            }
            ctx.closePath();
            return;
        }
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n - 1; i++) {
            const m = meio(pts[i], pts[i + 1]);
            ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
        }
        ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
    /** Desenha uma forma com contorno de tinta (espessura fixa na tela). */
    function forma(pts, { fill = null, stroke = COR.tinta, lw = 6, fechado = true, reta = false } = {}) {
        const p = tremer(pts);
        caminho(p, fechado, reta);
        if (fill && fechado) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke && lw) {
            ctx.lineWidth = lw / zAtual;
            ctx.strokeStyle = stroke;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        return p;
    }
    /** Membro grosso (braço, perna, cabo): traço largo com contorno. `larg` em unidades do mundo. */
    function membro(pts, cor, larg, contorno = 6) {
        const p = tremer(pts);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        caminho(p, false);
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = larg + (2 * contorno) / zAtual;
        ctx.stroke();
        caminho(p, false);
        ctx.strokeStyle = cor;
        ctx.lineWidth = larg;
        ctx.stroke();
    }
    function elipse(cx, cy, rx, ry, n = 28, giro = 0) {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const x = Math.cos(a) * rx;
            const y = Math.sin(a) * ry;
            pts.push([cx + x * Math.cos(giro) - y * Math.sin(giro), cy + x * Math.sin(giro) + y * Math.cos(giro)]);
        }
        return pts;
    }
    /** Retângulo com lados levemente tremidos (pontos extras em cada lado). */
    function retangulo(x, y, w, h, giro = 0, cx = x + w / 2, cy = y + h / 2) {
        const cantos = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        const pts = [];
        for (let i = 0; i < 4; i++) {
            const a = cantos[i];
            const b = cantos[(i + 1) % 4];
            for (let k = 0; k < 3; k++) pts.push(mix(a, b, k / 3));
        }
        if (!giro) return pts;
        const c = Math.cos(giro);
        const s = Math.sin(giro);
        return pts.map(([px, py]) => [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c]);
    }
    function estrela(cx, cy, rFora, rDentro, n, giro = 0) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) {
            const r = i % 2 ? rDentro : rFora;
            const a = giro + (i / (n * 2)) * Math.PI * 2;
            pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        return pts;
    }

    // ------------------------------------------------------------- retícula (pontinhos de gibi)
    const cachePontos = new Map();
    function reticula(cor, passo = 14, raio = 3) {
        const chave = `${ctx === ctxTela}|${cor}|${passo}|${raio}`;
        if (!cachePontos.has(chave)) {
            const c = document.createElement('canvas');
            c.width = c.height = passo * 2;
            const g = c.getContext('2d');
            g.fillStyle = cor;
            for (const [x, y] of [[passo / 2, passo / 2], [passo * 1.5, passo * 1.5]]) {
                g.beginPath(); g.arc(x, y, raio, 0, Math.PI * 2); g.fill();
            }
            cachePontos.set(chave, ctx.createPattern(c, 'repeat'));
        }
        return cachePontos.get(chave);
    }
    /** Preenche a região recortada atual com pontinhos em escala fixa de tela. */
    function preencherReticula(cor, passo = 14, raio = 3, alpha = 1) {
        const z0 = zAtual;
        ctx.save();
        telaCheia();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = reticula(cor, passo, raio);
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        zAtual = z0;
    }
    /** Sombra de gibi: cor chapada translúcida + pontinhos, dentro de `pts`. */
    function sombra(pts, { cor = 'rgba(20,16,20,0.22)', pontos = 'rgba(20,16,20,0.55)', passo = 12, raio = 2.6 } = {}) {
        ctx.save();
        caminho(pts, true);
        ctx.clip();
        if (cor) { ctx.fillStyle = cor; ctx.fill(); }
        preencherReticula(pontos, passo, raio);
        ctx.restore();
    }

    /** Sombra só dentro de `contorno` (não vaza para o fundo). */
    function sombraDentro(contorno, regiao, opcoes) {
        ctx.save();
        caminho(contorno, true);
        ctx.clip();
        sombra(regiao, opcoes);
        ctx.restore();
    }

    // ------------------------------------------------------------- texto de gibi
    const FONTE_TITULO = 'Impact, "Haettenschweiler", "Arial Black", sans-serif';
    const FONTE_BALAO = '"Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif';
    function textoHQ(txt, x, y, { tam = 60, fonte = FONTE_TITULO, preench = '#fff', contorno = COR.tinta, larg = 10, sombraX = 0, sombraY = 0, peso = '' } = {}) {
        ctx.font = `${peso} ${tam}px ${fonte}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        if (sombraX || sombraY) {
            ctx.lineWidth = larg;
            ctx.strokeStyle = contorno;
            ctx.strokeText(txt, x + sombraX, y + sombraY);
            ctx.fillStyle = contorno;
            ctx.fillText(txt, x + sombraX, y + sombraY);
        }
        if (larg) {
            ctx.lineWidth = larg;
            ctx.strokeStyle = contorno;
            ctx.strokeText(txt, x, y);
        }
        ctx.fillStyle = preench;
        ctx.fillText(txt, x, y);
    }
    /** Onomatopeia numa explosão amarela, com "pop" de escala. */
    function onomatopeia(txt, x, y, idade, tam = 60) {
        if (idade < 0 || idade > 1.1) return;
        const pop = idade < 0.18 ? sai(idade / 0.18) * 1.15 : lerp(1.15, 1, faixa(idade, 0.18, 0.3));
        const some = 1 - faixa(idade, 0.85, 1.1);
        ctx.save();
        ctx.globalAlpha *= some;
        local(x, y, pop, () => {
            forma(estrela(0, 0, tam * 1.9, tam * 1.15, 11, 0.2), { fill: '#ffd23a', lw: 6 });
            textoHQ(txt, 0, 4, { tam, preench: '#e8321e', larg: tam * 0.16 });
        }, -0.12);
        ctx.restore();
    }

    // ------------------------------------------------------------- dados sorteados (fixos)
    const rMassa = semente(11);
    const FIOS = Array.from({ length: 44 }, () => {
        const a = rMassa() * Math.PI * 2;
        const d = Math.sqrt(rMassa());
        let x = 900 + Math.cos(a) * 190 * d;
        let y = 792 + Math.sin(a) * 46 * d;
        const pts = [[x, y]];
        let dir = rMassa() * Math.PI * 2;
        for (let i = 0; i < 6; i++) {
            dir += (rMassa() - 0.5) * 2.2;
            x = clamp(x + Math.cos(dir) * 34, 710, 1090);
            y = clamp(y + Math.sin(dir) * 12, 752, 836);
            pts.push([x, y]);
        }
        return pts;
    });
    const MOLHO = [[870, 770, 70, 26], [960, 782, 56, 20], [835, 800, 44, 16], [920, 806, 60, 18]];
    const MIUDAS = [[800, 776, 33, 0.7], [878, 758, 31, 2.1], [955, 790, 32, 4.0]];

    function gerarContinentes() {
        const r = semente(42);
        const lista = [];
        const cores = ['#e3a13b', '#5aa34a', '#c98a3a', '#7cbd55'];
        const add = (lon, lat, tam, cor) => {
            const pts = [];
            const n = 16;
            for (let j = 0; j < n; j++) {
                const a = (j / n) * Math.PI * 2;
                const rr = tam * (0.62 + r() * 0.5);
                pts.push([lon + (Math.cos(a) * rr) / Math.max(0.4, Math.cos(lat)), lat + Math.sin(a) * rr * 0.8]);
            }
            lista.push({ lon, lat, pts, cor });
        };
        // O deserto da Toradolândia fica onde a câmera mergulha (lado da noite).
        add(-0.83, 0.1, 0.34, '#e3a13b');
        for (let i = 0; i < 11; i++) add(r() * Math.PI * 2, (r() - 0.5) * 2.1, 0.18 + r() * 0.26, cores[i % cores.length]);
        return lista;
    }
    const CONTINENTES = gerarContinentes();
    const rTex = semente(5);
    const PINTAS = Array.from({ length: 70 }, () => [rTex() * Math.PI * 2, (rTex() - 0.5) * 2.6, 0.012 + rTex() * 0.02]);
    const NUVENS_PLANETA = Array.from({ length: 9 }, () => [rTex() * Math.PI * 2, (rTex() - 0.5) * 2, 0.16 + rTex() * 0.2]);
    const ALVO = [0.36, -0.1]; // ponto do disco (−1..1) onde fica a cidade
    const LUZES = Array.from({ length: 110 }, () => {
        const a = rTex() * Math.PI * 2;
        const d = Math.sqrt(-2 * Math.log(1 - rTex() * 0.999)) * 0.028;
        return [Math.cos(a) * d * 1.3, Math.sin(a) * d, 1 + rTex() * 1.6];
    });
    const rCeu = semente(9);
    const ESTRELAS = Array.from({ length: 240 }, () => [rCeu() * W, rCeu() * H, 0.6 + rCeu() * 1.8, rCeu() * 6]);
    const PUFES = Array.from({ length: 46 }, (_, i) => ({
        a: rCeu() * Math.PI * 2,
        t0: 21.3 + (i / 46) * 3.8 + rCeu() * 0.3,
        v: 2.1 + rCeu() * 0.8,
        s: 0.8 + rCeu() * 0.6,
    }));

    function gerarCidade() {
        const r = semente(7);
        const longe = [];
        const perto = [];
        let x = -500;
        while (x < 2450) {
            const w = 70 + r() * 120;
            longe.push({ x, w, topo: 480 + r() * 200, janelas: janelas(r, x, w, 480, 0.25) });
            x += w + 6;
        }
        x = -500;
        while (x < 2450) {
            let w = 110 + r() * 150;
            // Espaço para os prédios especiais (letreiro e holofote).
            if (x + w > 1020 && x < 1340) { x = 1340; continue; }
            if (x + w > 1530 && x < 1800) { x = 1800; continue; }
            const topo = 610 + r() * 190;
            perto.push({ x, w, topo, janelas: janelas(r, x, w, topo, 0.38), caixa: r() < 0.35 });
            x += w + 12;
        }
        perto.push({ x: 1040, w: 280, topo: 600, janelas: janelas(r, 1040, 280, 600, 0.4), letreiro: true });
        perto.push({ x: 1550, w: 230, topo: 690, janelas: janelas(r, 1550, 230, 690, 0.35), holofote: true });
        return { longe, perto };
    }
    function janelas(r, x, w, topo, chance) {
        const lista = [];
        for (let jy = topo + 24; jy < 900; jy += 34) {
            for (let jx = x + 16; jx < x + w - 24; jx += 30) if (r() < chance) lista.push([jx, jy]);
        }
        return lista;
    }
    const CIDADE = gerarCidade();
    const NUVENS_CEU = Array.from({ length: 16 }, (_, i) => [-200 + i * 150 + rCeu() * 60, 175 + rCeu() * 120, 55 + rCeu() * 55]);
    const NUVENS_ALTAS = Array.from({ length: 12 }, (_, i) => [-300 + i * 220 + rCeu() * 90, -650 + rCeu() * 420, 90 + rCeu() * 80]);
    const ESTRELAS_CIDADE = Array.from({ length: 170 }, () => [-300 + rCeu() * 2500, -950 + rCeu() * 1400, 0.7 + rCeu() * 1.7, rCeu() * 6]);

    // ============================================================= CENA 1: a mesa
    const BOLA0 = [1030, 790];
    const R_BOLA = 36;
    const GARFO = [-78, 108];
    const PARADA = [1210, 640];
    const ALTO = [1180, 548];
    const ESPETO = [BOLA0[0] - GARFO[0], BOLA0[1] - GARFO[1]];
    const ERGUIDA = [1170, 470];
    const BOLA_FINAL = [ERGUIDA[0] + GARFO[0], ERGUIDA[1] + GARFO[1]];

    function mao(t) {
        let p;
        if (t < 1.8) p = PARADA;
        else if (t < 2.6) p = mix(PARADA, ALTO, entraSai(faixa(t, 1.8, 2.6)));
        else if (t < 3.2) p = mix(ALTO, ESPETO, entra(faixa(t, 2.6, 3.2)));
        else if (t < 3.45) p = ESPETO;
        else p = mix(ESPETO, ERGUIDA, entraSai(faixa(t, 3.45, 5.2)));
        const balanco = 4 * ((1 - faixa(t, 1.6, 1.8)) + faixa(t, 5.2, 5.6) * (1 - faixa(t, 5.8, 6.3)));
        return [p[0], p[1] + Math.sin(t * 2.1) * balanco];
    }
    const bola = (t) => (t < 3.2 ? BOLA0 : [mao(t)[0] + GARFO[0], mao(t)[1] + GARFO[1]]);

    function cameraMesa(t) {
        const z0 = lerp(1, 1.04, suave(faixa(t, 0, 6)));
        const c0 = [960, lerp(540, 545, suave(faixa(t, 0, 6)))];
        if (t < 6) return { x: c0[0], y: c0[1], z: z0 };
        const k = entraSai(faixa(t, 6, 12));
        const zf = 378 / R_BOLA;
        const z = Math.exp(lerp(Math.log(1.04), Math.log(zf), k));
        // O alvo desliza até o centro da tela enquanto o zoom cresce em escala log.
        const s0 = [W / 2 + (BOLA_FINAL[0] - 960) * 1.04, H / 2 + (BOLA_FINAL[1] - 545) * 1.04];
        const s = [lerp(s0[0], W / 2, k), lerp(s0[1], H / 2, k)];
        return { x: BOLA_FINAL[0] - (s[0] - W / 2) / z, y: BOLA_FINAL[1] - (s[1] - H / 2) / z, z };
    }

    function cenaMesa(t, cam, desenharBola) {
        camera(cam);
        ctx.fillStyle = COR.papel;
        ctx.fillRect(-4000, -4000, W + 8000, H + 8000);
        const P = { x: 70, y: 60, w: 1780, h: 960 };
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.x, P.y, P.w, P.h);
        ctx.clip();

        // Parede verde-água com retícula (a sala do capítulo 7).
        const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
        g.addColorStop(0, COR.parede);
        g.addColorStop(1, COR.paredeFundo);
        ctx.fillStyle = g;
        ctx.fillRect(P.x, P.y, P.w, P.h);
        preencherReticula('rgba(8,50,48,0.35)', 18, 3.4);
        quadroNaParede();

        enzo(t);
        mesa();
        prato(t);
        const antesDaBola = t >= 3.2;
        if (antesDaBola) bracoGarfo(t);
        desenharBola();
        camera(cam);
        if (!antesDaBola) bracoGarfo(t);
        bracoApoiado();
        legenda(t);
        balao(t);
        onomatopeia('TSC!', 1100, 700, t - 3.2, 44);
        ctx.restore();
        forma(retangulo(P.x, P.y, P.w, P.h), { lw: 12, reta: true });
    }

    function quadroNaParede() {
        forma(retangulo(1500, 130, 290, 210), { fill: '#e9e2cf', lw: 10, reta: true });
        forma(retangulo(1520, 150, 250, 170), { fill: '#f6f0de', lw: 3, reta: true });
        // controle de videogame
        forma([[1590, 205], [1700, 205], [1728, 250], [1712, 282], [1688, 272], [1602, 272], [1578, 282], [1562, 250]], { fill: '#3c3a44', lw: 5 });
        forma(elipse(1608, 238, 10, 10, 10), { fill: '#e8321e', lw: 3 });
        forma(elipse(1680, 232, 8, 8, 10), { fill: '#ffd23a', lw: 3 });
        forma(elipse(1696, 248, 8, 8, 10), { fill: '#2f8fd6', lw: 3 });
        textoHQ('GOOD FOOD · GOOD GAMES', 1645, 302, { tam: 22, preench: COR.tinta, larg: 0 });
    }

    function enzo(t) {
        const cab = [960, 372];
        const b = bola(t);
        // corpo
        const corpo = elipse(965, 660, 195, 170, 30);
        forma(corpo, { fill: COR.laranja });
        sombraDentro(corpo, elipse(1060, 710, 150, 150, 24), { cor: 'rgba(160,70,0,0.18)', pontos: 'rgba(120,50,0,0.35)' });
        local(cab[0], cab[1], 1, () => {
            // orelhas
            forma([[-170, -60], [-160, -212], [-62, -150]], { fill: COR.laranja });
            forma([[170, -60], [160, -212], [62, -150]], { fill: COR.laranja });
            forma([[-150, -90], [-146, -180], [-88, -140]], { fill: COR.nariz, lw: 4 });
            forma([[150, -90], [146, -180], [88, -140]], { fill: COR.nariz, lw: 4 });
            // cabeça
            const cabeca = elipse(0, 0, 190, 160, 34);
            forma(cabeca, { fill: COR.laranja });
            sombraDentro(cabeca, elipse(120, 60, 130, 130, 22), { cor: 'rgba(160,70,0,0.16)', pontos: 'rgba(120,50,0,0.3)' });
            for (const dx of [-38, 0, 38]) forma([[dx - 11, -156], [dx, -108], [dx + 11, -156]], { fill: COR.tinta, lw: 0 });
            forma([[-190, 0], [-146, 12], [-188, 26]], { fill: COR.tinta, lw: 0 });
            forma([[190, 0], [146, 12], [188, 26]], { fill: COR.tinta, lw: 0 });
            // focinho creme e barba preta (ficha canônica)
            forma(elipse(-52, 58, 70, 50, 20), { fill: COR.focinho, lw: 5 });
            forma(elipse(52, 58, 70, 50, 20), { fill: COR.focinho, lw: 5 });
            const animado = t > 3.3 ? 1 - faixa(t, 11, 12) : 0;
            forma([[-150, 60], [-118, 118], [-62, 152], [0, 166], [62, 152], [118, 118], [150, 60], [108, 96], [58, 104], [0, 112], [-58, 104], [-108, 96]], { fill: COR.barba, lw: 4 });
            forma([[-78, 70], [-30, 58], [0, 66], [30, 58], [78, 70], [40, 80], [0, 76], [-40, 80]], { fill: COR.barba, lw: 0 });
            if (animado > 0.5) forma(elipse(0, 118, 34, 24 + 6 * Math.sin(t * 9), 16), { fill: '#7a1c1c', lw: 5 });
            forma(elipse(0, 44, 26, 17, 16), { fill: COR.nariz, lw: 5 });
            // bigodes de gato
            for (const lado of [-1, 1]) {
                for (const dy of [-6, 14]) forma([[lado * 150, 60 + dy], [lado * 240, 44 + dy * 1.6]], { fechado: false, lw: 4 });
            }
            // olhos: meio fechados; arregalam quando espeta a almôndega
            const piscada = t > 0.9 && t < 1.05 ? 1 : 0;
            const palp = piscada ? 0.98 : lerp(0.44, 0.12, suave(faixa(t, 3.25, 3.6)));
            for (const lado of [-1, 1]) {
                const ex = lado * 62;
                const ey = -44;
                const dx = b[0] - (cab[0] + ex);
                const dy = b[1] - (cab[1] + ey);
                const d = Math.hypot(dx, dy) || 1;
                olho(ex, ey, 64, 74, [dx / d, dy / d], palp);
            }
            // óculos pretos retangulares
            forma(retangulo(-136, -100, 130, 110), { lw: 11, reta: true });
            forma(retangulo(6, -100, 130, 110), { lw: 11, reta: true });
            forma([[-8, -54], [8, -54]], { fechado: false, lw: 10 });
            forma([[-140, -76], [-186, -60]], { fechado: false, lw: 9 });
            forma([[140, -76], [186, -60]], { fechado: false, lw: 9 });
        });
    }

    function olho(cx, cy, rx, ry, olhar, palpebra) {
        const pts = elipse(cx, cy, rx, ry, 30);
        forma(pts, { fill: '#fff', lw: 0 });
        ctx.save();
        caminho(pts, true);
        ctx.clip();
        forma(elipse(cx + olhar[0] * rx * 0.42, cy + ry * 0.3 + olhar[1] * ry * 0.25, rx * 0.2, ry * 0.24, 16), { fill: COR.tinta, lw: 0 });
        const topo = cy - ry;
        const ly = topo + 2 * ry * palpebra;
        ctx.fillStyle = COR.laranja;
        ctx.fillRect(cx - rx - 6, topo - 6, 2 * rx + 12, ly - topo + 6);
        ctx.restore();
        if (palpebra > 0.03) {
            const meia = rx * Math.sqrt(Math.max(0, 1 - ((ly - cy) / ry) ** 2));
            forma([[cx - meia, ly], [cx, ly + 7], [cx + meia, ly]], { fechado: false, lw: 5 });
        }
        forma(pts, { lw: 6 });
    }

    function mesa() {
        const topo = 722;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, topo, W, H);
        ctx.clip();
        ctx.fillStyle = '#fbf7ee';
        ctx.fillRect(0, topo, W, H);
        ctx.fillStyle = 'rgba(214,46,46,0.55)';
        for (let x = 0; x < W; x += 84) ctx.fillRect(x, topo, 42, H);
        for (let y = topo; y < H; y += 84) ctx.fillRect(0, y, W, 42);
        preencherReticula('rgba(120,20,20,0.18)', 16, 2.6);
        ctx.restore();
        forma([[40, topo], [W / 2, topo + 2], [W - 40, topo]], { fechado: false, lw: 8 });
    }

    function prato(t) {
        ctx.fillStyle = 'rgba(20,16,20,0.25)';
        caminho(elipse(912, 836, 312, 92), true);
        ctx.fill();
        forma(elipse(900, 815, 300, 88, 36), { fill: '#fffdf6' });
        forma(elipse(900, 808, 236, 64, 32), { stroke: '#b9b2a2', lw: 4 });
        forma(elipse(900, 796, 214, 56, 30), { fill: COR.massa, lw: 5 });
        for (const fio of FIOS) {
            const p = tremer(fio);
            caminho(p, false);
            ctx.lineCap = 'round';
            ctx.strokeStyle = COR.massaTraco;
            ctx.lineWidth = 7.5 / zAtual;
            ctx.stroke();
            ctx.strokeStyle = COR.massaFio;
            ctx.lineWidth = 3.5 / zAtual;
            ctx.stroke();
        }
        for (const [x, y, rx, ry] of MOLHO) {
            forma(elipse(x, y, rx, ry, 18), { fill: COR.molho, lw: 4 });
            forma(elipse(x - rx * 0.35, y - ry * 0.35, rx * 0.22, ry * 0.2, 10), { fill: 'rgba(255,255,255,0.7)', lw: 0 });
        }
        const cam = camAtual;
        for (const [x, y, r, giro] of MIUDAS) {
            const s = naTela(cam, x, y);
            telaCheia();
            esfera(s[0], s[1], r * cam.z, 0, giro, t);
            camera(cam);
        }
    }

    function bracoGarfo(t) {
        const h = mao(t);
        const ombro = [1112, 560];
        const m = meio(ombro, h);
        const cotovelo = [m[0] + 62, m[1] + 8];
        membro([ombro, cotovelo, h], COR.laranja, 60);
        // tatuagem maori no antebraço
        for (let i = 0; i < 3; i++) {
            const a = mix(cotovelo, h, 0.2 + i * 0.22);
            forma([[a[0] - 22, a[1] - 6], [a[0] - 4, a[1] + 8], [a[0] + 18, a[1] - 4]], { fechado: false, lw: 6 });
        }
        // garfo
        const f = GARFO;
        membro([[h[0] - f[0] * 0.5, h[1] - f[1] * 0.5], [h[0] + f[0] * 0.62, h[1] + f[1] * 0.62]], '#c9ccd4', 11, 4);
        const perp = [f[1] / 133, -f[0] / 133];
        for (const o of [-15, -5, 5, 15]) {
            membro([[h[0] + f[0] * 0.62 + perp[0] * o * 0.6, h[1] + f[1] * 0.62 + perp[1] * o * 0.6], [h[0] + f[0] + perp[0] * o, h[1] + f[1] + perp[1] * o]], '#c9ccd4', 5, 3);
        }
        // relógio e mão
        const pulso = mix(cotovelo, h, 0.82);
        forma(elipse(pulso[0], pulso[1], 20, 20, 14), { fill: '#262428', lw: 5 });
        forma(elipse(pulso[0], pulso[1], 11, 11, 12), { fill: '#6fd3ff', lw: 3 });
        forma(elipse(h[0], h[1], 34, 32, 18), { fill: COR.laranja });
        forma([[h[0] - 18, h[1] - 6], [h[0] - 4, h[1] + 4]], { fechado: false, lw: 4 });
        forma([[h[0] - 6, h[1] - 14], [h[0] + 8, h[1] - 2]], { fechado: false, lw: 4 });
    }

    function bracoApoiado() {
        membro([[815, 575], [742, 660], [772, 738]], COR.laranja, 60);
        forma(elipse(772, 742, 36, 28, 18), { fill: COR.laranja });
    }

    function legenda(t) {
        const a = faixa(t, 0.4, 0.9);
        if (!a) return;
        ctx.save();
        ctx.globalAlpha *= a;
        forma(retangulo(110, 92, 700, 72), { fill: '#ffe56b', lw: 6, reta: true });
        textoHQ('QUARTA-FEIRA. HORA DO ALMOÇO.', 460, 130, { tam: 34, fonte: FONTE_BALAO, peso: 'bold', preench: COR.tinta, larg: 0 });
        ctx.restore();
    }

    function balao(t) {
        const idade = t - 1.3;
        if (idade < 0 || t > 5.9) return;
        const pop = idade < 0.2 ? sai(idade / 0.2) : 1;
        const some = 1 - faixa(t, 5.5, 5.9);
        ctx.save();
        ctx.globalAlpha *= some;
        local(520, 330, pop, () => {
            forma([[120, 30], [190, 40], [330, 128]], { fill: '#fff', lw: 6 });
            forma(elipse(0, 0, 300, 92, 34), { fill: '#fff', lw: 6 });
            ctx.fillStyle = '#fff';
            caminho([[110, 20], [190, 34], [300, 110]], true);
            ctx.fill();
            textoHQ('Que almôndega', 0, -24, { tam: 50, fonte: FONTE_BALAO, peso: 'bold', preench: COR.tinta, larg: 0 });
            textoHQ('perfeita...', 0, 30, { tam: 50, fonte: FONTE_BALAO, peso: 'bold', preench: COR.tinta, larg: 0 });
        });
        ctx.restore();
    }

    // ============================================================= a esfera: almôndega → planeta
    function projetar(lon, lat, giro) {
        const l = lon + giro;
        return [Math.cos(lat) * Math.sin(l), -Math.sin(lat), Math.cos(lat) * Math.cos(l)];
    }
    /**
     * Desenha em coordenadas de TELA (chamar com telaCheia()). morph 0 = almôndega,
     * 1 = planeta. As pintas da carne são os mesmos continentes do planeta.
     */
    function esfera(sx, sy, R, morph, giro, t, { luzes = 0 } = {}) {
        if (R < 1) return;
        const disco = elipse(sx, sy, R, R, R > 600 ? 96 : 56);
        ctx.save();
        caminho(disco, true);
        ctx.clip();
        ctx.fillStyle = misturar(COR.carne, '#2c6db3', morph);
        ctx.fillRect(sx - R, sy - R, 2 * R, 2 * R);
        // continentes (na carne: manchas mais escuras)
        for (const c of CONTINENTES) {
            const centro = projetar(c.lon, c.lat, giro);
            if (centro[2] < -0.05) continue;
            const pts = c.pts.map(([lo, la]) => {
                const p = projetar(lo, la, giro);
                if (p[2] < 0) {
                    const n = Math.hypot(p[0], p[1]) || 1;
                    return [sx + (R * p[0]) / n, sy + (R * p[1]) / n];
                }
                return [sx + R * p[0], sy + R * p[1]];
            });
            forma(pts, { fill: misturar(COR.carneEscura, c.cor, morph), lw: lerp(2.5, 3.5, morph) });
        }
        // textura da carne some aos poucos
        if (morph < 1) {
            ctx.fillStyle = `rgba(40,16,6,${0.75 * (1 - morph)})`;
            for (const [lo, la, r] of PINTAS) {
                const p = projetar(lo, la, giro);
                if (p[2] < 0.1) continue;
                ctx.beginPath();
                ctx.arc(sx + R * p[0], sy + R * p[1], R * r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.save();
            ctx.globalAlpha *= 1 - morph;
            forma(elipse(sx - R * 0.18, sy - R * 0.55, R * 0.5, R * 0.22, 18, -0.25), { fill: COR.molho, lw: 3 });
            forma(elipse(sx + R * 0.35, sy - R * 0.25, R * 0.2, R * 0.28, 14, 0.4), { fill: COR.molho, lw: 3 });
            ctx.restore();
        }
        // nuvens do planeta
        if (morph > 0) {
            ctx.save();
            ctx.globalAlpha *= morph * 0.9;
            for (const [lo, la, tam] of NUVENS_PLANETA) {
                const p = projetar(lo, la, giro * 1.15);
                if (p[2] < 0.15) continue;
                forma(elipse(sx + R * p[0], sy + R * p[1], R * tam * p[2], R * tam * 0.3, 16, 0.1), { fill: '#f4f1ff', lw: 2.5 });
            }
            ctx.restore();
        }
        // lado escuro (luz vem da esquerda-cima) com retícula
        const cx = sx + R * lerp(-0.38, -0.78, morph);
        const cy = sy + R * lerp(-0.32, -0.1, morph);
        const rl = R * lerp(1.18, 1.02, morph);
        ctx.beginPath();
        ctx.rect(sx - R - 2, sy - R - 2, 2 * R + 4, 2 * R + 4);
        ctx.arc(cx, cy, rl, 0, Math.PI * 2);
        ctx.save();
        ctx.clip('evenodd');
        ctx.fillStyle = `rgba(14,6,30,${lerp(0.3, 0.62, morph)})`;
        ctx.fillRect(sx - R, sy - R, 2 * R, 2 * R);
        preencherReticula(`rgba(14,6,30,${lerp(0.45, 0.6, morph)})`, 12, 2.6);
        ctx.restore();
        // luzes da cidade no lado da noite
        if (luzes > 0) {
            const escala = Math.min(60, Math.pow(R / 300, 0.92));
            for (const [ox, oy, tam] of LUZES) {
                const x = sx + R * (ALVO[0] + ox);
                const y = sy + R * (ALVO[1] + oy);
                if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
                const r = tam * escala;
                ctx.fillStyle = `rgba(255,216,107,${0.25 * luzes})`;
                ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(255,236,160,${luzes})`;
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
        }
        // brilho (molho na carne, reflexo no planeta)
        ctx.save();
        ctx.globalAlpha *= lerp(0.85, 0.35, morph);
        forma(elipse(sx - R * 0.42, sy - R * 0.46, R * 0.17, R * 0.09, 14, -0.6), { fill: '#fff', lw: 0 });
        ctx.restore();
        ctx.restore();
        if (morph > 0) {
            ctx.strokeStyle = `rgba(140,200,255,${0.45 * morph})`;
            ctx.lineWidth = 16;
            ctx.beginPath(); ctx.arc(sx, sy, R + 10, 0, Math.PI * 2); ctx.stroke();
        }
        forma(disco, { lw: 6 });
    }

    // ============================================================= CENA 2 e 3: espaço e mergulho
    function espaco(t) {
        const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 1100);
        g.addColorStop(0, '#26104c');
        g.addColorStop(1, '#06030f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // nebulosa em retícula
        ctx.save();
        caminho(elipse(1480, 250, 420, 180, 24, -0.3), true);
        ctx.clip();
        preencherReticula('rgba(160,90,220,0.35)', 16, 3.2);
        ctx.restore();
        ctx.save();
        caminho(elipse(380, 860, 360, 150, 24, 0.25), true);
        ctx.clip();
        preencherReticula('rgba(80,150,220,0.28)', 16, 3.2);
        ctx.restore();
        for (const [x, y, r, fase] of ESTRELAS) {
            const brilho = 0.55 + 0.45 * Math.sin(t * 2.4 + fase);
            ctx.fillStyle = `rgba(255,248,220,${brilho})`;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
    }

    function raioEsfera(t) {
        if (t < 19.5) return lerp(378, 300, entraSai(faixa(t, 14.5, 17.5)));
        return 300 * Math.exp(Math.log(240) * entra(faixa(t, 19.5, 25.4)));
    }
    const giroPlaneta = (t) => 0.3 + 0.9 * suave(faixa(t, 13, 20));

    function cenaEspaco(t) {
        telaCheia();
        espaco(t);
        // A mesa some enquanto o espaço aparece em volta da almôndega.
        const fade = faixa(t, 12, 14.5);
        if (fade < 1) {
            ctx = ctxCamada;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, camada.width, camada.height);
            camAtual = cameraMesa(12);
            cenaMesa(t, camAtual, () => {});
            ctx = ctxTela;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1 - suave(fade);
            ctx.drawImage(camada, 0, 0);
            ctx.restore();
            telaCheia();
        }
        // lua-almôndega passando (piada)
        if (t > 14.5 && t < 21) {
            const k = faixa(t, 14.5, 21);
            const a = lerp(-0.2, 1.3, k);
            esfera(W / 2 + Math.cos(a) * 640, H / 2 - 180 + Math.sin(a) * 200, 46, 0, t * 0.6, t);
        }
        const R = raioEsfera(t);
        const aproxima = entraSai(faixa(t, 19.5, 22.5));
        const sx = W / 2 - R * ALVO[0] * aproxima;
        const sy = H / 2 - R * ALVO[1] * aproxima;
        // Almôndega dissolve por cima do planeta (mesmas manchas = mesmos continentes).
        const morph = suave(faixa(t, 12.6, 15));
        const giro = giroPlaneta(t);
        esfera(sx, sy, R, 1, giro, t, { luzes: faixa(t, 18.3, 19.8) });
        if (morph < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - morph;
            esfera(sx, sy, R, 0, giro, t);
            ctx.restore();
        }
    }

    function nuvemFofa(x, y, s, base, sombraCor, lw = 6) {
        const bolas = [[-0.9, 0.12, 0.55], [-0.4, -0.28, 0.7], [0.32, -0.22, 0.66], [0.92, 0.14, 0.5], [0, 0.18, 0.78]];
        const pts = bolas.map(([dx, dy, r]) => elipse(x + dx * s, y + dy * s, r * s, r * s * 0.9, 16));
        ctx.lineWidth = (lw * 2) / zAtual;
        ctx.strokeStyle = COR.tinta;
        for (const p of pts) { caminho(tremer(p), true); ctx.stroke(); }
        for (const p of pts) { caminho(p, true); ctx.fillStyle = base; ctx.fill(); }
        ctx.save();
        ctx.beginPath();
        for (const [dx, dy, r] of bolas) ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.9, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = sombraCor;
        caminho(elipse(x + 0.1 * s, y + 0.42 * s, 1.1 * s, 0.28 * s, 18), true);
        ctx.fill();
        ctx.restore();
    }

    function nuvensRapidas(t) {
        telaCheia();
        for (const p of PUFES) {
            if (t < p.t0) continue;
            const d = 40 * Math.exp(p.v * (t - p.t0));
            if (d > 2600) continue;
            const s = (0.34 * d + 30) * p.s;
            const a = faixa(t, p.t0, p.t0 + 0.35);
            ctx.save();
            ctx.globalAlpha = a;
            nuvemFofa(W / 2 + Math.cos(p.a) * d, H / 2 + Math.sin(p.a) * d * 0.7, s, COR.lavanda, 'rgba(120,96,190,0.55)');
            ctx.restore();
        }
        const neblina = faixa(t, 23.2, 24.6) - faixa(t, 25.2, 27.2);
        if (neblina > 0) {
            ctx.fillStyle = `rgba(214,202,255,${neblina})`;
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.globalAlpha = neblina * 0.5;
            ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
            preencherReticula('rgba(120,96,190,0.5)', 18, 3.4);
            ctx.restore();
        }
    }

    // ============================================================= CENA 4: Toradolândia
    function cameraCidade(t) {
        const k1 = entraSai(faixa(t, 25, 31));
        const k2 = entraSai(faixa(t, 31, 41.5));
        return { x: lerp(960, 930, k2), y: lerp(-420, 540, k1) + 60 * k2, z: lerp(1, 1.42, k2) };
    }

    function sinalLigado(t) {
        if (t < 29.6) return 0;
        if (t < 30.2) return Math.floor(t * 20) % 3 ? 1 : 0.15;
        return 1;
    }

    function cenaCidade(t) {
        const cam = cameraCidade(t);
        camera(cam);
        const g = ctx.createLinearGradient(0, -1000, 0, 1100);
        g.addColorStop(0, COR.noite);
        g.addColorStop(0.55, '#1a0d3a');
        g.addColorStop(1, COR.noiteClara);
        ctx.fillStyle = g;
        ctx.fillRect(-800, -1100, W + 1600, H + 1400);
        for (const [x, y, r, fase] of ESTRELAS_CIDADE) {
            ctx.fillStyle = `rgba(255,248,220,${0.5 + 0.5 * Math.sin(t * 2 + fase)})`;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        // lua
        forma(elipse(300, 190, 86, 86, 30), { fill: '#f3e9c6' });
        ctx.save();
        caminho(elipse(300, 190, 86, 86, 30), true);
        ctx.clip();
        caminho(elipse(340, 215, 90, 90, 24), true);
        ctx.fillStyle = 'rgba(180,160,120,0.35)';
        ctx.fill();
        preencherReticula('rgba(150,130,90,0.5)', 12, 2.6);
        ctx.restore();
        for (const [x, y, s] of NUVENS_ALTAS) nuvemFofa(x + t * 5, y, s, '#4b3580', 'rgba(20,10,50,0.45)', 5);
        // prédios ao longe
        for (const p of CIDADE.longe) {
            ctx.fillStyle = COR.predioLonge;
            ctx.fillRect(p.x, p.topo, p.w, 1100 - p.topo);
            ctx.fillStyle = 'rgba(255,216,107,0.35)';
            for (const [jx, jy] of p.janelas) ctx.fillRect(jx, jy, 10, 14);
        }
        // faixa de nuvens onde o sinal aparece
        for (const [x, y, s] of NUVENS_CEU) nuvemFofa(x + t * 8, y, s, '#5b3f8f', 'rgba(20,10,50,0.45)', 5);
        // prédios perto
        for (const p of CIDADE.perto) predioPerto(p, t);
        // facho do holofote e o sinal da vírgula
        const liga = sinalLigado(t);
        if (liga > 0) {
            ctx.save();
            ctx.globalAlpha = liga;
            ctx.fillStyle = 'rgba(255,240,180,0.2)';
            caminho([[1630, 668], [1680, 668], [1510, 230], [1095, 230]], true, true);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,240,180,0.35)';
            caminho(elipse(1300, 220, 225, 125, 30), true);
            ctx.fill();
            forma(elipse(1300, 220, 190, 104, 30), { fill: 'rgba(255,244,200,0.92)', lw: 6 });
            // vírgula: bolinha + rabinho
            forma(elipse(1302, 196, 38, 38, 20), { fill: '#1c0f45', lw: 0 });
            forma([[1334, 208], [1332, 250], [1300, 290], [1268, 300], [1296, 262], [1306, 226]], { fill: '#1c0f45', lw: 0 });
            ctx.restore();
        }
        holofote(t);
        onomatopeia('CLAC!', 1650, 590, t - 29.6, 50);
        telhado();
        local(860, 886, 1.12, () => degustador(t));
    }

    function predioPerto(p, t) {
        forma(retangulo(p.x, p.topo, p.w, 1200 - p.topo), { fill: COR.predioPerto, lw: 6, reta: true });
        ctx.fillStyle = COR.janela;
        for (const [jx, jy] of p.janelas) {
            if (hash(jx * 7 + jy) < 0.05 && Math.sin(t * 3 + jx) > 0.7) continue; // alguém apagou a luz
            ctx.fillRect(jx, jy, 12, 16);
        }
        if (p.caixa) {
            const cx = p.x + p.w * 0.6;
            forma(retangulo(cx - 4, p.topo - 70, 8, 70), { fill: '#120a24', lw: 4, reta: true });
            forma(retangulo(cx - 30, p.topo - 110, 60, 50), { fill: '#241640', lw: 5, reta: true });
        }
        if (p.letreiro) {
            const pisca = Math.floor(t * 6) % 17 === 0 ? 0.35 : 1;
            forma(retangulo(p.x + 14, p.topo - 70, p.w - 28, 58), { fill: '#120a24', lw: 5, reta: true });
            ctx.save();
            ctx.globalAlpha = pisca;
            ctx.shadowColor = '#ff4fd8';
            ctx.shadowBlur = 18;
            textoHQ('TORADOLÂNDIA', p.x + p.w / 2, p.topo - 40, { tam: 38, preench: '#ffb3f0', contorno: '#ff4fd8', larg: 3 });
            ctx.restore();
        }
    }

    function holofote(t) {
        const bx = 1655;
        const by = 690;
        forma(retangulo(bx - 40, by - 24, 80, 24), { fill: '#3a3548', lw: 5, reta: true });
        local(bx, by - 36, 1, () => {
            forma(retangulo(-34, -26, 68, 52), { fill: '#6a6478', lw: 5, reta: true });
            forma(elipse(30, 0, 12, 26, 14), { fill: sinalLigado(t) ? '#fff6c8' : '#9a94a8', lw: 5 });
        }, -2.26);
    }

    function telhado() {
        // caixa d'água atrás da mureta
        forma(retangulo(250, 700, 14, 190), { fill: '#3a2f52', lw: 4, reta: true });
        forma(retangulo(392, 700, 14, 190), { fill: '#3a2f52', lw: 4, reta: true });
        forma([[250, 780], [406, 720]], { fechado: false, lw: 4 });
        forma([[250, 720], [406, 780]], { fechado: false, lw: 4 });
        const tanque = retangulo(226, 566, 204, 136);
        forma(tanque, { fill: '#4a3b66', lw: 6, reta: true });
        sombraDentro(tanque, retangulo(330, 560, 110, 150), { cor: 'rgba(10,6,24,0.25)', pontos: 'rgba(10,6,24,0.5)' });
        for (const y of [600, 640, 676]) forma([[226, y], [430, y]], { fechado: false, lw: 4 });
        forma([[214, 568], [328, 512], [442, 568]], { fill: '#5b4a7a', lw: 6, reta: true });
        forma(retangulo(1480, 760, 6, 130), { fill: '#1a1424', lw: 3, reta: true });
        forma([[1440, 780], [1526, 780]], { fechado: false, lw: 5 });
        forma([[1452, 805], [1514, 805]], { fechado: false, lw: 5 });
        // mureta
        forma(retangulo(-600, 882, W + 1200, 400), { fill: '#2a2233', lw: 7, reta: true });
        forma(retangulo(-600, 882, W + 1200, 26), { fill: '#3b3148', lw: 6, reta: true });
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        for (let y = 930; y < 1200; y += 36) {
            ctx.beginPath(); ctx.moveTo(-600, y); ctx.lineTo(W + 600, y); ctx.stroke();
            for (let x = -600 + ((y / 36) % 2) * 45; x < W + 600; x += 90) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 36); ctx.stroke();
            }
        }
    }

    // ------------------------------------------------------------- o Degustador da Noite
    function degustador(t) {
        const vento = 0.7 + 0.3 * Math.sin(t * 1.3);
        const rajada = 1 + 1.3 * suave(faixa(t, 33, 34.5)) * (1 - suave(faixa(t, 35.5, 37)));
        const respira = Math.sin(t * 2) * 2;
        const onda = ([x, y]) => {
            const f = clamp((y + 322) / 322, 0, 1);
            return [x + (Math.sin(t * 3 + y * 0.03) * 10 * vento + 30 * rajada) * f, y + Math.sin(t * 2.6 + x * 0.04) * 6 * f];
        };
        // capa rasgada
        const borda = [];
        for (let i = 0; i <= 9; i++) borda.push([-134 + i * 33, i % 2 ? -16 : 10]);
        const capa = [[-58, -322], [-94, -250], [-120, -150], [-134, -40], ...borda, [162, -60], [128, -170], [94, -260], [58, -322]].map(onda);
        forma(capa, { fill: '#2a2933' });
        forma([[58, -318], [94, -252], [126, -160], [150, -60], [112, -40], [82, -150], [62, -250]].map(onda), { fill: '#3d3b4a', lw: 4 });
        // pernas e botas
        membro([[-28, -178], [-34, -90], [-36, -44]], '#676a73', 42);
        membro([[28, -178], [36, -90], [40, -44]], '#676a73', 42);
        forma([[-70, 0], [-68, -52], [-16, -56], [-10, -12], [-2, 0]], { fill: '#232228' });
        forma([[2, 0], [12, -12], [18, -56], [68, -52], [74, 0]], { fill: '#232228' });
        local(0, respira * 0.3, 1, () => {
            // tronco cinza remendado com fita
            const tronco = [[-76, -326], [76, -326], [62, -178], [-62, -178]];
            forma(tronco, { fill: '#8e9199', reta: true });
            sombra([[18, -326], [76, -326], [62, -178], [10, -178]], { cor: 'rgba(20,16,30,0.2)', pontos: 'rgba(20,16,30,0.45)' });
            const morcego = [[0, -8], [6, -16], [9, -8], [20, -12], [38, -14], [46, -4], [36, 2], [28, -2], [22, 6], [12, 2], [6, 10], [0, 4]];
            const inteiro = [...morcego, ...morcego.slice().reverse().map(([x, y]) => [-x, y])];
            forma(inteiro.map(([x, y]) => [x * 1.05, y * 1.05 - 282]), { fill: COR.tinta, lw: 0 });
            forma(retangulo(-50, -242, 34, 12, 0.6), { fill: '#d8c49a', lw: 3, reta: true });
            forma(retangulo(-50, -242, 34, 12, -0.6), { fill: '#d8c49a', lw: 3, reta: true });
            forma(retangulo(30, -306, 36, 12, 0.35), { fill: '#d8c49a', lw: 3, reta: true });
            // cinto de utilidades
            forma(retangulo(-64, -198, 128, 24), { fill: '#e3c03a', reta: true });
            forma(retangulo(-52, -196, 20, 28), { fill: '#b88f22', lw: 4, reta: true });
            forma(retangulo(32, -196, 20, 28), { fill: '#b88f22', lw: 4, reta: true });
            forma(retangulo(-10, -196, 20, 20), { fill: '#8a6c18', lw: 4, reta: true });
            // braço direito (dele) caído, luva escura
            membro([[66, -312], [94, -248], [86, -190]], '#8e9199', 38);
            forma(elipse(86, -180, 19, 21, 14), { fill: '#2a2a31' });
            cabecaDegustador(t);
            // braço esquerdo erguendo a MP5K laranja
            membro([[-66, -312], [-98, -250], [-66, -206]], '#8e9199', 38);
            local(-66, -206, 1, () => { ctx.scale(-1, 1); mp5k(); }, 0.95);
        });
    }

    function cabecaDegustador(t) {
        // orelhas do chapéu do Teemo (atrás do domo)
        forma([[-48, -420], [-92, -476], [-26, -446]], { fill: '#8a5a3a' });
        forma([[48, -420], [92, -476], [26, -446]], { fill: '#8a5a3a' });
        forma([[-52, -430], [-78, -462], [-38, -444]], { fill: '#d8a27a', lw: 3 });
        forma([[52, -430], [78, -462], [38, -444]], { fill: '#d8a27a', lw: 3 });
        // capuz grafite
        forma(elipse(0, -372, 58, 66, 26), { fill: '#2e2d37' });
        // rosto, barba castanha e óculos pretos
        const rosto = elipse(2, -364, 38, 44, 24);
        forma(rosto, { fill: '#e0b088', lw: 5 });
        ctx.save();
        caminho(rosto, true);
        ctx.clip();
        forma([[-44, -370], [-30, -352], [-14, -347], [0, -351], [14, -347], [30, -352], [46, -370], [44, -318], [0, -310], [-42, -318]], { fill: '#5b3a22', lw: 3 });
        ctx.restore();
        forma([[-10, -337], [0, -339], [10, -336]], { fechado: false, lw: 4 });
        forma([[-32, -396], [-8, -389]], { fechado: false, lw: 6 });
        forma([[8, -389], [32, -396]], { fechado: false, lw: 6 });
        forma(retangulo(-33, -386, 27, 17), { fill: '#9fc7de', lw: 5, reta: true });
        forma(retangulo(6, -386, 27, 17), { fill: '#9fc7de', lw: 5, reta: true });
        forma([[-6, -379], [6, -379]], { fechado: false, lw: 4 });
        const brilho = faixa(t, 36.5, 37.3);
        if (brilho > 0 && brilho < 1) {
            const x = lerp(-34, 34, brilho);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x - 4, -370); ctx.lineTo(x + 6, -387); ctx.stroke();
        }
        // domo verde, faixa e óculos vermelhos, tufo
        const domo = [];
        for (let i = 0; i <= 12; i++) {
            const a = Math.PI + (i / 12) * Math.PI;
            domo.push([Math.cos(a) * 66, -410 + Math.sin(a) * 48]);
        }
        forma(domo, { fill: '#5d8c3b' });
        sombra([[20, -455], [66, -410], [20, -410]], { cor: 'rgba(20,40,10,0.2)', pontos: 'rgba(20,40,10,0.5)' });
        membro([[-66, -410], [0, -416], [66, -410]], '#b3302a', 12, 4);
        forma(elipse(-22, -424, 15, 15, 16), { fill: '#9fd6ea', stroke: '#b3302a', lw: 7 });
        forma(elipse(-22, -424, 15, 15, 16), { lw: 3 });
        forma(elipse(20, -424, 15, 15, 16), { fill: '#9fd6ea', stroke: '#b3302a', lw: 7 });
        forma(elipse(20, -424, 15, 15, 16), { lw: 3 });
        forma([[0, -456], [8, -480], [28, -494], [18, -472], [12, -456]], { fill: '#6fae3f', lw: 4 });
    }

    function mp5k() {
        forma(retangulo(-38, -7, 30, 14), { fill: '#3a3a40', lw: 4, reta: true });
        forma([[52, 12], [70, 12], [78, 52], [60, 56]], { fill: '#e0660f', lw: 5 });
        forma([[14, 12], [30, 12], [26, 40], [10, 40]], { fill: '#e0660f', lw: 5 });
        forma(retangulo(0, -13, 108, 26), { fill: '#ff7a1a', reta: true });
        forma(retangulo(8, -20, 80, 7), { fill: '#d85f10', lw: 4, reta: true });
        forma(retangulo(108, -6, 34, 12), { fill: '#2d2d33', lw: 4, reta: true });
        for (const x of [70, 80, 90]) forma([[x, -8], [x, 8]], { fechado: false, lw: 3 });
        forma(elipse(22, 22, 17, 19, 14), { fill: '#2a2a31' });
    }

    // ============================================================= fim
    function titulo(t) {
        const idade = t - 41.3;
        if (idade < 0) return;
        telaCheia();
        ctx.fillStyle = `rgba(7,4,26,${0.35 * faixa(idade, 0, 0.6)})`;
        ctx.fillRect(0, 0, W, H);
        const pop = idade < 0.35 ? sai(idade / 0.35) * 1.1 : lerp(1.1, 1, faixa(idade, 0.35, 0.55));
        local(1430, 640, pop, () => {
            forma(estrela(0, 0, 420, 300, 14, idade * 0.15), { fill: '#7b2cbf', lw: 8 });
            sombra(estrela(0, 0, 420, 300, 14, idade * 0.15), { cor: null, pontos: 'rgba(20,6,40,0.5)', passo: 14, raio: 3 });
            const prata = ctx.createLinearGradient(0, -120, 0, 0);
            prata.addColorStop(0, '#ffffff');
            prata.addColorStop(0.5, '#b9b9c4');
            prata.addColorStop(1, '#6d6d7a');
            textoHQ('DEGUSTADOR', 0, -60, { tam: 128, preench: prata, larg: 18, sombraX: 8, sombraY: 8 });
            const laranja = ctx.createLinearGradient(0, 30, 0, 110);
            laranja.addColorStop(0, '#ffc266');
            laranja.addColorStop(1, '#e05a00');
            textoHQ('DA NOITE', 0, 70, { tam: 96, preench: laranja, larg: 16, sombraX: 7, sombraY: 7 });
        }, -0.06);
    }

    // ------------------------------------------------------------- acabamento
    const grao = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 220;
        const g = c.getContext('2d');
        const img = g.createImageData(220, 220);
        const r = semente(3);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.floor(r() * 255);
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 14;
        }
        g.putImageData(img, 0, 0);
        return c;
    })();
    // Vinheta + grão de impressão, prontos em 4 variações (o grão muda junto com o lápis).
    let acabamentos = [];
    function prepararAcabamentos() {
        acabamentos = [0, 1, 2, 3].map((k) => {
            const c = document.createElement('canvas');
            c.width = tela.width;
            c.height = tela.height;
            const g = c.getContext('2d');
            g.setTransform(baseK, 0, 0, baseK, 0, 0);
            const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
            v.addColorStop(0, 'rgba(0,0,0,0)');
            v.addColorStop(1, 'rgba(0,0,0,0.38)');
            g.fillStyle = v;
            g.fillRect(0, 0, W, H);
            g.fillStyle = g.createPattern(grao, 'repeat');
            g.translate(-hash(k * 13) * 220, -hash(k * 29 + 5) * 220);
            g.fillRect(0, 0, W + 220, H + 220);
            return c;
        });
    }
    function acabamento(t) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(acabamentos[quadroLapis % 4], 0, 0);
        ctx.restore();
        telaCheia();
        const preto = 1 - faixa(t, 0, 0.8) + faixa(t, 44.1, 45);
        if (preto > 0) {
            ctx.fillStyle = `rgba(0,0,0,${clamp(preto, 0, 1)})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    let camAtual = { x: W / 2, y: H / 2, z: 1 };
    function desenhar(t) {
        formaId = 0;
        quadroLapis = Math.floor(t * 8);
        ctx = ctxTela;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, tela.width, tela.height);
        if (t < 12) {
            camAtual = cameraMesa(t);
            const cam = camAtual;
            cenaMesa(t, cam, () => {
                const b = bola(t);
                const s = naTela(cam, b[0], b[1]);
                telaCheia();
                esfera(s[0], s[1], R_BOLA * cam.z, 0, 0.3, t);
            });
        } else if (t < 24.9) {
            cenaEspaco(t);
        } else {
            cenaCidade(t);
        }
        if (t >= 21 && t < 28) nuvensRapidas(t);
        titulo(t);
        acabamento(t);
    }

    // ------------------------------------------------------------- relógio e controles
    const hud = document.getElementById('hud');
    const botaoPlay = document.getElementById('play');
    const barra = document.getElementById('barra');
    const rotulo = document.getElementById('tempo');
    const botaoGravar = document.getElementById('gravar');
    const pedido = Number(new URLSearchParams(location.search).get('t'));
    let t = Number.isFinite(pedido) ? clamp(pedido, 0, DURACAO) : 0;
    let tocando = true;
    let ultimo = null;
    let gravador = null;

    function atualizarHud() {
        botaoPlay.textContent = tocando ? '⏸' : '▶';
        botaoPlay.setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar');
        barra.value = t.toFixed(2);
        rotulo.textContent = `${t.toFixed(1)} s`;
    }
    function tocarOuPausar() {
        if (!tocando && t >= DURACAO) t = 0;
        tocando = !tocando;
    }
    function quadro(agora) {
        if (ultimo !== null && tocando) {
            t += Math.min(0.1, (agora - ultimo) / 1000);
            if (t >= DURACAO) {
                t = DURACAO;
                tocando = false;
                if (gravador) gravador.stop();
            }
        }
        ultimo = agora;
        desenhar(t);
        atualizarHud();
        requestAnimationFrame(quadro);
    }

    botaoPlay.addEventListener('click', tocarOuPausar);
    barra.addEventListener('input', () => { t = Number(barra.value); });
    addEventListener('keydown', (e) => {
        if (gravador) return;
        if (e.code === 'Space') { e.preventDefault(); tocarOuPausar(); }
        if (e.code === 'ArrowRight') t = clamp(t + 1, 0, DURACAO);
        if (e.code === 'ArrowLeft') t = clamp(t - 1, 0, DURACAO);
        if (e.code === 'KeyR') { t = 0; tocando = true; }
    });
    let esconder = 0;
    function mostrarHud() {
        if (gravador) return;
        hud.classList.remove('escondido');
        clearTimeout(esconder);
        esconder = setTimeout(() => { if (tocando) hud.classList.add('escondido'); }, 2500);
    }
    addEventListener('pointermove', mostrarHud);
    addEventListener('keydown', mostrarHud);

    // Gravar: renderiza em 1920×1080 do começo ao fim e baixa um .webm.
    botaoGravar.addEventListener('click', () => {
        if (!('MediaRecorder' in window) || !tela.captureStream) {
            alert('Este navegador não grava vídeo do canvas. Tente o Chrome ou o Edge.');
            return;
        }
        const tipo = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
        ajustar(true);
        const partes = [];
        gravador = new MediaRecorder(tela.captureStream(60), { mimeType: tipo, videoBitsPerSecond: 16e6 });
        gravador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
        gravador.onstop = () => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob(partes, { type: tipo }));
            link.download = 'da-macarronada-a-toradolandia.webm';
            link.click();
            gravador = null;
            ajustar();
            hud.classList.remove('escondido');
        };
        hud.classList.add('escondido');
        t = 0;
        tocando = true;
        gravador.start();
    });

    addEventListener('resize', () => { if (!gravador) ajustar(); });
    ajustar();
    mostrarHud();
    requestAnimationFrame(quadro);

    // Para inspeção (tools/qa.mjs): desenhar um instante exato.
    window.Abertura = { irPara(s) { t = clamp(s, 0, DURACAO); tocando = false; desenhar(t); }, DURACAO };
})();
