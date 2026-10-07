// ============================================================================
// Programa "Gibis" do Enzo OS: a estante de todos os gibis e capítulos, com troca de páginas e capas UMA A UMA
// (ou várias de uma vez, de um jeito que vira um commit só). API: POST /api/admin/gibis/trocar (api/upload.js).
// Escolha a imagem nova (ou arraste o arquivo em cima da página), confira lado a lado e publique.
// Também carrega o programa Upload (js/admin-upload.js) com o visual do sistema.
// ============================================================================
(() => {
    'use strict';
    const EXT = /\.(png|jpe?g|webp|gif)$/i;

    let imagens = null;   // data/images.json: caminho original -> variantes webp (miniaturas leves)
    const miniUrl = (caminho) => {
        const v = imagens?.[caminho]?.variants;
        const src = v?.length ? v[0].src : caminho;
        return encodeURI(src);
    };

    async function enviarArquivo(file) {
        if (file._enzo) return file._enzo;
        const r = await fetch('/api/admin/upload/arquivo', { method: 'POST', headers: { 'X-Enzo-Upload': '1' }, body: file, credentials: 'same-origin' });
        const dados = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(`${file.name}: ${dados.error || r.status}`);
        file._enzo = { sha: dados.sha, ext: dados.ext };
        return file._enzo;
    }

    // ---------------------------------------------------------------- Gibis
    async function gibis(corpo) {
        const U = window.EnzoOS.util;
        const { el, botao, api } = U;
        const [estadoApi, base, imgs] = await Promise.all([
            api('/api/admin/upload/estado'),
            fetch('data/database.json', { cache: 'no-store' }).then((r) => r.json()),
            fetch('data/images.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        ]);
        imagens = imgs;
        const comics = [...base.comics].sort((a, b) => (b.featured === a.featured ? (a.order || 0) - (b.order || 0) : a.featured ? -1 : 1));
        const msg = el('div', 'msg');
        const palco = el('div');
        corpo.replaceChildren(msg, palco);
        const aviso = (texto, tipo = '') => { msg.className = `msg ${tipo}`; msg.textContent = texto; msg.hidden = !texto; };
        aviso('');
        if (!estadoApi.configurado) aviso('Troca de imagens desligada no site de verdade: falta o segredo GITHUB_TOKEN na Cloudflare (passo a passo em docs/UPLOAD.md).', 'ruim');

        // ---- nível 1: a estante
        function estante() {
            const grade = el('div', 'estante');
            comics.forEach((c) => {
                const capsDoGibi = c.chapters || [];
                const total = capsDoGibi.reduce((s, k) => s + (k.pages || []).length, 0);
                const card = el('button', 'gibi-card');
                card.type = 'button';
                const capa = el('div', 'gibi-capa'); capa.style.backgroundImage = `url("${miniUrl(c.cover)}")`;
                card.append(capa, el('b', '', c.title), el('span', 'suave', c.featured ? `série principal · ${total} páginas` : `spin-off · ${capsDoGibi.length} cap. · ${total} pág.`));
                card.addEventListener('click', () => { if (c.featured || capsDoGibi.length === 1) capitulo(c, capsDoGibi[0]); else capitulos(c); });
                grade.append(card);
            });
            palco.replaceChildren(el('p', 'suave', 'Escolha um gibi para ver as páginas e trocar qualquer imagem.'), grade);
        }

        // ---- nível 2: capítulos de um spin-off
        function capitulos(c) {
            const grade = el('div', 'estante');
            c.chapters.forEach((k) => {
                const card = el('button', 'gibi-card');
                card.type = 'button';
                const capa = el('div', 'gibi-capa'); capa.style.backgroundImage = `url("${miniUrl(k.cover || c.cover)}")`;
                card.append(capa, el('b', '', `Capítulo ${k.id}`), el('span', 'suave', `${k.title || ''} · ${(k.pages || []).length} pág.`));
                card.addEventListener('click', () => capitulo(c, k));
                grade.append(card);
            });
            palco.replaceChildren(el('div', 'ferramentas', [botao('← Estante', estante), el('b', '', c.title)]), grade);
        }

        // ---- nível 3: as páginas de um capítulo
        function capitulo(c, k) {
            const voltar = c.featured || c.chapters.length === 1 ? estante : () => capitulos(c);
            const itens = [];
            const capaPath = k.cover || (c.featured ? c.cover : null);
            if (capaPath) itens.push({ path: capaPath, rotulo: 'CAPA' });
            (k.pages || []).forEach((p, i) => itens.push({ path: p, rotulo: `Pág. ${i + 1}`, n: i + 1 }));
            const trocas = new Map();   // path -> File
            const enviadas = new Map(); // path -> blob url (já publicada)
            const bPublicar = botao('', publicar, 'btn on');
            const bLimpar = botao('Descartar trocas', () => { trocas.clear(); desenhar(); });
            const zona = el('div', 'zona-solta', 'Solte aqui vários arquivos de uma vez: o número no nome decide a página (PAG3.png troca a página 3; "capa" troca a capa).');
            const grade = el('div', 'paginas');
            const topo = el('div', 'ferramentas', [botao('← Voltar', voltar), el('b', '', `${c.title}${c.featured ? '' : ` · capítulo ${k.id}`}`), el('span', 'suave', `${itens.length} imagens`)]);
            const barra = el('div', 'ferramentas', [bPublicar, bLimpar]);
            palco.replaceChildren(topo, barra, zona, grade);

            const urlDe = (file) => (file._url ??= URL.createObjectURL(file));
            function propor(item, file) {
                if (!file || !EXT.test(file.name)) { aviso(`"${file?.name || 'arquivo'}" não é imagem (png, jpg, webp ou gif).`, 'ruim'); return; }
                trocas.set(item.path, file); desenhar();
            }
            function escolher(item) {
                const i = el('input'); i.type = 'file'; i.accept = 'image/*';
                i.addEventListener('change', () => propor(item, i.files[0]));
                i.click();
            }
            function desenhar() {
                bPublicar.textContent = trocas.size ? `🚀 Publicar ${trocas.size} troca${trocas.size > 1 ? 's' : ''}` : 'Nenhuma troca ainda';
                bPublicar.disabled = !trocas.size || !estadoApi.configurado;
                bLimpar.disabled = !trocas.size;
                grade.replaceChildren(...itens.map((item) => {
                    const nova = trocas.get(item.path);
                    const publicada = enviadas.get(item.path);
                    const t = el('figure', `pag${nova ? ' pag--nova' : ''}${publicada ? ' pag--ok' : ''}${item.n ? '' : ' pag--capa'}`);
                    const im = el('img'); im.loading = 'lazy'; im.alt = item.rotulo; im.src = nova ? urlDe(nova) : publicada || miniUrl(item.path);
                    im.addEventListener('click', () => ampliar(item));
                    const leg = el('figcaption', '', [el('b', '', item.rotulo), nova ? el('span', 'tag', 'NOVA') : publicada ? el('span', 'tag ok', 'enviada') : '']);
                    const acoes = el('div', 'pag-acoes', [botao(nova ? 'outra…' : 'trocar…', () => escolher(item)), nova ? botao('desfazer', () => { trocas.delete(item.path); desenhar(); }) : '']);
                    t.append(im, leg, acoes);
                    ['dragenter', 'dragover'].forEach((ev) => t.addEventListener(ev, (e) => { e.preventDefault(); t.classList.add('sobre'); }));
                    ['dragleave', 'drop'].forEach((ev) => t.addEventListener(ev, () => t.classList.remove('sobre')));
                    t.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); propor(item, e.dataTransfer.files[0]); });
                    return t;
                }));
            }

            // vários de uma vez: o número no nome diz a página
            ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('sobre'); }));
            ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove('sobre')));
            zona.addEventListener('drop', (e) => {
                e.preventDefault();
                const naoCasou = [];
                [...e.dataTransfer.files].filter((f) => EXT.test(f.name)).forEach((f) => {
                    const base = f.name.replace(EXT, '');
                    const num = (base.match(/(\d+)\D*$/) || [])[1];
                    const alvo = /capa|cover/i.test(base) ? itens.find((x) => !x.n) : itens.find((x) => x.n === Number(num));
                    if (alvo) trocas.set(alvo.path, f); else naoCasou.push(f.name);
                });
                desenhar();
                aviso(naoCasou.length ? `Não achei a página de: ${naoCasou.join(', ')}` : '', naoCasou.length ? 'ruim' : '');
            });

            // ver grande: a atual e (se houver) a nova lado a lado
            function ampliar(item) {
                const fundo = el('div', 'up-modal');
                const nova = trocas.get(item.path);
                const par = el('div', 'comparar');
                const lado = (rotulo, src) => { const f = el('figure'); const i = el('img'); i.src = src; f.append(i, el('figcaption', '', rotulo)); return f; };
                par.append(lado(`${item.rotulo} (atual)`, encodeURI(item.path)));
                if (nova) par.append(lado('nova', urlDe(nova)));
                const fechar = botao('fechar', () => fundo.remove());
                fundo.append(par, el('div', 'up-modal-barra', [botao('trocar…', () => { fundo.remove(); escolher(item); }), fechar]));
                fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });
                document.body.append(fundo);
                // a imagem original pode não estar no ar (só as webp): cai para a miniatura
                par.querySelector('img').addEventListener('error', (e) => { e.target.src = miniUrl(item.path); }, { once: true });
            }

            async function publicar() {
                bPublicar.disabled = true;
                try {
                    const lista = [...trocas.entries()];
                    const pronta = [];
                    let feitas = 0;
                    for (const [path, file] of lista) {
                        aviso(`Enviando imagens… ${feitas}/${lista.length}`);
                        const r = await enviarArquivo(file);
                        pronta.push({ path, ...r });
                        feitas++;
                    }
                    aviso('Publicando…');
                    const r = await api('/api/admin/gibis/trocar', { trocas: pronta });
                    lista.forEach(([path, file]) => enviadas.set(path, urlDe(file)));
                    trocas.clear();
                    aviso(r.modo === 'github'
                        ? `Pronto! ${r.trocadas} imagem(ns) trocada(s). O site atualiza sozinho em cerca de 2 minutos (deploy da Cloudflare).`
                        : `Gravado na pasta do projeto (${r.trocadas}). Falta rodar "npm run build" e o push.`, 'ok');
                    desenhar();
                } catch (x) {
                    aviso(`Não deu: ${x.message || 'o envio falhou'}. As imagens que já subiram não se perdem: é só publicar de novo.`, 'ruim');
                    desenhar();
                }
            }
            desenhar();
        }

        estante();
    }

    // ---------------------------------------------------------------- Upload (js/admin-upload.js com o visual do sistema)
    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            if (window.AdminUpload) { resolve(); return; }
            const s = document.createElement('script'); s.src = src;
            s.onload = resolve; s.onerror = () => reject(new Error('não consegui carregar o upload'));
            document.head.append(s);
        });
    }
    async function upload(corpo) {
        const { el, api } = window.EnzoOS.util;
        await carregarScript('js/admin-upload.js?v=1');
        const msg = el('div', 'msg'); msg.hidden = true;
        const dica = el('p', 'suave');
        const palco = el('div');
        corpo.replaceChildren(msg, dica, palco);
        const dizer = (texto, tipo) => { msg.className = `msg ${tipo}`; msg.textContent = texto; msg.hidden = false; msg.scrollIntoView({ block: 'nearest' }); };
        await window.AdminUpload.montar({
            el, pedir: api,
            imprimir: (no) => palco.append(no),
            ok: (t) => dizer(t, 'ok'), erro: (t) => dizer(t, 'ruim'),
            apagado: (t) => { dica.textContent = t; },
        });
    }

    window.OsGibis = { gibis, upload };
})();
