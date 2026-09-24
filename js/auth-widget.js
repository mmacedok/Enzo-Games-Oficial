// ============================================================================
// Conta Enzo Games: login com Google, recordes na nuvem e ranking global.
// - Preenche os espaços [data-conta] das páginas (cabeçalho e barra do leitor).
// - window.EnzoConta é a porta para os outros scripts (jogos, leitor, fichas).
// - O script do Google só é baixado quando a pessoa clica em "Entrar".
// - Sem backend (ou sem GOOGLE_CLIENT_ID/SESSION_SECRET) nada aparece: o site
//   segue como antes, com recordes só no localStorage.
// A sessão é um cookie HttpOnly: este arquivo nunca vê token nenhum.
// ============================================================================
(() => {
    'use strict';

    const JOGOS = { 'flappy-enzo': 'Flappy Enzo', 'ronda-noturna': 'Degustação Noturna' };
    const RECORDES_LOCAIS = { 'flappy-enzo': 'flappyenzo-recorde', 'ronda-noturna': 'ronda-recorde' };
    const CONQUISTAS_LOCAIS = 'enzo-conquistas';
    const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

    const estado = { disponivel: false, loginAtivo: false, clientId: null, usuario: null, dados: null };
    const ouvintes = new Set();
    const avisar = () => { for (const fn of ouvintes) { try { fn(api); } catch (erro) { console.error(erro); } } };

    // ---------------------------------------------------------------- servidor
    async function pedir(caminho, corpo, extra = {}) {
        const opcoes = corpo === undefined
            ? { credentials: 'same-origin', ...extra }
            : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), ...extra };
        const resposta = await fetch(caminho, opcoes);
        let dados = null;
        try { dados = await resposta.json(); } catch { /* resposta sem JSON */ }
        return { ok: resposta.ok, status: resposta.status, dados };
    }

    const lerLocal = (chave) => { try { return localStorage.getItem(chave); } catch { return null; } };
    const gravarLocal = (chave, valor) => { try { localStorage.setItem(chave, valor); } catch { /* modo privado */ } };
    const conquistasLocais = () => { try { return JSON.parse(lerLocal(CONQUISTAS_LOCAIS)) || []; } catch { return []; } };

    /** Dados do convidado (localStorage) que sobem para a conta no login. */
    function dadosDoConvidado() {
        const records = {};
        for (const [jogo, chave] of Object.entries(RECORDES_LOCAIS)) {
            const valor = Number.parseInt(lerLocal(chave), 10);
            if (valor > 0) records[jogo] = valor;
        }
        const comicId = lerLocal('currentComicId');
        const chapterId = lerLocal('currentChapterId');
        return { records, achievements: conquistasLocais(), lastRead: comicId && chapterId ? { comicId, chapterId } : null };
    }

    async function carregarConta() {
        const eu = await pedir('/api/auth/me');
        if (!eu.dados?.loggedIn) { estado.usuario = null; estado.dados = null; return; }
        estado.usuario = eu.dados.user;
        const sync = await pedir('/api/user/sync');
        estado.dados = sync.ok ? sync.dados : null;
    }

    const pronto = (async () => {
        try {
            const config = await pedir('/api/auth/config');
            if (!config.ok) return api;
            estado.disponivel = true;
            estado.loginAtivo = Boolean(config.dados?.enabled && config.dados.clientId);
            estado.clientId = config.dados?.clientId || null;
            if (estado.loginAtivo) await carregarConta();
        } catch { /* sem API (site estático): segue como convidado */ }
        return api;
    })();

    // ---------------------------------------------------------------- login
    let googlePronto = null;
    function carregarGoogle() {
        googlePronto ??= new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.onload = () => {
                window.google.accounts.id.initialize({
                    client_id: estado.clientId,
                    callback: aoReceberCredencial,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    use_fedcm_for_button: true,
                });
                resolve(window.google);
            };
            script.onerror = () => { googlePronto = null; reject(new Error('Não foi possível falar com o Google.')); };
            document.head.appendChild(script);
        });
        return googlePronto;
    }

    async function aoReceberCredencial({ credential }) {
        mostrarErroLogin('');
        const login = await pedir('/api/auth/google', { credential });
        if (!login.ok) { mostrarErroLogin(login.dados?.error || 'Não deu para entrar agora. Tente de novo.'); return; }
        estado.usuario = login.dados.user;
        const sync = await pedir('/api/user/sync-guest', dadosDoConvidado());
        estado.dados = sync.ok ? sync.dados : null;
        fecharBalao();
        renderizar();
        avisar();
        carregarCatalogo().then(verificarColecoes).catch(() => {});
    }

    async function sair() {
        await pedir('/api/auth/logout', {});
        window.google?.accounts.id.disableAutoSelect();
        estado.usuario = null;
        estado.dados = null;
        renderizar();
        avisar();
    }

    // ---------------------------------------------------------------- widget
    let balao = null;
    function fecharBalao() {
        balao?.remove();
        balao = null;
        document.removeEventListener('pointerdown', cliqueFora, true);
        document.removeEventListener('keydown', escFecha, true);
    }
    function cliqueFora(evento) {
        if (balao && !balao.contains(evento.target) && !evento.target.closest('[data-conta] > button')) fecharBalao();
    }
    function escFecha(evento) {
        if (evento.key === 'Escape' && balao) { const dono = balao.parentElement?.querySelector('button'); fecharBalao(); dono?.focus(); }
    }
    function abrirBalao(slot, conteudo) {
        fecharBalao();
        balao = document.createElement('div');
        balao.className = 'conta-balao';
        balao.setAttribute('role', 'dialog');
        balao.append(...conteudo);
        slot.appendChild(balao);
        document.addEventListener('pointerdown', cliqueFora, true);
        document.addEventListener('keydown', escFecha, true);
    }
    function mostrarErroLogin(texto) {
        const erro = balao?.querySelector('.conta-erro');
        if (erro) { erro.textContent = texto; erro.hidden = !texto; }
    }

    const el = (tag, classe, texto) => {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto !== undefined) e.textContent = texto;
        return e;
    };

    function balaoDeEntrada(slot) {
        const titulo = el('p', 'conta-balao-titulo', 'Entre para salvar seus recordes');
        const texto = el('p', 'conta-balao-texto', 'Com a conta Google você aparece no ranking dos jogos e continua o gibi de onde parou em qualquer aparelho.');
        const alvo = el('div', 'conta-google');
        const erro = el('p', 'conta-erro'); erro.hidden = true; erro.setAttribute('role', 'alert');
        abrirBalao(slot, [titulo, texto, alvo, erro]);
        carregarGoogle().then((google) => {
            google.accounts.id.renderButton(alvo, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'pt-BR', width: 240 });
        }).catch((falha) => mostrarErroLogin(falha.message));
    }

    // Aba aberta por último no balão da conta (Recordes ou Conquistas).
    let abaDaConta = 'recordes';

    function painelRecordes() {
        const recordes = el('ul', 'conta-recordes');
        for (const [jogo, titulo] of Object.entries(JOGOS)) {
            const item = el('li');
            item.append(el('span', '', titulo), el('strong', '', String(melhorRecorde(jogo))));
            recordes.appendChild(item);
        }
        return recordes;
    }

    /** Aba Conquistas: lista (coleções com barra de progresso) + grade dos Enzos secretos. */
    function painelConquistas() {
        const C = window.EnzoConquistas;
        const painel = el('div', 'conta-conquistas');
        if (!C) return painel;
        const lista = el('ul', 'conquistas-lista');
        const barras = [];
        for (const def of C.LISTA) {
            const feita = temConquista(def.id);
            const item = el('li', `conquista${feita ? ' conquista--feita' : ''}`);
            const texto = el('div', 'conquista-texto');
            texto.append(el('strong', 'conquista-titulo', def.titulo), el('span', 'conquista-descricao', def.descricao));
            if (def.colecao && !feita) {
                const barra = el('span', 'conquista-barra');
                barra.appendChild(el('span', 'conquista-barra-cheia'));
                const conta = el('span', 'conquista-conta', '...');
                texto.append(barra, conta);
                barras.push({ def, barra, conta });
            }
            item.append(el('span', 'conquista-icone', feita ? def.icone : '🔒'), texto);
            item.setAttribute('aria-label', `${def.titulo}: ${feita ? 'desbloqueada' : 'bloqueada'}. ${def.descricao}`);
            lista.appendChild(item);
        }

        const achados = Array.from({ length: C.SECRETOS }, (_, i) => temConquista(C.idSecreto(i + 1)));
        const secretos = el('div', 'conquistas-secretos');
        secretos.append(
            el('p', 'conquista-titulo', `Enzo secreto · ${secretosAchados()}/${C.SECRETOS}`),
            el('p', 'conquista-descricao', 'Enzos escondidos nas páginas das HQs. Clique neles para colecionar!'),
        );
        const grade = el('ol', 'secretos-grade');
        achados.forEach((achado, i) => {
            const celula = el('li', `secreto${achado ? ' secreto--achado' : ''}`, achado ? String(i + 1) : '?');
            celula.title = achado ? `Enzo secreto nº ${i + 1}` : 'Ainda escondido';
            grade.appendChild(celula);
        });
        secretos.appendChild(grade);
        painel.append(lista, secretos);

        // Progresso das coleções precisa do catálogo (quantas edições existem).
        if (barras.length) {
            carregarCatalogo().then((catalogo) => {
                for (const { def, barra, conta } of barras) {
                    const { lidos, total } = C.progressoDaColecao(catalogo, def.colecao, estado.dados?.progress);
                    barra.firstChild.style.width = `${total ? Math.round((lidos / total) * 100) : 0}%`;
                    conta.textContent = `${lidos}/${total} edições lidas`;
                }
            }).catch(() => { for (const { conta } of barras) conta.textContent = ''; });
        }
        return painel;
    }

    function balaoDaConta(slot) {
        const nome = el('p', 'conta-balao-titulo', estado.usuario.name);
        const abas = el('div', 'conta-abas');
        abas.setAttribute('role', 'tablist');
        const corpo = el('div', 'conta-aba-corpo');
        corpo.setAttribute('role', 'tabpanel');
        const mostrar = (aba) => {
            abaDaConta = aba;
            for (const botao of abas.children) botao.setAttribute('aria-selected', String(botao.dataset.aba === aba));
            corpo.replaceChildren(aba === 'conquistas' ? painelConquistas() : painelRecordes());
        };
        for (const [aba, titulo] of [['recordes', 'Recordes'], ['conquistas', 'Conquistas']]) {
            const botao = el('button', 'conta-aba', titulo);
            botao.type = 'button';
            botao.setAttribute('role', 'tab');
            botao.dataset.aba = aba;
            botao.addEventListener('click', () => mostrar(aba));
            abas.appendChild(botao);
        }
        mostrar(abaDaConta);
        const ranking = el('button', 'btn btn--small', '🏆 Ranking');
        ranking.type = 'button';
        ranking.addEventListener('click', () => { fecharBalao(); abrirRanking(); });
        const sairBtn = el('button', 'btn btn--small btn--muted', 'Sair');
        sairBtn.type = 'button';
        sairBtn.addEventListener('click', () => { fecharBalao(); sair(); });
        const acoes = el('div', 'conta-acoes');
        acoes.append(ranking, sairBtn);
        abrirBalao(slot, [nome, abas, corpo, acoes]);
        balao.classList.add('conta-balao--conta');
    }

    function avatar(usuario) {
        const caixa = el('span', 'conta-avatar');
        const inicial = el('span', 'conta-inicial', (usuario.firstName || '?')[0].toUpperCase());
        caixa.appendChild(inicial);
        if (usuario.avatarUrl) {
            const img = el('img');
            img.alt = '';
            img.referrerPolicy = 'no-referrer';   // fotos do Google recusam alguns referrers
            img.src = usuario.avatarUrl;
            img.addEventListener('error', () => img.remove());
            caixa.appendChild(img);
        }
        return caixa;
    }

    function renderizar() {
        for (const slot of document.querySelectorAll('[data-conta]')) {
            slot.replaceChildren();
            slot.hidden = !estado.loginAtivo;
            if (!estado.loginAtivo) continue;
            const botao = el('button', 'conta-botao');
            botao.type = 'button';
            botao.setAttribute('aria-haspopup', 'dialog');
            if (estado.usuario) {
                botao.append(avatar(estado.usuario), el('span', 'conta-nome', estado.usuario.firstName));
                botao.setAttribute('aria-label', `Conta de ${estado.usuario.firstName}: recordes, ranking e sair`);
                botao.addEventListener('click', () => (balao ? fecharBalao() : balaoDaConta(slot)));
            } else {
                botao.append(el('span', 'conta-chave', '🔑'), el('span', 'conta-nome', 'Entrar'));
                botao.setAttribute('aria-label', 'Entrar com Google');
                botao.addEventListener('click', () => (balao ? fecharBalao() : balaoDeEntrada(slot)));
            }
            slot.appendChild(botao);
        }
    }

    // ---------------------------------------------------------------- ranking
    let dialogoRanking = null;
    function criarDialogoRanking() {
        const dialogo = el('dialog', 'ranking-dialog');
        dialogo.setAttribute('aria-label', 'Ranking global');
        dialogo.innerHTML = `
            <div class="ranking-topo">
                <h2 class="ranking-titulo">🏆 Ranking Global</h2>
                <button type="button" class="btn btn--small ranking-fechar" aria-label="Fechar ranking">Fechar ×</button>
            </div>
            <div class="ranking-abas" role="tablist"></div>
            <div class="ranking-corpo" aria-live="polite"></div>`;
        const abas = dialogo.querySelector('.ranking-abas');
        for (const [jogo, titulo] of Object.entries(JOGOS)) {
            const aba = el('button', 'ranking-aba', titulo);
            aba.type = 'button';
            aba.setAttribute('role', 'tab');
            aba.dataset.jogo = jogo;
            aba.addEventListener('click', () => mostrarRanking(jogo));
            abas.appendChild(aba);
        }
        dialogo.querySelector('.ranking-fechar').addEventListener('click', () => dialogo.close());
        dialogo.addEventListener('click', (evento) => { if (evento.target === dialogo) dialogo.close(); });
        document.body.appendChild(dialogo);
        return dialogo;
    }

    function linhaRanking(item, classe = '') {
        const linha = el('li', `ranking-linha ${classe}${item.isMe ? ' ranking-linha--eu' : ''}`);
        linha.append(el('span', 'ranking-pos', `${item.position}º`), el('span', 'ranking-nome', item.isMe ? `${item.name} (você)` : item.name), el('strong', 'ranking-pontos', String(item.score)));
        return linha;
    }

    async function mostrarRanking(jogo) {
        for (const aba of dialogoRanking.querySelectorAll('.ranking-aba')) aba.setAttribute('aria-selected', String(aba.dataset.jogo === jogo));
        const corpo = dialogoRanking.querySelector('.ranking-corpo');
        corpo.replaceChildren(el('p', 'ranking-vazio', 'Carregando...'));
        const { ok, dados } = await pedir(`/api/games/leaderboard/${jogo}`);
        if (!ok) { corpo.replaceChildren(el('p', 'ranking-vazio', 'Ranking indisponível agora.')); return; }
        const partes = [];
        if (!dados.top.length) partes.push(el('p', 'ranking-vazio', 'Ninguém no ranking ainda. Seja o primeiro!'));
        const podio = el('ol', 'ranking-podio');
        for (const item of dados.top.slice(0, 3)) podio.appendChild(linhaRanking(item, `ranking-linha--${item.position}`));
        if (dados.top.length) partes.push(podio);
        if (dados.top.length > 3) {
            const lista = el('ol', 'ranking-lista');
            lista.start = 4;
            for (const item of dados.top.slice(3)) lista.appendChild(linhaRanking(item));
            partes.push(lista);
        }
        if (dados.me && dados.me.position > dados.top.length) {
            const minha = el('ol', 'ranking-lista ranking-lista--eu');
            minha.appendChild(linhaRanking(dados.me));
            partes.push(minha);
        }
        if (!estado.usuario && estado.loginAtivo) partes.push(el('p', 'ranking-convite', 'Entre com Google (botão 🔑 Entrar no topo da página) para aparecer aqui.'));
        corpo.replaceChildren(...partes);
    }

    function abrirRanking(jogo = 'flappy-enzo') {
        dialogoRanking ??= criarDialogoRanking();
        if (!dialogoRanking.open) dialogoRanking.showModal();
        mostrarRanking(JOGOS[jogo] ? jogo : 'flappy-enzo');
    }

    // ---------------------------------------------------------------- partidas
    /**
     * Começa uma partida monitorada (só com login): o relógio do servidor começa a
     * contar agora. Devolve { jogo, token: Promise<runToken|null> } ou null (convidado).
     */
    function iniciarPartida(jogo) {
        if (!estado.usuario || !JOGOS[jogo]) return null;
        const token = pedir('/api/games/session/start', { gameId: jogo }).then((r) => (r.ok ? r.dados.runToken : null)).catch(() => null);
        return { jogo, token };
    }

    /**
     * Envia o placar de uma partida de iniciarPartida. Resolve com
     * { accepted, best, newRecord, position } ou { accepted: false, error };
     * null quando não há partida (convidado).
     */
    async function enviarPartida(partida, pontos, metadata = {}) {
        const runToken = await partida?.token;
        if (!runToken) return null;
        try {
            const { ok, dados } = await pedir('/api/games/session/submit', { runToken, score: pontos, metadata });
            if (ok && estado.dados) {
                const atual = estado.dados.records[partida.jogo] || { best: 0, verifiedBest: 0 };
                estado.dados.records[partida.jogo] = { best: Math.max(atual.best, dados.best), verifiedBest: Math.max(atual.verifiedBest, dados.best) };
            }
            return ok ? dados : { accepted: false, error: dados?.error || 'não foi possível salvar' };
        } catch {
            return { accepted: false, error: 'sem conexão' };
        }
    }

    function melhorRecorde(jogo) {
        const nuvem = estado.dados?.records?.[jogo]?.best || 0;
        return Math.max(nuvem, Number.parseInt(lerLocal(RECORDES_LOCAIS[jogo]), 10) || 0);
    }

    // ---------------------------------------------------------------- leitor e conquistas
    /** Logado: conquistas da conta. Convidado: as guardadas no aparelho (sobem no login). */
    const temConquista = (id) => (estado.usuario
        ? Boolean(estado.dados?.achievements?.includes(id))
        : conquistasLocais().includes(id));

    /**
     * Registra uma conquista: na conta se logado; no aparelho (para migrar depois) se não.
     * Resolve true quando ela é nova (para o chamador comemorar).
     */
    async function conquista(id) {
        if (temConquista(id)) return false;
        if (!estado.usuario) {
            gravarLocal(CONQUISTAS_LOCAIS, JSON.stringify([...conquistasLocais(), id]));
            return true;
        }
        // Marca já, para dois cliques seguidos não contarem duas vezes.
        if (estado.dados) estado.dados.achievements = [...(estado.dados.achievements || []), id];
        const { ok, dados } = await pedir('/api/user/achievement', { id }).catch(() => ({ ok: false }));
        if (estado.dados) {
            // Servidor recusou (ou sem rede): desfaz, para a tela não mostrar o que não foi salvo.
            estado.dados.achievements = ok ? dados.achievements : estado.dados.achievements.filter((a) => a !== id);
        }
        avisar();
        return ok;
    }

    const secretosAchados = () => {
        const C = window.EnzoConquistas;
        return C ? Array.from({ length: C.SECRETOS }, (_, i) => temConquista(C.idSecreto(i + 1))).filter(Boolean).length : 0;
    };

    /** Balão "Conquista desbloqueada" no rodapé (mesmo visual da macarronada do leitor). */
    function anunciarConquista(id) {
        const C = window.EnzoConquistas;
        const numero = C?.numeroSecreto(id);
        const def = C?.definicao(id);
        if (!def && !numero) return;
        const achados = numero ? secretosAchados() : 0;
        const popup = el('div', 'achievement-popup');
        popup.setAttribute('role', 'status');
        const texto = el('div');
        texto.append(
            el('div', 'achievement-label', numero ? 'Parabéns! Conquista desbloqueada' : 'Conquista desbloqueada'),
            el('div', '', numero ? `VOCÊ ACHOU ${achados} DE ${C.SECRETOS} ENZOS SECRETOS!` : `${def.titulo.toUpperCase()}!`),
        );
        popup.append(el('div', 'achievement-icon', numero ? '🐱' : def.icone), texto);
        document.body.appendChild(popup);
        void popup.offsetWidth;
        popup.classList.add('show');
        setTimeout(() => { popup.classList.remove('show'); setTimeout(() => popup.remove(), 600); }, 4000);
    }

    /**
     * Confere as conquistas de coleção ("ler todas as edições de X") com o
     * progresso da conta e libera as que ficaram completas. Precisa do catálogo.
     */
    async function verificarColecoes(catalogo) {
        const C = window.EnzoConquistas;
        if (!C || !estado.usuario || !estado.dados) return;
        for (const def of C.LISTA) {
            if (!def.colecao || temConquista(def.id)) continue;
            const { lidos, total } = C.progressoDaColecao(catalogo, def.colecao, estado.dados.progress);
            if (total > 0 && lidos === total && await conquista(def.id)) anunciarConquista(def.id);
        }
    }

    let catalogoPronto = null;
    function carregarCatalogo() {
        catalogoPronto ??= fetch('data/database.json').then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        }).catch((erro) => { catalogoPronto = null; throw erro; });
        return catalogoPronto;
    }

    /** Progresso do leitor na nuvem (só logado). `saindo` usa keepalive para sobreviver ao fechar a aba. */
    function salvarLeitura({ comicId, chapterId, page, zoom = 1, completed = false }, saindo = false) {
        if (!estado.usuario) return;
        // Terminar um capítulo vale para sempre, mesmo relendo do começo (igual ao servidor).
        const anterior = progressoDe(comicId, chapterId);
        const registro = { comicId, chapterId, page, zoom, completed: completed || Boolean(anterior?.completed), updatedAt: Date.now() };
        if (estado.dados) {
            estado.dados.progress = [registro, ...(estado.dados.progress || []).filter((p) => p.comicId !== comicId || p.chapterId !== chapterId)];
            estado.dados.lastRead = registro;
        }
        pedir('/api/reader/progress', { comicId, chapterId, page, zoom, completed }, saindo ? { keepalive: true } : {}).catch(() => {});
    }

    const progressoDe = (comicId, chapterId) =>
        estado.dados?.progress?.find((p) => p.comicId === comicId && p.chapterId === chapterId) || null;

    // ---------------------------------------------------------------- API pública
    const api = {
        pronto,
        get disponivel() { return estado.disponivel; },
        get loginAtivo() { return estado.loginAtivo; },
        get usuario() { return estado.usuario; },
        get dados() { return estado.dados; },
        aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
        abrirRanking,
        iniciarPartida,
        enviarPartida,
        melhorRecorde,
        temConquista,
        conquista,
        anunciarConquista,
        verificarColecoes,
        salvarLeitura,
        progressoDe,
    };
    window.EnzoConta = api;

    pronto.then(() => {
        renderizar();
        avisar();
        // Coleções completas em qualquer página (ex.: leu tudo antes da conquista existir).
        if (estado.usuario) carregarCatalogo().then(verificarColecoes).catch(() => {});
    });
})();
