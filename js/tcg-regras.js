// ============================================================================
// Batalha dos Torados: o motor de regras (regras do Pokémon TCG Pocket, adaptadas).
// JavaScript puro, sem tela: roda igual no navegador e no servidor.
//
//   criarPartida({ semente, decks, nomes })  -> estado
//   jogadasValidas(estado, jogador)          -> [jogada]
//   aplicar(estado, jogada)                  -> { estado, eventos }  (não altera o estado recebido)
//   visaoDe(estado, jogador)                 -> estado sem o que esse jogador não pode ver
//   repetir({ semente, decks, nomes }, jogadas) -> estado final (o servidor confere partidas assim)
//
// Determinístico: toda sorte (embaralhar, moeda) sai do gerador guardado no estado,
// então a mesma semente com as mesmas jogadas dá sempre a mesma partida.
// Os `eventos` descrevem o que aconteceu, em ordem, para a tela animar (ataque, dano, nocaute...).
// Regras completas: docs/PLANO-TCG.md. Números das cartas: js/tcg-cartas.js.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./baralho-dados.js'), require('./tcg-cartas.js'));
    } else {
        root.EnzoTcgRegras = factory(root.EnzoBaralho, root.EnzoTcgCartas);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Baralho, TcgCartas) {
    'use strict';

    const { COMBATE } = TcgCartas;

    /** Sobe quando uma regra muda: online, navegador e servidor precisam estar na mesma versão. */
    const REGRAS_VERSAO = 11;
    const TAMANHO_DECK = 15;
    const MAX_COPIAS = 2;
    /** Auras que se prende por turno, e no máximo quantas na mesma carta (a 3ª tem de ir para outra). */
    const AURAS_POR_TURNO = 3;
    const AURAS_MAX_POR_CARTA_NO_TURNO = 2;
    const MAX_COPIAS_LENDARIO = 1;
    /** Deck customizado (montado com a coleção da conta): no máximo 2 cartas lendárias no total. */
    const MAX_LENDARIAS_CUSTOM = 2;
    const MAO_INICIAL = 5;
    const VAGAS_BANCO = 3;
    const LIMITE_TURNOS = 30;
    // Vitória por dano (docs/PLANO-VIDA-JOGADOR.md): cada jogador tem vida; zerou, perdeu.
    // HP e dano das cartas (js/tcg-cartas.js) ficam na escala pequena e são multiplicados por
    // ESCALA aqui, então uma carta morre com o mesmo número de golpes de antes.
    const ESCALA = 20;
    const VIDA_INICIAL = 6000;
    /**
     * Vida que o dono perde quando uma carta dele cai (senão ninguém teria por que derrubar cartas).
     * ×1,5 da primeira tabela (500/750/1000/1500), pela calibragem de 2026-09-30 (16,7 turnos).
     */
    const DANO_NOCAUTE = { comum: 750, raro: 1125, epico: 1500, lendario: 2250 };
    const VENENO = 10 * ESCALA;
    const DANO_ILUDIDO = 20 * ESCALA;
    /**
     * Descarte: na sua vez, devolve cartas ao baralho (embaralhado; não voltam para a mão).
     * Da mão: até 2 por turno. Da mesa: 1 por turno, com ou sem Aura (a Aura se perde).
     */
    const DEVOLVER_MAO_POR_TURNO = 2;
    const DEVOLVER_MESA_POR_TURNO = 1;
    /** Alvo de ataque que acerta o jogador, não uma carta. */
    const JOGADOR = 'jogador';
    /** O ativo protege o dono: golpe no jogador com o ativo dele na mesa entra só com 35% (para baixo). */
    const PROTECAO_ATIVO = 0.35;

    class JogadaInvalida extends Error {
        constructor(motivo) { super(motivo); this.name = 'JogadaInvalida'; }
    }

    // ---- Cartas ---------------------------------------------------------------
    const tipoDe = (id) => Baralho.carta(id)?.tipo || null;
    const ehLutador = (id) => tipoDe(id) === 'personagem' || tipoDe(id) === 'goon';
    const ehCampo = (id) => tipoDe(id) === 'campo';
    const combate = (id) => COMBATE[id] || null;
    /** Vida que o dono perde quando esta carta é nocauteada. */
    const danoNocaute = (id) => DANO_NOCAUTE[Baralho.carta(id)?.raridade] || DANO_NOCAUTE.comum;

    // ---- Sorte determinística (mulberry32; o número fica no estado) ----------
    function sementeNumerica(semente) {
        if (typeof semente === 'number') return semente >>> 0;
        let h = 2166136261;
        for (const ch of String(semente)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function sortear(estado) {
        estado.rng = (estado.rng + 0x6D2B79F5) >>> 0;
        let t = estado.rng;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function embaralhar(estado, lista) {
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(sortear(estado) * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
    }
    /** true = cara. */
    function moeda(estado, eventos, motivo) {
        const cara = sortear(estado) < 0.5;
        eventos.push({ tipo: 'moeda', resultado: cara ? 'cara' : 'coroa', motivo });
        return cara;
    }

    // ---- Deck -----------------------------------------------------------------
    /**
     * Lista de erros do deck (vazia = deck válido). `colecao` ({ id: qtd }) é opcional:
     * por enquanto todo mundo tem todas as cartas liberadas.
     */
    function validarDeck(ids, { colecao, maxLendarias } = {}) {
        const erros = [];
        if (!Array.isArray(ids)) return ['O deck precisa ser uma lista de cartas.'];
        if (ids.length !== TAMANHO_DECK) erros.push(`O deck precisa de ${TAMANHO_DECK} cartas (tem ${ids.length}).`);
        const contagem = {};
        for (const id of ids) contagem[id] = (contagem[id] || 0) + 1;
        for (const [id, qtd] of Object.entries(contagem)) {
            const carta = Baralho.carta(id);
            if (!carta || !combate(id)) { erros.push(`Carta desconhecida: ${id}.`); continue; }
            const max = carta.raridade === 'lendario' ? MAX_COPIAS_LENDARIO : (combate(id).maxCopias || MAX_COPIAS);
            if (qtd > max) erros.push(`${carta.nome}: no máximo ${max} ${max === 1 ? 'cópia' : 'cópias'}.`);
            if (colecao && (colecao[id] || 0) < qtd) erros.push(`${carta.nome}: você tem ${colecao[id] || 0}.`);
        }
        if (!ids.some(ehLutador)) erros.push('O deck precisa de pelo menos 1 personagem ou goon.');
        if (maxLendarias !== undefined) {
            const lendarias = ids.filter((id) => Baralho.carta(id)?.raridade === 'lendario').length;
            if (lendarias > maxLendarias) erros.push(`No máximo ${maxLendarias} lendárias no deck (tem ${lendarias}).`);
        }
        return erros;
    }

    // ---- Criação --------------------------------------------------------------
    function novaInstancia(id, uid) {
        // virada: turno até o qual a carta fica virada para baixo pela recarga do ataque.
        return { uid, id, dano: 0, aura: 0, estados: { notificado: false, iludido: false, silenciado: 0, virada: 0 }, escudo: null };
    }
    function flagsDoTurno() {
        return { auras: AURAS_POR_TURNO, auraEm: {}, reforco: 0, campo: false, recuo: false, trocarCarta: false, poderes: [], devolvidasMao: 0, devolvidasMesa: 0 };
    }

    /** Cartas que um deck pode ter banidas pelo adversário: só as que não são lendárias. */
    const banivel = (inst) => Baralho.carta(inst.id)?.raridade !== 'lendario';
    const BANIDAS_POR_JOGADOR = 2;
    /** Quantas cartas o jogador bane: até 2, e nunca as duas cópias de uma mesma carta (cartas diferentes). */
    const quantasBanir = (deckAdv) => Math.min(BANIDAS_POR_JOGADOR, new Set(deckAdv.filter(banivel).map((c) => c.id)).size);

    /** Mão inicial de cada um: embaralha e compra; mão sem ninguém para lutar volta e compra de novo (sem castigo). */
    function distribuirMaos(estado) {
        for (const jogador of estado.jogadores) {
            for (;;) {
                jogador.deck.push(...jogador.mao.splice(0));
                embaralhar(estado, jogador.deck);
                jogador.mao = jogador.deck.splice(0, MAO_INICIAL);
                if (jogador.mao.some((c) => ehLutador(c.id))) break;
                jogador.mulligans++;
            }
        }
    }

    /** Erro de um banimento (vazio = ok): `uids` são cartas do deck do adversário (`deckAdv`). */
    function erroDoBanimento(deckAdv, uids) {
        const esperado = quantasBanir(deckAdv);
        if (!Array.isArray(uids) || uids.length !== esperado) return `escolha ${esperado} carta${esperado === 1 ? '' : 's'} para banir`;
        if (new Set(uids).size !== uids.length) return 'carta repetida na escolha';
        for (const uid of uids) {
            const c = deckAdv.find((x) => x.uid === uid);
            if (!c) return 'essa carta não está no deck dele';
            if (!banivel(c)) return 'lendária não pode ser banida';
        }
        if (new Set(uids.map((u) => deckAdv.find((x) => x.uid === u)?.id)).size !== uids.length) return 'não dá para banir as duas cópias da mesma carta';
        if (!deckAdv.some((c) => !uids.includes(c.uid) && ehLutador(c.id))) return 'banir essas cartas deixaria o deck dele sem ninguém para lutar';
        return null;
    }

    /** Rodada = par de turnos (o turno é de um jogador só): a rodada 1 tem os turnos 1 e 2. */
    const rodadaDe = (turno) => Math.max(1, Math.ceil(turno / 2));
    const RODADAS_MAX = Math.ceil(LIMITE_TURNOS / 2);

    function criarPartida({ semente = Date.now(), decks, nomes = ['Jogador 1', 'Jogador 2'], banimento = false } = {}) {
        if (!Array.isArray(decks) || decks.length !== 2) throw new JogadaInvalida('A partida precisa de 2 decks.');
        decks.forEach((d, i) => {
            const erros = validarDeck(d);
            if (erros.length) throw new JogadaInvalida(`Deck ${i + 1} inválido: ${erros.join(' ')}`);
        });
        const estado = {
            versao: 1,
            semente,
            rng: sementeNumerica(semente),
            fase: 'preparacao',
            turno: 0,
            vez: 0,
            primeiro: 0,
            campo: null,
            pendentes: [],
            depoisPendentes: null,
            vencedor: null,
            motivo: null,
            jogadores: [0, 1].map((j) => ({
                nome: String(nomes[j] || `Jogador ${j + 1}`),
                deck: decks[j].map((id, n) => novaInstancia(id, `${j}-${n}`)),
                mao: [], ativo: null, banco: [], descarte: [],
                vida: VIDA_INICIAL, preparado: false, mulligans: 0,
                flags: flagsDoTurno(), espiada: null,
            })),
        };
        if (banimento) {
            // Antes de qualquer carta ir à mesa: cada um bane 2 cartas não lendárias do deck do outro (em segredo, ao mesmo
            // tempo). As mãos só são compradas depois, já sem as cartas banidas.
            estado.fase = 'banimento';
            estado.banimento = { feitos: [null, null] };
            estado.banidas = [[], []];
            estado.primeiro = sortear(estado) < 0.5 ? 0 : 1;
            return estado;
        }
        distribuirMaos(estado);
        estado.primeiro = sortear(estado) < 0.5 ? 0 : 1;
        return estado;
    }

    // ---- Consultas (a tela usa também) -----------------------------------------
    const outro = (j) => 1 - j;
    const naMesa = (jogador) => (jogador.ativo ? [jogador.ativo, ...jogador.banco] : [...jogador.banco]);
    const efeitoCampo = (estado) => (estado.campo ? combate(estado.campo.carta.id).campo : null);

    function hpMax(estado, inst) {
        const base = combate(inst.id).hp;
        const campo = efeitoCampo(estado);
        return (base + (campo?.tipo === 'mansao' && tipoDe(inst.id) === 'goon' ? campo.hpGoon : 0)) * ESCALA;
    }
    function custoRecuo(estado, inst) {
        const campo = efeitoCampo(estado);
        if (campo?.tipo === 'recuoGratisGoon' && tipoDe(inst.id) === 'goon') return 0;
        return combate(inst.id).recuo;
    }
    const silenciado = (estado, inst) => inst.estados.silenciado >= estado.turno;
    /** Virada para baixo pela recarga: não ataca, não usa poder e não recua (continua levando golpe). */
    const virada = (estado, inst) => (inst.estados.virada || 0) >= estado.turno;
    /** Quantas cartas: na visão de um jogador, a mão do outro e os decks viram só um número. */
    const qtd = (lista) => (Array.isArray(lista) ? lista.length : Number(lista) || 0);
    const acharNaMao = (jogador, uid) => jogador.mao.find((c) => c.uid === uid) || null;
    const acharNaMesa = (jogador, uid) => naMesa(jogador).find((c) => c.uid === uid) || null;
    /** Cabo Côco no ativo do adversário impede jogar campos. */
    const camposBanidos = (estado, j) => {
        const ativo = estado.jogadores[outro(j)].ativo;
        return !!ativo && combate(ativo.id).poder?.tipo === 'banirCampos';
    };
    /** Quem começa não ataca no 1º turno. */
    const podeAtacarNoTurno = (estado) => estado.turno > 1;

    /**
     * Dano final do ataque (sem moeda: para a tela mostrar a previsão).
     * `alvo`: a carta, ou JOGADOR (aí o ativo do dono, se houver, segura 65% do golpe).
     */
    function calcularDano(estado, j, ataque, alvo, { resultadoMoeda } = {}) {
        const eu = estado.jogadores[j];
        const atacante = eu.ativo;
        let dano = ataque.dano;
        for (const ef of ataque.efeitos || []) {
            if (ef.tipo === 'moeda') dano = resultadoMoeda === false ? ef.coroa : ef.cara;
            if (ef.tipo === 'bonusPorAura') dano += ef.valor * atacante.aura;
            if (ef.tipo === 'bonusSeAliado' && naMesa(eu).some((c) => c !== atacante && c.id === ef.carta)) dano += ef.valor;
            if (ef.tipo === 'bonusPorGoon') dano += ef.valor * naMesa(eu).filter((c) => tipoDe(c.id) === 'goon').length;
        }
        if (dano > 0 && eu.banco.some((c) => combate(c.id).poder?.tipo === 'bonusDoBanco')) {
            dano += Math.max(...eu.banco.map((c) => (combate(c.id).poder?.tipo === 'bonusDoBanco' ? combate(c.id).poder.valor : 0)));
        }
        dano *= ESCALA;
        if (alvo === JOGADOR) {
            if (estado.jogadores[outro(j)].ativo) dano = Math.floor(dano * PROTECAO_ATIVO);
            return Math.max(0, dano);
        }
        // O escudo já é guardado na escala grande (executarAtaque).
        if (alvo?.escudo && alvo.escudo.ate >= estado.turno) dano -= alvo.escudo.valor;
        return Math.max(0, dano);
    }

    // ---- Validação (fonte única: aplicar e jogadasValidas usam) ----------------
    function motivoInvalida(estado, jogada) {
        if (!jogada || typeof jogada !== 'object') return 'jogada vazia';
        const j = jogada.jogador;
        if (j !== 0 && j !== 1) return 'jogador inválido';
        if (estado.fase === 'fim') return 'a partida acabou';
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];

        if (jogada.tipo === 'desistir') return null;

        if (estado.fase === 'banimento') {
            if (jogada.tipo !== 'banir') return 'escolha as cartas para banir primeiro';
            if (estado.banimento.feitos[j]) return 'você já baniu';
            return erroDoBanimento(ele.deck, jogada.cartas);
        }

        if (estado.fase === 'preparacao') {
            if (jogada.tipo !== 'preparar') return 'escolha o ativo e o banco primeiro';
            if (eu.preparado) return 'você já se preparou';
            const ativo = acharNaMao(eu, jogada.ativo);
            if (!ativo || !ehLutador(ativo.id)) return 'o ativo precisa ser um personagem ou goon da mão';
            const banco = jogada.banco || [];
            if (!Array.isArray(banco) || banco.length > VAGAS_BANCO) return `o banco tem ${VAGAS_BANCO} vagas`;
            if (new Set([jogada.ativo, ...banco]).size !== banco.length + 1) return 'carta repetida na escolha';
            for (const uid of banco) {
                const c = acharNaMao(eu, uid);
                if (!c || !ehLutador(c.id)) return 'o banco só aceita personagens e goons da mão';
            }
            return null;
        }

        if (estado.pendentes.length) {
            if (jogada.tipo !== 'novoAtivo') return 'escolha o novo ativo primeiro';
            if (!estado.pendentes.some((p) => p.jogador === j)) return 'não é você quem escolhe agora';
            if (!eu.banco.some((c) => c.uid === jogada.uid)) return 'o novo ativo precisa vir do seu banco';
            return null;
        }
        if (estado.vez !== j) return 'não é a sua vez';
        const f = eu.flags;

        switch (jogada.tipo) {
            case 'baixar': {
                const c = acharNaMao(eu, jogada.uid);
                if (!c || !ehLutador(c.id)) return 'só personagens e goons vão para o banco';
                if (eu.ativo && eu.banco.length >= VAGAS_BANCO) return 'o banco está cheio';
                return null;
            }
            case 'aura': {
                if (f.auras <= 0) return 'você já prendeu a Aura deste turno';
                const alvo = acharNaMesa(eu, jogada.alvo);
                if (!alvo) return 'a Aura vai para uma carta sua na mesa';
                if (alvo === eu.ativo && f.auras <= f.reforco) return 'a Aura de Reforço vai para o banco';
                if ((f.auraEm?.[alvo.uid] || 0) >= AURAS_MAX_POR_CARTA_NO_TURNO) return `no máximo ${AURAS_MAX_POR_CARTA_NO_TURNO} Auras na mesma carta por turno`;
                return null;
            }
            case 'campo': {
                const c = acharNaMao(eu, jogada.uid);
                if (!c || !ehCampo(c.id)) return 'essa carta não é um campo';
                if (f.campo) return 'só 1 campo por turno';
                if (estado.campo?.carta.id === c.id) return 'esse campo já está na mesa';
                if (camposBanidos(estado, j)) return 'Conteúdo Banido: o ativo do adversário não deixa jogar campos';
                return null;
            }
            case 'recuar': {
                if (f.recuo) return 'só 1 recuo por turno';
                if (!eu.ativo) return 'sem ativo';
                if (silenciado(estado, eu.ativo)) return 'Silenciado não recua';
                if (virada(estado, eu.ativo)) return 'carta virada (recarga) não recua';
                if (!eu.banco.some((c) => c.uid === jogada.para)) return 'escolha quem sai do banco';
                if (eu.ativo.aura < custoRecuo(estado, eu.ativo)) {
                    return `Aura insuficiente para recuar: o ativo precisa ter ${custoRecuo(estado, eu.ativo)} Aura presa nele (tem ${eu.ativo.aura})`;
                }
                return null;
            }
            case 'poder': {
                const c = acharNaMesa(eu, jogada.uid);
                const poder = c && combate(c.id).poder;
                if (!poder || !poder.ativavel) return 'essa carta não tem poder para usar';
                if (f.poderes.includes(c.uid)) return 'esse poder já foi usado neste turno';
                if (virada(estado, c)) return 'carta virada (recarga) não usa poder';
                if (poder.tipo === 'notificarAtivo' && !ele.ativo) return 'o adversário não tem ativo';
                if (poder.tipo === 'comprar' && !qtd(eu.deck)) return 'seu deck acabou';
                if (poder.tipo === 'puxar') {
                    if (!ele.ativo) return 'o adversário não tem ativo';
                    if (!ele.banco.length) return 'o adversário não tem ninguém no banco';
                    if (!ele.banco.some((x) => x.uid === jogada.alvo)) return 'escolha quem vem do banco dele';
                }
                if (poder.tipo === 'espiarMao' && !qtd(ele.mao)) return 'a mão do adversário está vazia';
                return null;
            }
            case 'trocarCarta': {
                if (efeitoCampo(estado)?.tipo !== 'trocarCarta') return 'só na Casa do Enzo Games';
                if (f.trocarCarta) return 'só 1 troca por turno';
                if (!acharNaMao(eu, jogada.uid)) return 'escolha uma carta da mão';
                return null;
            }
            case 'devolverMao': {
                if ((f.devolvidasMao || 0) >= DEVOLVER_MAO_POR_TURNO) return `só ${DEVOLVER_MAO_POR_TURNO} cartas da mão por turno`;
                if (!acharNaMao(eu, jogada.uid)) return 'escolha uma carta da mão';
                return null;
            }
            case 'devolverMesa': {
                if ((f.devolvidasMesa || 0) >= DEVOLVER_MESA_POR_TURNO) return 'só 1 carta da mesa por turno';
                if (!acharNaMesa(eu, jogada.uid)) return 'escolha uma carta sua na mesa';
                return null;
            }
            case 'atacar': {
                if (!podeAtacarNoTurno(estado)) return 'quem começa não ataca no 1º turno';
                const atacante = eu.ativo;
                if (!atacante) return 'sem ativo';
                const ataque = combate(atacante.id).ataques[jogada.ataque];
                if (!ataque) return 'ataque desconhecido';
                if (silenciado(estado, atacante)) return 'Silenciado não ataca';
                if (virada(estado, atacante)) return 'carta virada (recarga) não ataca';
                if (atacante.aura < ataque.custo) return `precisa de ${ataque.custo} de Aura`;
                const puxa = (ataque.efeitos || []).some((e) => e.tipo === 'puxar');
                // Qualquer ataque pode ir no jogador, mesmo com o ativo dele na mesa (o Puxar não:
                // ele só serve para trazer alguém do banco).
                if (jogada.alvo === JOGADOR) return puxa ? 'esse ataque não acerta o jogador' : null;
                if (!ele.ativo) return 'o adversário não tem ativo: ataque o jogador';
                if (ataque.alvo === 'qualquer') {
                    const alvo = acharNaMesa(ele, jogada.alvo);
                    if (!alvo) return 'escolha o alvo';
                    if (alvo !== ele.ativo && efeitoCampo(estado)?.tipo === 'protegeBanco') return 'São João do Butico protege o banco';
                } else if (puxa && ele.banco.length) {
                    if (!ele.banco.some((c) => c.uid === jogada.alvo)) return 'escolha quem vem do banco dele';
                } else if (jogada.alvo !== undefined && jogada.alvo !== ele.ativo.uid) {
                    return 'esse ataque só acerta o ativo';
                }
                return null;
            }
            case 'passar':
                return null;
            default:
                return 'jogada desconhecida';
        }
    }

    // ---- Execução --------------------------------------------------------------
    function comprar(estado, j, eventos, motivo = 'turno') {
        const eu = estado.jogadores[j];
        const carta = eu.deck.shift();
        if (!carta) { eventos.push({ tipo: 'deckVazio', jogador: j }); return; }
        eu.mao.push(carta);
        eventos.push({ tipo: 'compra', jogador: j, uid: carta.uid, id: carta.id, motivo });
    }
    function limparEstados(inst) {
        inst.estados.notificado = false;
        inst.estados.iludido = false;
        inst.estados.silenciado = 0;
    }
    function paraDescarte(jogador, inst) {
        inst.dano = 0;
        inst.aura = 0;
        inst.escudo = null;
        limparEstados(inst);
        inst.estados.virada = 0;   // a recarga não sai no banco (é do ataque), só no descarte
        jogador.descarte.push(inst);
    }
    /** Devolve a carta ao baralho do dono, limpa (sem dano, Aura nem estados), e embaralha. */
    function paraOBaralho(estado, jogador, inst) {
        inst.dano = 0;
        inst.aura = 0;
        inst.escudo = null;
        limparEstados(inst);
        inst.estados.virada = 0;
        jogador.deck.push(inst);
        embaralhar(estado, jogador.deck);
    }
    function tirarDaMao(jogador, uid) {
        const i = jogador.mao.findIndex((c) => c.uid === uid);
        return jogador.mao.splice(i, 1)[0];
    }
    function darDano(estado, inst, valor, eventos, fonte) {
        if (valor <= 0) return;
        inst.dano += valor;
        eventos.push({ tipo: 'dano', uid: inst.uid, valor, fonte, dano: inst.dano, hp: hpMax(estado, inst) });
    }
    /** Dano direto na vida do jogador (ataque no jogador ou carta dele nocauteada). */
    function ferirJogador(estado, j, valor, eventos, fonte) {
        if (valor <= 0) return;
        const eu = estado.jogadores[j];
        eu.vida = Math.max(0, eu.vida - valor);
        eventos.push({ tipo: 'danoJogador', jogador: j, valor, fonte, vida: eu.vida });
    }

    function encerrar(estado, vencedor, motivo, eventos) {
        estado.fase = 'fim';
        estado.vencedor = vencedor;
        estado.motivo = motivo;
        estado.pendentes = [];
        estado.depoisPendentes = null;
        eventos.push({ tipo: 'fim', vencedor, motivo });
    }

    /** Cura `valor` de cada carta de quem joga (ativo e banco): Piscina de Macarronada. */
    function curarMesa(jogador, valor, eventos) {
        for (const inst of naMesa(jogador)) {
            const cura = Math.min(valor, inst.dano);
            if (cura <= 0) continue;
            inst.dano -= cura;
            eventos.push({ tipo: 'cura', uid: inst.uid, valor: cura, fonte: 'campo' });
        }
    }
    /** Cartas na mesa que ainda estão de pé (antes de um campo sair). */
    const vivosNaMesa = (estado) => estado.jogadores.flatMap((jg) => naMesa(jg).filter((i) => i.dano < hpMax(estado, i)).map((i) => i.uid));
    /** Quando o campo sai, quem estava de pé e perdeu HP extra fica com 1 de vida em vez de cair. */
    function segurarAposCampo(estado, vivos) {
        for (const jg of estado.jogadores) {
            for (const inst of naMesa(jg)) {
                if (vivos.includes(inst.uid) && inst.dano >= hpMax(estado, inst)) inst.dano = hpMax(estado, inst) - 1;
            }
        }
    }

    /** Quem tem mais vida (empate se igual). */
    function quemTemMaisVida(estado) {
        const [v0, v1] = estado.jogadores.map((x) => x.vida);
        return v0 === v1 ? 'empate' : (v0 > v1 ? 0 : 1);
    }

    /** Tira da mesa quem ficou sem HP (o dono perde vida) e vê se alguém zerou a vida. */
    function verificarNocautes(estado, eventos) {
        for (const j of [0, 1]) {
            const eu = estado.jogadores[j];
            for (const inst of naMesa(eu)) {
                if (inst.dano < hpMax(estado, inst)) continue;
                if (eu.ativo === inst) eu.ativo = null;
                else eu.banco.splice(eu.banco.indexOf(inst), 1);
                const dano = danoNocaute(inst.id);
                paraDescarte(eu, inst);
                eventos.push({ tipo: 'nocaute', jogador: j, uid: inst.uid, id: inst.id, dano });
                ferirJogador(estado, j, dano, eventos, 'nocaute');
            }
        }
        const zerados = [0, 1].filter((j) => estado.jogadores[j].vida <= 0);
        if (zerados.length) {
            const vencedor = zerados.length === 2 ? 'empate' : outro(zerados[0]);
            encerrar(estado, vencedor, vencedor === 'empate' ? 'empate' : 'vida', eventos);
            return;
        }
        // Mesa vazia não perde mais: sem ninguém no banco, o jogador fica exposto (todo ataque vai
        // nele) até baixar alguém, que entra direto como ativo.
        for (const j of [0, 1]) {
            const eu = estado.jogadores[j];
            if (!eu.ativo && eu.banco.length && !estado.pendentes.some((p) => p.jogador === j)) {
                estado.pendentes.push({ jogador: j, tipo: 'novoAtivo' });
                eventos.push({ tipo: 'escolherAtivo', jogador: j });
            }
        }
    }

    /** Continua o fluxo: espera as escolhas de novo ativo, senão segue. */
    function seguir(estado, passo, eventos) {
        if (estado.fase === 'fim') return;
        if (estado.pendentes.length) { estado.depoisPendentes = passo; return; }
        if (passo === 'fimTurno') fimDeTurno(estado, eventos);
        else if (passo === 'proximoTurno') iniciarTurno(estado, outro(estado.vez), eventos);
    }

    function iniciarTurno(estado, j, eventos) {
        estado.turno++;
        estado.vez = j;
        const eu = estado.jogadores[j];
        eu.flags = flagsDoTurno();
        // Aura de Reforço: quem joga em segundo ganha +1 Aura no 1º turno, só para o banco.
        if (estado.turno === 2) { eu.flags.auras = AURAS_POR_TURNO + 1; eu.flags.reforco = 1; }
        eu.espiada = null;
        eventos.push({ tipo: 'turno', jogador: j, turno: estado.turno });
        const campo = efeitoCampo(estado);
        if (campo?.tipo === 'curaInicio') curarMesa(eu, campo.valor * ESCALA, eventos);
        const extra = campo?.tipo === 'compraExtra' && eu.mao.length <= campo.limiteMao;
        comprar(estado, j, eventos);
        if (extra) comprar(estado, j, eventos, 'campo');
    }

    /** Entre um turno e outro: Notificado tira HP dos ativos dos dois lados. */
    function fimDeTurno(estado, eventos) {
        eventos.push({ tipo: 'fimTurno', jogador: estado.vez, turno: estado.turno });
        const campo = efeitoCampo(estado);
        const veneno = campo?.tipo === 'mansao' ? campo.veneno * ESCALA : VENENO;
        for (const eu of estado.jogadores) {
            if (eu.ativo?.estados.notificado) darDano(estado, eu.ativo, veneno, eventos, 'notificado');
        }
        verificarNocautes(estado, eventos);
        if (estado.fase === 'fim') return;
        if (estado.turno >= LIMITE_TURNOS && !estado.pendentes.length) {
            encerrar(estado, quemTemMaisVida(estado), 'limiteTurnos', eventos);
            return;
        }
        seguir(estado, 'proximoTurno', eventos);
    }

    function executarAtaque(estado, jogada, eventos) {
        const j = jogada.jogador;
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];
        const atacante = eu.ativo;
        const ataque = combate(atacante.id).ataques[jogada.ataque];
        // Alvo: o jogador (vida), uma carta qualquer (alvo 'qualquer') ou o ativo dele.
        // Gancho futuro: cartas que "entram no meio" do golpe no jogador trocariam `alvo` aqui.
        const noJogador = jogada.alvo === JOGADOR;
        const alvo = noJogador ? null : (ataque.alvo === 'qualquer' ? acharNaMesa(ele, jogada.alvo) : ele.ativo);
        eventos.push({ tipo: 'ataque', jogador: j, uid: atacante.uid, ataque: jogada.ataque, nome: ataque.nome, alvo: noJogador ? JOGADOR : alvo.uid });

        if (atacante.estados.iludido && !moeda(estado, eventos, 'iludido')) {
            eventos.push({ tipo: 'ataqueFalhou', uid: atacante.uid, motivo: 'iludido' });
            darDano(estado, atacante, DANO_ILUDIDO, eventos, 'iludido');
            verificarNocautes(estado, eventos);
            seguir(estado, 'fimTurno', eventos);
            return;
        }
        // Recarga (como o cooldown do Moderador): a carta fica virada no próximo turno do dono.
        if (ataque.recarga) {
            atacante.estados.virada = estado.turno + 2 * ataque.recarga;
            eventos.push({ tipo: 'virada', uid: atacante.uid, ate: atacante.estados.virada });
        }

        const efeitos = ataque.efeitos || [];
        const temMoeda = efeitos.some((e) => e.tipo === 'moeda');
        const resultadoMoeda = temMoeda ? moeda(estado, eventos, 'ataque') : undefined;
        const dano = calcularDano(estado, j, ataque, noJogador ? JOGADOR : alvo, { resultadoMoeda });
        let derrubou = false;
        if (noJogador) {
            ferirJogador(estado, outro(j), dano, eventos, 'ataque');
        } else {
            if (alvo.escudo && alvo.escudo.ate >= estado.turno && dano === 0 && ataque.dano > 0) {
                eventos.push({ tipo: 'bloqueado', uid: alvo.uid });
            }
            darDano(estado, alvo, dano, eventos, 'ataque');
            derrubou = dano > 0 && alvo.dano >= hpMax(estado, alvo);
            const contra = combate(alvo.id).poder;
            if (dano > 0 && contra?.tipo === 'contraAtaque') {
                eventos.push({ tipo: 'poder', uid: alvo.uid, nome: contra.nome });
                darDano(estado, atacante, contra.valor * ESCALA, eventos, 'contraAtaque');
            }
        }

        // Mansão do Inominável: goon que ataca com 1 Aura a mais do que o ataque pede notifica o ativo do adversário.
        if (efeitoCampo(estado)?.tipo === 'mansao' && tipoDe(atacante.id) === 'goon' && dano > 0 && atacante.aura > ataque.custo
            && ele.ativo && !ele.ativo.estados.notificado && acharNaMesa(ele, ele.ativo.uid)) {
            ele.ativo.estados.notificado = true;
            eventos.push({ tipo: 'estado', uid: ele.ativo.uid, estado: 'notificado', fonte: 'mansao' });
        }

        for (const ef of efeitos) {
            switch (ef.tipo) {
                case 'estado':
                    if (!alvo || alvo !== ele.ativo) break;   // estados só pegam no ativo
                    if (ef.estado === 'silenciado') {
                        // Quem acabou de ficar Silenciado não pode ser silenciado de novo no turno seguinte
                        // (senão dois Moderadores travam o ativo do outro para sempre).
                        if (alvo.estados.silenciado > 0 && alvo.estados.silenciado >= estado.turno - 1) {
                            eventos.push({ tipo: 'imune', uid: alvo.uid, estado: ef.estado });
                            break;
                        }
                        alvo.estados.silenciado = estado.turno + 1;
                    } else {
                        alvo.estados[ef.estado] = true;
                    }
                    eventos.push({ tipo: 'estado', uid: alvo.uid, estado: ef.estado });
                    break;
                case 'curarSi': {
                    const valor = Math.min(ef.valor * ESCALA, atacante.dano);
                    if (valor > 0) {
                        atacante.dano -= valor;
                        eventos.push({ tipo: 'cura', uid: atacante.uid, valor, fonte: 'ataque' });
                    }
                    break;
                }
                case 'danoSi':
                    darDano(estado, atacante, ef.valor * ESCALA, eventos, 'proprioAtaque');
                    break;
                case 'escudo':
                    atacante.escudo = { valor: ef.valor * ESCALA, ate: estado.turno + 1 };
                    eventos.push({ tipo: 'escudo', uid: atacante.uid, valor: atacante.escudo.valor });
                    break;
                case 'auraSi':
                    atacante.aura += ef.valor;
                    eventos.push({ tipo: 'aura', uid: atacante.uid, valor: ef.valor, aura: atacante.aura, fonte: 'ataque' });
                    break;
                case 'puxar': {
                    const puxado = ele.banco.find((c) => c.uid === jogada.alvo);
                    if (puxado) {
                        const antigo = ele.ativo;
                        ele.banco[ele.banco.indexOf(puxado)] = antigo;
                        limparEstados(antigo);
                        ele.ativo = puxado;
                        eventos.push({ tipo: 'troca', jogador: outro(j), sai: antigo.uid, entra: puxado.uid, motivo: 'puxar' });
                    }
                    break;
                }
                case 'descartarCampo':
                    if (estado.campo) {
                        const vivosAntes = vivosNaMesa(estado);
                        const { carta, dono } = estado.campo;
                        paraDescarte(estado.jogadores[dono], carta);
                        estado.campo = null;
                        segurarAposCampo(estado, vivosAntes);
                        eventos.push({ tipo: 'campoSai', id: carta.id, uid: carta.uid });
                    }
                    break;
                default:
                    break;
            }
        }
        // (Sem golpe extra: derrubar a carta só tira do dono a vida da raridade, em verificarNocautes.)
        // A vida do dono da carta derrubada cai primeiro (nocaute)...
        verificarNocautes(estado, eventos);
        // ...e depois a carta que derrubou fica virada (recarga) até o próximo turno do dono. Vale para todo ataque
        // que derruba uma carta (não vale se a partida acabou ou se o atacante caiu no contra-ataque).
        if (derrubou && estado.fase !== 'fim' && acharNaMesa(eu, atacante.uid) && !virada(estado, atacante)) {
            atacante.estados.virada = estado.turno + 2;
            eventos.push({ tipo: 'virada', uid: atacante.uid, ate: atacante.estados.virada, motivo: 'derrubou' });
        }
        seguir(estado, 'fimTurno', eventos);
    }

    function executar(estado, jogada, eventos) {
        const j = jogada.jogador;
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];

        switch (jogada.tipo) {
            case 'desistir':
                // Online, o servidor desiste por quem ficou 3 vezes seguidas sem jogar: aí o
                // motivo é inatividade (não é ponto de carta nem desistência de verdade).
                encerrar(estado, outro(j), jogada.motivo === 'inatividade' ? 'inatividade' : 'desistencia', eventos);
                return;

            case 'banir': {
                estado.banimento.feitos[j] = jogada.cartas.slice();
                eventos.push({ tipo: 'banimentoPronto', jogador: j });
                if (estado.banimento.feitos.every(Boolean)) {
                    // Os dois escolheram: as cartas saem dos decks, aparecem para todos e as mãos são compradas.
                    for (const i of [0, 1]) {
                        const alvo = estado.jogadores[i];
                        const uids = estado.banimento.feitos[outro(i)];
                        const banidas = alvo.deck.filter((c) => uids.includes(c.uid));
                        alvo.deck = alvo.deck.filter((c) => !uids.includes(c.uid));
                        estado.banidas[i] = banidas.map((c) => ({ uid: c.uid, id: c.id }));
                        eventos.push({ tipo: 'banimento', jogador: outro(i), alvo: i, cartas: estado.banidas[i] });
                    }
                    estado.banimento = null;
                    distribuirMaos(estado);
                    estado.fase = 'preparacao';
                }
                return;
            }

            case 'preparar': {
                eu.ativo = tirarDaMao(eu, jogada.ativo);
                eu.banco = (jogada.banco || []).map((uid) => tirarDaMao(eu, uid));
                eu.preparado = true;
                eventos.push({ tipo: 'preparado', jogador: j });
                if (estado.jogadores.every((x) => x.preparado)) {
                    estado.fase = 'jogo';
                    eventos.push({ tipo: 'inicio', primeiro: estado.primeiro });
                    iniciarTurno(estado, estado.primeiro, eventos);
                }
                return;
            }

            case 'novoAtivo': {
                const inst = eu.banco.find((c) => c.uid === jogada.uid);
                eu.banco.splice(eu.banco.indexOf(inst), 1);
                eu.ativo = inst;
                estado.pendentes = estado.pendentes.filter((p) => p.jogador !== j);
                eventos.push({ tipo: 'novoAtivo', jogador: j, uid: inst.uid });
                if (!estado.pendentes.length && estado.depoisPendentes) {
                    const passo = estado.depoisPendentes;
                    estado.depoisPendentes = null;
                    seguir(estado, passo, eventos);
                }
                return;
            }

            case 'baixar': {
                const inst = tirarDaMao(eu, jogada.uid);
                // Mesa vazia: quem baixa entra direto como ativo (antes era derrota).
                if (!eu.ativo) {
                    eu.ativo = inst;
                    eventos.push({ tipo: 'baixar', jogador: j, uid: inst.uid, id: inst.id, ativo: true });
                    return;
                }
                eu.banco.push(inst);
                eventos.push({ tipo: 'baixar', jogador: j, uid: inst.uid, id: inst.id });
                return;
            }

            case 'aura': {
                const inst = acharNaMesa(eu, jogada.alvo);
                inst.aura++;
                eu.flags.auras--;
                eu.flags.auraEm = eu.flags.auraEm || {};
                eu.flags.auraEm[inst.uid] = (eu.flags.auraEm[inst.uid] || 0) + 1;
                if (inst !== eu.ativo && eu.flags.reforco > 0) eu.flags.reforco--;
                eventos.push({ tipo: 'aura', uid: inst.uid, valor: 1, aura: inst.aura, fonte: 'turno' });
                return;
            }

            case 'campo': {
                const inst = tirarDaMao(eu, jogada.uid);
                const vivosAntes = vivosNaMesa(estado);
                if (estado.campo) {
                    const antigo = estado.campo;
                    paraDescarte(estado.jogadores[antigo.dono], antigo.carta);
                    eventos.push({ tipo: 'campoSai', id: antigo.carta.id, uid: antigo.carta.uid });
                }
                estado.campo = { carta: inst, dono: j };
                eu.flags.campo = true;
                eventos.push({ tipo: 'campo', jogador: j, uid: inst.uid, id: inst.id });
                // Piscina de Macarronada: quem joga o campo já é curado neste mesmo turno (depois vem a cura de começo de turno).
                const efeito = combate(inst.id).campo;
                if (efeito?.tipo === 'curaInicio') curarMesa(eu, efeito.valor * ESCALA, eventos);
                // Sair da Mansão tira o HP extra dos goons, mas não derruba ninguém por isso.
                segurarAposCampo(estado, vivosAntes);
                verificarNocautes(estado, eventos);
                return;
            }

            case 'recuar': {
                const sai = eu.ativo;
                const entra = eu.banco.find((c) => c.uid === jogada.para);
                const custo = custoRecuo(estado, sai);
                sai.aura -= custo;
                eu.banco[eu.banco.indexOf(entra)] = sai;
                eu.ativo = entra;
                limparEstados(sai);
                eu.flags.recuo = true;
                eventos.push({ tipo: 'troca', jogador: j, sai: sai.uid, entra: entra.uid, motivo: 'recuo', custo });
                return;
            }

            case 'poder': {
                const inst = acharNaMesa(eu, jogada.uid);
                const poder = combate(inst.id).poder;
                eu.flags.poderes.push(inst.uid);
                eventos.push({ tipo: 'poder', uid: inst.uid, nome: poder.nome });
                if (poder.tipo === 'notificarAtivo') {
                    ele.ativo.estados.notificado = true;
                    eventos.push({ tipo: 'estado', uid: ele.ativo.uid, estado: 'notificado' });
                } else if (poder.tipo === 'puxar') {
                    // Vem Cá (Encantadora): o escolhido do banco dele vira o ativo; ela fica virada por 1 turno.
                    const puxado = ele.banco.find((c) => c.uid === jogada.alvo);
                    const antigo = ele.ativo;
                    ele.banco[ele.banco.indexOf(puxado)] = antigo;
                    limparEstados(antigo);
                    ele.ativo = puxado;
                    eventos[eventos.length - 1].alvo = puxado.uid;
                    eventos.push({ tipo: 'troca', jogador: outro(j), sai: antigo.uid, entra: puxado.uid, motivo: 'puxar' });
                    inst.estados.virada = estado.turno + 2;
                    eventos.push({ tipo: 'virada', uid: inst.uid, ate: inst.estados.virada, motivo: 'poder' });
                } else if (poder.tipo === 'comprar') {
                    for (let n = 0; n < poder.valor; n++) comprar(estado, j, eventos, 'poder');
                } else if (poder.tipo === 'espiarMao') {
                    eu.espiada = ele.mao.map((c) => c.id);
                    eventos.push({ tipo: 'espiar', jogador: j, ids: eu.espiada.slice(), privado: true });
                }
                return;
            }

            case 'trocarCarta': {
                // Casa do Enzo Games: devolve 1 da mão ao baralho e compra 1 (não conta no limite de 2).
                const inst = tirarDaMao(eu, jogada.uid);
                paraOBaralho(estado, eu, inst);
                eu.flags.trocarCarta = true;
                eventos.push({ tipo: 'devolver', jogador: j, uid: inst.uid, id: inst.id, de: 'mao', motivo: 'casa' });
                comprar(estado, j, eventos, 'campo');
                return;
            }

            case 'devolverMao': {
                const inst = tirarDaMao(eu, jogada.uid);
                paraOBaralho(estado, eu, inst);
                eu.flags.devolvidasMao = (eu.flags.devolvidasMao || 0) + 1;
                eventos.push({ tipo: 'devolver', jogador: j, uid: inst.uid, id: inst.id, de: 'mao' });
                return;
            }

            case 'devolverMesa': {
                // Tirar a própria carta da mesa não é nocaute: o dono não perde vida.
                const inst = acharNaMesa(eu, jogada.uid);
                const eraAtivo = eu.ativo === inst;
                if (eraAtivo) eu.ativo = null;
                else eu.banco.splice(eu.banco.indexOf(inst), 1);
                paraOBaralho(estado, eu, inst);
                eu.flags.devolvidasMesa = (eu.flags.devolvidasMesa || 0) + 1;
                eventos.push({ tipo: 'devolver', jogador: j, uid: inst.uid, id: inst.id, de: 'mesa' });
                // Sem ativo e com banco: escolhe o novo ativo e o turno continua.
                if (eraAtivo && eu.banco.length) {
                    estado.pendentes.push({ jogador: j, tipo: 'novoAtivo' });
                    eventos.push({ tipo: 'escolherAtivo', jogador: j });
                }
                return;
            }

            case 'atacar':
                executarAtaque(estado, jogada, eventos);
                return;

            case 'passar':
                fimDeTurno(estado, eventos);
                return;

            default:
                throw new JogadaInvalida('jogada desconhecida');
        }
    }

    const clonar = typeof structuredClone === 'function'
        ? structuredClone
        : (x) => JSON.parse(JSON.stringify(x));

    function aplicar(estado, jogada) {
        const motivo = motivoInvalida(estado, jogada);
        if (motivo) throw new JogadaInvalida(motivo);
        const novo = clonar(estado);
        const eventos = [];
        executar(novo, jogada, eventos);
        return { estado: novo, eventos };
    }

    /** Todas as jogadas possíveis agora para esse jogador (o robô e a tela usam). */
    function jogadasValidas(estado, j) {
        if (estado.fase === 'fim') return [];
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];
        const candidatas = [];
        if (estado.fase === 'banimento') {
            if (estado.banimento.feitos[j]) return [];
            const possiveis = ele.deck.filter(banivel).map((c) => c.uid);
            const n = quantasBanir(ele.deck);
            const mesmaCarta = (a, b) => ele.deck.find((c) => c.uid === a).id === ele.deck.find((c) => c.uid === b).id;
            if (n === 0) candidatas.push({ tipo: 'banir', jogador: j, cartas: [] });
            else if (n === 1) for (const a of possiveis) candidatas.push({ tipo: 'banir', jogador: j, cartas: [a] });
            else for (let a = 0; a < possiveis.length; a++) for (let b = a + 1; b < possiveis.length; b++) if (!mesmaCarta(possiveis[a], possiveis[b])) candidatas.push({ tipo: 'banir', jogador: j, cartas: [possiveis[a], possiveis[b]] });
        } else if (estado.fase === 'preparacao') {
            if (eu.preparado) return [];
            const lutadores = eu.mao.filter((c) => ehLutador(c.id)).map((c) => c.uid);
            // Cada ativo possível com todos os outros lutadores no banco (até 3), e sozinho.
            for (const ativo of lutadores) {
                const resto = lutadores.filter((u) => u !== ativo).slice(0, VAGAS_BANCO);
                candidatas.push({ tipo: 'preparar', jogador: j, ativo, banco: resto });
                if (resto.length) candidatas.push({ tipo: 'preparar', jogador: j, ativo, banco: [] });
            }
        } else if (estado.pendentes.length) {
            for (const c of eu.banco) candidatas.push({ tipo: 'novoAtivo', jogador: j, uid: c.uid });
        } else if (estado.vez === j) {
            for (const c of eu.mao) {
                candidatas.push({ tipo: 'baixar', jogador: j, uid: c.uid });
                candidatas.push({ tipo: 'campo', jogador: j, uid: c.uid });
                candidatas.push({ tipo: 'trocarCarta', jogador: j, uid: c.uid });
                candidatas.push({ tipo: 'devolverMao', jogador: j, uid: c.uid });
            }
            for (const c of naMesa(eu)) {
                candidatas.push({ tipo: 'aura', jogador: j, alvo: c.uid });
                if (combate(c.id).poder?.tipo === 'puxar') {
                    for (const alvo of ele.banco) candidatas.push({ tipo: 'poder', jogador: j, uid: c.uid, alvo: alvo.uid });
                } else {
                    candidatas.push({ tipo: 'poder', jogador: j, uid: c.uid });
                }
                candidatas.push({ tipo: 'devolverMesa', jogador: j, uid: c.uid });
            }
            for (const c of eu.banco) candidatas.push({ tipo: 'recuar', jogador: j, para: c.uid });
            if (eu.ativo) {
                combate(eu.ativo.id).ataques.forEach((ataque, i) => {
                    const puxa = (ataque.efeitos || []).some((e) => e.tipo === 'puxar');
                    candidatas.push({ tipo: 'atacar', jogador: j, ataque: i, alvo: JOGADOR });
                    if (ataque.alvo === 'qualquer') {
                        for (const alvo of naMesa(ele)) candidatas.push({ tipo: 'atacar', jogador: j, ataque: i, alvo: alvo.uid });
                    } else if (puxa && ele.banco.length) {
                        for (const alvo of ele.banco) candidatas.push({ tipo: 'atacar', jogador: j, ataque: i, alvo: alvo.uid });
                    } else {
                        candidatas.push({ tipo: 'atacar', jogador: j, ataque: i });
                    }
                });
            }
            candidatas.push({ tipo: 'passar', jogador: j });
        }
        return candidatas.filter((jogada) => !motivoInvalida(estado, jogada));
    }

    /** O que esse jogador pode ver: sem a mão e o deck do outro, sem a ordem do próprio deck. */
    function visaoDe(estado, j) {
        const v = clonar(estado);
        delete v.rng;
        delete v.semente;
        // Na hora de banir, cada jogador vê a lista do deck do adversário (cartas e ids); depois só a quantidade.
        const listaDosDecks = estado.fase === 'banimento' && (j === 0 || j === 1);
        if (v.banimento) v.banimento = { feitos: v.banimento.feitos.map((f) => !!f) };
        v.jogadores.forEach((x, i) => {
            x.deck = listaDosDecks ? x.deck.map((c) => ({ uid: c.uid, id: c.id })) : qtd(x.deck);
            if (i !== j) {
                x.mao = qtd(x.mao);
                x.espiada = null;
                if (v.fase === 'preparacao') { x.ativo = null; x.banco = []; }
            }
        });
        return v;
    }

    /** Quem precisa agir agora (online, o relógio do turno corre para eles). */
    function quemDeve(estado) {
        if (estado.fase === 'fim') return [];
        if (estado.fase === 'banimento') return [0, 1].filter((j) => !estado.banimento.feitos[j]);
        if (estado.fase === 'preparacao') return [0, 1].filter((j) => !estado.jogadores[j].preparado);
        if (estado.pendentes.length) return [...new Set(estado.pendentes.map((p) => p.jogador))];
        return [estado.vez];
    }

    /**
     * Os eventos de uma jogada como esse jogador pode ver: some o que é privado de outro
     * (a Câmera) e a carta que o outro comprou vira só "comprou uma carta".
     */
    function eventosPara(eventos, j) {
        const saida = [];
        for (const ev of eventos) {
            if (ev.privado && ev.jogador !== j) continue;
            if (ev.tipo === 'compra' && ev.jogador !== j) {
                saida.push({ tipo: 'compra', jogador: ev.jogador, motivo: ev.motivo });
                continue;
            }
            // Carta da mão devolvida ao baralho: o outro só sabe que uma carta voltou.
            if (ev.tipo === 'devolver' && ev.de === 'mao' && ev.jogador !== j) {
                saida.push({ tipo: 'devolver', jogador: ev.jogador, de: 'mao', motivo: ev.motivo });
                continue;
            }
            saida.push(ev);
        }
        return saida;
    }

    /** Refaz a partida do zero (o servidor confere o resultado assim). */
    function repetir(config, jogadas) {
        let estado = criarPartida(config);
        for (const jogada of jogadas) estado = aplicar(estado, jogada).estado;
        return estado;
    }

    return {
        TAMANHO_DECK, MAX_COPIAS, MAX_COPIAS_LENDARIO, MAX_LENDARIAS_CUSTOM, MAO_INICIAL, VAGAS_BANCO, LIMITE_TURNOS,
        ESCALA, VIDA_INICIAL, DANO_NOCAUTE, JOGADOR, PROTECAO_ATIVO, DEVOLVER_MAO_POR_TURNO, DEVOLVER_MESA_POR_TURNO,
        REGRAS_VERSAO, AURAS_POR_TURNO, AURAS_MAX_POR_CARTA_NO_TURNO, JogadaInvalida, BANIDAS_POR_JOGADOR, banivel, quantasBanir,
        validarDeck, criarPartida, aplicar, jogadasValidas, motivoInvalida, visaoDe, eventosPara, quemDeve, repetir,
        rodadaDe, RODADAS_MAX, hpMax, custoRecuo, calcularDano, danoNocaute, ehLutador, ehCampo, combate, tipoDe, naMesa, silenciado, virada,
    };
});
