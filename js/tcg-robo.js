// ============================================================================
// Batalha dos Torados: o adversário do computador (NPC).
//   escolherJogada(estado, jogador, { nivel: 'facil' | 'normal', aleatorio }) -> jogada
// Só escolhe entre as jogadas de EnzoTcgRegras.jogadasValidas, então nunca trapaceia.
// Não usa a sorte do estado (a sorte do robô é `aleatorio`, padrão Math.random).
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./tcg-regras.js'));
    else root.EnzoTcgRobo = factory(root.EnzoTcgRegras);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (R) {
    'use strict';

    const vida = (estado, inst) => R.hpMax(estado, inst) - inst.dano;
    const maiorAtaque = (id) => Math.max(0, ...R.combate(id).ataques.map((a) => a.dano));
    const forca = (id) => R.combate(id).hp + 2 * maiorAtaque(id);
    const acharNaMesa = (jogador, uid) => R.naMesa(jogador).find((c) => c.uid === uid);

    /** Pior dano que o ativo do adversário consegue dar no próximo turno dele (+1 Aura). */
    function ameaca(estado, j) {
        const ele = estado.jogadores[1 - j];
        if (!ele.ativo) return 0;
        const aura = ele.ativo.aura + 1;
        return Math.max(0, ...R.combate(ele.ativo.id).ataques.filter((a) => a.custo <= aura).map((a) => a.dano + 10));
    }

    function danoPrevisto(estado, j, jogada) {
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[1 - j];
        const ataque = R.combate(eu.ativo.id).ataques[jogada.ataque];
        const puxa = (ataque.efeitos || []).some((e) => e.tipo === 'puxar');
        const alvo = ataque.alvo === 'qualquer' ? acharNaMesa(ele, jogada.alvo) : ele.ativo;
        const dano = R.calcularDano(estado, j, ataque, alvo, { resultadoMoeda: true })
            * ((ataque.efeitos || []).some((e) => e.tipo === 'moeda') ? 0.5 : 1);
        return { ataque, alvo, dano, puxa, nocaute: !puxa && dano >= vida(estado, alvo) };
    }

    function notaAtaque(estado, j, jogada) {
        const { ataque, alvo, dano, puxa, nocaute } = danoPrevisto(estado, j, jogada);
        const eu = estado.jogadores[j];
        let nota = dano;
        if (nocaute) nota += 100 + 50 * R.pontosDe(alvo.id);
        for (const ef of ataque.efeitos || []) {
            if (ef.tipo === 'estado' && !alvo.estados[ef.estado]) nota += 15;
            if (ef.tipo === 'danoSi' && vida(estado, eu.ativo) <= ef.valor) nota -= 200;
            if (ef.tipo === 'auraSi') nota += 25;
            if (ef.tipo === 'escudo') nota += ef.valor / 2;
            if (ef.tipo === 'descartarCampo') nota += estado.campo && estado.campo.dono !== j ? 30 : -50;
        }
        if (puxa) {
            const puxado = acharNaMesa(estado.jogadores[1 - j], jogada.alvo);
            // Puxa quem está fraco para derrubar no próximo turno.
            nota += puxado ? 60 - vida(estado, puxado) / 2 : -50;
        }
        return nota;
    }

    function escolherNormal(estado, j, validas) {
        const eu = estado.jogadores[j];
        const por = (tipo) => validas.filter((v) => v.tipo === tipo);

        if (estado.fase === 'preparacao') {
            const lutadores = eu.mao.filter((c) => R.ehLutador(c.id)).sort((a, b) => forca(b.id) - forca(a.id));
            return { tipo: 'preparar', jogador: j, ativo: lutadores[0].uid,
                banco: lutadores.slice(1, 1 + R.VAGAS_BANCO).map((c) => c.uid) };
        }
        if (estado.pendentes.length) {
            return por('novoAtivo').sort((a, b) =>
                vida(estado, acharNaMesa(eu, b.uid)) + maiorAtaque(acharNaMesa(eu, b.uid).id)
                - vida(estado, acharNaMesa(eu, a.uid)) - maiorAtaque(acharNaMesa(eu, a.uid).id))[0];
        }

        const ataques = por('atacar').map((v) => ({ v, nota: notaAtaque(estado, j, v) })).sort((a, b) => b.nota - a.nota);
        if (ataques.length && danoPrevisto(estado, j, ataques[0].v).nocaute) return ataques[0].v;

        // Poderes primeiro (comprar carta pode trazer mais opções).
        if (por('poder').length) return por('poder')[0];

        // Ativo vai cair no próximo turno e tem alguém melhor no banco: recua.
        if (por('recuar').length && eu.ativo && ameaca(estado, j) >= vida(estado, eu.ativo)) {
            const melhor = por('recuar').map((v) => acharNaMesa(eu, v.para))
                .filter((c) => vida(estado, c) > ameaca(estado, j))
                .sort((a, b) => vida(estado, b) - vida(estado, a))[0];
            if (melhor) return { tipo: 'recuar', jogador: j, para: melhor.uid };
        }

        const lutadoresNaMao = por('baixar').sort((a, b) =>
            forca(eu.mao.find((c) => c.uid === b.uid).id) - forca(eu.mao.find((c) => c.uid === a.uid).id));
        if (lutadoresNaMao.length) return lutadoresNaMao[0];

        const campos = por('campo');
        if (campos.length && (!estado.campo || estado.campo.dono !== j)) return campos[0];

        const auras = por('aura');
        if (auras.length && eu.ativo) {
            const custoMax = Math.max(...R.combate(eu.ativo.id).ataques.map((a) => a.custo));
            const noAtivo = auras.find((a) => a.alvo === eu.ativo.uid);
            if (noAtivo && eu.ativo.aura < custoMax) return noAtivo;
            const reserva = auras.filter((a) => a.alvo !== eu.ativo.uid)
                .map((a) => acharNaMesa(eu, a.alvo))
                .sort((a, b) => forca(b.id) - forca(a.id))[0];
            return reserva ? { tipo: 'aura', jogador: j, alvo: reserva.uid } : (noAtivo || auras[0]);
        }

        const troca = por('trocarCarta');
        if (troca.length) {
            // Troca um campo repetido ou sem uso.
            const campoInutil = troca.find((t) => {
                const c = eu.mao.find((x) => x.uid === t.uid);
                return R.ehCampo(c.id) && (eu.flags.campo || estado.campo?.carta.id === c.id);
            });
            if (campoInutil) return campoInutil;
        }

        if (ataques.length && ataques[0].nota > 0) return ataques[0].v;
        return por('passar')[0] || validas[0];
    }

    /** Fácil: joga como o normal, mas às vezes faz uma jogada qualquer e ataca sem pensar. */
    function escolherFacil(estado, j, validas, aleatorio) {
        if (aleatorio() < 0.35) {
            const qualquer = validas.filter((v) => v.tipo !== 'passar');
            if (qualquer.length) return qualquer[Math.floor(aleatorio() * qualquer.length)];
        }
        return escolherNormal(estado, j, validas);
    }

    function escolherJogada(estado, j, { nivel = 'normal', aleatorio = Math.random } = {}) {
        const validas = R.jogadasValidas(estado, j);
        if (!validas.length) return null;
        const jogada = nivel === 'facil' ? escolherFacil(estado, j, validas, aleatorio) : escolherNormal(estado, j, validas);
        // Garantia: se a heurística montou algo inválido, cai numa jogada válida.
        if (!R.motivoInvalida(estado, jogada)) return jogada;
        return validas.find((v) => v.tipo === jogada?.tipo) || validas.find((v) => v.tipo === 'passar') || validas[0];
    }

    /** Quem precisa jogar agora (null = ninguém / partida acabou). */
    function quemJoga(estado) {
        if (estado.fase === 'fim') return null;
        if (estado.fase === 'preparacao') return estado.jogadores.findIndex((x) => !x.preparado);
        if (estado.pendentes.length) return estado.pendentes[0].jogador;
        return estado.vez;
    }

    return { escolherJogada, quemJoga };
});
