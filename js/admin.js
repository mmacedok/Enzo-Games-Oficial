// ============================================================================
// Painel do admin (admin.html): um terminal que conversa com /api/admin/*.
// Tudo é comando ("help" lista). Clicar num [botão] digita o comando por você.
// Quem não é admin só vê "acesso negado": a API responde 404 para os outros,
// então esta página não tem nada de secreto — o poder está no servidor.
// Todo texto vindo do banco entra com textContent (nunca innerHTML).
// ============================================================================
(() => {
    'use strict';

    const C = window.EnzoConquistas;
    const JOGOS = { 'flappy-enzo': 'Flappy Enzo', 'ronda-noturna': 'Degustação Noturna' };
    const APELIDOS_JOGO = { flappy: 'flappy-enzo', 'flappy-enzo': 'flappy-enzo', degustacao: 'ronda-noturna', ronda: 'ronda-noturna', 'ronda-noturna': 'ronda-noturna' };
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const $ = (id) => document.getElementById(id);
    const saida = $('saida');
    const entrada = $('entrada');
    const ps = $('ps');

    const estado = {
        eu: null,
        alvo: null,         // conta aberta (detalhe da API)
        contas: [],         // última lista de "users" (open <n>)
        partidas: [],       // última lista de partidas (hide/show/rm <n>)
        historico: [],
        posHistorico: 0,
        confirmar: null,    // ação esperando "s"
    };

    // ---------------------------------------------------------------- servidor
    async function pedir(caminho, corpo) {
        const opcoes = corpo === undefined
            ? { credentials: 'same-origin' }
            : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) };
        const resposta = await fetch(caminho, opcoes);
        let dados = null;
        try { dados = await resposta.json(); } catch { /* sem JSON */ }
        if (!resposta.ok) {
            const erro = new Error(dados?.error || `HTTP ${resposta.status}`);
            erro.status = resposta.status;
            throw erro;
        }
        return dados;
    }

    // ---------------------------------------------------------------- saída
    function el(tag, classe, texto) {
        const no = document.createElement(tag);
        if (classe) no.className = classe;
        if (texto !== undefined && texto !== null) no.textContent = String(texto);
        return no;
    }

    const colado = () => saida.scrollHeight - saida.scrollTop - saida.clientHeight < 60;

    /** Acrescenta um nó na saída; só rola se já estava no fim (como um terminal de verdade). */
    function imprimir(no) {
        const rolar = colado();
        saida.appendChild(no);
        if (rolar) saida.scrollTop = saida.scrollHeight;
        return no;
    }

    function linha(partes, classe = '') {
        const p = el('p', `l ${classe}`.trim());
        for (const parte of [].concat(partes)) {
            if (parte === null || parte === undefined || parte === false) continue;
            p.append(parte instanceof Node ? parte : document.createTextNode(String(parte)));
        }
        return imprimir(p);
    }
    const ok = (texto) => linha(texto, 'l--ok');
    const aviso = (texto) => linha(texto, 'l--aviso');
    const erro = (texto) => linha(`erro: ${texto}`, 'l--erro');
    const apagado = (texto) => linha(texto, 'l--apagado');
    const secao = (texto) => linha(`── ${texto} ${'─'.repeat(Math.max(4, 44 - texto.length))}`, 'l--secao');
    const span = (classe, texto) => el('span', classe, texto);

    /** [rótulo] que digita e roda um comando. */
    function botao(rotulo, comando, { perigo = false, link = false } = {}) {
        const b = el('button', `cmd${perigo ? ' cmd--perigo' : ''}${link ? ' cmd--link' : ''}`, rotulo);
        b.type = 'button';
        b.title = comando;
        b.addEventListener('click', () => rodar(comando));
        return b;
    }

    function tabela(cabecalho, linhas) {
        const grade = el('div', 'tabela');
        grade.style.gridTemplateColumns = `repeat(${cabecalho.length}, auto)`;
        for (const titulo of cabecalho) grade.appendChild(el('span', 'cab', titulo));
        for (const celulas of linhas) {
            const tr = el('div', 'tabela-linha');
            for (const celula of celulas) {
                const td = el('span');
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
        const cheio = total > 0 ? Math.round((parte / total) * largura) : 0;
        const b = el('span', 'numero-barra');
        b.append('[', el('b', '', '|'.repeat(cheio)), '·'.repeat(largura - cheio), ']');
        return b;
    }

    function mostrarNumeros(n) {
        const caixa = $('numeros');
        caixa.replaceChildren();
        const itens = [
            ['contas', n.contas, null],
            ['ativos 7d', n.ativos_7d, n.contas],
            ['sessões', n.sessoes, n.contas],
            ['partidas', n.partidas, n.partidas + n.partidas_fora],
            ['conquistas', n.conquistas, null],
            ['caps lidos', n.capitulos_lidos, null],
            ['banidos', n.banidos, n.contas],
        ];
        for (const [rotulo, valor, total] of itens) {
            const item = el('div', 'numero');
            item.append(el('span', 'numero-rotulo', rotulo), el('span', 'numero-valor', valor));
            if (total !== null) item.appendChild(barra(valor, total));
            caixa.appendChild(item);
        }
    }

    function mostrarAtalhos() {
        const nav = $('atalhos');
        nav.replaceChildren(el('p', 'atalhos-titulo', 'atalhos'));
        for (const comando of ['status', 'users', 'scores', 'log', 'help', 'exit']) nav.appendChild(botao(comando, comando));
    }

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
            if (no.dataset.user === userId) no.textContent = valor;
        }
    }

    function mostrarConta(c) {
        const souEu = c.id === estado.eu.id;
        linha(c.name, 'l--titulo');
        if (/^https:\/\//.test(c.avatarUrl || '')) {
            const img = el('img', 'avatar');
            img.src = c.avatarUrl;
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            imprimir(img);
        }
        const role = span('', c.role);
        role.dataset.user = c.id;
        role.dataset.campo = 'role';
        const acoesRole = souEu || c.admin ? null
            : [' ', botao('banir', 'ban', { perigo: true }), ' ', botao('desbanir', 'unban')];
        const sessoes = span('', c.sessoes);
        sessoes.dataset.user = c.id;
        sessoes.dataset.campo = 'sessoes';
        const fala = span('', c.fala ? `"${c.fala}"` : '(fala do Enzo)');
        fala.dataset.user = c.id;
        fala.dataset.campo = 'fala';
        const mudarFala = el('button', 'cmd', 'mudar');
        mudarFala.type = 'button';
        mudarFala.addEventListener('click', () => { entrada.value = `fala ${c.fala || ''}`; entrada.focus(); });

        tabela(['campo', 'valor'], [
            ['id', c.id],
            ['e-mail', c.email],
            ['papel', [role, c.admin ? span('ok', ' + admin') : null, ...(acoesRole || [])]],
            ['desde', data(c.criadoEm)],
            ['último login', data(c.ultimoLogin)],
            ['sessões ativas', [sessoes, souEu ? null : ' ', souEu ? null : botao('derrubar', 'kick', { perigo: true })]],
            ['fala', [fala, ' ', mudarFala]],
        ]);

        const tem = new Map(c.achievements.map((a) => [a.id, a.em]));
        secao(`conquistas ${C.LISTA.filter((d) => tem.has(d.id)).length}/${C.LISTA.length}`);
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

        const secretos = c.achievements.filter((a) => C.numeroSecreto(a.id) !== null).length;
        secao(`enzos secretos ${secretos}/${C.SECRETOS}`);
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

        secao(`partidas ${c.scores.length}${c.scores.length === 100 ? '+' : ''}`);
        if (c.scores.length) listarPartidas(c.scores.map((s) => ({ ...s, name: c.name, userId: c.id })), false);
        else apagado('nenhuma partida.');

        const lidos = c.reading.filter((r) => r.completed).length;
        secao(`leitura ${lidos}/${c.reading.length} capítulos completos`);
        if (c.reading.length) {
            tabela(['gibi', 'capítulo', 'pág', 'fim', 'quando'], c.reading.map((r) => [
                r.comicId, r.chapterId, r.page + 1, r.completed ? span('ok', '✔') : span('apagado', '·'), data(r.em),
            ]));
        } else apagado('não leu nada logado ainda.');
        apagado('dica: clique nas caixas e números para dar/tirar. "close" fecha a conta.');
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
            acoes.append(botao(s.verified ? 'tirar' : 'devolver', `${s.verified ? 'hide' : 'show'} ${i + 1}`), ' ', botao('apagar', `rm ${i + 1}`, { perigo: true }));
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
        aviso(`${users.length} contas batem com "${ref}". escolha uma:`);
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
            botao(u.name, `open ${i + 1}`, { link: true }),
            u.email,
            u.role === 'banned' ? span('erro', 'banido') : [u.role, u.admin ? span('ok', '*') : null],
            String(u.conquistas),
            String(u.secretos),
            String(u.partidas),
            data(u.ultimoLogin),
        ]));
    }

    function pedirConfirmacao(pergunta, acao) {
        aviso(`${pergunta} [s/N]`);
        estado.confirmar = acao;
        atualizarPrompt();
    }

    async function trocarConquista(ligar, arg) {
        const alvo = exigirAlvo();
        const conquista = conquistaDoArgumento(arg);
        const r = await pedir(`/api/admin/users/${alvo.id}/achievement`, { achievement: conquista, unlocked: ligar });
        marcarConquista(alvo.id, conquista, ligar);
        const nome = C.definicao(conquista)?.titulo || `enzo secreto #${C.numeroSecreto(conquista)}`;
        if (!r.changed) apagado(`${nome}: nada mudou (${ligar ? 'já tinha' : 'não tinha'}).`);
        else ok(`${ligar ? '+' : '-'} ${nome} ${ligar ? 'desbloqueada para' : 'removida de'} ${primeiroNome(alvo.name)}.`);
    }

    const COMANDOS = {
        help: {
            desc: 'lista os comandos',
            fn() {
                tabela(['comando', 'o que faz'], Object.entries(COMANDOS).map(([nome, c]) => [botao(c.uso || nome, nome, { link: true }), c.desc]));
                apagado('↑/↓ histórico · tab completa · clique nos [colchetes] para rodar.');
            },
        },
        status: {
            desc: 'números do site e últimas ações',
            async fn() {
                const { numeros, log, agora } = await pedir('/api/admin/overview');
                mostrarNumeros(numeros);
                tabela(['métrica', 'valor'], [
                    ['contas', `${numeros.contas} (${numeros.banidos} banidas)`],
                    ['ativas em 7 dias', numeros.ativos_7d],
                    ['sessões abertas', numeros.sessoes],
                    ['partidas no ranking', numeros.partidas],
                    ['partidas fora do ranking', numeros.partidas_fora],
                    ['conquistas desbloqueadas', numeros.conquistas],
                    ['capítulos lidos até o fim', numeros.capitulos_lidos],
                    ['relógio do servidor', data(agora)],
                ]);
                if (log.length) { secao('últimas ações'); mostrarLog(log); }
            },
        },
        users: {
            uso: 'users [busca]',
            desc: 'lista contas (nome ou e-mail)',
            async fn(args) {
                const busca = args.join(' ');
                const { users, maisPaginas } = await pedir(`/api/admin/users${busca ? `?q=${encodeURIComponent(busca)}` : ''}`);
                estado.contas = users;
                if (!users.length) { apagado('nenhuma conta.'); return; }
                listarContas(users);
                apagado(`${users.length}${maisPaginas ? '+' : ''} conta(s). "open <n>" abre uma.`);
            },
        },
        open: {
            uso: 'open <n|id|nome>',
            desc: 'abre uma conta (tudo sobre ela)',
            async fn(args) {
                const id = await acharConta(args.join(' '));
                if (!id) return;
                estado.alvo = await pedir(`/api/admin/users/${encodeURIComponent(id)}`);
                atualizarPrompt();
                mostrarConta(estado.alvo);
            },
        },
        close: { desc: 'fecha a conta aberta', fn() { estado.alvo = null; atualizarPrompt(); apagado('conta fechada.'); } },
        grant: { uso: 'grant <id|#n>', desc: 'dá conquista (ou enzo secreto #n)', fn: (args) => trocarConquista(true, args[0]) },
        revoke: { uso: 'revoke <id|#n>', desc: 'tira conquista (ou enzo secreto #n)', fn: (args) => trocarConquista(false, args[0]) },
        achievements: {
            desc: 'ids das conquistas',
            fn() {
                tabela(['id', 'nome', 'como ganha'], C.LISTA.map((d) => [d.id, d.titulo, d.descricao]));
                apagado(`e os enzos secretos: #1 a #${C.SECRETOS}.`);
            },
        },
        ban: {
            desc: 'bane a conta aberta (some do ranking, cai a sessão)',
            fn() {
                const alvo = exigirAlvo();
                pedirConfirmacao(`banir ${alvo.name}?`, async () => {
                    await pedir(`/api/admin/users/${alvo.id}/role`, { role: 'banned' });
                    campo(alvo.id, 'role', 'banned');
                    campo(alvo.id, 'sessoes', '0');
                    alvo.role = 'banned';
                    ok(`${primeiroNome(alvo.name)} banido.`);
                });
            },
        },
        unban: {
            desc: 'desbane a conta aberta',
            async fn() {
                const alvo = exigirAlvo();
                await pedir(`/api/admin/users/${alvo.id}/role`, { role: 'player' });
                campo(alvo.id, 'role', 'player');
                alvo.role = 'player';
                ok(`${primeiroNome(alvo.name)} de volta como player.`);
            },
        },
        kick: {
            desc: 'derruba as sessões da conta aberta',
            fn() {
                const alvo = exigirAlvo();
                pedirConfirmacao(`derrubar as sessões de ${alvo.name}?`, async () => {
                    const { sessoes } = await pedir(`/api/admin/users/${alvo.id}/kick`, {});
                    campo(alvo.id, 'sessoes', '0');
                    ok(`${sessoes} sessão(ões) derrubada(s).`);
                });
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
                campo(alvo.id, 'fala', fala ? `"${fala}"` : '(fala do Enzo)');
                ok(fala ? `fala agora: "${fala}"` : 'fala voltou para a do Enzo.');
            },
        },
        scores: {
            uso: 'scores [flappy|degustacao]',
            desc: 'últimas 100 partidas de todo mundo',
            async fn(args) {
                const id = args[0] ? APELIDOS_JOGO[args[0].toLowerCase()] : null;
                if (args[0] && !id) throw new Error('jogos: flappy, degustacao.');
                const { scores } = await pedir(`/api/admin/scores${id ? `?game=${id}` : ''}`);
                if (!scores.length) { apagado('nenhuma partida.'); estado.partidas = []; return; }
                listarPartidas(scores);
                apagado('"hide <n>" tira do ranking · "show <n>" devolve · "rm <n>" apaga.');
            },
        },
        hide: {
            uso: 'hide <n>', desc: 'tira a partida do ranking',
            async fn(args) {
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
            fn(args) {
                const s = partidaDoArgumento(args[0]);
                pedirConfirmacao(`apagar a partida ${args[0]} (${jogo(s.gameId)}, ${s.score} pts de ${primeiroNome(s.name)})?`, async () => {
                    await pedir(`/api/admin/scores/${s.id}/delete`, {});
                    marcarPartida(s.id, { apagada: true });
                    ok('partida apagada.');
                });
            },
        },
        log: {
            desc: 'histórico das ações de admin',
            async fn() {
                const { log } = await pedir('/api/admin/log');
                if (!log.length) { apagado('nenhuma ação ainda.'); return; }
                mostrarLog(log);
            },
        },
        site: { desc: 'abre o site numa aba nova', fn() { window.open('index.html', '_blank', 'noopener'); } },
        whoami: { desc: 'quem está no terminal', fn() { tabela(['campo', 'valor'], [['nome', estado.eu.name], ['id', estado.eu.id], ['poder', 'root']]); } },
        clear: { desc: 'limpa a tela', fn() { saida.replaceChildren(); } },
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

    function eco(texto) {
        const p = el('p', 'l l--cmd');
        p.append(span('ps', `${ps.textContent} `), texto);
        imprimir(p);
        saida.scrollTop = saida.scrollHeight;
    }

    async function executar(texto) {
        const limpo = texto.trim();
        eco(limpo);
        if (estado.confirmar) {
            const acao = estado.confirmar;
            estado.confirmar = null;
            atualizarPrompt();
            if (/^(s|sim|y|yes)$/i.test(limpo)) await acao();
            else apagado('cancelado.');
            return;
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
        fila = fila.then(() => executar(texto)).catch((e) => {
            erro(e.status === 404 && /rota/.test(e.message) ? 'permissão negada.' : e.message);
        }).finally(atualizarPrompt);
        return fila;
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
        } else return;
        if (opcoes.length === 1) entrada.value = `${prefixo}${opcoes[0]} `;
        else if (opcoes.length > 1) apagado(opcoes.join('   '));
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
        if (evento.key === 'l' && evento.ctrlKey) { evento.preventDefault(); saida.replaceChildren(); }
    });

    // Clicar no fundo do terminal volta o foco para o prompt (sem roubar seleção de texto).
    saida.addEventListener('mouseup', () => { if (!getSelection().toString()) entrada.focus({ preventScroll: true }); });

    const relogio = $('relogio');
    const tique = () => { relogio.textContent = new Date().toLocaleTimeString('pt-BR'); };
    tique();
    setInterval(tique, 1000);

    // ---------------------------------------------------------------- boot
    async function boot() {
        entrada.disabled = true;
        for (const [texto, classe] of [
            ['ENZO-OS 1.0 (degustação noturna) tty1', 'l--apagado'],
            ['montando /dev/macarronada ............ ok', ''],
            ['carregando gibis e placares .......... ok', ''],
            ['verificando credenciais ...', ''],
        ]) { linha(texto, classe); await esperar(160); }

        let eu;
        try {
            const config = await pedir('/api/auth/config');
            if (!config.enabled) throw Object.assign(new Error('login desligado neste servidor.'), { fim: true });
            eu = await pedir('/api/auth/me');
        } catch (e) {
            erro(e.fim ? e.message : 'api fora do ar.');
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
        linha(`acesso concedido. bem-vindo, ${eu.user.firstName}.`, 'l--ok');
        linha(['digite ', botao('help', 'help'), ' ou use os atalhos ao lado.'], 'l--apagado');
        mostrarAtalhos();
        entrada.disabled = false;
        entrada.focus();
        atualizarPrompt();
        await rodar('status');
    }

    boot();
})();
