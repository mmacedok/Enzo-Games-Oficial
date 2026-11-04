// >>> AVISO PARA IAs E DEVS: antes de editar este arquivo leia docs/GUIA-IA-CARTAS.md (erros que já aconteceram + checklist).
// >>> Motor determinístico (sem Math.random/Date), estado só JSON, campo novo de carta em limparExtrasInstancia(); mudou regra: suba REGRAS_VERSAO + docs/BATALHA-CHANGELOG.md.
// >>> Antes de dizer que terminou: node --test test/contrato-cartas.test.js && npm test. Não afrouxe teste para passar.
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
    const REGRAS_VERSAO = 15;
    const TAMANHO_DECK = 15;
    const MAX_COPIAS = 2;
    /** Auras que se prende por turno. Em cada turno, só 1 por personagem (v14); a exceção é o 1º turno de quem joga em segundo. */
    const AURAS_POR_TURNO = 3;
    const AURAS_MAX_POR_CARTA_NO_TURNO = 1;
    /** Só no turno 2 (o 1º turno de quem começa em segundo) dá para pôr 2 Auras no mesmo personagem. */
    const AURAS_MAX_NO_TURNO_DO_SEGUNDO = 2;
    const auraMaxNaCarta = (turno) => (turno === 2 ? AURAS_MAX_NO_TURNO_DO_SEGUNDO : AURAS_MAX_POR_CARTA_NO_TURNO);
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

    /** Quantas cartas complementares (anexos) cabem deitadas atrás de um mesmo lutador. */
    const ANEXOS_POR_LUTADOR = 1;

    // ---- Cartas ---------------------------------------------------------------
    /**
     * Tipos de carta (o `tipo` de js/baralho-dados.js) e o MODO de cada um. O modo diz como a carta entra no jogo e qual
     * jogada a põe na mesa; o resto do motor pergunta pelo modo, nunca pelo nome do tipo.
     *   lutador: vai para a mesa (ativo ou banco), ataca e leva dano. Jogada `baixar`.
     *   campo:   fica no meio da mesa e vale para os dois. Jogada `campo`.
     *   anexo:   carta complementar, deitada atrás de um lutador; muda só aquele lutador (números, ataques, poder,
     *            aparência) e sai junto com ele. Jogada `anexar`. Os números ficam em `COMBATE[id].anexo` (js/tcg-cartas.js).
     * Tipo novo com um modo que já existe = só uma linha aqui. Jeito novo de jogar = modo novo aqui, em MODOS
     * e nos `case` de motivoInvalida/executar.
     */
    const TIPOS = {
        personagem: { modo: 'lutador', nome: 'Personagem' },
        goon: { modo: 'lutador', nome: 'Capanga' },
        campo: { modo: 'campo', nome: 'Campo' },
        resenha: { modo: 'anexo', nome: 'Resenha' },
    };
    /** Por modo: a jogada que tira a carta da mão. */
    const MODOS = {
        lutador: { jogada: 'baixar' },
        campo: { jogada: 'campo' },
        anexo: { jogada: 'anexar' },
    };
    const tipoDe = (id) => Baralho.carta(id)?.tipo || null;
    const modoDe = (id) => TIPOS[tipoDe(id)]?.modo || null;
    /** A jogada que põe essa carta da mão na mesa (a tela e o robô usam). */
    const jogadaDaCarta = (id) => MODOS[modoDe(id)]?.jogada || null;
    const ehLutador = (id) => modoDe(id) === 'lutador';
    const ehCampo = (id) => modoDe(id) === 'campo';
    const ehAnexo = (id) => modoDe(id) === 'anexo';
    const combate = (id) => COMBATE[id] || null;
    /** Tags da carta (`COMBATE[id].tags`), para efeitos do tipo "toda carta Degustador". */
    const tagsDe = (id) => combate(id)?.tags || [];
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
            if (!Baralho.cartaLiberada(id)) { erros.push(`${carta.nome}: essa carta ainda não foi lançada.`); continue; }
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
        // anexos: cartas complementares deitadas atrás desta (cada uma é uma instância com `dono` e `restam`).
        return { uid, id, dano: 0, aura: 0, estados: { notificado: false, iludido: false, silenciado: 0, virada: 0 }, escudo: null, anexos: [] };
    }
    function flagsDoTurno() {
        return { auras: AURAS_POR_TURNO, auraEm: {}, reforco: 0, campo: false, recuo: false, trocarCarta: false, moverAuraSuperkid: false, poderes: [], devolvidasMao: 0, devolvidasMesa: 0, bonusDanoTurno: {} };
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

    /**
     * Ficha de combate de um lutador como ele está AGORA: a carta mais o que as cartas complementares (anexos) atrás
     * dele mudam. Toda regra que lê HP, recuo, ataques, poder, tags ou aparência de uma carta na mesa passa por aqui
     * (a tela e o robô também), então carta nova que muda um lutador só precisa mexer nesta função.
     * Campos de `COMBATE[id].anexo` que mudam a ficha (todos opcionais; números na escala pequena):
     *   hp, recuo     somam (o recuo nunca fica abaixo de 0)
     *   dano          soma em todo ataque que já dá dano
     *   reducao       tira dos golpes que o lutador recebe
     *   custo         soma no custo de Aura dos ataques (mínimo 0)
     *   ataques       ataques a mais (entram depois dos dele)
     *   trocaAtaques  ataques no lugar dos dele
     *   efeitosAtaque efeitos a mais em todo ataque dele (mesma lista de efeitos dos ataques)
     *   poder         poder no lugar do dele
     *   tags          tags a mais
     *   visual        { arte, nome, raridade }: muda como a carta aparece (arte = id de uma arte de assets/Cartas)
     */
    function ficha(estado, inst) {
        const base = combate(inst.id) || {};
        const f = { hp: base.hp || 0, recuo: base.recuo || 0, ataques: base.ataques || [], poder: base.poder || null,
            dano: 0, reducao: 0, tags: tagsDe(inst.id), visual: null, metadeDano: false };
        if (inst.transformado === 'ezreal') {
            f.ataques = [
                { nome: 'Super Disparo Místico 40/0/100', custo: 1, dano: 30 },
                { nome: 'Super Au! Aura!', custo: 1, dano: 40 },
                { nome: 'Barragem Incendiária 40/0/100', custo: 4, dano: 0, efeitos: [{ tipo: 'sacrificarEDestruir2' }] },
            ];
            f.visual = { arte: 'assets/Cartas/pmldm-ezreal.png', nome: 'Super Itallo Lendário de EZREAL 40/0/100', raridade: 'lendario' };
            f.poder = { nome: 'Dano em Área', tipo: 'splashItallo', ativavel: false, texto: 'Todo dano causado atinge o time inimigo inteiro.' };
            f.imuneBanco = true;
            f.imuneEstados = true;
            f.reducao = 10;
            f.dano = 10;
            f.hp = (f.hp || 120) + 20;
        }
        const anexos = inst.anexos || [];
        if (!anexos.length) return f;
        let ataques = f.ataques;
        let custo = 0;
        const extras = [];
        const efeitosExtras = [];
        for (const a of anexos) {
            const ax = combate(a.id)?.anexo;
            if (!ax) continue;
            f.hp += ax.hp || 0;
            f.recuo += ax.recuo || 0;
            f.dano += ax.dano || 0;
            f.reducao += ax.reducao || 0;
            custo += ax.custo || 0;
            if (ax.metadeDano) f.metadeDano = true;
            if (ax.trocaAtaques) ataques = ax.trocaAtaques;
            if (ax.ataques) extras.push(...ax.ataques);
            if (ax.efeitosAtaque) efeitosExtras.push(...ax.efeitosAtaque);
            if (ax.poder) f.poder = ax.poder;
            if (ax.tags) f.tags = [...f.tags, ...ax.tags];
            if (ax.visual) f.visual = { ...(f.visual || {}), ...ax.visual };
        }
        f.recuo = Math.max(0, f.recuo);
        f.ataques = [...ataques, ...extras].map((at) => (custo || efeitosExtras.length
            ? { ...at, custo: Math.max(0, at.custo + custo), efeitos: [...(at.efeitos || []), ...efeitosExtras] }
            : at));
        return f;
    }
    const poderDe = (estado, inst) => ficha(estado, inst).poder;

    function hpMax(estado, inst) {
        const base = ficha(estado, inst).hp + (inst.hpPermanente || 0);
        const campo = efeitoCampo(estado);
        const extraCampo = (campo?.tipo === 'mansao' && tipoDe(inst.id) === 'goon' && !inst.hpPermanente) ? campo.hpGoon : 0;
        return (base + extraCampo) * ESCALA;
    }
    function custoRecuo(estado, inst) {
        const campo = efeitoCampo(estado);
        if (campo?.tipo === 'recuoGratisGoon' && tipoDe(inst.id) === 'goon') return 0;
        return ficha(estado, inst).recuo;
    }

    /** Total de Auras nas cartas da mesa de um jogador, e desconto das primeiras Auras encontradas. */
    const totalAuraMesa = (jogador) => naMesa(jogador).reduce((s, c) => s + (c.aura || 0), 0);
    function gastarAuraMesa(jogador, qtd, eventos) {
        let falta = qtd;
        for (const c of naMesa(jogador)) {
            if (falta <= 0) break;
            const tira = Math.min(c.aura || 0, falta);
            if (tira > 0) {
                c.aura -= tira;
                falta -= tira;
                eventos.push({ tipo: 'aura', uid: c.uid, valor: -tira, aura: c.aura, fonte: 'custo' });
            }
        }
    }

    /**
     * Em quem a carta complementar pode deitar (`anexo.em`, tudo opcional):
     *   lado: 'meu' (padrão) | 'dele' | 'qualquer' · lugar: 'ativo' | 'banco'
     *   tipos: ['personagem', 'goon'] · cartas: [ids] · tags: [tags] (basta uma)
     * Erro (texto) ou null.
     */
    function erroDoAnexo(estado, j, ax, alvo) {
        const em = ax.em || {};
        const eu = estado.jogadores[j];
        const dono = estado.jogadores.findIndex((jg) => naMesa(jg).includes(alvo));
        const lado = em.lado || 'meu';
        if (lado === 'meu' && dono !== j) return 'essa carta vai atrás de um lutador seu';
        if (lado === 'dele' && dono === j) return 'essa carta vai atrás de um lutador do adversário';
        if (!ax.soAoEntrar && (alvo.anexos || []).length >= (ax.maxNoLutador || ANEXOS_POR_LUTADOR)) return 'esse lutador já tem uma carta atrás dele';
        const ehAtivo = estado.jogadores[dono].ativo === alvo;
        if (em.lugar === 'ativo' && !ehAtivo) return 'essa carta só vai atrás do ativo';
        if (em.lugar === 'banco' && ehAtivo) return 'essa carta só vai atrás de quem está no banco';
        if (em.tipos && !em.tipos.includes(tipoDe(alvo.id))) return 'essa carta não combina com esse lutador';
        if (em.cartas && !em.cartas.includes(alvo.id)) return 'essa carta não combina com esse lutador';
        if (em.tags && !em.tags.some((t) => ficha(estado, alvo).tags.includes(t))) return 'essa carta não combina com esse lutador';
        if (ax.custoAuraJogador && totalAuraMesa(eu) < ax.custoAuraJogador) return `precisa de ${ax.custoAuraJogador} Aura nas suas cartas`;
        if (ax.exigeVidaExata !== undefined && (hpMax(estado, alvo) - alvo.dano) !== ax.exigeVidaExata * ESCALA) {
            return `o alvo precisa ter exatamente ${ax.exigeVidaExata * ESCALA} de vida`;
        }
        if (ax.exigeVirado && !virada(estado, alvo)) return 'o alvo precisa estar virado';
        if (ax.exigeAliadoTag && !naMesa(eu).some((c) => ficha(estado, c).tags.includes(ax.exigeAliadoTag))) {
            return `precisa ter uma carta ${ax.exigeAliadoTag} na sua mesa`;
        }
        return null;
    }
    const silenciado = (estado, inst) => inst.estados.silenciado >= estado.turno;
    /** Virada para baixo pela recarga: não ataca, não usa poder e não recua (continua levando golpe). */
    const virada = (estado, inst) => (inst.estados.virada || 0) >= estado.turno;
    /** Quantas cartas: na visão de um jogador, a mão do outro e os decks viram só um número. */
    const qtd = (lista) => (Array.isArray(lista) ? lista.length : Number(lista) || 0);
    const acharNaMao = (jogador, uid) => jogador.mao.find((c) => c.uid === uid) || null;
    const acharNaMesa = (jogador, uid) => naMesa(jogador).find((c) => c.uid === uid) || null;
    /** Cabo Côco no ativo do adversário ou Caiam no banco impede jogar/trocar campos. */
    const camposBanidos = (estado, j) => {
        const ativo = estado.jogadores[outro(j)].ativo;
        return !!ativo && poderDe(estado, ativo)?.tipo === 'banirCampos';
    };
    const campoTravado = (estado) => estado.jogadores.some((jg) => jg.banco.some((c) => poderDe(estado, c)?.tipo === 'travarCampo'));
    const superkidProtegido = (estado, dono) => estado.jogadores[dono]?.banco.some((c) => poderDe(estado, c)?.tipo === 'protegerSuperkid');
    /** Quem começa não ataca no 1º turno. */
    const podeAtacarNoTurno = (estado) => estado.turno > 1;

    /**
     * Dano final do ataque (sem moeda: para a tela mostrar a previsão).
     * `alvo`: a carta, ou JOGADOR (aí o ativo do dono, se houver, segura 65% do golpe).
     */
    /**
     * Efeitos de ataque que mudam o número do dano (escala pequena). Cada um recebe o dano até agora e devolve o novo.
     * Efeito novo de dano = uma entrada aqui; os outros efeitos ficam em EFEITOS.
     */
    const BONUS_DANO = {
        moeda: (dano, ef, c) => (c.resultadoMoeda === false ? ef.coroa : ef.cara),
        bonusPorAura: (dano, ef, c) => dano + ef.valor * c.atacante.aura,
        bonusSeAliado: (dano, ef, c) => dano + (naMesa(c.eu).some((x) => x !== c.atacante && x.id === ef.carta) ? ef.valor : 0),
        bonusPorGoon: (dano, ef, c) => dano + ef.valor * naMesa(c.eu).filter((x) => tipoDe(x.id) === 'goon').length,
    };

    function calcularDano(estado, j, ataque, alvo, { resultadoMoeda } = {}) {
        const eu = estado.jogadores[j];
        const atacante = eu.ativo;
        let dano = ataque.dano;
        const contexto = { eu, atacante, resultadoMoeda };
        for (const ef of ataque.efeitos || []) {
            if (BONUS_DANO[ef.tipo]) dano = BONUS_DANO[ef.tipo](dano, ef, contexto);
        }
        const bonusBanco = eu.banco.map((c) => poderDe(estado, c)).filter((p) => p?.tipo === 'bonusDoBanco');
        if (dano > 0 && bonusBanco.length) dano += Math.max(...bonusBanco.map((p) => p.valor));
        // Carta complementar atrás do atacante ou bônus do turno que soma no dano.
        const fAtacante = atacante ? ficha(estado, atacante) : null;
        const extra = (fAtacante ? fAtacante.dano : 0) + (atacante ? (eu.flags?.bonusDanoTurno?.[atacante.uid] || 0) : 0);
        if (dano > 0 && extra) dano = Math.max(0, dano + extra);
        dano *= ESCALA;
        if (fAtacante?.metadeDano) dano = Math.floor(dano / 2);
        if (alvo === JOGADOR) {
            if (estado.jogadores[outro(j)].ativo && !(ataque.efeitos || []).some((e) => e.tipo === 'danoDiretoJogador')) {
                dano = Math.floor(dano * PROTECAO_ATIVO);
            }
            return Math.max(0, dano);
        }
        // Carta complementar atrás do alvo que segura parte do golpe.
        if (alvo && dano > 0) dano -= ficha(estado, alvo).reducao * ESCALA;
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
                const cb = combate(c.id);
                if (cb?.soBanco && !eu.ativo) return 'essa carta só vai para o banco';
                if (cb?.exigeCampo && estado.campo?.carta.id !== cb.exigeCampo) return 'precisa do campo exigido na mesa';
                const proibido = (a, b) => {
                    const p = combate(a)?.proibidoCom;
                    return Array.isArray(p) ? p.includes(b) : p === b;
                };
                if (naMesa(eu).some((x) => proibido(c.id, x.id) || proibido(x.id, c.id))) {
                    return 'não pode ficar na mesa junto com essa carta';
                }
                return null;
            }
            case 'anexar': {
                const c = acharNaMao(eu, jogada.uid);
                if (!c || !ehAnexo(c.id)) return 'essa carta não vai atrás de um lutador';
                const alvo = acharNaMesa(eu, jogada.alvo) || acharNaMesa(ele, jogada.alvo);
                if (!alvo) return 'escolha o lutador que fica com a carta';
                if (jogada.descartes !== undefined) {
                    const d = jogada.descartes;
                    if (!Array.isArray(d) || d.length > 2 || new Set(d).size !== d.length) return 'escolha até 2 cartas diferentes para descartar';
                    if (d.some((u) => u === c.uid || !acharNaMao(eu, u))) return 'só dá para descartar outras cartas da sua mão';
                }
                return erroDoAnexo(estado, j, combate(c.id).anexo, alvo);
            }
            case 'aura': {
                if (f.auras <= 0) return 'você já prendeu a Aura deste turno';
                const alvo = acharNaMesa(eu, jogada.alvo);
                if (!alvo) return 'a Aura vai para uma carta sua na mesa';
                if (alvo === eu.ativo && f.auras <= f.reforco) return 'a Aura de Reforço vai para o banco';
                const maxNaCarta = auraMaxNaCarta(estado.turno);
                if ((f.auraEm?.[alvo.uid] || 0) >= maxNaCarta) return maxNaCarta === 1 ? 'só 1 Aura por personagem em cada turno (a outra vai para outra carta)' : `no máximo ${maxNaCarta} Auras na mesma carta neste turno`;
                return null;
            }
            case 'campo': {
                const c = acharNaMao(eu, jogada.uid);
                if (!c || !ehCampo(c.id)) return 'essa carta não é um campo';
                if (f.campo) return 'só 1 campo por turno';
                if (estado.campo?.carta.id === c.id) return 'esse campo já está na mesa';
                if (camposBanidos(estado, j)) return 'Conteúdo Banido: o ativo do adversário não deixa jogar campos';
                if (estado.campo && campoTravado(estado)) return 'Guarda do Butico: Caiam no banco não deixa trocar o campo';
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
                const poder = c && poderDe(estado, c);
                if (!poder || !poder.ativavel) return 'essa carta não tem poder para usar';
                if (f.poderes.includes(c.uid)) return 'esse poder já foi usado neste turno';
                if (virada(estado, c)) return 'carta virada (recarga) não usa poder';
                if (poder.tipo === 'notificarAtivo' && !ele.ativo) return 'o adversário não tem ativo';
                if (poder.tipo === 'comprar' && !qtd(eu.deck)) return 'seu deck acabou';
                if (poder.tipo === 'comprarSeDegustador') {
                    if (!naMesa(eu).some((x) => ficha(estado, x).tags.includes('degustador'))) return 'precisa de um Degustador na sua mesa';
                    if (!qtd(eu.deck)) return 'seu deck acabou';
                }
                if (poder.tipo === 'roubarAuraVape') {
                    if (!naMesa(ele).some((x) => x.aura > 0)) return 'o adversário não tem Aura na mesa';
                    if (jogada.alvo !== undefined && !acharNaMesa(eu, jogada.alvo)) return 'escolha quem recebe a Aura na sua mesa';
                }
                if (poder.tipo === 'puxar') {
                    if (!ele.ativo) return 'o adversário não tem ativo';
                    if (!ele.banco.length) return 'o adversário não tem ninguém no banco';
                    if (!ele.banco.some((x) => x.uid === jogada.alvo)) return 'escolha quem vem do banco dele';
                }
                if (poder.tipo === 'espiarMao' && !qtd(ele.mao)) return 'a mão do adversário está vazia';
                return null;
            }
            case 'moverAuraSuperkid': {
                if (efeitoCampo(estado)?.tipo !== 'moverAuraSuperkid') return 'só no campo Clubexx';
                if (f.moverAuraSuperkid) return 'só 1 vez por turno';
                const sk = naMesa(eu).find((x) => x.id === 'superkid' && x.aura > 0);
                if (!sk) return 'precisa de um Super Kid com Aura';
                const alvo = eu.banco.find((x) => x.uid === jogada.alvo && x !== sk);
                if (!alvo) return 'escolha outra carta no seu banco';
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
                const ataque = ficha(estado, atacante).ataques[jogada.ataque];
                if (!ataque) return 'ataque desconhecido';
                if (silenciado(estado, atacante)) return 'Silenciado não ataca';
                if (virada(estado, atacante)) return 'carta virada (recarga) não ataca';
                if (atacante.aura < ataque.custo) return `precisa de ${ataque.custo} de Aura`;
                if (ataque.semAuraRoubada && (atacante.aura - (atacante.auraRoubada || 0)) < ataque.custo) {
                    return 'não pode usar Aura roubada nesse ataque';
                }
                const puxa = (ataque.efeitos || []).some((e) => e.tipo === 'puxar');
                // Qualquer ataque pode ir no jogador, mesmo com o ativo dele na mesa (o Puxar não:
                // ele só serve para trazer alguém do banco).
                if (jogada.alvo === JOGADOR) return puxa ? 'esse ataque não acerta o jogador' : null;
                if (!ele.ativo) return 'o adversário não tem ativo: ataque o jogador';
                if (ataque.alvo === 'qualquer') {
                    const alvo = acharNaMesa(ele, jogada.alvo);
                    if (!alvo) return 'escolha o alvo';
                    if (alvo !== ele.ativo && efeitoCampo(estado)?.tipo === 'protegeBanco') return 'São João do Butico protege o banco';
                    if (alvo !== ele.ativo && ficha(estado, alvo).imuneBanco) return 'esse alvo é imune a ataques no banco';
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
    function limparExtrasInstancia(inst) {
        delete inst.dono;
        delete inst.restam;
        delete inst.hpPermanente;
        delete inst.transformado;
        delete inst.turnosRestantes;
        delete inst.venenoTeemo;
        delete inst.auraRoubada;
        delete inst.emprestimosAura;
        delete inst.roubosVape;
    }
    function paraDescarte(jogador, inst) {
        inst.dano = 0;
        inst.aura = 0;
        inst.escudo = null;
        limparEstados(inst);
        inst.estados.virada = 0;   // a recarga não sai no banco (é do ataque), só no descarte
        limparExtrasInstancia(inst);
        jogador.descarte.push(inst);
    }
    /** Devolve a carta ao baralho do dono, limpa (sem dano, Aura nem estados), e embaralha. */
    function paraOBaralho(estado, jogador, inst, eventos = []) {
        const naMesaAntes = naMesa(jogador).includes(inst);
        const eraDegustador = ficha(estado, inst).tags.includes('degustador');
        const idxDono = estado.jogadores.indexOf(jogador);
        if (inst.venenoTeemo > 0 && idxDono >= 0) {
            const danoRestante = Math.floor((inst.venenoTeemo * 250) / 2);
            ferirJogador(estado, idxDono, danoRestante, eventos, 'venenoTeemo');
        }
        if ((naMesaAntes || eraDegustador) && eraDegustador && efeitoCampo(estado)?.tipo === 'protegeBanco') {
            const outroDeg = jogador.banco.find((c) => c !== inst && ficha(estado, c).tags.includes('degustador'));
            if (outroDeg) {
                outroDeg.aura++;
                eventos.push({ tipo: 'aura', uid: outroDeg.uid, valor: 1, aura: outroDeg.aura, fonte: 'campo' });
            }
        }
        inst.dano = 0;
        inst.aura = 0;
        inst.escudo = null;
        limparEstados(inst);
        inst.estados.virada = 0;
        limparExtrasInstancia(inst);
        jogador.deck.push(inst);
        embaralhar(estado, jogador.deck);
    }

    /** Mansão do Inominável dá +400 de vida permanente aos goons na mesa (só sai se a carta sair de jogo). */
    function aplicarMansaoPermanente(estado) {
        const campo = efeitoCampo(estado);
        if (campo?.tipo !== 'mansao') return;
        for (const jg of estado.jogadores) {
            for (const inst of naMesa(jg)) {
                if (tipoDe(inst.id) === 'goon') inst.hpPermanente = campo.hpGoon;
            }
        }
    }

    /**
     * Tira uma carta complementar de trás do lutador e manda para o descarte de quem a jogou. Se ela dava HP e o
     * lutador estava de pé, ele fica com 1 de vida em vez de cair (como na saída da Mansão).
     */
    function soltarAnexo(estado, host, anexo, eventos, motivo) {
        const idx = (host.anexos || []).indexOf(anexo);
        if (idx < 0) return;
        const vivo = host.dano < hpMax(estado, host);
        host.anexos.splice(idx, 1);
        const dono = anexo.dono;
        paraDescarte(estado.jogadores[dono], anexo);
        eventos.push({ tipo: 'anexoSai', jogador: dono, uid: anexo.uid, id: anexo.id, de: host.uid, motivo });
        if (vivo && host.dano >= hpMax(estado, host)) host.dano = hpMax(estado, host) - 1;
    }
    /** O lutador saiu da mesa: as cartas atrás dele vão juntas para o descarte de quem as jogou. */
    function largarAnexos(estado, host, eventos, motivo) {
        for (const anexo of (host.anexos || []).slice()) {
            host.anexos.splice(host.anexos.indexOf(anexo), 1);
            const dono = anexo.dono;
            paraDescarte(estado.jogadores[dono], anexo);
            eventos.push({ tipo: 'anexoSai', jogador: dono, uid: anexo.uid, id: anexo.id, de: host.uid, motivo });
        }
    }
    /** Gasta um uso (`usos`) ou um turno (`turnos`) das cartas atrás do lutador; a que zera sai. */
    function gastarAnexos(estado, host, campo, eventos, filtro = () => true) {
        for (const anexo of (host.anexos || []).slice()) {
            if (!filtro(anexo) || !(anexo.restam?.[campo] > 0)) continue;
            anexo.restam[campo]--;
            if (anexo.restam[campo] === 0) soltarAnexo(estado, host, anexo, eventos, campo === 'usos' ? 'usada' : 'prazo');
        }
    }
    function tirarDaMao(jogador, uid) {
        const i = jogador.mao.findIndex((c) => c.uid === uid);
        return jogador.mao.splice(i, 1)[0];
    }
    function darDano(estado, inst, valor, eventos, fonte) {
        if (valor <= 0) return;
        const dono = estado.jogadores.findIndex((jg) => naMesa(jg).includes(inst));
        if (dono >= 0 && inst.id === 'superkid' && superkidProtegido(estado, dono)) {
            if (fonte !== 'ataque') {
                eventos.push({ tipo: 'imune', uid: inst.uid, fonte });
                return;
            }
            const max = hpMax(estado, inst);
            if (inst.dano === 0 && valor >= max) valor = max - ESCALA;
        }
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
                largarAnexos(estado, inst, eventos, 'nocaute');
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
        if (eu.auraExtraProximoTurno > 0) {
            eu.flags.auras += eu.auraExtraProximoTurno;
            eu.auraExtraProximoTurno = 0;
        }
        // Tiago Cássio: devolve a Aura roubada após 1 turno.
        for (const jg of estado.jogadores) {
            for (const inst of naMesa(jg)) {
                if (!inst.emprestimosAura?.length) continue;
                const restantes = [];
                for (const emp of inst.emprestimosAura) {
                    if (estado.turno >= emp.devolverNoTurno) {
                        const devolve = Math.min(inst.aura, emp.qtd);
                        inst.aura -= devolve;
                        inst.auraRoubada = Math.max(0, (inst.auraRoubada || 0) - emp.qtd);
                        const donoOrig = acharNaMesa(estado.jogadores[0], emp.deUid) || acharNaMesa(estado.jogadores[1], emp.deUid);
                        if (donoOrig && devolve > 0) {
                            donoOrig.aura += devolve;
                            eventos.push({ tipo: 'devolverAura', de: inst.uid, para: donoOrig.uid, valor: devolve });
                        }
                    } else {
                        restantes.push(emp);
                    }
                }
                if (restantes.length) inst.emprestimosAura = restantes;
                else delete inst.emprestimosAura;
            }
        }
        eu.espiada = null;
        eventos.push({ tipo: 'turno', jogador: j, turno: estado.turno });
        const campo = efeitoCampo(estado);
        if (campo?.tipo === 'curaInicio') curarMesa(eu, campo.valor * ESCALA, eventos);
        const extra = campo?.tipo === 'compraExtra' && eu.mao.length <= campo.limiteMao;
        comprar(estado, j, eventos);
        if (extra) comprar(estado, j, eventos, 'campo');
    }

    /** Entre um turno e outro: Notificado, Veneno do Teemo e Lavras MG agem. */
    function fimDeTurno(estado, eventos) {
        eventos.push({ tipo: 'fimTurno', jogador: estado.vez, turno: estado.turno });
        const campo = efeitoCampo(estado);
        const veneno = campo?.tipo === 'mansao' ? campo.veneno * ESCALA : VENENO;
        for (const eu of estado.jogadores) {
            if (eu.ativo?.estados.notificado) darDano(estado, eu.ativo, veneno, eventos, 'notificado');
            for (const inst of naMesa(eu)) {
                if (inst.venenoTeemo > 0) {
                    darDano(estado, inst, 250, eventos, 'venenoTeemo');
                    inst.venenoTeemo--;
                    if (inst.venenoTeemo <= 0) delete inst.venenoTeemo;
                }
            }
        }
        // Lavras MG: no final de cada turno do dono, o Super Kid vira e ganha +1 Aura; dura 2 turnos.
        const jogadorVez = estado.jogadores[estado.vez];
        for (const lavras of jogadorVez.banco.filter((c) => c.id === 'lavras-mg')) {
            const sk = naMesa(jogadorVez).find((c) => c.id === 'superkid');
            if (sk) {
                sk.estados.virada = estado.turno + 2;
                sk.aura++;
                eventos.push({ tipo: 'lavras', uid: sk.uid, aura: sk.aura });
            }
            lavras.turnosRestantes = (lavras.turnosRestantes ?? 2) - 1;
            if (lavras.turnosRestantes <= 0) {
                jogadorVez.banco.splice(jogadorVez.banco.indexOf(lavras), 1);
                largarAnexos(estado, lavras, eventos, 'prazo');
                paraDescarte(jogadorVez, lavras);
                eventos.push({ tipo: 'expira', uid: lavras.uid, id: lavras.id });
            }
        }
        // Cartas complementares com prazo (`turnos`): conta um turno de quem as jogou.
        for (const jg of estado.jogadores) {
            for (const inst of naMesa(jg)) gastarAnexos(estado, inst, 'turnos', eventos, (a) => a.dono === estado.vez);
        }
        verificarNocautes(estado, eventos);
        if (estado.fase === 'fim') return;
        if (estado.turno >= LIMITE_TURNOS && !estado.pendentes.length) {
            encerrar(estado, quemTemMaisVida(estado), 'limiteTurnos', eventos);
            return;
        }
        seguir(estado, 'proximoTurno', eventos);
    }

    /**
     * O que cada efeito faz (fora os que só mudam o número do dano, em BONUS_DANO). Valem nos `efeitos` dos ataques,
     * nos `efeitosAtaque` e no `aoEntrar` das cartas complementares. Efeito novo = uma entrada aqui.
     * ctx: { estado, eventos, j (quem joga), eu, ele, si (a carta do efeito: o atacante, ou o lutador que recebeu a
     * carta complementar), alvo (a carta acertada, ou null), jogada, fonte ('ataque' | 'anexo') }.
     */
    const EFEITOS = {
        estado({ estado, eventos, ele, alvo }, ef) {
            if (!alvo || alvo !== ele.ativo) return;   // estados só pegam no ativo
            if (ficha(estado, alvo).imuneEstados) {
                eventos.push({ tipo: 'imune', uid: alvo.uid, estado: ef.estado });
                return;
            }
            if (ef.estado === 'silenciado') {
                // Quem acabou de ficar Silenciado não pode ser silenciado de novo no turno seguinte
                // (senão dois Moderadores travam o ativo do outro para sempre).
                if (alvo.estados.silenciado > 0 && alvo.estados.silenciado >= estado.turno - 1) {
                    eventos.push({ tipo: 'imune', uid: alvo.uid, estado: ef.estado });
                    return;
                }
                alvo.estados.silenciado = estado.turno + 1;
            } else {
                alvo.estados[ef.estado] = true;
            }
            eventos.push({ tipo: 'estado', uid: alvo.uid, estado: ef.estado });
        },
        curarSi({ eventos, si, fonte }, ef) {
            const valor = Math.min(ef.valor * ESCALA, si.dano);
            if (valor > 0) {
                si.dano -= valor;
                eventos.push({ tipo: 'cura', uid: si.uid, valor, fonte });
            }
        },
        danoSi({ estado, eventos, si }, ef) {
            darDano(estado, si, ef.valor * ESCALA, eventos, 'proprioAtaque');
        },
        escudo({ estado, eventos, si }, ef) {
            si.escudo = { valor: ef.valor * ESCALA, ate: estado.turno + 1 };
            eventos.push({ tipo: 'escudo', uid: si.uid, valor: si.escudo.valor });
        },
        auraSi({ eventos, si, fonte }, ef) {
            si.aura += ef.valor;
            eventos.push({ tipo: 'aura', uid: si.uid, valor: ef.valor, aura: si.aura, fonte });
        },
        puxar({ eventos, j, ele, jogada }) {
            const puxado = ele.banco.find((c) => c.uid === jogada.alvo);
            if (!puxado) return;
            const antigo = ele.ativo;
            ele.banco[ele.banco.indexOf(puxado)] = antigo;
            limparEstados(antigo);
            ele.ativo = puxado;
            eventos.push({ tipo: 'troca', jogador: outro(j), sai: antigo.uid, entra: puxado.uid, motivo: 'puxar' });
        },
        descartarCampo({ estado, eventos }) {
            if (!estado.campo || campoTravado(estado)) return;
            aplicarMansaoPermanente(estado);
            const vivosAntes = vivosNaMesa(estado);
            const { carta, dono } = estado.campo;
            paraDescarte(estado.jogadores[dono], carta);
            estado.campo = null;
            segurarAposCampo(estado, vivosAntes);
            eventos.push({ tipo: 'campoSai', id: carta.id, uid: carta.uid });
        },
        custoAuraMesa({ eu, eventos }, ef) {
            gastarAuraMesa(eu, ef.valor, eventos);
        },
        smiteSemNocaute({ estado, eventos, j, ele, alvo }) {
            if (!alvo || alvo !== ele.ativo) return;
            if (alvo.id === 'superkid' && superkidProtegido(estado, outro(j))) {
                eventos.push({ tipo: 'imune', uid: alvo.uid });
                return;
            }
            ele.ativo = null;
            paraDescarte(ele, alvo);
            largarAnexos(estado, alvo, eventos, 'destruido');
            eventos.push({ tipo: 'destruido', jogador: outro(j), uid: alvo.uid, id: alvo.id });
        },
        voltarParaMao({ estado, eventos, j, ele, alvo }) {
            if (!alvo || !ele.banco.includes(alvo)) return;
            ele.banco.splice(ele.banco.indexOf(alvo), 1);
            largarAnexos(estado, alvo, eventos, 'devolvida');
            alvo.dano = 0;
            alvo.aura = 0;
            alvo.escudo = null;
            limparEstados(alvo);
            alvo.estados.virada = 0;
            limparExtrasInstancia(alvo);
            ele.mao.push(alvo);
            eventos.push({ tipo: 'voltarMao', jogador: outro(j), uid: alvo.uid, id: alvo.id });
        },
        darFF({ estado, eventos, j, si, fonte }) {
            const cura = Math.min(30 * ESCALA, si.dano);
            if (cura > 0) {
                si.dano -= cura;
                eventos.push({ tipo: 'cura', uid: si.uid, valor: cura, fonte });
            }
            if (estado.ultimoDarFF && estado.ultimoDarFF.jogador !== j && estado.ultimoDarFF.turno >= estado.turno - 1) {
                ferirJogador(estado, 0, 50 * ESCALA, eventos, 'darFF');
                ferirJogador(estado, 1, 50 * ESCALA, eventos, 'darFF');
                estado.ultimoDarFF = null;
            } else {
                estado.ultimoDarFF = { jogador: j, turno: estado.turno };
            }
        },
        quartaFeira({ estado, eventos, j, eu, ele, si, jogada }) {
            let descartou = 0;
            // O jogador escolhe quais cartas descartar (`jogada.descartes`, até 2); sem escolha (bots), saem as 2 primeiras.
            const escolhidas = Array.isArray(jogada?.descartes)
                ? jogada.descartes.map((u) => eu.mao.find((c) => c.uid === u)).filter(Boolean)
                : eu.mao.slice(0, 2);
            for (const desc of escolhidas) {
                eu.mao.splice(eu.mao.indexOf(desc), 1);
                paraDescarte(eu, desc);
                descartou++;
                eventos.push({ tipo: 'descarte', jogador: j, uid: desc.uid, id: desc.id, motivo: 'quartaFeira' });
            }
            if (descartou > 0) curarMesa(eu, 10 * ESCALA, eventos);
            ele.auraExtraProximoTurno = (ele.auraExtraProximoTurno || 0) + 1;
            const idx = eu.banco.indexOf(si);
            if (idx >= 0 && eu.ativo) {
                const antigo = eu.ativo;
                eu.banco[idx] = antigo;
                limparEstados(antigo);
                eu.ativo = si;
                eventos.push({ tipo: 'troca', jogador: j, sai: antigo.uid, entra: si.uid, motivo: 'quartaFeira' });
            }
        },
        invocarDoDeck({ estado, eventos, j, eu }, ef) {
            if (!Array.isArray(eu.deck) || (eu.ativo && eu.banco.length >= VAGAS_BANCO)) return;
            const idx = eu.deck.findIndex((c) => c.id === ef.carta);
            if (idx < 0) return;
            const carta = eu.deck.splice(idx, 1)[0];
            if (ef.virado) carta.estados.virada = estado.turno + 2;
            if (combate(carta.id)?.turnosNaMesa) carta.turnosRestantes = combate(carta.id).turnosNaMesa;
            if (!eu.ativo) eu.ativo = carta;
            else eu.banco.push(carta);
            aplicarMansaoPermanente(estado);
            eventos.push({ tipo: 'invocar', jogador: j, uid: carta.uid, id: carta.id });
        },
        roubarAuraParaSuperkid({ eventos, eu, ele }, ef) {
            const sk = naMesa(eu).find((c) => c.id === 'superkid');
            const vitima = naMesa(ele).find((c) => c.aura > 0);
            if (sk && vitima) {
                const qtdRoubada = Math.min(vitima.aura, ef.valor || 1);
                vitima.aura -= qtdRoubada;
                sk.aura += qtdRoubada;
                eventos.push({ tipo: 'roubarAura', de: vitima.uid, para: sk.uid, valor: qtdRoubada });
            }
        },
        buscarCampoDoDeck({ estado, eventos, j, eu }, ef) {
            if (!Array.isArray(eu.deck) || camposBanidos(estado, j)) return;
            const idx = eu.deck.findIndex((c) => c.id === ef.carta);
            if (idx < 0 || estado.campo?.carta.id === ef.carta) return;
            const novoCampo = eu.deck.splice(idx, 1)[0];
            aplicarMansaoPermanente(estado);
            const vivosAntes = vivosNaMesa(estado);
            if (estado.campo) {
                paraDescarte(estado.jogadores[estado.campo.dono], estado.campo.carta);
                eventos.push({ tipo: 'campoSai', id: estado.campo.carta.id, uid: estado.campo.carta.uid });
            }
            estado.campo = { carta: novoCampo, dono: j };
            aplicarMansaoPermanente(estado);
            segurarAposCampo(estado, vivosAntes);
            eventos.push({ tipo: 'campo', jogador: j, uid: novoCampo.uid, id: novoCampo.id });
        },
        /** Itallo de Viego (Rei Destruído): o próximo ataque de OUTRO aliado atinge o time inimigo inteiro (ativo cheio, banco pela metade). */
        proximoAtaqueEmArea({ eu, si, eventos }) {
            eu.proximoAtaqueEmArea = { origem: si.uid };
            eventos.push({ tipo: 'ataqueEmArea', uid: si.uid });
        },
        desvirarSi({ eventos, eu, si }) {
            si.estados.virada = 0;
            eu.flags.bonusDanoTurno = eu.flags.bonusDanoTurno || {};
            eu.flags.bonusDanoTurno[si.uid] = (eu.flags.bonusDanoTurno[si.uid] || 0) + 10;
            eventos.push({ tipo: 'desvirar', uid: si.uid });
        },
        trocarPorSuperkidDoDeck({ estado, eventos, j, eu, si }) {
            if (eu.ativo !== si) return;
            let sk = null;
            if (Array.isArray(eu.deck)) {
                const idx = eu.deck.findIndex((c) => c.id === 'superkid');
                if (idx >= 0) sk = eu.deck.splice(idx, 1)[0];
            }
            if (!sk) {
                const idxMao = eu.mao.findIndex((c) => c.id === 'superkid');
                if (idxMao >= 0) sk = eu.mao.splice(idxMao, 1)[0];
            }
            // Também dá para buscar o Superkid no descarte (v14). A carta já foi limpa quando foi para lá.
            if (!sk) {
                const idxDescarte = eu.descarte.findIndex((c) => c.id === 'superkid');
                if (idxDescarte >= 0) sk = eu.descarte.splice(idxDescarte, 1)[0];
            }
            largarAnexos(estado, si, eventos, 'devolvida');
            paraOBaralho(estado, eu, si, eventos);
            if (sk) {
                sk.aura = (sk.aura || 0) + 1;
                eu.ativo = sk;
                eventos.push({ tipo: 'invocar', jogador: j, uid: sk.uid, id: sk.id, ativo: true });
            } else {
                eu.ativo = null;
            }
        },
        trocarPorDegustadorComEscudo({ estado, eventos, j, eu, si }) {
            const deg = eu.banco.find((c) => c.id === 'degustador-da-noite') || eu.banco.find((c) => ficha(estado, c).tags.includes('degustador'));
            if (deg && eu.ativo === si) {
                eu.banco[eu.banco.indexOf(deg)] = si;
                limparEstados(si);
                eu.ativo = deg;
                deg.escudo = { valor: 30 * ESCALA, ate: estado.turno + 1 };
                eventos.push({ tipo: 'troca', jogador: j, sai: si.uid, entra: deg.uid, motivo: 'ataque' });
                eventos.push({ tipo: 'escudo', uid: deg.uid, valor: deg.escudo.valor });
            }
        },
        buscarPorTag({ eventos, j, eu }, ef) {
            if (!Array.isArray(eu.deck)) return;
            for (let k = 0; k < (ef.qtd || 1); k++) {
                const idx = eu.deck.findIndex((c) => tagsDe(c.id).includes(ef.tag));
                if (idx < 0) break;
                const carta = eu.deck.splice(idx, 1)[0];
                eu.mao.push(carta);
                eventos.push({ tipo: 'compra', jogador: j, uid: carta.uid, id: carta.id, motivo: 'busca' });
            }
        },
        envenenarTodosTeemo({ estado, eventos, ele, alvo }, ef) {
            for (const c of ele.banco) {
                if (!ficha(estado, c).imuneBanco) {
                    darDano(estado, c, ef.danoTodos * ESCALA, eventos, 'ataque');
                }
            }
            for (const c of naMesa(ele)) {
                if (!ficha(estado, c).imuneEstados) {
                    c.venenoTeemo = 4;
                    eventos.push({ tipo: 'venenoTeemo', uid: c.uid, turnos: 4 });
                }
            }
        },
        roubarTodaAura({ estado, eventos, ele, si, alvo }) {
            const vitima = alvo || ele.ativo;
            if (!vitima || !vitima.aura) return;
            const qtdRoubada = vitima.aura;
            vitima.aura = 0;
            si.aura += qtdRoubada;
            si.auraRoubada = (si.auraRoubada || 0) + qtdRoubada;
            si.emprestimosAura = si.emprestimosAura || [];
            si.emprestimosAura.push({ deUid: vitima.uid, qtd: qtdRoubada, devolverNoTurno: estado.turno + 2 });
            eventos.push({ tipo: 'roubarAura', de: vitima.uid, para: si.uid, valor: qtdRoubada });
        },
        danoDiretoJogador({ si }) {
            // A aura nunca sobra no ataque final de Tiago Cássio.
            si.aura = 0;
            si.auraRoubada = 0;
            delete si.emprestimosAura;
        },
        transformarEzreal({ eventos, si }) {
            si.transformado = 'ezreal';
            limparEstados(si);
            delete si.venenoTeemo;
            eventos.push({ tipo: 'transformar', uid: si.uid, forma: 'ezreal' });
        },
        danoTodosInimigos({ estado, eventos, ele, alvo }, ef) {
            for (const c of naMesa(ele)) {
                if (c !== alvo && !ficha(estado, c).imuneBanco) {
                    darDano(estado, c, ef.valor * ESCALA, eventos, 'ataque');
                }
            }
        },
        sacrificarEDestruir2({ estado, eventos, j, ele, si }) {
            let destruidas = 0;
            for (const c of naMesa(ele)) {
                if (destruidas >= 2) break;
                if (c.id === 'superkid' && superkidProtegido(estado, outro(j))) continue;
                c.dano = hpMax(estado, c);
                destruidas++;
            }
            si.dano = hpMax(estado, si);
            eventos.push({ tipo: 'sacrificio', uid: si.uid });
        },
    };

    function aoBaixarLutador(estado, j, inst, eventos) {
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];
        aplicarMansaoPermanente(estado);
        const cb = combate(inst.id);
        const ctx = { estado, eventos, j, eu, ele, si: inst, alvo: inst, jogada: null, fonte: 'entrada' };
        for (const ef of cb?.aoEntrar || []) EFEITOS[ef.tipo]?.(ctx, ef);
    }

    function executarAtaque(estado, jogada, eventos) {
        const j = jogada.jogador;
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];
        const atacante = eu.ativo;
        const ataque = ficha(estado, atacante).ataques[jogada.ataque];
        const efeitos = ataque.efeitos || [];
        // Alvo: o jogador (vida), uma carta qualquer (alvo 'qualquer') ou o ativo dele.
        const noJogador = jogada.alvo === JOGADOR || efeitos.some((e) => e.tipo === 'danoDiretoJogador');
        const alvo = noJogador ? null : (ataque.alvo === 'qualquer' ? acharNaMesa(ele, jogada.alvo) : ele.ativo);
        // Ataque em área liberado pelo Itallo de Viego: vale para o próximo ataque de outra carta (o próprio Itallo não gasta).
        const emArea = !!eu.proximoAtaqueEmArea && eu.proximoAtaqueEmArea.origem !== atacante.uid;
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

        const temMoeda = efeitos.some((e) => e.tipo === 'moeda');
        const resultadoMoeda = temMoeda ? moeda(estado, eventos, 'ataque') : undefined;
        const dano = calcularDano(estado, j, ataque, noJogador ? JOGADOR : alvo, { resultadoMoeda });
        if (emArea) delete eu.proximoAtaqueEmArea;
        let derrubou = false;
        if (noJogador) {
            ferirJogador(estado, outro(j), dano, eventos, 'ataque');
        } else {
            if (alvo.escudo && alvo.escudo.ate >= estado.turno && dano === 0 && ataque.dano > 0) {
                eventos.push({ tipo: 'bloqueado', uid: alvo.uid });
            }
            darDano(estado, alvo, dano, eventos, 'ataque');
            derrubou = dano > 0 && alvo.dano >= hpMax(estado, alvo);
            const contra = poderDe(estado, alvo);
            if (dano > 0 && contra?.tipo === 'contraAtaque') {
                eventos.push({ tipo: 'poder', uid: alvo.uid, nome: contra.nome });
                darDano(estado, atacante, contra.valor * ESCALA, eventos, 'contraAtaque');
            }
            const tagsAtacante = ficha(estado, atacante).tags;
            // Teemo no banco: todo dano de Degustador envenena o alvo por 4 turnos (1.000 de dano).
            if (dano > 0 && tagsAtacante.includes('degustador') && eu.banco.some((c) => poderDe(estado, c)?.tipo === 'venenoTeemoBanco')) {
                if (!ficha(estado, alvo).imuneEstados) {
                    alvo.venenoTeemo = 4;
                    eventos.push({ tipo: 'venenoTeemo', uid: alvo.uid, turnos: 4 });
                }
            }
            // PMLDM no banco: todo dano de Itallo atinge o time inimigo inteiro.
            // Pós-transformação: Super Italo (Ezreal) também causa dano em área no time inimigo inteiro.
            const temSplash = (tagsAtacante.includes('itallo') && eu.banco.some((c) => poderDe(estado, c)?.tipo === 'splashItallo'))
                || atacante.transformado === 'ezreal';
            if (dano > 0 && temSplash) {
                for (const c of naMesa(ele)) {
                    if (c !== alvo && !ficha(estado, c).imuneBanco) {
                        darDano(estado, c, dano, eventos, 'splashItallo');
                    }
                }
            }
            // Rei Destruído: o alvo leva o dano cheio e todas as outras cartas inimigas levam a metade
            // (não vale com o campo que protege o banco, e não soma com o splash do PMLDM, que já bate em todos).
            if (emArea && dano > 0 && !temSplash && efeitoCampo(estado)?.tipo !== 'protegeBanco') {
                const metade = Math.floor(dano / 2);
                for (const c of naMesa(ele)) {
                    if (c !== alvo && !ficha(estado, c).imuneBanco) darDano(estado, c, metade, eventos, 'areaItallo');
                }
                eventos.push({ tipo: 'areaAplicada', uid: atacante.uid, metade });
            }
        }

        // Mansão do Inominável: goon que ataca com 1 Aura a mais do que o ataque pede notifica o ativo do adversário.
        if (efeitoCampo(estado)?.tipo === 'mansao' && tipoDe(atacante.id) === 'goon' && dano > 0 && atacante.aura > ataque.custo
            && ele.ativo && !ele.ativo.estados.notificado && acharNaMesa(ele, ele.ativo.uid)) {
            ele.ativo.estados.notificado = true;
            eventos.push({ tipo: 'estado', uid: ele.ativo.uid, estado: 'notificado', fonte: 'mansao' });
        }

        const ctx = { estado, eventos, j, eu, ele, si: atacante, alvo, jogada, fonte: 'ataque' };
        for (const ef of efeitos) EFEITOS[ef.tipo]?.(ctx, ef);
        // Cartas complementares com `usos`: cada ataque do lutador gasta um.
        if (acharNaMesa(eu, atacante.uid)) gastarAnexos(estado, atacante, 'usos', eventos);
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
                    aoBaixarLutador(estado, j, inst, eventos);
                    return;
                }
                if (inst.id === 'lavras-mg') inst.turnosRestantes = 2;
                eu.banco.push(inst);
                eventos.push({ tipo: 'baixar', jogador: j, uid: inst.uid, id: inst.id });
                aoBaixarLutador(estado, j, inst, eventos);
                return;
            }

            case 'anexar': {
                // Carta complementar: sai da mão e fica deitada atrás do lutador escolhido.
                const inst = tirarDaMao(eu, jogada.uid);
                const host = acharNaMesa(eu, jogada.alvo) || acharNaMesa(ele, jogada.alvo);
                const ax = combate(inst.id).anexo;
                if (ax.custoAuraJogador) gastarAuraMesa(eu, ax.custoAuraJogador, eventos);
                inst.dono = j;
                inst.restam = { usos: ax.usos || 0, turnos: ax.turnos || 0 };   // 0 = sem prazo
                (host.anexos = host.anexos || []).push(inst);
                eventos.push({ tipo: 'anexar', jogador: j, uid: inst.uid, id: inst.id, alvo: host.uid });
                const ctx = { estado, eventos, j, eu, ele, si: host, alvo: host, jogada, fonte: 'anexo' };
                for (const ef of ax.aoEntrar || []) EFEITOS[ef.tipo]?.(ctx, ef);
                // Carta de efeito só na entrada: depois de agir, vai para o descarte.
                if (ax.soAoEntrar) soltarAnexo(estado, host, inst, eventos, 'usada');
                verificarNocautes(estado, eventos);
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
                aplicarMansaoPermanente(estado);
                const vivosAntes = vivosNaMesa(estado);
                if (estado.campo) {
                    const antigo = estado.campo;
                    paraDescarte(estado.jogadores[antigo.dono], antigo.carta);
                    eventos.push({ tipo: 'campoSai', id: antigo.carta.id, uid: antigo.carta.uid });
                }
                estado.campo = { carta: inst, dono: j };
                eu.flags.campo = true;
                eventos.push({ tipo: 'campo', jogador: j, uid: inst.uid, id: inst.id });
                aplicarMansaoPermanente(estado);
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
                const poder = poderDe(estado, inst);
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
                } else if (poder.tipo === 'comprar' || poder.tipo === 'comprarSeDegustador') {
                    for (let n = 0; n < poder.valor; n++) comprar(estado, j, eventos, 'poder');
                } else if (poder.tipo === 'roubarAuraVape') {
                    const vitima = naMesa(ele).find((c) => c.aura > 0);
                    const recebedor = acharNaMesa(eu, jogada.alvo) || inst;
                    if (vitima) {
                        vitima.aura--;
                        recebedor.aura++;
                        inst.roubosVape = (inst.roubosVape || 0) + 1;
                        eventos.push({ tipo: 'roubarAura', de: vitima.uid, para: recebedor.uid, valor: 1 });
                        darDano(estado, inst, inst.roubosVape * ((poder.danoBase || 10) * ESCALA), eventos, 'vape');
                        verificarNocautes(estado, eventos);
                    }
                } else if (poder.tipo === 'espiarMao') {
                    eu.espiada = ele.mao.map((c) => c.id);
                    eventos.push({ tipo: 'espiar', jogador: j, ids: eu.espiada.slice(), privado: true });
                }
                return;
            }

            case 'moverAuraSuperkid': {
                const sk = naMesa(eu).find((x) => x.id === 'superkid' && x.aura > 0);
                const alvo = eu.banco.find((x) => x.uid === jogada.alvo && x !== sk);
                sk.aura--;
                alvo.aura++;
                eu.flags.moverAuraSuperkid = true;
                eventos.push({ tipo: 'moverAura', de: sk.uid, para: alvo.uid });
                return;
            }

            case 'trocarCarta': {
                // Casa do Enzo Games: devolve 1 da mão ao baralho e compra 1 (não conta no limite de 2).
                const inst = tirarDaMao(eu, jogada.uid);
                paraOBaralho(estado, eu, inst, eventos);
                eu.flags.trocarCarta = true;
                eventos.push({ tipo: 'devolver', jogador: j, uid: inst.uid, id: inst.id, de: 'mao', motivo: 'casa' });
                comprar(estado, j, eventos, 'campo');
                return;
            }

            case 'devolverMao': {
                const inst = tirarDaMao(eu, jogada.uid);
                paraOBaralho(estado, eu, inst, eventos);
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
                paraOBaralho(estado, eu, inst, eventos);
                eu.flags.devolvidasMesa = (eu.flags.devolvidasMesa || 0) + 1;
                eventos.push({ tipo: 'devolver', jogador: j, uid: inst.uid, id: inst.id, de: 'mesa' });
                // As cartas complementares atrás dela não voltam ao baralho: vão para o descarte de quem as jogou.
                largarAnexos(estado, inst, eventos, 'devolvida');
                verificarNocautes(estado, eventos);
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
                // A jogada que põe a carta na mesa depende do modo do tipo dela (TIPOS/MODOS).
                const tipo = jogadaDaCarta(c.id);
                if (tipo === 'anexar') {
                    for (const alvo of [...naMesa(eu), ...naMesa(ele)]) candidatas.push({ tipo, jogador: j, uid: c.uid, alvo: alvo.uid });
                } else if (tipo) {
                    candidatas.push({ tipo, jogador: j, uid: c.uid });
                }
                candidatas.push({ tipo: 'trocarCarta', jogador: j, uid: c.uid });
                candidatas.push({ tipo: 'devolverMao', jogador: j, uid: c.uid });
            }
            for (const c of naMesa(eu)) {
                candidatas.push({ tipo: 'aura', jogador: j, alvo: c.uid });
                if (poderDe(estado, c)?.tipo === 'puxar') {
                    for (const alvo of ele.banco) candidatas.push({ tipo: 'poder', jogador: j, uid: c.uid, alvo: alvo.uid });
                } else {
                    candidatas.push({ tipo: 'poder', jogador: j, uid: c.uid });
                }
                candidatas.push({ tipo: 'devolverMesa', jogador: j, uid: c.uid });
            }
            for (const c of eu.banco) {
                candidatas.push({ tipo: 'recuar', jogador: j, para: c.uid });
                candidatas.push({ tipo: 'moverAuraSuperkid', jogador: j, alvo: c.uid });
            }
            if (eu.ativo) {
                ficha(estado, eu.ativo).ataques.forEach((ataque, i) => {
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
        REGRAS_VERSAO, AURAS_POR_TURNO, AURAS_MAX_POR_CARTA_NO_TURNO, AURAS_MAX_NO_TURNO_DO_SEGUNDO, auraMaxNaCarta, JogadaInvalida, BANIDAS_POR_JOGADOR, banivel, quantasBanir,
        validarDeck, criarPartida, aplicar, jogadasValidas, motivoInvalida, visaoDe, eventosPara, quemDeve, repetir,
        rodadaDe, RODADAS_MAX, hpMax, custoRecuo, calcularDano, danoNocaute, ehLutador, ehCampo, combate, tipoDe, naMesa, silenciado, virada,
        TIPOS, MODOS, ANEXOS_POR_LUTADOR, modoDe, jogadaDaCarta, ehAnexo, tagsDe, ficha, poderDe, erroDoAnexo, EFEITOS, BONUS_DANO,
    };
});
