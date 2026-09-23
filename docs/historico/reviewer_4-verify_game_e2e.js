const fs = require('fs');
const path = require('path');

const mockEventListeners = { window: {}, canvas: {} };
const elementRegistry = {};

function getOrCreateElement(id) {
    if (!elementRegistry[id]) {
        elementRegistry[id] = createCanvasElement(id);
    }
    return elementRegistry[id];
}

function createCanvasElement(id) {
    return {
        id: id,
        style: {},
        textContent: '',
        width: id === 'enzorun-canvas' ? 800 : 0,
        height: id === 'enzorun-canvas' ? 300 : 0,
        getContext(type) {
            return {
                clearRect() {},
                fillRect() {},
                beginPath() {},
                moveTo() {},
                lineTo() {},
                stroke() {},
                drawImage() {},
                fillText() {},
                getImageData(x, y, w, h) {
                    return { data: new Uint8ClampedArray(w * h * 4) };
                },
                putImageData() {}
            };
        },
        addEventListener(event, callback) {
            if (!mockEventListeners.canvas[event]) mockEventListeners.canvas[event] = [];
            mockEventListeners.canvas[event].push(callback);
        },
        dispatchEvent(event) {
            const type = event.type;
            if (mockEventListeners.canvas[type]) {
                mockEventListeners.canvas[type].forEach(cb => cb(event));
            }
        },
        querySelector(sel) {
            if (sel.startsWith('#')) {
                return getOrCreateElement(sel.slice(1));
            }
            if (sel.startsWith('.')) {
                return getOrCreateElement(sel.slice(1));
            }
            return null;
        },
        appendChild(child) {
            if (id === 'test-list') {
                console.log("REPORT LIST ITEM:", child.innerHTML);
            }
        },
        contains(child) {
            return true;
        }
    };
}

global.window = {
    location: {
        search: '?test=true'
    },
    addEventListener(event, callback) {
        if (!mockEventListeners.window[event]) mockEventListeners.window[event] = [];
        mockEventListeners.window[event].push(callback);
    },
    dispatchEvent(event) {
        const type = event.type;
        if (mockEventListeners.window[type]) {
            mockEventListeners.window[type].forEach(cb => cb(event));
        }
    },
    localStorage: {
        getItem(key) { return '0'; },
        setItem(key, val) {}
    },
    requestAnimationFrame(cb) {
        return setTimeout(cb, 16);
    },
    cancelAnimationFrame(id) {
        clearTimeout(id);
    }
};

global.localStorage = global.window.localStorage;
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.cancelAnimationFrame = global.window.cancelAnimationFrame;

global.document = {
    head: {
        appendChild(el) {}
    },
    body: {
        appendChild(el) {
            if (el.id === 'test-report') {
                global.testReport = el;
            }
        }
    },
    createElement(tag) {
        if (tag === 'canvas') {
            return createCanvasElement('temp-canvas');
        }
        let currentId = '';
        const el = {
            get id() {
                return currentId;
            },
            set id(val) {
                currentId = val;
                elementRegistry[val] = this;
            },
            style: {},
            innerHTML: '',
            querySelector(sel) {
                if (sel === '#enzorun-canvas') {
                    return getOrCreateElement('enzorun-canvas');
                }
                if (sel.startsWith('#')) {
                    return getOrCreateElement(sel.slice(1));
                }
                if (sel.startsWith('.')) {
                    return getOrCreateElement(sel.slice(1));
                }
                return null;
            },
            addEventListener() {},
            appendChild() {}
        };
        return el;
    },
    getElementById(id) {
        if (id === 'hero-comic') {
            return {
                contains() { return true; },
                appendChild() {},
                querySelector(sel) {
                    if (sel === '.hero-banner') return getOrCreateElement('hero-banner');
                    return null;
                }
            };
        }
        if (id === 'test-list') {
            return {
                appendChild(child) {
                    console.log("REPORT:", child.innerHTML.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' '));
                }
            };
        }
        if (id === 'test-summary') {
            return {
                style: {},
                set textContent(val) {
                    console.log("SUMMARY:", val);
                }
            };
        }
        return getOrCreateElement(id);
    },
    querySelector(sel) {
        if (sel === '.garfield-classic-logo') {
            return {
                click() {
                    global.window.enzoRunGame.start();
                },
                addEventListener() {}
            };
        }
        if (sel.startsWith('#')) {
            return getOrCreateElement(sel.slice(1));
        }
        if (sel.startsWith('.')) {
            return getOrCreateElement(sel.slice(1));
        }
        return null;
    }
};

global.Image = function() {
    this.width = 100;
    this.height = 100;
    setTimeout(() => {
        if (this.onload) this.onload();
    }, 10);
};

global.KeyboardEvent = class {
    constructor(type, init) {
        this.type = type;
        this.code = init.code;
    }
    preventDefault() {}
};

global.MouseEvent = class {
    constructor(type) {
        this.type = type;
    }
    preventDefault() {}
};

const gameCode = fs.readFileSync(path.join(__dirname, '../../js/game.js'), 'utf8');
eval(gameCode);

const testCode = fs.readFileSync(path.join(__dirname, '../../js/game.test.js'), 'utf8');
eval(testCode);

setTimeout(() => {
    const loadEvent = mockEventListeners.window['load'];
    if (loadEvent) {
        loadEvent.forEach(cb => cb());
    }
}, 50);
