const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const C = require('../js/cacada-core.js');
const MUNDO_EXP = require('../js/cacada-mundo-expansao.js');
const MUNDO = require('../js/cacada-mundo.js');
const { CONFIG } = C;
const DT = CONFIG.passo;

const mundoDe = (mapa, extra = {}) => ({
    areas: { a: { nome: 'A', cor: '#fff' } },
    salas: [{ id: 'sala', area: 'a', x: 0, y: 0, mapa, ...extra }],
});

function jogoDe(mapa, extra = {}, habilidades = []) {
    const jogo = C.criarJogo(mundoDe(mapa, extra));
    C.iniciar(jogo);
    for (const h of habilidades) jogo.progresso.habilidades.add(h);
    jogo.eventos = [];
    return jogo;
}

function rodar(jogo, segundos, entrada = {}) {
    const n = Math.round(segundos / DT);
    for (let i = 0; i < n; i++) {
        const e = typeof entrada === 'function' ? entrada(i, jogo) : { ...entrada };
        e.cimaAgora = !!e.cimaPedido;
        C.passo(jogo, e, DT);
    }
}

function criarSandboxCacada(opcoes = {}) {
    const textosDesenhados = [];
    const windowListeners = new Map();
    const docListeners = new Map();
    const makeEl = (tag) => {
        const listeners = new Map();
        const classes = new Set();
        const el = {
            tagName: tag.toUpperCase(),
            dataset: {},
            style: {},
            children: [],
            width: 0,
            height: 0,
            open: true,
            className: '',
            getContext: () => ctx,
            classList: {
                add: (c) => classes.add(c),
                remove: (c) => classes.delete(c),
                contains: (c) => classes.has(c),
            },
            appendChild(child) { this.children.push(child); return child; },
            querySelector: () => null,
            querySelectorAll: () => [],
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
            setPointerCapture: () => {},
            addEventListener(type, fn) {
                if (!listeners.has(type)) listeners.set(type, []);
                listeners.get(type).push(fn);
            },
            dispatch(type, event) {
                for (const fn of (listeners.get(type) || [])) fn(event);
            },
        };
        return el;
    };
    const dialog = makeEl('dialog');
    const canvas = makeEl('canvas');
    const ctx = new Proxy({
        fillText(t) { textosDesenhados.push(String(t)); },
        strokeText() {},
        measureText: (t) => ({ width: String(t).length * 7 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
        ellipse() {}, rect() {}, roundRect() {}, fill() {}, stroke() {},
        fillRect() {}, strokeRect() {}, clearRect() {}, drawImage() {},
        setLineDash() {}, clip() {},
    }, {
        get(target, prop) { return prop in target ? target[prop] : undefined; },
        set(target, prop, value) { target[prop] = value; return true; },
    });

    const storage = new Map(Object.entries(opcoes.storage || {}));
    const windowObj = {
        CacadaCore: C,
        CacadaMundo: MUNDO,
        CacadaMundoExpansao: MUNDO_EXP,
        CACADA_ARTES: [],
        GameDialog: {
            create: () => ({
                dialog,
                canvas,
                ctx,
                abrir() { dialog.open = true; },
                fechar() { dialog.open = false; },
                aoFechar() {},
                mostrarRanking() {},
                avisar() {},
                iniciarPartida() {},
                enviarPartida() {},
                get aberta() { return dialog.open; },
            }),
        },
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener(type, fn) {
            if (!windowListeners.has(type)) windowListeners.set(type, []);
            windowListeners.get(type).push(fn);
        },
        dispatch(type, event = {}) {
            for (const fn of (windowListeners.get(type) || [])) fn(event);
        },
        matchMedia: () => ({ matches: !!opcoes.toque }),
    };

    const documentObj = {
        hidden: false,
        createElement: (tag) => makeEl(tag),
        addEventListener(type, fn) {
            if (!docListeners.has(type)) docListeners.set(type, []);
            docListeners.get(type).push(fn);
        },
    };

    let rafCb = null;
    const sandbox = {
        window: windowObj,
        document: documentObj,
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: (k) => storage.delete(k),
        },
        matchMedia: windowObj.matchMedia,
        innerWidth: 1024,
        innerHeight: 768,
        Image: class { set src(_) {} },
        requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
        cancelAnimationFrame: () => {},
        performance: { now: () => 0 },
        AudioContext: undefined,
        webkitAudioContext: undefined,
        CacadaCore: C,
        CacadaMundo: MUNDO,
        CacadaMundoExpansao: MUNDO_EXP,
        CACADA_ARTES: [],
        GameDialog: windowObj.GameDialog,
    };
    sandbox.globalThis = sandbox;
    const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'cacada.js'), 'utf8');
    vm.runInNewContext(codigo, sandbox, { filename: 'js/cacada.js' });
    return {
        api: windowObj.CacadaInominavel,
        dialog,
        canvas,
        ctx,
        windowObj,
        textosDesenhados,
        tick: (ms = 0) => { const cb = rafCb; rafCb = null; if (cb) cb(ms); },
    };
}

test('cacada-core: Buzz! carrega e dispara em cima de plataforma móvel M', () => {
    const mapa = [
        '##############',
        '#............#',
        '#............#',
        '#..S.........#',
        '#..MMMMMM....#',
        '#............#',
        '##############',
    ];
    const jogo = jogoDe(mapa, {}, ['dash', 'buzz']);
    // Assenta o jogador na plataforma móvel M.
    rodar(jogo, 0.25, {});
    assert.equal(jogo.jogador.noChao, true, 'jogador deveria estar apoiado na plataforma M');

    rodar(jogo, 0.65, (i) => ({ baixo: true, dash: true, dashPedido: i === 0 }));
    assert.equal(jogo.jogador.estado, 'carregando', 'Buzz! deveria continuar carregando na plataforma M');

    rodar(jogo, 0.05, {});
    assert.equal(jogo.jogador.estado, 'buzz', 'soltar após carregar na plataforma M deveria disparar Buzz!');
});

test('cacada-core: dash em cima de plataforma móvel M mantém noChao e dashDisponivel', () => {
    const mapa = [
        '##################',
        '#................#',
        '#..S.............#',
        '#..MMMMMMMMMM....#',
        '#................#',
        '##################',
    ];
    const jogo = jogoDe(mapa, {}, ['dash']);
    rodar(jogo, 0.25, {});
    assert.equal(jogo.jogador.noChao, true);

    rodar(jogo, 0.05, (i) => ({ direita: true, dash: true, dashPedido: i === 0 }));
    assert.equal(jogo.jogador.estado, 'dash');
    assert.equal(jogo.jogador.noChao, true, 'noChao não deve cair para false durante dash sobre plataforma M');
    assert.equal(jogo.jogador.dashDisponivel, true, 'dashDisponivel deve permanecer true sobre plataforma M');
});

test('cacada: perder foco (blur) limpa teclasApertadas e evita dash preso ao soltar outra tecla', () => {
    const { api, dialog, windowObj } = criarSandboxCacada();
    api.jogo.fase = 'jogando';

    dialog.dispatch('keydown', { code: 'ShiftLeft', repeat: false, preventDefault() {} });
    assert.equal(api.entrada.dash, true);

    // Simula perda de foco da janela antes do keyup de ShiftLeft.
    windowObj.dispatch('blur');
    assert.equal(api.entrada.dash, false);

    // Agora aperta e solta KeyC: não pode achar que ShiftLeft ainda está pressionada.
    dialog.dispatch('keydown', { code: 'KeyC', repeat: false, preventDefault() {} });
    assert.equal(api.entrada.dash, true);
    dialog.dispatch('keyup', { code: 'KeyC' });
    assert.equal(api.entrada.dash, false, 'entrada.dash não deve ficar presa após blur');
});

test('cacada: navegação na loja com 0 itens não gera lojaSel = NaN', () => {
    const { api, dialog } = criarSandboxCacada();
    api.jogo.fase = 'loja';
    api.jogo.lojaAtual = { vendedor: 'pastel' };
    api.visual.lojaSel = 0;

    // Força 0 itens disponíveis esgotando o estoque possível para o vendedor inexistente.
    api.jogo.lojaAtual = { vendedor: 'inexistente' };
    dialog.dispatch('keydown', { code: 'KeyW', repeat: false, preventDefault() {} });
    assert.equal(Number.isNaN(api.visual.lojaSel), false, 'lojaSel não pode virar NaN com lista vazia');
    dialog.dispatch('keydown', { code: 'KeyS', repeat: false, preventDefault() {} });
    assert.equal(Number.isNaN(api.visual.lojaSel), false);
});

test('cacada: resumo do save na tela inicial mostra total real de habilidades', () => {
    const todas = Object.keys(C.HABILIDADES);
    const save = JSON.stringify({ v: 3, habilidades: todas, tempo: 120, mortes: 1 });
    const { api, dialog, textosDesenhados, tick } = criarSandboxCacada({ storage: { 'cacada-save-v2': save } });

    dialog.open = false;
    api.abrir();
    tick(16);
    assert.ok(
        textosDesenhados.some((t) => t.includes(`${todas.length}/${todas.length} habilidades`)),
        `esperava ${todas.length}/${todas.length} habilidades nos textos: ${textosDesenhados.join(' | ')}`
    );
});

test('italos-surfer: pointerup/pointercancel ignoram outro pointerId e pointerup fora de playing não dispara board', () => {
    const codigo = fs.readFileSync(path.join(__dirname, '..', 'assets', 'italos-surfer', 'main.mjs'), 'utf8');
    const upMatch = codigo.match(/canvas\.addEventListener\('pointerup',e=>\{[\s\S]*?\}\);/);
    const cancelMatch = codigo.match(/canvas\.addEventListener\('pointercancel',[\s\S]*?\);/);
    assert.ok(upMatch && cancelMatch);

    const actions = [];
    const listeners = {};
    const canvas = { addEventListener: (k, fn) => { listeners[k] = fn; } };
    const swipe = () => {};
    const action = (a) => actions.push(a);
    const performance = { now: () => 100 };

    const runner = new Function('canvas', 'swipe', 'action', 'performance', `
      let gesture = null, mode = 'playing', lastTap = 0;
      ${upMatch[0]}
      ${cancelMatch[0]}
      return {
        setGesture: (g) => { gesture = g; },
        getGesture: () => gesture,
        setMode: (m) => { mode = m; },
      };
    `)(canvas, swipe, action, performance);

    runner.setGesture({ id: 1, x: 10, y: 10, used: false });
    // Segundo dedo (pointerId 2) solta ou cancela: NÃO deve cancelar gesto do dedo 1 nem contar tap.
    listeners.pointerup({ pointerId: 2 });
    listeners.pointercancel({ pointerId: 2 });
    assert.deepEqual(runner.getGesture(), { id: 1, x: 10, y: 10, used: false });
    assert.equal(actions.length, 0);

    // Se o jogo pausar com o dedo ainda na tela, soltar não deve disparar board.
    runner.setMode('paused');
    listeners.pointerup({ pointerId: 1 });
    assert.equal(runner.getGesture(), null);
    assert.equal(actions.length, 0);
});
