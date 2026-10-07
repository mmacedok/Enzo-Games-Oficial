// ============================================================================
// Baralho Enzo no site: aba "Baralho" da Ficha do Leitor e a abertura de
// pacotes em tela cheia. Dados (cartas, pacotes, preços) em js/baralho-dados.js;
// sorteio, saldo e coleção ficam no servidor (api/baralho.js).
//
//   window.EnzoBaralhoUI.aba()           conteúdo da aba (a Ficha chama)
//   window.EnzoBaralhoUI.carta(cardId)   o desenho de uma carta
// A abertura fecha a Ficha, escurece a tela e, no fim, reabre a Ficha na aba Baralho.
// ============================================================================
(() => {
    'use strict';

    const B = window.EnzoBaralho;
    if (!B) return;

    // Itens do Baralho no convite de login (js/auth-widget.js).
    window.EnzoVantagensExtras = [
        [['convite-baralho', '🃏'], 'Baralho Enzo', 'pacotes de cartas com os créditos dos jogos, inventário e coleção'],
        // A Batalha dos Torados fica escondida até a liberação (porta secreta no nº 99 dos Enzos
        // secretos, js/auth-widget.js). Na liberação, volte com:
        // [['convite-batalha', '⚔️'], 'Batalha dos Torados', 'jogue as suas cartas contra outros leitores'],
    ];

    const icone = (nome, emoji) => window.siteIcon?.(nome, emoji) ?? emoji;

    const ESTRELAS = { comum: '★', raro: '★★', epico: '★★★', lendario: '★★★★' };
    /** Rótulo do tipo na faixa (personagem não leva rótulo). */
    const TIPOS = { campo: 'Campo', goon: 'Capanga', resenha: 'Resenha' };
    const NOMES_JOGOS = { 'flappy-enzo': 'Flappy Enzo', 'ronda-noturna': 'Degustação Noturna' };
    const CONFIRMAR_MS = 4000;
    const PRESENTE_VISITANTE = 'enzo-presente-visitante';   // cartas abertas sem login (ficam só aqui)
    const CONVITE_VISTO = 'enzo-convite-visto';             // mesma chave do convite de login (js/auth-widget.js)
    const DIA_MS = 24 * 60 * 60 * 1000;

    const el = (tag, classe, texto) => {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined && texto !== null) elemento.textContent = texto;
        return elemento;
    };
    const botao = (classe, texto) => {
        const b = el('button', classe, texto);
        b.type = 'button';
        return b;
    };
    const numero = (n) => new Intl.NumberFormat('pt-BR').format(n);
    const pad = (n) => String(n).padStart(3, '0');
    const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

    /** EnzoApi.pedir (js/api-cliente.js), mas sem conexão vira resposta em vez de erro. */
    async function pedir(caminho, corpo) {
        try {
            return await window.EnzoApi.pedir(caminho, corpo);
        } catch {
            return { ok: false, status: 0, dados: { error: 'sem conexão' } };
        }
    }

    /** Dia de Brasília (UTC−3) no formato AAAA-MM-DD — o mesmo do servidor (api/baralho.js). */
    const diaBrasilia = (ms = Date.now()) => new Date(ms - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Presente do visitante: o servidor guarda as cartas pelo código; aqui fica só o código.
    const lerPresente = () => {
        try { const g = JSON.parse(localStorage.getItem(PRESENTE_VISITANTE)); return g?.codigo ? g : null; } catch { return null; }
    };
    const gravarPresente = (valor) => { try { localStorage.setItem(PRESENTE_VISITANTE, JSON.stringify(valor)); } catch { /* modo privado */ } };
    const apagarPresente = () => { try { localStorage.removeItem(PRESENTE_VISITANTE); } catch { /* modo privado */ } };

    // ------------------------------------------------------------ desenho da carta
    /** Zonas com mola: o pointermove de lá mede uma vez e cuida do brilho da carta de dentro. */
    const ZONAS = new WeakSet();

    /** Brilho que segue o mouse (foil do épico, reflexo do lendário). */
    function seguirMouse(elemento) {
        elemento.addEventListener('pointermove', (evento) => {
            if (ZONAS.has(elemento.closest('.juice-balanca'))) return;
            const r = elemento.getBoundingClientRect();
            elemento.style.setProperty('--mx', `${(((evento.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
            elemento.style.setProperty('--my', `${(((evento.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        });
        elemento.addEventListener('pointerleave', () => {
            elemento.style.removeProperty('--mx');
            elemento.style.removeProperty('--my');
        });
    }

    /** Cabo Côco só aparece sem tarja para conta que o admin liberou no terminal (`censura on`). */
    const censurada = (def) => def.censurada && !window.EnzoConta?.censuraLiberada?.();
    /** Nome que pode aparecer (inclusive para leitor de tela): o do Cabo Côco é "???" até a liberação. */
    const nomeVisivel = (def) => (censurada(def) ? '???' : def.nome);

    /** Tarja de cena do crime (a mesma da página de personagens). Não abre nada: só o admin libera. */
    function tarja() {
        const faixa = el('div', 'crime-scene-overlay carta-tcg-tarja');
        faixa.setAttribute('role', 'img');
        faixa.setAttribute('aria-label', 'Conteúdo banido em 456 países');
        const aviso = el('span', '', 'Conteúdo banido');
        aviso.appendChild(el('small', '', 'em 456 países'));
        faixa.appendChild(aviso);
        return faixa;
    }

    /** Troca na tela toda carta censurada pela versão liberada. */
    function liberarCensuradas() {
        document.querySelectorAll('.carta-tcg--censurada').forEach((velha) => {
            const nova = carta(velha.dataset.carta);
            nova.className = velha.className;
            nova.style.cssText = velha.style.cssText;
            nova.classList.remove('carta-tcg--censurada');
            velha.replaceWith(nova);
        });
    }

    // Conta liberada pelo admin no terminal: as cartas já na tela perdem a tarja sem recarregar.
    const ouvirConta = () => window.EnzoConta?.aoMudar?.((conta) => { if (conta.censuraLiberada()) liberarCensuradas(); });
    if (window.EnzoConta) ouvirConta();
    else window.addEventListener('load', ouvirConta, { once: true });

    /**
     * `visual` (opcional, da Batalha): carta complementar que muda a aparência. { arte: id de outra carta (ou caminho
     * de imagem), nome, raridade (só a moldura) }.
     */
    function carta(cardId, visual = null) {
        const original = B.carta(cardId);
        const daArte = visual?.arte && !visual.arte.includes('/') ? B.carta(visual.arte) : null;
        const def = visual ? { ...original, raridade: visual.raridade || original.raridade,
            arte: daArte?.arte || visual.arte || original.arte, foco: daArte?.foco || original.foco } : original;
        const r = B.raridade(def.raridade);
        const card = el('article', `carta-tcg carta-tcg--${def.raridade}${def.tipo === 'campo' ? ' carta-tcg--campo' : ''}${def.tipo === 'resenha' ? ' carta-tcg--resenha' : ''}`);
        card.dataset.carta = def.id;
        const nome = visual?.nome || nomeVisivel(def);
        card.setAttribute('aria-label', `${nome}: carta ${def.numero} de ${B.CARTAS.length}, ${r.nome}.`);

        const topo = el('div', 'carta-tcg-topo');
        topo.append(el('span', `carta-tcg-nome${nome.length > 13 ? ' carta-tcg-nome--longo' : ''}`, nome), el('span', 'carta-tcg-numero', `#${pad(def.numero)}`));

        const arte = el('div', 'carta-tcg-arte');
        const img = el('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = window.siteImageUrl ? window.siteImageUrl(def.arte) : def.arte;
        img.style.objectPosition = def.foco || '50% 20%';
        arte.appendChild(img);
        if (censurada(def)) {
            card.classList.add('carta-tcg--censurada');
            arte.appendChild(tarja());
        }

        const moldura = el('div', 'carta-tcg-moldura');
        moldura.append(topo, arte, el('p', 'carta-tcg-faixa', `${ESTRELAS[def.raridade]} ${r.nome}${TIPOS[def.tipo] ? ` · ${TIPOS[def.tipo]}` : ''}`),
            el('p', 'carta-tcg-frase', `(${def.frase})`));
        card.append(moldura, el('div', 'carta-tcg-foil'), el('div', 'carta-tcg-brilho'));
        if (def.raridade === 'epico' || def.raridade === 'lendario') seguirMouse(card);
        return card;
    }

    /** Costas da carta (virada para baixo, ou vaga vazia do fichário). */
    function verso(texto = '?') {
        const costas = el('div', 'carta-tcg carta-tcg--verso');
        costas.setAttribute('aria-hidden', 'true');
        const miolo = el('div', 'carta-tcg-verso');
        miolo.append(el('span', 'carta-tcg-verso-marca', 'Baralho Enzo'), el('span', 'carta-tcg-verso-selo', texto));
        costas.appendChild(miolo);
        return costas;
    }

    /** Pontas serrilhadas do pacote (clip-path), como a embalagem de um booster. */
    const SERRILHA = (() => {
        const dentes = 18;
        const alto = 1.8;
        const topo = [];
        const baixo = [];
        for (let i = 0; i <= dentes; i++) {
            const x = ((i / dentes) * 100).toFixed(2);
            topo.push(`${x}% ${i % 2 ? alto : 0}%`);
            baixo.unshift(`${x}% ${i % 2 ? 100 - alto : 100}%`);
        }
        return `polygon(${[...topo, ...baixo].join(', ')})`;
    })();

    /** Desenho do pacote: embalagem serrilhada com um leque de 3 cartas na capa e o rótulo. */
    function pacoteArte(tipo) {
        const p = B.pacote(tipo);
        const arte = el('div', `pacote-tcg pacote-tcg--${p.id}`);
        arte.setAttribute('aria-hidden', 'true');
        const [cor, destaque, escuro] = p.cores || ['#6b7880', '#ffcc00', '#15191c'];
        arte.style.setProperty('--pacote-cor', cor);
        arte.style.setProperty('--pacote-destaque', destaque);
        arte.style.setProperty('--pacote-escuro', escuro);

        const corpo = el('div', 'pacote-tcg-corpo');
        corpo.style.clipPath = SERRILHA;
        const leque = el('div', 'pacote-tcg-leque');
        (p.capa || []).forEach((cardId, i) => {
            const capa = carta(cardId);
            const posicao = i - 1;   // -1, 0, 1: esquerda, meio, direita
            capa.classList.add('pacote-tcg-capa');
            capa.style.setProperty('--i', posicao);
            capa.style.setProperty('--y', Math.abs(posicao));
            capa.style.zIndex = posicao === 0 ? 2 : 1;
            leque.appendChild(capa);
        });
        const rotulo = el('div', 'pacote-tcg-rotulo');
        rotulo.append(el('span', 'pacote-tcg-nome', p.nome.replace(/^Pacote d[aoe] /, '')),
            el('span', 'pacote-tcg-cartas', `${p.cartas} cartas`));
        corpo.append(el('span', 'pacote-tcg-sobre', 'Baralho Enzo'), leque, rotulo, el('span', 'pacote-tcg-brilho'));
        arte.appendChild(corpo);
        return arte;
    }

    // ------------------------------------------------------------ "juice" (à la Balatro)
    // Tudo que está na mesa balança devagar (cada um no seu tempo) e, com o mouse
    // em cima, inclina em 3D com uma mola que passa do ponto e volta.
    const fase = () => `${(-Math.random() * 4).toFixed(2)}s`;

    /** Embrulha `conteudo` em balanço + inclinação. Devolve { raiz, mola }. */
    function vivo(conteudo, { forca = 12 } = {}) {
        const raiz = el('div', 'juice-balanca');
        raiz.style.setProperty('--fase', fase());
        const inclina = el('div', 'juice-inclina');
        inclina.appendChild(conteudo);
        raiz.appendChild(inclina);
        return { raiz, mola: mola(inclina, raiz, forca) };
    }

    /** Mola amortecida para rotateX/rotateY/escala/giro de `alvo`; o ponteiro é lido em `zona`. */
    function mola(alvo, zona, forca) {
        const atual = { rx: 0, ry: 0, rz: 0, s: 1 };
        const veloc = { rx: 0, ry: 0, rz: 0, s: 0 };
        const meta = { rx: 0, ry: 0, rz: 0, s: 1 };
        let quadro = null;
        const passo = () => {
            let parado = true;
            for (const k of Object.keys(atual)) {
                veloc[k] = (veloc[k] + (meta[k] - atual[k]) * 0.14) * 0.74;
                atual[k] += veloc[k];
                if (Math.abs(meta[k] - atual[k]) + Math.abs(veloc[k]) > 0.002) parado = false;
            }
            alvo.style.transform = `rotateX(${atual.rx.toFixed(2)}deg) rotateY(${atual.ry.toFixed(2)}deg) rotate(${atual.rz.toFixed(2)}deg) scale(${atual.s.toFixed(3)})`;
            quadro = parado ? null : requestAnimationFrame(passo);
        };
        const mexer = () => { if (!quadro) quadro = requestAnimationFrame(passo); };
        if (!semMovimento()) {
            ZONAS.add(zona);
            zona.addEventListener('pointermove', (evento) => {
                const r = zona.getBoundingClientRect();
                const nx = Math.max(-1, Math.min(1, ((evento.clientX - r.left) / r.width) * 2 - 1));
                const ny = Math.max(-1, Math.min(1, ((evento.clientY - r.top) / r.height) * 2 - 1));
                meta.ry = nx * forca;
                meta.rx = -ny * forca;
                meta.s = 1.07;
                // O brilho da carta sob o ponteiro sai da mesma medida (um rect por evento).
                const carta = evento.target?.closest?.('.carta-tcg');
                if (carta) {
                    carta.style.setProperty('--mx', `${(((evento.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
                    carta.style.setProperty('--my', `${(((evento.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
                }
                mexer();
            });
            zona.addEventListener('pointerleave', () => { meta.rx = 0; meta.ry = 0; meta.s = 1; mexer(); });
        }
        return {
            /** Tranco: pulo de escala e uma chacoalhada (revelar carta, comprar...). */
            tranco(escala = 0.05, giro = 3) {
                if (semMovimento()) return;
                veloc.s += escala;
                veloc.rz += (Math.random() < 0.5 ? -1 : 1) * giro;
                mexer();
            },
        };
    }

    /** Fundo de tinta rodando (redemoinho pixelado, como o do Balatro) nas cores do pacote. */
    function redemoinho(canvas, cores) {
        const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
        if (!gl) return null;
        const vertice = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
        const fragmento = `
            precision mediump float;
            uniform vec2 r; uniform float t; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * r) / length(r);
                float d = length(uv);
                float a = atan(uv.y, uv.x) + t * 0.12 - d * 4.0;
                uv = vec2(cos(a), sin(a)) * d * 28.0;
                vec2 u2 = uv;
                float v = t * 0.8;
                for (int i = 0; i < 5; i++) {
                    u2 += sin(max(uv.x, uv.y)) + uv;
                    uv += 0.5 * vec2(cos(5.1123 + 0.353 * u2.y + v * 0.131), sin(u2.x - 0.113 * v));
                    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
                }
                float tinta = min(2.0, max(0.0, length(uv) * 0.035 * 1.4));
                float p1 = max(0.0, 1.0 - 1.4 * abs(1.0 - tinta));
                float p2 = max(0.0, 1.0 - 1.4 * abs(tinta));
                float p3 = 1.0 - min(1.0, p1 + p2);
                vec3 cor = c1 * p1 + c2 * p2 + c3 * p3;
                gl_FragColor = vec4(mix(c3, cor, 0.8), 1.0);
            }`;
        const compilar = (tipo, fonte) => {
            const s = gl.createShader(tipo);
            gl.shaderSource(s, fonte);
            gl.compileShader(s);
            return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
        };
        const vs = compilar(gl.VERTEX_SHADER, vertice);
        const fs = compilar(gl.FRAGMENT_SHADER, fragmento);
        if (!vs || !fs) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        const u = (nome) => gl.getUniformLocation(prog, nome);
        const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
        [u('c1'), u('c2'), u('c3')].forEach((loc, i) => gl.uniform3fv(loc, rgb(cores[i])));

        // Resolução baixa de propósito: fica pixelado (e leve) quando o CSS estica.
        const PIXEL = 4;
        const medir = () => {
            canvas.width = Math.max(1, Math.round(innerWidth / PIXEL));
            canvas.height = Math.max(1, Math.round(innerHeight / PIXEL));
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(u('r'), canvas.width, canvas.height);
        };
        medir();
        addEventListener('resize', medir);
        const inicio = performance.now();
        let quadro = null;
        const desenhar = (agora) => {
            gl.uniform1f(u('t'), (agora - inicio) / 1000 + 20);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (!semMovimento()) quadro = requestAnimationFrame(desenhar);
        };
        quadro = requestAnimationFrame(desenhar);
        return {
            parar() {
                cancelAnimationFrame(quadro);
                removeEventListener('resize', medir);
                gl.getExtension('WEBGL_lose_context')?.loseContext();
            },
        };
    }

    /** Estouro de papel picado saindo do centro de `palco`. */
    function confete(palco, cores, n = 26) {
        if (semMovimento()) return;
        for (let i = 0; i < n; i++) {
            const peca = el('span', 'abertura-confete');
            const angulo = (i / n) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 140 + Math.random() * 220;
            peca.style.setProperty('--dx', `${(Math.cos(angulo) * dist).toFixed(0)}px`);
            peca.style.setProperty('--dy', `${(Math.sin(angulo) * dist).toFixed(0)}px`);
            peca.style.setProperty('--giro', `${Math.round(Math.random() * 720 - 360)}deg`);
            peca.style.setProperty('--tam', `${6 + Math.round(Math.random() * 8)}px`);
            peca.style.background = cores[i % cores.length];
            palco.appendChild(peca);
            setTimeout(() => peca.remove(), 1100);
        }
    }

    // ------------------------------------------------------------ aba Baralho
    let dados = null;
    let area = null;
    let aviso = null;

    function quadro(classe, recordatorio, ...conteudo) {
        const secao = el('section', `quadro ${classe}`);
        secao.appendChild(el('p', 'quadro-recordatorio', recordatorio));
        secao.append(...conteudo);
        return secao;
    }

    /** Botão perigoso: o 1º clique pede "certeza?", o 2º (em até 4 s) confirma. */
    function comConfirmacao(b, pergunta, acao) {
        const rotulo = [...b.childNodes];
        let timer = null;
        b.addEventListener('click', () => {
            if (!timer) {
                b.textContent = pergunta;
                b.classList.add('baralho-botao--certeza');
                timer = setTimeout(() => { timer = null; b.replaceChildren(...rotulo); b.classList.remove('baralho-botao--certeza'); }, CONFIRMAR_MS);
                return;
            }
            clearTimeout(timer);
            timer = null;
            acao();
        });
    }

    /**
     * Aviso na faixa do topo. Já mostra a mensagem sem redesenhar os quadros;
     * no erro a aba inteira é redesenhada (a tela pode ter mudado no servidor).
     */
    function avisar(texto, tipo = 'ok') {
        aviso = { texto, tipo };
        mostrarAviso();
        if (tipo === 'erro') desenhar();
    }

    /** Mostra (ou tira) a faixa de aviso sem tocar nos quadros. */
    function mostrarAviso() {
        const grade = area?.querySelector('.baralho-grade');
        if (!grade) return;
        const velha = grade.querySelector('.baralho-aviso');
        if (!aviso) { velha?.remove(); return; }
        const faixa = velha || el('p', 'baralho-aviso');
        faixa.className = `baralho-aviso baralho-aviso--${aviso.tipo}`;
        faixa.textContent = aviso.texto;
        faixa.setAttribute('role', aviso.tipo === 'erro' ? 'alert' : 'status');
        grade.prepend(faixa);
    }

    /** Os números da carteira, sem recriar o quadro. */
    function atualizarCarteira() {
        for (const moeda of ['creditos', 'po']) {
            const alvo = area?.querySelector(`.baralho-moeda--${moeda} .ficha-estouro`);
            if (alvo) alvo.textContent = numero(dados.carteira[moeda]);
        }
    }

    /** Troca só um quadro da aba pelo recém-desenhado. */
    function trocarQuadro(seletor, novo) {
        const velho = area?.querySelector(seletor);
        if (velho) velho.replaceWith(novo);
    }

    function quadroCarteira() {
        const saldo = el('div', 'baralho-saldo');
        const moeda = (classe, valor, rotulo) => {
            const item = el('div', `baralho-moeda ${classe}`);
            item.append(el('strong', 'ficha-estouro', numero(valor)), el('span', 'baralho-moeda-rotulo', rotulo));
            return item;
        };
        saldo.append(moeda('baralho-moeda--creditos', dados.carteira.creditos, 'créditos'),
            moeda('baralho-moeda--po', dados.carteira.po, 'pó de estrela'));
        const regras = Object.entries(B.CREDITOS_POR_PONTO)
            .map(([jogo, fator]) => `${NOMES_JOGOS[jogo] || jogo}: ${fator === 1 ? '1 crédito' : `${fator} créditos`} por ponto`);
        const bt = B.CREDITOS_BATALHA;
        regras.push(`Batalha online: ${bt.online.vitoria} se ganhar, ${bt.online.derrota} se perder`,
            `contra o NPC: ${bt.npc.vitoria} / ${bt.npc.derrota}`);
        const conteudo = [saldo,
            el('p', 'quadro-texto', 'Jogue para ganhar créditos!'),
            el('p', 'baralho-regras', regras.join(' · '))];
        // Sequência do pacote do dia: vale se a última entrada foi hoje ou ontem (Brasília).
        const d = dados.diario;
        if (d?.sequencia > 0 && (d.dia === diaBrasilia() || d.dia === diaBrasilia(Date.now() - DIA_MS))) {
            conteudo.push(el('p', 'baralho-sequencia-texto', `🔥 ${d.sequencia} dias seguidos`));
        }
        return quadro('quadro--carteira', 'Carteira', ...conteudo);
    }

    function quadroLoja() {
        const lista = el('ul', 'baralho-loja');
        for (const p of B.PACOTES) {
            const item = el('li', 'baralho-produto');
            const info = el('div', 'baralho-produto-info');
            info.append(el('strong', 'baralho-produto-nome', p.nome));
            const chances = B.RARIDADES.map((r) => `${r.nome} ${p.chances[r.id]}%`).join(' · ');
            info.append(el('span', 'baralho-produto-chances', `${p.cartas} cartas · ${chances}`));
            if (p.garantia) info.append(el('span', 'baralho-produto-garantia', `Garantia: 1 ${B.raridade(p.garantia).nome.toLowerCase()} ou melhor`));
            const acoes = el('div', 'baralho-produto-acoes');
            for (const moeda of ['creditos', 'po']) {
                const preco = p.preco[moeda];
                if (!preco) continue;
                const b = botao(`baralho-botao baralho-botao--${moeda}`, `${numero(preco)} ${moeda === 'po' ? 'pó' : 'créditos'}`);
                const falta = preco - dados.carteira[moeda];
                if (falta > 0) {
                    b.disabled = true;
                    b.title = `Faltam ${numero(falta)} ${moeda === 'po' ? 'de pó' : 'créditos'}`;
                }
                b.setAttribute('aria-label', `Comprar ${p.nome} por ${numero(preco)} ${moeda === 'po' ? 'de pó de estrela' : 'créditos'}`);
                b.addEventListener('click', () => comprar(p, moeda, b));
                acoes.appendChild(b);
            }
            info.appendChild(acoes);
            item.append(vivo(pacoteArte(p.id), { forca: 14 }).raiz, info);
            lista.appendChild(item);
        }
        return quadro('quadro--loja', 'Banca de pacotes', lista);
    }

    function quadroInventario() {
        const total = dados.pacotes.length;
        const porTipo = new Map();
        for (const p of dados.pacotes) {
            if (!B.pacote(p.tipo)) continue;
            if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, []);
            porTipo.get(p.tipo).push(p.id);
        }
        const conteudo = [];
        if (!porTipo.size) {
            conteudo.push(el('p', 'quadro-texto', 'Nenhum pacote fechado.'),
                el('p', 'baralho-regras', 'Compre um na banca aqui embaixo.'));
        } else {
            const lista = el('ul', 'baralho-inventario');
            for (const def of B.PACOTES) {
                const ids = porTipo.get(def.id);
                if (!ids) continue;
                const item = el('li', 'baralho-item');
                const info = el('div', 'baralho-item-info');
                info.append(el('strong', 'baralho-item-nome', def.nome), el('span', 'baralho-item-qtd', `× ${ids.length}`));
                const acoes = el('div', 'baralho-produto-acoes');
                const abrirUm = botao('baralho-botao baralho-botao--abrir', 'Abrir');
                abrirUm.addEventListener('click', () => abrir(ids.slice(0, 1), abrirUm));
                acoes.appendChild(abrirUm);
                if (ids.length > 1) {
                    const n = Math.min(ids.length, B.MAX_POR_VEZ);
                    const abrirVarios = botao('baralho-botao baralho-botao--abrir', `Abrir ${n}`);
                    abrirVarios.addEventListener('click', () => abrir(ids.slice(0, n), abrirVarios));
                    acoes.appendChild(abrirVarios);
                }
                info.appendChild(acoes);
                item.append(vivo(pacoteArte(def.id), { forca: 18 }).raiz, info);
                lista.appendChild(item);
            }
            conteudo.push(lista);
        }
        return quadro('quadro--inventario', `Pacotes fechados · ${total}`, ...conteudo);
    }

    /** Escolher quantas repetidas de uma carta viram pó (sempre sobra 1). */
    function escolherPo(celula, def, qtd) {
        const max = qtd - 1;
        const valor = B.valorPo(def.id);
        let n = max;
        const painel = el('div', 'fichario-po');
        const menos = botao('fichario-po-passo', '−');
        const mais = botao('fichario-po-passo', '+');
        const conta = el('output', 'fichario-po-conta');
        const ok = botao('baralho-botao baralho-botao--po', '');
        const cancelar = botao('fichario-po-cancelar', '×');
        menos.setAttribute('aria-label', 'Uma a menos');
        mais.setAttribute('aria-label', 'Uma a mais');
        cancelar.setAttribute('aria-label', 'Cancelar');
        const atualizar = () => {
            conta.textContent = String(n);
            ok.textContent = `Virar pó +${numero(n * valor)}`;
            menos.disabled = n <= 1;
            mais.disabled = n >= max;
        };
        menos.addEventListener('click', () => { n = Math.max(1, n - 1); atualizar(); });
        mais.addEventListener('click', () => { n = Math.min(max, n + 1); atualizar(); });
        ok.addEventListener('click', () => transformar({ cartas: { [def.id]: n } }, ok));
        cancelar.addEventListener('click', desenhar);
        const passos = el('div', 'fichario-po-passos');
        passos.append(menos, conta, mais, cancelar);
        painel.append(passos, ok);
        atualizar();
        celula.querySelector('.fichario-acao')?.replaceWith(painel);
        ok.focus();
    }

    function quadroFichario() {
        const grade = el('ol', 'fichario');
        let poTotal = 0;
        for (const def of B.CARTAS) {
            const qtd = dados.colecao[def.id] || 0;
            const celula = el('li', `fichario-vaga${qtd ? '' : ' fichario-vaga--falta'}`);
            if (!qtd) {
                celula.append(verso(`#${pad(def.numero)}`), el('span', 'fichario-rotulo', '???'));
                celula.title = `Carta nº ${def.numero}: ainda não saiu`;
                grade.appendChild(celula);
                continue;
            }
            const abrirGrande = botao('fichario-carta');
            abrirGrande.setAttribute('aria-label', `${nomeVisivel(def)} (${B.raridade(def.raridade).nome}), você tem ${qtd}. Ver carta grande`);
            // Balança na página e inclina em 3D com o mouse (mesma mola da abertura).
            abrirGrande.appendChild(vivo(carta(def.id), { forca: 14 }).raiz);
            abrirGrande.addEventListener('click', () => verCarta(def.id, qtd));
            celula.appendChild(abrirGrande);
            if (qtd > 1) {
                celula.appendChild(el('span', 'fichario-qtd', `×${qtd}`));
                poTotal += (qtd - 1) * B.valorPo(def.id);
                const acao = botao('fichario-acao', ` Repetidas: ${qtd - 1}`);
                acao.prepend(icone('po-de-estrela', '✨'));
                acao.setAttribute('aria-label', `Transformar repetidas de ${nomeVisivel(def)} em pó de estrela`);
                acao.addEventListener('click', () => escolherPo(celula, def, qtd));
                celula.appendChild(acao);
            }
            grade.appendChild(celula);
        }
        const conteudo = [];
        if (poTotal > 0) {
            const todas = botao('baralho-botao baralho-botao--po fichario-todas', ` Transformar todas as repetidas (+${numero(poTotal)} pó)`);
            todas.prepend(icone('po-de-estrela', '✨'));
            comConfirmacao(todas, `Certeza? Fica 1 de cada · +${numero(poTotal)} pó`, () => transformar({ todas: true }, todas));
            conteudo.push(todas);
        }
        conteudo.push(el('p', 'baralho-regras',
            `Repetida vira pó de estrela: ${B.RARIDADES.map((r) => `${r.nome.toLowerCase()} ${r.po}`).join(' · ')}.`));
        return quadro('quadro--fichario', `Fichário · ${dados.diferentes}/${dados.total}`, grade, ...conteudo);
    }

    function desenhar() {
        if (!area || !dados) return;
        const grade = el('div', 'baralho-grade');
        // Atalho para a Batalha (.baralho-batalha) escondido até a liberação: a entrada por
        // enquanto é só a porta secreta do nº 99 dos Enzos secretos (js/auth-widget.js).
        grade.append(quadroCarteira(), quadroInventario(), quadroLoja(), quadroFichario());
        area.replaceChildren(grade);
        mostrarAviso();
    }

    async function carregar() {
        area.replaceChildren(el('p', 'quadro-texto baralho-carregando', 'Embaralhando...'));
        const { ok, dados: resposta } = await pedir('/api/baralho');
        if (!area?.isConnected) return;
        if (!ok) {
            area.replaceChildren(el('p', 'quadro-texto baralho-carregando', resposta?.error ? `Não deu para abrir o baralho: ${resposta.error}.` : 'Não deu para abrir o baralho agora.'));
            return;
        }
        dados = resposta;
        aviso = resposta.boasVindas
            ? { texto: 'Presente de boas-vindas: 1 de cada pacote no seu inventário!', tipo: 'ok' }
            : null;
        desenhar();
    }

    function aba() {
        area = el('div', 'baralho');
        aviso = null;
        carregar();
        return area;
    }

    // ------------------------------------------------------------ ações
    async function comprar(p, moeda, b) {
        b.disabled = true;
        const { ok, dados: resposta } = await pedir('/api/baralho/comprar', { tipo: p.id, moeda });
        if (!ok) { avisar(resposta?.error ? `Não comprou: ${resposta.error}.` : 'Não deu para comprar agora.', 'erro'); return; }
        dados = resposta;
        atualizarCarteira();
        trocarQuadro('.quadro--inventario', quadroInventario());
        trocarQuadro('.quadro--loja', quadroLoja());
        avisar(`${p.nome} foi para o inventário!`);
    }

    async function transformar(corpo, b) {
        b.disabled = true;
        const { ok, dados: resposta } = await pedir('/api/baralho/po', corpo);
        if (!ok) { avisar(resposta?.error ? `Não transformou: ${resposta.error}.` : 'Não deu para transformar agora.', 'erro'); return; }
        dados = resposta;
        atualizarCarteira();
        trocarQuadro('.quadro--fichario', quadroFichario());
        trocarQuadro('.quadro--loja', quadroLoja());
        avisar(`+${numero(resposta.ganhou)} de pó de estrela (${resposta.cartas} ${resposta.cartas === 1 ? 'carta' : 'cartas'}).`);
    }

    async function abrir(ids, b) {
        b.disabled = true;
        const { ok, dados: resposta } = await pedir('/api/baralho/abrir', { pacotes: ids });
        if (!ok) { avisar(resposta?.error ? `Não abriu: ${resposta.error}.` : 'Não deu para abrir agora.', 'erro'); return; }
        dados = resposta;
        aviso = null;
        window.EnzoConta?.fecharFicha?.();
        abertura(resposta.abertos, resposta.colecao);
    }

    // ------------------------------------------------------------ carta grande
    function verCarta(cardId, qtd) {
        const def = B.carta(cardId);
        const janela = el('dialog', 'carta-zoom');
        janela.setAttribute('aria-label', nomeVisivel(def));
        const fechar = botao('pagina-fechar', '×');
        fechar.setAttribute('aria-label', 'Fechar a carta');
        fechar.addEventListener('click', () => janela.close());
        const legenda = el('p', 'carta-zoom-legenda', `Você tem ${qtd} ${qtd === 1 ? 'cópia' : 'cópias'}`);
        // Carta grande "viva": inclina em 3D seguindo o mouse (ou o dedo) e dá um tranco ao abrir.
        const { raiz, mola: m } = vivo(carta(cardId), { forca: 20 });
        const descricao = el('div', 'carta-zoom-descricao');
        descricao.append(el('p', 'carta-zoom-frase', `(${def.frase})`));
        if (def.tcg) descricao.append(el('p', 'carta-zoom-tcg', def.tcg));
        janela.append(fechar, raiz, descricao, legenda);
        janela.addEventListener('click', (evento) => { if (evento.target === janela) janela.close(); });
        janela.addEventListener('close', () => janela.remove());
        document.body.appendChild(janela);
        janela.showModal();
        fechar.focus();
        m.tranco(0.08, 6);
    }

    // ------------------------------------------------------------ abertura em tela cheia
    /**
     * Toca os pacotes abertos um por um, no estilo Balatro: fundo de tinta
     * rodando, pacote balançando → aperta e estoura em confete → pilha de cartas
     * (da mais comum à mais rara) que a pessoa arrasta para o lado, uma a uma →
     * todas lado a lado no fim.
     * `colecao` é a coleção DEPOIS de abrir: dá o "REPETIDA ×N" certo de cada cópia.
     * `opcoes.visitante` (nº de cartas) = abriu sem login: ao fechar, oferece salvar na conta.
     */
    function abertura(abertos, colecao, opcoes = {}) {
        if (!abertos?.length) return;
        // antes = cópias na coleção agora − cópias que saíram neste lote.
        const antes = {};
        for (const p of abertos) for (const c of p.cartas) antes[c.id] = (antes[c.id] ?? colecao[c.id] ?? 0) - 1;
        for (const p of abertos) for (const c of p.cartas) c.copia = (antes[c.id] += 1);

        const tela = el('dialog', 'abertura');
        tela.setAttribute('aria-label', 'Abrindo pacotes do Baralho Enzo');
        const tinta = el('canvas', 'abertura-tinta');
        tinta.setAttribute('aria-hidden', 'true');
        const fechar = botao('pagina-fechar abertura-fechar', '×');
        fechar.setAttribute('aria-label', 'Fechar e voltar ao baralho');
        fechar.addEventListener('click', () => tela.close());
        const titulo = el('h2', 'abertura-titulo');
        const contador = el('p', 'abertura-contador');
        const palco = el('div', 'abertura-palco');
        const rodape = el('div', 'abertura-rodape');
        const topo = el('header', 'abertura-topo');
        topo.append(el('span'), titulo, fechar);
        tela.append(tinta, el('div', 'abertura-vinheta'), topo, contador, palco, rodape);
        let fundo = null;
        tela.addEventListener('close', () => {
            fundo?.parar();
            tela.remove();
            // Sem login não adianta reabrir a Ficha (exige conta): oferece salvar as cartas.
            if (opcoes.visitante) caixaSalvar(opcoes.visitante);
            else window.EnzoConta?.abrirFicha?.('baralho');
        });
        document.body.appendChild(tela);
        tela.showModal();

        let atual = 0;
        let coresAtuais = null;
        const pintarFundo = (cores) => {
            if (coresAtuais === cores) return;
            coresAtuais = cores;
            fundo?.parar();
            tela.style.setProperty('--tinta-a', cores[0]);
            tela.style.setProperty('--tinta-b', cores[2]);
            fundo = redemoinho(tinta, cores);
        };
        const tremer = () => {
            if (semMovimento()) return;
            palco.animate([
                { transform: 'translate(0, 0)' }, { transform: 'translate(-7px, 5px)' },
                { transform: 'translate(6px, -4px)' }, { transform: 'translate(-3px, 2px)' }, { transform: 'translate(0, 0)' },
            ], { duration: 280, easing: 'ease-out' });
        };

        function mostrarPacote() {
            const p = abertos[atual];
            const def = B.pacote(p.tipo);
            const cores = def?.cores || ['#e65100', '#ff9900', '#1b1b1b'];
            pintarFundo(cores);
            titulo.textContent = def?.nome || 'Pacote';
            contador.textContent = abertos.length > 1 ? `Pacote ${atual + 1} de ${abertos.length}` : '';
            rodape.replaceChildren();
            if (semMovimento()) { mostrarCartas(p); return; }

            const embrulho = botao('abertura-pacote');
            embrulho.setAttribute('aria-label', `Abrir o ${def?.nome || 'pacote'}`);
            const { raiz, mola: molaPacote } = vivo(pacoteArte(p.tipo), { forca: 16 });
            embrulho.appendChild(raiz);
            const dica = el('p', 'abertura-dica', 'Clique no pacote para abrir!');
            palco.replaceChildren(embrulho, dica);
            embrulho.focus();

            // Abrir de uma vez: o pacote brilha branco, explode num clarão e já mostra
            // todas as cartas viradas (a mesa final), sem a pilha.
            const deUmaVez = botao('baralho-botao', 'Abrir de uma vez ⚡');
            deUmaVez.setAttribute('aria-label', 'Abrir de uma vez e ver todas as cartas');
            rodape.replaceChildren(deUmaVez);
            deUmaVez.addEventListener('click', async () => {
                if (embrulho.disabled) return;
                embrulho.disabled = true;
                deUmaVez.disabled = true;
                dica.remove();
                molaPacote.tranco(0.05, 6);
                embrulho.classList.add('abertura-pacote--brilhando');
                await esperar(700);
                const clarao = el('div', 'abertura-clarao');
                clarao.setAttribute('aria-hidden', 'true');
                tela.appendChild(clarao);
                clarao.addEventListener('animationend', () => clarao.remove(), { once: true });
                confete(palco, ['#ffffff', cores[1], '#fff5d1', cores[0]], 40);
                tremer();
                embrulho.classList.add('abertura-pacote--estourou');
                await esperar(220);
                mesaFinal(p);
            }, { once: true });

            embrulho.addEventListener('click', async () => {
                if (embrulho.disabled) return;
                embrulho.disabled = true;
                deUmaVez.remove();
                dica.remove();
                // Aperta (estica e amassa, tremendo cada vez mais)...
                molaPacote.tranco(0.06, 4);
                embrulho.classList.add('abertura-pacote--apertando');
                await esperar(650);
                // ...e estoura em papel picado.
                confete(palco, [cores[1], cores[0], '#fff5d1', '#111111']);
                tremer();
                embrulho.classList.add('abertura-pacote--estourou');
                await esperar(260);
                mostrarCartas(p);
            }, { once: true });
        }

        function faceDaCarta(c) {
            const frente = el('div', 'abertura-face abertura-face--frente');
            frente.appendChild(carta(c.id));
            frente.appendChild(c.nova
                ? el('span', 'abertura-selo abertura-selo--nova', 'Nova!')
                : el('span', 'abertura-selo abertura-selo--repetida', `Repetida ×${c.copia}`));
            return frente;
        }

        /** Carta com as duas faces (costas e frente) dentro do balanço + mola. */
        function cartaComFaces(c, virada) {
            const slot = el('div', `abertura-carta abertura-carta--${c.raridade}${virada ? ' abertura-carta--virada' : ''}`);
            const miolo = el('div', 'abertura-carta-miolo');
            const costas = el('div', 'abertura-face abertura-face--verso');
            costas.appendChild(verso());
            miolo.append(costas, faceDaCarta(c));
            const { raiz, mola: m } = vivo(miolo);
            raiz.prepend(el('span', 'abertura-sombra'));
            slot.appendChild(raiz);
            slot.mola = m;
            return slot;
        }

        const rotuloDaCarta = (c) => {
            const def = B.carta(c.id);
            return `${nomeVisivel(def)}, ${B.raridade(def.raridade).nome}${c.nova ? ', nova!' : `, repetida ×${c.copia}`}`;
        };

        /** Efeito de quando a carta aparece: tranco, raios (épico/lendário) e clarão (lendário). */
        function comemorar(slot, c) {
            const forte = { lendario: 0.09, epico: 0.07, raro: 0.055 }[c.raridade] || 0.045;
            slot.mola.tranco(forte, forte * 55);
            if (c.raridade === 'lendario' || c.raridade === 'epico') {
                slot.prepend(el('span', 'abertura-raio'));
                if (c.raridade === 'lendario') {
                    tela.classList.remove('abertura--flash');
                    void tela.offsetWidth;   // reinicia a animação do clarão
                    tela.classList.add('abertura--flash');
                    tremer();
                }
            }
        }

        /**
         * Pilha: da carta mais comum (em cima) para a mais rara (embaixo). A de
         * cima vira sozinha; arrastar para o lado (ou Enter/setas) joga ela fora e
         * revela a próxima. Épico e lendário brilham ainda de costas antes de virar.
         */
        function mostrarCartas(p) {
            const ordem = [...p.cartas].sort((a, b) => B.nivel(a.raridade) - B.nivel(b.raridade));
            const area = el('div', 'abertura-pilha-area');
            const pilha = el('div', 'abertura-pilha');
            const conta = el('p', 'abertura-pilha-conta');
            conta.setAttribute('aria-live', 'polite');
            const dica = el('p', 'abertura-dica abertura-dica--arrastar', '⟵ Arraste para o lado ⟶');
            const slots = ordem.map((c) => cartaComFaces(c, false));
            // A primeira da lista fica por cima (última no DOM).
            for (const slot of [...slots].reverse()) pilha.appendChild(slot);
            area.append(pilha, conta, dica);
            palco.replaceChildren(area);

            let i = 0;
            let pronta = false;   // só arrasta depois que a carta de cima virou

            const arrumar = () => slots.forEach((slot, n) => slot.style.setProperty('--d', Math.max(0, n - i)));
            arrumar();
            if (!semMovimento()) {
                pilha.animate([{ transform: 'scale(0.4) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
                    { duration: 480, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
            }

            const revelarTopo = async () => {
                const slot = slots[i];
                const c = ordem[i];
                pronta = false;
                slot.classList.add('abertura-carta--topo');
                conta.textContent = `Carta ${i + 1} de ${ordem.length}`;
                const suspense = c.raridade === 'lendario' ? 900 : c.raridade === 'epico' ? 650 : 180;
                if (!semMovimento()) await esperar(i === 0 ? 420 : suspense);
                if (!slot.isConnected) return;
                slot.classList.add('abertura-carta--virada');
                slot.setAttribute('role', 'button');
                slot.tabIndex = 0;
                slot.setAttribute('aria-label', `Carta ${i + 1} de ${ordem.length}: ${rotuloDaCarta(c)}. ${i < ordem.length - 1 ? 'Arraste para o lado ou aperte Enter para a próxima.' : 'Arraste ou aperte Enter para ver todas.'}`);
                slot.focus({ preventScroll: true });
                if (!semMovimento()) await esperar(260);
                comemorar(slot, c);
                pronta = true;
            };

            const jogar = async (direcao) => {
                if (!pronta) return;
                pronta = false;
                const slot = slots[i];
                dica.classList.add('abertura-dica--sumiu');
                if (!semMovimento()) {
                    const atual = getComputedStyle(slot).transform;
                    await slot.animate([
                        { transform: atual === 'none' ? 'none' : atual },
                        { transform: `translate(${direcao * Math.max(innerWidth, 600)}px, -60px) rotate(${direcao * 38}deg)`, opacity: 0.2 },
                    ], { duration: 380, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'forwards' }).finished.catch(() => {});
                }
                slot.remove();
                i += 1;
                if (i < ordem.length) { arrumar(); revelarTopo(); } else mesaFinal(p);
            };

            // Arrastar com mouse ou dedo (a pilha não rola a página para os lados).
            pilha.addEventListener('pointerdown', (evento) => {
                const slot = slots[i];
                if (!pronta || !slot?.contains(evento.target)) return;
                const x0 = evento.clientX;
                const t0 = performance.now();
                let dx = 0;
                slot.setPointerCapture(evento.pointerId);
                slot.classList.add('abertura-carta--arrastando');
                const mover = (e) => {
                    dx = e.clientX - x0;
                    slot.style.transform = `translate(${dx}px, ${-Math.abs(dx) * 0.06}px) rotate(${dx * 0.06}deg)`;
                };
                const soltar = () => {
                    slot.removeEventListener('pointermove', mover);
                    slot.removeEventListener('pointerup', soltar);
                    slot.removeEventListener('pointercancel', soltar);
                    slot.classList.remove('abertura-carta--arrastando');
                    const velocidade = Math.abs(dx) / Math.max(1, performance.now() - t0);
                    if (Math.abs(dx) > slot.offsetWidth * 0.3 || (Math.abs(dx) > 24 && velocidade > 0.6)) {
                        jogar(Math.sign(dx) || 1);
                    } else {
                        // Volta para a pilha com mola.
                        const atual = slot.style.transform;
                        slot.style.transform = '';
                        if (atual && !semMovimento()) {
                            slot.animate([{ transform: atual }, { transform: 'translate(0, -6px) rotate(-1deg)', offset: 0.6 }, { transform: 'none' }],
                                { duration: 320, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
                        }
                    }
                };
                slot.addEventListener('pointermove', mover);
                slot.addEventListener('pointerup', soltar);
                slot.addEventListener('pointercancel', soltar);
            });
            pilha.addEventListener('keydown', (evento) => {
                if (['Enter', ' ', 'ArrowRight'].includes(evento.key)) { evento.preventDefault(); jogar(1); }
                if (evento.key === 'ArrowLeft') { evento.preventDefault(); jogar(-1); }
            });

            const pular = botao('baralho-botao', 'Pular');
            pular.setAttribute('aria-label', 'Pular e ver todas as cartas do pacote');
            pular.addEventListener('click', () => mesaFinal(p));
            rodape.replaceChildren(pular);
            revelarTopo();
        }

        /** Fim do pacote: todas as cartas lado a lado, viradas, balançando. */
        function mesaFinal(p) {
            const ordem = [...p.cartas].sort((a, b) => B.nivel(a.raridade) - B.nivel(b.raridade));
            const mesa = el('div', `abertura-mesa abertura-mesa--${ordem.length}`);
            ordem.forEach((c, n) => {
                const slot = cartaComFaces(c, true);
                slot.setAttribute('aria-label', rotuloDaCarta(c));
                mesa.appendChild(slot);
                if (!semMovimento()) {
                    slot.animate([{ transform: 'translateY(40px) scale(0.6)', opacity: 0 }, { transform: 'translateY(-10px) scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
                        { duration: 420, delay: n * 80, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' });
                }
            });
            palco.replaceChildren(mesa);
            terminou();
        }

        function terminou() {
            const ultimo = atual === abertos.length - 1;
            const seguir = botao('baralho-botao baralho-botao--abrir',
                ultimo ? (abertos.length > 1 ? 'Ver resumo' : 'Pronto!') : `Próximo pacote (${atual + 2}/${abertos.length})`);
            seguir.addEventListener('click', () => {
                if (!ultimo) { atual += 1; mostrarPacote(); } else if (abertos.length > 1) resumo(); else tela.close();
            });
            rodape.replaceChildren(seguir);
            seguir.focus();
        }

        function resumo() {
            titulo.textContent = 'Resumo';
            const cartas = abertos.flatMap((p) => p.cartas);
            const novas = cartas.filter((c) => c.nova).length;
            contador.textContent = `${abertos.length} pacotes · ${cartas.length} cartas · ${novas} ${novas === 1 ? 'nova' : 'novas'}`;
            const contagem = new Map();
            for (const c of cartas) {
                const item = contagem.get(c.id) || { n: 0, nova: false };
                item.n += 1;
                item.nova ||= c.nova;
                contagem.set(c.id, item);
            }
            const grade = el('ul', 'abertura-resumo');
            const ordem = [...contagem.keys()].sort((a, b) =>
                B.nivel(B.carta(b).raridade) - B.nivel(B.carta(a).raridade) || B.carta(a).numero - B.carta(b).numero);
            for (const id of ordem) {
                const { n, nova } = contagem.get(id);
                const item = el('li', 'abertura-resumo-item');
                item.appendChild(vivo(carta(id)).raiz);
                if (nova) item.appendChild(el('span', 'abertura-selo abertura-selo--nova', 'Nova!'));
                if (n > 1) item.appendChild(el('span', 'fichario-qtd', `×${n}`));
                grade.appendChild(item);
            }
            palco.replaceChildren(grade);
            const pronto = botao('baralho-botao baralho-botao--abrir', 'Pronto!');
            pronto.addEventListener('click', () => tela.close());
            rodape.replaceChildren(pronto);
            pronto.focus();
        }

        mostrarPacote();
    }

    // ------------------------------------------------- chegada do visitante (sem login)
    /**
     * Na 1ª página da visita: os 3 pacotes de boas-vindas, um de cada, lado a lado.
     * "Abrir meus pacotes" chama a abertura; "Agora não" deixa para a próxima sessão.
     */
    function janelaBoasVindas() {
        const janela = el('dialog', 'pagina-gibi baralho-presente');
        janela.setAttribute('aria-labelledby', 'baralho-presente-titulo');
        const titulo = el('h2', 'baralho-presente-titulo', 'Você ganhou 3 pacotes grátis!');
        titulo.id = 'baralho-presente-titulo';
        const pacotes = el('div', 'baralho-presente-pacotes');
        for (const tipo of B.BOAS_VINDAS) pacotes.appendChild(pacoteArte(tipo));
        const abrir = botao('baralho-botao baralho-botao--abrir baralho-presente-abrir', 'Abrir meus pacotes');
        abrir.addEventListener('click', async () => {
            abrir.disabled = true;
            const { ok, dados: resposta } = await pedir('/api/baralho/visitante', {});
            if (!ok) {
                janela.close();
                window.siteToast?.({ icon: ['convite-baralho', '🃏'], burst: 'Ops!', label: 'Pacotes grátis',
                    text: resposta?.error ? `Não deu para abrir: ${resposta.error}.` : 'Não deu para abrir os pacotes agora.' });
                return;
            }
            const cartas = resposta.abertos.reduce((n, p) => n + p.cartas.length, 0);
            gravarPresente({ codigo: resposta.codigo, cartas, em: Date.now() });
            janela.close();
            abertura(resposta.abertos, {}, { visitante: cartas });
        });
        const depois = botao('conta-convite-depois', 'Agora não');
        depois.addEventListener('click', () => janela.close());
        janela.append(titulo, pacotes, abrir, depois);
        janela.addEventListener('click', (e) => { if (e.target === janela) janela.close(); });
        janela.addEventListener('close', () => janela.remove());
        document.body.appendChild(janela);
        janela.showModal();
        abrir.focus();
    }

    /** Caixa que oferece guardar as cartas do visitante na conta (login com Google). */
    function caixaSalvar(nCartas, titulo = 'Quer salvar suas cartas? Faça login') {
        const janela = el('dialog', 'pagina-gibi baralho-salvar');
        janela.setAttribute('aria-labelledby', 'baralho-salvar-titulo');
        const manchete = el('h2', 'baralho-salvar-titulo', titulo);
        manchete.id = 'baralho-salvar-titulo';
        const texto = el('p', 'baralho-salvar-texto',
            `Essas ${numero(nCartas)} cartas são suas. Entre com o Google para guardar na sua coleção e ganhar um pacote todo dia!`);
        const salvar = botao('baralho-botao baralho-botao--abrir baralho-salvar-login', 'Salvar minhas cartas');
        salvar.addEventListener('click', () => { janela.close(); window.EnzoConta?.pedirLogin?.(); });
        const depois = botao('conta-convite-depois', 'Agora não');
        depois.addEventListener('click', () => janela.close());
        janela.append(manchete, texto, salvar, depois);
        janela.addEventListener('click', (e) => { if (e.target === janela) janela.close(); });
        janela.addEventListener('close', () => janela.remove());
        document.body.appendChild(janela);
        janela.showModal();
        salvar.focus();
    }

    /**
     * Na chegada sem login (chamada pelo convite, js/auth-widget.js): mostra os
     * pacotes grátis (ainda não abriu) ou a caixa "suas cartas estão esperando".
     * Devolve true quando mostrou algo, para o convite de login não abrir junto.
     */
    function chegadaVisitante() {
        const conta = window.EnzoConta;
        if (!conta?.loginAtivo || conta.usuario) return false;
        let visto = false;
        try { visto = sessionStorage.getItem(CONVITE_VISTO) === '1'; } catch { /* sem sessionStorage */ }
        if (visto || !document.querySelector('[data-conta]') || document.querySelector('dialog[open]')) return false;
        try { sessionStorage.setItem(CONVITE_VISTO, '1'); } catch { /* sem sessionStorage */ }
        const guardado = lerPresente();
        if (guardado) caixaSalvar(guardado.cartas || 0, `Suas ${numero(guardado.cartas || 0)} cartas estão esperando...`);
        else janelaBoasVindas();
        return true;
    }

    // ------------------------------------------------- entrada com login (presentes)
    /** Rótulo de um presente da entrada. */
    function rotuloDeGanho(g, especialACada) {
        if (g.motivo === 'boas-vindas') return 'Boas-vindas: 1 de cada pacote';
        if (g.motivo === 'diario') {
            const n = g.sequencia || 0;
            return n % especialACada === 0 ? `Pacote especial de ${n} dias seguidos!` : `Pacote do dia — 🔥 ${n} dias seguidos`;
        }
        return g.nome || 'Presente';
    }

    /** Barrinha da sequência: quantos dias seguidos e quanto falta para o pacote especial. */
    function barraSequencia(n, especialACada) {
        const caixa = el('div', 'baralho-sequencia');
        const falta = especialACada - (n % especialACada);
        caixa.appendChild(el('p', 'baralho-sequencia-texto', `🔥 ${n} dias seguidos — faltam ${falta} para o pacote especial`));
        const trilha = el('span', 'baralho-sequencia-trilha');
        const cheio = el('span', 'baralho-sequencia-cheio');
        cheio.style.width = `${Math.round(((n % especialACada || especialACada) / especialACada) * 100)}%`;
        trilha.appendChild(cheio);
        caixa.appendChild(trilha);
        return caixa;
    }

    /** Janela "Presentes!" ao entrar: cada ganho com o desenho do pacote. */
    function janelaPresentes({ ganhos, sequencia, especialACada }) {
        const janela = el('dialog', 'pagina-gibi baralho-entrada');
        janela.setAttribute('aria-labelledby', 'baralho-entrada-titulo');
        const titulo = el('h2', 'baralho-entrada-titulo', 'Presentes!');
        titulo.id = 'baralho-entrada-titulo';
        const lista = el('ul', 'baralho-entrada-lista');
        for (const g of ganhos) {
            const item = el('li', 'baralho-entrada-item');
            item.append(pacoteArte(g.tipo), el('span', 'baralho-entrada-rotulo', rotuloDeGanho(g, especialACada)));
            lista.appendChild(item);
        }
        const agora = botao('baralho-botao baralho-botao--abrir baralho-entrada-abrir', 'Abrir agora');
        agora.addEventListener('click', () => { janela.close(); window.EnzoConta?.abrirFicha?.('baralho'); });
        const depois = botao('conta-convite-depois', 'Depois');
        depois.addEventListener('click', () => janela.close());
        janela.append(titulo, lista);
        if (sequencia > 0) janela.appendChild(barraSequencia(sequencia, especialACada));
        janela.append(agora, depois);
        janela.addEventListener('click', (e) => { if (e.target === janela) janela.close(); });
        janela.addEventListener('close', () => janela.remove());
        document.body.appendChild(janela);
        janela.showModal();
        agora.focus();
    }

    let resgateFeito = false;
    /** Depois do login: as cartas abertas como visitante entram na conta (uma vez só). */
    async function resgatarVisitante() {
        if (resgateFeito) return;
        const guardado = lerPresente();
        if (!guardado) return;
        resgateFeito = true;
        const { ok, status } = await pedir('/api/baralho/visitante/resgatar', { codigo: guardado.codigo });
        // Sem conexão: guarda o código para tentar de novo depois (apaga só quando o servidor respondeu).
        if (!ok && status === 0) { resgateFeito = false; return; }
        apagarPresente();
        if (ok) {
            window.siteToast?.({ icon: ['convite-baralho', '🃏'], burst: 'SAVO!', label: 'Cartas salvas',
                text: `Suas ${numero(guardado.cartas)} cartas foram salvas na coleção!` });
        } else if (status === 409) {
            window.siteToast?.({ icon: ['convite-baralho', '🃏'], label: 'Cartas de visitante',
                text: 'Essas cartas de visitante só vão para conta nova.' });
        }
    }

    let entradaFeita = false;
    /** Depois do login: resgata o visitante e busca os presentes (1×/página, no máx. 1×/dia). */
    async function depoisDoLogin() {
        const usuario = window.EnzoConta?.usuario;
        if (!usuario) return;
        await resgatarVisitante();
        if (entradaFeita) return;
        const chave = `enzo-entrada-${usuario.id}-${diaBrasilia()}`;
        try { if (sessionStorage.getItem(chave) === '1') return; } catch { /* sem sessionStorage */ }
        entradaFeita = true;
        const { ok, dados: resposta } = await pedir('/api/baralho/entrada', {});
        if (!ok) { entradaFeita = false; return; }
        try { sessionStorage.setItem(chave, '1'); } catch { /* sem sessionStorage */ }
        if (resposta?.ganhos?.length) {
            await window.EnzoIntro?.pronto;
            janelaPresentes(resposta);
        }
    }

    // Depois do login (js/auth-widget.js): resgata o visitante e mostra os presentes.
    // O EnzoConta nasce depois deste arquivo, então espera o DOM terminar de carregar.
    const ligarConta = () => {
        const conta = window.EnzoConta;
        if (!conta) return;
        const tentar = () => { if (conta.usuario) depoisDoLogin(); };
        conta.aoMudar(tentar);
        conta.pronto.then(tentar);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarConta, { once: true });
    else ligarConta();

    window.EnzoBaralhoUI = { aba, carta, verso, pacoteArte, abertura, nomeVisivel, chegadaVisitante };
})();
