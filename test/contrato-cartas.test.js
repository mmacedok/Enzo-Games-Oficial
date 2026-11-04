// ============================================================================
// CONTRATO DAS CARTAS E DAS TEMPORADAS. Este teste existe para barrar, antes do push, os erros que
// já aconteceram: arte que não existe no repositório, efeito escrito nos dados sem código que o execute,
// jogada aceita pelo motor sem botão na tela, id de arte inventado, carta de temporada fora do lugar.
//
// Mexeu em carta, efeito, pacote, deck ou temporada? Rode:  node --test test/contrato-cartas.test.js
// Se ele falhar, a mensagem diz o que consertar. NÃO apague nem afrouxe um teste para ele passar:
// conserte o dado ou o código. Guia completo: docs/GUIA-IA-CARTAS.md.
// ============================================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const B = require('../js/baralho-dados.js');
const T = require('../js/tcg-cartas.js');
const R = require('../js/tcg-regras.js');
const ler = (arquivo) => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
const existe = (arquivo) => fs.existsSync(path.join(RAIZ, arquivo));

test('cada carta tem número único e seguido, raridade válida, texto e arte que existe', () => {
    const ids = new Set();
    const numeros = B.TODAS_AS_CARTAS.map((c) => c.numero).sort((a, b) => a - b);
    numeros.forEach((n, i) => assert.equal(n, i + 1, `os números das cartas precisam ser 1, 2, 3... sem buraco nem repetição (achei ${n} no lugar de ${i + 1})`));
    for (const c of B.TODAS_AS_CARTAS) {
        assert.ok(!ids.has(c.id), `id repetido: ${c.id} (id nunca se reaproveita: as coleções salvas guardam ele)`);
        ids.add(c.id);
        assert.match(c.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${c.id}: id em minúsculas, números e hífen`);
        assert.ok(B.raridade(c.raridade), `${c.id}: raridade "${c.raridade}" não existe`);
        assert.ok(c.nome && c.frase && c.tcg, `${c.id}: falta nome, frase ou texto tcg`);
        assert.ok(c.arte && existe(c.arte), `${c.id}: a arte "${c.arte}" não está no repositório. Coloque o PNG nessa pasta antes de subir`);
    }
});

test('toda carta do baralho tem número de combate em js/tcg-cartas.js, do tipo certo', () => {
    for (const c of B.TODAS_AS_CARTAS) {
        const cb = T.COMBATE[c.id];
        assert.ok(cb, `${c.id}: falta a entrada em COMBATE (js/tcg-cartas.js)`);
        assert.ok(R.modoDe(c.id), `${c.id}: o tipo "${c.tipo}" não tem modo em TIPOS (js/tcg-regras.js)`);
        if (R.ehLutador(c.id)) assert.ok(cb.hp > 0 && Array.isArray(cb.ataques), `${c.id}: lutador precisa de hp e ataques`);
        if (R.modoDe(c.id) === 'anexo') assert.ok(cb.anexo, `${c.id}: carta de resenha precisa de "anexo"`);
        if (R.modoDe(c.id) === 'campo') assert.ok(cb.campo, `${c.id}: carta de campo precisa de "campo"`);
    }
    for (const id of Object.keys(T.COMBATE)) assert.ok(B.carta(id), `COMBATE tem "${id}", que não existe em js/baralho-dados.js`);
});

/** Tudo o que tem `tipo` dentro de efeitos/aoEntrar/efeitosAtaque dos dados de combate. */
function efeitosUsados() {
    const achados = [];
    const andar = (valor, onde, dentroDeEfeitos) => {
        if (Array.isArray(valor)) return valor.forEach((v) => andar(v, onde, dentroDeEfeitos));
        if (!valor || typeof valor !== 'object') return;
        if (dentroDeEfeitos && typeof valor.tipo === 'string') achados.push({ onde, tipo: valor.tipo });
        for (const [k, v] of Object.entries(valor)) andar(v, onde, ['efeitos', 'aoEntrar', 'efeitosAtaque'].includes(k));
    };
    for (const [id, cb] of Object.entries(T.COMBATE)) andar(cb, id, false);
    return achados;
}
/** Efeitos que o motor sabe executar: EFEITOS (ao agir) e BONUS_DANO (somam no dano). */
const efeitosDoMotor = () => new Set([...Object.keys(R.EFEITOS), ...Object.keys(R.BONUS_DANO)]);
test('todo efeito escrito nos dados tem código que o executa em EFEITOS', () => {
    const motor = efeitosDoMotor();
    for (const { onde, tipo } of efeitosUsados()) {
        assert.ok(motor.has(tipo), `${onde}: o efeito "${tipo}" está nos dados mas não existe em EFEITOS nem em BONUS_DANO (js/tcg-regras.js). Sem isso a carta não faz nada`);
    }
});

test('todo poder ou campo escrito nos dados é lido pelo motor', () => {
    const src = ler('js/tcg-regras.js');
    for (const [id, cb] of Object.entries(T.COMBATE)) {
        const tipos = [cb.poder?.tipo, cb.campo?.tipo, cb.anexo?.poder?.tipo, ...(cb.ataques || []).map(() => null)].filter(Boolean);
        for (const tipo of tipos) {
            assert.ok(src.includes(`'${tipo}'`), `${id}: o tipo "${tipo}" não aparece em js/tcg-regras.js, então nada o executa`);
        }
    }
});

test('toda jogada que o motor aceita tem botão ou gesto na tela (js/batalha.js)', () => {
    const src = ler('js/tcg-regras.js');
    const inicio = src.indexOf('function motivoInvalida');
    assert.ok(inicio > 0, 'não achei motivoInvalida em js/tcg-regras.js');
    const fim = src.indexOf('\n    function ', inicio + 10);
    const jogadas = [...src.slice(inicio, fim).matchAll(/^            case '([A-Za-z0-9_]+)':/gm)].map((m) => m[1]);
    assert.ok(jogadas.length > 8, 'achei poucas jogadas: o teste precisa ser atualizado junto com o motor');
    const tela = ler('js/batalha.js');
    for (const j of jogadas) {
        assert.ok(new RegExp(`tipo: '${j}'`).test(tela), `a jogada "${j}" existe no motor mas js/batalha.js nunca a envia: o jogador humano não consegue usar. Ponha o botão na tela`);
    }
});

test('artes de aparência (visual.arte) são um id de carta ou um arquivo que existe', () => {
    for (const arquivo of ['js/tcg-regras.js', 'js/tcg-cartas.js']) {
        for (const m of ler(arquivo).matchAll(/visual\s*[:=]\s*\{\s*arte:\s*'([^']+)'/g)) {
            const arte = m[1];
            const ok = arte.includes('/') ? existe(arte) : !!B.carta(arte);
            assert.ok(ok, `${arquivo}: visual.arte "${arte}" não é um id de carta nem um arquivo existente (use o caminho completo, ex.: assets/Cartas/x.png)`);
        }
    }
});

test('pacotes: chances somam 100 e as cartas da capa existem e já saíram junto com o pacote', () => {
    for (const p of B.TODOS_OS_PACOTES) {
        const soma = Object.values(p.chances).reduce((a, b) => a + b, 0);
        assert.equal(soma, 100, `${p.id}: as chances somam ${soma}, precisam somar 100`);
        const tp = B.temporadaDoPacote(p.id);
        for (const id of p.capa || []) {
            assert.ok(B.carta(id), `${p.id}: a capa usa "${id}", que não existe`);
            assert.ok(B.temporadaDaCarta(id).numero <= tp.numero, `${p.id}: a capa mostra "${id}", de uma temporada que sai DEPOIS do pacote`);
        }
    }
});

test('decks prontos: 15 cartas válidas, e só saem junto com (ou depois de) as cartas deles', () => {
    for (const d of T.TODOS_OS_DECKS) {
        assert.equal(d.cartas.length, R.TAMANHO_DECK, `${d.id}: o deck pronto precisa de ${R.TAMANHO_DECK} cartas`);
        assert.deepEqual(R.validarDeck(d.cartas), [], `${d.id}: deck pronto inválido`);
        const tDeck = B.temporadaDoDeck(d.id);
        for (const id of d.cartas) {
            assert.ok(B.temporadaDaCarta(id).numero <= tDeck.numero, `${d.id}: usa "${id}", de uma temporada que sai DEPOIS do deck. Liste o deck na temporada certa (campo decks)`);
        }
    }
});

test('temporadas: ids, estados, datas e versão de regras coerentes', () => {
    const ids = new Set();
    let anterior = -1;
    for (const t of B.TEMPORADAS) {
        assert.ok(!ids.has(t.id), `temporada repetida: ${t.id}`);
        ids.add(t.id);
        assert.ok(t.numero > anterior, `${t.id}: os números das temporadas precisam crescer na ordem da lista`);
        anterior = t.numero;
        assert.ok(['no-ar', 'agendada', 'rascunho'].includes(t.estado), `${t.id}: estado "${t.estado}" inválido`);
        if (t.estado === 'agendada') assert.ok(Number.isFinite(Date.parse(t.lancamento)), `${t.id}: temporada agendada precisa de "lancamento" (data ISO com fuso)`);
        assert.ok(t.regras <= R.REGRAS_VERSAO, `${t.id}: exige regras ${t.regras} mas o motor está na ${R.REGRAS_VERSAO}. Suba REGRAS_VERSAO e escreva no docs/BATALHA-CHANGELOG.md`);
        for (const id of t.cartas) assert.ok(B.carta(id), `${t.id}: lista a carta "${id}", que não existe`);
        for (const id of t.pacotes) assert.ok(B.TODOS_OS_PACOTES.some((p) => p.id === id), `${t.id}: lista o pacote "${id}", que não existe`);
        for (const id of t.decks) assert.ok(T.TODOS_OS_DECKS.some((d) => d.id === id), `${t.id}: lista o deck "${id}", que não existe`);
        for (const item of t.notas.itens) {
            assert.ok(['carta', 'balanceamento', 'regra', 'site'].includes(item.tipo), `${t.id}: item de nota com tipo "${item.tipo}" inválido`);
            if (item.carta) assert.ok(B.carta(item.carta), `${t.id}: a nota fala da carta "${item.carta}", que não existe`);
        }
    }
    assert.equal(B.TEMPORADAS[0].id, 'base', 'a primeira temporada é sempre a "base"');
    assert.deepEqual(B.TEMPORADAS[0].cartas, [], 'a "base" não lista cartas: ela fica com as que nenhuma temporada reivindicou');
    const donas = new Map();
    for (const t of B.TEMPORADAS) for (const id of t.cartas) {
        assert.ok(!donas.has(id), `a carta "${id}" está em duas temporadas (${donas.get(id)} e ${t.id})`);
        donas.set(id, t.id);
    }
});

test('carta de temporada escondida some de tudo e não pode ser usada', () => {
    const escondida = { id: 'sx', estado: 'rascunho' };
    assert.equal(B.temporadaNoAr(escondida, Date.now(), false), false, 'rascunho não pode aparecer');
    assert.equal(B.temporadaNoAr(escondida, Date.now(), true), true, 'modo rascunho deixa ver');
    const agendada = { id: 'sy', estado: 'agendada', lancamento: '2030-01-01T00:00:00-03:00' };
    assert.equal(B.temporadaNoAr(agendada, Date.parse('2029-12-31T23:59:59-03:00'), false), false, 'antes da hora fica escondida');
    assert.equal(B.temporadaNoAr(agendada, Date.parse('2030-01-01T00:00:00-03:00'), false), true, 'na hora marcada sai');
    assert.equal(B.temporadaNoAr({ id: 'sz', estado: 'agendada', lancamento: 'lixo' }, Date.now(), false), false, 'data inválida nunca libera');
    // Enquanto as temporadas estiverem no ar, `CARTAS` (o que sorteio, loja e álbum leem) tem todas as cartas.
    const noAr = B.TODAS_AS_CARTAS.filter((c) => B.temporadaNoAr(B.temporadaDaCarta(c.id)));
    assert.deepEqual(B.CARTAS.map((c) => c.id), noAr.map((c) => c.id));
});
