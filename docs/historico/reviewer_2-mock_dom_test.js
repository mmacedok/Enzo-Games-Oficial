const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = {
    location: {
        search: ''
    },
    addEventListener: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    }
};
global.document = {
    createElement: (tag) => {
        return {
            id: '',
            style: {},
            innerHTML: '',
            appendChild: () => {},
            querySelector: () => null
        };
    },
    head: {
        appendChild: () => {}
    },
    body: {
        appendChild: () => {}
    },
    getElementById: (id) => {
        console.log(`document.getElementById('${id}') called`);
        return null; // This mimics the real DOM where detached elements are not found
    },
    querySelector: (sel) => {
        console.log(`document.querySelector('${sel}') called`);
        return null;
    }
};
global.Image = class {
    constructor() {
        this.onload = null;
        this.src = '';
    }
};

try {
    const gameJsCode = fs.readFileSync(path.join(__dirname, '../../js/game.js'), 'utf8');
    eval(gameJsCode);
} catch (e) {
    console.error('CRASH DETECTED:');
    console.error(e.stack);
}
