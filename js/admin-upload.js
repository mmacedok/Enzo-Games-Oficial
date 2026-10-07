// ============================================================================
// Aba "upload" do terminal: arrastar capa e páginas, conferir a ordem e publicar um capítulo (ou vários).
// O nome dos arquivos e das pastas diz o gibi, o capítulo, a capa e a ordem das páginas; o Henrique só corrige o que
// o sistema errou. API: api/upload.js. Usado por js/admin.js (comando `upload`).
// ============================================================================
(function () {
    const EXT = /\.(png|jpe?g|webp|gif)$/i;
    const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const natural = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

    // ------------------------------------------------------------ ler o que foi solto (arquivos e pastas)
    function lerEntradas(entrada, pasta, saida) {
        return new Promise((resolve) => {
            if (entrada.isFile) {
                entrada.file((f) => { saida.push({ file: f, pasta }); resolve(); }, () => resolve());
            } else if (entrada.isDirectory) {
                const leitor = entrada.createReader();
                const todas = [];
                const ler = () => leitor.readEntries(async (lote) => {
                    if (!lote.length) {
                        for (const e of todas) await lerEntradas(e, [...pasta, entrada.name], saida);
                        resolve();
                    } else { todas.push(...lote); ler(); }
                }, () => resolve());
                ler();
            } else resolve();
        });
    }

    async function arquivosSoltos(dt) {
        const saida = [];
        const itens = [...(dt.items || [])].map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null));
        if (itens.length && itens.every(Boolean)) for (const e of itens) await lerEntradas(e, [], saida);
        else for (const f of dt.files) saida.push({ file: f, pasta: [] });
        return saida.filter((x) => EXT.test(x.file.name));
    }

    // ------------------------------------------------------------ descobrir gibi, capítulo, capa e página pelo nome
    const RE_CAP = /(?:cap[ií]tulo|capitulo|cap|chapter|ch)[\s._-]*0*(\d{1,3})/i;
    const RE_PAG = /(?:p[aá]gina|pagina|pag|page|pg|p)[\s._-]*0*(\d{1,3})/i;
    const limpar = (t) => t.replace(RE_CAP, ' ').replace(/^[\s._-]+|[\s._-]+$/g, '').replace(/\s{2,}/g, ' ');

    function interpretar({ file, pasta }) {
        const base = file.name.replace(EXT, '');
        const cap = (pasta.join(' ').match(RE_CAP) || base.match(RE_CAP) || [])[1] || null;
        const semCap = base.replace(RE_CAP, ' ');
        let pagina = (semCap.match(RE_PAG) || [])[1];
        if (pagina === undefined) { const nums = semCap.match(/\d+/g); if (nums) pagina = nums[nums.length - 1]; }
        const capa = /\b(capa|cover)\b/i.test(base) || (pagina !== undefined && Number(pagina) === 0);
        // gibi = nome da pasta de cima sem o "CAP 01"; pastas genéricas (Capa, Paginas...) olham a pasta de cima delas
        const nomes = pasta.map(limpar).filter((n) => n && !/^(capa|paginas?|pages?|imagens?|output|assets|capitulo|cap|\d+)$/i.test(n));
        return { file, cap, pagina: pagina === undefined ? null : Number(pagina), capa, gibi: nomes[nomes.length - 1] || '' };
    }

    /** Junta os arquivos em capítulos (um grupo por gibi + capítulo) e ordena as páginas. */
    function agrupar(lista, catalogo) {
        const grupos = new Map();
        for (const x of lista.map(interpretar)) {
            const chave = `${slug(x.gibi)}|${x.cap ?? '?'}`;
            if (!grupos.has(chave)) grupos.set(chave, { gibi: x.gibi, cap: x.cap, itens: [] });
            grupos.get(chave).itens.push(x);
        }
        const spin = catalogo.filter((c) => c.featured === false);
        return [...grupos.values()].map((g) => {
            const capas = g.itens.filter((i) => i.capa);
            const paginas = g.itens.filter((i) => !i.capa).sort((a, b) => ((a.pagina ?? 1e9) - (b.pagina ?? 1e9)) || natural.compare(a.file.name, b.file.name));
            const achado = g.gibi ? spin.find((c) => [c.id, c.title].some((n) => slug(n) === slug(g.gibi) || slug(g.gibi).startsWith(slug(c.id)))) : null;
            return {
                tipo: g.gibi ? 'spin' : 'serie',
                gibi: achado ? achado.id : (g.gibi ? '__novo' : ''),
                nomeNovo: achado ? '' : g.gibi,
                capitulo: g.cap ? String(Number(g.cap)) : '',
                tituloCapitulo: '', descricao: '', publicar: true, substituir: false,
                capa: capas[0] ? capas[0].file : null,
                sobraCapas: capas.slice(1).length,
                paginas: paginas.map((p) => ({ file: p.file, numero: p.pagina })),
            };
        }).sort((a, b) => Number(a.capitulo) - Number(b.capitulo));
    }

    // ------------------------------------------------------------ envio
    async function enviarArquivo(file) {
        if (file._enzo) return file._enzo;
        const r = await fetch('/api/admin/upload/arquivo', { method: 'POST', headers: { 'X-Enzo-Upload': '1' }, body: file, credentials: 'same-origin' });
        const dados = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(`${file.name}: ${dados.error || r.status}`);
        file._enzo = { sha: dados.sha, ext: dados.ext };
        return file._enzo;
    }

    // ------------------------------------------------------------ tela
    async function montar({ el, imprimir, pedir, ok, erro, apagado }) {
        const [estadoApi, base] = await Promise.all([
            pedir('/api/admin/upload/estado'),
            fetch('data/database.json', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        const catalogo = base.comics;
        const spins = catalogo.filter((c) => c.featured === false);
        const existe = (g) => {
            if (g.tipo === 'serie') return catalogo.some((c) => c.id === `capitulo-${Number(g.capitulo)}`);
            return catalogo.some((c) => c.id === g.gibi && (c.chapters || []).some((k) => String(k.id) === String(Number(g.capitulo))));
        };

        apagado('arraste a capa e as páginas (ou a pasta inteira). O nome do arquivo diz a ordem (PAG1, PAGINA 02, pagina-3...); "capa" ou PAGINA 00 é a capa.');
        if (!estadoApi.configurado) {
            const aviso = el('div', 'up-aviso');
            aviso.append(el('strong', null, 'Upload desligado no site de verdade.'), el('p', null, 'Falta o segredo GITHUB_TOKEN na Cloudflare. O passo a passo está em docs/UPLOAD.md.'));
            imprimir(aviso);
            return;
        }
        if (estadoApi.modo === 'disco') imprimir(el('p', 'up-modo', 'Modo local: os arquivos são gravados na pasta do projeto (depois é só rodar o build e o push). No site de verdade vai direto para o GitHub.'));

        const zona = el('div', 'up-zona');
        zona.tabIndex = 0;
        zona.append(el('strong', null, '⬇ solte aqui as imagens ou pastas'), el('span', null, 'ou use os botões'));
        const botoes = el('div', 'up-botoes');
        const seletor = (rotulo, pasta) => {
            const b = el('button', 'cmd', rotulo);
            b.type = 'button';
            const i = el('input');
            i.type = 'file'; i.multiple = true; i.accept = 'image/*'; i.hidden = true;
            if (pasta) i.webkitdirectory = true;
            i.addEventListener('change', () => { receber([...i.files].map((f) => ({ file: f, pasta: f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(0, -1) : [] }))); i.value = ''; });
            b.addEventListener('click', () => i.click());
            botoes.append(b, i);
        };
        seletor('escolher imagens', false);
        seletor('escolher pasta', true);
        zona.append(botoes);
        const area = el('div', 'up-area');
        imprimir(zona);
        imprimir(area);

        let grupos = [];
        ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('up-zona--sobre'); }));
        ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove('up-zona--sobre')));
        zona.addEventListener('drop', async (e) => { e.preventDefault(); receber(await arquivosSoltos(e.dataTransfer)); });

        function receber(lista) {
            lista = lista.filter((x) => EXT.test(x.file.name));
            if (!lista.length) { erro('nenhuma imagem (png, jpg, webp ou gif) encontrada.'); return; }
            grupos = [...grupos, ...agrupar(lista, catalogo)];
            desenhar();
        }

        const miniatura = (file) => { if (!file._url) file._url = URL.createObjectURL(file); return file._url; };

        // ---- visualizador grande: confere página a página e corrige
        function visualizar(g, inicio) {
            const fundo = el('div', 'up-modal');
            let i = inicio;
            const img = el('img', 'up-modal-img');
            const info = el('div', 'up-modal-info');
            const barra = el('div', 'up-modal-barra');
            const fechar = () => { fundo.remove(); desenhar(); };
            const btn = (rotulo, fn, classe = 'cmd') => { const b = el('button', classe, rotulo); b.type = 'button'; b.addEventListener('click', fn); barra.append(b); };
            const mostrar = () => {
                const n = g.paginas.length;
                if (!n) { fechar(); return; }
                i = Math.max(0, Math.min(i, n - 1));
                img.src = miniatura(g.paginas[i].file);
                info.textContent = `página ${i + 1} de ${n} · ${g.paginas[i].file.name}`;
            };
            const mover = (de, para) => { if (para < 0 || para >= g.paginas.length) return; g.paginas.splice(para, 0, ...g.paginas.splice(de, 1)); i = para; mostrar(); };
            btn('◀ anterior', () => { i--; mostrar(); });
            btn('próxima ▶', () => { i++; mostrar(); });
            btn('⇤ mover pra trás', () => mover(i, i - 1));
            btn('mover pra frente ⇥', () => mover(i, i + 1));
            btn('★ usar como capa', () => { const [p] = g.paginas.splice(i, 1); if (g.capa) g.paginas.splice(i, 0, { file: g.capa, numero: null }); g.capa = p.file; mostrar(); });
            btn('✕ tirar', () => { g.paginas.splice(i, 1); mostrar(); }, 'cmd up-tirar');
            btn('fechar', fechar, 'cmd cmd--link');
            fundo.append(info, img, barra);
            fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
            document.body.append(fundo);
            mostrar();
        }

        // ---- um cartão por capítulo
        function cartao(g, indice) {
            const c = el('section', 'up-cartao');
            const campo = (rotulo, no) => { const l = el('label', 'up-campo'); l.append(el('span', null, rotulo), no); return l; };
            const entrada = (valor, aoMudar, extra = {}) => { const i = el('input'); Object.assign(i, { value: valor, ...extra }); i.addEventListener('input', () => aoMudar(i.value)); i.addEventListener('change', () => desenhar()); return i; };

            const topo = el('div', 'up-topo');
            const tipoSel = el('select');
            tipoSel.append(new Option('Capítulo da série principal', 'serie'), new Option('Spin-off', 'spin'));
            tipoSel.value = g.tipo;
            tipoSel.addEventListener('change', () => { g.tipo = tipoSel.value; if (g.tipo === 'spin' && !g.gibi) g.gibi = spins[0]?.id || '__novo'; desenhar(); });
            topo.append(campo('Vai para', tipoSel));

            if (g.tipo === 'spin') {
                const gibiSel = el('select');
                for (const s of spins) gibiSel.append(new Option(s.title, s.id));
                gibiSel.append(new Option('➕ spin-off novo…', '__novo'));
                gibiSel.value = g.gibi || '__novo';
                gibiSel.addEventListener('change', () => { g.gibi = gibiSel.value; desenhar(); });
                topo.append(campo('Gibi', gibiSel));
                if (g.gibi === '__novo') topo.append(campo('Nome do novo spin-off', entrada(g.nomeNovo, (v) => { g.nomeNovo = v; }, { placeholder: 'ex.: DougXbox' })));
            }
            topo.append(campo('Nº do capítulo', entrada(g.capitulo, (v) => { g.capitulo = v.replace(/\D/g, ''); }, { inputMode: 'numeric', size: 4 })));
            c.append(topo);

            const meio = el('div', 'up-topo');
            if (g.tipo === 'spin') meio.append(campo('Título do capítulo', entrada(g.tituloCapitulo, (v) => { g.tituloCapitulo = v; }, { placeholder: 'ex.: O Besterol começa' })));
            if (g.tipo === 'serie' || g.gibi === '__novo') meio.append(campo(g.tipo === 'serie' ? 'Frase da capa (descrição)' : 'Descrição do gibi', entrada(g.descricao, (v) => { g.descricao = v; }, { placeholder: g.tipo === 'serie' ? 'ex.: Invasão na madrugada!' : '' })));
            c.append(meio);

            const opcoes = el('div', 'up-opcoes');
            const marcar = (rotulo, chave, dica) => { const l = el('label', 'up-check'); const i = el('input'); i.type = 'checkbox'; i.checked = g[chave]; i.addEventListener('change', () => { g[chave] = i.checked; desenhar(); }); l.append(i, ` ${rotulo}`); if (dica) l.title = dica; return l; };
            opcoes.append(marcar('publicar já no site', 'publicar', 'Desmarcado: sobe escondido e você publica depois na aba lançamentos'));
            if (existe(g)) opcoes.append(marcar('⚠ este capítulo já existe: substituir', 'substituir'));
            c.append(opcoes);

            // capa + páginas
            const faixa = el('div', 'up-faixa');
            const slotCapa = el('figure', `up-miniatura up-miniatura--capa${g.capa ? '' : ' up-miniatura--falta'}`);
            if (g.capa) { const im = el('img'); im.src = miniatura(g.capa); im.alt = 'capa'; slotCapa.append(im); } else slotCapa.append(el('span', null, 'sem capa'));
            slotCapa.append(el('figcaption', null, 'CAPA'));
            faixa.append(slotCapa);
            g.paginas.forEach((p, i) => {
                const f = el('figure', 'up-miniatura');
                f.draggable = true;
                const im = el('img'); im.src = miniatura(p.file); im.alt = `página ${i + 1}`; im.loading = 'lazy'; im.draggable = false;
                im.addEventListener('click', () => visualizar(g, i));
                const legenda = el('figcaption', null, `${i + 1}`);
                if (p.numero != null && p.numero !== i + 1) { legenda.classList.add('up-diverge'); legenda.title = `o nome do arquivo diz página ${p.numero}`; legenda.textContent = `${i + 1} (≠${p.numero})`; }
                const setas = el('div', 'up-setas');
                const seta = (t, fn) => { const b = el('button', null, t); b.type = 'button'; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); setas.append(b); };
                seta('◀', () => { if (i > 0) { g.paginas.splice(i - 1, 0, ...g.paginas.splice(i, 1)); desenhar(); } });
                seta('▶', () => { if (i < g.paginas.length - 1) { g.paginas.splice(i + 1, 0, ...g.paginas.splice(i, 1)); desenhar(); } });
                seta('✕', () => { g.paginas.splice(i, 1); desenhar(); });
                f.append(im, legenda, setas);
                f.addEventListener('dragstart', (e) => { e.dataTransfer.setData('application/x-enzo-pagina', String(i)); f.classList.add('up-arrastando'); });
                f.addEventListener('dragend', () => f.classList.remove('up-arrastando'));
                f.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('application/x-enzo-pagina')) e.preventDefault(); });
                f.addEventListener('drop', (e) => {
                    const de = Number(e.dataTransfer.getData('application/x-enzo-pagina'));
                    if (!e.dataTransfer.types.includes('application/x-enzo-pagina')) return;
                    e.preventDefault(); e.stopPropagation();
                    if (de !== i && de < g.paginas.length) { g.paginas.splice(i, 0, ...g.paginas.splice(de, 1)); desenhar(); }
                });
                faixa.append(f);
            });
            c.append(faixa);

            const avisos = [];
            const numeros = g.paginas.map((p) => p.numero).filter((n) => n != null);
            const faltam = []; for (let n = 1; n <= Math.max(0, ...numeros); n++) if (!numeros.includes(n)) faltam.push(n);
            if (faltam.length) avisos.push(`faltam no nome dos arquivos: ${faltam.slice(0, 8).join(', ')}${faltam.length > 8 ? '…' : ''}`);
            if (new Set(numeros).size < numeros.length) avisos.push('há páginas com o mesmo número no nome');
            if (g.paginas.some((p) => p.numero == null)) avisos.push('há páginas sem número no nome (ficaram no fim)');
            if (!g.capa) avisos.push('falta a capa: clique numa página e use ★ usar como capa');
            if (g.sobraCapas) avisos.push(`${g.sobraCapas} imagem(ns) de capa a mais foram ignoradas`);
            if (avisos.length) c.append(el('p', 'up-avisos', `⚠ ${avisos.join(' · ')}`));
            c.append(el('p', 'up-dica', `${g.paginas.length} páginas · arraste as miniaturas, use ◀ ▶, ou clique numa página para ver grande e corrigir.`));

            const tirar = el('button', 'cmd cmd--link', 'remover este capítulo da lista');
            tirar.type = 'button';
            tirar.addEventListener('click', () => { grupos.splice(indice, 1); desenhar(); });
            c.append(tirar);
            return c;
        }

        function problemas(g) {
            const p = [];
            if (!g.capitulo || Number(g.capitulo) < 1) p.push('número do capítulo');
            if (!g.capa) p.push('capa');
            if (!g.paginas.length) p.push('páginas');
            if (g.tipo === 'spin' && g.gibi === '__novo' && !g.nomeNovo.trim()) p.push('nome do spin-off');
            if (existe(g) && !g.substituir) p.push('marcar "substituir" (já existe)');
            return p;
        }

        function desenhar() {
            area.replaceChildren();
            if (!grupos.length) return;
            grupos.forEach((g, i) => area.append(cartao(g, i)));
            const rodape = el('div', 'up-rodape');
            const status = el('p', 'up-status');
            const enviar = el('button', 'cmd lanc-go', '🚀 enviar e publicar');
            enviar.type = 'button';
            const faltando = grupos.map((g) => ({ g, p: problemas(g) })).filter((x) => x.p.length);
            if (faltando.length) status.textContent = `Falta acertar: ${faltando.map((x) => `capítulo ${x.g.capitulo || '?'} (${x.p.join(', ')})`).join(' · ')}`;
            enviar.disabled = faltando.length > 0;
            enviar.addEventListener('click', async () => {
                enviar.disabled = true;
                try {
                    const total = grupos.reduce((s, g) => s + g.paginas.length + 1, 0);
                    let feitos = 0;
                    const sobe = async (file) => { const r = await enviarArquivo(file); feitos++; status.textContent = `enviando imagens… ${feitos}/${total}`; return r; };
                    const lote = [];
                    for (const g of grupos) {
                        const capa = await sobe(g.capa);
                        const paginas = [];
                        for (let k = 0; k < g.paginas.length; k += 3) paginas.push(...await Promise.all(g.paginas.slice(k, k + 3).map((p) => sobe(p.file))));
                        const novo = g.tipo === 'spin' && g.gibi === '__novo';
                        lote.push({
                            tipo: g.tipo, capitulo: g.capitulo, capa, paginas, escondido: !g.publicar, substituir: g.substituir,
                            gibi: g.tipo === 'serie' ? undefined : (novo ? g.nomeNovo.trim() : g.gibi),
                            titulo: novo ? g.nomeNovo.trim() : undefined,
                            descricao: g.descricao.trim() || undefined, tituloCapitulo: g.tituloCapitulo.trim() || undefined,
                        });
                    }
                    status.textContent = 'publicando…';
                    const r = await pedir('/api/admin/upload/publicar', { lote });
                    ok(r.modo === 'github'
                        ? `Enviado! ${r.resumos.join(' · ')}. O site atualiza sozinho em cerca de 2 minutos (deploy da Cloudflare).`
                        : `Gravado na pasta do projeto: ${r.resumos.join(' · ')}. Falta rodar "npm run build" e o push.`);
                    grupos = [];
                    desenhar();
                } catch (e) {
                    erro(e.message || 'o envio falhou');
                    enviar.disabled = false;
                    status.textContent = 'O envio parou. As imagens já enviadas não se perdem: é só clicar de novo.';
                }
            });
            rodape.append(status, enviar);
            area.append(rodape);
        }
    }

    window.AdminUpload = { montar, _interno: { interpretar, agrupar } };
}());
