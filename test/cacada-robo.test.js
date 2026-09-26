// ============================================================================
// Robô da "Caçada ao Inominável" (tools/cacada-robo.js) jogando o mundo de
// verdade: prova que cada etapa da progressão dá para fazer só com as
// habilidades que o jogador já tem naquele momento.
//
// As travas de parede (tampa, grade, vidro) são rápidas e rodam sempre. As de
// física (sem a habilidade NÃO passa) demoram alguns minutos e só rodam com
//   CACADA_BLOQUEIOS=1 node --test test/cacada-robo.test.js
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/cacada-core.js');
const MUNDO = require('../js/cacada-mundo.js');
const { resolver, resolverDeVarios, temTunel, ETAPAS, BLOQUEIOS } = require('../tools/cacada-robo.js');

const nivel = C.carregarMundo(MUNDO);

for (const etapa of ETAPAS) {
    test(`robô: ${etapa.nome}`, { timeout: 300000 }, () => {
        const r = resolver(MUNDO, etapa.de, etapa.ate, { ...etapa, nivel });
        assert.ok(r.ok, `sem caminho (${r.nos} nós)`);
    });
}

for (const b of BLOQUEIOS.filter((x) => x.tunel)) {
    test(`trava: ${b.nome}`, () => {
        assert.ok(!temTunel(MUNDO, b.de, b.ate, { ...b, nivel }), 'tem um caminho de tiles sem a habilidade');
        const com = { ...b, ...b.com, habilidades: [...b.habilidades, ...(b.com.habilidades || [])], nivel };
        assert.ok(temTunel(MUNDO, b.de, b.ate, com), 'nem com a habilidade abre caminho: a parede não é a trava');
    });
}

for (const b of BLOQUEIOS.filter((x) => !x.tunel)) {
    test(`trava: ${b.nome}`, { timeout: 1800000, skip: process.env.CACADA_BLOQUEIOS ? false : 'demora; rode com CACADA_BLOQUEIOS=1' }, () => {
        const r = resolverDeVarios(MUNDO, b, nivel);
        assert.ok(!r.ok, 'o robô passou sem a habilidade');
        assert.ok(r.esgotou, `a busca não terminou (${r.nos} nós)`);
    });
}
