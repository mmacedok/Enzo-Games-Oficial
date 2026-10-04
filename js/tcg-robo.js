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

    /** Pior dano que o ativo do adversário consegue dar no próximo turno dele (+2 Auras). */
    function ameaca(estado, j) {
        const ele = estado.jogadores[1 - j];
        if (!ele.ativo) return 0;
        const aura = ele.ativo.aura + R.AURAS_MAX_POR_CARTA_NO_TURNO;
        return Math.max(0, ...R.combate(ele.ativo.id).ataques.filter((a) => a.custo <= aura).map((a) => (a.dano + 10) * R.ESCALA));
    }

    function danoPrevisto(estado, j, jogada) {
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[1 - j];
        const ataque = R.combate(eu.ativo.id).ataques[jogada.ataque];
        const puxa = (ataque.efeitos || []).some((e) => e.tipo === 'puxar');
        const noJogador = jogada.alvo === R.JOGADOR;
        const alvo = noJogador ? null : (ataque.alvo === 'qualquer' ? acharNaMesa(ele, jogada.alvo) : ele.ativo);
        const dano = R.calcularDano(estado, j, ataque, noJogador ? R.JOGADOR : alvo, { resultadoMoeda: true })
            * ((ataque.efeitos || []).some((e) => e.tipo === 'moeda') ? 0.5 : 1);
        const nocaute = !noJogador && !puxa && dano >= vida(estado, alvo);
        // letal: acaba com a vida do adversário (no golpe direto ou pela vida que o nocaute tira).
        const letal = noJogador ? dano >= ele.vida : nocaute && R.danoNocaute(alvo.id) >= ele.vida;
        return { ataque, alvo, dano, puxa, nocaute, noJogador, letal };
    }

    function notaAtaque(estado, j, jogada) {
        const { ataque, alvo, dano, puxa, nocaute, noJogador, letal } = danoPrevisto(estado, j, jogada);
        const eu = estado.jogadores[j];
        // Notas na escala pequena de antes (dano / ESCALA), para os bônus abaixo continuarem valendo.
        let nota = dano / R.ESCALA;
        if (letal) nota += 1000;
        if (nocaute) {
            // Derrubar tira do dono a vida da raridade; derrubar de um golpe vira a carta.
            nota += 100 + R.danoNocaute(alvo.id) / R.ESCALA;
            if (alvo.dano === 0) nota -= 20;
        }
        for (const ef of ataque.efeitos || []) {
            if (ef.tipo === 'estado' && alvo && !alvo.estados[ef.estado]) nota += 15;
            if (ef.tipo === 'danoSi' && vida(estado, eu.ativo) <= ef.valor * R.ESCALA) nota -= 200;
            if (ef.tipo === 'auraSi') nota += 25;
            if (ef.tipo === 'escudo') nota += ef.valor / 2;
            if (ef.tipo === 'descartarCampo') nota += estado.campo && estado.campo.dono !== j ? 30 : -50;
        }
        if (puxa) {
            const puxado = acharNaMesa(estado.jogadores[1 - j], jogada.alvo);
            // Puxa quem está fraco para derrubar no próximo turno.
            nota += puxado ? 60 - vida(estado, puxado) / R.ESCALA / 2 : -50;
        }
        // Golpe no jogador é dano que não se cura; na carta, só vale se ajuda a derrubar.
        if (noJogador) nota += 5;
        return nota;
    }

    function escolherNormal(estado, j, validas) {
        const eu = estado.jogadores[j];
        const por = (tipo) => validas.filter((v) => v.tipo === tipo);

        if (estado.fase === 'banimento') {
            // Bane as 2 cartas mais fortes (não lendárias) do deck do adversário (o fácil às vezes escolhe ao acaso, em escolherFacil).
            const deckDele = estado.jogadores[1 - j].deck;
            // campos não têm vida nem ataque: valem pouco para o robô (ele prefere banir lutadores fortes)
            const nota = (uid) => { const id = deckDele.find((c) => c.uid === uid).id; return R.ehLutador(id) ? forca(id) : 40; };
            const opcoes = por('banir');
            return opcoes.map((v) => ({ v, n: v.cartas.reduce((s, u) => s + nota(u), 0) })).sort((a, b) => b.n - a.n)[0].v;
        }
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
        const melhor = ataques.length && danoPrevisto(estado, j, ataques[0].v);
        if (melhor && (melhor.letal || melhor.nocaute)) return ataques[0].v;

        // Poderes primeiro (comprar carta pode trazer mais opções).
        // (o Vem Cá da Encantadora deixa ela virada: só vale a pena com o ativo dele forte e um banco fraco para puxar)
        const poderes = por('poder').filter((v) => !v.alvo);
        if (poderes.length) return poderes[0];
        const puxar = por('poder').filter((v) => v.alvo !== undefined)
            .sort((a, b) => vida(estado, acharNaMesa(estado.jogadores[1 - j], a.alvo)) - vida(estado, acharNaMesa(estado.jogadores[1 - j], b.alvo)))[0];
        if (puxar && estado.jogadores[1 - j].ativo && vida(estado, estado.jogadores[1 - j].ativo) > vida(estado, acharNaMesa(estado.jogadores[1 - j], puxar.alvo)) * 1.5) return puxar;

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
        // Sem a Casa: devolve ao baralho um campo que não dá para usar agora (repetido na mesa).
        const devolver = por('devolverMao').find((t) => {
            const c = eu.mao.find((x) => x.uid === t.uid);
            return R.ehCampo(c.id) && estado.campo?.carta.id === c.id;
        });
        if (devolver) return devolver;

        if (ataques.length && ataques[0].nota > 0) return ataques[0].v;
        return por('passar')[0] || validas[0];
    }

    /** Fácil: joga como o normal, mas às vezes faz uma jogada qualquer e ataca sem pensar. */
    function escolherFacil(estado, j, validas, aleatorio) {
        if (aleatorio() < 0.6) {
            // Devolver cartas ao baralho no sorteio seria só jogar fora; o fácil não faz isso ao acaso.
            const qualquer = validas.filter((v) => !['passar', 'devolverMao', 'devolverMesa'].includes(v.tipo));
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
        if (estado.fase === 'banimento') return [0, 1].find((j) => !estado.banimento.feitos[j]);
        if (estado.fase === 'preparacao') return estado.jogadores.findIndex((x) => !x.preparado);
        if (estado.pendentes.length) return estado.pendentes[0].jogador;
        return estado.vez;
    }

    return { escolherJogada, quemJoga };
});
