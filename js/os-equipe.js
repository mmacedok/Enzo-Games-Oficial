// ============================================================================
// Programas "Lançamentos" e "Perfil" do Enzo OS (antes eram telas do terminal antigo).
//   Lançamentos: publicar, agendar ou esconder cada capítulo; acesso antecipado por leitor (js/lancamentos.js, api/lancamentos.js).
//   Perfil: a ficha de uma conta (nome editável, cargo, banir, censura, fala, conquistas, leituras, partidas).
//           Cartas e baralho continuam no Terminal. API: /api/admin/users/:id/*.
// Todo texto vindo do banco entra com textContent.
// ============================================================================
(() => {
    'use strict';
    const U = () => window.EnzoOS.util;
    const L = () => window.Lancamentos;
    const dataHora = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
    const primeiro = (nome) => String(nome || '').trim().split(/\s+/)[0] || '?';

    /** Mensagem curta no topo da janela. */
    function mensagem(corpo, texto, ruim = false) {
        const { el } = U();
        corpo.querySelector(':scope > .msg')?.remove();
        const m = el('div', `msg${ruim ? ' ruim' : ' ok'}`, texto);
        m.setAttribute('role', ruim ? 'alert' : 'status');
        corpo.prepend(m);
        setTimeout(() => m.remove(), 6000);
    }

    // ---------------------------------------------------------------- Lançamentos
    async function lancamentos(corpo, mod) {
        const { el, botao, api, n } = U();
        const Lc = L();
        corpo.replaceChildren(el('p', 'vazio', 'carregando…'));
        const [catalogo, dados, doBanco] = await Promise.all([
            fetch('data/database.json', { cache: 'no-store' }).then((r) => r.json()),
            fetch('/api/site/revelados', { cache: 'no-store' }).then((r) => r.json()),
            mod ? { acessos: [] } : api('/api/admin/lancamentos/acessos'),
        ]);
        const idx = Lc.indexar({ ...dados, meus: [] });   // o que os leitores em geral veem
        const porCap = new Map();
        for (const a of doBanco.acessos) porCap.set(a.c, [...(porCap.get(a.c) || []), a.usuario]);
        const itens = [];
        for (const comic of catalogo.comics) {
            for (const cap of comic.chapters || []) itens.push({ comic, cap, ...Lc.situacao(comic, cap, idx), ordem: Number(comic.order) || 0 });
        }
        const peso = { escondido: 0, agendado: 1, 'no-ar': 2 };
        itens.sort((a, b) => (peso[a.estado] - peso[b.estado]) || (b.ordem - a.ordem) || (Number(b.cap.id) || 0) - (Number(a.cap.id) || 0));

        let filtro = 'todos';
        const conta = (e) => itens.filter((i) => i.estado === e).length;
        const chave = (i) => `${i.comic.id}/${i.cap.id}`;
        const quemVe = (i) => porCap.get(chave(i)) || [];
        const nome = (i) => `${i.comic.title}${i.comic.featured === false ? ` · capítulo ${i.cap.id}` : ''}`;
        const filtros = el('div', 'ferramentas');
        const lista = el('div', 'lanc-lista');
        const resumo = el('p', 'suave', `${conta('escondido')} escondidos · ${conta('agendado')} agendados · ${conta('no-ar')} no ar · horário sempre de Fortaleza. Publicar muda o site na hora, sem deploy.`);
        corpo.replaceChildren(resumo, filtros, lista);

        const recarregar = () => lancamentos(corpo, mod);
        const aplicar = async (item, c, texto) => {
            await api('/api/admin/lancamentos', { comic: item.comic.id, capitulo: item.cap.id, ...c });
            await recarregar();
            mensagem(corpo, texto);
        };
        const falha = (x) => mensagem(corpo, x.message || String(x), true);

        function painelBase(cartao, pergunta) {
            cartao.querySelector('.lanc-painel')?.remove();
            const p = el('div', 'lanc-painel');
            p.append(el('p', 'lanc-pergunta', pergunta));
            cartao.append(p);
            return p;
        }
        const cancelar = (p) => botao('cancelar', () => p.remove(), 'btn');
        const avisar = (marcado) => {
            const i = el('input'); i.type = 'checkbox'; i.checked = marcado;
            return { i, rotulo: el('label', 'lanc-check', [i, ' avisar os leitores na home ("Novo capítulo!" por 7 dias)']) };
        };

        function painelPublicar(cartao, item) {
            const p = painelBase(cartao, `Publicar "${nome(item)}" agora? Os leitores passam a ver na hora.`);
            const av = avisar(true);
            const go = botao('🚀 confirmar publicação', () => { go.disabled = true; aplicar(item, { acao: 'publicar', avisar: av.i.checked }, `${nome(item)} publicado: já aparece no site.`).catch((x) => { falha(x); go.disabled = false; }); }, 'btn on');
            p.append(av.rotulo, el('div', 'ferramentas', [go, cancelar(p)]));
        }
        function painelAgendar(cartao, item) {
            const p = painelBase(cartao, `Quando "${nome(item)}" abre para os leitores? (horário de Fortaleza)`);
            const campo = el('input', 'campo'); campo.type = 'datetime-local';
            const amanha = new Date(Date.now() + 86400000);
            campo.value = item.estado === 'agendado' && item.em ? Lc.paraCampo(item.em) : `${Lc.paraCampo(amanha.getTime()).slice(0, 10)}T10:00`;
            const dica = el('span', 'suave');
            const atualizar = () => { const ms = Lc.deFortaleza(campo.value); dica.textContent = Number.isFinite(ms) ? `abre em ${Lc.formatar(ms)}` : 'escolha a data e a hora'; };
            campo.addEventListener('input', atualizar); atualizar();
            const av = avisar(true);
            const go = botao('🕒 agendar', () => {
                const ms = Lc.deFortaleza(campo.value);
                if (!Number.isFinite(ms)) return falha(new Error('escolha a data e a hora.'));
                if (ms <= Date.now()) return falha(new Error('o horário tem que ser no futuro.'));
                go.disabled = true;
                aplicar(item, { acao: 'agendar', em: ms, avisar: av.i.checked }, `${nome(item)} agendado para ${Lc.formatar(ms)}.`).catch((x) => { falha(x); go.disabled = false; });
            }, 'btn on');
            p.append(el('div', 'ferramentas', [campo, dica]), av.rotulo, el('div', 'ferramentas', [go, cancelar(p)]));
        }
        function painelEsconder(cartao, item) {
            const p = painelBase(cartao, `Esconder "${nome(item)}" dos leitores? Quem estiver lendo continua até sair; depois não aparece mais.`);
            const go = botao('🙈 sim, esconder', () => { go.disabled = true; aplicar(item, { acao: 'esconder' }, `${nome(item)} escondido dos leitores.`).catch((x) => { falha(x); go.disabled = false; }); }, 'btn');
            p.append(el('div', 'ferramentas', [go, cancelar(p)]));
        }
        function painelAcesso(cartao, item, linhaAcesso) {
            const p = painelBase(cartao, `Quem vê "${nome(item)}" antes de todo mundo?`);
            const pessoas = el('div', 'ferramentas');
            const resultados = el('div', 'ferramentas');
            const busca = el('input', 'campo'); busca.type = 'search'; busca.placeholder = 'buscar leitor por nome ou e-mail'; busca.setAttribute('aria-label', 'buscar leitor');
            const mudar = async (u, dar) => {
                await api('/api/admin/lancamentos/acesso', { comic: item.comic.id, capitulo: item.cap.id, usuario: u.id, dar });
                const resto = quemVe(item).filter((x) => x.id !== u.id);
                porCap.set(chave(item), dar ? [...resto, u] : resto);
                linhaAcesso.textContent = resumoAcesso(item);
                mensagem(corpo, dar ? `${primeiro(u.name)} agora vê "${nome(item)}" antes dos outros.` : `${primeiro(u.name)} perdeu o acesso antecipado.`);
                desenhar(); resultados.replaceChildren(); busca.value = '';
            };
            const desenhar = () => pessoas.replaceChildren(...(quemVe(item).length
                ? quemVe(item).map((u) => botao(`✕ ${u.name}`, () => mudar(u, false).catch(falha)))
                : [el('span', 'suave', 'ninguém ainda: só você vê antes.')]));
            let espera = 0;
            busca.addEventListener('input', () => {
                clearTimeout(espera);
                espera = setTimeout(async () => {
                    const q = busca.value.trim();
                    if (q.length < 2) { resultados.replaceChildren(); return; }
                    try {
                        const r = await api(`/api/admin/users?q=${encodeURIComponent(q)}`);
                        const novos = r.users.filter((u) => !quemVe(item).some((x) => x.id === u.id)).slice(0, 8);
                        resultados.replaceChildren(...(novos.length ? novos.map((u) => botao(`+ ${u.name} (${u.email || 'sem e-mail'})`, () => mudar(u, true).catch(falha))) : [el('span', 'suave', 'ninguém com esse nome.')]));
                    } catch (x) { falha(x); }
                }, 250);
            });
            desenhar();
            p.append(pessoas, busca, resultados, el('div', 'ferramentas', [cancelar(p)]));
            busca.focus();
        }
        const resumoAcesso = (i) => (quemVe(i).length ? `👥 vê antes: ${quemVe(i).map((u) => primeiro(u.name)).join(', ')}` : '');

        function cartaoDe(item) {
            const c = el('article', `cartao lanc-cartao ${item.estado}`);
            const origem = item.cap.cover || item.comic.cover;
            const img = el('img', 'lanc-capa'); img.alt = ''; img.loading = 'lazy';
            img.src = window.SiteImages?.[origem]?.variants?.[0]?.src || origem;
            const selo = { escondido: '🙈 escondido', agendado: '🕒 agendado', 'no-ar': '🟢 no ar' }[item.estado];
            const quando = item.estado === 'agendado' ? ` · abre ${Lc.formatar(item.em)}` : item.estado === 'no-ar' && item.em ? ` · desde ${Lc.formatar(item.em)}` : '';
            const linhaAcesso = el('span', 'suave', item.estado === 'no-ar' ? '' : resumoAcesso(item));
            const texto = el('div', 'lanc-texto', [
                el('b', '', nome(item)),
                el('span', 'suave', `${item.cap.title || `Capítulo ${item.cap.id}`} · ${n((item.cap.pages || []).length)} páginas`),
                el('span', `selo-cargo ${item.estado === 'no-ar' ? 'bom' : item.estado === 'escondido' ? 'ruim' : ''}`, `${selo}${quando}`),
                linhaAcesso]);
            const ver = el('a', 'btn', '👁 ver como leitor');
            ver.href = `reader.html?comic=${encodeURIComponent(item.comic.id)}&chapter=${encodeURIComponent(item.cap.id)}&previa=1`;
            ver.target = '_blank'; ver.rel = 'noopener';
            const acoes = el('div', 'ferramentas');
            if (item.estado === 'no-ar') acoes.append(botao('🙈 esconder', () => painelEsconder(c, item)), ver);
            else {
                acoes.append(botao('🚀 publicar agora', () => painelPublicar(c, item)), botao(item.estado === 'agendado' ? '🕒 mudar horário' : '🕒 agendar…', () => painelAgendar(c, item)));
                if (item.estado === 'agendado') acoes.append(botao('✖ cancelar agendamento', () => aplicar(item, { acao: 'esconder' }, `${nome(item)}: agendamento cancelado, segue escondido.`).catch(falha)));
                if (!mod) acoes.append(botao('👥 acesso antecipado', () => painelAcesso(c, item, linhaAcesso)));
                acoes.append(ver);
            }
            c.append(el('div', 'lanc-topo', [img, texto]), acoes);
            return c;
        }
        function desenhar() {
            filtros.replaceChildren(...[['todos', 'todos', itens.length], ['escondido', '🙈 escondidos', conta('escondido')], ['agendado', '🕒 agendados', conta('agendado')], ['no-ar', '🟢 no ar', conta('no-ar')]]
                .map(([k, rotulo, q]) => botao(`${rotulo} (${q})`, () => { filtro = k; desenhar(); }, `btn${filtro === k ? ' on' : ''}`)));
            const vistos = itens.filter((i) => filtro === 'todos' || i.estado === filtro);
            lista.replaceChildren(...(vistos.length ? vistos.map(cartaoDe) : [el('p', 'vazio', 'nenhum capítulo nesse filtro.')]));
        }
        desenhar();
    }

    // ---------------------------------------------------------------- Perfil
    async function perfil(corpo, id, voltar) {
        const { el, botao, api, tabela, n } = U();
        corpo.replaceChildren(el('p', 'vazio', 'carregando…'));
        let d;
        try { d = await api(`/api/admin/users/${encodeURIComponent(id)}`); } catch (x) { corpo.replaceChildren(el('p', 'erro', `Não deu: ${x.message}`)); return; }
        const recarregar = (texto) => perfil(corpo, id, voltar).then(() => texto && mensagem(corpo, texto));
        const agir = (caminho, dados, texto, confirmar) => async () => {
            if (confirmar && !window.confirm(confirmar)) return;
            try { const r = await api(`/api/admin/users/${encodeURIComponent(id)}/${caminho}`, dados); await recarregar(typeof texto === 'function' ? texto(r) : texto); } catch (x) { mensagem(corpo, x.message || String(x), true); }
        };
        const foto = el('span', 'avatar grande');
        if (d.avatarUrl && /^https:\/\//.test(d.avatarUrl)) foto.style.backgroundImage = `url("${d.avatarUrl.replace(/"/g, '%22')}")`;
        else foto.textContent = (d.name || '?').trim().charAt(0).toUpperCase();
        const banida = d.role === 'banned';
        const selos = el('div', 'ferramentas');
        if (d.cargo) selos.append(el('span', 'selo-cargo', d.cargo));
        if (banida) selos.append(el('span', 'selo-cargo ruim', 'banida'));
        if (d.censuraLiberada) selos.append(el('span', 'selo-cargo bom', 'censura liberada'));
        const ficha = el('div', 'ficha', [foto, el('div', '', [
            el('h2', '', d.name),
            ...(d.nomeEditado ? [el('div', 'suave', `Nome original (Google): ${d.nomeOriginal}`)] : []),
            el('div', 'suave', d.email || 'sem e-mail'),
            el('div', 'suave', `no site desde ${dataHora(d.criadoEm)} · último acesso ${dataHora(d.ultimoLogin)} · ${n(d.sessoes)} sessões abertas`),
            selos])]);
        const topo = el('div', 'ferramentas', [...(voltar ? [botao('← Voltar', voltar)] : []), botao('↻ Atualizar', () => recarregar()), botao('⌨ Cartas e baralho (terminal)', () => window.EnzoOS.abrirTerminal(`open ${d.id}`))]);

        // nome
        const campoNome = el('input', 'campo'); campoNome.value = d.name; campoNome.maxLength = 40; campoNome.setAttribute('aria-label', 'Nome que aparece no site');
        const salvarNome = botao('Salvar nome', () => { const v = campoNome.value.trim(); if (!v) return mensagem(corpo, 'Escreva um nome (ou use "Voltar ao original").', true); agir('nome', { nome: v }, 'Nome atualizado no site.')(); }, 'btn on');
        const cartaoNome = el('section', 'cartao', [el('h3', '', 'Nome que aparece no site'),
            el('div', 'ferramentas', [campoNome, salvarNome, ...(d.nomeEditado ? [botao('↩ Voltar ao original', agir('nome', { nome: '' }, 'Voltou ao nome do Google.'))] : [])]),
            el('p', 'suave', 'O e-mail e o nome original do Google ficam guardados e o login não desfaz a sua troca. Vale para comentários, rankings e a ficha do leitor.')]);

        // cargo e conta
        const sel = el('select', 'campo');
        [['', 'sem cargo'], ['moderador', 'moderador'], ['admin', 'admin']].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; sel.append(o); });
        sel.value = d.cargo || '';
        const falaCampo = el('input', 'campo'); falaCampo.value = d.fala || ''; falaCampo.maxLength = 120; falaCampo.placeholder = 'vazio = fala sorteada do Enzo'; falaCampo.setAttribute('aria-label', 'Fala do balão');
        const conta = el('section', 'cartao', [el('h3', '', 'Conta'),
            el('div', 'ferramentas', [el('span', 'suave', 'Cargo'), sel, botao('Aplicar cargo', () => agir('cargo', { cargo: sel.value || null }, 'Cargo atualizado.')())]),
            el('div', 'ferramentas', [
                botao(banida ? '✔ Desbanir' : '⛔ Banir', agir('role', { role: banida ? 'player' : 'banned' }, banida ? 'Conta desbanida.' : 'Conta banida.', banida ? null : `Banir ${d.name}? As sessões dela caem agora.`)),
                botao('🚪 Derrubar sessões', agir('kick', {}, (r) => `${r.sessoes} sessão(ões) derrubada(s).`, `Derrubar as sessões de ${d.name}?`)),
                botao(d.censuraLiberada ? '🔒 Travar censura' : '🔓 Liberar censura', agir('censura', { liberada: !d.censuraLiberada }, d.censuraLiberada ? 'Censura travada.' : 'Censura liberada.'))]),
            el('div', 'ferramentas', [el('span', 'suave', 'Fala'), falaCampo, botao('Salvar fala', () => agir('fala', { fala: falaCampo.value }, 'Fala atualizada.')())])]);

        // conquistas
        const sec = d.achievements.filter((a) => a.id.startsWith('enzo-secreto-')).length;
        const conq = el('section', 'cartao', [el('h3', '', 'Conquistas'),
            el('p', 'suave', `${n(d.achievements.length - sec)} conquistas · ${n(sec)} Enzos secretos`),
            el('div', 'ferramentas', [
                botao('Dar todas', agir('achievements', { grupo: 'conquistas', unlocked: true }, 'Todas as conquistas liberadas.', `Dar todas as conquistas a ${d.name}?`)),
                botao('Dar Enzos secretos', agir('achievements', { grupo: 'secretos', unlocked: true }, 'Todos os Enzos secretos liberados.', `Dar todos os Enzos secretos a ${d.name}?`)),
                botao('Tirar tudo', agir('achievements', { grupo: 'todos', unlocked: false }, 'Conquistas removidas.', `Tirar TODAS as conquistas de ${d.name}?`))])]);

        const leituras = d.reading.length ? tabela([
            { t: 'Capítulo', v: (x) => `${x.comicId} · ${x.chapterId}` },
            { t: 'Progresso', v: (x) => (x.completed ? '✔ leu até o fim' : `página ${x.page + 1}`) },
            { t: 'Quando', v: (x) => dataHora(x.em) }], d.reading) : el('p', 'vazio', 'Sem leituras registradas.');
        const partidas = d.scores.length ? tabela([
            { t: 'Jogo', v: (s) => s.gameId || s.game || '—' }, { t: 'Pontos', num: true, v: (s) => n(s.score ?? s.pontos) },
            { t: 'Quando', v: (s) => dataHora(s.em ?? s.criadoEm ?? s.createdAt) }], d.scores) : el('p', 'vazio', 'Sem partidas.');
        const acessos = d.acessos.length ? tabela([
            { t: 'O quê', v: (a) => a.evento || '—' }, { t: 'Onde', v: (a) => [a.cidade, a.estado, a.pais].filter(Boolean).join(', ') || '—' },
            { t: 'Aparelho', v: (a) => a.aparelho || '—' }, { t: 'Quando', v: (a) => dataHora(a.em ?? a.criadoEm ?? a.created_at) }], d.acessos) : el('p', 'vazio', 'Sem acessos registrados.');

        corpo.replaceChildren(topo, ficha, el('div', 'duas', [cartaoNome, conta]), conq,
            el('section', 'cartao', [el('h3', '', `Leituras (${n(d.reading.length)})`), leituras]),
            el('section', 'cartao', [el('h3', '', 'Partidas'), partidas]),
            el('section', 'cartao', [el('h3', '', 'Acessos recentes'), acessos]));
    }

    window.OsEquipe = { lancamentos, perfil };
})();
