// ============================================================================
// Batalha dos Torados: a tela da batalha (batalha.html).
// Regras: js/tcg-regras.js (o motor). NPC: js/tcg-robo.js. Cartas: EnzoBaralhoUI.carta().
//
// A tela nunca muda o jogo sozinha: toda ação vira uma `jogada`, o motor devolve
// o novo estado e a lista de `eventos`, e a fila de animação toca um evento por vez
// (bote do ataque, número de dano, nocaute, moeda...). No fim desenha a mesa de novo,
// e as cartas deslizam até o lugar novo (FLIP).
//
// Imagens que ainda não existem usam placeholder em CSS. Quando o Henrique puser a arte em
// assets/Batalha/ e rodar `npm run build`, ela aparece sozinha (lista e prompts: docs/BATALHA-ASSETS.md).
//
// Jogar é ARRASTAR (mão → banco, campo → meio, banco → ativo, Aura → carta, ativo → adversário).
// Tocar numa carta só abre o painel com o que ela faz (e botões, para quem não consegue arrastar).
//
// Teste: batalha.html?auto=1 faz o robô jogar pelos dois lados; &rapido=1 sem esperas.
// ============================================================================
(() => {
    'use strict';

    const R = window.EnzoTcgRegras;
    const Robo = window.EnzoTcgRobo;
    const B = window.EnzoBaralho;
    const UI = window.EnzoBaralhoUI;
    const raiz = document.getElementById('batalha');
    if (!R || !Robo || !B || !UI || !raiz) return;

    const EU = 0;
    const NPC = 1;
    const params = new URLSearchParams(location.search);
    const AUTO = params.has('auto');
    const RAPIDO = params.has('rapido');
    const semMovimento = () => RAPIDO || matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Arte da batalha em assets/Batalha/ (lista e prompts: docs/BATALHA-ASSETS.md).
     * Enquanto o arquivo não existir (ou o `npm run build` não tiver gerado a versão web),
     * a tela usa o placeholder em CSS. Não precisa mexer no código ao adicionar a imagem.
     */
    const A = (nome) => `assets/Batalha/${nome}.png`;
    const ARTE = {
        logo: A('logo'),
        mesa: A('mesa'),
        npc: A('npc-torado'),
        aura: A('aura'),
        moeda: { cara: A('moeda-cara'), coroa: A('moeda-coroa') },
        estados: { notificado: A('estado-notificado'), silenciado: A('estado-silenciado'), iludido: A('estado-iludido'), escudo: A('estado-escudo') },
        // Menu (prompts em docs/BATALHA-ASSETS.md, parte "Menu enfeitado").
        menu: {
            fundo: A('fundo-menu'), faixa: A('faixa'), comoJogar: A('icone-como-jogar'),
            caixas: { turma: A('caixa-turma'), legiao: A('caixa-legiao'), internet: A('caixa-internet') },
            rivais: { facil: A('icone-npc-facil'), normal: A('icone-npc-normal'), pvp: A('icone-outro-jogador') },
        },
        campos: Object.fromEntries(['piscina-de-macarronada', 'toradolandia', 'mansao-do-inominavel', 'estacionamento-noturno',
            'casa-do-enzo-games', 'sao-joao-do-butico'].map((id) => [id, A(`mesa-${id}`)])),
    };
    /** URL da versão web da imagem, ou null se ela ainda não existe (usa o placeholder). */
    const arte = (caminho) => (caminho && window.SiteImages?.[caminho] ? window.siteImageUrl(caminho) : null);
    /** Igual, mas para o que aparece grande (fundo da mesa, logo): a maior versão de até 1280 px. */
    const arteGrande = (caminho) => {
        const v = caminho && window.SiteImages?.[caminho]?.variants;
        if (!v?.length) return null;
        return (v.filter((x) => x.width <= 1280).at(-1) || v[0]).src;
    };

    const DECKS = window.EnzoTcgCartas.DECKS_PRONTOS;

    const ESTADOS = {
        notificado: { icone: '🔔', nome: 'Notificado', texto: 'Leva 10 entre um turno e outro. Sai ao voltar para o banco.' },
        silenciado: { icone: '🔇', nome: 'Silenciado', texto: 'Não ataca nem recua no próximo turno. Depois não pode ser silenciado de novo logo em seguida.' },
        iludido: { icone: '💘', nome: 'Iludido', texto: 'Ao atacar, moeda: coroa = erra e leva 20.' },
        escudo: { icone: '🛡️', nome: 'Escudo', texto: 'Leva menos dano no próximo ataque.' },
    };

    // ---------------------------------------------------------------- utilidades
    const el = (tag, classe, texto) => {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto !== undefined && texto !== null) e.textContent = texto;
        return e;
    };
    const botao = (classe, texto, aoClicar) => {
        const b = el('button', classe, texto);
        b.type = 'button';
        if (aoClicar) b.addEventListener('click', aoClicar);
        return b;
    };
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, semMovimento() ? Math.min(ms, RAPIDO ? 0 : 120) : ms));
    const animar = (alvo, quadros, opcoes) => {
        if (!alvo || semMovimento()) return Promise.resolve();
        return alvo.animate(quadros, { easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none', ...opcoes }).finished.catch(() => {});
    };
    const def = (id) => B.carta(id);
    const nomeVisivel = (id) => (UI.nomeVisivel ? UI.nomeVisivel(def(id)) : def(id).nome);

    // ---------------------------------------------------------------- estado da tela
    let estado = null;
    let nivel = 'normal';
    let deckEscolhido = DECKS[0];
    let ocupado = false;
    let modo = null;            // { tipo: 'alvo', jogada, alvos, texto } | { tipo: 'aura' } | { tipo: 'preparar', ativo, banco }
    let log = [];
    let partida = 0;            // muda a cada batalha: a vez do NPC antiga para sozinha
    let mesa = null;            // elementos fixos da mesa
    const cartasVivas = new Map();   // uid -> elemento .bt-carta (reaproveitado entre desenhos)

    // ---------------------------------------------------------------- textos das cartas
    function textoEfeito(ef) {
        switch (ef.tipo) {
            case 'estado': return `Deixa ${ESTADOS[ef.estado].nome}.`;
            case 'curarSi': return `Cura ${ef.valor} dele.`;
            case 'danoSi': return `Ele leva ${ef.valor}.`;
            case 'escudo': return `Leva −${ef.valor} no próximo ataque.`;
            case 'auraSi': return `Prende +${ef.valor} Aura nele.`;
            case 'bonusPorAura': return `+${ef.valor} por Aura nele.`;
            case 'bonusSeAliado': return `+${ef.valor} com ${def(ef.carta).nome} na sua mesa.`;
            case 'bonusPorGoon': return `+${ef.valor} por goon na sua mesa.`;
            case 'moeda': return `Moeda: cara ${ef.cara}, coroa ${ef.coroa}.`;
            case 'puxar': return 'Troca o ativo dele por quem você escolher do banco dele.';
            case 'descartarCampo': return 'Descarta o campo da mesa.';
            default: return '';
        }
    }
    function descricaoAtaque(a) {
        const partes = [];
        if (a.alvo === 'qualquer') partes.push('Acerta qualquer carta do adversário.');
        for (const ef of a.efeitos || []) partes.push(textoEfeito(ef));
        return partes.join(' ');
    }

    // ---------------------------------------------------------------- consultas
    function acharInst(e, uid) {
        for (const j of [0, 1]) {
            const x = e.jogadores[j];
            const zonas = [x.ativo ? [x.ativo] : [], x.banco, Array.isArray(x.mao) ? x.mao : [], Array.isArray(x.deck) ? x.deck : [], x.descarte];
            for (const z of zonas) {
                const achou = z.find((c) => c.uid === uid);
                if (achou) return { inst: achou, jogador: j };
            }
        }
        if (e.campo?.carta.uid === uid) return { inst: e.campo.carta, jogador: e.campo.dono };
        return null;
    }
    const nomeDoUid = (uid, ...estados) => {
        for (const e of estados) {
            const a = e && acharInst(e, uid);
            if (a) return nomeVisivel(a.inst.id);
        }
        return '?';
    };
    const valida = (jogada) => !R.motivoInvalida(estado, { jogador: EU, ...jogada });
    const motivo = (jogada) => R.motivoInvalida(estado, { jogador: EU, ...jogada });
    const minhaVez = () => estado && estado.fase === 'jogo' && !ocupado && Robo.quemJoga(estado) === EU;

    // ---------------------------------------------------------------- menu
    function telaMenu() {
        limparMesa();
        raiz.replaceChildren();
        raiz.className = 'batalha batalha--menu';
        const fundoMenu = arteGrande(ARTE.menu.fundo);
        // URL absoluta: numa variável CSS, caminho relativo seria lido a partir de css/.
        const abs = (src) => `url('${new URL(src, document.baseURI).href}')`;
        raiz.style.setProperty('--fundo-menu', fundoMenu ? abs(fundoMenu) : 'none');
        raiz.classList.toggle('batalha--menu-arte', !!fundoMenu);
        const faixa = arte(ARTE.menu.faixa);
        raiz.style.setProperty('--faixa', faixa ? abs(faixa) : 'none');
        raiz.classList.toggle('batalha--faixa', !!faixa);
        const caixa = el('div', 'bt-menu');
        const titulo = el('h1', 'bt-logo');
        if (arteGrande(ARTE.logo)) {
            const img = el('img');
            img.src = arteGrande(ARTE.logo);
            img.alt = 'Batalha dos Torados';
            titulo.appendChild(img);
        } else {
            titulo.append(el('span', 'bt-logo-cima', 'Batalha dos'), el('span', 'bt-logo-baixo', 'Torados'));
        }
        caixa.appendChild(titulo);

        caixa.appendChild(el('h2', 'bt-menu-sub', 'Escolha seu deck'));
        const decks = el('div', 'bt-decks');
        for (const d of DECKS) {
            const b = botao(`bt-deck${d === deckEscolhido ? ' bt-deck--ativo' : ''}`, null, () => {
                deckEscolhido = d;
                decks.querySelectorAll('.bt-deck').forEach((x) => x.classList.toggle('bt-deck--ativo', x === b));
            });
            b.setAttribute('aria-pressed', String(d === deckEscolhido));
            const imgCaixa = arte(ARTE.menu.caixas[d.id]);
            let capa;
            if (imgCaixa) {
                capa = el('img', 'bt-deck-caixa');
                capa.src = imgCaixa;
                capa.alt = '';
            } else {
                capa = el('div', 'bt-deck-leque');
                d.capa.forEach((id) => capa.appendChild(UI.carta(id)));
            }
            b.append(capa, el('strong', 'bt-deck-nome', d.nome), el('span', 'bt-deck-texto', d.texto));
            decks.appendChild(b);
        }
        caixa.appendChild(decks);

        caixa.appendChild(el('h2', 'bt-menu-sub', 'Contra quem?'));
        const rivais = el('div', 'bt-rivais');
        rivais.append(
            botao('bt-rival', null, () => comecar('facil')),
            botao('bt-rival bt-rival--forte', null, () => comecar('normal')),
            botao('bt-rival', null),
        );
        const [facil, normal, pvp] = rivais.children;
        const rosto = (qual, emoji) => {
            const img = arte(ARTE.menu.rivais[qual]);
            const r = el('span', `bt-rival-rosto${img ? ' bt-rival-rosto--arte' : ''}`, img ? '' : emoji);
            if (img) r.style.backgroundImage = `url('${img}')`;
            return r;
        };
        facil.append(rosto('facil', '🤖'), el('strong', '', 'NPC fácil'), el('span', '', 'Para aprender'));
        normal.append(rosto('normal', '😈'), el('strong', '', 'NPC normal'), el('span', '', 'Joga para ganhar'));
        pvp.append(rosto('pvp', '🧑‍🤝‍🧑'), el('strong', '', 'Outro jogador'), el('span', '', 'Em breve'));
        pvp.disabled = true;
        caixa.appendChild(rivais);

        const comoJogar = botao('bt-link', null, mostrarRegras);
        const livro = arte(ARTE.menu.comoJogar);
        if (livro) {
            const i = el('img', 'bt-link-icone');
            i.src = livro;
            i.alt = '';
            comoJogar.append(i, 'Como jogar');
        } else {
            comoJogar.textContent = '📖 Como jogar';
        }
        caixa.appendChild(comoJogar);
        raiz.appendChild(caixa);
    }

    function mostrarRegras() {
        const janela = el('dialog', 'bt-regras');
        const texto = el('div', 'bt-regras-texto');
        const itens = [
            ['Objetivo', 'Faça 3 pontos. Derrubar uma carta vale 1 ponto; um lendário vale 2.'],
            ['Deck', '15 cartas. Você começa com 5 na mão e compra 1 por turno.'],
            ['Mesa', 'Um ATIVO (quem luta) e até 3 no BANCO (quem espera). O CAMPO é da mesa inteira e vale para os dois.'],
            ['Aura', 'Todo turno você ganha 1 Aura e arrasta para uma carta sua. A Aura fica presa naquela carta e vai acumulando de um turno para o outro (as bolinhas amarelas na carta). Para atacar, o ativo precisa ter a Aura do ataque presa nele (atacar não gasta).'],
            ['Seu turno', 'Ponha cartas no banco, jogue 1 campo, prenda a Aura, use poderes, recue se precisar e ATAQUE. Atacar acaba o turno.'],
            ['Recuar', 'Arraste uma carta do banco para o ativo. Custa a Aura de recuo, que sai da Aura presa no ativo. Voltar para o banco tira os estados.'],
            ['Começo', 'Quem começa não ataca no 1º turno. Quem joga em segundo ganha +1 Aura de Reforço (só para o banco).'],
            ['Estados', '🔔 Notificado: leva 10 por turno. 🔇 Silenciado: não ataca nem recua no próximo turno (e não dá para silenciar a mesma carta dois turnos seguidos). 💘 Iludido: pode errar o ataque.'],
            ['Jogar', 'Arraste as cartas: da mão para o banco, o campo para o meio da mesa, a Aura para uma carta, e o seu ativo até o ativo do NPC para atacar.'],
            ['Dica', 'Toque em qualquer carta (até as do NPC) para ver os ataques e o que ela faz.'],
        ];
        for (const [t, d] of itens) {
            const p = el('p');
            p.append(el('strong', '', `${t}: `), d);
            texto.appendChild(p);
        }
        janela.append(el('h2', '', 'Como jogar'), texto, botao('bt-botao', 'Entendi!', () => janela.close()));
        janela.addEventListener('close', () => janela.remove());
        document.body.appendChild(janela);
        janela.showModal();
    }

    // ---------------------------------------------------------------- começo da partida
    function comecar(n) {
        nivel = n;
        partida++;
        const outros = DECKS.filter((d) => d !== deckEscolhido);
        const deckNpc = outros[Math.floor(Math.random() * outros.length)];
        log = [];
        estado = R.criarPartida({
            semente: `${Date.now()}-${Math.random()}`,
            decks: [deckEscolhido.cartas, deckNpc.cartas],
            nomes: ['Você', `NPC (${deckNpc.nome})`],
        });
        // O NPC escolhe o ativo e o banco escondido.
        estado = R.aplicar(estado, Robo.escolherJogada(estado, NPC, { nivel })).estado;
        montarMesa();
        registrar(`Você joga com ${deckEscolhido.nome}; o NPC com ${deckNpc.nome}.`);
        if (AUTO) {
            modo = null;
            desenhar();
            executar(Robo.escolherJogada(estado, EU, { nivel: 'normal' }));
            return;
        }
        modo = { tipo: 'preparar', ativo: null, banco: [] };
        desenhar();
    }

    // ---------------------------------------------------------------- mesa (estrutura fixa)
    function limparMesa() {
        cartasVivas.clear();
        mesa = null;
        modo = null;
    }

    function montarMesa() {
        raiz.classList.remove('batalha--menu-arte', 'batalha--faixa');
        cartasVivas.clear();
        fundoAtual = undefined;   // mesa nova: o fundo precisa ser pintado de novo
        raiz.replaceChildren();
        raiz.className = 'batalha batalha--jogo';
        const m = {};
        m.raiz = el('div', 'bt-mesa');
        m.fundo = el('div', 'bt-fundo');
        m.fundoNovo = el('div', 'bt-fundo bt-fundo--novo');

        const lado = (quem) => {
            const l = el('section', `bt-lado bt-lado--${quem}`);
            const info = el('div', 'bt-info');
            const rosto = el('div', 'bt-rosto');
            if (quem === 'npc' && arte(ARTE.npc)) rosto.style.backgroundImage = `url('${arte(ARTE.npc)}')`;
            else rosto.textContent = quem === 'npc' ? '😈' : '🙂';
            const nome = el('strong', 'bt-nome');
            const pontos = el('div', 'bt-pontos');
            pontos.setAttribute('role', 'img');
            for (let i = 0; i < R.PONTOS_VITORIA; i++) pontos.appendChild(el('span', 'bt-ponto'));
            const deck = el('div', 'bt-contador bt-contador--deck');
            const mao = el('div', 'bt-contador bt-contador--mao');
            info.append(rosto, nome, pontos, deck, mao);
            const banco = el('div', 'bt-banco');
            const vagas = [];
            for (let i = 0; i < R.VAGAS_BANCO; i++) {
                const v = el('div', 'bt-vaga bt-vaga--banco');
                vagas.push(v);
                banco.appendChild(v);
            }
            const ativo = el('div', 'bt-vaga bt-vaga--ativo');
            if (quem === 'npc') l.append(info, banco, ativo);
            else l.append(ativo, banco, info);
            return { l, info, nome, pontos, deck, mao, vagas, ativo };
        };
        m.npc = lado('npc');
        m.eu = lado('eu');

        m.centro = el('div', 'bt-centro');
        m.campo = el('div', 'bt-vaga bt-vaga--campo');
        m.campoTexto = el('p', 'bt-campo-texto');
        m.dica = el('p', 'bt-dica');
        m.dica.setAttribute('aria-live', 'polite');
        m.centro.append(m.campo, m.dica);

        m.acoes = el('div', 'bt-acoes');
        m.aura = botao('bt-aura', null, () => {
            if (!minhaVez() || acabouDeArrastar) return;
            modo = modo?.tipo === 'aura' ? null : { tipo: 'aura' };
            desenhar();
        });
        m.auraQtd = el('span', 'bt-aura-qtd');
        const orbe = el('span', 'bt-orbe');
        if (arte(ARTE.aura)) orbe.style.backgroundImage = `url('${arte(ARTE.aura)}')`;
        m.aura.append(orbe, m.auraQtd);
        m.aura.addEventListener('pointerdown', (e) => apertar(e, orbe, { tipo: 'aura' }));
        m.passar = botao('bt-passar', 'Passar', () => minhaVez() && executar({ tipo: 'passar' }));
        m.cancelar = botao('bt-cancelar', 'Cancelar', () => { modo = null; desenhar(); });
        m.pronto = botao('bt-passar bt-pronto', 'Começar!', confirmarPreparo);
        m.eu.info.append(m.aura, m.passar, m.cancelar, m.pronto);

        m.maoNpc = el('div', 'bt-mao bt-mao--npc');
        m.maoNpc.addEventListener('click', () => { const e = espiadaVisivel(); if (e) mostrarEspiada(e); });
        m.npc.info.appendChild(m.maoNpc);
        m.mao = el('div', 'bt-mao bt-mao--eu');

        m.menu = el('div', 'bt-menu-jogo');
        m.menu.append(
            botao('bt-icone', '🏠', sair),
            botao('bt-icone', '📜', () => m.log.classList.toggle('bt-log--aberto')),
            botao('bt-icone', '📖', mostrarRegras),
            botao('bt-icone', '🏳️', desistir),
        );
        ['Voltar ao menu', 'Histórico', 'Como jogar', 'Desistir'].forEach((rotulo, i) => {
            m.menu.children[i].setAttribute('aria-label', rotulo);
            m.menu.children[i].title = rotulo;
        });
        m.log = el('ol', 'bt-log');

        m.efeitos = el('div', 'bt-efeitos');   // camada de números, balões e voos
        m.painel = el('div', 'bt-painel');
        m.painel.hidden = true;
        m.seta = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        m.seta.setAttribute('class', 'bt-seta');
        m.seta.innerHTML = '<defs><marker id="bt-ponta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><path class="bt-seta-linha" d="" marker-end="url(#bt-ponta)"/>';

        m.raiz.append(m.fundo, m.fundoNovo, m.npc.l, m.centro, m.eu.l, m.mao, m.menu, m.log, m.seta, m.efeitos, m.painel);
        raiz.appendChild(m.raiz);
        mesa = m;

        m.raiz.addEventListener('pointermove', moverSeta);
    }

    // ---------------------------------------------------------------- cartas na mesa
    function cartaViva(inst) {
        let v = cartasVivas.get(inst.uid);
        if (!v || v.dataset.id !== inst.id) {
            // div com papel de botão: a tarja do Cabo Côco já é um <button> dentro da carta.
            v = el('div', 'bt-carta');
            v.tabIndex = 0;
            v.setAttribute('role', 'button');
            v.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clicarCarta(v.dataset.uid); }
            });
            v.dataset.uid = inst.uid;
            v.dataset.id = inst.id;
            v.appendChild(UI.carta(inst.id));
            const hud = el('div', 'bt-hud');
            hud.append(el('span', 'bt-hp'), el('span', 'bt-auras'), el('span', 'bt-estados'));
            v.appendChild(hud);
            v.addEventListener('click', () => { if (!acabouDeArrastar) clicarCarta(v.dataset.uid); });
            v.addEventListener('pointerdown', (e) => apertar(e, v, { tipo: 'carta', uid: v.dataset.uid }));
            cartasVivas.set(inst.uid, v);
        }
        return v;
    }

    function atualizarHud(v, inst, lutando) {
        const hud = v.querySelector('.bt-hud');
        hud.hidden = !lutando;
        if (!lutando) return;
        const max = R.hpMax(estado, inst);
        const vida = Math.max(0, max - inst.dano);
        const hp = hud.querySelector('.bt-hp');
        hp.textContent = vida;
        hp.style.setProperty('--vida', `${(100 * vida) / max}%`);
        hp.classList.toggle('bt-hp--baixo', vida <= max * 0.3);
        hp.title = `${vida} de ${max} HP`;
        const auras = hud.querySelector('.bt-auras');
        auras.replaceChildren(...Array.from({ length: inst.aura }, () => el('i', 'bt-aura-pip')));
        auras.title = `${inst.aura} Aura`;
        const est = hud.querySelector('.bt-estados');
        const icones = [];
        for (const k of ['notificado', 'iludido']) if (inst.estados[k]) icones.push(k);
        if (R.silenciado(estado, inst) || inst.estados.silenciado >= estado.turno) icones.push('silenciado');
        if (inst.escudo && inst.escudo.ate >= estado.turno) icones.push('escudo');
        est.replaceChildren(...icones.map((k) => {
            const img = arte(ARTE.estados[k]);
            const i = el('i', `bt-estado bt-estado--${k}`, img ? '' : ESTADOS[k].icone);
            if (img) i.style.backgroundImage = `url('${img}')`;
            i.title = `${ESTADOS[k].nome}: ${ESTADOS[k].texto}`;
            return i;
        }));
        v.setAttribute('aria-label', `${nomeVisivel(inst.id)}: ${vida} de ${max} HP, ${inst.aura} Aura${icones.length ? `, ${icones.map((k) => ESTADOS[k].nome).join(', ')}` : ''}`);
    }

    // ---------------------------------------------------------------- desenhar
    function posicoes() {
        const mapa = new Map();
        for (const [uid, v] of cartasVivas) if (v.isConnected) mapa.set(uid, v.getBoundingClientRect());
        return mapa;
    }

    function desenhar() {
        if (!mesa || !estado) return;
        const antes = posicoes();
        const visao = R.visaoDe(estado, EU);
        const usados = new Set();
        const por = (inst, onde, lutando = true) => {
            const v = cartaViva(inst);
            usados.add(inst.uid);
            atualizarHud(v, inst, lutando);
            v.className = 'bt-carta';
            onde.appendChild(v);
            return v;
        };

        const preparando = modo?.tipo === 'preparar';
        for (const [j, lado] of [[EU, mesa.eu], [NPC, mesa.npc]]) {
            const x = visao.jogadores[j];
            lado.nome.textContent = x.nome;
            [...lado.pontos.children].forEach((p, i) => p.classList.toggle('bt-ponto--feito', i < x.pontos));
            lado.pontos.setAttribute('aria-label', `${x.pontos} de ${R.PONTOS_VITORIA} pontos`);
            lado.deck.textContent = `🂠 ${x.deck}`;
            lado.deck.title = `${x.deck} cartas no deck`;
            lado.mao.textContent = j === NPC ? `✋ ${x.mao}` : '';
            lado.mao.hidden = j !== NPC;
            lado.mao.title = `${x.mao} cartas na mão`;
            lado.ativo.replaceChildren();
            lado.vagas.forEach((v) => v.replaceChildren());
            if (x.ativo) por(x.ativo, lado.ativo);
            x.banco.forEach((c, i) => por(c, lado.vagas[i]));
            if (preparando && j === EU) {
                // Na preparação as escolhas ainda estão na mão: mostra cada uma na vaga para onde foi arrastada.
                const daMao = (u) => x.mao.find((c) => c.uid === u);
                if (modo.ativo) por(daMao(modo.ativo), lado.ativo, false);
                modo.banco.forEach((u, i) => por(daMao(u), lado.vagas[i], false));
            }
            lado.l.classList.toggle('bt-lado--vez', estado.fase === 'jogo' && estado.vez === j && !estado.pendentes.length);
        }

        // Campo e fundo da mesa.
        mesa.campo.replaceChildren();
        const campoId = visao.campo?.carta.id || null;
        if (campoId) por(visao.campo.carta, mesa.campo, false);
        else mesa.campo.appendChild(el('span', 'bt-vaga-rotulo', 'Campo'));
        trocarFundo(campoId);

        // Mão do NPC (costas) e a sua.
        // Depois da Câmera do Drone Vigia, a mão do NPC fica virada para cima até o fim do seu turno.
        const espiada = espiadaVisivel();
        mesa.maoNpc.replaceChildren(...(espiada
            ? espiada.map((id) => UI.carta(id))
            : Array.from({ length: visao.jogadores[NPC].mao }, () => UI.verso(''))));
        mesa.maoNpc.classList.toggle('bt-mao--espiada', !!espiada);
        mesa.maoNpc.title = espiada ? 'Mão do NPC (Câmera): toque para ver' : '';
        mesa.mao.replaceChildren();
        const escolhidas = preparando ? [modo.ativo, ...modo.banco] : [];
        const minhaMao = visao.jogadores[EU].mao.filter((c) => !escolhidas.includes(c.uid));
        minhaMao.forEach((c, i) => {
            const v = por(c, mesa.mao, false);
            v.style.setProperty('--i', i - (minhaMao.length - 1) / 2);
        });
        mesa.mao.style.setProperty('--n', minhaMao.length);
        // Mão cheia: as cartas se sobrepõem mais para caber na largura.
        const primeira = mesa.mao.firstElementChild;
        if (primeira && minhaMao.length > 1) {
            const w = primeira.offsetWidth;
            const livre = Math.min(mesa.raiz.clientWidth, window.innerWidth) - 44;
            mesa.mao.style.setProperty('--sobrepor', `${Math.min(-0.15 * w, (livre - minhaMao.length * w) / (minhaMao.length - 1))}px`);
        }

        // Tira da tela as cartas que saíram (descarte).
        for (const [uid, v] of cartasVivas) if (!usados.has(uid)) { v.remove(); cartasVivas.delete(uid); }

        marcarPossiveis(preparando);
        atualizarAcoes(preparando);
        flip(antes);
    }

    /** As cartas deslizam da posição antiga para a nova. */
    function flip(antes) {
        if (semMovimento()) return;
        for (const [uid, v] of cartasVivas) {
            const a = antes.get(uid);
            if (!a) {
                animar(v, [{ opacity: 0, transform: 'translateY(20px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
                continue;
            }
            const b = v.getBoundingClientRect();
            const dx = a.left - b.left;
            const dy = a.top - b.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(a.width - b.width) < 1) continue;
            const s = a.width / (b.width || 1);
            animar(v, [
                { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: 'top left' },
                { transform: 'none', transformOrigin: 'top left' },
            ], { duration: 380 });
        }
    }

    let fundoAtual;
    function trocarFundo(campoId) {
        if (fundoAtual === campoId) return;
        fundoAtual = campoId;
        const aplicar = (alvo) => {
            alvo.dataset.campo = campoId || 'nenhum';
            const img = arteGrande(campoId ? ARTE.campos[campoId] : ARTE.mesa);
            alvo.style.backgroundImage = img ? `url('${img}')` : '';
            alvo.classList.toggle('bt-fundo--arte', !!img);
        };
        aplicar(mesa.fundoNovo);
        animar(mesa.fundoNovo, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 }).then(() => aplicar(mesa.fundo));
        mesa.raiz.dataset.campo = campoId || 'nenhum';
        const efeito = campoId ? R.combate(campoId).campo : null;
        mesa.campoTexto.textContent = efeito ? efeito.texto : '';
    }

    function marcarPossiveis(preparando) {
        const vez = minhaVez();
        const marca = (uid, classe) => cartasVivas.get(uid)?.classList.add(classe);
        if (preparando) {
            const eu = estado.jogadores[EU];
            for (const c of eu.mao) {
                if (!R.ehLutador(c.id)) marca(c.uid, 'bt-carta--apagada');
                else if (modo.ativo !== c.uid && !modo.banco.includes(c.uid)) marca(c.uid, 'bt-carta--pode');
            }
            return;
        }
        if (modo?.tipo === 'alvo') {
            for (const uid of modo.alvos) marca(uid, 'bt-carta--alvo');
            return;
        }
        if (modo?.tipo === 'aura') {
            for (const c of R.naMesa(estado.jogadores[EU])) if (valida({ tipo: 'aura', alvo: c.uid })) marca(c.uid, 'bt-carta--alvo');
            return;
        }
        if (estado.pendentes.some((p) => p.jogador === EU)) {
            for (const c of estado.jogadores[EU].banco) marca(c.uid, 'bt-carta--alvo');
            return;
        }
        if (!vez) return;
        const eu = estado.jogadores[EU];
        for (const c of eu.mao) {
            if (acoesDaCarta(c.uid).some((a) => a.valida)) marca(c.uid, 'bt-carta--pode');
        }
        if (eu.ativo && acoesDaCarta(eu.ativo.uid).some((a) => a.valida && a.jogada?.tipo === 'atacar')) marca(eu.ativo.uid, 'bt-carta--pode');
    }

    function atualizarAcoes(preparando) {
        const vez = minhaVez();
        const f = estado.jogadores[EU].flags;
        const auraLivre = vez && R.naMesa(estado.jogadores[EU]).some((c) => valida({ tipo: 'aura', alvo: c.uid }));
        mesa.aura.hidden = preparando;
        mesa.aura.disabled = !auraLivre;
        mesa.aura.classList.toggle('bt-aura--pronta', auraLivre);
        mesa.aura.classList.toggle('bt-aura--mirando', modo?.tipo === 'aura');
        mesa.auraQtd.textContent = vez ? `${Math.max(0, f.auras)}` : '';
        mesa.aura.setAttribute('aria-label', auraLivre ? `Prender Aura (${f.auras} neste turno)` : 'Aura: nada para prender agora');
        mesa.passar.hidden = preparando || !!modo;
        mesa.passar.disabled = !vez;
        mesa.cancelar.hidden = !modo || preparando;
        mesa.pronto.hidden = !preparando;
        mesa.pronto.disabled = !preparando || !modo.ativo;
        mesa.raiz.classList.toggle('bt-mesa--mirando', modo?.tipo === 'alvo');
        if (modo?.tipo !== 'alvo') mesa.seta.classList.remove('bt-seta--viva');

        let dica = '';
        if (preparando) dica = modo.ativo ? 'Arraste até 3 cartas para o banco (opcional) e toque em Começar!' : 'Arraste um personagem ou goon da mão para o ATIVO. Toque numa carta para ver o que ela faz.';
        else if (estado.fase === 'fim') dica = '';
        else if (modo?.tipo === 'alvo') dica = modo.texto;
        else if (modo?.tipo === 'aura') dica = 'Toque na carta que vai receber a Aura. Ela fica presa ali e acumula.';
        else if (estado.pendentes.some((p) => p.jogador === EU)) dica = 'Seu ativo caiu! Arraste uma carta do banco para o ativo.';
        else if (vez) dica = estado.turno === 1 ? 'Seu 1º turno: arraste cartas para o banco e a Aura para uma carta (ainda não dá para atacar).' : 'Sua vez! Arraste as cartas para jogar (o ativo até o NPC ataca).';
        else if (estado.fase === 'jogo') dica = 'Vez do NPC...';
        mesa.dica.textContent = dica;
    }

    // ---------------------------------------------------------------- cliques
    function clicarCarta(uid) {
        if (!estado || ocupado) return;
        if (modo?.tipo === 'alvo') {
            if (modo.alvos.includes(uid)) {
                const jogada = { ...modo.jogada, alvo: uid };
                modo = null;
                executar(jogada);
            }
            return;
        }
        if (modo?.tipo === 'aura') {
            if (valida({ tipo: 'aura', alvo: uid })) { modo = null; executar({ tipo: 'aura', alvo: uid }); }
            return;
        }
        abrirPainel(uid);
    }

    /** Preparação: põe a carta no ativo, no banco ou de volta na mão ('mao'). */
    function escolherPreparo(uid, onde) {
        const c = estado.jogadores[EU].mao.find((x) => x.uid === uid);
        if (!c || !R.ehLutador(c.id)) return;
        const tinhaAtivo = modo.ativo;
        const eraAtivo = tinhaAtivo === uid;
        const vagaAntiga = modo.banco.indexOf(uid);
        if (eraAtivo) modo.ativo = null;
        if (vagaAntiga >= 0) modo.banco.splice(vagaAntiga, 1);
        if (onde === 'ativo') {
            modo.ativo = uid;
            // Quem estava no ativo troca de lugar com ela (ou volta para a mão se o banco estiver cheio).
            if (tinhaAtivo && !eraAtivo && modo.banco.length < R.VAGAS_BANCO) modo.banco.splice(Math.max(0, vagaAntiga), 0, tinhaAtivo);
        } else if (onde === 'banco') {
            if (modo.banco.length < R.VAGAS_BANCO) modo.banco.push(uid);
            else balao(mesa.eu.l, 'O banco já tem 3 cartas.', 'erro');
        }
        desenhar();
    }

    function confirmarPreparo() {
        if (modo?.tipo !== 'preparar' || !modo.ativo) return;
        const jogada = { tipo: 'preparar', ativo: modo.ativo, banco: modo.banco };
        modo = null;
        executar(jogada);
    }

    /** O que dá para fazer com uma carta agora (com o motivo quando não dá). */
    function acoesDaCarta(uid) {
        const eu = estado.jogadores[EU];
        const ele = estado.jogadores[NPC];
        const acoes = [];
        if (modo?.tipo === 'preparar') {
            const c = eu.mao.find((x) => x.uid === uid);
            if (!c || !R.ehLutador(c.id)) return acoes;
            const fazer = (onde) => () => escolherPreparo(uid, onde);
            if (modo.ativo !== uid) acoes.push({ rotulo: 'Pôr no ativo', valida: true, fazer: fazer('ativo') });
            if (!modo.banco.includes(uid)) {
                const cheio = modo.banco.length >= R.VAGAS_BANCO;
                acoes.push({ rotulo: 'Pôr no banco', valida: !cheio, motivo: cheio ? 'o banco já tem 3' : null, fazer: fazer('banco') });
            }
            if (modo.ativo === uid || modo.banco.includes(uid)) acoes.push({ rotulo: 'Voltar para a mão', valida: true, fazer: fazer('mao') });
            return acoes;
        }
        if (estado.pendentes.some((p) => p.jogador === EU)) {
            if (eu.banco.some((c) => c.uid === uid)) acoes.push({ rotulo: 'Pôr no ativo', valida: true, jogada: { tipo: 'novoAtivo', uid } });
            return acoes;
        }
        if (!minhaVez()) return acoes;
        const add = (rotulo, jogada, extra = {}) => {
            const m = motivo(jogada.alvo === '?' ? { ...jogada, alvo: extra.alvos?.[0] } : jogada);
            acoes.push({ rotulo, jogada, valida: !m, motivo: m, ...extra });
        };
        const naMao = eu.mao.find((c) => c.uid === uid);
        if (naMao) {
            if (R.ehLutador(naMao.id)) add('Pôr no banco', { tipo: 'baixar', uid });
            if (R.ehCampo(naMao.id)) add('Jogar este campo', { tipo: 'campo', uid });
            if (estado.campo && R.combate(estado.campo.carta.id).campo.tipo === 'trocarCarta') add('Descartar e comprar 1 (Casa do Enzo)', { tipo: 'trocarCarta', uid });
            return acoes;
        }
        const minha = R.naMesa(eu).find((c) => c.uid === uid);
        if (!minha) return acoes;
        add('Prender a Aura aqui', { tipo: 'aura', alvo: uid });
        const poder = R.combate(minha.id).poder;
        if (poder?.ativavel) add(`Usar poder: ${poder.nome}`, { tipo: 'poder', uid });
        if (eu.banco.some((c) => c.uid === uid) && eu.ativo) {
            add(`Recuar: esta vira o ativo (gasta ${R.custoRecuo(estado, eu.ativo)} da Aura presa no ativo, que tem ${eu.ativo.aura})`, { tipo: 'recuar', para: uid });
        }
        if (eu.ativo?.uid === uid) {
            R.combate(minha.id).ataques.forEach((a, i) => {
                const puxa = (a.efeitos || []).some((e) => e.tipo === 'puxar');
                let alvos = null;
                if (a.alvo === 'qualquer') {
                    alvos = R.naMesa(ele).filter((c) => valida({ tipo: 'atacar', ataque: i, alvo: c.uid })).map((c) => c.uid);
                } else if (puxa && ele.banco.length) {
                    alvos = ele.banco.map((c) => c.uid);
                }
                const jogada = { tipo: 'atacar', ataque: i, ...(alvos ? { alvo: '?' } : {}) };
                const previsto = ele.ativo ? R.calcularDano(estado, EU, a, ele.ativo, { resultadoMoeda: true }) : 0;
                add(a.nome, jogada, { ataque: a, alvos, previsto });
            });
        }
        return acoes;
    }

    // ---------------------------------------------------------------- painel da carta
    function abrirPainel(uid) {
        const achado = acharInst(estado, uid);
        if (!achado) return;
        const { inst, jogador } = achado;
        const d = def(inst.id);
        const c = R.combate(inst.id);
        const p = mesa.painel;
        p.replaceChildren();
        p.hidden = false;
        const fechar = botao('bt-painel-fechar', '×', fecharPainel);
        fechar.setAttribute('aria-label', 'Fechar');
        const grande = el('div', 'bt-painel-carta');
        grande.appendChild(UI.carta(inst.id));
        const info = el('div', 'bt-painel-info');
        info.appendChild(el('h3', '', nomeVisivel(inst.id)));

        const naMesa = R.naMesa(estado.jogadores[jogador]).includes(inst);
        if (c.campo) {
            info.appendChild(el('p', 'bt-painel-campo', `Campo: ${c.campo.texto}`));
        } else {
            const vida = naMesa ? `${R.hpMax(estado, inst) - inst.dano}/${R.hpMax(estado, inst)}` : `${c.hp}`;
            const linha = el('p', 'bt-painel-stats');
            linha.append(el('span', 'bt-tag bt-tag--hp', `❤ ${vida} HP`), el('span', 'bt-tag', `↩ Recuo ${c.recuo}`),
                el('span', 'bt-tag', `${d.raridade === 'lendario' ? '2 pontos' : '1 ponto'} se cair`));
            if (naMesa) linha.appendChild(el('span', 'bt-tag bt-tag--aura', `✦ ${inst.aura} Aura`));
            info.appendChild(linha);
            if (c.poder) {
                const poder = el('p', 'bt-painel-poder');
                poder.append(el('strong', '', `Poder, ${c.poder.nome}: `), c.poder.texto);
                info.appendChild(poder);
            }
        }

        const acoes = jogador === EU && !ocupado ? acoesDaCarta(uid) : [];
        const ataquesDasAcoes = new Map(acoes.filter((a) => a.ataque).map((a) => [a.ataque, a]));
        if (c.ataques) {
            const lista = el('div', 'bt-ataques');
            c.ataques.forEach((a) => {
                const acao = ataquesDasAcoes.get(a);
                const b = botao('bt-ataque', null, acao ? () => escolherAtaque(acao) : null);
                const custo = el('span', 'bt-custo');
                for (let i = 0; i < a.custo; i++) custo.appendChild(el('i', 'bt-aura-pip'));
                const previsto = acao && acao.previsto !== a.dano && acao.previsto > 0 ? ` → ${acao.previsto}` : '';
                const dano = `${a.dano || '—'}${previsto}`;
                b.append(custo, el('strong', 'bt-ataque-nome', a.nome), el('span', 'bt-ataque-dano', dano),
                    el('span', 'bt-ataque-texto', descricaoAtaque(a)));
                b.disabled = !acao || !acao.valida;
                if (acao && !acao.valida) b.appendChild(el('span', 'bt-motivo', acao.motivo));
                lista.appendChild(b);
            });
            info.appendChild(lista);
        }
        const outras = el('div', 'bt-painel-acoes');
        for (const a of acoes.filter((x) => !x.ataque)) {
            const b = botao('bt-botao', a.rotulo, () => { fecharPainel(); if (a.fazer) a.fazer(); else executar(a.jogada); });
            b.disabled = !a.valida;
            if (!a.valida) b.title = a.motivo;
            outras.appendChild(b);
        }
        if (outras.children.length) info.appendChild(outras);
        info.appendChild(el('p', 'bt-painel-frase', `“${d.frase}”`));
        p.append(fechar, grande, info);
        animar(p, [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220 });
        fechar.focus({ preventScroll: true });
    }

    function fecharPainel() {
        if (mesa) mesa.painel.hidden = true;
    }

    function escolherAtaque(acao) {
        fecharPainel();
        if (!acao.alvos) { executar(acao.jogada); return; }
        const puxa = (acao.ataque.efeitos || []).some((e) => e.tipo === 'puxar');
        modo = {
            tipo: 'alvo', jogada: { tipo: 'atacar', ataque: acao.jogada.ataque }, alvos: acao.alvos,
            texto: puxa ? `${acao.ataque.nome}: escolha quem vem do banco dele.` : `${acao.ataque.nome}: escolha o alvo.`,
        };
        desenhar();
    }

    function moverSeta(e) {
        if (modo?.tipo !== 'alvo' || !mesa) return;
        const origem = cartasVivas.get(estado.jogadores[EU].ativo?.uid);
        if (origem) desenharSeta(origem, e.clientX, e.clientY);
    }

    function desenharSeta(origem, px, py) {
        const caixa = mesa.raiz.getBoundingClientRect();
        const o = origem.getBoundingClientRect();
        const x1 = o.left + o.width / 2 - caixa.left;
        const y1 = o.top - caixa.top;
        const x2 = px - caixa.left;
        const y2 = py - caixa.top;
        const meioX = (x1 + x2) / 2;
        const meioY = Math.min(y1, y2) - 60;
        mesa.seta.setAttribute('viewBox', `0 0 ${caixa.width} ${caixa.height}`);
        mesa.seta.querySelector('.bt-seta-linha').setAttribute('d', `M${x1} ${y1} Q${meioX} ${meioY} ${x2} ${y2}`);
        mesa.seta.classList.add('bt-seta--viva');
    }

    /** Pergunta sim/não dentro da mesa (confirm() não funciona em todo lugar, como no artifact). */
    function perguntar(texto, sim) {
        if (!mesa) return Promise.resolve(false);
        return new Promise((responder) => {
            const fundo = el('div', 'bt-fim bt-pergunta');
            const miolo = el('div', 'bt-fim-miolo');
            const acoes = el('div', 'bt-fim-acoes');
            const fechar = (r) => { fundo.remove(); responder(r); };
            acoes.append(botao('bt-botao bt-botao--forte', sim, () => fechar(true)), botao('bt-botao', 'Continuar jogando', () => fechar(false)));
            miolo.append(el('p', 'bt-pergunta-texto', texto), acoes);
            fundo.appendChild(miolo);
            mesa.raiz.appendChild(fundo);
            acoes.lastChild.focus({ preventScroll: true });
        });
    }

    // ---------------------------------------------------------------- Câmera (mão do NPC)
    /** Ids da mão do NPC que a Câmera mostrou, enquanto ainda é o seu turno (depois a mão muda). */
    function espiadaVisivel() {
        const e = estado?.jogadores[EU].espiada;
        return Array.isArray(e) && estado.vez === EU && estado.fase === 'jogo' ? e : null;
    }

    function mostrarEspiada(ids) {
        if (!mesa) return;
        mesa.raiz.querySelector('.bt-espiada')?.remove();
        const fundo = el('div', 'bt-fim bt-espiada');
        const miolo = el('div', 'bt-fim-miolo');
        const cartas = el('div', 'bt-espiada-cartas');
        ids.forEach((id) => cartas.appendChild(UI.carta(id)));
        miolo.append(el('h2', 'bt-espiada-titulo', '📷 Câmera: a mão do NPC'),
            ids.length ? cartas : el('p', '', 'A mão dele está vazia.'),
            el('p', 'bt-espiada-nota', 'Fica virada para cima até o fim do seu turno.'),
            botao('bt-botao bt-botao--forte', 'Fechar', () => fundo.remove()));
        fundo.appendChild(miolo);
        fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });
        mesa.raiz.appendChild(fundo);
        animar(miolo, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260 });
    }

    // ---------------------------------------------------------------- arrastar
    // Jogar é arrastar: um toque sem arrastar vira clique e só abre o painel da carta.
    let arrasto = null;
    let acabouDeArrastar = false;
    const LIMIAR = 8;   // px até o toque virar arrasto

    function apertar(e, alvo, origem) {
        if (e.button !== 0 || ocupado || !estado || !mesa) return;
        arrasto = { alvo, origem, x0: e.clientX, y0: e.clientY, id: e.pointerId, vivo: false };
        window.addEventListener('pointermove', moverArrasto);
        window.addEventListener('pointerup', soltarArrasto);
        window.addEventListener('pointercancel', cancelarArrasto);
    }

    /** Para onde dá para soltar: { el, jogada } (vale), { el, motivo } (não vale e diz por quê), ou especiais. */
    function zonasDoArrasto(origem) {
        const zonas = [];
        const eu = estado.jogadores[EU];
        const ele = estado.jogadores[NPC];
        const zona = (alvoEl, jogada) => {
            if (!alvoEl) return;
            const m = motivo(jogada);
            zonas.push(m ? { el: alvoEl, motivo: m } : { el: alvoEl, jogada });
        };
        if (modo?.tipo === 'preparar') {
            const c = origem.tipo === 'carta' && eu.mao.find((x) => x.uid === origem.uid);
            if (!c || !R.ehLutador(c.id)) return zonas;
            zonas.push({ el: mesa.eu.ativo, preparo: 'ativo' });
            mesa.eu.vagas.forEach((v) => zonas.push({ el: v, preparo: 'banco' }));
            if (modo.ativo === c.uid || modo.banco.includes(c.uid)) zonas.push({ el: mesa.mao, preparo: 'mao' });
            return zonas;
        }
        if (estado.pendentes.some((p) => p.jogador === EU)) {
            if (origem.tipo === 'carta' && eu.banco.some((c) => c.uid === origem.uid)) zona(mesa.eu.ativo, { tipo: 'novoAtivo', uid: origem.uid });
            return zonas;
        }
        if (!minhaVez() || modo) return zonas;
        if (origem.tipo === 'aura') {
            for (const c of R.naMesa(eu)) zona(elDe(c.uid), { tipo: 'aura', alvo: c.uid });
            return zonas;
        }
        const uid = origem.uid;
        const naMao = eu.mao.find((c) => c.uid === uid);
        if (naMao) {
            if (R.ehLutador(naMao.id)) {
                const jogada = { tipo: 'baixar', uid };
                const m = motivo(jogada);
                for (const v of mesa.eu.vagas) {
                    if (m) zonas.push({ el: v, motivo: m });
                    else if (!v.firstElementChild) zonas.push({ el: v, jogada });
                }
            }
            if (R.ehCampo(naMao.id)) zona(mesa.campo, { tipo: 'campo', uid });
            return zonas;
        }
        if (eu.banco.some((c) => c.uid === uid)) {
            zona(mesa.eu.ativo, { tipo: 'recuar', para: uid });
            return zonas;
        }
        if (eu.ativo?.uid === uid) {
            // Ativo até o adversário: ataca. Ataques que acertam qualquer um aceitam o banco também.
            const podeBanco = R.combate(eu.ativo.id).ataques.some((a) => a.alvo === 'qualquer');
            for (const c of R.naMesa(ele)) {
                if (c === ele.ativo || podeBanco) zonas.push({ el: elDe(c.uid), atacar: c.uid });
            }
        }
        return zonas;
    }

    function comecarArrasto() {
        const zonas = zonasDoArrasto(arrasto.origem);
        if (!zonas.length) return false;
        fecharPainel();
        const caixa = arrasto.alvo.getBoundingClientRect();
        const fantasma = arrasto.alvo.cloneNode(true);
        fantasma.classList.add('bt-fantasma');
        fantasma.classList.remove('bt-carta--pode');
        Object.assign(fantasma.style, { left: `${caixa.left}px`, top: `${caixa.top}px`, width: `${caixa.width}px`, height: `${caixa.height}px` });
        document.body.appendChild(fantasma);
        arrasto.alvo.classList.add('bt-arrastando');
        for (const z of zonas) z.el.classList.add(z.motivo ? 'bt-zona--nao' : 'bt-zona');
        Object.assign(arrasto, { vivo: true, zonas, fantasma, sobre: null });
        mesa.raiz.classList.add('bt-mesa--arrastando');
        return true;
    }

    function zonaEm(x, y) {
        const embaixo = document.elementsFromPoint(x, y);
        // A mais específica primeiro: carta antes da vaga, vaga antes da mão inteira.
        let melhor = null;
        for (const z of arrasto.zonas) {
            const i = embaixo.findIndex((n) => z.el === n || z.el.contains(n));
            if (i >= 0 && (!melhor || i < melhor.i)) melhor = { z, i };
        }
        return melhor?.z || null;
    }

    function moverArrasto(e) {
        if (!arrasto || e.pointerId !== arrasto.id) return;
        const dx = e.clientX - arrasto.x0;
        const dy = e.clientY - arrasto.y0;
        if (!arrasto.vivo) {
            if (Math.hypot(dx, dy) < LIMIAR) return;
            if (!comecarArrasto()) { fimArrasto(); return; }
        }
        e.preventDefault();
        arrasto.fantasma.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-12, Math.min(12, dx / 20))}deg) scale(1.08)`;
        const z = zonaEm(e.clientX, e.clientY);
        if (z !== arrasto.sobre) {
            arrasto.sobre?.el.classList.remove('bt-zona--sobre');
            z?.el.classList.add('bt-zona--sobre');
            arrasto.sobre = z;
        }
        if (arrasto.origem.tipo === 'carta' && arrasto.zonas.some((x) => x.atacar)) desenharSeta(arrasto.alvo, e.clientX, e.clientY);
    }

    function soltarArrasto(e) {
        if (!arrasto || e.pointerId !== arrasto.id) return;
        const { vivo, origem } = arrasto;
        const z = vivo ? zonaEm(e.clientX, e.clientY) : null;
        fimArrasto();
        if (!vivo) return;
        acabouDeArrastar = true;
        setTimeout(() => { acabouDeArrastar = false; }, 0);
        if (!z) return;
        if (z.preparo) escolherPreparo(origem.uid, z.preparo);
        else if (z.motivo) balao(z.el, z.motivo, 'erro');
        else if (z.atacar) soltarAtaque(z.atacar, z.el);
        else if (z.jogada) executar(z.jogada);
    }

    function cancelarArrasto(e) {
        if (arrasto && e.pointerId === arrasto.id) fimArrasto();
    }

    function fimArrasto() {
        window.removeEventListener('pointermove', moverArrasto);
        window.removeEventListener('pointerup', soltarArrasto);
        window.removeEventListener('pointercancel', cancelarArrasto);
        if (!arrasto) return;
        arrasto.fantasma?.remove();
        arrasto.alvo.classList.remove('bt-arrastando');
        for (const z of arrasto.zonas || []) z.el.classList.remove('bt-zona', 'bt-zona--nao', 'bt-zona--sobre');
        mesa?.raiz.classList.remove('bt-mesa--arrastando');
        mesa?.seta.classList.remove('bt-seta--viva');
        arrasto = null;
    }

    /** Soltou o ativo em cima de uma carta do NPC: um ataque só ataca direto; mais de um abre o painel. */
    function soltarAtaque(alvoUid, alvoEl) {
        const eu = estado.jogadores[EU];
        const ele = estado.jogadores[NPC];
        const ataques = acoesDaCarta(eu.ativo.uid).filter((a) => a.ataque);
        const noAtivo = alvoUid === ele.ativo?.uid;
        const servem = ataques.filter((a) => a.valida && (a.ataque.alvo === 'qualquer' ? a.alvos.includes(alvoUid) : noAtivo));
        if (!servem.length) {
            const m = ataques.find((a) => !a.valida)?.motivo || 'nenhum ataque acerta essa carta';
            balao(alvoEl, `Não dá: ${m}`, 'erro');
            return;
        }
        if (servem.length > 1) { abrirPainel(eu.ativo.uid); return; }
        const [acao] = servem;
        if (acao.ataque.alvo === 'qualquer') executar({ ...acao.jogada, alvo: alvoUid });
        else escolherAtaque(acao);
    }

    async function sair() {
        if (ocupado) return;
        if (estado && estado.fase !== 'fim' && !(await perguntar('Sair desta batalha? Ela não fica salva.', 'Sair'))) return;
        estado = null;
        partida++;
        telaMenu();
    }

    async function desistir() {
        if (!estado || estado.fase === 'fim' || ocupado) return;
        if (!(await perguntar('Desistir desta batalha? O NPC ganha.', 'Desistir'))) return;
        executar({ tipo: 'desistir' });
    }

    // ---------------------------------------------------------------- execução
    async function executar(jogada) {
        if (ocupado || !estado) return;
        await passo({ jogador: EU, ...jogada });
        await continuar();
    }

    async function passo(jogada) {
        ocupado = true;
        fecharPainel();
        const antes = estado;
        let r;
        try {
            r = R.aplicar(estado, jogada);
        } catch (err) {
            ocupado = false;
            balao(mesa.raiz, err.message, 'erro');
            desenhar();
            return;
        }
        estado = r.estado;
        for (const ev of r.eventos) {
            registrarEvento(ev, antes);
            try { await tocar(ev, antes); } catch (err) { console.error(err); }
        }
        ocupado = false;
        desenhar();
    }

    /** NPC joga (e, no modo automático, o robô joga por você também). */
    async function continuar() {
        const minha = partida;
        while (estado && estado.fase !== 'fim') {
            const quem = Robo.quemJoga(estado);
            if (quem === EU && !AUTO) break;
            await esperar(quem === NPC ? 650 : 250);
            if (partida !== minha || !estado) return;   // saiu ou começou outra batalha
            const jogada = Robo.escolherJogada(estado, quem, { nivel: quem === NPC ? nivel : 'normal' });
            await passo(jogada);
        }
        if (estado?.fase === 'fim') telaFim();
    }

    // ---------------------------------------------------------------- histórico
    function registrar(texto) {
        log.unshift(texto);
        log = log.slice(0, 60);
        if (!mesa) return;
        const li = el('li', '', texto);
        mesa.log.prepend(li);
        while (mesa.log.children.length > 60) mesa.log.lastChild.remove();
    }
    function registrarEvento(ev, antes) {
        const quem = (j) => (j === EU ? 'Você' : 'O NPC');
        const n = (uid) => nomeDoUid(uid, estado, antes);
        switch (ev.tipo) {
            case 'inicio': registrar(`${quem(ev.primeiro)} começa.`); break;
            case 'turno': registrar(`— Turno ${ev.turno}: ${ev.jogador === EU ? 'sua vez' : 'vez do NPC'} —`); break;
            case 'compra': if (ev.jogador === EU) registrar(`Você comprou ${nomeVisivel(ev.id)}.`); break;
            case 'baixar': registrar(`${quem(ev.jogador)} pôs ${nomeVisivel(ev.id)} no banco.`); break;
            case 'aura': registrar(`${n(ev.uid)} ganhou Aura (${ev.aura}).`); break;
            case 'campo': registrar(`${quem(ev.jogador)} jogou o campo ${nomeVisivel(ev.id)}.`); break;
            case 'campoSai': registrar(`O campo ${nomeVisivel(ev.id)} saiu da mesa.`); break;
            case 'ataque': registrar(`${n(ev.uid)} usou ${ev.nome} em ${n(ev.alvo)}.`); break;
            case 'dano': registrar(`${n(ev.uid)} levou ${ev.valor}${ev.fonte === 'notificado' ? ' (Notificado)' : ''}.`); break;
            case 'cura': registrar(`${n(ev.uid)} curou ${ev.valor}.`); break;
            case 'nocaute': registrar(`💥 ${nomeVisivel(ev.id)} caiu! +${ev.pontos} ${ev.pontos === 1 ? 'ponto' : 'pontos'} para ${quem(ev.para).toLowerCase()}.`); break;
            case 'estado': registrar(`${n(ev.uid)} ficou ${ESTADOS[ev.estado].nome}.`); break;
            case 'imune': registrar(`${n(ev.uid)} acabou de ser ${ESTADOS[ev.estado].nome.toLowerCase()} e não pode ser de novo agora.`); break;
            case 'troca': registrar(`${n(ev.entra)} entrou no lugar de ${n(ev.sai)}.`); break;
            case 'poder': registrar(`${n(ev.uid)} usou o poder ${ev.nome}.`); break;
            case 'moeda': registrar(`Moeda: ${ev.resultado}.`); break;
            case 'ataqueFalhou': registrar(`${n(ev.uid)} estava Iludido e errou!`); break;
            case 'espiar': if (ev.jogador === EU) registrar(`Câmera: a mão do NPC tem ${ev.ids.map(nomeVisivel).join(', ') || 'nada'}.`); break;
            case 'novoAtivo': registrar(`${quem(ev.jogador)} pôs ${n(ev.uid)} no ativo.`); break;
            case 'descartar': registrar(`${quem(ev.jogador)} descartou ${nomeVisivel(ev.id)}.`); break;
            case 'fim': registrar(ev.vencedor === 'empate' ? 'Empate!' : `${quem(ev.vencedor)} venceu!`); break;
            default: break;
        }
    }

    // ---------------------------------------------------------------- animações
    const elDe = (uid) => cartasVivas.get(uid) || null;
    function centro(elemento) {
        const r = elemento.getBoundingClientRect();
        const c = mesa.raiz.getBoundingClientRect();
        return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top, w: r.width, h: r.height };
    }

    function balao(perto, texto, tipo = '') {
        if (!mesa) return Promise.resolve();
        const b = el('div', `bt-balao ${tipo ? `bt-balao--${tipo}` : ''}`, texto);
        const c = centro(perto);
        b.style.left = `${c.x}px`;
        b.style.top = `${c.y - c.h / 2}px`;
        mesa.efeitos.appendChild(b);
        const fim = animar(b, [
            { transform: 'translate(-50%, -40%) scale(.4) rotate(-8deg)', opacity: 0 },
            { transform: 'translate(-50%, -100%) scale(1.1) rotate(-3deg)', opacity: 1, offset: 0.25 },
            { transform: 'translate(-50%, -110%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.8 },
            { transform: 'translate(-50%, -140%) scale(.9)', opacity: 0 },
        ], { duration: 1100 });
        fim.then(() => b.remove());
        if (semMovimento()) setTimeout(() => b.remove(), 600);
        return fim;
    }

    function numero(perto, texto, tipo) {
        const n = el('div', `bt-numero bt-numero--${tipo}`, texto);
        const c = centro(perto);
        n.style.left = `${c.x}px`;
        n.style.top = `${c.y}px`;
        mesa.efeitos.appendChild(n);
        const fim = animar(n, [
            { transform: 'translate(-50%, -50%) scale(.3)', opacity: 0 },
            { transform: 'translate(-50%, -80%) scale(1.4)', opacity: 1, offset: 0.2 },
            { transform: 'translate(-50%, -120%) scale(1)', opacity: 1, offset: 0.75 },
            { transform: 'translate(-50%, -170%) scale(.9)', opacity: 0 },
        ], { duration: 1000 });
        fim.then(() => n.remove());
        if (semMovimento()) setTimeout(() => n.remove(), 700);
    }

    function voar(de, para, classe, conteudo) {
        const a = centro(de);
        const b = centro(para);
        const v = el('div', `bt-voo ${classe}`);
        if (conteudo) v.appendChild(conteudo);
        v.style.left = `${a.x}px`;
        v.style.top = `${a.y}px`;
        mesa.efeitos.appendChild(v);
        const fim = animar(v, [
            { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0.2 },
            { transform: `translate(calc(-50% + ${(b.x - a.x) / 2}px), calc(-50% + ${(b.y - a.y) / 2 - 60}px)) scale(1.2)`, opacity: 1, offset: 0.5 },
            { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.8)`, opacity: 1 },
        ], { duration: 480, easing: 'ease-in-out' });
        return fim.then(() => v.remove());
    }

    function tremer(alvo, forca = 8) {
        return animar(alvo, [
            { transform: 'translate(0,0)' }, { transform: `translate(${-forca}px, ${forca / 2}px) rotate(-2deg)` },
            { transform: `translate(${forca}px, ${-forca / 2}px) rotate(2deg)` }, { transform: `translate(${-forca / 2}px, 0)` },
            { transform: 'translate(0,0)' },
        ], { duration: 320, easing: 'linear' });
    }

    function banner(texto, tipo = '') {
        const b = el('div', `bt-banner ${tipo ? `bt-banner--${tipo}` : ''}`, texto);
        mesa.efeitos.appendChild(b);
        const fim = animar(b, [
            { transform: 'translate(-50%, -50%) scale(2) rotate(-6deg)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.2 },
            { transform: 'translate(-50%, -50%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.8 },
            { transform: 'translate(-50%, -50%) scale(.8) rotate(-4deg)', opacity: 0 },
        ], { duration: 1000 });
        fim.then(() => b.remove());
        if (semMovimento()) setTimeout(() => b.remove(), 500);
        return fim;
    }

    function moeda(resultado) {
        const caixa = el('div', 'bt-moeda');
        const face = (lado) => {
            const f = el('div', `bt-moeda-face bt-moeda-face--${lado}`);
            if (arte(ARTE.moeda[lado])) f.style.backgroundImage = `url('${arte(ARTE.moeda[lado])}')`;
            else f.textContent = lado === 'cara' ? 'ENZO' : 'TORADO';
            return f;
        };
        const disco = el('div', 'bt-moeda-disco');
        disco.append(face('cara'), face('coroa'));
        caixa.append(disco, el('div', 'bt-moeda-rotulo', resultado === 'cara' ? 'CARA!' : 'COROA!'));
        mesa.efeitos.appendChild(caixa);
        const voltas = 5 * 360 + (resultado === 'cara' ? 0 : 180);
        disco.style.transform = `rotateY(${voltas}deg)`;
        const fim = animar(disco, [
            { transform: 'translateY(0) rotateY(0deg)' },
            { transform: `translateY(-80px) rotateY(${voltas / 2}deg)`, offset: 0.45 },
            { transform: `translateY(0) rotateY(${voltas}deg)` },
        ], { duration: 900, easing: 'cubic-bezier(.3,.6,.4,1)' });
        return fim.then(() => esperar(450)).then(() => caixa.remove());
    }

    async function tocar(ev, antes) {
        if (!mesa) return;
        switch (ev.tipo) {
            case 'inicio':
                await banner(ev.primeiro === EU ? 'VOCÊ COMEÇA!' : 'O NPC COMEÇA!');
                break;
            case 'turno':
                desenhar();
                if (ev.jogador === EU) await banner('SUA VEZ!', 'eu');
                break;
            case 'ataque': {
                const a = elDe(ev.uid);
                const alvo = elDe(ev.alvo);
                if (!a || !alvo) break;
                balao(a, ev.nome, 'ataque');
                await esperar(350);
                const p = centro(a);
                const q = centro(alvo);
                const dx = (q.x - p.x) * 0.72;
                const dy = (q.y - p.y) * 0.72;
                a.classList.add('bt-carta--atacando');
                await animar(a, [
                    { transform: 'none' },
                    { transform: `translate(${-dx * 0.08}px, ${-dy * 0.08}px) scale(1.12) rotate(-4deg)`, offset: 0.3 },
                    { transform: `translate(${dx}px, ${dy}px) scale(1.15) rotate(3deg)`, offset: 0.55 },
                    { transform: 'none' },
                ], { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)' });
                a.classList.remove('bt-carta--atacando');
                break;
            }
            case 'dano': {
                const alvo = elDe(ev.uid);
                if (!alvo) break;
                const hp = alvo.querySelector('.bt-hp');
                if (hp) {
                    const vida = Math.max(0, ev.hp - ev.dano);
                    hp.textContent = vida;
                    hp.style.setProperty('--vida', `${(100 * vida) / ev.hp}%`);
                }
                numero(alvo, `-${ev.valor}`, 'dano');
                alvo.classList.add('bt-carta--ferida');
                setTimeout(() => alvo.classList.remove('bt-carta--ferida'), 350);
                await tremer(alvo, 6 + Math.min(10, ev.valor / 10));
                if (ev.valor >= 90) tremer(mesa.raiz, 10);
                break;
            }
            case 'cura': {
                const alvo = elDe(ev.uid);
                if (alvo) { numero(alvo, `+${ev.valor}`, 'cura'); await esperar(350); }
                break;
            }
            case 'nocaute': {
                const alvo = elDe(ev.uid);
                if (!alvo) break;
                const lado = ev.para === EU ? mesa.eu : mesa.npc;
                balao(alvo, 'NOCAUTE!', 'nocaute');
                await animar(alvo, [
                    { transform: 'none', filter: 'none', opacity: 1 },
                    { transform: 'scale(1.1) rotate(-6deg)', filter: 'brightness(2) saturate(0)', opacity: 1, offset: 0.25 },
                    { transform: 'translateY(40px) scale(.6) rotate(18deg)', filter: 'brightness(.4) blur(2px)', opacity: 0 },
                ], { duration: 650, easing: 'ease-in', fill: 'forwards' });
                const pontos = lado.pontos;
                const antesPontos = antes.jogadores[ev.para].pontos;
                const feitos = [...pontos.children].slice(0, Math.min(R.PONTOS_VITORIA, antesPontos + ev.pontos));
                feitos.forEach((p) => p.classList.add('bt-ponto--feito'));
                animar(pontos, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 400 });
                break;
            }
            case 'moeda':
                await moeda(ev.resultado);
                break;
            case 'estado': {
                const alvo = elDe(ev.uid);
                if (alvo) await balao(alvo, `${ESTADOS[ev.estado].icone} ${ESTADOS[ev.estado].nome}!`, 'estado');
                break;
            }
            case 'escudo': {
                const alvo = elDe(ev.uid);
                if (alvo) await balao(alvo, '( 🛡️ )', 'estado');
                break;
            }
            case 'imune': {
                const alvo = elDe(ev.uid);
                if (alvo) await balao(alvo, `Já foi ${ESTADOS[ev.estado].nome}!`, 'estado');
                break;
            }
            case 'bloqueado': {
                const alvo = elDe(ev.uid);
                if (alvo) await balao(alvo, 'BLOQUEADO!', 'estado');
                break;
            }
            case 'aura': {
                const alvo = elDe(ev.uid);
                if (!alvo) break;
                const de = ev.fonte === 'turno' && antes.vez === EU ? mesa.aura : alvo;
                const orbe = el('span', 'bt-orbe');
                if (arte(ARTE.aura)) orbe.style.backgroundImage = `url('${arte(ARTE.aura)}')`;
                if (de !== alvo) await voar(de, alvo, 'bt-voo--aura', orbe);
                const pips = alvo.querySelector('.bt-auras');
                if (pips) pips.appendChild(el('i', 'bt-aura-pip bt-aura-pip--nova'));
                await animar(alvo, [{ filter: 'drop-shadow(0 0 0 #ffe14d)' }, { filter: 'drop-shadow(0 0 18px #ffe14d)' }, { filter: 'drop-shadow(0 0 0 #ffe14d)' }], { duration: 420 });
                break;
            }
            case 'poder': {
                const alvo = elDe(ev.uid);
                if (alvo) await balao(alvo, `✨ ${ev.nome}`, 'poder');
                break;
            }
            case 'ataqueFalhou': {
                const alvo = elDe(ev.uid);
                if (alvo) await balao(alvo, '💘 Iludido! Errou!', 'estado');
                break;
            }
            case 'campo': {
                desenhar();
                const carta = elDe(ev.uid);
                if (carta) {
                    await animar(carta, [
                        { transform: 'scale(2.4) rotate(-200deg)', opacity: 0 },
                        { transform: 'scale(1.3) rotate(10deg)', opacity: 1, offset: 0.7 },
                        { transform: 'none', opacity: 1 },
                    ], { duration: 700 });
                }
                await banner(nomeVisivel(ev.id).toUpperCase(), 'campo');
                break;
            }
            case 'campoSai': {
                const carta = elDe(ev.uid);
                if (carta) await animar(carta, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.3) rotate(90deg)', opacity: 0 }], { duration: 400, fill: 'forwards' });
                break;
            }
            case 'baixar':
            case 'troca':
            case 'novoAtivo':
            case 'descartar':
                desenhar();
                await esperar(380);
                break;
            case 'compra':
                if (ev.jogador === EU) {
                    desenhar();
                    await esperar(160);
                }
                break;
            case 'espiar':
                if (ev.jogador === EU) {
                    await banner('📷 Câmera!', 'campo');
                    if (!AUTO) mostrarEspiada(ev.ids);
                }
                break;
            case 'preparado':
                if (ev.jogador === EU) desenhar();
                break;
            case 'escolherAtivo':
                if (ev.jogador === EU) desenhar();
                break;
            default:
                break;
        }
    }

    // ---------------------------------------------------------------- fim
    function telaFim() {
        if (!mesa || mesa.raiz.querySelector('.bt-fim--vitoria, .bt-fim--derrota, .bt-fim--empate')) return;
        desenhar();
        const v = estado.vencedor;
        const tipo = v === 'empate' ? 'empate' : (v === EU ? 'vitoria' : 'derrota');
        const titulos = { vitoria: 'VITÓRIA!', derrota: 'DERROTA...', empate: 'EMPATE!' };
        const motivos = {
            pontos: 'Fez 3 pontos.', mesaVazia: 'Ficou sem ninguém na mesa.', limiteTurnos: 'Acabaram os 30 turnos.',
            desistencia: 'Alguém desistiu.', empate: 'Os dois chegaram lá juntos.',
        };
        const caixa = el('div', `bt-fim bt-fim--${tipo}`);
        const miolo = el('div', 'bt-fim-miolo');
        miolo.append(el('h2', 'bt-fim-titulo', titulos[tipo]), el('p', '', motivos[estado.motivo] || ''),
            el('p', 'bt-fim-placar', `Placar: ${estado.jogadores[EU].pontos} × ${estado.jogadores[NPC].pontos}`));
        const acoes = el('div', 'bt-fim-acoes');
        acoes.append(botao('bt-botao bt-botao--forte', 'Jogar de novo', () => comecar(nivel)), botao('bt-botao', 'Menu', telaMenu));
        miolo.appendChild(acoes);
        caixa.appendChild(miolo);
        if (tipo === 'vitoria' && !semMovimento()) {
            for (let i = 0; i < 40; i++) {
                const c = el('i', 'bt-confete');
                c.style.left = `${Math.random() * 100}%`;
                c.style.setProperty('--cor', ['#ffcc00', '#f58220', '#8a2be2', '#1f9e90', '#e0301e'][i % 5]);
                c.style.animationDelay = `${Math.random() * 0.8}s`;
                caixa.appendChild(c);
            }
        }
        mesa.raiz.appendChild(caixa);
        animar(miolo, [{ transform: 'scale(.3) rotate(-10deg)', opacity: 0 }, { transform: 'scale(1.08) rotate(-2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 600 });
        acoes.querySelector('button').focus({ preventScroll: true });
        window.EnzoBatalha.ultimoResultado = { vencedor: v, motivo: estado.motivo, turno: estado.turno };
    }

    // ---------------------------------------------------------------- início
    window.EnzoBatalha = {
        get estado() { return estado; },
        comecar, telaMenu, DECKS, ARTE,
        ultimoResultado: null,
    };
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !mesa) return;
        if (!mesa.painel.hidden) fecharPainel();
        else if (modo && modo.tipo !== 'preparar') { modo = null; desenhar(); }
    });
    telaMenu();
    if (AUTO) comecar(params.get('nivel') || 'normal');
})();
