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

    const TAMANHO_DECK = 15;
    const MAX_COPIAS = 2;
    const MAX_COPIAS_LENDARIO = 1;
    const MAO_INICIAL = 5;
    const VAGAS_BANCO = 3;
    const PONTOS_VITORIA = 3;
    const LIMITE_TURNOS = 30;
    const VENENO = 10;
    const DANO_ILUDIDO = 20;

    class JogadaInvalida extends Error {
        constructor(motivo) { super(motivo); this.name = 'JogadaInvalida'; }
    }

    // ---- Cartas ---------------------------------------------------------------
    const tipoDe = (id) => Baralho.carta(id)?.tipo || null;
    const ehLutador = (id) => tipoDe(id) === 'personagem' || tipoDe(id) === 'goon';
    const ehCampo = (id) => tipoDe(id) === 'campo';
    const combate = (id) => COMBATE[id] || null;
    /** Pontos que o adversário ganha ao nocautear esta carta. */
    const pontosDe = (id) => (Baralho.carta(id)?.raridade === 'lendario' ? 2 : 1);

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
    function validarDeck(ids, { colecao } = {}) {
        const erros = [];
        if (!Array.isArray(ids)) return ['O deck precisa ser uma lista de cartas.'];
        if (ids.length !== TAMANHO_DECK) erros.push(`O deck precisa de ${TAMANHO_DECK} cartas (tem ${ids.length}).`);
        const contagem = {};
        for (const id of ids) contagem[id] = (contagem[id] || 0) + 1;
        for (const [id, qtd] of Object.entries(contagem)) {
            const carta = Baralho.carta(id);
            if (!carta || !combate(id)) { erros.push(`Carta desconhecida: ${id}.`); continue; }
            const max = carta.raridade === 'lendario' ? MAX_COPIAS_LENDARIO : MAX_COPIAS;
            if (qtd > max) erros.push(`${carta.nome}: no máximo ${max} ${max === 1 ? 'cópia' : 'cópias'}.`);
            if (colecao && (colecao[id] || 0) < qtd) erros.push(`${carta.nome}: você tem ${colecao[id] || 0}.`);
        }
        if (!ids.some(ehLutador)) erros.push('O deck precisa de pelo menos 1 personagem ou goon.');
        return erros;
    }

    // ---- Criação --------------------------------------------------------------
    function novaInstancia(id, uid) {
        return { uid, id, dano: 0, aura: 0, estados: { notificado: false, iludido: false, silenciado: 0 }, escudo: null };
    }
    function flagsDoTurno() {
        return { auras: 1, reforco: 0, campo: false, recuo: false, trocarCarta: false, poderes: [] };
    }

    function criarPartida({ semente = Date.now(), decks, nomes = ['Jogador 1', 'Jogador 2'] } = {}) {
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
                pontos: 0, preparado: false, mulligans: 0,
                flags: flagsDoTurno(), espiada: null,
            })),
        };
        for (const jogador of estado.jogadores) {
            // Mão sem ninguém para lutar: devolve, embaralha e compra de novo (sem castigo).
            for (;;) {
                jogador.deck.push(...jogador.mao.splice(0));
                embaralhar(estado, jogador.deck);
                jogador.mao = jogador.deck.splice(0, MAO_INICIAL);
                if (jogador.mao.some((c) => ehLutador(c.id))) break;
                jogador.mulligans++;
            }
        }
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
        return base + (campo?.tipo === 'mansao' && tipoDe(inst.id) === 'goon' ? campo.hpGoon : 0);
    }
    function custoRecuo(estado, inst) {
        const campo = efeitoCampo(estado);
        if (campo?.tipo === 'recuoGratisGoon' && tipoDe(inst.id) === 'goon') return 0;
        return combate(inst.id).recuo;
    }
    const silenciado = (estado, inst) => inst.estados.silenciado >= estado.turno;
    const acharNaMao = (jogador, uid) => jogador.mao.find((c) => c.uid === uid) || null;
    const acharNaMesa = (jogador, uid) => naMesa(jogador).find((c) => c.uid === uid) || null;
    /** Cabo Côco no ativo do adversário impede jogar campos. */
    const camposBanidos = (estado, j) => {
        const ativo = estado.jogadores[outro(j)].ativo;
        return !!ativo && combate(ativo.id).poder?.tipo === 'banirCampos';
    };
    /** Quem começa não ataca no 1º turno. */
    const podeAtacarNoTurno = (estado) => estado.turno > 1;

    /** Dano final do ataque (sem moeda: para a tela mostrar a previsão). */
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
                if (eu.banco.length >= VAGAS_BANCO) return 'o banco está cheio';
                return null;
            }
            case 'aura': {
                if (f.auras <= 0) return 'você já prendeu a Aura deste turno';
                const alvo = acharNaMesa(eu, jogada.alvo);
                if (!alvo) return 'a Aura vai para uma carta sua na mesa';
                if (alvo === eu.ativo && f.auras <= f.reforco) return 'a Aura de Reforço vai para o banco';
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
                if (poder.tipo === 'notificarAtivo' && !ele.ativo) return 'o adversário não tem ativo';
                if (poder.tipo === 'comprar' && !eu.deck.length) return 'seu deck acabou';
                if (poder.tipo === 'espiarMao' && !ele.mao.length) return 'a mão do adversário está vazia';
                return null;
            }
            case 'trocarCarta': {
                if (efeitoCampo(estado)?.tipo !== 'trocarCarta') return 'só na Casa do Enzo Games';
                if (f.trocarCarta) return 'só 1 troca por turno';
                if (!acharNaMao(eu, jogada.uid)) return 'escolha uma carta da mão';
                if (!eu.deck.length) return 'seu deck acabou';
                return null;
            }
            case 'atacar': {
                if (!podeAtacarNoTurno(estado)) return 'quem começa não ataca no 1º turno';
                const atacante = eu.ativo;
                if (!atacante) return 'sem ativo';
                const ataque = combate(atacante.id).ataques[jogada.ataque];
                if (!ataque) return 'ataque desconhecido';
                if (silenciado(estado, atacante)) return 'Silenciado não ataca';
                if (atacante.aura < ataque.custo) return `precisa de ${ataque.custo} de Aura`;
                if (!ele.ativo) return 'o adversário não tem ativo';
                if (ataque.alvo === 'qualquer') {
                    const alvo = acharNaMesa(ele, jogada.alvo);
                    if (!alvo) return 'escolha o alvo';
                    if (alvo !== ele.ativo && efeitoCampo(estado)?.tipo === 'protegeBanco') return 'São João do Butico protege o banco';
                } else if ((ataque.efeitos || []).some((e) => e.tipo === 'puxar') && ele.banco.length) {
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
        jogador.descarte.push(inst);
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

    function encerrar(estado, vencedor, motivo, eventos) {
        estado.fase = 'fim';
        estado.vencedor = vencedor;
        estado.motivo = motivo;
        estado.pendentes = [];
        estado.depoisPendentes = null;
        eventos.push({ tipo: 'fim', vencedor, motivo });
    }

    /** Tira da mesa quem ficou sem HP, dá os pontos e vê se alguém venceu. */
    function verificarNocautes(estado, eventos) {
        for (const j of [0, 1]) {
            const eu = estado.jogadores[j];
            for (const inst of naMesa(eu)) {
                if (inst.dano < hpMax(estado, inst)) continue;
                if (eu.ativo === inst) eu.ativo = null;
                else eu.banco.splice(eu.banco.indexOf(inst), 1);
                const pontos = pontosDe(inst.id);
                estado.jogadores[outro(j)].pontos += pontos;
                paraDescarte(eu, inst);
                eventos.push({ tipo: 'nocaute', jogador: j, uid: inst.uid, id: inst.id, pontos, para: outro(j) });
            }
        }
        const ganha = [0, 1].map((j) => {
            const ele = estado.jogadores[outro(j)];
            return estado.jogadores[j].pontos >= PONTOS_VITORIA || naMesa(ele).length === 0;
        });
        if (ganha[0] || ganha[1]) {
            const [p0, p1] = estado.jogadores.map((x) => x.pontos);
            let vencedor;
            if (ganha[0] && ganha[1]) vencedor = p0 === p1 ? 'empate' : (p0 > p1 ? 0 : 1);
            else vencedor = ganha[0] ? 0 : 1;
            const motivo = vencedor === 'empate' ? 'empate'
                : (estado.jogadores[vencedor].pontos >= PONTOS_VITORIA ? 'pontos' : 'mesaVazia');
            encerrar(estado, vencedor, motivo, eventos);
            return;
        }
        for (const j of [0, 1]) {
            const eu = estado.jogadores[j];
            if (!eu.ativo && !estado.pendentes.some((p) => p.jogador === j)) {
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
        if (estado.turno === 2) { eu.flags.auras = 2; eu.flags.reforco = 1; }
        eu.espiada = null;
        eventos.push({ tipo: 'turno', jogador: j, turno: estado.turno });
        const campo = efeitoCampo(estado);
        if (campo?.tipo === 'curaInicio' && eu.ativo && eu.ativo.dano > 0) {
            const valor = Math.min(campo.valor, eu.ativo.dano);
            eu.ativo.dano -= valor;
            eventos.push({ tipo: 'cura', uid: eu.ativo.uid, valor, fonte: 'campo' });
        }
        const extra = campo?.tipo === 'compraExtra' && eu.mao.length <= campo.limiteMao;
        comprar(estado, j, eventos);
        if (extra) comprar(estado, j, eventos, 'campo');
    }

    /** Entre um turno e outro: Notificado tira HP dos ativos dos dois lados. */
    function fimDeTurno(estado, eventos) {
        eventos.push({ tipo: 'fimTurno', jogador: estado.vez, turno: estado.turno });
        const campo = efeitoCampo(estado);
        const veneno = campo?.tipo === 'mansao' ? campo.veneno : VENENO;
        for (const eu of estado.jogadores) {
            if (eu.ativo?.estados.notificado) darDano(estado, eu.ativo, veneno, eventos, 'notificado');
        }
        verificarNocautes(estado, eventos);
        if (estado.fase === 'fim') return;
        if (estado.turno >= LIMITE_TURNOS && !estado.pendentes.length) {
            const [p0, p1] = estado.jogadores.map((x) => x.pontos);
            encerrar(estado, p0 === p1 ? 'empate' : (p0 > p1 ? 0 : 1), 'limiteTurnos', eventos);
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
        const alvo = ataque.alvo === 'qualquer' ? acharNaMesa(ele, jogada.alvo) : ele.ativo;
        eventos.push({ tipo: 'ataque', jogador: j, uid: atacante.uid, ataque: jogada.ataque, nome: ataque.nome, alvo: alvo.uid });

        if (atacante.estados.iludido && !moeda(estado, eventos, 'iludido')) {
            eventos.push({ tipo: 'ataqueFalhou', uid: atacante.uid, motivo: 'iludido' });
            darDano(estado, atacante, DANO_ILUDIDO, eventos, 'iludido');
            verificarNocautes(estado, eventos);
            seguir(estado, 'fimTurno', eventos);
            return;
        }

        const efeitos = ataque.efeitos || [];
        const temMoeda = efeitos.some((e) => e.tipo === 'moeda');
        const resultadoMoeda = temMoeda ? moeda(estado, eventos, 'ataque') : undefined;
        const dano = calcularDano(estado, j, ataque, alvo, { resultadoMoeda });
        if (alvo.escudo && alvo.escudo.ate >= estado.turno && dano === 0 && ataque.dano > 0) {
            eventos.push({ tipo: 'bloqueado', uid: alvo.uid });
        }
        darDano(estado, alvo, dano, eventos, 'ataque');
        const contra = combate(alvo.id).poder;
        if (dano > 0 && contra?.tipo === 'contraAtaque') {
            eventos.push({ tipo: 'poder', uid: alvo.uid, nome: contra.nome });
            darDano(estado, atacante, contra.valor, eventos, 'contraAtaque');
        }

        for (const ef of efeitos) {
            switch (ef.tipo) {
                case 'estado':
                    if (alvo !== ele.ativo) break;
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
                    const valor = Math.min(ef.valor, atacante.dano);
                    if (valor > 0) {
                        atacante.dano -= valor;
                        eventos.push({ tipo: 'cura', uid: atacante.uid, valor, fonte: 'ataque' });
                    }
                    break;
                }
                case 'danoSi':
                    darDano(estado, atacante, ef.valor, eventos, 'proprioAtaque');
                    break;
                case 'escudo':
                    atacante.escudo = { valor: ef.valor, ate: estado.turno + 1 };
                    eventos.push({ tipo: 'escudo', uid: atacante.uid, valor: ef.valor });
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
                        const { carta, dono } = estado.campo;
                        paraDescarte(estado.jogadores[dono], carta);
                        estado.campo = null;
                        eventos.push({ tipo: 'campoSai', id: carta.id, uid: carta.uid });
                    }
                    break;
                default:
                    break;
            }
        }
        verificarNocautes(estado, eventos);
        seguir(estado, 'fimTurno', eventos);
    }

    function executar(estado, jogada, eventos) {
        const j = jogada.jogador;
        const eu = estado.jogadores[j];
        const ele = estado.jogadores[outro(j)];

        switch (jogada.tipo) {
            case 'desistir':
                encerrar(estado, outro(j), 'desistencia', eventos);
                return;

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
                eu.banco.push(inst);
                eventos.push({ tipo: 'baixar', jogador: j, uid: inst.uid, id: inst.id });
                return;
            }

            case 'aura': {
                const inst = acharNaMesa(eu, jogada.alvo);
                inst.aura++;
                eu.flags.auras--;
                if (inst !== eu.ativo && eu.flags.reforco > 0) eu.flags.reforco--;
                eventos.push({ tipo: 'aura', uid: inst.uid, valor: 1, aura: inst.aura, fonte: 'turno' });
                return;
            }

            case 'campo': {
                const inst = tirarDaMao(eu, jogada.uid);
                if (estado.campo) {
                    const antigo = estado.campo;
                    paraDescarte(estado.jogadores[antigo.dono], antigo.carta);
                    eventos.push({ tipo: 'campoSai', id: antigo.carta.id, uid: antigo.carta.uid });
                }
                estado.campo = { carta: inst, dono: j };
                eu.flags.campo = true;
                eventos.push({ tipo: 'campo', jogador: j, uid: inst.uid, id: inst.id });
                // Sair da Mansão pode derrubar goons que estavam vivos pelos +20 de HP.
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
                } else if (poder.tipo === 'comprar') {
                    for (let n = 0; n < poder.valor; n++) comprar(estado, j, eventos, 'poder');
                } else if (poder.tipo === 'espiarMao') {
                    eu.espiada = ele.mao.map((c) => c.id);
                    eventos.push({ tipo: 'espiar', jogador: j, ids: eu.espiada.slice(), privado: true });
                }
                return;
            }

            case 'trocarCarta': {
                const inst = tirarDaMao(eu, jogada.uid);
                paraDescarte(eu, inst);
                eu.flags.trocarCarta = true;
                eventos.push({ tipo: 'descartar', jogador: j, uid: inst.uid, id: inst.id });
                comprar(estado, j, eventos, 'campo');
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
        if (estado.fase === 'preparacao') {
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
            }
            for (const c of naMesa(eu)) {
                candidatas.push({ tipo: 'aura', jogador: j, alvo: c.uid });
                candidatas.push({ tipo: 'poder', jogador: j, uid: c.uid });
            }
            for (const c of eu.banco) candidatas.push({ tipo: 'recuar', jogador: j, para: c.uid });
            if (eu.ativo) {
                combate(eu.ativo.id).ataques.forEach((ataque, i) => {
                    const puxa = (ataque.efeitos || []).some((e) => e.tipo === 'puxar');
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
        v.jogadores.forEach((x, i) => {
            x.deck = x.deck.length;
            if (i !== j) {
                x.mao = x.mao.length;
                x.espiada = null;
                if (v.fase === 'preparacao') { x.ativo = null; x.banco = []; }
            }
        });
        return v;
    }

    /** Refaz a partida do zero (o servidor confere o resultado assim). */
    function repetir(config, jogadas) {
        let estado = criarPartida(config);
        for (const jogada of jogadas) estado = aplicar(estado, jogada).estado;
        return estado;
    }

    return {
        TAMANHO_DECK, MAX_COPIAS, MAX_COPIAS_LENDARIO, MAO_INICIAL, VAGAS_BANCO, PONTOS_VITORIA, LIMITE_TURNOS,
        JogadaInvalida,
        validarDeck, criarPartida, aplicar, jogadasValidas, motivoInvalida, visaoDe, repetir,
        hpMax, custoRecuo, calcularDano, pontosDe, ehLutador, ehCampo, combate, tipoDe, naMesa, silenciado,
    };
});
