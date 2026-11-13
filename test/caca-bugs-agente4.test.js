// ============================================================================
// Testes de regressão dos bugs encontrados e corrigidos pelo Agente 4 (frontend).
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');

function criarDomMinimo(urlStr = 'https://enzogames.test/reader.html?comic=superkid') {
    const u = new URL(urlStr);

    class FakeClassList {
        constructor(el) { this.el = el; this.set = new Set(); }
        add(...cs) { for (const c of cs) if (c) this.set.add(c); }
        remove(...cs) { for (const c of cs) this.set.delete(c); }
        contains(c) { return this.set.has(c); }
        toggle(c, force) {
            const on = force === undefined ? !this.set.has(c) : Boolean(force);
            if (on) this.set.add(c); else this.set.delete(c);
            return on;
        }
        toString() { return [...this.set].join(' '); }
    }

    class FakeStyle {
        constructor() { this._props = new Map(); }
        setProperty(k, v) { this._props.set(k, String(v)); }
        getPropertyValue(k) { return this._props.get(k) || ''; }
    }

    class FakeEvent {
        constructor(type, opts = {}) {
            this.type = type;
            this.key = opts.key || '';
            this.bubbles = opts.bubbles !== undefined ? opts.bubbles : true;
            this.target = opts.target || null;
            this.currentTarget = null;
            this.defaultPrevented = false;
            this._stopped = false;
        }
        preventDefault() { this.defaultPrevented = true; }
        stopPropagation() { this._stopped = true; }
    }

    let activeEl = null;

    class FakeElement {
        constructor(tagName) {
            this.tagName = tagName.toUpperCase();
            this.children = [];
            this.parentNode = null;
            this.attrs = new Map();
            this.classList = new FakeClassList(this);
            this.style = new FakeStyle();
            this.dataset = {};
            this.listeners = new Map();
            this._innerHTML = '';
            this.textContent = '';
            this.hidden = false;
            this.disabled = false;
            this.value = '';
            this.tabIndex = -1;
            this.width = 0;
            this.height = 0;
            this.naturalWidth = 0;
            this.naturalHeight = 0;
            this.clientWidth = 1200;
            this.clientHeight = 800;
            this._rect = { left: 0, top: 0, width: 100, height: 140, right: 100, bottom: 140 };
        }
        get className() { return this.classList.toString(); }
        set className(v) {
            this.classList.set = new Set(String(v || '').split(/\s+/).filter(Boolean));
        }
        get id() { return this.attrs.get('id') || ''; }
        set id(v) { this.attrs.set('id', String(v)); }
        get firstElementChild() { return this.children[0] || null; }
        get innerHTML() { return this._innerHTML; }
        set innerHTML(v) {
            this._innerHTML = String(v);
            if (!v) this.children = [];
        }
        setAttribute(k, v) {
            const val = String(v);
            this.attrs.set(k, val);
            if (k === 'class') this.className = val;
            if (k.startsWith('data-')) {
                const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                this.dataset[camel] = val;
            }
        }
        getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
        removeAttribute(k) { this.attrs.delete(k); }
        appendChild(child) {
            if (child && typeof child === 'object') {
                child.parentNode = this;
                this.children.push(child);
            }
            return child;
        }
        append(...nodes) { for (const n of nodes) if (n && typeof n === 'object') this.appendChild(n); }
        remove() {
            if (!this.parentNode) return;
            const i = this.parentNode.children.indexOf(this);
            if (i !== -1) this.parentNode.children.splice(i, 1);
            this.parentNode = null;
        }
        replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
        cloneNode(deep) {
            const copy = new FakeElement(this.tagName);
            copy.className = this.className;
            copy.textContent = this.textContent;
            for (const [k, v] of this.attrs) copy.attrs.set(k, v);
            copy.dataset = { ...this.dataset };
            if (deep) for (const ch of this.children) copy.appendChild(ch.cloneNode(true));
            return copy;
        }
        addEventListener(type, fn, opts) {
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push({ fn, once: Boolean(opts && opts.once) });
        }
        removeEventListener(type, fn) {
            const arr = this.listeners.get(type);
            if (!arr) return;
            const i = arr.findIndex((x) => x.fn === fn);
            if (i !== -1) arr.splice(i, 1);
        }
        dispatchEvent(ev) {
            if (!ev.target) ev.target = this;
            let cur = this;
            while (cur) {
                ev.currentTarget = cur;
                const list = (cur.listeners.get(ev.type) || []).slice();
                for (const item of list) {
                    if (item.once) {
                        const arr = cur.listeners.get(ev.type);
                        const idx = arr.indexOf(item);
                        if (idx !== -1) arr.splice(idx, 1);
                    }
                    item.fn.call(cur, ev);
                }
                if (!ev.bubbles || ev._stopped) break;
                cur = cur.parentNode;
            }
            return !ev.defaultPrevented;
        }
        focus() { activeEl = this; }
        click() { this.dispatchEvent(new FakeEvent('click', { target: this })); }
        scrollIntoView() {}
        scrollTo() {}
        getBoundingClientRect() { return this._rect; }
        contains(other) {
            let cur = other;
            while (cur) { if (cur === this) return true; cur = cur.parentNode; }
            return false;
        }
        matches(sel) {
            for (const part of sel.split(',').map((s) => s.trim()).filter(Boolean)) {
                if (part.startsWith('.')) { if (this.classList.contains(part.slice(1))) return true; }
                else if (part.startsWith('#')) { if (this.id === part.slice(1)) return true; }
                else if (part.startsWith('[') && part.endsWith(']')) {
                    const attr = part.slice(1, -1);
                    if (this.attrs.has(attr)) return true;
                } else if (this.tagName === part.toUpperCase()) return true;
            }
            return false;
        }
        closest(sel) {
            let cur = this;
            while (cur && cur instanceof FakeElement) {
                if (cur.matches(sel)) return cur;
                cur = cur.parentNode;
            }
            return null;
        }
        querySelectorAll(sel) {
            const out = [];
            const walk = (node) => {
                for (const ch of node.children) {
                    if (ch.matches(sel)) out.push(ch);
                    walk(ch);
                }
            };
            walk(this);
            return out;
        }
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
        animate() {
            return { finished: Promise.resolve(), cancel() {} };
        }
    }

    const byId = new Map();
    const doc = {
        baseURI: u.origin + '/',
        readyState: 'complete',
        title: '',
        body: new FakeElement('body'),
        head: new FakeElement('head'),
        documentElement: new FakeElement('html'),
        listeners: new Map(),
        get activeElement() { return activeEl; },
        createElement(tag) { return new FakeElement(tag); },
        createElementNS(_ns, tag) { return new FakeElement(tag); },
        getElementById(id) { return byId.get(id) || null; },
        querySelector(sel) {
            if (sel === 'body.enzo-page [data-midia]') {
                return this.body.classList.contains('enzo-page') ? this.body.querySelector('[data-midia]') : null;
            }
            return this.body.querySelector(sel) || this.documentElement.querySelector(sel);
        },
        querySelectorAll(sel) { return this.body.querySelectorAll(sel); },
        addEventListener(type, fn) {
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push(fn);
        },
        removeEventListener() {},
        dispatchEvent(ev) {
            for (const fn of this.listeners.get(ev.type) || []) fn(ev);
        },
        registerId(id, tag = 'div') {
            const el = new FakeElement(tag);
            el.id = id;
            byId.set(id, el);
            doc.body.appendChild(el);
            return el;
        },
    };

    const storage = new Map();
    const localStorage = {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
    };
    const sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

    const winListeners = new Map();
    const windowObj = {
        console,
        Element: FakeElement,
        location: { href: u.href, search: u.search, pathname: u.pathname },
        document: doc,
        localStorage,
        sessionStorage,
        history: {
            replaceState: (_s, _t, newUrl) => { windowObj.location.href = String(newUrl); windowObj.location.search = new URL(String(newUrl)).search; },
            pushState: (_s, _t, newUrl) => { windowObj.location.href = String(newUrl); windowObj.location.search = new URL(String(newUrl)).search; },
        },
        addEventListener: (type, fn) => {
            if (!winListeners.has(type)) winListeners.set(type, []);
            winListeners.get(type).push(fn);
        },
        removeEventListener: () => {},
        dispatchWindowEvent: (ev) => {
            for (const fn of winListeners.get(ev.type) || []) fn(ev);
        },
        getComputedStyle: () => ({ paddingTop: '0px', paddingBottom: '0px' }),
        matchMedia: () => ({ matches: false }),
        innerWidth: 1200,
        innerHeight: 800,
        requestAnimationFrame: (fn) => fn(0),
        setTimeout,
        clearTimeout,
        URL,
        URLSearchParams,
        Event: FakeEvent,
        CustomEvent: FakeEvent,
        Image: class FakeImage extends FakeElement { constructor() { super('img'); } },
        Audio: class FakeAudio extends FakeElement { constructor() { super('audio'); this.volume = 1; this.duration = NaN; this.currentTime = 0; this.src = ''; } },
    };
    windowObj.window = windowObj;
    windowObj.globalThis = windowObj;
    return { windowObj, doc, localStorage, storage, FakeElement, FakeEvent };
}

test('reader.core.js: não reaproveita currentChapterId de outro gibi, delega setas do painel e cria ampliar após load', async () => {
    const env = criarDomMinimo('https://enzogames.test/reader.html?comic=superkid');
    const { windowObj, doc, localStorage, FakeEvent } = env;

    localStorage.setItem('currentComicId', 'degustador');
    localStorage.setItem('currentChapterId', 'cap-2');

    const recordatorio = doc.createElement('label');
    recordatorio.className = 'reader-chapter-info tira-recordatorio';
    const select = doc.registerId('chapter-select', 'select');
    recordatorio.appendChild(select);
    doc.body.appendChild(recordatorio);
    doc.registerId('reader-viewport', 'main');
    doc.registerId('image-container', 'div');
    doc.registerId('zoom-in-btn', 'button');
    doc.registerId('zoom-out-btn', 'button');
    doc.registerId('zoom-reset-btn', 'button');
    doc.registerId('zoom-level-text', 'span');
    doc.registerId('fullscreen-btn', 'button');
    doc.registerId('back-btn', 'button');

    const origCreateR = doc.createElement.bind(doc);
    doc.createElement = (tag) => {
        const el = origCreateR(tag);
        const origSet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'innerHTML').set;
        Object.defineProperty(el, 'innerHTML', {
            set(v) {
                origSet.call(this, v);
                if (String(v).includes('reader-title')) {
                    const rt = origCreateR('span');
                    rt.className = 'reader-title';
                    this.appendChild(rt);
                }
            },
        });
        return el;
    };

    windowObj.applySiteImage = (img, url) => { img.src = url; }; // sem SiteImages: width/height continuam 0
    windowObj.carregarCatalogo = async () => ({
        comics: [
            { id: 'degustador', title: 'Degustador', chapters: [{ id: 'cap-1', title: '1', pages: ['a.png'] }, { id: 'cap-2', title: '2', pages: ['b.png'] }] },
            { id: 'superkid', title: 'SuperKid', chapters: [{ id: 'sk-1', title: 'Um', pages: ['p1.png'] }, { id: 'cap-2', title: 'Dois', pages: ['p2.png'] }] },
        ],
    });

    const code = fs.readFileSync(path.join(RAIZ, 'js/reader.core.js'), 'utf8');
    vm.runInNewContext(code, windowObj);
    await new Promise((r) => setImmediate(r));

    // 1) Abriu sk-1 (primeiro capítulo de superkid), ignorando currentChapterId='cap-2' que era de degustador
    assert.equal(localStorage.getItem('currentComicId'), 'superkid');
    assert.equal(localStorage.getItem('currentChapterId'), 'sk-1');

    // 2) Painel foi criado depois de setupEventListeners(): setas ArrowDown/ArrowUp devem mover foco
    const itens = recordatorio.querySelectorAll('.capitulos-item');
    assert.equal(itens.length, 4);
    itens[0].focus();
    itens[0].dispatchEvent(new FakeEvent('keydown', { key: 'ArrowDown', target: itens[0] }));
    assert.equal(doc.activeElement, itens[1], 'ArrowDown deve focar o segundo capítulo do painel');
    itens[1].dispatchEvent(new FakeEvent('keydown', { key: 'ArrowUp', target: itens[1] }));
    assert.equal(doc.activeElement, itens[0], 'ArrowUp deve voltar o foco ao primeiro capítulo');

    // 3) Página sem dimensões no catálogo ganha botão "Ampliar" ao disparar load com naturalWidth > naturalHeight
    const wrappers = doc.getElementById('image-container').querySelectorAll('.page-wrapper');
    assert.equal(wrappers.length, 1);
    assert.equal(wrappers[0].querySelector('.page-expand-btn'), null);
    const img = wrappers[0].querySelector('img');
    img.naturalWidth = 1600;
    img.naturalHeight = 900;
    img.dispatchEvent(new FakeEvent('load', { target: img, bubbles: false }));
    assert.ok(wrappers[0].querySelector('.page-expand-btn'), 'botão Ampliar deve aparecer após load de imagem deitada');
});

test('comic-open.js: resolve caminho relativo de --cover contra document.baseURI', () => {
    const env = criarDomMinimo('https://enzogames.test/degustador.html');
    const { windowObj, doc } = env;
    const code = fs.readFileSync(path.join(RAIZ, 'js/comic-open.js'), 'utf8');
    vm.runInNewContext(code, windowObj);

    const card = doc.createElement('div');
    const img = doc.createElement('img');
    img.src = 'assets/capa-relativa.png';
    card.appendChild(img);
    doc.body.appendChild(card);

    const promise = windowObj.EnzoOpen.fly({
        source: card,
        coverSrc: 'assets/capa-relativa.png',
        title: 'Teste',
    });
    assert.ok(typeof promise?.then === 'function');

    const book = doc.querySelector('.comic-fly-book');
    assert.ok(book);
    assert.equal(book.style.getPropertyValue('--cover'), 'url("https://enzogames.test/assets/capa-relativa.png")');
    // Encerra a inspeção para limpar listeners
    doc.querySelector('.comic-fly-close')?.click();
});

test('midia.js: evita seek com duração da faixa anterior e ignora resize com cinema oculto', async () => {
    const env = criarDomMinimo('https://enzogames.test/index.html');
    const { windowObj, doc, FakeEvent } = env;

    const audio = {
        src: 'https://enzogames.test/assets/audio/faixa-a.mp3',
        duration: 180,
        currentTime: 10,
        volume: 0.8,
        listeners: new Map(),
        addEventListener(type, fn, opts) {
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push({ fn, once: Boolean(opts && opts.once) });
        },
        dispatchEvent(ev) {
            const list = (this.listeners.get(ev.type) || []).slice();
            for (const item of list) {
                if (item.once) {
                    const arr = this.listeners.get(ev.type);
                    const idx = arr.indexOf(item);
                    if (idx !== -1) arr.splice(idx, 1);
                }
                item.fn.call(this, ev);
            }
        },
    };
    const catalogoMusicas = {
        gibi: {
            faixas: [
                { id: 'a', titulo: 'Faixa A', capa: 'assets/a.png', completa: 'assets/audio/faixa-a.mp3' },
                { id: 'b', titulo: 'Faixa B', capa: 'assets/b.png', completa: 'assets/audio/faixa-b.mp3' },
            ],
        },
    };
    windowObj.EnzoMusicas = {
        audio,
        carregar: async () => catalogoMusicas,
        alternar(src) {
            audio.src = 'https://enzogames.test/' + src;
            audio.duration = 180; // simula duração antiga ainda presente sincronamente antes dos novos metadados
        },
    };
    windowObj.fetch = async () => ({
        ok: true,
        json: async () => [{ id: 'v1', titulo: 'V1', arquivo: 'assets/v1.mp4', capa: 'assets/v1.png' }],
    });

    doc.body.classList.add('enzo-page');
    const secao = doc.createElement('section');
    secao.setAttribute('data-midia', '');
    const blocoVinis = doc.createElement('div');
    blocoVinis.className = 'midia-bloco';
    const vinis = doc.createElement('div'); vinis.setAttribute('data-midia-vinis', '');
    blocoVinis.appendChild(vinis);
    const cinemaEl = doc.createElement('div'); cinemaEl.setAttribute('data-midia-cinema', '');
    cinemaEl._rect = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }; // oculto
    const tela = doc.createElement('div'); tela.setAttribute('data-midia-tela', '');
    tela._rect = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
    const video = doc.createElement('video');
    video.pause = () => {};
    video.play = async () => {};
    video.load = () => {};
    const espera = doc.createElement('div'); espera.setAttribute('data-midia-espera', '');
    tela.append(video, espera);
    const feixe = doc.createElement('svg'); feixe.setAttribute('data-midia-feixe', '');
    feixe.setAttribute('viewBox', '0 0 800 400');
    const poly = doc.createElement('polygon');
    const grad = doc.createElement('linearGradient');
    feixe.append(poly, grad);
    const fitas = doc.createElement('div'); fitas.setAttribute('data-midia-fitas', '');
    cinemaEl.append(tela, feixe);
    secao.append(blocoVinis, cinemaEl, fitas);
    doc.body.appendChild(secao);

    const code = fs.readFileSync(path.join(RAIZ, 'js/midia.js'), 'utf8');
    vm.runInNewContext(code, windowObj);
    await new Promise((r) => setImmediate(r));

    const barras = vinis.querySelectorAll('.vinil-barra');
    assert.equal(barras.length, 2);

    // Arrastar a barra da Faixa B enquanto Faixa A tocava não pode aplicar duration antiga (180s)
    barras[1].value = '500';
    barras[1].dispatchEvent(new FakeEvent('input', { target: barras[1] }));
    assert.equal(audio.currentTime, 10, 'não deve fazer seek síncrono com duration da faixa anterior');

    // Quando metadados da Faixa B carregam (duration=100), o seek ocorre corretamente para 50s
    audio.duration = 100;
    audio.dispatchEvent(new FakeEvent('loadedmetadata', { target: audio, bubbles: false }));
    assert.equal(audio.currentTime, 50);

    // Seleciona uma fita e dispara resize com cinema oculto (0x0): viewBox não pode virar "0 0 0 0"
    const fitaBtn = fitas.querySelector('button');
    assert.ok(fitaBtn);
    fitaBtn.click();
    windowObj.dispatchWindowEvent(new FakeEvent('resize'));
    assert.equal(feixe.getAttribute('viewBox'), '0 0 800 400');
});

test('os-equipe.js e os-gibis.js: capítulo ou gibi sem cover não requisita /undefined', async () => {
    // Testa os-gibis.js
    const envGibis = criarDomMinimo('https://enzogames.test/admin.html');
    const { windowObj: wG, doc: dG } = envGibis;
    const palcoG = dG.createElement('div');
    wG.EnzoOS = {
        util: {
            el: (t, c, text) => {
                const e = dG.createElement(t);
                if (c) e.className = c;
                if (typeof text === 'string') e.textContent = text;
                else if (Array.isArray(text)) e.append(...text);
                return e;
            },
            botao: (t, fn, c) => {
                const b = dG.createElement('button');
                b.textContent = t;
                if (c) b.className = c;
                b.addEventListener('click', fn);
                return b;
            },
            api: async () => ({ configurado: true }),
        },
    };
    wG.fetch = async (url) => ({
        ok: true,
        json: async () => (String(url).includes('database.json')
            ? { comics: [{ id: 'sem-capa', title: 'Sem Capa', chapters: [{ id: '1', pages: [] }] }] }
            : {}),
    });
    vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'js/os-gibis.js'), 'utf8'), wG);
    await wG.OsGibis.gibis(palcoG);
    const capaDiv = palcoG.querySelector('.gibi-capa');
    assert.ok(capaDiv);
    assert.equal(capaDiv.style.getPropertyValue('backgroundImage') || capaDiv.style.backgroundImage || '', '');

    // Testa os-equipe.js (app lancamentos)
    const envEq = criarDomMinimo('https://enzogames.test/admin.html');
    const { windowObj: wE, doc: dE } = envEq;
    const palcoE = dE.createElement('div');
    wE.Lancamentos = {
        indexar: () => ({}),
        situacao: () => ({ estado: 'no-ar', em: null }),
        formatar: () => '',
    };
    wE.EnzoOS = {
        eu: () => ({ mod: false }),
        util: {
            el: (t, c, text) => {
                const e = dE.createElement(t);
                if (c) e.className = c;
                if (typeof text === 'string') e.textContent = text;
                else if (Array.isArray(text)) e.append(...text);
                return e;
            },
            botao: (t, fn, c) => {
                const b = dE.createElement('button');
                b.textContent = t;
                if (c) b.className = c;
                b.addEventListener('click', fn);
                return b;
            },
            api: async () => ({ avisos: [], capitulos: [], acessos: [] }),
            n: (x) => String(x),
        },
    };
    wE.fetch = async () => ({
        ok: true,
        json: async () => ({ comics: [{ id: 'sem-capa', title: 'Sem Capa', chapters: [{ id: '1', pages: [] }] }] }),
    });
    vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'js/os-equipe.js'), 'utf8'), wE);
    await wE.OsEquipe.lancamentos(palcoE);
    const img = palcoE.querySelector('.lanc-capa');
    assert.ok(img);
    assert.equal(img.src, undefined, 'img sem cover não deve receber src="undefined"');
});

test('characters.js: animação rejeitada em voar não trava o estado voando da galeria', async () => {
    const env = criarDomMinimo('https://enzogames.test/personagens.html');
    const { windowObj, doc } = env;

    const trilho = doc.createElement('div');
    trilho.setAttribute('data-galeria', '');
    trilho.scrollBy = () => {};
    trilho.scrollLeft = 0;
    trilho.clientWidth = 300;
    trilho.scrollWidth = 900;
    const esq = doc.createElement('button'); esq.className = 'galeria-seta--esq';
    const dir = doc.createElement('button'); dir.className = 'galeria-seta--dir';
    doc.body.append(trilho, esq, dir);
    windowObj.applySiteImage = (img, src) => { img.src = src; };

    const origCreate = doc.createElement.bind(doc);
    doc.createElement = (tag) => {
        const el = origCreate(tag);
        const origInnerSet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'innerHTML').set;
        Object.defineProperty(el, 'innerHTML', {
            set(v) {
                origInnerSet.call(this, v);
                if (String(v).includes('estatua-moldura')) {
                    const m = origCreate('span'); m.className = 'estatua-moldura';
                    const im = origCreate('img'); m.appendChild(im);
                    const p = origCreate('span'); p.className = 'estatua-placa';
                    this.append(m, p);
                } else if (String(v).includes('galeria-fechar')) {
                    const b = origCreate('button'); b.className = 'galeria-fechar';
                    const al = origCreate('div'); al.className = 'galeria-alvo';
                    const nm = origCreate('h2'); nm.className = 'galeria-nome';
                    const tx = origCreate('p'); tx.className = 'galeria-texto';
                    const fc = origCreate('a'); fc.className = 'galeria-ficha';
                    fc.appendChild(origCreate('img'));
                    this.append(b, al, nm, tx, fc);
                }
            },
        });
        el.animate = () => ({ finished: Promise.reject(new Error('animacao cancelada')) });
        return el;
    };

    vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'js/characters.js'), 'utf8'), windowObj);

    const card = trilho.querySelector('.estatua');
    assert.ok(card);
    card.click();
    await new Promise((r) => setImmediate(r));

    const fecharBtn = doc.querySelector('.galeria-fechar');
    assert.ok(fecharBtn);
    fecharBtn.click();
    await new Promise((r) => setImmediate(r));

    const palco = doc.querySelector('.galeria-palco');
    assert.equal(palco.hidden, true, 'palco deve fechar mesmo se a animação de abertura/fechamento falhar');
});

test('css/style.css: controles v2 da Caçada cabem dentro dos 343px úteis de um celular 375px em retrato', () => {
    const css = fs.readFileSync(path.join(RAIZ, 'css/style.css'), 'utf8');
    const bloco560 = css.slice(css.indexOf('@media (max-width: 560px)'), css.indexOf('/* Estante no tema do Degustador'));
    assert.match(bloco560, /\.cacada-acoes\s*\{[^}]*minmax\(0,\s*1fr\)[^}]*\}/);
    assert.match(bloco560, /\.cacada-acoes\s+\.cacada-botao--menor\s*\{[^}]*min-width:\s*0\b/);
    const mAnalog = bloco560.match(/\.cacada-analogico\s*\{[^}]*width:\s*(\d+)px/);
    assert.ok(mAnalog, 'deve reduzir .cacada-analogico em retrato estreito');
    assert.ok(Number(mAnalog[1]) <= 140, `largura ${mAnalog[1]}px deixaria pouco espaço para as 3 colunas de ação em 343px`);
});
