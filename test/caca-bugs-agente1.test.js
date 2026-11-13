// ============================================================================
// Testes de regressão do Agente 1 (Batalha / TCG no navegador).
// Cobrem os bugs corrigidos em js/batalha.js, js/tcg-robo.js, css/batalha.css
// e batalha.html.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const Baralho = require('../js/baralho-dados.js');
const R = require('../js/tcg-regras.js');
const Robo = require('../js/tcg-robo.js');

const ROOT = path.resolve(__dirname, '..');

function inst(j, spec) {
    const s = typeof spec === 'string' ? { id: spec } : spec;
    return {
        uid: s.uid || `${j}-u${Math.random().toString(36).slice(2, 7)}`,
        id: s.id,
        dano: s.dano || 0,
        aura: s.aura || 0,
        estados: { notificado: false, iludido: false, silenciado: 0, virada: 0, ...(s.estados || {}) },
        escudo: s.escudo || null,
        anexos: s.anexos || [],
    };
}

function mesa({ eu = {}, ele = {}, campo = null, turno = 5, vez = 0 } = {}) {
    const deck = [
        'cara-de-coracao', 'cara-de-coracao', 'bug-do-discord', 'bug-do-discord',
        'notificacao-morcego', 'notificacao-morcego', 'emoji-pistola', 'emoji-pistola',
        'drone-vigia', 'drone-vigia', 'italolol', 'italolol',
        'estacionamento-noturno', 'estacionamento-noturno', 'enzo-games',
    ];
    const e = R.criarPartida({ semente: 1, decks: [deck, deck] });
    e.fase = 'jogo';
    e.turno = turno;
    e.vez = vez;
    e.primeiro = 0;
    [[vez, eu], [1 - vez, ele]].forEach(([j, lado]) => {
        const x = e.jogadores[j];
        x.preparado = true;
        x.ativo = lado.ativo === null ? null : inst(j, lado.ativo || 'cara-de-coracao');
        x.banco = (lado.banco || []).map((s) => inst(j, s));
        x.mao = (lado.mao || []).map((s) => inst(j, s));
        x.deck = (lado.deck || ['bug-do-discord', 'bug-do-discord', 'bug-do-discord']).map((s) => inst(j, s));
        x.descarte = [];
        x.vida = lado.vida === undefined ? R.VIDA_INICIAL : lado.vida;
        x.flags = { auras: 1, auraEm: {}, reforco: 0, campo: false, recuo: false, trocarCarta: false, moverAuraSuperkid: false, poderes: [] };
    });
    if (campo) e.campo = { carta: inst(campo.dono ?? vez, campo.id || campo), dono: campo.dono ?? vez };
    return e;
}

/** DOM mínimo suficiente para carregar js/baralho.js + js/batalha.js e exercitar a interface. */
function criarAmbienteBatalha() {
    class FakeEl {
        constructor(tag) {
            this.tagName = String(tag).toUpperCase();
            this.children = [];
            this.parentElement = null;
            const styleMap = new Map();
            this.style = {
                setProperty: (k, v) => styleMap.set(k, String(v)),
                removeProperty: (k) => styleMap.delete(k),
                getPropertyValue: (k) => styleMap.get(k) || '',
            };
            this.offsetHeight = 600;
            this.offsetTop = 0;
            this.dataset = {};
            this.attrs = {};
            this.listeners = {};
            this._className = '';
            this._text = '';
            this.hidden = false;
            this.disabled = false;
            this.isConnected = true;
            this.classList = {
                add: (...cls) => {
                    const set = new Set(this._className.split(/\s+/).filter(Boolean));
                    cls.forEach((c) => set.add(c));
                    this._className = [...set].join(' ');
                },
                remove: (...cls) => {
                    const set = new Set(this._className.split(/\s+/).filter(Boolean));
                    cls.forEach((c) => set.delete(c));
                    this._className = [...set].join(' ');
                },
                toggle: (c, force) => {
                    const has = this.classList.contains(c);
                    const on = force === undefined ? !has : !!force;
                    if (on) this.classList.add(c); else this.classList.remove(c);
                    return on;
                },
                contains: (c) => this._className.split(/\s+/).includes(c),
            };
        }
        get className() { return this._className; }
        set className(v) { this._className = String(v || ''); }
        get textContent() {
            if (this.children.length) return this._text + this.children.map((c) => c.textContent).join('');
            return this._text;
        }
        set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
        get firstElementChild() { return this.children[0] || null; }
        get lastChild() { return this.children[this.children.length - 1] || null; }
        setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this._className = String(v); }
        getAttribute(k) { return this.attrs[k] ?? null; }
        removeAttribute(k) { delete this.attrs[k]; }
        addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
        removeEventListener(ev, fn) {
            if (!this.listeners[ev]) return;
            this.listeners[ev] = this.listeners[ev].filter((f) => f !== fn);
        }
        appendChild(n) {
            if (n instanceof FakeEl && n.tagName === '#FRAGMENT') {
                for (const c of n.children.slice()) this.appendChild(c);
                return n;
            }
            const node = typeof n === 'string' ? { textContent: n, remove() {} } : n;
            node.parentElement = this;
            this.children.push(node);
            return node;
        }
        append(...nodes) { nodes.forEach((n) => this.appendChild(n)); }
        prepend(n) {
            const node = typeof n === 'string' ? { textContent: n, remove() {} } : n;
            node.parentElement = this;
            this.children.unshift(node);
        }
        replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
        replaceChild(n, o) { const i = this.children.indexOf(o); if (i >= 0) { n.parentElement = this; this.children[i] = n; } }
        insertBefore(n, ref) {
            const i = this.children.indexOf(ref);
            n.parentElement = this;
            if (i >= 0) this.children.splice(i, 0, n); else this.children.push(n);
        }
        remove() {
            if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
            this.parentElement = null;
        }
        focus() {}
        showModal() {}
        close() {}
        animate() { return { finished: Promise.resolve(), cancel() {} }; }
        getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 140, right: 100, bottom: 140 }; }
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
        querySelectorAll(sel) {
            const out = [];
            const match = (node) => {
                if (!(node instanceof FakeEl)) return false;
                if (sel.startsWith('.')) return node.classList.contains(sel.slice(1));
                if (sel.startsWith('#')) return node.attrs.id === sel.slice(1);
                return node.tagName.toLowerCase() === sel.toLowerCase();
            };
            const walk = (node) => {
                for (const c of node.children || []) {
                    if (c instanceof FakeEl) { if (match(c)) out.push(c); walk(c); }
                }
            };
            walk(this);
            return out;
        }
        click() { for (const fn of this.listeners.click || []) fn({ preventDefault() {} }); }
        dispatchEvent(ev) { for (const fn of this.listeners[ev.type] || []) fn(ev); }
    }

    const raiz = new FakeEl('main');
    raiz.attrs.id = 'batalha';
    const body = new FakeEl('body');
    body.appendChild(raiz);
    const mqlListeners = new Set();

    const document = {
        baseURI: 'http://localhost/batalha.html',
        hidden: false,
        body,
        getElementById: (id) => (id === 'batalha' ? raiz : null),
        createElement: (t) => new FakeEl(t),
        createElementNS: (_ns, t) => new FakeEl(t),
        createDocumentFragment: () => new FakeEl('#fragment'),
        createTextNode: (t) => ({ textContent: String(t), remove() {} }),
        querySelector: (sel) => raiz.querySelector(sel),
        addEventListener() {},
        removeEventListener() {},
    };

    const store = new Map([['enzo-batalha-cartilha', '1']]);
    const localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
    };

    let fetchStub = async () => new Response(JSON.stringify({ ok: false }), { status: 404 });

    const sandbox = {
        console,
        Math,
        Date,
        JSON,
        Promise,
        Set,
        Map,
        Array,
        Object,
        Number,
        String,
        Boolean,
        URL,
        URLSearchParams,
        Error,
        addEventListener() {},
        removeEventListener() {},
        setTimeout,
        clearTimeout,
        setInterval: () => 0,
        clearInterval() {},
        requestAnimationFrame: (fn) => 0,
        fetch: (...args) => fetchStub(...args),
        getComputedStyle: () => ({ transform: 'none' }),
        ResizeObserver: class { observe() {} },
        matchMedia: (q) => ({
            matches: q.includes('prefers-reduced-motion'),
            media: q,
            addEventListener: (_ev, fn) => mqlListeners.add(fn),
            removeEventListener: (_ev, fn) => mqlListeners.delete(fn),
        }),
        document,
        location: { search: '', href: 'http://localhost/batalha.html', reload() {} },
        localStorage,
        innerWidth: 1200,
        innerHeight: 800,
        EnzoSiteImagens: new Set(),
        EnzoConta: { usuario: { id: 'u1', name: 'Jogador Um' }, pronto: Promise.resolve(), aoMudar: () => () => {} },
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    for (const rel of ['js/baralho-dados.js', 'js/baralho.js', 'js/tcg-cartas.js', 'js/tcg-regras.js', 'js/tcg-robo.js', 'js/batalha.js']) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
    }
    return {
        sandbox,
        raiz,
        mqlListeners,
        setFetch: (fn) => { fetchStub = fn; },
    };
}

test('R1: Robo reconhece danoDiretoJogador (Cobrança Final) mesmo quando jogada.alvo não é JOGADOR', () => {
    const e = mesa({
        eu: { ativo: { id: 'tiago-cassio', aura: 6 } },
        ele: { ativo: { id: 'enzo-games', escudo: { valor: 100 * R.ESCALA, ate: 10 } }, vida: 6000 },
    });
    const j = Robo.escolherJogada(e, e.vez, { nivel: 'normal' });
    assert.equal(j.tipo, 'atacar');
    assert.equal(j.ataque, 1, 'escolheu Cobrança Final por danoDiretoJogador letal');
});

test('R2: batalha.js não lança TypeError no evento imune sem estado (Mariana protegendo Superkid) e registra no log', async () => {
    const { sandbox, raiz } = criarAmbienteBatalha();
    const { EnzoBatalha, EnzoTcgRegras } = sandbox;
    EnzoBatalha.comecar('facil');
    while (EnzoBatalha.estado.fase === 'banimento' || EnzoBatalha.estado.fase === 'preparacao') {
        const est = EnzoBatalha.estado;
        if (est.fase === 'banimento' && est.banimento.feitos[0]) break;
        await EnzoBatalha.jogar(EnzoTcgRegras.jogadasValidas(est, 0)[0]);
    }
    const cur = EnzoBatalha.estado;
    cur.fase = 'jogo';
    cur.vez = 0;
    cur.jogadores[0].ativo = inst(0, { uid: 'sk-1', id: 'superkid', estados: { notificado: true } });
    cur.jogadores[0].banco = [inst(0, { uid: 'mar-1', id: 'mariana' })];
    cur.jogadores[1].ativo = inst(1, { uid: 'cc-1', id: 'cara-de-coracao' });
    cur.jogadores[1].banco = [];

    await assert.doesNotReject(async () => {
        await EnzoBatalha.jogar({ tipo: 'passar' });
    });
    const logs = raiz.querySelector('.bt-log').children.map((li) => li.textContent);
    assert.ok(logs.some((t) => t.includes('imune a Notificado')), `log deveria registrar imunidade: ${logs.join(' | ')}`);
    EnzoBatalha.telaMenu();
});

test('R3: batalha.js não mostra botão "No ativo" para ataque danoDiretoJogador (Cobrança Final)', async () => {
    const { sandbox, raiz } = criarAmbienteBatalha();
    const { EnzoBatalha, EnzoTcgRegras, EnzoTcgRobo } = sandbox;
    EnzoBatalha.comecar('facil');
    while (EnzoBatalha.estado.fase === 'banimento') {
        const est = EnzoBatalha.estado;
        if (est.banimento.feitos[0]) break;
        await EnzoBatalha.jogar(EnzoTcgRegras.jogadasValidas(est, 0)[0]);
    }
    if (EnzoBatalha.estado.fase === 'preparacao') {
        const maoEl = raiz.querySelector('.bt-mao--eu');
        const uidLutador = EnzoBatalha.estado.jogadores[0].mao.find((c) => EnzoTcgRegras.ehLutador(c.id)).uid;
        const cardEl = maoEl.querySelectorAll('.bt-carta').find((el) => el.dataset.uid === uidLutador);
        cardEl.click();
        const btnAtivo = raiz.querySelector('.bt-painel').querySelectorAll('.bt-botao').find((b) => b.textContent.includes('Pôr no ativo'));
        btnAtivo.click();
        raiz.querySelectorAll('.bt-pronto').find((b) => b.textContent === 'Começar!').click();
        for (let i = 0; i < 160 && (EnzoBatalha.ocupado || EnzoBatalha.estado.fase !== 'jogo' || EnzoTcgRobo.quemJoga(EnzoBatalha.estado) !== 0); i++) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }
    const cur = EnzoBatalha.estado;
    cur.fase = 'jogo';
    cur.turno = 3;
    cur.vez = 0;
    cur.pendentes = [];
    cur.jogadores[0].ativo = inst(0, { uid: 'tc-1', id: 'tiago-cassio', aura: 5 });
    cur.jogadores[0].flags.auras = 1;
    cur.jogadores[0].flags.reforco = 0;
    cur.jogadores[0].flags.auraEm = {};
    if (!cur.jogadores[1].ativo) cur.jogadores[1].ativo = inst(1, { uid: 'cc-1', id: 'cara-de-coracao' });
    await EnzoBatalha.jogar({ tipo: 'aura', alvo: 'tc-1' });

    const tcEl = raiz.querySelectorAll('.bt-carta').find((el) => el.dataset.uid === 'tc-1');
    assert.ok(tcEl, 'carta do Tiago Cássio deve estar na tela');
    tcEl.click();

    const boxes = raiz.querySelector('.bt-painel').querySelectorAll('.bt-ataque--box');
    const cobrancaBox = boxes.find((b) => b.textContent.includes('Cobrança Final'));
    assert.ok(cobrancaBox, 'caixa de Cobrança Final deve aparecer no painel');
    const botoes = cobrancaBox.querySelectorAll('.bt-botao').map((b) => b.textContent);
    assert.equal(botoes.some((t) => t === 'No ativo'), false, 'Cobrança Final não deve exibir botão "No ativo"');
    assert.ok(botoes.some((t) => t.startsWith('No jogador')), `Cobrança Final deve exibir botão "No jogador" (botoes=${JSON.stringify(botoes)}, box=${cobrancaBox.textContent}, ocupado=${EnzoBatalha.ocupado}, fase=${cur.fase}, vez=${cur.vez}, aura=${cur.jogadores[0].ativo?.aura})`);
    EnzoBatalha.telaMenu();
});

test('R4: batalha.js registra evento descarte (Hoje é quarta-feira) e remove listener de matchMedia ao sair do chat online', async () => {
    const { sandbox, raiz, mqlListeners, setFetch } = criarAmbienteBatalha();
    const { EnzoBatalha, EnzoTcgRegras } = sandbox;

    // Parte 1: Hoje é quarta-feira emite 'descarte' e o histórico deve registrar.
    EnzoBatalha.comecar('facil');
    const est = EnzoBatalha.estado;
    if (est.fase === 'preparacao') await EnzoBatalha.jogar(EnzoTcgRegras.jogadasValidas(est, 0)[0]);
    const cur = EnzoBatalha.estado;
    cur.fase = 'jogo';
    cur.vez = 0;
    cur.jogadores[0].ativo = inst(0, { uid: 'dv-1', id: 'drone-vigia' });
    cur.jogadores[0].banco = [inst(0, { uid: 'it-1', id: 'italolol' })];
    cur.jogadores[0].mao = [
        inst(0, { uid: 'hq-1', id: 'hoje-e-quarta-feira' }),
        inst(0, { uid: 'bg-1', id: 'bug-do-discord' }),
    ];
    await EnzoBatalha.jogar({ tipo: 'anexar', uid: 'hq-1', alvo: 'it-1', descartes: ['bg-1'] });
    const logs = raiz.querySelector('.bt-log').children.map((li) => li.textContent);
    assert.ok(logs.some((t) => t.includes('descartou') && t.includes('Bug do Discord')), 'deve registrar descarte no histórico');

    // Parte 2: chat online registra e depois remove listener de matchMedia ao encerrar a partida/voltar ao menu.
    const visaoBase = EnzoTcgRegras.visaoDe(mesa(), 0);
    setFetch(async (url) => {
        const u = String(url);
        if (u.includes('/api/tcg/atual')) return new Response(JSON.stringify({ partida: 'p1' }), { status: 200 });
        if (u.includes('/api/tcg/salas')) return new Response(JSON.stringify({ salas: [] }), { status: 200 });
        if (u.includes('/comentarios')) return new Response(JSON.stringify({ ativa: false, comentarios: [] }), { status: 200 });
        if (u.includes('/revanche')) return new Response(JSON.stringify({ expirou: true }), { status: 200 });
        if (u.includes('/partidas/p1')) {
            return new Response(JSON.stringify({
                id: 'p1', versao: 1, eu: 0, jogadores: ['Ana', 'Beto'], agora: Date.now(), prazo: Date.now() + 60000,
                regras: EnzoTcgRegras.REGRAS_VERSAO, visao: visaoBase,
            }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
    });

    EnzoBatalha.telaMenu();
    await new Promise((r) => setTimeout(r, 20));
    const btnOutro = raiz.querySelectorAll('button').find((b) => b.textContent.includes('Outro jogador'));
    assert.ok(btnOutro, 'botão Outro jogador no menu');
    btnOutro.click();
    await new Promise((r) => setTimeout(r, 30));
    const btnVoltar = raiz.querySelectorAll('button').find((b) => b.textContent.includes('Voltar para a partida'));
    assert.ok(btnVoltar, 'botão Voltar para a partida');
    btnVoltar.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(mqlListeners.size, 1, 'montarChat deve registrar 1 listener em matchMedia');
    EnzoBatalha.telaMenu();
    assert.equal(mqlListeners.size, 0, 'sair para o menu deve remover o listener de matchMedia do chat');
});

test('R5: css/batalha.css corrige layout 375px (.bt-mesa padding-top, .bt-rodada, .bt-online-corpo--arte) e batalha.html atualiza ?v=', () => {
    const css = fs.readFileSync(path.join(ROOT, 'css/batalha.css'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'batalha.html'), 'utf8');
    assert.match(css, /\.bt-mesa\s*\{\s*padding-top:\s*46px/);
    assert.match(css, /\.bt-rodada\s*\{\s*left:\s*46px;\s*transform:\s*none;/);
    assert.match(css, /\.bt-online-corpo--arte\s*\{\s*border-width:\s*24px/);
    assert.match(html, /css\/batalha\.css\?v=rev1113a/);
    assert.match(html, /js\/tcg-robo\.js\?v=rev1113a/);
    assert.match(html, /js\/batalha\.js\?v=rev1113a/);
});
