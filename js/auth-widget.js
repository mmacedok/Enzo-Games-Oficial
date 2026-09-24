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

    const estado = { disponivel: false, loginAtivo: false, clientId: null, usuario: null, admin: false, dados: null };
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
        if (!eu.dados?.loggedIn) { estado.usuario = null; estado.admin = false; estado.dados = null; return; }
        estado.usuario = eu.dados.user;
        estado.admin = eu.dados.admin === true;
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

    async function sairDaConta() {
        await pedir('/api/auth/logout', {});
        window.google?.accounts.id.disableAutoSelect();
        estado.usuario = null;
        estado.admin = false;
        estado.dados = null;
        renderizar();
        avisar();
    }

    // ---------------------------------------------------------------- widget
    // Visual de gibi: botão do topo = medalhão com faixa de nome; entrar = balão de
    // fala; conta = "Ficha do Leitor", uma página de HQ com quadros (abre como <dialog>).
    const el = (tag, classe, texto) => {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto !== undefined) e.textContent = texto;
        return e;
    };
    const botaoEl = (classe, ...filhos) => {
        const b = el('button', classe);
        b.type = 'button';
        b.append(...filhos);
        return b;
    };
    const icone = (nome, emoji, classe) => window.siteIcon(nome, emoji, classe);

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
    function mostrarErroLogin(texto) {
        const erro = balao?.querySelector('.conta-erro');
        if (erro) { erro.textContent = texto; erro.hidden = !texto; }
    }

    /** Deslogado: balão de fala saindo do botão, com o botão oficial do Google. */
    function balaoDeEntrada(slot) {
        fecharBalao();
        balao = el('div', 'conta-balao');
        balao.setAttribute('role', 'dialog');
        balao.setAttribute('aria-label', 'Entrar com Google');
        const alvo = el('div', 'conta-google');
        const erro = el('p', 'conta-erro');
        erro.hidden = true;
        erro.setAttribute('role', 'alert');
        balao.append(
            el('span', 'conta-balao-estouro', 'PSST!'),
            el('p', 'conta-balao-titulo', 'Quer salvar seus recordes?'),
            el('p', 'conta-balao-texto', 'Entre com o Google para aparecer no ranking, colecionar conquistas e continuar o gibi de onde parou.'),
            alvo, erro,
        );
        slot.appendChild(balao);
        document.addEventListener('pointerdown', cliqueFora, true);
        document.addEventListener('keydown', escFecha, true);
        carregarGoogle().then((google) => {
            google.accounts.id.renderButton(alvo, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'signin_with', locale: 'pt-BR', width: 250 });
        }).catch((falha) => mostrarErroLogin(falha.message));
    }

    function avatar(usuario, classe = 'conta-avatar') {
        const caixa = el('span', classe);
        caixa.appendChild(el('span', 'conta-inicial', (usuario.firstName || '?')[0].toUpperCase()));
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

    // ---------------------------------------------------------------- ficha do leitor
    // A Ficha é uma página de gibi com duas abas: "Minha ficha" (fala editável) e
    // "Leitores do site" (todos os leitores; clicar abre a ficha pública, só leitura).
    // Perfil = { id, name, fala, numero, achievements[], records {jogo: pontos},
    //            progress?, avatarUrl?, proprio } — o mesmo desenho serve para os dois.
    const FALAS = [
        'BORA LER MAIS UMA EDIÇÃO?',
        'ODEIO QUARTAS-FEIRAS... MAS GOSTO DE VOCÊ AQUI!',
        'CADÊ A MINHA MACARRONADA?',
        'TEM ENZO ESCONDIDO NAS PÁGINAS... ACHA ELE!',
        'RECORDE BOM É RECORDE BATIDO!',
    ];
    const FALA_MAX = 80;
    const falaDoEnzo = () => FALAS[Math.floor(Math.random() * FALAS.length)];

    /** Quadro de gibi com recordatório amarelo no canto. */
    function quadro(classe, recordatorio, ...conteudo) {
        const secao = el('section', `quadro ${classe}`);
        if (recordatorio) secao.appendChild(el('p', 'quadro-recordatorio', recordatorio));
        secao.append(...conteudo);
        return secao;
    }

    function perfilProprio() {
        return {
            id: estado.usuario.id,
            name: estado.usuario.name,
            firstName: estado.usuario.firstName,
            avatarUrl: estado.usuario.avatarUrl,
            fala: estado.usuario.fala,
            numero: numeroProprio,
            achievements: estado.dados?.achievements || [],
            records: Object.fromEntries(Object.keys(JOGOS).map((jogo) => [jogo, melhorRecorde(jogo)])),
            progress: estado.dados?.progress,
            proprio: true,
        };
    }
    let numeroProprio = null;

    /** Balão de fala do leitor; na própria ficha vira um campo para editar e salvar. */
    function balaoDaFala(perfil) {
        const caixa = el('div', 'ficha-fala');
        const mostrar = () => {
            const texto = el('p', 'ficha-fala-texto', perfil.fala || falaDoEnzo());
            caixa.replaceChildren(texto);
            caixa.classList.toggle('ficha-fala--enzo', !perfil.fala);
            if (!perfil.proprio) return;
            const editar = botaoEl('ficha-fala-editar', 'Mudar fala');
            editar.setAttribute('aria-label', 'Mudar a fala do seu balão');
            editar.addEventListener('click', editarFala);
            caixa.appendChild(editar);
        };
        const editarFala = () => {
            const campo = el('textarea', 'ficha-fala-campo');
            campo.maxLength = FALA_MAX;
            campo.rows = 2;
            campo.value = perfil.fala || '';
            campo.placeholder = 'Escreva o que você diria no gibi...';
            campo.setAttribute('aria-label', `Sua fala (até ${FALA_MAX} letras). Todos os leitores veem.`);
            const conta = el('span', 'ficha-fala-conta', `${campo.value.length}/${FALA_MAX}`);
            const erro = el('p', 'conta-erro');
            erro.hidden = true;
            const salvar = botaoEl('ficha-fala-salvar', 'Salvar');
            const cancelar = botaoEl('ficha-fala-cancelar', 'Cancelar');
            const acoes = el('div', 'ficha-fala-acoes');
            acoes.append(conta, cancelar, salvar);
            caixa.replaceChildren(campo, acoes, erro);
            caixa.classList.remove('ficha-fala--enzo');
            campo.focus();
            campo.addEventListener('input', () => { conta.textContent = `${campo.value.length}/${FALA_MAX}`; });
            const gravar = async () => {
                salvar.disabled = true;
                const { ok, dados } = await pedir('/api/user/profile', { fala: campo.value }).catch(() => ({ ok: false, dados: null }));
                salvar.disabled = false;
                if (!ok) { erro.textContent = dados?.error || 'Não deu para salvar agora.'; erro.hidden = false; return; }
                perfil.fala = dados.fala;
                estado.usuario.fala = dados.fala;
                mostrar();
            };
            salvar.addEventListener('click', gravar);
            cancelar.addEventListener('click', mostrar);
            campo.addEventListener('keydown', (evento) => {
                if (evento.key === 'Enter' && !evento.shiftKey) { evento.preventDefault(); gravar(); }
                // Esc cancela a edição em vez de fechar a ficha inteira.
                if (evento.key === 'Escape') { evento.preventDefault(); evento.stopPropagation(); mostrar(); }
            });
        };
        mostrar();
        return caixa;
    }

    function quadroDoLeitor(perfil) {
        const retrato = avatar({ firstName: perfil.firstName || perfil.name, avatarUrl: perfil.avatarUrl }, 'ficha-retrato');
        return quadro('quadro--leitor', '', retrato, balaoDaFala(perfil), el('p', 'ficha-nome', perfil.name));
    }

    function quadroDeRecordes(perfil) {
        const lista = el('div', 'ficha-recordes');
        for (const [jogo, titulo] of Object.entries(JOGOS)) {
            const item = el('div', 'ficha-recorde');
            item.append(el('span', 'ficha-recorde-jogo', titulo), el('strong', 'ficha-estouro', String(perfil.records[jogo] || 0)));
            lista.appendChild(item);
        }
        const ranking = botaoEl('ficha-ranking', icone('trofeu', '🏆'), el('span', '', 'Placar global'));
        ranking.addEventListener('click', () => { ficha.close(); abrirRanking(); });
        return quadro('quadro--recordes', perfil.proprio ? 'Recordes' : 'Recordes no placar', lista, ranking);
    }

    function quadroDeConquistas(perfil) {
        const C = window.EnzoConquistas;
        const tem = (id) => perfil.achievements.includes(id);
        const feitas = C.LISTA.filter((def) => tem(def.id)).length;
        const album = el('ul', 'figurinhas');
        const barras = [];
        C.LISTA.forEach((def, i) => {
            const feita = tem(def.id);
            const card = el('li', `figurinha${feita ? ' figurinha--feita' : ''}`);
            card.style.setProperty('--giro', `${i % 2 ? 1.2 : -1.2}deg`);
            const arte = el('div', 'figurinha-arte');
            arte.appendChild(feita ? icone(def.imagem, def.icone, 'figurinha-icone') : icone('cadeado', '🔒', 'figurinha-icone'));
            const texto = el('div', 'figurinha-texto');
            texto.append(el('strong', 'figurinha-titulo', def.titulo), el('span', 'figurinha-descricao', def.descricao));
            // Progresso de leitura é privado: barra só na própria ficha.
            if (def.colecao && !feita && perfil.progress) {
                const barra = el('span', 'figurinha-barra');
                barra.appendChild(el('span'));
                const conta = el('span', 'figurinha-conta', '...');
                texto.append(barra, conta);
                barras.push({ def, barra, conta });
            }
            card.append(arte, texto);
            card.setAttribute('aria-label', `${def.titulo}: ${feita ? 'desbloqueada' : 'bloqueada'}. ${def.descricao}`);
            album.appendChild(card);
        });
        if (barras.length) {
            carregarCatalogo().then((catalogo) => {
                for (const { def, barra, conta } of barras) {
                    const { lidos, total } = C.progressoDaColecao(catalogo, def.colecao, perfil.progress);
                    barra.firstChild.style.width = `${total ? Math.round((lidos / total) * 100) : 0}%`;
                    conta.textContent = `${lidos} de ${total} edições`;
                }
            }).catch(() => { for (const { conta } of barras) conta.textContent = ''; });
        }
        return quadro('quadro--conquistas', `Álbum de conquistas · ${feitas}/${C.LISTA.length}`, album);
    }

    function quadroDeSecretos(perfil) {
        const C = window.EnzoConquistas;
        const grade = el('ol', 'album-secretos');
        let achados = 0;
        for (let n = 1; n <= C.SECRETOS; n++) {
            const achado = perfil.achievements.includes(C.idSecreto(n));
            if (achado) achados++;
            const vaga = el('li', `album-vaga${achado ? ' album-vaga--achada' : ''}`);
            if (achado) vaga.appendChild(icone('enzo-secreto', '🐱', 'album-icone'));
            vaga.appendChild(el('span', 'album-numero', String(n)));
            vaga.title = achado ? `Enzo secreto nº ${n}` : `Nº ${n}: ainda escondido`;
            grade.appendChild(vaga);
        }
        const texto = perfil.proprio ? 'Enzos escondidos nas páginas das HQs. Clique neles para colar no álbum!' : 'Enzos secretos que este leitor já achou nas HQs.';
        return quadro('quadro--secretos', `Enzos secretos · ${achados}/${C.SECRETOS}`, el('p', 'quadro-texto', texto), grade);
    }

    function gradeDoPerfil(perfil) {
        const grade = el('div', 'ficha-grade');
        grade.append(quadroDoLeitor(perfil), quadroDeRecordes(perfil));
        if (window.EnzoConquistas) grade.append(quadroDeConquistas(perfil), quadroDeSecretos(perfil));
        return grade;
    }

    /** Aba "Leitores do site": cada leitor é um quadrinho; clicar abre a ficha dele. */
    function listaDeLeitores(aoContar) {
        const C = window.EnzoConquistas;
        const area = el('div', 'leitores');
        const lista = el('ul', 'leitores-lista');
        const mais = botaoEl('ficha-ranking leitores-mais', el('span', '', 'Mais leitores'));
        mais.hidden = true;
        const aviso = el('p', 'quadro-texto leitores-aviso', 'Carregando os leitores...');
        area.append(el('p', 'quadro-texto', 'Todo mundo que já entrou no site. Clique num leitor para ver a ficha dele.'), aviso, lista, mais);
        let pagina = 0;
        const carregar = async () => {
            mais.disabled = true;
            const { ok, dados } = await pedir(`/api/readers?pagina=${pagina}`).catch(() => ({ ok: false }));
            mais.disabled = false;
            if (!ok) { aviso.textContent = 'Não deu para carregar os leitores agora.'; return; }
            aviso.hidden = true;
            dados.readers.forEach((leitor, i) => {
                const card = botaoEl(`leitor-card${leitor.isMe ? ' leitor-card--eu' : ''}`);
                card.style.setProperty('--giro', `${(pagina * 60 + i) % 3 - 1}deg`);
                const selo = el('span', 'leitor-selo');
                selo.append(el('span', '', 'Nº'), el('strong', '', String(leitor.numero)));
                const topo = el('span', 'leitor-topo');
                topo.append(avatar({ firstName: leitor.name, avatarUrl: leitor.avatarUrl }, 'leitor-medalhao'), el('span', 'leitor-nome', leitor.isMe ? `${leitor.name} (você)` : leitor.name), selo);
                const fala = el('span', `leitor-fala${leitor.fala ? '' : ' leitor-fala--vazia'}`, leitor.fala || '...');
                const numeros = el('span', 'leitor-numeros');
                const conquistas = el('span', '');
                conquistas.append(icone('trofeu', '🏆'), ` ${leitor.conquistas}/${C?.LISTA.length ?? 0}`);
                const secretos = el('span', '');
                secretos.append(icone('enzo-secreto', '🐱'), ` ${leitor.secretos}/${C?.SECRETOS ?? 0}`);
                numeros.append(conquistas, secretos);
                card.append(topo, fala, numeros);
                card.setAttribute('aria-label', `Ver a ficha de ${leitor.name}`);
                card.addEventListener('click', () => mostrarVista({ leitorId: leitor.id }));
                const item = el('li');
                item.appendChild(card);
                lista.appendChild(item);
            });
            mais.hidden = !dados.maisPaginas;
            pagina++;
            aoContar?.(lista.children.length, dados.maisPaginas);
        };
        mais.addEventListener('click', carregar);
        carregar();
        return area;
    }

    let ficha = null;
    let vistaAtual = 'minha';

    /** vista: 'minha' | 'leitores' | { leitorId } */
    async function mostrarVista(vista) {
        vistaAtual = vista;
        const deOutro = typeof vista === 'object';
        const fechar = botaoEl('pagina-fechar', '×');
        fechar.setAttribute('aria-label', 'Fechar a ficha');
        fechar.addEventListener('click', () => ficha.close());
        const selo = el('div', 'pagina-selo');
        const titulo = el('div', 'pagina-titulo');
        const manchete = el('h2', 'pagina-manchete', vista === 'leitores' ? 'Leitores do site' : 'Ficha do Leitor');
        titulo.append(el('p', 'pagina-sobre', 'Enzo Games apresenta'), manchete);
        const topo = el('header', 'pagina-topo');
        topo.append(selo, titulo, fechar);
        const setSelo = (numero) => {
            // "Nº" em fonte de texto: a Bangers não tem o "º" (sai "NO").
            selo.replaceChildren(el('span', '', 'Nº'), el('span', 'pagina-selo-numero', numero ? String(numero) : '?'), el('span', '', vista === 'leitores' ? 'Leitores' : 'Leitor do site'));
        };
        setSelo(vista === 'minha' ? numeroProprio : null);

        // Abas de papel no topo da página (como marcadores de um fichário).
        const abas = el('nav', 'pagina-abas');
        abas.setAttribute('aria-label', 'Páginas da ficha');
        for (const [id, rotulo] of [['minha', 'Minha ficha'], ['leitores', 'Leitores do site']]) {
            if (id === 'minha' && !estado.usuario) continue;
            const aba = botaoEl('pagina-aba', rotulo);
            const ativa = vista === id || (id === 'leitores' && deOutro);
            if (ativa) aba.setAttribute('aria-current', 'page');
            aba.addEventListener('click', () => mostrarVista(id));
            abas.appendChild(aba);
        }

        const corpo = el('div', 'pagina-corpo');
        const rodape = el('footer', 'pagina-rodape');
        if (vista === 'minha') {
            corpo.appendChild(gradeDoPerfil(perfilProprio()));
            const sair = botaoEl('ficha-sair', 'Sair da conta');
            sair.addEventListener('click', () => { ficha.close(); sair.disabled = true; sairDaConta(); });
            rodape.append(el('p', 'pagina-continua', 'Continua na próxima edição...'), sair);
            // Só admin vê o atalho; o painel confere de novo no servidor.
            if (estado.admin) {
                const terminal = el('a', 'ficha-terminal', '>_ terminal');
                terminal.href = 'admin.html';
                rodape.appendChild(terminal);
            }
            // Número de leitor vem do perfil público (ordem de chegada ao site).
            if (!numeroProprio) {
                pedir(`/api/readers/${estado.usuario.id}`).then(({ ok, dados }) => {
                    if (ok) { numeroProprio = dados.numero; if (vistaAtual === 'minha') setSelo(numeroProprio); }
                }).catch(() => {});
            }
        } else if (vista === 'leitores') {
            corpo.appendChild(listaDeLeitores((total, mais) => { if (vistaAtual === 'leitores') setSelo(mais ? `${total}+` : total); }));
            rodape.appendChild(el('p', 'pagina-continua', 'Todos os leitores, numa edição só!'));
        } else {
            const voltar = botaoEl('pagina-voltar', '← Voltar aos leitores');
            voltar.addEventListener('click', () => mostrarVista('leitores'));
            corpo.append(voltar, el('p', 'quadro-texto leitores-aviso', 'Abrindo a ficha...'));
            rodape.appendChild(el('p', 'pagina-continua', 'Continua na próxima edição...'));
        }
        ficha.replaceChildren(topo, abas, corpo, rodape);
        if (!ficha.open) ficha.showModal();
        ficha.scrollTop = 0;
        fechar.focus();

        if (deOutro) {
            const { ok, dados } = await pedir(`/api/readers/${encodeURIComponent(vista.leitorId)}`).catch(() => ({ ok: false }));
            if (vistaAtual !== vista) return;   // já trocou de página
            if (!ok) { corpo.lastChild.textContent = 'Não achamos esse leitor.'; return; }
            if (dados.isMe) { mostrarVista('minha'); return; }
            setSelo(dados.numero);
            manchete.textContent = `Ficha de ${dados.name}`;
            corpo.lastChild.replaceWith(gradeDoPerfil({ ...dados, proprio: false }));
        }
    }

    function abrirFicha(vista = 'minha') {
        fecharBalao();
        if (!ficha) {
            ficha = el('dialog', 'ficha pagina-gibi');
            ficha.setAttribute('aria-label', 'Ficha do leitor');
            ficha.addEventListener('click', (evento) => { if (evento.target === ficha) ficha.close(); });
            document.body.appendChild(ficha);
        }
        // Sem login dá para ver fichas de outros leitores (vindo do placar), mas não "Minha ficha".
        if (!estado.usuario && typeof vista !== 'object') return;
        mostrarVista(vista);
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
                botao.classList.add('conta-botao--logado');
                botao.append(avatar(estado.usuario), el('span', 'conta-nome', estado.usuario.firstName));
                botao.setAttribute('aria-label', `Ficha do leitor ${estado.usuario.firstName}: recordes, conquistas e sair`);
                botao.addEventListener('click', () => abrirFicha());
            } else {
                botao.append(icone('chave', '🔑', 'conta-chave'), el('span', 'conta-nome', 'Entrar'));
                botao.setAttribute('aria-label', 'Entrar com Google');
                botao.addEventListener('click', () => (balao ? fecharBalao() : balaoDeEntrada(slot)));
            }
            slot.appendChild(botao);
        }
    }

    // ---------------------------------------------------------------- ranking
    let dialogoRanking = null;
    function criarDialogoRanking() {
        const dialogo = el('dialog', 'ranking-dialog pagina-gibi');
        dialogo.setAttribute('aria-label', 'Ranking global');
        dialogo.innerHTML = `
            <div class="ranking-topo">
                <h2 class="ranking-titulo">Placar global</h2>
                <button type="button" class="pagina-fechar ranking-fechar" aria-label="Fechar ranking">×</button>
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
        dialogo.querySelector('.ranking-titulo').prepend(icone('trofeu', '🏆', 'ranking-trofeu'));
        dialogo.querySelector('.ranking-fechar').addEventListener('click', () => dialogo.close());
        dialogo.addEventListener('click', (evento) => { if (evento.target === dialogo) dialogo.close(); });
        document.body.appendChild(dialogo);
        return dialogo;
    }

    function linhaRanking(item, classe = '') {
        const linha = el('li', `ranking-linha ${classe}${item.isMe ? ' ranking-linha--eu' : ''}`);
        const posicao = el('span', 'ranking-pos');
        // Pódio com medalha (arte em assets/ui quando existir); o resto só o número.
        if (MEDALHAS[item.position]) posicao.appendChild(icone(`medalha-${item.position}`, MEDALHAS[item.position], 'ranking-medalha'));
        else posicao.textContent = `${item.position}.`;
        // Nome abre a ficha do leitor (conquistas e recordes dele).
        const nome = botaoEl('ranking-nome', item.isMe ? `${item.name} (você)` : item.name);
        nome.title = `Ver a ficha de ${item.name}`;
        nome.addEventListener('click', () => { dialogoRanking.close(); abrirFicha(item.isMe ? 'minha' : { leitorId: item.id }); });
        linha.append(posicao, nome, el('strong', 'ranking-pontos', String(item.score)));
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
        window.siteToast(numero
            ? { icon: ['enzo-secreto', '🐱'], burst: 'PARABÉNS!', label: 'Conquista desbloqueada', text: `VOCÊ ACHOU ${secretosAchados()} DE ${C.SECRETOS} ENZOS SECRETOS!` }
            : { icon: [def.imagem, def.icone], burst: 'CONQUISTA!', label: def.titulo, text: def.descricao });
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
        get admin() { return estado.admin; },
        /** Abre o balão "Entrar com Google" no espaço da conta da página. */
        pedirLogin() { const slot = document.querySelector('[data-conta]:not([hidden])'); if (slot) balaoDeEntrada(slot); },
        abrirFicha,
        avatar,
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
