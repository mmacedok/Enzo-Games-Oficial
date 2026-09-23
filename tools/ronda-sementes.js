// Robô das regras da Ronda em muitas sementes (mesmo robô de test/ronda-core.test.js).
// Uso: node tools/ronda-sementes.js [sementes=60] [segundos=180]
// Imprime uma linha por semente e um resumo {"ok": N, "<causa>": M}.
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/ronda-core.js');

const { CONFIG, pular, atirar, recarregar, avancar, criarJogo } = R;
const fonte = fs.readFileSync(path.join(__dirname, '../test/ronda-core.test.js'), 'utf8');
const trecho = fonte.slice(fonte.indexOf('function semente'), fonte.indexOf('// ------------------------------------------------------------------ física'));
// eslint-disable-next-line no-new-func
const { semente, robo } = new Function('CONFIG', 'pular', 'atirar', 'recarregar', `${trecho}; return { semente, robo };`)(CONFIG, pular, atirar, recarregar);

const total = Number(process.argv[2]) || 60;
const segundos = Number(process.argv[3]) || 180;
const resumo = {};
for (let s = 1; s <= total; s++) {
    const jogo = criarJogo(semente(s));
    pular(jogo, true); pular(jogo, false);
    for (let i = 0; i < segundos * 60 && jogo.fase !== 'fim'; i++) {
        robo(jogo);
        avancar(jogo, 1 / 60);
    }
    const chave = jogo.fase === 'fim' ? jogo.causa : 'ok';
    resumo[chave] = (resumo[chave] || 0) + 1;
    console.log(`semente ${s}: ${chave} aos ${jogo.tempo.toFixed(1)} s, ${jogo.bonus} de bônus`);
}
console.log(JSON.stringify(resumo));
