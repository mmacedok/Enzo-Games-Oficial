// ============================================================================
// Cartas dos Leitores: comentários no fim de cada capítulo (docs/PLANO-COMENTARIOS.md).
//   const secao = EnzoComentarios.criar({ comicId, chapterId });  // <section>
// O reader.core.js põe a seção ao lado da última página (computador) ou
// embaixo do botão "Ler próximo" (celular). Carrega só quando aparece na tela.
// Admin vê em cada carta: Apagar, Censurar (clicar nas palavras) e Banir.
// A API nunca manda a palavra censurada para quem não é admin; aqui o texto
// entra sempre com textContent.
// ============================================================================
(() => {
    'use strict';

    const MAX = 500;
    const conta = () => window.EnzoConta;

    function el(tag, classe, texto) {
        const no = document.createElement(tag);
        if (classe) no.className = classe;
        if (texto !== undefined && texto !== null) no.textContent = String(texto);
        return no;
    }
    function botaoEl(classe, texto) {
        const b = el('button', classe, texto);
        b.type = 'button';
        return b;
    }

    async function pedir(caminho, corpo) {
        const opcoes = corpo === undefined
            ? { credentials: 'same-origin' }
            : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) };
        const resposta = await fetch(caminho, opcoes);
        let dados = null;
        try { dados = await resposta.json(); } catch { /* sem JSON */ }
        if (!resposta.ok) throw new Error(dados?.error || 'não deu certo, tente de novo');
        return dados;
    }

    const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    function quando(ms) {
        const s = Math.round((ms - Date.now()) / 1000);
        const passos = [[60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year']];
        let valor = s;
        for (const [limite, unidade] of passos) {
            if (Math.abs(valor) < limite) return relativo.format(valor, unidade);
            valor = Math.round(valor / limite);
        }
        return '';
    }

    /** Botão perigoso: o 1º clique pergunta "Certeza?", o 2º (em até 4 s) faz. */
    function comConfirmacao(botao, pergunta, acao) {
        const rotulo = botao.textContent;
        let timer = 0;
        botao.addEventListener('click', async () => {
            if (!botao.classList.contains('carta-acao--certeza')) {
                botao.classList.add('carta-acao--certeza');
                botao.textContent = pergunta;
                timer = setTimeout(() => { botao.classList.remove('carta-acao--certeza'); botao.textContent = rotulo; }, 4000);
                return;
            }
            clearTimeout(timer);
            botao.disabled = true;
            try { await acao(); } finally {
                botao.disabled = false;
                botao.classList.remove('carta-acao--certeza');
                botao.textContent = rotulo;
            }
        });
    }

    /** Texto em pedaços: { t } vira texto, { tarja } vira a barra preta. */
    function balao(pedacos) {
        const p = el('p', 'carta-balao');
        for (const pedaco of pedacos) {
            if (pedaco.tarja) {
                const tarja = el('span', 'carta-tarja');
                tarja.style.setProperty('--letras', pedaco.tarja);
                tarja.setAttribute('role', 'img');
                tarja.setAttribute('aria-label', 'palavra censurada');
                p.appendChild(tarja);
            } else p.appendChild(document.createTextNode(pedaco.t));
        }
        return p;
    }

    function criar({ comicId, chapterId }) {
        const secao = el('section', 'cartas');
        secao.setAttribute('aria-label', 'Cartas dos Leitores');
        const painel = el('div', 'cartas-painel');
        const topo = el('header', 'cartas-topo');
        const total = el('span', 'cartas-total', '');
        topo.append(el('h2', 'cartas-manchete', 'Cartas dos Leitores'), total);
        const escrever = el('div', 'cartas-escrever');
        const lista = el('ol', 'cartas-lista');
        const aviso = el('p', 'cartas-aviso', 'Abrindo o correio...');
        const mais = botaoEl('cartas-mais', 'Cartas mais antigas');
        mais.hidden = true;
        painel.append(topo, escrever, aviso, lista, mais);
        secao.appendChild(painel);

        const base = `/api/comments?comic=${encodeURIComponent(comicId)}&chapter=${encodeURIComponent(chapterId)}`;
        let quantos = 0;
        let ultimo = null;
        let admin = false;

        const contar = (delta = 0) => {
            quantos = Math.max(0, quantos + delta);
            total.textContent = quantos ? String(quantos) : '';
            aviso.hidden = quantos > 0;
            if (!quantos) aviso.textContent = 'Nenhuma carta ainda. Seja o primeiro!';
        };

        // ---------------------------------------------------------- escrever
        function montarFormulario() {
            escrever.replaceChildren();
            const c = conta();
            if (!c?.usuario) {
                const convite = el('p', 'cartas-convite', 'Quer mandar uma carta para a redação?');
                const entrar = botaoEl('cartas-entrar', 'Entrar para comentar');
                entrar.addEventListener('click', () => c?.pedirLogin?.());
                escrever.append(convite, entrar);
                return;
            }
            const form = el('form', 'cartas-form');
            const campo = el('textarea', 'cartas-campo');
            campo.maxLength = MAX;
            campo.rows = 3;
            campo.placeholder = 'Escreva sua carta...';
            campo.setAttribute('aria-label', 'Sua carta');
            const contador = el('span', 'cartas-contador', `0/${MAX}`);
            const erro = el('p', 'cartas-erro');
            erro.hidden = true;
            erro.setAttribute('role', 'alert');
            const enviar = el('button', 'cartas-enviar', 'Mandar carta!');
            enviar.type = 'submit';
            const rodape = el('div', 'cartas-form-rodape');
            rodape.append(contador, enviar);
            form.append(c.avatar(c.usuario, 'carta-medalhao'), campo, rodape, erro);
            campo.addEventListener('input', () => { contador.textContent = `${[...campo.value].length}/${MAX}`; });
            form.addEventListener('submit', async (evento) => {
                evento.preventDefault();
                if (!campo.value.trim()) { campo.focus(); return; }
                enviar.disabled = true;
                erro.hidden = true;
                try {
                    const { comment } = await pedir('/api/comments', { comicId, chapterId, texto: campo.value });
                    lista.prepend(carta(comment));
                    contar(1);
                    campo.value = '';
                    contador.textContent = `0/${MAX}`;
                } catch (falha) {
                    erro.textContent = falha.message;
                    erro.hidden = false;
                } finally {
                    enviar.disabled = false;
                }
            });
            escrever.appendChild(form);
        }

        // ---------------------------------------------------------- uma carta
        function carta(c) {
            const li = el('li', `carta${c.isMe ? ' carta--minha' : ''}`);
            li.dataset.id = c.id;
            li.dataset.autor = c.autor.id;

            const cabeca = el('div', 'carta-cabeca');
            const quem = botaoEl('carta-autor');
            quem.append(conta()?.avatar
                ? conta().avatar({ firstName: c.autor.name, avatarUrl: c.autor.avatarUrl }, 'carta-medalhao')
                : el('span'), el('span', 'carta-nome', c.isMe ? `${c.autor.name} (você)` : c.autor.name));
            quem.setAttribute('aria-label', `Ficha de ${c.autor.name}`);
            quem.addEventListener('click', () => conta()?.abrirFicha?.(c.isMe ? 'minha' : { leitorId: c.autor.id }));
            const data = el('time', 'carta-data', quando(c.em));
            data.dateTime = new Date(c.em).toISOString();
            data.title = new Date(c.em).toLocaleString('pt-BR');
            cabeca.append(quem, data);

            let texto = balao(c.pedacos);
            li.append(cabeca, texto);

            const remover = () => { li.remove(); contar(-1); };
            const apagar = async () => { await pedir(`/api/comments/${c.id}/delete`, {}); remover(); };

            if (admin) {
                // Faixa do admin, em cima da carta.
                const faixa = el('div', 'carta-admin');
                faixa.setAttribute('aria-label', 'Moderação');
                const bApagar = botaoEl('carta-acao', '✂ Apagar');
                comConfirmacao(bApagar, 'Apagar mesmo?', apagar);
                const bCensurar = botaoEl('carta-acao', '▇ Censurar');
                bCensurar.addEventListener('click', () => censurar(c, li, () => texto, (novo) => { texto = novo; }));
                faixa.append(bApagar, bCensurar);
                if (!c.isMe && !c.autorAdmin) {
                    const bBanir = botaoEl('carta-acao carta-acao--banir', '⛔ Banir');
                    comConfirmacao(bBanir, `Banir ${c.autor.name}?`, async () => {
                        await pedir(`/api/admin/users/${c.autor.id}/role`, { role: 'banned' });
                        // Cartas de banido somem para todo mundo.
                        for (const outra of lista.querySelectorAll(`.carta[data-autor="${c.autor.id}"]`)) { outra.remove(); contar(-1); }
                    });
                    faixa.appendChild(bBanir);
                }
                li.prepend(faixa);
            } else if (c.podeApagar) {
                const bApagar = botaoEl('carta-apagar-minha', 'apagar');
                comConfirmacao(bApagar, 'apagar mesmo?', apagar);
                cabeca.appendChild(bApagar);
            }
            return li;
        }

        /** Modo tarja: cada palavra vira um botão; salvar manda os trechos. */
        function censurar(c, li, atual, trocar) {
            if (li.querySelector('.carta-censura')) return;
            const marcadas = new Set();
            const palavras = [...c.texto.matchAll(/\S+/g)].map((m) => [m.index, m.index + m[0].length, m[0]]);
            const sobrepoe = ([a, b]) => c.trechos.some(([x, y]) => a < y && x < b);
            const editor = el('div', 'carta-censura');
            const texto = el('p', 'carta-balao carta-balao--censura');
            let pos = 0;
            palavras.forEach((palavra, i) => {
                const [a, b, bruto] = palavra;
                if (a > pos) texto.appendChild(document.createTextNode(c.texto.slice(pos, a)));
                const b1 = botaoEl('carta-palavra', bruto);
                if (sobrepoe(palavra)) { marcadas.add(i); b1.setAttribute('aria-pressed', 'true'); } else b1.setAttribute('aria-pressed', 'false');
                b1.addEventListener('click', () => {
                    if (marcadas.has(i)) marcadas.delete(i); else marcadas.add(i);
                    b1.setAttribute('aria-pressed', String(marcadas.has(i)));
                });
                texto.appendChild(b1);
                pos = b;
            });
            if (pos < c.texto.length) texto.appendChild(document.createTextNode(c.texto.slice(pos)));
            const dica = el('p', 'carta-censura-dica', 'Clique nas palavras que vão levar tarja.');
            const erro = el('p', 'cartas-erro');
            erro.hidden = true;
            const salvar = botaoEl('carta-acao carta-acao--salvar', 'Salvar tarjas');
            const cancelar = botaoEl('carta-acao', 'Cancelar');
            const acoes = el('div', 'carta-censura-acoes');
            acoes.append(salvar, cancelar);
            editor.append(dica, texto, acoes, erro);
            atual().replaceWith(editor);
            const fechar = (novo) => { editor.replaceWith(novo); trocar(novo); };
            cancelar.addEventListener('click', () => fechar(atual()));
            salvar.addEventListener('click', async () => {
                salvar.disabled = true;
                try {
                    const trechos = [...marcadas].sort((x, y) => x - y).map((i) => palavras[i].slice(0, 2));
                    const { comment } = await pedir(`/api/admin/comments/${c.id}/censor`, { trechos });
                    c.trechos = comment.trechos;
                    c.pedacos = comment.pedacos;
                    fechar(balao(comment.pedacos));
                } catch (falha) {
                    erro.textContent = falha.message;
                    erro.hidden = false;
                    salvar.disabled = false;
                }
            });
        }

        // ---------------------------------------------------------- carregar
        async function carregar(maisAntigas = false) {
            mais.disabled = true;
            try {
                const dados = await pedir(maisAntigas && ultimo ? `${base}&antes=${ultimo}` : base);
                admin = dados.admin;
                if (!maisAntigas) { lista.replaceChildren(); quantos = dados.total; contar(); }
                for (const c of dados.comments) lista.appendChild(carta(c));
                ultimo = dados.comments.length ? dados.comments[dados.comments.length - 1].em : ultimo;
                mais.hidden = !dados.maisAntigos;
            } catch {
                aviso.hidden = false;
                aviso.textContent = 'O correio está fechado agora. Tente mais tarde.';
            } finally {
                mais.disabled = false;
            }
        }
        mais.addEventListener('click', () => carregar(true));

        // Só busca quando a seção chega perto da tela; login/logout recarrega (admin muda).
        let iniciado = false;
        const iniciar = async () => {
            if (iniciado) return;
            iniciado = true;
            const c = conta();
            await c?.pronto;
            if (!c?.disponivel) { secao.hidden = true; return; }
            montarFormulario();
            carregar();
            let meuId = c.usuario?.id ?? null;
            const parar = c.aoMudar(() => {
                if (!secao.isConnected) { parar(); return; }   // capítulo trocado: esta seção saiu da tela
                const id = c.usuario?.id ?? null;
                if (id === meuId) return;   // aviso da conta sem trocar de usuário: nada muda aqui
                meuId = id;
                montarFormulario();
                carregar();
            });
        };
        if ('IntersectionObserver' in window) {
            const olho = new IntersectionObserver((entradas) => {
                if (entradas.some((e) => e.isIntersecting)) { olho.disconnect(); iniciar(); }
            }, { rootMargin: '600px 0px' });
            olho.observe(secao);
        } else iniciar();

        return secao;
    }

    window.EnzoComentarios = { criar };
})();
