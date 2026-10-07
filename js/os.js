// ============================================================================
// Enzo OS (admin.html): a área de trabalho da equipe. Cada programa abre numa janela por cima do papel de parede.
// A linha de comando antiga continua existindo como o programa "Terminal" (terminal.html, numa janela).
// Dono e admin veem tudo; moderador só vê Visão geral, Leitores, Lançamentos e Histórico. A API confere de novo
// em cada rota: esta página não protege nada. Todo texto vindo do banco entra com textContent.
// ============================================================================
(() => {
    'use strict';
    const api = window.EnzoApi.exigir;
    const $ = (id) => document.getElementById(id);

    const TEMAS = [
        { id: 'hacker', nome: 'Hacker Verde', desc: 'sala de servidores, chuva de códigos' },
        { id: 'degustador', nome: 'Degustador da Noite', desc: 'cidade roxa e lua laranja' },
        { id: 'cacada', nome: 'Caçada', desc: 'caverna de cristais' },
        { id: 'batalha', nome: 'Batalha dos Torados', desc: 'mesa de arena de cartas' },
        { id: 'zezoverso', nome: 'ZeZoVerso', desc: 'espaço cósmico e macarrão-cometa' },
    ];

    // ---------------------------------------------------------------- ajudantes de DOM
    function el(tag, classe, filho) {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (filho !== undefined && filho !== null) {
            if (Array.isArray(filho)) filho.forEach((f) => e.append(f));
            else e.append(filho);
        }
        return e;
    }
    const botao = (texto, aoClicar, classe = 'btn') => { const b = el('button', classe, texto); b.type = 'button'; b.addEventListener('click', aoClicar); return b; };
    const fmt = new Intl.NumberFormat('pt-BR');
    const n = (v) => fmt.format(Number(v) || 0);

    function quando(ms) {
        if (!ms) return '—';
        const s = Math.max(0, (Date.now() - ms) / 1000);
        if (s < 60) return 'agora';
        if (s < 3600) return `há ${Math.floor(s / 60)} min`;
        if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
        if (s < 86400 * 30) return `há ${Math.floor(s / 86400)} d`;
        return new Date(ms).toLocaleDateString('pt-BR');
    }
    const dataHora = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
    const bonito = (id) => String(id).replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());

    function avatar(pessoa, grande = false) {
        const a = el('span', `avatar${grande ? ' grande' : ''}`);
        if (pessoa.avatarUrl && /^https:\/\//.test(pessoa.avatarUrl)) a.style.backgroundImage = `url("${pessoa.avatarUrl.replace(/"/g, '%22')}")`;
        else a.textContent = (pessoa.name || '?').trim().charAt(0).toUpperCase();
        return a;
    }
    const pessoa = (p) => el('span', 'pessoa', [avatar(p), el('b', '', p.name || '(sem nome)')]);

    /** Tabela: colunas [{ t: título, v: (linha) => nó|texto, num?, some? }]; aoClicar(linha) deixa a linha clicável. */
    function tabela(colunas, linhas, aoClicar) {
        const t = el('table', 'tabela');
        const cab = el('tr');
        colunas.forEach((c) => { const th = el('th', c.some ? 'some-cel' : '', c.t); cab.append(th); });
        t.append(el('thead', '', cab));
        const corpo = el('tbody');
        linhas.forEach((l) => {
            const tr = el('tr', aoClicar ? 'clica' : '');
            colunas.forEach((c) => tr.append(el('td', `${c.num ? 'num' : ''} ${c.some ? 'some-cel' : ''}`.trim(), c.v(l))));
            if (aoClicar) { tr.tabIndex = 0; tr.addEventListener('click', () => aoClicar(l)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') aoClicar(l); }); }
            corpo.append(tr);
        });
        t.append(corpo);
        return t;
    }
    const cartao = (titulo, ...filhos) => el('section', 'cartao', [el('h3', '', titulo), ...filhos]);
    const numeroCartao = (valor, rotulo) => el('div', 'cartao', [el('div', 'numero', [n(valor), el('small', '', rotulo)])]);
    const carregando = (corpo) => corpo.replaceChildren(el('p', 'vazio', 'carregando…'));
    const falhou = (corpo, e) => corpo.replaceChildren(el('p', 'erro', `Não deu: ${e.message || e}`));

    /** Campo de busca com atraso; chama aoMudar(texto). */
    function busca(placeholder, aoMudar) {
        const i = el('input', 'campo'); i.type = 'search'; i.placeholder = placeholder; i.setAttribute('aria-label', placeholder);
        let t = 0;
        i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => aoMudar(i.value.trim()), 250); });
        return i;
    }

    // ---------------------------------------------------------------- estado
    const estado = { eu: null, cargo: null, mod: false };
    const janelas = new Map();   // id do programa -> { janela, botao, corpo }
    let zTopo = 10;
    let cascata = 0;

    // ---------------------------------------------------------------- programas
    /** Abre a linha de comando antiga numa janela, já rodando `cmd` (ex.: "open <id>"). */
    function abrirTerminal(cmd = '') {
        const j = janelas.get('terminal');
        const url = `terminal.html?t=${Date.now()}${cmd ? `#cmd=${encodeURIComponent(cmd)}` : ''}`;
        if (j) { j.corpo.querySelector('iframe').src = url; focar(j); return; }
        abrir('terminal', { url });
    }

    function quadroTerminal(url) {
        const f = el('iframe'); f.src = url; f.title = 'Linha de comando';
        return f;
    }

    const APPS = [
        { id: 'visao', nome: 'Visão geral', emoji: '📊', icone: 'ic-visao-geral', w: 860, h: 600, mod: true, render: appVisao },
        { id: 'leitores', nome: 'Leitores', emoji: '👥', icone: 'ic-leitores', w: 900, h: 620, mod: true, render: appLeitores },
        { id: 'lancamentos', nome: 'Lançamentos', emoji: '🚀', icone: 'ic-lancamentos', w: 960, h: 640, mod: true, cru: true, render: () => quadroTerminal('terminal.html#cmd=launch') },
        { id: 'upload', nome: 'Upload', emoji: '☁️', icone: 'ic-upload', w: 980, h: 660, cru: true, render: () => quadroTerminal('terminal.html#cmd=upload') },
        { id: 'contas', nome: 'Contas', emoji: '🪪', icone: 'ic-gibis', w: 900, h: 620, render: appContas },
        { id: 'equipe', nome: 'Equipe e cargos', emoji: '👑', icone: 'ic-equipe', w: 760, h: 520, render: appEquipe },
        { id: 'acessos', nome: 'Acessos', emoji: '🌍', icone: 'ic-acessos', w: 960, h: 600, render: appAcessos },
        { id: 'partidas', nome: 'Batalha online', emoji: '⚔️', icone: 'ic-batalha', w: 900, h: 600, render: appPartidas },
        { id: 'placares', nome: 'Placares', emoji: '🎮', icone: 'ic-jogos', w: 820, h: 580, render: appPlacares },
        { id: 'historico', nome: 'Histórico', emoji: '📜', icone: 'ic-log', w: 820, h: 580, mod: true, render: appHistorico },
        { id: 'terminal', nome: 'Terminal', emoji: '⌨️', icone: 'ic-terminal', w: 900, h: 600, cru: true, render: (corpo, ctx) => quadroTerminal(ctx?.url || 'terminal.html') },
        { id: 'aparencia', nome: 'Aparência', emoji: '🎨', icone: 'ic-aparencia', w: 720, h: 500, mod: true, render: appAparencia },
    ];
    const appsVisiveis = () => APPS.filter((a) => !estado.mod || a.mod);
    const acharApp = (id) => APPS.find((a) => a.id === id);

    // ---- Visão geral
    async function appVisao(corpo) {
        carregando(corpo);
        const [leituras, geral] = await Promise.all([
            api('/api/admin/leituras'),
            estado.mod ? Promise.resolve(null) : api('/api/admin/overview'),
        ]);
        const log = estado.mod ? (await api('/api/admin/log')).log.slice(0, 8) : geral.log;
        const nome = (estado.eu.firstName || estado.eu.name || '').split(' ')[0];
        const grade = el('div', 'grade');
        if (geral) {
            const c = geral.numeros;
            grade.append(numeroCartao(c.contas, `contas (${n(c.banidos)} banidas)`), numeroCartao(c.ativos_7d, 'ativas em 7 dias'),
                numeroCartao(c.capitulos_lidos, 'capítulos lidos até o fim'), numeroCartao(c.partidas, 'partidas no ranking'));
        }
        grade.append(numeroCartao(leituras.hoje.visualizacoes, `visualizações hoje · ${n(leituras.hoje.leitores)} leitores`),
            numeroCartao(leituras.geral.visualizacoes, `visualizações no total · ${n(leituras.geral.leitores)} leitores`));
        const top = leituras.top.length
            ? tabela([{ t: 'Capítulo', v: (l) => `${bonito(l.comicId)} · ${bonito(l.chapterId)}` }, { t: 'Leitores', num: true, v: (l) => n(l.leitores) }, { t: 'Views', num: true, v: (l) => n(l.visualizacoes) }], leituras.top)
            : el('p', 'vazio', 'Ninguém abriu um capítulo ainda desde que a contagem começou.');
        const atividade = log.length
            ? tabela([{ t: 'Quem', v: (l) => l.admin }, { t: 'O quê', v: (l) => [l.acao, l.alvoNome || l.alvo || '', l.detalhe || ''].filter(Boolean).join(' · ') }, { t: 'Quando', some: true, v: (l) => quando(l.em) }], log)
            : el('p', 'vazio', 'Nenhuma ação registrada.');
        const atalhos = el('div', 'ferramentas');
        appsVisiveis().filter((a) => !['visao', 'aparencia'].includes(a.id)).forEach((a) => atalhos.append(botao(`${a.emoji} ${a.nome}`, () => abrir(a.id))));
        corpo.replaceChildren(el('h2', 'saudacao', `Olá, ${nome}`), grade, el('div', 'duas', [cartao('Capítulos mais vistos', top), cartao('Atividade recente', atividade)]), atalhos);
    }

    // ---- Leitores (quem leu e quantas visualizações): equipe toda vê
    async function appLeitores(corpo) {
        const e = { q: '', ordem: 'total', pagina: 0 };
        const lista = el('div');
        const ferr = el('div', 'ferramentas');
        const bTotal = botao('Mais visualizações', () => { e.ordem = 'total'; e.pagina = 0; carregar(); }, 'btn on');
        const bRec = botao('Mais recentes', () => { e.ordem = 'recente'; e.pagina = 0; carregar(); });
        ferr.append(busca('Buscar leitor pelo nome…', (q) => { e.q = q; e.pagina = 0; carregar(); }), bTotal, bRec);
        corpo.replaceChildren(ferr, lista);

        async function carregar() {
            bTotal.classList.toggle('on', e.ordem === 'total'); bRec.classList.toggle('on', e.ordem === 'recente');
            carregando(lista);
            try {
                const d = await api(`/api/admin/leituras?q=${encodeURIComponent(e.q)}&ordem=${e.ordem}&pagina=${e.pagina}`);
                if (!d.leitores.length) { lista.replaceChildren(el('p', 'vazio', e.q ? 'Ninguém com esse nome.' : 'Ninguém leu ainda desde que a contagem começou.')); return; }
                const rodape = el('div', 'rodape-tab', [
                    el('span', 'suave', `${n(d.geral.leitores)} leitores · ${n(d.geral.visualizacoes)} visualizações no total`),
                    el('span', '', [
                        e.pagina > 0 ? botao('← anteriores', () => { e.pagina--; carregar(); }) : '',
                        d.maisPaginas ? botao('próximos →', () => { e.pagina++; carregar(); }) : '',
                    ]),
                ]);
                lista.replaceChildren(tabela([
                    { t: 'Leitor', v: pessoa },
                    { t: 'Visualizações', num: true, v: (l) => n(l.total) },
                    { t: 'Capítulos', num: true, some: true, v: (l) => n(l.capitulos) },
                    { t: 'Última leitura', v: (l) => quando(l.ultima) },
                ], d.leitores, (l) => verLeitor(l, corpo, voltar)), rodape);
            } catch (x) { falhou(lista, x); }
        }
        const voltar = () => { corpo.replaceChildren(ferr, lista); carregar(); };
        carregar();
    }

    async function verLeitor(l, corpo, voltar) {
        carregando(corpo);
        try {
            const d = await api(`/api/admin/leitores/${encodeURIComponent(l.id)}`);
            const maximo = Math.max(1, ...d.leituras.map((x) => x.visualizacoes));
            const ficha = el('div', 'ficha', [avatar(d, true), el('div', '', [
                el('h2', '', d.name),
                el('div', 'suave', `no site desde ${new Date(d.desde).toLocaleDateString('pt-BR')} · último acesso ${quando(d.ultimoLogin)}`),
                el('div', 'suave', `${n(d.total)} visualizações em ${n(d.leituras.length)} capítulos`),
            ])]);
            const acoes = el('div', 'ferramentas', [botao('← Leitores', voltar)]);
            if (!estado.mod) acoes.append(botao('Abrir conta (terminal)', () => abrirTerminal(`open ${d.id}`)));
            const t = d.leituras.length ? tabela([
                { t: 'Capítulo', v: (x) => `${bonito(x.comicId)} · ${bonito(x.chapterId)}` },
                { t: 'Views', v: (x) => el('span', 'pessoa', [el('b', '', n(x.visualizacoes)), (() => { const b = el('span', 'barrinha'); const i = el('i'); i.style.width = `${(x.visualizacoes / maximo) * 100}%`; b.append(i); return b; })()]) },
                { t: 'Progresso', some: true, v: (x) => (x.completo ? '✔ leu até o fim' : x.pagina === null ? '—' : `página ${x.pagina + 1}`) },
                { t: 'Última vez', v: (x) => quando(x.ultima) },
                { t: 'Primeira vez', some: true, v: (x) => dataHora(x.primeira) },
            ], d.leituras) : el('p', 'vazio', 'Sem leituras registradas.');
            corpo.replaceChildren(acoes, ficha, t);
        } catch (x) { falhou(corpo, x); }
    }

    // ---- Contas (admin): lista bonita; as ações pesadas continuam no terminal
    async function appContas(corpo) {
        const lista = el('div');
        let q = '';
        corpo.replaceChildren(el('div', 'ferramentas', [busca('Buscar por nome, e-mail ou id…', (t) => { q = t; carregar(); })]), lista);
        async function carregar() {
            carregando(lista);
            try {
                const d = await api(`/api/admin/users?q=${encodeURIComponent(q)}`);
                lista.replaceChildren(d.users.length ? tabela([
                    { t: 'Conta', v: pessoa },
                    { t: 'E-mail', some: true, v: (u) => u.email || '—' },
                    { t: 'Cargo', v: (u) => (u.role === 'banned' ? el('span', 'selo-cargo ruim', 'banida') : u.cargo ? el('span', 'selo-cargo', u.cargo) : '') },
                    { t: 'Conquistas', num: true, some: true, v: (u) => n(u.conquistas) },
                    { t: 'Último acesso', v: (u) => quando(u.ultimoLogin) },
                ], d.users, (u) => abrirTerminal(`open ${u.id}`)) : el('p', 'vazio', 'Nenhuma conta.'),
                d.maisPaginas ? el('p', 'suave', 'Há mais contas: refine a busca.') : '');
            } catch (x) { falhou(lista, x); }
        }
        carregar();
    }

    // ---- Equipe
    async function appEquipe(corpo) {
        carregando(corpo);
        const d = await api('/api/admin/equipe');
        const cartoes = d.equipe.map((m) => el('div', 'cartao', [el('div', 'ficha', [avatar(m, true), el('div', '', [el('h2', '', m.name), el('span', 'selo-cargo', m.cargo), el('div', 'suave', `visto ${quando(m.ultimoLogin)}`)])]),
            botao('Abrir conta', () => abrirTerminal(`open ${m.id}`))]));
        corpo.replaceChildren(el('div', 'grade', cartoes.length ? cartoes : [el('p', 'vazio', 'Ninguém na equipe ainda.')]),
            el('p', 'suave', d.souDono ? 'Para dar ou tirar cargo: abra a conta da pessoa no programa Contas e use os botões de cargo (ou o comando "team" no Terminal).' : 'Só o dono dá ou tira o cargo de admin.'));
    }

    // ---- Acessos
    async function appAcessos(corpo) {
        carregando(corpo);
        const [radar, lista] = await Promise.all([api('/api/admin/acessos/radar'), api('/api/admin/acessos')]);
        const t = radar.totais;
        const grade = el('div', 'grade', [numeroCartao(t.acessos, 'acessos em 24 h'), numeroCartao(t.ips, 'IPs diferentes'), numeroCartao(t.semLogin, 'sem login')]);
        const tab = tabela([
            { t: 'Quem', v: (a) => a.nome || a.name || 'visitante' },
            { t: 'O quê', v: (a) => a.evento },
            { t: 'Onde', some: true, v: (a) => [a.cidade, a.estado, a.pais].filter(Boolean).join(', ') || '—' },
            { t: 'Aparelho', some: true, v: (a) => a.aparelho || '—' },
            { t: 'Quando', v: (a) => quando(a.em ?? a.criadoEm ?? a.created_at) },
        ], lista.acessos);
        corpo.replaceChildren(grade, el('div', 'duas', [cartao('Eventos recentes', tab)]));
    }

    // ---- Batalha online
    async function appPartidas(corpo) {
        carregando(corpo);
        const d = await api('/api/admin/tcg/partidas');
        const nomes = (p) => `${p.a?.name || '?'} × ${p.b?.name || '?'}`;
        const vivas = d.aoVivo.length ? tabela([{ t: 'Ao vivo', v: nomes }, { t: 'Turno', num: true, v: (p) => p.turnos ?? '—' }, { t: 'Desde', v: (p) => quando(p.desde) }, { t: '', v: (p) => (p.abandonada ? 'parada' : '') }], d.aoVivo) : el('p', 'vazio', 'Nenhuma partida rolando agora.');
        const fim = d.partidas.length ? tabela([{ t: 'Partida', v: nomes }, { t: 'Vencedor', v: (p) => (p.empate ? 'empate' : p.vencedor?.name || '—') }, { t: 'Rodadas', num: true, some: true, v: (p) => n(p.rodadas) }, { t: 'Fim', v: (p) => quando(p.fimEm) }], d.partidas) : el('p', 'vazio', 'Nenhuma partida terminada.');
        corpo.replaceChildren(cartao('Ao vivo', vivas), cartao('Terminadas', fim));
    }

    // ---- Placares
    async function appPlacares(corpo) {
        carregando(corpo);
        const d = await api('/api/admin/scores');
        corpo.replaceChildren(d.scores.length ? tabela([
            { t: 'Jogador', v: (s) => s.name }, { t: 'Jogo', v: (s) => s.gameId || s.game || '—' },
            { t: 'Pontos', num: true, v: (s) => n(s.score ?? s.pontos) }, { t: 'Verificada', some: true, v: (s) => (s.verified ? '✔' : '—') },
            { t: 'Quando', v: (s) => quando(s.em ?? s.criadoEm ?? s.createdAt) },
        ], d.scores) : el('p', 'vazio', 'Sem partidas.'));
    }

    // ---- Histórico
    async function appHistorico(corpo) {
        carregando(corpo);
        const d = await api('/api/admin/log');
        corpo.replaceChildren(d.log.length ? tabela([
            { t: 'Quando', v: (l) => dataHora(l.em) }, { t: 'Quem', v: (l) => l.admin },
            { t: 'Ação', v: (l) => l.acao }, { t: 'Alvo', some: true, v: (l) => l.alvoNome || l.alvo || '' }, { t: 'Detalhe', some: true, v: (l) => l.detalhe || '' },
        ], d.log) : el('p', 'vazio', 'Nada registrado ainda.'));
    }

    // ---- Aparência
    function appAparencia(corpo) {
        const atual = () => document.documentElement.dataset.tema;
        const grade = el('div', 'papeis');
        const desenhar = () => {
            grade.replaceChildren(...TEMAS.map((t) => {
                const b = el('button', `papel-opcao${atual() === t.id ? ' ativo' : ''}`);
                b.type = 'button';
                const previa = el('div', 'previa');
                previa.style.backgroundImage = `url(assets/admin/papel-${t.id}.png), linear-gradient(135deg, var(--fundo), var(--acento))`;
                if (t.id !== atual()) previa.dataset.tema = t.id;
                b.append(previa, el('b', '', t.nome), el('span', '', t.desc));
                b.addEventListener('click', () => { aplicarTema(t.id); desenhar(); });
                return b;
            }));
        };
        desenhar();
        corpo.replaceChildren(el('p', 'suave', 'Escolha o papel de parede. As cores de todo o sistema acompanham.'), grade);
    }
    function aplicarTema(id) {
        if (!TEMAS.some((t) => t.id === id)) id = 'hacker';
        document.documentElement.dataset.tema = id;
        try { localStorage.setItem('enzoOsTema', id); } catch { /* sem armazenamento */ }
    }

    // ---------------------------------------------------------------- janelas
    function iconeNo(app, classe) {
        const s = el('span', classe, app.emoji);
        const img = new Image(); img.alt = ''; img.src = `assets/admin/${app.icone}.png`;
        img.addEventListener('error', () => img.remove());
        s.append(img);
        return s;
    }

    function focar(j) {
        janelas.forEach((o) => { o.janela.classList.remove('foco'); o.botao.classList.remove('foco'); });
        j.janela.classList.remove('mini'); j.botao.classList.remove('mini');
        j.janela.classList.add('foco'); j.botao.classList.add('foco');
        j.janela.style.zIndex = ++zTopo;
    }

    function abrir(id, ctx) {
        const app = acharApp(id);
        if (!app) return;
        const ja = janelas.get(id);
        if (ja) { focar(ja); return; }
        const area = $('janelas');
        const larg = Math.min(app.w, area.clientWidth - 24), alt = Math.min(app.h, area.clientHeight - 24);
        const j = el('div', 'janela');
        j.setAttribute('role', 'dialog'); j.setAttribute('aria-label', app.nome);
        j.style.width = `${larg}px`; j.style.height = `${alt}px`;
        const passo = (cascata++ % 7) * 28;
        j.style.left = `${Math.max(8, Math.min(area.clientWidth - larg - 8, 90 + passo))}px`;
        j.style.top = `${Math.max(8, Math.min(area.clientHeight - alt - 8, 24 + passo))}px`;

        const barra = el('div', 'jan-barra', [iconeNo(app, 'jan-ico'), el('span', 'jan-titulo', app.nome)]);
        const bMin = botao('–', () => { j.classList.add('mini'); j.classList.remove('foco'); tarefa.classList.add('mini'); tarefa.classList.remove('foco'); }, '');
        bMin.title = 'Minimizar'; bMin.setAttribute('aria-label', 'Minimizar');
        const bMax = botao('▢', () => j.classList.toggle('max'), 'maximizar');
        bMax.title = 'Maximizar'; bMax.setAttribute('aria-label', 'Maximizar');
        const bFechar = botao('✕', () => { j.remove(); tarefa.remove(); janelas.delete(id); }, 'fechar');
        bFechar.title = 'Fechar'; bFechar.setAttribute('aria-label', 'Fechar');
        const bAtual = botao('↻', () => rodar(), '');
        bAtual.title = 'Atualizar'; bAtual.setAttribute('aria-label', 'Atualizar');
        barra.append(el('div', 'jan-botoes', [...(app.cru ? [] : [bAtual]), bMin, bMax, bFechar]));
        const corpo = el('div', `jan-corpo${app.cru ? ' cru' : ''}`);
        j.append(barra, corpo);
        area.append(j);

        const tarefa = botao(app.nome, () => { const o = janelas.get(id); if (o.janela.classList.contains('foco')) { o.janela.classList.add('mini'); o.janela.classList.remove('foco'); tarefa.classList.add('mini'); tarefa.classList.remove('foco'); } else focar(o); }, 'tarefa');
        $('tarefas').append(tarefa);
        const reg = { janela: j, botao: tarefa, corpo };
        janelas.set(id, reg);
        j.addEventListener('pointerdown', () => focar(reg), true);
        barra.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) j.classList.toggle('max'); });

        // arrastar pela barra de título
        barra.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button') || j.classList.contains('max') || matchMedia('(max-width: 720px)').matches) return;
            const x0 = e.clientX - j.offsetLeft, y0 = e.clientY - j.offsetTop;
            barra.setPointerCapture(e.pointerId);
            const mover = (m) => {
                j.style.left = `${Math.max(-j.offsetWidth + 80, Math.min(area.clientWidth - 80, m.clientX - x0))}px`;
                j.style.top = `${Math.max(0, Math.min(area.clientHeight - 40, m.clientY - y0))}px`;
            };
            const soltar = () => { barra.removeEventListener('pointermove', mover); barra.removeEventListener('pointerup', soltar); barra.removeEventListener('pointercancel', soltar); };
            barra.addEventListener('pointermove', mover); barra.addEventListener('pointerup', soltar); barra.addEventListener('pointercancel', soltar);
        });

        focar(reg);
        function rodar() {
            const dentro = app.render(corpo, ctx);
            if (dentro instanceof Node) corpo.replaceChildren(dentro);
            else if (dentro && typeof dentro.catch === 'function') dentro.catch((x) => falhou(corpo, x));
        }
        rodar();
    }

    // ---------------------------------------------------------------- área de trabalho e menu
    function montarMesa() {
        const mesa = $('mesa');
        mesa.replaceChildren(...appsVisiveis().map((a) => {
            const b = el('button', 'icone', [el('span', 'arte', [a.emoji]), el('span', 'nome', a.nome)]);
            b.type = 'button';
            const img = new Image(); img.alt = ''; img.src = `assets/admin/${a.icone}.png`;
            img.addEventListener('error', () => img.remove());
            b.querySelector('.arte').append(img);
            b.addEventListener('dblclick', () => abrir(a.id));
            b.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(a.id); });
            // toque (celular): um toque abre
            b.addEventListener('click', (e) => { if (matchMedia('(pointer: coarse)').matches) abrir(a.id); else e.currentTarget.focus(); });
            return b;
        }));
        const menu = $('iniciar-menu');
        menu.replaceChildren(...appsVisiveis().map((a) => {
            const b = el('button', '', [iconeNo(a, 'mini-ico'), a.nome]);
            b.type = 'button';
            b.addEventListener('click', () => { menu.hidden = true; $('iniciar').setAttribute('aria-expanded', 'false'); abrir(a.id); });
            return b;
        }), el('hr'), botao('↩ Voltar ao site', () => { location.href = 'index.html'; }, ''));
    }

    $('iniciar').addEventListener('click', (e) => {
        e.stopPropagation();
        const m = $('iniciar-menu');
        m.hidden = !m.hidden;
        $('iniciar').setAttribute('aria-expanded', String(!m.hidden));
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#iniciar-menu')) { $('iniciar-menu').hidden = true; $('iniciar').setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('iniciar-menu').hidden = true; } });

    const tique = () => { $('relogio').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
    tique(); setInterval(tique, 15000);

    function aviso(titulo, texto, link) {
        const a = $('aviso');
        a.replaceChildren(el('div', '', [el('h1', '', titulo), el('p', 'suave', texto), link || '']));
        a.hidden = false;
    }

    // ---------------------------------------------------------------- boot
    async function boot() {
        try { aplicarTema(localStorage.getItem('enzoOsTema') || 'hacker'); } catch { /* padrão */ }
        let eu;
        try {
            const config = await api('/api/auth/config');
            if (!config.enabled) { aviso('Login desligado', 'O login está desligado neste servidor.'); return; }
            eu = await api('/api/auth/me');
        } catch (x) { aviso('Sem conexão', `Não foi possível verificar a sua sessão: ${x.message}`, botao('Tentar de novo', () => location.reload())); return; }
        const voltar = Object.assign(el('a', '', 'Voltar ao site'), { href: 'index.html' });
        if (!eu.loggedIn) { aviso('Sem sessão', 'Entre no site primeiro e volte aqui.', voltar); return; }
        if (!eu.admin && eu.cargo !== 'moderador') { aviso('Acesso negado', 'Esta área é só para a equipe.', voltar); return; }
        estado.eu = eu.user;
        estado.cargo = eu.cargo || (eu.admin ? 'admin' : null);
        estado.mod = eu.cargo === 'moderador';
        $('chip-cargo').textContent = estado.cargo || 'admin';
        montarMesa();
        const pedido = new URLSearchParams(location.search).get('abrir');
        abrir(acharApp(pedido) && appsVisiveis().some((a) => a.id === pedido) ? pedido : 'visao');
    }

    window.EnzoOS = { abrir, abrirTerminal };
    boot();
})();
