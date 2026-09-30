// ============================================================================
// Painel do admin (admin.html): um terminal que conversa com /api/admin/*.
// Tudo é comando ("help" lista), mas quase tudo também é clicável: nomes abrem a conta,
// botões agem no lugar e a tela é SUBSTITUÍDA (nada de empilhar linhas): só há uma tela,
// migalhas para voltar e uma linha de aviso. Digitar continua funcionando.
// Quem não é admin só vê "acesso negado": a API responde 404 para os outros,
// então esta página não tem nada de secreto — o poder está no servidor.
// Todo texto vindo do banco entra com textContent (nunca innerHTML).
// ============================================================================
(() => {
    'use strict';

    const C = window.EnzoConquistas;
    const B = window.EnzoBaralho;
    const JOGOS = { 'flappy-enzo': 'Flappy Enzo', 'ronda-noturna': 'Degustação Noturna' };
    const APELIDOS_JOGO = { flappy: 'flappy-enzo', 'flappy-enzo': 'flappy-enzo', degustacao: 'ronda-noturna', ronda: 'ronda-noturna', 'ronda-noturna': 'ronda-noturna' };
    const APELIDOS_PACOTE = {
        est: 'estacionamento',
        estacionamento: 'estacionamento',
        tor: 'toradolandia',
        toradolandia: 'toradolandia',
        pis: 'piscina-de-macarronada',
        'piscina-de-macarronada': 'piscina-de-macarronada',
    };
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const $ = (id) => document.getElementById(id);
    const saida = $('saida');
    const entrada = $('entrada');
    const ps = $('ps');
    const feedback = $('feedback');

    const estado = {
        eu: null,
        alvo: null,         // conta aberta (detalhe da API)
        contas: [],         // última lista de "users" (open <n>)
        partidas: [],       // última lista de partidas (hide/show/rm <n>)
        historico: [],
        posHistorico: 0,
        confirmar: null,    // ação esperando "s"
        tela: null,         // comando da tela aberta (para "atualizar")
        pilha: [],          // comandos das telas anteriores (para "voltar")
        secoes: {},         // seções dobráveis abertas/fechadas (lembra entre contas)
        numeros: null,
        apiFalhou: false,
    };

    // ---------------------------------------------------------------- servidor
    const pedir = window.EnzoApi.exigir;

    // ---------------------------------------------------------------- saída
    function el(tag, classe, texto) {
        const no = document.createElement(tag);
        if (classe) no.className = classe;
        if (texto !== undefined && texto !== null) no.textContent = String(texto);
        return no;
    }

    /** Onde o conteúdo entra: a saída (boot) ou a tela atual (ou uma seção dobrável dela). */
    let destino = saida;
    let tela = null;

    function imprimir(no) {
        destino.appendChild(no);
        return no;
    }

    /** Roda `fn` imprimindo dentro de `caixa` (ex.: o corpo de uma seção). */
    function dentroDe(caixa, fn) {
        const antes = destino;
        destino = caixa;
        try { fn(); } finally { destino = antes; }
    }

    /**
     * Troca a tela inteira (não acrescenta). `caminho` são as migalhas: [[rótulo, comando?], ...].
     * `comando` fica guardado para "atualizar"; o anterior vai para a pilha do "voltar".
     */
    function novaTela(comando, caminho = []) {
        if (estado.tela && estado.tela !== comando) {
            estado.pilha.push(estado.tela);
            if (estado.pilha.length > 30) estado.pilha.shift();
        }
        estado.tela = comando;
        const migalhas = el('nav', 'migalhas');
        migalhas.setAttribute('aria-label', 'Onde estou');
        const btVoltar = el('button', 'cmd cmd--link', '‹ voltar');
        btVoltar.type = 'button';
        btVoltar.disabled = !estado.pilha.length;
        btVoltar.title = 'voltar para a tela anterior (Esc)';
        btVoltar.addEventListener('click', () => voltar());
        migalhas.appendChild(btVoltar);
        [['início', 'status'], ...caminho].forEach(([rotulo, cmd], i, todos) => {
            if (i) migalhas.appendChild(span('migalha-sep', '›'));
            if (cmd && i < todos.length - 1) migalhas.appendChild(botao(rotulo, cmd, { link: true }));
            else migalhas.appendChild(span('migalha-atual', rotulo));
        });
        const atualizar = el('button', 'cmd cmd--link migalha-atualizar', '↻ atualizar');
        atualizar.type = 'button';
        atualizar.addEventListener('click', () => {
            const atual = estado.tela;
            estado.tela = null;
            if (atual) rodar(atual);
        });
        migalhas.appendChild(atualizar);
        tela = el('div', 'tela');
        saida.replaceChildren(migalhas, tela);
        saida.scrollTop = 0;
        destino = tela;
        return tela;
    }

    /** Uma linha só de retorno, sempre no mesmo lugar (some sozinha; a próxima substitui). */
    let apagaAviso = 0;
    function notificar(conteudo, tipo = 'ok', { fixo = false } = {}) {
        clearTimeout(apagaAviso);
        delete feedback.dataset.carregando;
        feedback.className = `feedback feedback--${tipo}`;
        feedback.replaceChildren(...[].concat(conteudo).map((p) => (p instanceof Node ? p : document.createTextNode(String(p)))));
        if (!fixo && conteudo) apagaAviso = setTimeout(() => { if (!estado.confirmar) feedback.replaceChildren(); }, tipo === 'erro' ? 9000 : 4500);
    }

    function linha(partes, classe = '') {
        const p = el('p', `l ${classe}`.trim());
        for (const parte of [].concat(partes)) {
            if (parte === null || parte === undefined || parte === false) continue;
            p.append(parte instanceof Node ? parte : document.createTextNode(String(parte)));
        }
        return imprimir(p);
    }
    const ok = (texto) => notificar(`✔ ${texto}`, 'ok');
    const aviso = (texto) => linha(texto, 'l--aviso');
    const erro = (texto) => notificar(`✖ ${texto}`, 'erro');
    const apagado = (texto) => linha(texto, 'l--apagado');
    const secao = (texto) => linha(`── ${texto} ${'─'.repeat(Math.max(4, 44 - texto.length))}`, 'l--secao');
    const span = (classe, texto) => el('span', classe, texto);

    /**
     * [rótulo] que roda um comando. Com `preencher`, só deixa o comando no prompt para
     * completar (ex.: "grant "). Com `seguro`, exige um segundo clique ("certeza?") no próprio botão.
     */
    function botao(rotulo, comando, { perigo = false, link = false, preencher = false, seguro = false } = {}) {
        const b = el('button', `cmd${perigo ? ' cmd--perigo' : ''}${link ? ' cmd--link' : ''}`, rotulo);
        b.type = 'button';
        b.title = comando;
        let armado = 0;
        b.addEventListener('click', () => {
            if (preencher) { entrada.value = comando; entrada.focus(); return; }
            if (seguro && !armado) {
                b.textContent = 'certeza?';
                b.classList.add('cmd--armado');
                armado = setTimeout(() => { armado = 0; b.textContent = rotulo; b.classList.remove('cmd--armado'); }, 3000);
                return;
            }
            clearTimeout(armado);
            armado = 0;
            b.textContent = rotulo;
            b.classList.remove('cmd--armado');
            rodar(comando);
        });
        return b;
    }
    const botaoSeguro = (rotulo, comando) => botao(rotulo, comando, { perigo: true, seguro: true });

    /** `aoClicar(i)` deixa a linha inteira clicável (além dos botões dentro dela). */
    function tabela(cabecalho, linhas, aoClicar = null) {
        const grade = el('div', `tabela${aoClicar ? ' tabela--clicavel' : ''}`);
        grade.style.gridTemplateColumns = `repeat(${cabecalho.length}, auto)`;
        for (const titulo of cabecalho) grade.appendChild(el('span', 'cab', titulo));
        for (const celulas of linhas) {
            const tr = el('div', 'tabela-linha');
            const indice = grade.querySelectorAll('.tabela-linha').length;
            for (const celula of celulas) {
                const td = el('span');
                if (aoClicar) td.addEventListener('click', (e) => { if (!e.target.closest('button, input, a')) aoClicar(indice); });
                for (const parte of [].concat(celula)) {
                    if (parte === null || parte === undefined) continue;
                    td.append(parte instanceof Node ? parte : document.createTextNode(String(parte)));
                }
                tr.appendChild(td);
            }
            grade.appendChild(tr);
        }
        return imprimir(grade);
    }

    const esperar = (ms) => new Promise((r) => setTimeout(r, calmo ? 0 : ms));
    const data = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
    const duracao = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const idCurto = (id) => String(id).slice(0, 8);
    const jogo = (id) => JOGOS[id] || id;
    const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '?';

    function atualizarPrompt() {
        const pasta = estado.alvo ? `~/${primeiroNome(estado.alvo.name).toLowerCase()}` : '~';
        ps.textContent = estado.confirmar ? 'confirmar [s/N]:' : `root@enzo:${pasta}$`;
    }

    // ---------------------------------------------------------------- painel lateral
    function barra(parte, total, largura = 18) {
        const cheio = total > 0 ? Math.max(0, Math.min(largura, Math.round((parte / total) * largura))) : 0;
        const b = el('span', 'numero-barra');
        b.append('[', el('b', '', '|'.repeat(cheio)), '·'.repeat(largura - cheio), ']');
        return b;
    }

    function mostrarNumeros(n) {
        estado.numeros = n;
        const caixa = $('numeros');
        caixa.replaceChildren();
        const itens = [
            ['contas', n.contas, null, 'users'],
            ['ativos 7d', n.ativos_7d, n.contas, 'users'],
            ['sessões', n.sessoes, n.contas, 'users'],
            ['partidas', n.partidas, n.partidas + n.partidas_fora, 'scores'],
            ['conquistas', n.conquistas, null, 'users'],
            ['caps lidos', n.capitulos_lidos, null, 'users'],
            ['banidos', n.banidos, n.contas, 'users'],
        ];
        for (const [rotulo, valor, total, destino] of itens) {
            const item = el('button', 'numero');
            item.type = 'button';
            item.title = destino;
            item.addEventListener('click', () => rodar(destino));
            item.append(el('span', 'numero-rotulo', rotulo), el('span', 'numero-valor', valor));
            if (total !== null) item.appendChild(barra(valor, total));
            caixa.appendChild(item);
        }
    }

    function mostrarAtalhos() {
        const nav = $('atalhos');
        nav.replaceChildren(el('p', 'atalhos-titulo', 'atalhos rápidos'));
        for (const comando of ['status', 'users', 'reveal', 'scores', 'log', 'help', 'exit']) nav.appendChild(botao(comando, comando));
    }

    function mostrarDashboard() {
        const grade = $('dashboard-grid');
        grade.replaceChildren();
        const grupos = [
            ['SISTEMA', 'Estado e acesso', [['status', 'status'], ['quem sou', 'whoami'], ['histórico', 'log']]],
            ['LEITORES', 'Contas e conquistas', [['listar leitores', 'users'], ['ajuda', 'help']]],
            ['GIBIS', 'Capítulos escondidos', [['ver escondidos', 'reveal'], ['esconder gibi', 'hide']]],
            ['PARTIDAS', 'Ranking e placares', [['todas', 'scores'], ['Flappy', 'scores flappy'], ['Degustação', 'scores degustacao']]],
        ];
        for (const [titulo, descricao, acoes] of grupos) {
            const grupo = el('section', 'dashboard-grupo');
            grupo.append(el('h2', '', titulo), el('p', '', descricao));
            for (const [rotulo, comando] of acoes) {
                const acao = botao(rotulo, comando);
                acao.classList.add('dashboard-acao');
                acao.appendChild(el('span', 'dashboard-comando', comando));
                grupo.appendChild(acao);
            }
            grade.appendChild(grupo);
        }
    }

    const quadrosAscii = [
        ['  .------.', ' (  o  o  )', '|    __    |', '|   (__)   |', ' (  ||  )', '  [====]'].join('\n'),
        ['  .------.', ' (  -  -  )', '|    __    |', '|   (__)   |', ' (  ||  )', '  [====]'].join('\n'),
        ['  .------.', ' (  o  o  )', '|    __    |', '|   (__)   |', ' (  ||  )', '  [====]'].join('\n'),
        ['  .------.', ' (  O  O  )', '|    __    |', '|   (__)   |', ' (  ||  )', '  [====]'].join('\n'),
    ];
    let quadro = 0;
    function desenharAscii() {
        $('ascii-mascote').textContent = quadrosAscii[quadro % quadrosAscii.length];
        $('dashboard-mobile-pulse').textContent = '[' + '#'.repeat((quadro % 5) + 1).padEnd(5, '.') + ']';
        const progresso = '#'.repeat((quadro % 13) + 3).padEnd(15, '.');
        const n = estado.numeros;
        $('dashboard-sinal').textContent = `+-- ENZO / TELEMETRIA ----------------+\n| LINK     ${estado.apiFalhou ? 'OFFLINE' : n ? 'ONLINE ' : 'AUTH...'}   ${String(quadro % 100).padStart(2, '0')}            |\n| CONTAS   ${String(n?.contas ?? '--').padStart(5)}                   |\n| PULSO    [${progresso}]   |\n+------------------------------------+`;
        quadro++;
    }
    desenharAscii();
    if (!calmo) setInterval(() => { if (!document.hidden) desenharAscii(); }, 650);

    // ---------------------------------------------------------------- conta aberta
    /** Marca [x]/[ ] e a grade de secretos em todas as vistas daquela conta. */
    function marcarConquista(userId, conquista, ligada) {
        for (const no of document.querySelectorAll('[data-user][data-conquista]')) {
            if (no.dataset.user !== userId || no.dataset.conquista !== conquista) continue;
            if (no.classList.contains('caixa')) { no.setAttribute('aria-checked', String(ligada)); no.textContent = ligada ? '[x]' : '[ ]'; }
            else no.setAttribute('aria-pressed', String(ligada));
        }
        if (estado.alvo?.id === userId) {
            const lista = estado.alvo.achievements.filter((a) => a.id !== conquista);
            if (ligada) lista.push({ id: conquista, em: Date.now() });
            estado.alvo.achievements = lista;
        }
    }

    function campo(userId, nome, valor) {
        for (const no of document.querySelectorAll(`[data-campo="${nome}"]`)) {
            if (no.dataset.user !== userId) continue;
            if (no.tagName === 'INPUT') no.value = valor;
            else no.textContent = valor;
        }
    }

    /** Seção dobrável: o título abre/fecha; lembra o estado entre uma conta e outra. */
    function secaoDobravel(chave, titulo, preencher, abertaPadrao = true) {
        const d = el('details', 'secao');
        d.open = estado.secoes[chave] ?? abertaPadrao;
        d.addEventListener('toggle', () => { estado.secoes[chave] = d.open; });
        d.appendChild(el('summary', '', titulo));
        const corpo = el('div', 'secao-corpo');
        d.appendChild(corpo);
        imprimir(d);
        dentroDe(corpo, preencher);
    }

    /** Linha de controle: rótulo, valor atual e botões que agem no lugar. */
    function acaoLinha(rotulo, valor, controles) {
        const linhaAcao = el('div', 'acao-linha');
        linhaAcao.append(el('span', 'acao-rotulo', rotulo), el('b', 'acao-valor', valor), ...controles);
        return imprimir(linhaAcao);
    }

    /** Botões −1000 … +1000 de um comando numérico (credits/dust). Os negativos pedem um 2º clique. */
    function passos(comando) {
        return [-1000, -100, -10, 10, 100, 1000].map((n) => (n < 0
            ? botaoSeguro(`−${Math.abs(n)}`, `${comando} ${n} --sim`)
            : botao(`+${n}`, `${comando} ${n}`)));
    }

    function mostrarConta(c) {
        const souEu = c.id === estado.eu.id;
        const banido = c.role === 'banned';
        linha([c.name, banido ? span('erro', '  [banido]') : null, c.admin ? span('ok', '  [admin]') : null], 'l--titulo');
        if (/^https:\/\//.test(c.avatarUrl || '')) {
            const img = el('img', 'avatar');
            img.src = c.avatarUrl;
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            imprimir(img);
        }
        apagado('tudo aqui age no lugar: clique nas caixas, números e botões · Esc ou ‹ voltar retorna.');

        const copiar = el('button', 'cmd cmd--link', 'copiar');
        copiar.type = 'button';
        copiar.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(c.id); notificar('✔ id copiado.', 'ok'); } catch (e) { notificar('não deu para copiar (o navegador bloqueou).', 'aviso'); }
        });
        const sessoes = span('', c.sessoes);
        sessoes.dataset.user = c.id;
        sessoes.dataset.campo = 'sessoes';
        tabela(['campo', 'valor'], [
            ['id', [idCurto(c.id), ' ', copiar]],
            ['e-mail', c.email],
            ['papel', [c.role, ' ', ...(souEu || c.admin ? [] : [banido ? botao('desbanir', 'unban') : botaoSeguro('banir', 'ban --sim')])]],
            ['censura', [c.censuraLiberada ? span('ok', 'liberada') : span('apagado', 'travada'), ' ', c.censuraLiberada ? botao('travar', 'censura off') : botao('liberar', 'censura on')]],
            ['desde', data(c.criadoEm)],
            ['último login', data(c.ultimoLogin)],
            ['sessões ativas', [sessoes, ...(souEu ? [] : [' ', botaoSeguro('derrubar', 'kick --sim')])]],
        ]);

        const fala = el('input', 'campo-texto');
        fala.value = c.fala || '';
        fala.placeholder = '(fala do Enzo)';
        fala.maxLength = 200;
        fala.setAttribute('aria-label', 'Fala pública');
        fala.dataset.user = c.id;
        fala.dataset.campo = 'fala';
        fala.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); rodar(`fala ${fala.value.trim() || '-'}`); }
        });
        const salvar = el('button', 'cmd', 'salvar');
        salvar.type = 'button';
        salvar.addEventListener('click', () => rodar(`fala ${fala.value.trim() || '-'}`));
        const linhaFala = el('div', 'acao-linha');
        linhaFala.append(el('span', 'acao-rotulo', 'fala'), fala, salvar, botao('do Enzo', 'fala -'));
        imprimir(linhaFala);

        const tem = new Map(c.achievements.map((a) => [a.id, a.em]));
        secaoDobravel('conquistas', `conquistas ${C.LISTA.filter((d) => tem.has(d.id)).length}/${C.LISTA.length}`, () => {
            tabela(['', 'id', 'nome', 'desde'], C.LISTA.map((d) => {
                const ligada = tem.has(d.id);
                const caixa = el('button', 'caixa', ligada ? '[x]' : '[ ]');
                caixa.type = 'button';
                caixa.setAttribute('role', 'checkbox');
                caixa.setAttribute('aria-checked', String(ligada));
                caixa.setAttribute('aria-label', d.titulo);
                caixa.dataset.user = c.id;
                caixa.dataset.conquista = d.id;
                caixa.addEventListener('click', () => rodar(`${caixa.getAttribute('aria-checked') === 'true' ? 'revoke' : 'grant'} ${d.id}`));
                return [caixa, d.id, d.titulo, ligada ? data(tem.get(d.id)) : span('apagado', 'bloqueada')];
            }));
        });

        const bInfo = c.baralho || { carteira: { creditos: 0, po: 0 }, pacotes: [], colecao: {}, diferentes: 0, total: 7 };
        const diferentes = bInfo.diferentes ?? (bInfo.colecao ? Object.keys(bInfo.colecao).length : 0);
        const totalCartas = bInfo.total ?? (B?.CARTAS?.length || 7);
        secaoDobravel('baralho', `baralho ${diferentes}/${totalCartas}`, () => {
            const contagemPacotes = {};
            for (const p of (bInfo.pacotes || [])) contagemPacotes[p.tipo] = (contagemPacotes[p.tipo] || 0) + 1;
            const pacotesTexto = Object.entries(contagemPacotes).map(([tipo, n]) => `${n}× ${tipo}`).join(', ') || 'nenhum';
            const tiposPacote = B?.PACOTES?.length
                ? B.PACOTES.map((p) => [p.id, p.nome || p.id])
                : [['estacionamento', 'estacionamento'], ['toradolandia', 'toradolândia'], ['piscina-de-macarronada', 'piscina']];

            acaoLinha('créditos', bInfo.carteira?.creditos ?? 0, passos('credits'));
            acaoLinha('pó', bInfo.carteira?.po ?? 0, passos('dust'));
            acaoLinha('pacotes', pacotesTexto, tiposPacote.map(([id, nome]) => botao(`+ ${nome}`, `pack ${id}`)));

            tabela(['#', 'carta', 'raridade', 'qtd'], (B?.CARTAS || []).map((carta) => {
                const qtd = bInfo.colecao?.[carta.id];
                return [
                    String(carta.numero),
                    carta.nome,
                    carta.raridade,
                    qtd ? String(qtd) : span('apagado', '·'),
                ];
            }));
        });

        const secretos = c.achievements.filter((a) => C.numeroSecreto(a.id) !== null).length;
        secaoDobravel('secretos', `enzos secretos ${secretos}/${C.SECRETOS}`, () => {
            const grade = el('div', 'grade');
            grade.setAttribute('aria-label', 'Enzos secretos (clique para dar ou tirar)');
            for (let n = 1; n <= C.SECRETOS; n++) {
                const id = C.idSecreto(n);
                const b = el('button', '', String(n).padStart(2, '0'));
                b.type = 'button';
                b.setAttribute('aria-pressed', String(tem.has(id)));
                b.dataset.user = c.id;
                b.dataset.conquista = id;
                b.title = `enzo secreto #${n}`;
                b.addEventListener('click', () => rodar(`${b.getAttribute('aria-pressed') === 'true' ? 'revoke' : 'grant'} #${n}`));
                grade.appendChild(b);
            }
            imprimir(grade);
        }, false);

        secaoDobravel('partidas', `partidas ${c.scores.length}${c.scores.length === 100 ? '+' : ''}`, () => {
            if (c.scores.length) listarPartidas(c.scores.map((s) => ({ ...s, name: c.name, userId: c.id })), false);
            else apagado('nenhuma partida.');
        }, false);

        const lidos = c.reading.filter((r) => r.completed).length;
        secaoDobravel('leitura', `leitura ${lidos}/${c.reading.length} capítulos completos`, () => {
            if (c.reading.length) {
                tabela(['gibi', 'capítulo', 'pág', 'fim', 'quando'], c.reading.map((r) => [
                    r.comicId, r.chapterId, r.page + 1, r.completed ? span('ok', '✔') : span('apagado', '·'), data(r.em),
                ]));
            } else apagado('não leu nada logado ainda.');
        }, false);
    }

    /** Apaga a tela atual e desenha a conta aberta de novo (usado ao abrir e depois de cada mudança). */
    function desenharConta() {
        tela.replaceChildren();
        dentroDe(tela, () => mostrarConta(estado.alvo));
    }

    /** Busca a conta de novo e redesenha no lugar, mantendo a rolagem. */
    async function recarregarConta() {
        if (!estado.alvo || estado.tela !== `open ${estado.alvo.id}`) return;
        const minha = tela;
        const rolagem = saida.scrollTop;
        const nova = await pedir(`/api/admin/users/${encodeURIComponent(estado.alvo.id)}`);
        if (tela !== minha) return;
        estado.alvo = nova;
        desenharConta();
        saida.scrollTop = rolagem;
    }

    function listarPartidas(partidas, comNome = true) {
        estado.partidas = partidas;
        const cab = ['#', ...(comNome ? ['leitor'] : []), 'jogo', 'pontos', 'tempo', 'ranking', 'quando', ''];
        tabela(cab, partidas.map((s, i) => {
            const status = span(s.verified ? 'ok' : 'aviso', s.verified ? 'sim' : 'fora');
            status.dataset.partida = s.id;
            status.dataset.campo = 'status';
            const acoes = el('span');
            acoes.dataset.partida = s.id;
            acoes.dataset.campo = 'acoes';
            acoes.append(botao(s.verified ? 'tirar' : 'devolver', `${s.verified ? 'hide' : 'show'} ${i + 1}`), ' ', botaoSeguro('apagar', `rm ${i + 1} --sim`));
            const convidado = s.metadata && s.metadata.includes('convidado') ? span('apagado', ' (local)') : null;
            return [
                String(i + 1),
                ...(comNome ? [botao(primeiroNome(s.name), `open ${s.userId}`, { link: true })] : []),
                jogo(s.gameId),
                [String(s.score), convidado],
                s.durationMs ? duracao(s.durationMs) : '—',
                status,
                data(s.em),
                acoes,
            ];
        }));
    }

    function marcarPartida(id, { verified, apagada }) {
        for (const no of document.querySelectorAll('[data-partida]')) {
            if (no.dataset.partida !== id) continue;
            if (apagada) { no.closest('.tabela-linha').style.textDecoration = 'line-through'; if (no.dataset.campo === 'acoes') no.replaceChildren(span('apagado', 'apagada')); continue; }
            if (no.dataset.campo === 'status') { no.textContent = verified ? 'sim' : 'fora'; no.className = verified ? 'ok' : 'aviso'; }
        }
        const s = estado.partidas.find((p) => p.id === id);
        if (s && verified !== undefined) s.verified = verified;
    }

    // ---------------------------------------------------------------- comandos
    function exigirAlvo() {
        if (!estado.alvo) throw new Error('nenhuma conta aberta. use "users" e depois "open <n>".');
        return estado.alvo;
    }

    /** "3" (da última lista), id inteiro, começo do id (4+) ou pedaço do nome/e-mail. */
    async function acharConta(ref) {
        if (!ref) throw new Error('uso: open <n | id | nome>');
        const n = Number(ref);
        if (Number.isInteger(n) && n >= 1 && n <= estado.contas.length) return estado.contas[n - 1].id;
        if (/^[0-9a-f-]{36}$/.test(ref)) return ref;
        const porId = estado.contas.filter((c) => c.id.startsWith(ref));
        if (ref.length >= 4 && porId.length === 1) return porId[0].id;
        const { users } = await pedir(`/api/admin/users?q=${encodeURIComponent(ref)}`);
        if (users.length === 1) return users[0].id;
        if (!users.length) throw new Error(`nenhuma conta com "${ref}".`);
        estado.contas = users;
        novaTela(`users ${ref}`, [['leitores', 'users'], [`"${ref}"`, null]]);
        aviso(`${users.length} contas batem com "${ref}". clique numa:`);
        listarContas(users);
        return null;
    }

    function conquistaDoArgumento(arg) {
        if (!arg) throw new Error('uso: grant <conquista | #n>. "achievements" lista os ids.');
        const n = arg.replace(/^#/, '');
        if (/^\d+$/.test(n)) {
            const id = C.idSecreto(Number(n));
            if (C.numeroSecreto(id) === null) throw new Error(`secretos vão de 1 a ${C.SECRETOS}.`);
            return id;
        }
        if (!C.idValido(arg)) throw new Error(`conquista "${arg}" não existe. "achievements" lista os ids.`);
        return arg;
    }

    function partidaDoArgumento(arg) {
        const n = Number(arg);
        const s = estado.partidas[n - 1];
        if (!Number.isInteger(n) || !s) throw new Error('uso: <comando> <n> (número da última lista de partidas).');
        return s;
    }

    function listarContas(users) {
        tabela(['#', 'nome', 'e-mail', 'papel', 'conq', 'secr', 'jogos', 'último login'], users.map((u, i) => [
            String(i + 1),
            botao(u.name, `open ${u.id}`, { link: true }),
            u.email,
            u.role === 'banned' ? span('erro', 'banido') : [u.role, u.admin ? span('ok', '*') : null, u.censuraLiberada ? span('aviso', ' 🔓') : null],
            String(u.conquistas),
            String(u.secretos),
            String(u.partidas),
            data(u.ultimoLogin),
        ]), (i) => rodar(`open ${users[i].id}`));
    }

    /** Tela de leitores: busca ao vivo e a linha inteira abre a conta. */
    async function telaLeitores(busca) {
        novaTela(busca ? `users ${busca}` : 'users', [['leitores', null]]);
        const campoBusca = el('input', 'campo-texto campo-busca');
        campoBusca.type = 'search';
        campoBusca.placeholder = 'buscar por nome ou e-mail…';
        campoBusca.value = busca;
        campoBusca.setAttribute('aria-label', 'Buscar leitor');
        const lista = el('div', 'lista');
        imprimir(campoBusca);
        imprimir(lista);

        let ultima = 0;
        let espera = 0;
        const carregar = async (q) => {
            const minha = ++ultima;
            const { users, maisPaginas } = await pedir(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
            if (minha !== ultima) return;
            estado.contas = users;
            lista.replaceChildren();
            dentroDe(lista, () => {
                if (!users.length) { apagado(q ? `ninguém bate com "${q}".` : 'nenhuma conta.'); return; }
                listarContas(users);
                apagado(`${users.length}${maisPaginas ? '+' : ''} conta(s) · clique numa linha para abrir.`);
            });
        };
        campoBusca.addEventListener('input', () => {
            clearTimeout(espera);
            espera = setTimeout(() => carregar(campoBusca.value.trim()).catch((e) => erro(e.message)), 250);
        });
        await carregar(busca);
        campoBusca.focus({ preventScroll: true });
    }

    /** Pergunta no próprio terminal (linha de aviso), com [sim] [não] clicáveis; "s"/"n" digitados também valem. */
    function pedirConfirmacao(pergunta, acao) {
        estado.confirmar = acao;
        const sim = botao('sim', 's', { perigo: true });
        notificar([`${pergunta} `, sim, ' ', botao('não', 'n')], 'aviso', { fixo: true });
        atualizarPrompt();
    }

    async function trocarConquista(ligar, arg) {
        const alvo = exigirAlvo();
        const conquista = conquistaDoArgumento(arg);
        const r = await pedir(`/api/admin/users/${alvo.id}/achievement`, { achievement: conquista, unlocked: ligar });
        marcarConquista(alvo.id, conquista, ligar);
        const nome = C.definicao(conquista)?.titulo || `enzo secreto #${C.numeroSecreto(conquista)}`;
        if (!r.changed) notificar(`${nome}: nada mudou (${ligar ? 'já tinha' : 'não tinha'}).`, 'aviso');
        else ok(`${ligar ? '+' : '−'} ${nome} ${ligar ? 'desbloqueada para' : 'removida de'} ${primeiroNome(alvo.name)}.`);
    }

    /** Gibis com `hidden` no catálogo (data/comics.manifest.json) e quais já foram revelados. */
    async function lerGibis() {
        const catalogo = await (await fetch('data/database.json', { cache: 'no-store' })).json();
        const { ids } = await (await fetch('/api/site/revelados', { cache: 'no-store' })).json();
        return { escondidos: catalogo.comics.filter((c) => c.hidden === true), ids };
    }

    async function telaGibis() {
        const { escondidos, ids } = await lerGibis();
        novaTela('reveal', [['gibis escondidos', null]]);
        if (!escondidos.length) { apagado('nenhum gibi escondido no catálogo.'); return; }
        tabela(['id', 'título', 'estado', ''], escondidos.map((c) => {
            const revelado = ids.includes(c.id);
            return [c.id, c.title, span(revelado ? 'ok' : 'aviso', revelado ? 'revelado' : 'escondido'),
                revelado ? botao('esconder', `hide ${c.id}`) : botao('revelar', `reveal ${c.id}`)];
        }));
        apagado('os botões mudam o site na hora.');
    }

    /** reveal/hide <id> age; sem id só mostra a tela dos gibis. */
    async function trocarGibi(revelar, id) {
        if (id) {
            const { escondidos } = await lerGibis();
            if (!escondidos.some((c) => c.id === id)) throw new Error(`"${id}" não tem hidden no catálogo. Escondidos: ${escondidos.map((c) => c.id).join(', ') || 'nenhum'}.`);
            const r = await pedir('/api/admin/reveal', { id, revelar });
            if (!r.mudou) notificar(`${id} já estava ${revelar ? 'revelado' : 'escondido'}.`, 'aviso');
            else ok(`${id} ${revelar ? 'revelado: já aparece no site' : 'escondido de novo'}.`);
        }
        await telaGibis();
    }

    /** Valor numérico de credits/dust: inteiro diferente de zero. */
    function valorNumerico(args, nome) {
        if (!args[0]) throw new Error(`uso: ${nome} <n> (número inteiro).`);
        const n = Number(args[0]);
        if (!Number.isInteger(n)) throw new Error(`${nome}: número inteiro.`);
        if (n === 0) throw new Error(`${nome}: valor diferente de zero.`);
        return n;
    }

    /** Soma/tira créditos ou pó; tirar pede confirmação (a menos que venha "--sim" do botão de 2 cliques). */
    async function mexerCarteira(args, campoApi, rotulo) {
        const alvo = exigirAlvo();
        const n = valorNumerico(args, campoApi === 'creditos' ? 'credits' : 'dust');
        const aplicar = async () => {
            const novo = await pedir(`/api/admin/users/${alvo.id}/baralho`, { [campoApi]: n });
            ok(`${rotulo} de ${primeiroNome(alvo.name)}: ${novo.carteira[campoApi]} (${n > 0 ? '+' : ''}${n}).`);
            await recarregarConta();
        };
        if (n < 0 && !args.includes('--sim')) pedirConfirmacao(`tirar ${Math.abs(n)} ${rotulo} de ${alvo.name}?`, aplicar);
        else await aplicar();
    }

    const COMANDOS = {
        help: {
            desc: 'lista os comandos',
            fn() {
                novaTela('help', [['ajuda', null]]);
                tabela(['comando', 'o que faz'], Object.entries(COMANDOS).map(([nome, c]) => {
                    const pedeArgumento = /</.test(c.uso || '');
                    return [botao(c.uso || nome, pedeArgumento ? `${nome} ` : nome, { link: true, preencher: pedeArgumento }), c.desc];
                }));
                apagado('clique num comando para rodar (os que pedem argumento vão para o prompt) · ↑/↓ histórico · Tab completa · / foca o prompt · Esc volta.');
            },
        },
        status: {
            desc: 'início: números do site e últimas ações',
            async fn() {
                const { numeros, log, agora } = await pedir('/api/admin/overview');
                novaTela('status');
                mostrarNumeros(numeros);
                const linhas = [
                    ['contas', `${numeros.contas} (${numeros.banidos} banidas)`, 'users'],
                    ['ativas em 7 dias', numeros.ativos_7d, 'users'],
                    ['sessões abertas', numeros.sessoes, 'users'],
                    ['partidas no ranking', numeros.partidas, 'scores'],
                    ['partidas fora do ranking', numeros.partidas_fora, 'scores'],
                    ['conquistas desbloqueadas', numeros.conquistas, 'users'],
                    ['capítulos lidos até o fim', numeros.capitulos_lidos, 'users'],
                    ['relógio do servidor', data(agora), null],
                ];
                tabela(['métrica', 'valor'], linhas.map(([rotulo, valor, destino]) => [
                    destino ? botao(rotulo, destino, { link: true }) : rotulo,
                    String(valor),
                ]), (i) => { if (linhas[i][2]) rodar(linhas[i][2]); });
                if (log.length) { secao('últimas ações'); mostrarLog(log); }
            },
        },
        users: {
            uso: 'users [busca]',
            desc: 'lista contas (nome ou e-mail), com busca ao vivo',
            async fn(args) { await telaLeitores(args.join(' ')); },
        },
        open: {
            uso: 'open <n|id|nome>',
            desc: 'abre uma conta (tudo sobre ela)',
            async fn(args) {
                const id = await acharConta(args.join(' '));
                if (!id) return;
                const conta = await pedir(`/api/admin/users/${encodeURIComponent(id)}`);
                estado.alvo = conta;
                novaTela(`open ${conta.id}`, [['leitores', 'users'], [conta.name, null]]);
                atualizarPrompt();
                desenharConta();
            },
        },
        reveal: {
            uso: 'reveal [id]',
            desc: 'gibis escondidos: revela um (sem id: a tela dos gibis)',
            async fn(args) { await trocarGibi(true, args[0]); },
        },
        close: {
            desc: 'fecha a conta aberta e volta aos leitores',
            async fn() { estado.alvo = null; atualizarPrompt(); await telaLeitores(''); },
        },
        grant: { uso: 'grant <id|#n>', desc: 'dá conquista (ou enzo secreto #n)', fn: (args) => trocarConquista(true, args[0]) },
        revoke: { uso: 'revoke <id|#n>', desc: 'tira conquista (ou enzo secreto #n)', fn: (args) => trocarConquista(false, args[0]) },
        achievements: {
            desc: 'ids das conquistas',
            fn() {
                novaTela('achievements', [['conquistas', null]]);
                tabela(['id', 'nome', 'como ganha'], C.LISTA.map((d) => [
                    estado.alvo ? botao(d.id, `grant ${d.id}`, { link: true }) : d.id, d.titulo, d.descricao,
                ]));
                apagado(`e os enzos secretos: #1 a #${C.SECRETOS}.${estado.alvo ? ` Clique num id para dar a ${primeiroNome(estado.alvo.name)}.` : ''}`);
            },
        },
        ban: {
            desc: 'bane a conta aberta (some do ranking, cai a sessão)',
            async fn(args) {
                const alvo = exigirAlvo();
                const banir = async () => {
                    await pedir(`/api/admin/users/${alvo.id}/role`, { role: 'banned' });
                    ok(`${primeiroNome(alvo.name)} banido.`);
                    await recarregarConta();
                };
                if (args.includes('--sim')) await banir();
                else pedirConfirmacao(`banir ${alvo.name}?`, banir);
            },
        },
        censura: {
            uso: 'censura [on|off]',
            desc: 'libera (on) ou trava (off) a censura do Cabo Côco na conta aberta; sem argumento inverte',
            async fn(args) {
                const alvo = exigirAlvo();
                const pedido = (args[0] || '').toLowerCase();
                if (pedido && !['on', 'off'].includes(pedido)) throw new Error('uso: censura [on|off].');
                const liberar = pedido ? pedido === 'on' : !alvo.censuraLiberada;
                const r = await pedir(`/api/admin/users/${alvo.id}/censura`, { liberada: liberar });
                alvo.censuraLiberada = liberar;
                if (!r.mudou) notificar(`censura de ${primeiroNome(alvo.name)} já estava ${liberar ? 'liberada' : 'travada'}.`, 'aviso');
                else ok(`censura de ${primeiroNome(alvo.name)} ${liberar ? 'LIBERADA (vê o Cabo Côco sem tarja)' : 'travada de novo'}.`);
                await recarregarConta();
            },
        },
        unban: {
            desc: 'desbane a conta aberta',
            async fn() {
                const alvo = exigirAlvo();
                await pedir(`/api/admin/users/${alvo.id}/role`, { role: 'player' });
                ok(`${primeiroNome(alvo.name)} de volta como player.`);
                await recarregarConta();
            },
        },
        kick: {
            desc: 'derruba as sessões da conta aberta',
            async fn(args) {
                const alvo = exigirAlvo();
                const derrubar = async () => {
                    const { sessoes } = await pedir(`/api/admin/users/${alvo.id}/kick`, {});
                    campo(alvo.id, 'sessoes', '0');
                    ok(`${sessoes} sessão(ões) derrubada(s).`);
                };
                if (args.includes('--sim')) await derrubar();
                else pedirConfirmacao(`derrubar as sessões de ${alvo.name}?`, derrubar);
            },
        },
        fala: {
            uso: 'fala <texto|->',
            desc: 'troca a fala pública ("-" volta à do Enzo)',
            async fn(args, resto) {
                const alvo = exigirAlvo();
                const texto = resto.trim() === '-' ? null : resto;
                const { fala } = await pedir(`/api/admin/users/${alvo.id}/fala`, { fala: texto });
                alvo.fala = fala;
                campo(alvo.id, 'fala', fala || '');
                ok(fala ? `fala agora: "${fala}"` : 'fala voltou para a do Enzo.');
            },
        },
        credits: {
            uso: 'credits <n>',
            desc: 'soma ou tira créditos da conta aberta',
            fn: (args) => mexerCarteira(args, 'creditos', 'créditos'),
        },
        dust: {
            uso: 'dust <n>',
            desc: 'soma ou tira pó da conta aberta',
            fn: (args) => mexerCarteira(args, 'po', 'pó'),
        },
        pack: {
            uso: 'pack <tipo> [qtd]',
            desc: 'dá pacotes à conta aberta (est, tor, pis)',
            async fn(args) {
                const alvo = exigirAlvo();
                if (!args[0]) throw new Error('uso: pack <tipo> [quantidade].');
                const tipo = APELIDOS_PACOTE[args[0].toLowerCase()];
                if (!tipo) throw new Error('pacote: est, tor ou pis (ou nome completo).');
                const qtd = args[1] !== undefined ? Number(args[1]) : 1;
                if (!Number.isInteger(qtd) || qtd < 1 || qtd > 10) throw new Error('quantidade: de 1 a 10.');
                const novo = await pedir(`/api/admin/users/${alvo.id}/baralho`, { pacote: tipo, quantidade: qtd });
                ok(`+ ${qtd}× ${tipo} para ${primeiroNome(alvo.name)} (${novo.pacotes.length} pacote(s) fechado(s)).`);
                await recarregarConta();
            },
        },
        scores: {
            uso: 'scores [flappy|degustacao]',
            desc: 'últimas 100 partidas de todo mundo',
            async fn(args) {
                const id = args[0] ? APELIDOS_JOGO[args[0].toLowerCase()] : null;
                if (args[0] && !id) throw new Error('jogos: flappy, degustacao.');
                const { scores } = await pedir(`/api/admin/scores${id ? `?game=${id}` : ''}`);
                novaTela(id ? `scores ${args[0].toLowerCase()}` : 'scores', [['partidas', null]]);
                const filtros = [['todos', null, 'scores'], ['Flappy', 'flappy-enzo', 'scores flappy'], ['Degustação', 'ronda-noturna', 'scores degustacao']];
                linha(['jogo: ', ...filtros.flatMap(([rotulo, jogoId, cmd]) => [jogoId === id ? span('ok', `[${rotulo}]`) : botao(rotulo, cmd), ' '])]);
                if (!scores.length) { apagado('nenhuma partida.'); estado.partidas = []; return; }
                listarPartidas(scores);
                apagado('tirar/devolver mexem no ranking · apagar pede um segundo clique · clique no nome para abrir o leitor.');
            },
        },
        hide: {
            uso: 'hide <n|id>', desc: 'tira uma partida do ranking ou esconde um gibi',
            async fn(args) {
                if (!/^\d+$/.test(args[0] || '')) return trocarGibi(false, args[0]);
                const s = partidaDoArgumento(args[0]);
                await pedir(`/api/admin/scores/${s.id}/verify`, { verified: false });
                marcarPartida(s.id, { verified: false });
                ok(`partida ${args[0]} (${jogo(s.gameId)} ${s.score}) fora do ranking.`);
            },
        },
        show: {
            uso: 'show <n>', desc: 'devolve a partida ao ranking',
            async fn(args) {
                const s = partidaDoArgumento(args[0]);
                await pedir(`/api/admin/scores/${s.id}/verify`, { verified: true });
                marcarPartida(s.id, { verified: true });
                ok(`partida ${args[0]} (${jogo(s.gameId)} ${s.score}) de volta ao ranking.`);
            },
        },
        rm: {
            uso: 'rm <n>', desc: 'apaga a partida para sempre',
            async fn(args) {
                const s = partidaDoArgumento(args[0]);
                const apagar = async () => {
                    await pedir(`/api/admin/scores/${s.id}/delete`, {});
                    marcarPartida(s.id, { apagada: true });
                    ok('partida apagada.');
                };
                if (args.includes('--sim')) await apagar();
                else pedirConfirmacao(`apagar a partida ${args[0]} (${jogo(s.gameId)}, ${s.score} pts de ${primeiroNome(s.name)})?`, apagar);
            },
        },
        log: {
            desc: 'histórico das ações de admin',
            async fn() {
                const { log } = await pedir('/api/admin/log');
                novaTela('log', [['histórico', null]]);
                if (!log.length) { apagado('nenhuma ação ainda.'); return; }
                mostrarLog(log);
            },
        },
        site: { desc: 'abre o site numa aba nova', fn() { window.open('index.html', '_blank', 'noopener'); } },
        whoami: {
            desc: 'quem está no terminal',
            fn() {
                novaTela('whoami', [['eu', null]]);
                tabela(['campo', 'valor'], [['nome', estado.eu.name], ['id', estado.eu.id], ['poder', 'root']]);
            },
        },
        clear: { desc: 'volta ao início', fn: () => COMANDOS.status.fn() },
        exit: { desc: 'volta para o site', fn() { location.href = 'index.html'; } },
    };
    const APELIDOS = { ls: 'users', cd: 'open', '?': 'help', cls: 'clear', quit: 'exit', sair: 'exit', ajuda: 'help' };

    function mostrarLog(log) {
        tabela(['quando', 'admin', 'ação', 'conta', 'detalhe'], log.map((l) => [
            data(l.em),
            primeiroNome(l.admin),
            span(/ban|rm|kick|revoke|off/.test(l.acao) ? 'aviso' : 'ok', l.acao),
            l.alvoNome ? botao(primeiroNome(l.alvoNome), `open ${l.alvo}`, { link: true }) : span('apagado', idCurto(l.alvo || '—')),
            l.detalhe || '',
        ]));
    }

    // ---------------------------------------------------------------- execução
    let fila = Promise.resolve();

    async function responderConfirmacao(sim) {
        const acao = estado.confirmar;
        estado.confirmar = null;
        notificar('');
        atualizarPrompt();
        if (!acao) return;
        if (sim) await acao();
        else notificar('cancelado.', 'aviso');
    }

    async function executar(texto) {
        const limpo = texto.trim();
        if (estado.confirmar) {
            if (!limpo) return;
            if (/^(s|sim|y|yes)$/i.test(limpo)) return responderConfirmacao(true);
            if (/^(n|nao|não|no)$/i.test(limpo)) return responderConfirmacao(false);
            // qualquer outro comando cancela a pergunta pendente
            estado.confirmar = null;
            notificar('');
            atualizarPrompt();
        }
        if (!limpo) return;
        const [primeira, ...args] = limpo.split(/\s+/);
        const nome = APELIDOS[primeira.toLowerCase()] || primeira.toLowerCase();
        const comando = COMANDOS[nome];
        if (!comando) { erro(`${primeira}: comando não encontrado. tente "help".`); return; }
        await comando.fn(args, limpo.slice(primeira.length).trim());
    }

    /** Roda um comando na fila (cliques rápidos não se atropelam). */
    function rodar(texto) {
        fila = fila.then(async () => {
            let lento = setTimeout(() => {
                lento = 0;
                if (feedback.textContent) return;   // já há um aviso (sucesso, erro ou pergunta): não sobrescreve
                notificar('… carregando', 'apagado', { fixo: true });
                feedback.dataset.carregando = '1';
            }, 400);
            try {
                await executar(texto);
            } finally {
                if (lento) clearTimeout(lento);
                if (feedback.dataset.carregando) notificar('');
            }
        }).catch((e) => {
            erro(e.status === 404 && /rota/.test(e.message) ? 'permissão negada.' : e.message);
        }).finally(atualizarPrompt);
        return fila;
    }

    /** Volta para a tela anterior (botão "‹ voltar" e a tecla Esc). */
    function voltar() {
        const anterior = estado.pilha.pop();
        if (!anterior) return;
        estado.tela = null;
        rodar(anterior);
    }

    // ---------------------------------------------------------------- teclado
    function completar() {
        const valor = entrada.value;
        const partes = valor.split(/\s+/);
        let opcoes;
        let prefixo;
        if (partes.length <= 1) {
            prefixo = '';
            opcoes = Object.keys(COMANDOS).filter((c) => c.startsWith(partes[0].toLowerCase()));
        } else if (['grant', 'revoke'].includes(partes[0]) && partes.length === 2) {
            prefixo = `${partes[0]} `;
            opcoes = C.LISTA.map((d) => d.id).filter((id) => id.startsWith(partes[1]));
        } else if (partes[0] === 'scores' && partes.length === 2) {
            prefixo = 'scores ';
            opcoes = ['flappy', 'degustacao'].filter((j) => j.startsWith(partes[1]));
        } else if (partes[0] === 'pack' && partes.length === 2) {
            prefixo = 'pack ';
            opcoes = ['estacionamento', 'toradolandia', 'piscina-de-macarronada', 'est', 'tor', 'pis'].filter((p) => p.startsWith(partes[1].toLowerCase()));
        } else return;
        if (opcoes.length === 1) entrada.value = `${prefixo}${opcoes[0]} `;
        else if (opcoes.length > 1) {
            notificar(opcoes.flatMap((o) => [botao(o, `${prefixo}${o} `, { link: true, preencher: true }), ' ']), 'apagado', { fixo: true });
        }
    }

    $('prompt').addEventListener('submit', (evento) => {
        evento.preventDefault();
        const texto = entrada.value;
        entrada.value = '';
        if (texto.trim() && !estado.confirmar) {
            estado.historico.push(texto);
            if (estado.historico.length > 100) estado.historico.shift();
        }
        estado.posHistorico = estado.historico.length;
        rodar(texto);
    });

    entrada.addEventListener('keydown', (evento) => {
        if (evento.key === 'Tab') { evento.preventDefault(); completar(); return; }
        if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
            if (!estado.historico.length) return;
            evento.preventDefault();
            const passo = evento.key === 'ArrowUp' ? -1 : 1;
            estado.posHistorico = Math.max(0, Math.min(estado.historico.length, estado.posHistorico + passo));
            entrada.value = estado.historico[estado.posHistorico] ?? '';
        }
        if (evento.key === 'l' && evento.ctrlKey) { evento.preventDefault(); rodar('clear'); }
    });

    // Esc: cancela a pergunta pendente, limpa o prompt ou volta uma tela.
    document.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Escape' || evento.defaultPrevented) return;
        if (estado.confirmar) { rodar('n'); return; }
        if (document.activeElement === entrada && entrada.value) { entrada.value = ''; return; }
        const busca = document.activeElement;
        if (busca?.type === 'search' && busca.value) { busca.value = ''; busca.dispatchEvent(new Event('input')); return; }
        voltar();
    });

    // Clicar no vazio do terminal devolve o foco ao prompt (sem roubar de botões, campos ou seleção de texto).
    saida.addEventListener('mouseup', (evento) => {
        if (evento.target.closest('button, input, textarea, select, summary, a')) return;
        if (!getSelection().toString()) entrada.focus({ preventScroll: true });
    });

    const relogio = $('relogio');
    const tique = () => { relogio.textContent = new Date().toLocaleTimeString('pt-BR'); };
    let pulso = 0;
    const andarRelogio = () => {
        clearInterval(pulso);
        pulso = document.hidden ? 0 : setInterval(tique, 1000);
        tique();
    };
    andarRelogio();
    document.addEventListener('visibilitychange', andarRelogio);

    // ---------------------------------------------------------------- boot
    async function pedirBoot(caminho) {
        const controle = new AbortController();
        const tempo = setTimeout(() => controle.abort(), 10000);
        try {
            return await pedir(caminho, undefined, { signal: controle.signal });
        } catch (e) {
            if (controle.signal.aborted) throw new Error('a API não respondeu em 10 segundos.');
            throw e;
        } finally {
            clearTimeout(tempo);
        }
    }

    async function boot() {
        estado.apiFalhou = false;
        entrada.disabled = true;
        for (const [texto, classe] of [
            ['ENZO-OS 1.0 (degustação noturna) tty1', 'l--apagado'],
            ['montando /dev/macarronada ............ ok', ''],
            ['carregando gibis e placares .......... ok', ''],
            ['verificando credenciais ...', ''],
        ]) { linha(texto, classe); await esperar(160); }

        let eu;
        try {
            const config = await pedirBoot('/api/auth/config');
            if (!config.enabled) throw Object.assign(new Error('login desligado neste servidor.'), { fim: true });
            eu = await pedirBoot('/api/auth/me');
        } catch (e) {
            if (e.fim) {
                aviso(e.message);
                return;
            }
            estado.apiFalhou = true;
            desenharAscii();
            erro(`não foi possível verificar sua sessão: ${e.message}`);
            const tentar = el('button', 'cmd', 'tentar novamente');
            tentar.type = 'button';
            tentar.addEventListener('click', () => { saida.replaceChildren(); destino = saida; boot(); });
            linha(['a API está indisponível. ', tentar, ' ou volte mais tarde.'], 'l--aviso');
            return;
        }
        if (!eu.loggedIn) {
            linha('SEM SESSÃO', 'l--gigante l--aviso');
            linha(['faça login no site primeiro: ', Object.assign(el('a', '', 'abrir o site'), { href: 'index.html' })]);
            return;
        }
        if (!eu.admin) {
            linha('ACESSO NEGADO', 'l--gigante l--erro');
            linha(`${primeiroNome(eu.user.name)}, este terminal não é para você.`, 'l--erro');
            linha(['volte para os gibis: ', Object.assign(el('a', '', 'enzo games'), { href: 'index.html' })]);
            return;
        }
        estado.eu = eu.user;
        mostrarAtalhos();
        mostrarDashboard();
        desenharAscii();
        entrada.disabled = false;
        entrada.focus();
        atualizarPrompt();
        await rodar('status');
        notificar(`✔ acesso concedido. bem-vindo, ${eu.user.firstName}. Clique nos números, nomes e botões; "/" foca o prompt.`, 'ok');
    }

    document.addEventListener('keydown', (evento) => {
        if (evento.key !== '/' || evento.altKey || evento.ctrlKey || evento.metaKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
        evento.preventDefault();
        entrada.focus();
    });

    boot();
})();
