// ============================================================================
// Lista as artes da "Caçada ao Inominável" que existem em assets/ e grava
// js/cacada-artes.js. O jogo só carrega as artes da expansão que estão nessa
// lista (as que ainda não chegaram continuam desenhadas por código, sem erro
// 404 no console). Rode depois de pôr PNGs novos em assets/:
//   node tools/cacada-artes.js
// (o `npm run build` também roda.)
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PASTAS = ['degustador', 'inimigos', 'chefes', 'efeitos', 'objetos', 'perigos', 'ui', 'npcs', 'areas'];

function listar(dir, base = '') {
    const saida = [];
    if (!fs.existsSync(dir)) return saida;
    for (const nome of fs.readdirSync(dir).sort()) {
        const cheio = path.join(dir, nome);
        const rel = base ? `${base}/${nome}` : nome;
        if (fs.statSync(cheio).isDirectory()) saida.push(...listar(cheio, rel));
        else if (/\.(png|jpg)$/i.test(nome)) saida.push(rel);
    }
    return saida;
}

const arquivos = PASTAS.flatMap((p) => listar(path.join(RAIZ, 'assets', p), p));
const js = `// Gerado por tools/cacada-artes.js: artes da Caçada que existem em assets/.\nwindow.CACADA_ARTES_NOVAS = ${JSON.stringify(arquivos, null, 0).replace(/","/g, '",\n    "').replace('["', '[\n    "').replace(/"\]$/, '",\n]')};\n`;
fs.writeFileSync(path.join(RAIZ, 'js', 'cacada-artes.js'), js);
console.log(`js/cacada-artes.js: ${arquivos.length} artes`);
