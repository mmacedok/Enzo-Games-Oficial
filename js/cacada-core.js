// ============================================================================
// Regras puras da "Caçada ao Inominável" — metroidvania do Degustador da Noite
// inspirado em Hollow Knight (pesquisa em docs/PESQUISA-HOLLOW-KNIGHT.md).
//
// - Mundo único feito de SALAS (js/cacada-mundo.js) ligadas pelas bordas.
// - Coronhada (corpo a corpo) para frente, cima e baixo (pogo), com recuo.
// - Vida em cogumelos, Pontuação (a "alma"): +11 por golpe, Degustar cura.
// - Habilidades que abrem caminho: Rajada MP5K, Capa Janky (dash),
//   Luvas de Fita (parede) e Parênteses (pulo duplo).
// - Bancos salvam; morrer deixa a Sombra com as vírgulas.
// Sem DOM — usado por js/cacada.js e pelos testes (test/cacada-*.test.js).
// Unidades: pixels (tela 640×360, tile 20), y cresce para baixo, tempo em s.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./cacada-inimigos.js'));
    else root.CacadaCore = factory(root.CacadaInimigos);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Inimigos) {
    'use strict';

    const CONFIG = Object.freeze({
        largura: 640,
        altura: 360,
        tile: 20,
        telaL: 32,               // uma "tela" do mapa = 32×18 tiles
        telaA: 18,
        passo: 1 / 120,
        // Degustador (caixa de colisão)
        jogadorL: 14,
        jogadorA: 26,
        folgaPerigo: 2,
        // Corrida (quase instantânea, como em Hollow Knight)
        velocidadeMax: 190,
        acelChao: 2600,
        acelAr: 1900,
        atritoChao: 2800,
        atritoAr: 900,
        // Pulo
        gravidade: 1800,
        quedaMax: 560,
        impulso: -545,           // ~82 px (4 tiles)
        corteDoPulo: -210,
        tempoCoiote: 0.09,
        tempoAntecipado: 0.12,
        impulsoDuplo: -480,      // Parênteses: +~64 px
        // Parede (Luvas de Fita), como a Garra de Louva-a-Deus de Hollow Knight:
        // encostou segurando para o lado da parede, gruda e fica grudado sem segurar;
        // o pulo empurra pouco para fora, então segurando de volta ele gruda de novo
        // na mesma parede, mais alto (dá para escalar uma parede só).
        quedaParede: 105,
        grudarVyMin: -60,        // subindo mais rápido que isso, passa raspando sem grudar
        paredeImpulsoX: 190,
        paredeImpulsoY: -520,
        travaParede: 0.1,
        coiotaParede: 0.08,
        // Dash (Capa Janky)
        dashVelocidade: 470,
        dashTempo: 0.18,         // ~85 px
        dashRecarga: 0.35,
        // Mola
        molaImpulso: -800,
        // Coronhada
        golpeRecarga: 0.3,
        golpeAtivo: 0.1,         // janela em que acerta
        golpeVisual: 0.16,
        golpeAlcance: 34,
        danoGolpe: 1,
        pogoImpulso: -470,
        recuoGolpe: 140,
        recuoTempo: 0.09,
        // Pontuação (alma)
        pontuacaoPorGolpe: 11,
        pontuacaoMax: 99,
        custoMagia: 33,
        tempoDegustar: 0.95,
        tempoDegustarRapido: 0.6,
        // Rajada da MP5K
        rajadaVelocidade: 430,
        rajadaAlcance: 380,
        rajadaDano: 3,
        rajadaRecarga: 0.35,
        // Vida
        vidaInicial: 5,
        vidaMaxima: 9,
        invencivel: 1.2,
        empurraoDano: 210,
        atordoadoDano: 0.22,
        tempoPerigo: 0.6,
        tempoMorte: 1.4,
        // Mundo
        periodo: 3,
        amplitude: 60,
        raioSerra: 15,
        plataformaA: 8,
        tempoTelha: 0.45,
        voltaTelha: 3,
        vidaParede: 3,           // golpes para quebrar parede rachada
        virgulasBau: 15,
        // Queda de Bigorna (mergulho para baixo; quebra grades de bueiro)
        mergulhoPrep: 0.12,
        mergulhoVelocidade: 720,
        mergulhoPouso: 0.22,
        mergulhoDano: 2,
        mergulhoRaio: 46,
        // Pipa (planar segurando o pulo na queda; o vento empurra para cima)
        planarQueda: 70,
        ventoForca: 2600,
        ventoMax: -300,
        // Buzz! (segure ↓ + dash no chão, solte: super-dash que quebra vidro)
        buzzCarga: 0.6,
        buzzVelocidade: 520,
        buzzMax: 3,              // s no máximo
        buzzDano: 2,
        // Copo de Requeijão (3 pedaços = +33 de Pontuação máxima)
        pedacosPorCopo: 3,
        pontuacaoPorCopo: 33,
        copos: 3,
        // Figurinhas
        encaixesIniciais: 3,
        encaixesMax: 5,
        imaRaio: 70,
        coronhaComprida: 1.3,
        tenisImpulso: 1.1,
        custoCoxinha: 55,
    });

    const T = CONFIG.tile;
    const L = CONFIG.jogadorL;
    const A = CONFIG.jogadorA;

    const HABILIDADES = Object.freeze({
        rajada: Object.freeze({ nome: 'Rajada da MP5K', tecla: '[MAGIA]', texto: 'Gaste 33 de Pontuação para disparar uma rajada que atravessa os inimigos.' }),
        dash: Object.freeze({ nome: 'Capa Janky', tecla: '[DASH]', texto: 'Dê um dash para a frente, no chão ou no ar.' }),
        parede: Object.freeze({ nome: 'Luvas de Fita', tecla: '[PULO]', texto: 'Encoste numa parede no ar para grudar e deslizar. Pule e segure de volta para a mesma parede: dá para escalar uma parede só.' }),
        pulo2: Object.freeze({ nome: 'Parênteses', tecla: '[PULO] no ar', texto: 'Pule de novo no meio do ar.' }),
        bigorna: Object.freeze({ nome: 'Queda de Bigorna', tecla: '[BAIXO] + [DASH] no ar', texto: 'Mergulhe direto para baixo: quebra grades de bueiro e acerta quem estiver perto do pouso.' }),
        pipa: Object.freeze({ nome: 'Pipa', tecla: 'segure [PULO] caindo', texto: 'Plane devagar segurando o pulo enquanto cai. Nas correntes de vento, a pipa sobe.' }),
        buzz: Object.freeze({ nome: 'Buzz!', tecla: 'segure [BAIXO] + [DASH] no chão', texto: 'Segure para carregar e solte: um super-dash que atravessa vãos enormes e estilhaça paredes de vidro.' }),
    });
    const HAB_POR_DIGITO = { 1: 'rajada', 2: 'dash', 3: 'parede', 4: 'pulo2', 5: 'bigorna', 6: 'pipa', 7: 'buzz' };

    /** Figurinhas (os amuletos de Hollow Knight): cada uma ocupa 1 encaixe do Álbum. */
    const FIGURINHAS = Object.freeze({
        ima: Object.freeze({ nome: 'Ímã de Vírgula', texto: 'Os baús de vírgulas vêm até você.' }),
        coxinha: Object.freeze({ nome: 'Coxinha Dupla', texto: `Degustar cura 2 cogumelos, mas gasta ${CONFIG.custoCoxinha} de Pontuação.` }),
        coronha: Object.freeze({ nome: 'Coronha Comprida', texto: 'A coronhada alcança 30% mais longe.' }),
        capa: Object.freeze({ nome: 'Capa Remendada', texto: 'Ninguém te acerta durante o dash.' }),
        vidro: Object.freeze({ nome: 'Cogumelo de Vidro', texto: '+2 cogumelos de vida. Quebra se você morrer.' }),
        pimenta: Object.freeze({ nome: 'Pimenta Malagueta', texto: 'Com 1 cogumelo só, a coronhada tira o dobro.' }),
        tenis: Object.freeze({ nome: 'Tênis de Mola', texto: 'Pula mais alto.' }),
        radio: Object.freeze({ nome: 'Rádio de Pilha', texto: 'O mapa mostra inimigos e salas secretas.' }),
    });

    /**
     * Lojas. `depois`: só aparece depois de derrotar esse chefe. `copo`/`encaixe`/
     * `figurinha` dizem o que a compra dá; `chave` abre a tampa do bueiro.
     */
    const LOJAS = Object.freeze({
        italolol: Object.freeze([
            Object.freeze({ id: 'cogumelo', nome: 'Cogumelo Inteiro', preco: 150, texto: '+1 cogumelo de vida na hora (e enche todos).' }),
            Object.freeze({ id: 'lanche', nome: 'Lanche Turbinado', preco: 160, texto: 'Degustar fica bem mais rápido.' }),
            Object.freeze({ id: 'fita', nome: 'Fita Reforçada', preco: 220, texto: 'A coronhada tira o dobro de vida.' }),
            Object.freeze({ id: 'chave', nome: 'Chave do Bueiro', preco: 120, depois: 'arena:chefe', texto: 'Abre a tampa de bueiro no chão do Beco. Dizem que tem um rei lá embaixo.' }),
            Object.freeze({ id: 'encaixe1', nome: 'Página do Álbum', preco: 200, depois: 'arena:chefe', encaixe: true, texto: '+1 encaixe de figurinha no Álbum.' }),
            Object.freeze({ id: 'copo1', nome: 'Caco de Requeijão', preco: 180, depois: 'arena:chefe', copo: true, texto: 'Um pedaço do Copo de Requeijão (3 pedaços = +33 de Pontuação máxima).' }),
            Object.freeze({ id: 'pacote1', nome: 'Pacote de Figurinha', preco: 150, depois: 'arena:chefe', figurinha: 'pimenta', texto: 'Uma figurinha lacrada. Qual será?' }),
        ]),
        pastel: Object.freeze([
            Object.freeze({ id: 'encaixe2', nome: 'Página Dupla', preco: 260, encaixe: true, texto: '+1 encaixe de figurinha no Álbum.' }),
            Object.freeze({ id: 'copo2', nome: 'Caco de Requeijão', preco: 220, copo: true, texto: 'Mais um pedaço do Copo de Requeijão.' }),
            Object.freeze({ id: 'pacote2', nome: 'Pacote de Figurinha', preco: 180, figurinha: 'vidro', texto: 'Figurinha lacrada, direto da feira.' }),
            Object.freeze({ id: 'vidroNovo', nome: 'Cogumelo de Vidro novo', preco: 120, repoe: 'vidro', texto: 'Um Cogumelo de Vidro inteiro de novo (só se o seu quebrou).' }),
        ]),
    });
    const LOJA = LOJAS.italolol;
    const TODOS_ITENS_LOJA = Object.freeze([...LOJAS.italolol, ...LOJAS.pastel]);

    /** Legenda do mapa (uma letra por tile de 20×20). */
    const LEGENDA = Object.freeze({
        '.': 'vazio',
        '#': 'parede / telhado (sólido)',
        'X': 'caixa de metal (sólido)',
        '=': 'marquise: atravessa por baixo, ↓ desce',
        'Q': 'telha que desaba',
        'T': 'mola',
        '^': 'espinhos no chão',
        'v': 'espinhos no teto',
        'B': 'parede rachada (quebra com a coronhada)',
        'P': 'portão (abre com a alavanca da sala)',
        '|': 'grade da arena (fecha na luta contra o chefe)',
        'O': 'serra parada',
        'H': 'serra que vai e volta (horizontal)',
        'U': 'serra que sobe e desce',
        'M': 'plataforma móvel (M seguidos = uma plataforma)',
        'S': 'início do jogo',
        'b': 'banco (salva e cura)',
        'i': 'placa (texto em "placas" da sala)',
        'N': 'loja do ItaloLOL',
        'I': 'o Inominável (aparece e foge; na sala final, assiste à luta)',
        ',': 'baú de vírgulas',
        '*': 'fragmento de cogumelo',
        '1': 'habilidade: Rajada da MP5K',
        '2': 'habilidade: Capa Janky (dash)',
        '3': 'habilidade: Luvas de Fita (parede)',
        '4': 'habilidade: Parênteses (pulo duplo)',
        'L': 'alavanca (abre os portões da sala)',
        '@': 'chefe da sala',
        'c': 'Capanga do Coração (anda)',
        'p': 'Ping (voa e persegue)',
        'e': 'Emoji Raivoso (quica)',
        'd': 'Drone (atira de longe)',
        't': 'Troll (investida)',
        'j': 'Spam Saltitante (pula)',
        'g': 'Bug (anda em volta dos blocos)',
        'm': 'Moderador (escudo)',
        'f': 'Feiticeira (teleporta)',
        // Expansão (Esgoto, Feira, Orkut, Servidor Esquecido)
        '5': 'habilidade: Queda de Bigorna (mergulho)',
        '6': 'habilidade: Pipa (planar)',
        '7': 'habilidade: Buzz! (super-dash)',
        'G': 'grade de bueiro (só a Queda de Bigorna quebra)',
        'Y': 'parede de vidro (só o Buzz! quebra)',
        'Z': 'tampa de bueiro (abre com a Chave do Bueiro)',
        '~': 'chorume (machuca, como espinho)',
        'w': 'corrente de vento (com a Pipa, sobe)',
        'h': 'figurinha (qual: lista "figurinhas" da sala)',
        'q': 'caco do Copo de Requeijão',
        'R': 'Rato do Comentário (corre e dá bote)',
        'l': 'Boca-de-Lobo (escondida no chão, morde para cima)',
        'o': 'Bolha de Chorume (flutua e estoura)',
        'k': 'cano que pinga chorume',
        'u': 'Pop-up (teleporta e atira X)',
        'x': 'Golpista do Pix (rouba vírgulas)',
        'y': 'Boneco de Posto (se debate no lugar)',
        's': 'Scrap Fantasma (atravessa paredes)',
        'F': 'Fake (saco de vírgulas falso)',
        'n': 'Recado Cintilante (torre de brilho)',
    });
    const FIXOS = new Set(['#', 'X', '=', 'Q', 'T', '^', 'v', 'B', 'P', '|', 'G', 'Y', 'Z', '~', 'w']);
    /** Blocos que quebram em grupo (vizinhos iguais quebram juntos). */
    const QUEBRAVEIS = new Set(['B', 'G', 'Y']);
    const INIMIGO_POR_LETRA = {
        c: 'capanga', p: 'ping', e: 'emoji', d: 'drone', t: 'troll', j: 'spam', g: 'bug', m: 'moderador', f: 'feiticeira',
        R: 'rato', l: 'bocadelobo', o: 'bolha', k: 'gota', u: 'popup', x: 'golpista', y: 'boneco', s: 'scrap', F: 'fake', n: 'recado',
    };

    // ------------------------------------------------------------ mundo

    /** Monta o mundo inteiro a partir das salas desenhadas em texto. */
    function carregarMundo(def) {
        const salas = def.salas.map((s, idx) => {
            const linhas = s.mapa.map((l) => l.replace(/\s+$/, ''));
            return { ...s, idx, linhas, w: Math.max(...linhas.map((l) => l.length)), h: linhas.length, tx: s.x * CONFIG.telaL, ty: s.y * CONFIG.telaA };
        });
        const minX = Math.min(...salas.map((s) => s.tx));
        const minY = Math.min(...salas.map((s) => s.ty));
        const W = Math.max(...salas.map((s) => s.tx + s.w)) - minX;
        const H = Math.max(...salas.map((s) => s.ty + s.h)) - minY;
        const grade = Array.from({ length: H }, () => new Array(W).fill('r'));
        const salaIdx = new Int16Array(W * H).fill(-1);
        const nivel = {
            largura: W, altura: H, larguraPx: W * T, alturaPx: H * T,
            grade, salaIdx, salas, salaPorId: new Map(), areas: def.areas || {},
            inicio: null, bancos: [], placas: [], lojas: [], cameos: [], itens: [], alavancas: [],
            serras: [], plataformas: [], grupoB: new Map(), gruposB: new Map(), segredos: [],
        };
        for (const s of salas) {
            s.tx -= minX;
            s.ty -= minY;
            s.px = { x: s.tx * T, y: s.ty * T, w: s.w * T, h: s.h * T };
            s.inimigos = [];
            s.chefeDef = null;
            nivel.salaPorId.set(s.id, s);
            // Salas secretas: aparecem como parede até o Degustador entrar nelas.
            for (const [x0, y0, x1, y1] of s.segredos || []) {
                nivel.segredos.push({ sala: s.idx, x: (s.tx + x0) * T, y: (s.ty + y0) * T, w: (x1 - x0 + 1) * T, h: (y1 - y0 + 1) * T });
            }
            const cont = {};
            const novoId = (tipo) => { cont[tipo] = (cont[tipo] || 0) + 1; return `${s.id}:${tipo}${cont[tipo]}`; };
            let placa = 0;
            let figurinha = 0;
            for (let ly = 0; ly < s.h; ly++) {
                for (let lx = 0; lx < s.w; lx++) {
                    const c = s.linhas[ly][lx] || '.';
                    if (!(c in LEGENDA)) throw new Error(`Sala ${s.id}: letra desconhecida "${c}" em (${lx}, ${ly})`);
                    const gx = s.tx + lx;
                    const gy = s.ty + ly;
                    if (salaIdx[gy * W + gx] !== -1) throw new Error(`Sala ${s.id} se sobrepõe a ${salas[salaIdx[gy * W + gx]].id}`);
                    salaIdx[gy * W + gx] = s.idx;
                    grade[gy][gx] = FIXOS.has(c) ? c : '.';
                    const x = gx * T;
                    const y = gy * T;
                    const base = y + T;
                    if (c === 'S') nivel.inicio = { x: x + (T - L) / 2, y: base - A, sala: s.idx };
                    else if (c === 'b') nivel.bancos.push({ id: novoId('banco'), sala: s.idx, x: x - 10, y: base - 14, w: 40, h: 14 });
                    else if (c === 'i') nivel.placas.push({ id: novoId('placa'), sala: s.idx, x: x - 10, y: base - 30, w: 40, h: 30, texto: (s.placas || [])[placa++] || '' });
                    else if (c === 'N') nivel.lojas.push({ id: novoId('loja'), sala: s.idx, x: x - 6, y: base - 34, w: 32, h: 34, vendedor: s.vendedor || 'italolol' });
                    else if (c === 'h') {
                        const qual = (s.figurinhas || [])[figurinha++];
                        if (!FIGURINHAS[qual]) throw new Error(`Sala ${s.id}: "h" sem figurinha válida na lista "figurinhas"`);
                        nivel.itens.push({ id: novoId('figurinha'), sala: s.idx, tipo: 'figurinha', figurinha: qual, x: x + 1, y: y + 1, w: 18, h: 18 });
                    } else if (c === 'q') nivel.itens.push({ id: novoId('copo'), sala: s.idx, tipo: 'copo', x: x + 2, y: y + 2, w: 16, h: 16 });
                    else if (c === 'I') nivel.cameos.push({ id: novoId('inominavel'), sala: s.idx, x: x - 6, y: base - 50, w: 32, h: 50, falas: s.falas || [], final: !!s.final });
                    else if (c === ',') nivel.itens.push({ id: novoId('virgulas'), sala: s.idx, tipo: 'virgulas', valor: CONFIG.virgulasBau, x: x + 3, y: y + 3, w: 14, h: 14 });
                    else if (c === '*') nivel.itens.push({ id: novoId('fragmento'), sala: s.idx, tipo: 'fragmento', x: x + 2, y: y + 2, w: 16, h: 16 });
                    else if (HAB_POR_DIGITO[c]) nivel.itens.push({ id: novoId('habilidade'), sala: s.idx, tipo: 'habilidade', habilidade: HAB_POR_DIGITO[c], x, y: base - 20, w: 20, h: 20 });
                    else if (c === 'L') nivel.alavancas.push({ id: novoId('alavanca'), sala: s.idx, x: x + 5, y: base - 22, w: 10, h: 22 });
                    else if (INIMIGO_POR_LETRA[c]) {
                        const tipo = INIMIGO_POR_LETRA[c];
                        const tam = Inimigos.TIPOS[tipo];
                        const voa = tam.voa || tipo === 'bug';
                        s.inimigos.push({ id: novoId(tipo), tipo, sala: s.idx, x: x + (T - tam.w) / 2, y: voa ? y + (T - tam.h) / 2 : base - tam.h });
                    } else if (c === '@') {
                        if (!s.chefe || !Inimigos.TIPOS[s.chefe]) throw new Error(`Sala ${s.id}: "@" sem chefe válido`);
                        const tam = Inimigos.TIPOS[s.chefe];
                        s.chefeDef = { id: `${s.id}:chefe`, tipo: s.chefe, sala: s.idx, x: x + (T - tam.w) / 2, y: tam.voa ? base - 200 : base - tam.h, chaoY: base };
                        if (s.premio) nivel.itens.push({ id: `${s.id}:premio`, sala: s.idx, tipo: 'habilidade', habilidade: s.premio, premioDe: s.chefeDef.id, x, y: base - 20, w: 20, h: 20 });
                    } else if (c === 'O' || c === 'H' || c === 'U') {
                        nivel.serras.push({ tipo: c, sala: s.idx, cx: x + T / 2, cy: y + T / 2, fase: nivel.serras.length * 0.7 });
                        if (c !== 'O') s.temDinamicos = true;
                    } else if (c === 'M' && s.linhas[ly][lx - 1] !== 'M') {
                        let n = 1;
                        while (s.linhas[ly][lx + n] === 'M') n++;
                        nivel.plataformas.push({ id: nivel.plataformas.length, sala: s.idx, x0: x, y, w: n * T, h: CONFIG.plataformaA });
                        s.temDinamicos = true;
                    }
                }
            }
        }
        if (!nivel.inicio) throw new Error('Mundo sem S (início)');
        // Paredes rachadas (e grades e vidros) vizinhas formam um grupo só (quebram juntas).
        for (let gy = 0; gy < H; gy++) {
            for (let gx = 0; gx < W; gx++) {
                const letra = grade[gy][gx];
                if (!QUEBRAVEIS.has(letra) || nivel.grupoB.has(gy * W + gx)) continue;
                const id = `${letra}${gx},${gy}`;
                const celulas = [];
                const fila = [[gx, gy]];
                nivel.grupoB.set(gy * W + gx, id);
                while (fila.length) {
                    const [cx, cy] = fila.pop();
                    celulas.push([cx, cy]);
                    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = cx + ox;
                        const ny = cy + oy;
                        if (nx < 0 || ny < 0 || nx >= W || ny >= H || grade[ny][nx] !== letra || nivel.grupoB.has(ny * W + nx)) continue;
                        nivel.grupoB.set(ny * W + nx, id);
                        fila.push([nx, ny]);
                    }
                }
                nivel.gruposB.set(id, { id, letra, celulas, sala: salaIdx[gy * W + gx] });
            }
        }
        return nivel;
    }

    /** Aberturas nas bordas que não batem com a sala vizinha (erro de desenho). */
    function aberturasSemPar(nivel) {
        const erros = [];
        const aberto = (gx, gy) => {
            const c = nivel.grade[gy][gx];
            return c !== '#' && c !== 'X' && c !== 'r' && c !== 'T';
        };
        const W = nivel.largura;
        for (let gy = 0; gy < nivel.altura; gy++) {
            for (let gx = 0; gx < W; gx++) {
                const a = nivel.salaIdx[gy * W + gx];
                if (a < 0) continue;
                for (const [ox, oy] of [[1, 0], [0, 1]]) {
                    const nx = gx + ox;
                    const ny = gy + oy;
                    if (nx >= W || ny >= nivel.altura) continue;
                    const b = nivel.salaIdx[ny * W + nx];
                    if (b < 0 || b === a) continue;
                    if (aberto(gx, gy) !== aberto(nx, ny)) erros.push(`${nivel.salas[a].id}↔${nivel.salas[b].id} em (${gx}, ${gy})`);
                }
            }
        }
        return erros;
    }

    const onda = (t, fase = 0) => Math.sin(((t / CONFIG.periodo) + fase) * Math.PI * 2);
    const posPlataforma = (p, t) => ({ x: p.x0 + CONFIG.amplitude * onda(t, p.id * 0.5), y: p.y, w: p.w, h: p.h });
    function posSerra(s, t) {
        if (s.tipo === 'H') return { x: s.cx + CONFIG.amplitude * onda(t, s.fase), y: s.cy };
        if (s.tipo === 'U') return { x: s.cx, y: s.cy + CONFIG.amplitude * onda(t, s.fase) };
        return { x: s.cx, y: s.cy };
    }

    function tileEm(nivel, tx, ty) {
        if (tx < 0 || ty < 0 || tx >= nivel.largura || ty >= nivel.altura) return 'r';
        return nivel.grade[ty][tx];
    }

    /**
     * Sólido? `mundo` = { nivel, caidas?, quebrados?, abertos?, arena?, loja? } — o
     * estado que muda (telhas caídas, paredes quebradas, portões abertos, luta,
     * Chave do Bueiro comprada).
     */
    function solido(mundo, tx, ty) {
        const nivel = mundo.nivel;
        const c = tileEm(nivel, tx, ty);
        switch (c) {
            case '#': case 'X': case 'T': case 'r': return true;
            case 'Q': return !(mundo.caidas && mundo.caidas.get(`${tx},${ty}`)?.caiu);
            case 'B': case 'G': case 'Y': return !(mundo.quebrados && mundo.quebrados.has(nivel.grupoB.get(ty * nivel.largura + tx)));
            case 'Z': return !(mundo.loja && mundo.loja.has('chave'));
            case 'P': return !(mundo.abertos && mundo.abertos.has(nivel.salas[nivel.salaIdx[ty * nivel.largura + tx]].id));
            case '|': return mundo.arena != null && mundo.arena === nivel.salaIdx[ty * nivel.largura + tx];
            default: return false;
        }
    }

    const colide = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    function colideCirculo(r, cx, cy, raio) {
        const px = Math.max(r.x, Math.min(cx, r.x + r.w));
        const py = Math.max(r.y, Math.min(cy, r.y + r.h));
        return (px - cx) ** 2 + (py - cy) ** 2 < raio * raio;
    }

    // ------------------------------------------------------------ Degustador

    function criarJogador(pos) {
        return {
            x: pos.x, y: pos.y, vx: 0, vy: 0,
            noChao: true, olhando: 1,
            coiote: 0, antecipado: 0,
            parede: 0, grudado: 0, coiotaParede: 0, ultimaParede: 0,
            trava: 0, travaLado: 0, semCorte: false,
            estado: 'normal',    // 'normal' | 'dash' | 'degustando' | 'mergulho' | 'carregando' | 'buzz'
            plataforma: -1, descendo: 0,
            mergulhoT: 0, carga: 0, buzzT: 0, planando: false,
            soltarCura: false, dashT: 0, dashLado: 1, dashRecarga: 0, dashDisponivel: true, puloDuploUsado: false,
            recuo: 0, recuoVx: 0, atordoado: 0,
            vida: CONFIG.vidaInicial, pontuacao: 0, invencivel: 0,
            golpe: null, recargaGolpe: 0, recargaMagia: 0, degustarT: 0,
            seguro: { x: pos.x, y: pos.y },
        };
    }

    const clonarJogador = (j) => ({ ...j, golpe: null, seguro: j.seguro });
    const caixa = (j) => ({ x: j.x, y: j.y, w: L, h: A });
    const caixaPerigo = (j) => {
        const f = CONFIG.folgaPerigo;
        return { x: j.x + f, y: j.y + f, w: L - 2 * f, h: A - 2 * f };
    };
    const VAZIO = new Set();

    function paredeNaColuna(mundo, tx, y0, y1) {
        for (let ty = Math.floor(y0 / T); ty <= Math.floor((y1 - 0.001) / T); ty++) if (solido(mundo, tx, ty)) return true;
        return false;
    }

    /** Move na horizontal; devolve true se bateu. */
    function moverX(mundo, j, dx) {
        j.x += dx;
        const top = j.y + 0.5;
        const bot = j.y + A - 0.5;
        if (dx > 0) {
            const tx = Math.floor((j.x + L - 0.001) / T);
            if (paredeNaColuna(mundo, tx, top, bot)) { j.x = tx * T - L; j.vx = 0; return true; }
        } else if (dx < 0) {
            const tx = Math.floor(j.x / T);
            if (paredeNaColuna(mundo, tx, top, bot)) { j.x = (tx + 1) * T; j.vx = 0; return true; }
        }
        return false;
    }

    function moverY(mundo, j, dy, t) {
        const antes = j.y + A;
        j.y += dy;
        const x0 = Math.floor((j.x + 0.5) / T);
        const x1 = Math.floor((j.x + L - 0.5) / T);
        if (dy > 0) {
            const base = j.y + A;
            const ty = Math.floor((base - 0.001) / T);
            let pouso = null;
            for (let tx = x0; tx <= x1; tx++) {
                const c = tileEm(mundo.nivel, tx, ty);
                if (solido(mundo, tx, ty) || (c === '=' && antes <= ty * T + 0.01 && j.descendo <= 0)) {
                    if (!pouso || c === 'T') pouso = { c, tx, ty };
                }
            }
            if (pouso) {
                j.y = pouso.ty * T - A;
                j.vy = 0;
                j.noChao = true;
                return pouso;
            }
            for (const p of mundo.nivel.plataformas) {
                const q = posPlataforma(p, t);
                if (antes <= q.y + 0.01 && base >= q.y && j.x + L > q.x && j.x < q.x + q.w) {
                    j.y = q.y - A;
                    j.vy = 0;
                    j.noChao = true;
                    j.plataforma = p.id;
                    return { c: 'M', plataforma: p.id };
                }
            }
        } else if (dy < 0) {
            const ty = Math.floor(j.y / T);
            for (let tx = x0; tx <= x1; tx++) {
                if (solido(mundo, tx, ty)) { j.y = (ty + 1) * T; j.vy = 0; break; }
            }
        }
        return null;
    }

    function tocandoParede(mundo, j, lado) {
        const tx = lado > 0 ? Math.floor((j.x + L + 1) / T) : Math.floor((j.x - 1) / T);
        return paredeNaColuna(mundo, tx, j.y + 4, j.y + A - 4);
    }

    function pularDaParede(j, lado) {
        j.grudado = 0;
        j.vx = -lado * CONFIG.paredeImpulsoX;
        j.vy = CONFIG.paredeImpulsoY;
        j.trava = CONFIG.travaParede;
        j.travaLado = lado;
        j.olhando = -lado;
        j.semCorte = false;
        j.antecipado = 0;
        j.coiotaParede = 0;
        j.estado = 'normal';
    }

    function embaixoEhMarquise(mundo, j) {
        const ty = Math.floor((j.y + A + 1) / T);
        const x0 = Math.floor((j.x + 0.5) / T);
        const x1 = Math.floor((j.x + L - 0.5) / T);
        let marquise = false;
        for (let tx = x0; tx <= x1; tx++) {
            if (solido(mundo, tx, ty)) return false;
            if (tileEm(mundo.nivel, tx, ty) === '=') marquise = true;
        }
        return marquise;
    }

    function renovarAr(j) {
        j.dashDisponivel = true;
        j.puloDuploUsado = false;
    }

    /** Quebra o grupo de blocos (grade/vidro) do tile, se ainda estiver inteiro. */
    function quebrarBloco(mundo, tx, ty) {
        const nivel = mundo.nivel;
        const id = nivel.grupoB.get(ty * nivel.largura + tx);
        if (!id || !solido(mundo, tx, ty)) return false;
        if (mundo.quebrar) mundo.quebrar(id, tx, ty);
        else mundo.quebrados.add(id);
        return true;
    }

    /** Corrente de vento ('w') no corpo do Degustador? */
    function noVento(mundo, j) {
        const x0 = Math.floor((j.x + 1) / T);
        const x1 = Math.floor((j.x + L - 1) / T);
        for (let ty = Math.floor(j.y / T); ty <= Math.floor((j.y + A) / T); ty++) {
            for (let tx = x0; tx <= x1; tx++) if (tileEm(mundo.nivel, tx, ty) === 'w') return true;
        }
        return false;
    }

    /** Queda de Bigorna: prepara no ar, desce reto e quebra grades de bueiro. */
    function passoMergulho(mundo, j, dt, t, ev) {
        j.mergulhoT += dt;
        j.vx = 0;
        if (j.mergulhoT < CONFIG.mergulhoPrep) { j.vy = 0; return ev; }
        j.vy = CONFIG.mergulhoVelocidade;
        const dy = j.vy * dt;
        const ty = Math.floor((j.y + A + dy) / T);
        for (let tx = Math.floor((j.x + 0.5) / T); tx <= Math.floor((j.x + L - 0.5) / T); tx++) {
            if (tileEm(mundo.nivel, tx, ty) === 'G' && quebrarBloco(mundo, tx, ty)) ev.push('grade');
        }
        j.noChao = false;
        const pouso = moverY(mundo, j, dy, t + dt);
        if (!pouso) return ev;
        j.estado = 'normal';
        j.mergulhoT = 0;
        j.atordoado = CONFIG.mergulhoPouso;
        renovarAr(j);
        ev.push('pousoMergulho');
        if (pouso.c === 'T') {
            j.vy = CONFIG.molaImpulso;
            j.noChao = false;
            j.semCorte = true;
            j.atordoado = 0;
            ev.push('mola');
        } else if (pouso.c === 'Q' && mundo.pisarTelha) mundo.pisarTelha(pouso.tx, pouso.ty);
        return ev;
    }

    /** Buzz!: super-dash reto até bater; parede de vidro estilhaça e ele segue. */
    function passoBuzz(mundo, j, e, dt, t, ev) {
        j.buzzT += dt;
        j.vy = 0;
        if (j.buzzT > 0.08 && (e.puloPedido || e.dashPedido)) {
            // Cancelou no meio do caminho: cai dali.
            j.estado = 'normal';
            j.vx = j.dashLado * CONFIG.velocidadeMax * 0.5;
            j.antecipado = 0;
            ev.push('buzzFim');
            return ev;
        }
        const bateu = moverX(mundo, j, j.dashLado * CONFIG.buzzVelocidade * dt);
        if (bateu) {
            const tx = j.dashLado > 0 ? Math.floor((j.x + L + 1) / T) : Math.floor((j.x - 1) / T);
            let vidro = false;
            for (let ty = Math.floor((j.y + 0.5) / T); ty <= Math.floor((j.y + A - 0.5) / T); ty++) {
                if (tileEm(mundo.nivel, tx, ty) === 'Y' && quebrarBloco(mundo, tx, ty)) vidro = true;
            }
            if (vidro) { ev.push('vidro'); return ev; }
        }
        if (bateu || j.buzzT >= CONFIG.buzzMax) {
            j.estado = 'normal';
            j.vx = 0;
            j.dashRecarga = CONFIG.dashRecarga;
            if (bateu) { j.atordoado = 0.2; ev.push('buzzBateu'); } else ev.push('buzzFim');
        }
        j.noChao = apoiado(mundo, j, t);
        return ev;
    }

    /**
     * Um passo de física do Degustador.
     * entrada: { esquerda, direita, cima, baixo, pulo, puloPedido, dash, dashPedido }.
     * mundo.habilidades: Set com 'dash', 'parede', 'pulo2', 'bigorna', 'pipa', 'buzz'…
     * mundo.tenis: pula mais alto (figurinha Tênis de Mola).
     * Devolve os acontecimentos do passo ('pulo', 'pulo2', 'parede', 'dash', 'mola', 'grudou',
     * 'mergulho', 'pousoMergulho', 'grade', 'carregando', 'buzz', 'vidro', 'planar'…).
     */
    function passoJogador(mundo, j, e, dt, t) {
        const ev = [];
        const hab = mundo.habilidades || VAZIO;
        if (e.puloPedido) j.antecipado = CONFIG.tempoAntecipado;
        let dir = (e.direita ? 1 : 0) - (e.esquerda ? 1 : 0);
        j.descendo = Math.max(0, j.descendo - dt);
        j.dashRecarga = Math.max(0, j.dashRecarga - dt);
        j.atordoado = Math.max(0, j.atordoado - dt);
        j.recuo = Math.max(0, j.recuo - dt);
        if (j.atordoado > 0) dir = 0;

        if (j.estado === 'mergulho') return passoMergulho(mundo, j, dt, t, ev);
        if (j.estado === 'buzz') return passoBuzz(mundo, j, e, dt, t, ev);
        if (j.estado === 'carregando') {
            j.vx = 0;
            j.planando = false;
            if (!e.dash || !apoiado(mundo, j, t)) {
                const pronto = j.carga >= CONFIG.buzzCarga && !e.dash;
                j.estado = 'normal';
                j.carga = 0;
                if (pronto) {
                    j.estado = 'buzz';
                    j.buzzT = 0;
                    j.dashLado = dir || j.olhando;
                    j.olhando = j.dashLado;
                    ev.push('buzz');
                    return ev;
                }
            } else {
                j.carga += dt;
                if (dir) j.olhando = dir;
                j.vy = Math.min(j.vy + CONFIG.gravidade * dt, CONFIG.quedaMax);
                moverY(mundo, j, j.vy * dt, t + dt);
                return ev;
            }
        }

        if (j.estado === 'dash') {
            j.dashT -= dt;
            j.vy = 0;
            const bateu = moverX(mundo, j, j.dashLado * CONFIG.dashVelocidade * dt);
            j.noChao = apoiado(mundo, j, t);
            if (!j.noChao) {
                // Saiu da beirada no meio do dash: não vale pulo "do chão" nem outro dash.
                j.coiote = 0;
                j.dashDisponivel = false;
            }
            if (j.dashT <= 0 || bateu) {
                j.estado = 'normal';
                j.vx = bateu ? 0 : j.dashLado * CONFIG.velocidadeMax;
                j.dashRecarga = CONFIG.dashRecarga;
                if (j.noChao) j.dashDisponivel = true;
            }
            detectarParede(mundo, j, hab, dir, e, ev);
            return ev;
        }

        const travado = j.estado === 'degustando';
        if (travado) dir = 0;

        // Corrida.
        let quer = dir;
        if (j.trava > 0) { j.trava -= dt; if (quer === j.travaLado) quer = 0; }
        if (quer !== 0 && j.recuo <= 0) j.olhando = quer;
        if (j.recuo > 0) {
            j.vx = j.recuoVx;
        } else if (quer !== 0) {
            const alvo = quer * CONFIG.velocidadeMax;
            const a = j.noChao ? CONFIG.acelChao : CONFIG.acelAr;
            j.vx += Math.sign(alvo - j.vx) * Math.min(Math.abs(alvo - j.vx), a * dt);
        } else if (j.trava <= 0 || j.noChao) {
            const a = j.noChao ? CONFIG.atritoChao : CONFIG.atritoAr;
            j.vx -= Math.sign(j.vx) * Math.min(Math.abs(j.vx), a * dt);
        }

        // Pulos.
        if (j.noChao) j.coiote = CONFIG.tempoCoiote;
        else j.coiote = Math.max(0, j.coiote - dt);
        const podeParede = hab.has('parede');
        if (j.parede !== 0 && podeParede) { j.coiotaParede = CONFIG.coiotaParede; j.ultimaParede = j.parede; } else j.coiotaParede = Math.max(0, j.coiotaParede - dt);

        if (j.antecipado > 0 && !travado && j.atordoado <= 0) {
            if (j.noChao && e.baixo && embaixoEhMarquise(mundo, j)) {
                j.descendo = 0.2;
                j.antecipado = 0;
                j.noChao = false;
            } else if (j.noChao || j.coiote > 0) {
                j.vy = CONFIG.impulso * (mundo.tenis ? CONFIG.tenisImpulso : 1);
                j.noChao = false;
                j.coiote = 0;
                j.antecipado = 0;
                j.semCorte = false;
                ev.push('pulo');
            } else if (j.coiotaParede > 0) {
                pularDaParede(j, j.ultimaParede);
                ev.push('parede');
            } else if (hab.has('pulo2') && !j.puloDuploUsado && !chaoPerto(mundo, j, j.vy > 0 ? j.vy * 0.05 + 2 : 2)) {
                // Perto de pousar, o pulo apertado fica guardado para o pulo normal.
                j.vy = CONFIG.impulsoDuplo;
                j.puloDuploUsado = true;
                j.antecipado = 0;
                j.semCorte = false;
                ev.push('pulo2');
            }
        }
        j.antecipado = Math.max(0, j.antecipado - dt);
        if (j.noChao && e.baixo && !travado && embaixoEhMarquise(mundo, j) && j.descendo <= 0) {
            j.descendo = 0.2;
            j.noChao = false;
        }

        // ↓ + dash: no ar, Queda de Bigorna; no chão, carrega o Buzz!.
        if (e.dashPedido && e.baixo && !travado && j.atordoado <= 0) {
            if (!j.noChao && hab.has('bigorna')) {
                j.estado = 'mergulho';
                j.mergulhoT = 0;
                j.grudado = 0;
                j.planando = false;
                j.vx = 0;
                j.vy = 0;
                ev.push('mergulho');
                return ev;
            }
            if (j.noChao && hab.has('buzz')) {
                j.estado = 'carregando';
                j.carga = 0;
                j.vx = 0;
                ev.push('carregando');
                return ev;
            }
        }

        // Dash.
        if (e.dashPedido && hab.has('dash') && j.dashRecarga <= 0 && j.dashDisponivel && !travado && j.atordoado <= 0) {
            let lado = dir || j.olhando;
            if (!j.noChao && j.parede !== 0 && podeParede) lado = -j.parede;
            comecarDash(j, lado, ev);
            return ev;
        }

        if (!e.pulo && !j.semCorte && j.vy < CONFIG.corteDoPulo) j.vy = CONFIG.corteDoPulo;
        if (j.vy >= 0) j.semCorte = false;

        j.vy = Math.min(j.vy + CONFIG.gravidade * dt, CONFIG.quedaMax);
        // Pipa: segurando o pulo na queda, plana; na corrente de vento, sobe.
        const planava = j.planando;
        j.planando = hab.has('pipa') && !j.noChao && e.pulo && j.grudado === 0 && !travado && j.atordoado <= 0
            && (j.vy > 0 || planava);
        if (j.planando) {
            if (noVento(mundo, j)) j.vy = Math.max(CONFIG.ventoMax, j.vy - (CONFIG.ventoForca + CONFIG.gravidade) * dt);
            else if (j.vy > CONFIG.planarQueda) j.vy = Math.max(CONFIG.planarQueda, j.vy - CONFIG.gravidade * 3 * dt);
            if (!planava) ev.push('planar');
        }
        if (podeParede && !j.noChao && j.parede !== 0 && (dir === j.parede || j.grudado === j.parede) && j.vy > CONFIG.quedaParede) j.vy = CONFIG.quedaParede;

        if (j.plataforma >= 0) {
            const p = mundo.nivel.plataformas[j.plataforma];
            moverX(mundo, j, posPlataforma(p, t + dt).x - posPlataforma(p, t).x);
            j.plataforma = -1;
        }

        moverX(mundo, j, j.vx * dt);
        j.noChao = false;
        const pouso = moverY(mundo, j, j.vy * dt, t + dt);
        if (pouso && pouso.c === 'T') {
            j.vy = CONFIG.molaImpulso;
            j.noChao = false;
            j.semCorte = true;
            renovarAr(j);
            ev.push('mola');
        }
        if (pouso && pouso.c === 'Q' && mundo.pisarTelha) mundo.pisarTelha(pouso.tx, pouso.ty);
        if (j.noChao) renovarAr(j);

        if (!travado && j.atordoado <= 0) detectarParede(mundo, j, hab, dir, e, ev);
        else { j.parede = 0; j.grudado = 0; }
        return ev;
    }

    function comecarDash(j, lado, ev) {
        j.grudado = 0;
        j.estado = 'dash';
        j.dashT = CONFIG.dashTempo;
        j.dashLado = lado;
        j.olhando = lado;
        j.vy = 0;
        j.trava = 0;
        if (!j.noChao) j.dashDisponivel = false;
        ev.push('dash');
    }

    /** Parede encostada: com as Luvas, gruda e desliza (só no ar). */
    function detectarParede(mundo, j, hab, dir, e, ev) {
        j.parede = 0;
        if (j.noChao) { j.grudado = 0; return; }
        if (tocandoParede(mundo, j, 1)) j.parede = 1;
        else if (tocandoParede(mundo, j, -1)) j.parede = -1;
        if (j.parede === 0 || !hab.has('parede')) j.grudado = 0;
        else if (j.grudado === j.parede) {
            if (dir === -j.parede) j.grudado = 0;          // segurou para fora: solta
        } else if (dir === j.parede && j.vy >= CONFIG.grudarVyMin) {
            j.grudado = j.parede;
            j.vx = 0;
            if (j.vy > CONFIG.quedaParede) j.vy = CONFIG.quedaParede;
            ev.push('grudou');
        }
        if (j.grudado !== 0) { j.olhando = -j.grudado; j.vx = 0; }
        if (j.parede !== 0 && hab.has('parede') && (dir === j.parede || j.grudado !== 0)) renovarAr(j);
    }

    /** Chão (sólido ou marquise) a até `dist` px embaixo dos pés? */
    function chaoPerto(mundo, j, dist) {
        const x0 = Math.floor((j.x + 0.5) / T);
        const x1 = Math.floor((j.x + L - 0.5) / T);
        for (let ty = Math.floor((j.y + A + 0.5) / T); ty <= Math.floor((j.y + A + dist) / T); ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                if (solido(mundo, tx, ty) || tileEm(mundo.nivel, tx, ty) === '=') return true;
            }
        }
        return false;
    }

    /** Tem chão (sólido, marquise ou plataforma) logo embaixo dos pés? */
    function apoiado(mundo, j, t) {
        const ty = Math.floor((j.y + A + 1) / T);
        for (let tx = Math.floor((j.x + 0.5) / T); tx <= Math.floor((j.x + L - 0.5) / T); tx++) {
            if (solido(mundo, tx, ty) || tileEm(mundo.nivel, tx, ty) === '=') return true;
        }
        return false;
    }

    /** Espinhos ou serra na caixa dada (para dano e para o pogo). */
    function perigoNaCaixa(nivel, c, t, tileInteiro) {
        const x0 = Math.floor(c.x / T), x1 = Math.floor((c.x + c.w) / T);
        const y0 = Math.floor(c.y / T), y1 = Math.floor((c.y + c.h) / T);
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const k = tileEm(nivel, tx, ty);
                if (k === '^' && colide(c, tileInteiro ? { x: tx * T, y: ty * T, w: T, h: T } : { x: tx * T + 2, y: ty * T + 9, w: T - 4, h: T - 9 })) return 'espinho';
                if (k === 'v' && colide(c, tileInteiro ? { x: tx * T, y: ty * T, w: T, h: T } : { x: tx * T + 2, y: ty * T, w: T - 4, h: T - 9 })) return 'espinho';
                if (k === '~' && colide(c, tileInteiro ? { x: tx * T, y: ty * T, w: T, h: T } : { x: tx * T, y: ty * T + 7, w: T, h: T - 7 })) return 'chorume';
            }
        }
        for (const s of nivel.serras) {
            const p = posSerra(s, t);
            if (colideCirculo(c, p.x, p.y, CONFIG.raioSerra)) return 'serra';
        }
        return null;
    }

    function tocouPerigo(nivel, j, t) {
        const p = perigoNaCaixa(nivel, caixaPerigo(j), t, false);
        if (p) return p;
        if (j.y > nivel.alturaPx + 40) return 'queda';
        return null;
    }

    /**
     * Área da coronhada. g.gx/g.gy é a direção (8 direções): frente, cima, baixo
     * e as diagonais. Para baixo no chão vira uma rasteira na altura dos pés.
     */
    function caixaGolpe(j, g) {
        const R = CONFIG.golpeAlcance * (g.longo ? CONFIG.coronhaComprida : 1);
        const gx = g.gx;
        const gy = g.gy;
        if (gx === 0 && gy < 0) return { x: j.x - 9, y: j.y - R, w: L + 18, h: R + 4 };
        if (gx === 0 && gy > 0) {
            if (g.noChao) return { x: j.x - 16, y: j.y + A - 16, w: L + 32, h: 20 };
            return { x: j.x - 8, y: j.y + A - 4, w: L + 16, h: R };
        }
        if (gy === 0) return gx > 0 ? { x: j.x + L - 4, y: j.y - 4, w: R + 4, h: A + 4 } : { x: j.x - R, y: j.y - 4, w: R + 4, h: A + 4 };
        // Diagonal: um quadrado encostado no canto do corpo.
        const D = R - 2;
        const x = gx > 0 ? j.x + L - 10 : j.x - D + 10;
        const y = gy < 0 ? j.y - D + 8 : j.y + A - 12;
        return { x, y, w: D, h: D };
    }

    // ------------------------------------------------------------ partida

    function progressoNovo() {
        return {
            habilidades: new Set(), vidaMax: CONFIG.vidaInicial, fragmentos: 0, virgulas: 0,
            coletados: new Set(), quebrados: new Set(), abertos: new Set(), chefes: new Set(),
            visitadas: new Set(), banco: null, loja: new Set(), fugas: new Set(), sombra: null,
            tempo: 0, mortes: 0, final: false,
            // Expansão: figurinhas (tem / no Álbum / quebradas), encaixes e cacos de copo.
            figurinhas: new Set(), equipadas: [], quebradas: new Set(), encaixes: CONFIG.encaixesIniciais, copos: 0,
        };
    }

    /** Figurinha no Álbum (equipada)? */
    const usa = (jogo, id) => jogo.progresso.equipadas.includes(id);
    /** Cogumelos máximos agora (o Cogumelo de Vidro dá +2 enquanto estiver no Álbum). */
    const vidaTotal = (jogo) => jogo.progresso.vidaMax + (usa(jogo, 'vidro') ? 2 : 0);
    /** Pontuação máxima: 99 + 33 por Copo de Requeijão completo. */
    const pontuacaoTotal = (p) => CONFIG.pontuacaoMax + Math.floor(p.copos / CONFIG.pedacosPorCopo) * CONFIG.pontuacaoPorCopo;

    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function criarJogo(mundoDef, opcoes = {}) {
        const jogo = {
            mundoDef,
            nivel: carregarMundo(mundoDef),
            progresso: progressoNovo(),
            fase: 'titulo',      // 'titulo' | 'jogando' | 'perigo' | 'morto' | 'sentado' | 'pegou' | 'loja' | 'final'
            faseT: 0,
            tempo: 0,
            sala: null,
            jogador: null,
            inimigos: [],
            tiros: [],
            projeteis: [],
            caidas: new Map(),
            mortos: new Set(),
            vidaParedes: new Map(),
            cameos: [],
            arena: null,
            pegou: null,
            fimEm: 0,
            eventos: [],
            acumulado: 0,
            rng: mulberry32(opcoes.semente ?? 20260924),
        };
        return jogo;
    }

    /** Começa do zero, ou continua de um save (volta ao banco salvo). */
    function iniciar(jogo, save = null) {
        jogo.progresso = save ? importarSave(save) : progressoNovo();
        jogo.mortos = new Set();
        jogo.caidas = new Map();
        jogo.vidaParedes = new Map();
        jogo.eventos = [];
        jogo.fimEm = 0;
        jogo.tempo = 0;
        jogo.acumulado = 0;
        jogo.faseT = 0;
        jogo.pegou = null;
        const banco = bancoSalvo(jogo);
        if (banco) {
            posicionarNoBanco(jogo, banco);
            jogo.fase = 'sentado';
        } else {
            jogo.jogador = criarJogador(jogo.nivel.inicio);
            jogo.jogador.vida = vidaTotal(jogo);
            entrarSala(jogo, jogo.nivel.salas[jogo.nivel.inicio.sala]);
            jogo.fase = 'jogando';
        }
    }

    const bancoSalvo = (jogo) => jogo.nivel.bancos.find((b) => b.id === jogo.progresso.banco) || null;

    function posicionarNoBanco(jogo, banco) {
        const j = criarJogador({ x: banco.x + banco.w / 2 - L / 2, y: banco.y + banco.h - A });
        j.vida = vidaTotal(jogo);
        jogo.jogador = j;
        jogo.sala = null;
        entrarSala(jogo, jogo.nivel.salas[banco.sala]);
    }

    function mundoDo(jogo) {
        return {
            nivel: jogo.nivel,
            caidas: jogo.caidas,
            quebrados: jogo.progresso.quebrados,
            abertos: jogo.progresso.abertos,
            arena: jogo.arena,
            habilidades: jogo.progresso.habilidades,
            loja: jogo.progresso.loja,
            tenis: usa(jogo, 'tenis'),
            quebrar(id, tx, ty) {
                jogo.progresso.quebrados.add(id);
                const letra = jogo.nivel.gruposB.get(id)?.letra;
                jogo.eventos.push({ tipo: letra === 'Y' ? 'vidroQuebrou' : 'gradeQuebrou', x: tx * T + T / 2, y: ty * T + T / 2 });
            },
            pisarTelha(tx, ty) {
                const k = `${tx},${ty}`;
                if (!jogo.caidas.has(k)) jogo.caidas.set(k, { t: 0, caiu: false });
            },
        };
    }

    function salaEm(nivel, x, y) {
        const tx = Math.floor(x / T);
        const ty = Math.floor(y / T);
        if (tx < 0 || ty < 0 || tx >= nivel.largura || ty >= nivel.altura) return -1;
        return nivel.salaIdx[ty * nivel.largura + tx];
    }

    function entrarSala(jogo, sala) {
        const anterior = jogo.sala;
        jogo.sala = sala;
        jogo.progresso.visitadas.add(sala.id);
        jogo.inimigos = inimigosDaSala(jogo, sala);
        jogo.projeteis = [];
        jogo.tiros = [];
        jogo.arena = null;
        jogo.cameos = jogo.nivel.cameos
            .filter((c) => c.sala === sala.idx && (c.final || !jogo.progresso.fugas.has(c.id)))
            .map((c) => ({ ...c, estado: 'parado', t: 0 }));
        // Vertical: a nova sala fica em cima ou embaixo da anterior (o jogo não congela).
        const j = jogo.jogador;
        const vertical = !!anterior && !!j && (j.y + A / 2 < anterior.px.y || j.y + A / 2 > anterior.px.y + anterior.px.h);
        jogo.eventos.push({ tipo: 'sala', de: anterior ? anterior.id : null, para: sala.id, vertical, areaNova: !anterior || anterior.area !== sala.area });
    }

    function inimigosDaSala(jogo, sala) {
        const lista = [];
        sala.inimigos.forEach((d, i) => {
            if (!jogo.mortos.has(d.id)) lista.push(Inimigos.criar(d, ((i * 0.618) % 1)));
        });
        if (sala.chefeDef && !jogo.progresso.chefes.has(sala.chefeDef.id)) {
            const chefe = Inimigos.criar(sala.chefeDef, 0.5);
            chefe.chaoY = sala.chefeDef.chaoY;
            lista.push(chefe);
        }
        const sombra = jogo.progresso.sombra;
        if (sombra && sombra.sala === sala.id) {
            lista.push(Inimigos.criar({ id: 'sombra', tipo: 'sombra', x: sombra.x, y: sombra.y }, 0.3));
        }
        return lista;
    }

    /** Folga para trocar de sala: evita ficar trocando para lá e para cá bem na divisa. */
    const FOLGA_SALA = 12;

    function verificarSala(jogo) {
        const j = jogo.jogador;
        const cx = j.x + L / 2;
        const cy = j.y + A / 2;
        const idx = salaEm(jogo.nivel, cx, cy);
        if (idx < 0 || idx === jogo.sala.idx) return;
        // Só troca quando o centro já passou da divisa com folga (pulo de parede
        // perto da divisa não fica indo e voltando entre as duas salas).
        const s = jogo.sala.px;
        const fora = cx < s.x - FOLGA_SALA || cx > s.x + s.w + FOLGA_SALA || cy < s.y - FOLGA_SALA || cy > s.y + s.h + FOLGA_SALA;
        if (!fora) return;
        entrarSala(jogo, jogo.nivel.salas[idx]);
    }

    function contexto(jogo, mundo, novos) {
        const j = jogo.jogador;
        const sala = jogo.sala.px;
        return {
            T,
            tempo: jogo.tempo,
            alvo: { x: j.x + L / 2, y: j.y + A / 2 },
            sala,
            rng: jogo.rng,
            solido: (tx, ty) => solido(mundo, tx, ty),
            tileEm: (tx, ty) => tileEm(jogo.nivel, tx, ty),
            mover: (e, dx, dy) => moverCaixa(mundo, e, dx, dy),
            projetil: (p) => jogo.projeteis.push({ ...p }),
            invocar: (tipo, x, y) => {
                const n = Inimigos.criar({ id: null, tipo, x, y }, jogo.rng());
                n.estado = 'caca';
                novos.push(n);
                jogo.eventos.push({ tipo: 'invocou', x, y });
            },
            evento: (ev) => jogo.eventos.push(ev),
            lugarLivre: (cx, cy, rmin, rmax, w, h) => {
                for (let i = 0; i < 16; i++) {
                    const a = jogo.rng() * Math.PI * 2;
                    const r = rmin + jogo.rng() * (rmax - rmin);
                    const x = cx + Math.cos(a) * r - w / 2;
                    const y = cy + Math.sin(a) * r * 0.6 - h / 2 - 20;
                    if (x < sala.x + T || y < sala.y + T || x + w > sala.x + sala.w - T || y + h > sala.y + sala.h - T) continue;
                    if (caixaLivre(mundo, x, y, w, h)) return { x, y };
                }
                return null;
            },
            contar: (tipo) => {
                let n = 0;
                for (const i of jogo.inimigos) if (i.vivo && i.tipo === tipo) n++;
                for (const i of novos) if (i.tipo === tipo) n++;
                return n;
            },
        };
    }

    function caixaLivre(mundo, x, y, w, h) {
        for (let ty = Math.floor(y / T); ty <= Math.floor((y + h) / T); ty++) {
            for (let tx = Math.floor(x / T); tx <= Math.floor((x + w) / T); tx++) if (solido(mundo, tx, ty)) return false;
        }
        return true;
    }

    /** Move uma caixa de inimigo com colisão nos tiles. */
    function moverCaixa(mundo, e, dx, dy) {
        const r = { esq: false, dir: false, chao: false, teto: false };
        if (dx) {
            e.x += dx;
            const y0 = e.y + 0.5;
            const y1 = e.y + e.h - 0.5;
            if (dx > 0) {
                const tx = Math.floor((e.x + e.w - 0.001) / T);
                if (paredeNaColuna(mundo, tx, y0, y1)) { e.x = tx * T - e.w; r.dir = true; }
            } else {
                const tx = Math.floor(e.x / T);
                if (paredeNaColuna(mundo, tx, y0, y1)) { e.x = (tx + 1) * T; r.esq = true; }
            }
        }
        if (dy) {
            const antes = e.y + e.h;
            e.y += dy;
            const x0 = Math.floor((e.x + 0.5) / T);
            const x1 = Math.floor((e.x + e.w - 0.5) / T);
            if (dy > 0) {
                const ty = Math.floor((e.y + e.h - 0.001) / T);
                for (let tx = x0; tx <= x1; tx++) {
                    if (solido(mundo, tx, ty) || (!e.voa && tileEm(mundo.nivel, tx, ty) === '=' && antes <= ty * T + 0.01)) {
                        e.y = ty * T - e.h;
                        r.chao = true;
                        break;
                    }
                }
            } else {
                const ty = Math.floor(e.y / T);
                for (let tx = x0; tx <= x1; tx++) {
                    if (solido(mundo, tx, ty)) { e.y = (ty + 1) * T; r.teto = true; break; }
                }
            }
        }
        return r;
    }

    // ------------------------------------------------------------ combate

    function ferirInimigo(jogo, en, dano, dx, dy, golpe = false) {
        en.vida -= dano;
        en.flash = 0.12;
        const peso = Inimigos.TIPOS[en.tipo].peso || 1;
        if (en.voa) {
            en.vx += (dx * 200) / peso;
            en.vy += (dy * 200) / peso;
        } else if (dx) {
            en.kx = (dx * 230) / peso;
        }
        jogo.eventos.push({ tipo: 'acerto', x: en.x + en.w / 2, y: en.y + en.h / 2, chefe: en.chefe, golpe });
        if (en.vida <= 0) matarInimigo(jogo, en);
    }

    function matarInimigo(jogo, en) {
        en.vivo = false;
        const p = jogo.progresso;
        const x = en.x + en.w / 2;
        const y = en.y + en.h / 2;
        if (en.tipo === 'sombra') {
            const valor = p.sombra ? p.sombra.virgulas : 0;
            p.virgulas += valor;
            p.sombra = null;
            jogo.eventos.push({ tipo: 'sombraDerrotada', x, y, virgulas: valor });
            return;
        }
        const valor = (Inimigos.TIPOS[en.tipo].virgulas || 0) + (en.roubo || 0);
        p.virgulas += valor;
        if (en.chefe) {
            p.chefes.add(en.id);
            jogo.arena = null;
            for (const outro of jogo.inimigos) if (outro !== en && outro.vivo && !outro.id) outro.vivo = false;
            jogo.projeteis = [];
            jogo.eventos.push({ tipo: 'chefeDerrotado', chefe: en.tipo, x, y, virgulas: valor });
            if (en.tipo === 'opressor') jogo.fimEm = jogo.tempo + 3;
            return;
        }
        if (en.id) jogo.mortos.add(en.id);
        jogo.eventos.push({ tipo: 'derrubou', inimigo: en.tipo, x, y, virgulas: valor });
    }

    function ferirJogador(jogo, dano, fonteX) {
        const j = jogo.jogador;
        if (j.invencivel > 0 || jogo.fase !== 'jogando') return false;
        j.vida -= dano;
        j.invencivel = CONFIG.invencivel;
        j.atordoado = CONFIG.atordoadoDano;
        const lado = j.x + L / 2 < fonteX ? -1 : 1;
        j.recuo = CONFIG.atordoadoDano;
        j.recuoVx = lado * CONFIG.empurraoDano;
        j.vx = j.recuoVx;
        j.vy = -300;
        j.noChao = false;
        if (j.estado !== 'normal') j.estado = 'normal';
        j.golpe = null;
        j.degustarT = 0;
        jogo.eventos.push({ tipo: 'dano', x: j.x + L / 2, y: j.y + A / 2 });
        if (j.vida <= 0) morrer(jogo);
        return true;
    }

    function morrer(jogo) {
        const j = jogo.jogador;
        const p = jogo.progresso;
        jogo.fase = 'morto';
        jogo.faseT = 0;
        p.mortes++;
        if (usa(jogo, 'vidro')) {
            p.equipadas = p.equipadas.filter((f) => f !== 'vidro');
            p.figurinhas.delete('vidro');
            p.quebradas.add('vidro');
            jogo.eventos.push({ tipo: 'figurinhaQuebrou', figurinha: 'vidro', x: j.x + L / 2, y: j.y });
        }
        if (p.virgulas > 0) {
            p.sombra = { sala: jogo.sala.id, x: Math.max(jogo.sala.px.x + T, Math.min(j.x, jogo.sala.px.x + jogo.sala.px.w - 2 * T)), y: Math.max(jogo.sala.px.y + T, Math.min(j.y - 10, jogo.sala.px.y + jogo.sala.px.h - 3 * T)), virgulas: p.virgulas };
            p.virgulas = 0;
        }
        jogo.eventos.push({ tipo: 'morte', x: j.x + L / 2, y: j.y + A / 2 });
    }

    function renascerNoBanco(jogo) {
        jogo.mortos.clear();
        jogo.caidas.clear();
        jogo.arena = null;
        const banco = bancoSalvo(jogo);
        if (banco) {
            posicionarNoBanco(jogo, banco);
            jogo.fase = 'sentado';
        } else {
            jogo.jogador = criarJogador(jogo.nivel.inicio);
            jogo.jogador.vida = vidaTotal(jogo);
            jogo.sala = null;
            entrarSala(jogo, jogo.nivel.salas[jogo.nivel.inicio.sala]);
            jogo.fase = 'jogando';
        }
        jogo.eventos.push({ tipo: 'renasceu' });
    }

    function sentar(jogo, banco) {
        const j = jogo.jogador;
        j.x = banco.x + banco.w / 2 - L / 2;
        j.vx = 0;
        j.vy = 0;
        j.estado = 'normal';
        j.vida = vidaTotal(jogo);
        jogo.progresso.banco = banco.id;
        jogo.mortos.clear();
        jogo.inimigos = inimigosDaSala(jogo, jogo.sala);
        jogo.projeteis = [];
        jogo.tiros = [];
        jogo.fase = 'sentado';
        jogo.eventos.push({ tipo: 'banco', id: banco.id, x: banco.x + banco.w / 2, y: banco.y });
    }

    function iniciarGolpe(jogo, e) {
        const j = jogo.jogador;
        let lado = j.olhando;
        if (!j.noChao && j.parede !== 0 && jogo.progresso.habilidades.has('parede')) lado = -j.parede;
        const h = (e.direita ? 1 : 0) - (e.esquerda ? 1 : 0);
        const gy = e.cima ? -1 : e.baixo ? 1 : 0;
        // Grudado na parede não dá para bater nela: a direção vira para fora.
        const gx = gy === 0 ? lado : (h === 0 || (j.parede !== 0 && h === j.parede && !j.noChao) ? 0 : h);
        if (gx !== 0) lado = gx;
        const dir = gy === 0 ? 'frente' : gx === 0 ? (gy < 0 ? 'cima' : 'baixo') : (gy < 0 ? 'cimaDiag' : 'baixoDiag');
        j.golpe = { dir, gx, gy, lado, noChao: j.noChao, longo: usa(jogo, 'coronha'), t: 0, atingidos: new Set(), paredes: new Set(), pogou: false };
        j.recargaGolpe = CONFIG.golpeRecarga;
        jogo.eventos.push({ tipo: 'golpe', dir, gx, gy, lado, x: j.x + L / 2, y: j.y + A / 2 });
    }

    const danoGolpe = (jogo) => CONFIG.danoGolpe * (jogo.progresso.loja.has('fita') ? 2 : 1)
        * (usa(jogo, 'pimenta') && jogo.jogador.vida === 1 ? 2 : 1);

    /** Janela ativa da coronhada: acerta inimigos, paredes rachadas, alavancas e faz pogo. */
    function atualizarGolpe(jogo, mundo, dt) {
        const j = jogo.jogador;
        const g = j.golpe;
        if (!g) return false;
        g.t += dt;
        if (g.t > CONFIG.golpeVisual) { j.golpe = null; return false; }
        if (g.t > CONFIG.golpeAtivo) return false;
        const hb = caixaGolpe(j, g);
        let pogo = false;
        const dx = g.gx;
        const dy = g.gy;
        const quica = g.gy > 0 && !g.noChao;   // golpe para baixo (ou diagonal baixa) no ar faz pogo
        for (const en of jogo.inimigos) {
            if (!en.vivo || en.intangivel || g.atingidos.has(en) || !colide(hb, en)) continue;
            if (en.chefe && jogo.arena == null) continue;
            g.atingidos.add(en);
            const bloqueio = en.escudo && g.gx !== 0 && g.gy <= 0 && Math.sign(j.x + L / 2 - (en.x + en.w / 2)) === en.dir;
            if (bloqueio) {
                jogo.eventos.push({ tipo: 'bloqueio', x: en.x + en.w / 2 + en.dir * 10, y: en.y + en.h / 2 });
                j.recuo = 0.15;
                j.recuoVx = -g.lado * 260;
                continue;
            }
            ferirInimigo(jogo, en, danoGolpe(jogo), dx, dy, true);
            j.pontuacao = Math.min(pontuacaoTotal(jogo.progresso), j.pontuacao + CONFIG.pontuacaoPorGolpe);
            if (quica) pogo = true;
            else if (g.gy === 0) { j.recuo = CONFIG.recuoTempo; j.recuoVx = -g.lado * CONFIG.recuoGolpe; }
        }
        for (const p of jogo.projeteis) {
            if (p.tipo === 'magia' && !p.fim && colideCirculo(hb, p.x, p.y, p.r)) {
                p.fim = true;
                jogo.eventos.push({ tipo: 'rebateu', x: p.x, y: p.y });
            }
        }
        if (quica && !g.pogou && perigoNaCaixa(jogo.nivel, hb, jogo.tempo, true)) pogo = true;
        // Paredes rachadas.
        const nivel = jogo.nivel;
        for (let ty = Math.floor(hb.y / T); ty <= Math.floor((hb.y + hb.h) / T); ty++) {
            for (let tx = Math.floor(hb.x / T); tx <= Math.floor((hb.x + hb.w) / T); tx++) {
                if (tileEm(nivel, tx, ty) !== 'B') continue;
                const id = nivel.grupoB.get(ty * nivel.largura + tx);
                if (jogo.progresso.quebrados.has(id) || g.paredes.has(id)) continue;
                g.paredes.add(id);
                const vida = (jogo.vidaParedes.get(id) ?? CONFIG.vidaParede) - 1;
                jogo.vidaParedes.set(id, vida);
                if (g.gy === 0) { j.recuo = CONFIG.recuoTempo; j.recuoVx = -g.lado * CONFIG.recuoGolpe; }
                if (quica) pogo = true;
                if (vida <= 0) {
                    jogo.progresso.quebrados.add(id);
                    jogo.eventos.push({ tipo: 'paredeQuebrou', x: tx * T + T / 2, y: ty * T + T / 2 });
                } else {
                    jogo.eventos.push({ tipo: 'paredeRachou', x: tx * T + T / 2, y: ty * T + T / 2 });
                }
            }
        }
        // Alavancas.
        for (const a of nivel.alavancas) {
            if (a.sala !== jogo.sala.idx || !colide(hb, a)) continue;
            const salaId = jogo.sala.id;
            if (!jogo.progresso.abertos.has(salaId)) {
                jogo.progresso.abertos.add(salaId);
                jogo.eventos.push({ tipo: 'alavanca', x: a.x + a.w / 2, y: a.y });
            }
        }
        if (pogo && !g.pogou) {
            g.pogou = true;
            j.vy = CONFIG.pogoImpulso;
            j.semCorte = true;
            j.noChao = false;
            renovarAr(j);
            jogo.eventos.push({ tipo: 'pogo', x: j.x + L / 2, y: j.y + A });
            return true;
        }
        return false;
    }

    function lancarRajada(jogo) {
        const j = jogo.jogador;
        const hab = jogo.progresso.habilidades;
        j.pontuacao -= CONFIG.custoMagia;
        j.recargaMagia = CONFIG.rajadaRecarga;
        const lado = !j.noChao && j.parede !== 0 && hab.has('parede') ? -j.parede : j.olhando;
        const x = lado > 0 ? j.x + L : j.x - 30;
        jogo.tiros.push({ x, y: j.y + 4, w: 30, h: 16, vx: lado * CONFIG.rajadaVelocidade, andou: 0, atingidos: new Set() });
        j.recuo = 0.08;
        j.recuoVx = -lado * 100;
        jogo.eventos.push({ tipo: 'rajada', x: x + 15, y: j.y + 12, lado });
    }

    function atualizarTiros(jogo, mundo, dt) {
        for (const b of jogo.tiros) {
            const passo = b.vx * dt;
            b.x += passo;
            b.andou += Math.abs(passo);
            const frente = b.vx > 0 ? b.x + b.w : b.x;
            if (b.andou > CONFIG.rajadaAlcance || solido(mundo, Math.floor(frente / T), Math.floor((b.y + b.h / 2) / T))) {
                b.fim = true;
                jogo.eventos.push({ tipo: 'faisca', x: frente, y: b.y + b.h / 2 });
                continue;
            }
            for (const en of jogo.inimigos) {
                if (!en.vivo || en.intangivel || b.atingidos.has(en) || !colide(b, en)) continue;
                if (en.chefe && jogo.arena == null) continue;
                b.atingidos.add(en);
                ferirInimigo(jogo, en, CONFIG.rajadaDano, Math.sign(b.vx), 0);
            }
        }
        jogo.tiros = jogo.tiros.filter((b) => !b.fim);
    }

    function atualizarProjeteis(jogo, mundo, dt) {
        const j = jogo.jogador;
        const alvo = { x: j.x + L / 2, y: j.y + A / 2 };
        const s = jogo.sala.px;
        for (const p of jogo.projeteis) {
            if (p.fim) continue;
            if (p.espera > 0) { p.espera -= dt; continue; }
            if (p.guiado) {
                const dx = alvo.x - p.x;
                const dy = alvo.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                const k = Math.min(1, 1.6 * dt);
                p.vx += ((dx / d) * p.guiado - p.vx) * k;
                p.vy += ((dy / d) * p.guiado - p.vy) * k;
            }
            if (p.gravidade) p.vy += p.gravidade * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vida -= dt;
            if (p.vida <= 0) p.fim = true;
            if (!p.atravessa) {
                if (p.chao) {
                    const frente = p.vx > 0 ? p.x + p.w : p.x;
                    if (solido(mundo, Math.floor(frente / T), Math.floor((p.y + p.h / 2) / T))) p.fim = true;
                    else if (!solido(mundo, Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 2) / T))) p.fim = true;
                } else if (p.r) {
                    if (solido(mundo, Math.floor(p.x / T), Math.floor(p.y / T))) { p.fim = true; jogo.eventos.push({ tipo: 'respingo', x: p.x, y: p.y }); }
                }
            }
            if (p.x < s.x - 200 || p.x > s.x + s.w + 200 || p.y < s.y - 200 || p.y > s.y + s.h + 200) p.fim = true;
        }
        jogo.projeteis = jogo.projeteis.filter((p) => !p.fim);
    }

    function colisoesComInimigos(jogo) {
        const j = jogo.jogador;
        const cj = caixaPerigo(j);
        // Mergulhando não leva dano; com a Capa Remendada, o dash também protege.
        if (j.estado === 'mergulho' || (j.estado === 'dash' && usa(jogo, 'capa'))) return;
        for (const en of jogo.inimigos) {
            if (!en.vivo || en.intangivel) continue;
            if (en.chefe && jogo.arena == null) continue;
            const corpo = { x: en.x + 1, y: en.y + 1, w: en.w - 2, h: en.h - 2 };
            if (en.dano > 0 && (colide(cj, corpo) || (en.ataque && colide(cj, en.ataque)))) {
                if (ferirJogador(jogo, en.dano, en.x + en.w / 2)) {
                    if (Inimigos.TIPOS[en.tipo].ladrao && !en.roubo && jogo.progresso.virgulas > 0) {
                        // Golpista do Pix: leva vírgulas e foge; derrubado, devolve.
                        en.roubo = Math.min(jogo.progresso.virgulas, 25);
                        jogo.progresso.virgulas -= en.roubo;
                        en.estado = 'fugir';
                        en.t = 0;
                        jogo.eventos.push({ tipo: 'roubo', x: en.x + en.w / 2, y: en.y, valor: en.roubo });
                    }
                    return;
                }
            }
        }
        for (const p of jogo.projeteis) {
            if (p.espera > 0 || p.fim) continue;
            const acertou = p.r ? colideCirculo(cj, p.x, p.y, p.r) : colide(cj, p);
            if (!acertou) continue;
            if (p.r) p.fim = true;
            if (ferirJogador(jogo, 1, p.x + (p.w || 0) / 2)) return;
        }
    }

    function atingidoPorPerigo(jogo, causa) {
        const j = jogo.jogador;
        if (j.invencivel <= 0) {
            j.vida -= 1;
            jogo.eventos.push({ tipo: 'dano', perigo: causa, x: j.x + L / 2, y: j.y + A / 2 });
        }
        if (j.vida <= 0) { morrer(jogo); return; }
        jogo.fase = 'perigo';
        jogo.faseT = 0;
        jogo.teleportou = false;
        j.golpe = null;
        jogo.eventos.push({ tipo: 'perigo', causa, x: j.x + L / 2, y: j.y + A / 2 });
    }

    function coletar(jogo) {
        const j = jogo.jogador;
        const p = jogo.progresso;
        const cj = caixa(j);
        const ima = usa(jogo, 'ima');
        const R = CONFIG.imaRaio;
        const perto = { x: j.x - R, y: j.y - R, w: L + 2 * R, h: A + 2 * R };
        for (const it of jogo.nivel.itens) {
            if (it.sala !== jogo.sala.idx || p.coletados.has(it.id)) continue;
            if (it.premioDe && !p.chefes.has(it.premioDe)) continue;
            if (!colide(cj, it) && !(ima && it.tipo === 'virgulas' && colide(perto, it))) continue;
            p.coletados.add(it.id);
            if (it.tipo === 'virgulas') {
                p.virgulas += it.valor;
                jogo.eventos.push({ tipo: 'virgulas', x: it.x + it.w / 2, y: it.y, valor: it.valor });
            } else if (it.tipo === 'fragmento') {
                adicionarFragmento(jogo, it.x + it.w / 2, it.y);
            } else if (it.tipo === 'copo') {
                adicionarCopo(jogo, it.x + it.w / 2, it.y);
            } else if (it.tipo === 'figurinha') {
                ganharFigurinha(jogo, it.figurinha, it.x + it.w / 2, it.y);
            } else if (it.tipo === 'habilidade') {
                p.habilidades.add(it.habilidade);
                jogo.fase = 'pegou';
                jogo.pegou = it.habilidade;
                j.golpe = null;
                jogo.eventos.push({ tipo: 'habilidade', habilidade: it.habilidade, x: it.x + it.w / 2, y: it.y });
                return;
            }
        }
    }

    function adicionarCopo(jogo, x, y) {
        const p = jogo.progresso;
        p.copos = Math.min(CONFIG.copos * CONFIG.pedacosPorCopo, p.copos + 1);
        const completo = p.copos % CONFIG.pedacosPorCopo === 0;
        if (completo) jogo.jogador.pontuacao = pontuacaoTotal(p);
        jogo.eventos.push({ tipo: completo ? 'copoCompleto' : 'copo', x, y, copos: p.copos });
    }

    function ganharFigurinha(jogo, id, x, y) {
        const p = jogo.progresso;
        p.figurinhas.add(id);
        p.quebradas.delete(id);
        jogo.eventos.push({ tipo: 'figurinha', figurinha: id, x, y });
    }

    /** Encaixes livres no Álbum (cada figurinha usa 1). */
    const encaixesLivres = (p) => p.encaixes - p.equipadas.length;

    /** Põe ou tira uma figurinha do Álbum (só com o Álbum aberto, no banco). 'ok', 'cheio', 'naoTem' ou 'longe'. */
    function trocarFigurinha(jogo, id) {
        const p = jogo.progresso;
        if (jogo.fase !== 'album') return 'longe';
        if (!p.figurinhas.has(id)) return 'naoTem';
        const vidaAntes = vidaTotal(jogo);
        if (p.equipadas.includes(id)) p.equipadas = p.equipadas.filter((f) => f !== id);
        else if (encaixesLivres(p) <= 0) return 'cheio';
        else p.equipadas = [...p.equipadas, id];
        // No banco a vida fica cheia (o Cogumelo de Vidro entra ou sai junto).
        if (vidaTotal(jogo) !== vidaAntes) jogo.jogador.vida = vidaTotal(jogo);
        jogo.eventos.push({ tipo: 'album', figurinha: id, equipada: p.equipadas.includes(id) });
        return 'ok';
    }

    /** Sentado no banco, abre o Álbum de figurinhas. */
    function abrirAlbum(jogo) {
        if (jogo.fase === 'sentado') { jogo.fase = 'album'; jogo.eventos.push({ tipo: 'abriuAlbum' }); }
    }
    function fecharAlbum(jogo) {
        if (jogo.fase === 'album') jogo.fase = 'sentado';
    }

    function adicionarFragmento(jogo, x, y) {
        const p = jogo.progresso;
        p.fragmentos++;
        if (p.fragmentos >= 4) {
            p.fragmentos -= 4;
            p.vidaMax = Math.min(CONFIG.vidaMaxima, p.vidaMax + 1);
            jogo.jogador.vida = vidaTotal(jogo);
            jogo.eventos.push({ tipo: 'cogumeloNovo', x, y });
        } else {
            jogo.eventos.push({ tipo: 'fragmento', x, y, fragmentos: p.fragmentos });
        }
    }

    /** Onde o Degustador precisa estar para usar um banco ou a loja com ↑. */
    const zonaDeUso = (b) => ({ x: b.x - 12, y: b.y - 24, w: b.w + 24, h: b.h + 24 });

    /** ↑ perto de banco ou loja. */
    function interagir(jogo) {
        const j = jogo.jogador;
        if (!j.noChao || j.estado !== 'normal') return;
        const cj = caixa(j);
        for (const b of jogo.nivel.bancos) {
            if (b.sala === jogo.sala.idx && colide(cj, zonaDeUso(b))) { sentar(jogo, b); return; }
        }
        for (const l of jogo.nivel.lojas) {
            if (l.sala === jogo.sala.idx && colide(cj, zonaDeUso(l))) {
                jogo.fase = 'loja';
                jogo.vendedor = l.vendedor;
                jogo.eventos.push({ tipo: 'loja', vendedor: l.vendedor });
                return;
            }
        }
    }

    /** O que a loja do vendedor mostra agora (itens "depois" de um chefe só aparecem depois dele). */
    function itensDaLoja(jogo, vendedor = jogo.vendedor || 'italolol') {
        const p = jogo.progresso;
        return (LOJAS[vendedor] || []).filter((i) => (!i.depois || p.chefes.has(i.depois)) && (!i.repoe || p.quebradas.has(i.repoe)));
    }

    /** Compra na loja: 'ok', 'caro', 'comprado' ou 'inexistente'. */
    function comprar(jogo, id) {
        const p = jogo.progresso;
        const item = itensDaLoja(jogo).find((i) => i.id === id);
        if (!item) return 'inexistente';
        if (p.loja.has(id) && !item.repoe) return 'comprado';
        if (p.virgulas < item.preco) return 'caro';
        p.virgulas -= item.preco;
        if (!item.repoe) p.loja.add(id);
        const j = jogo.jogador;
        if (id === 'cogumelo') {
            p.vidaMax = Math.min(CONFIG.vidaMaxima, p.vidaMax + 1);
            j.vida = vidaTotal(jogo);
            jogo.eventos.push({ tipo: 'cogumeloNovo', x: j.x + L / 2, y: j.y });
        }
        if (item.encaixe) p.encaixes = Math.min(CONFIG.encaixesMax, p.encaixes + 1);
        if (item.copo) adicionarCopo(jogo, j.x + L / 2, j.y);
        if (item.figurinha) ganharFigurinha(jogo, item.figurinha, j.x + L / 2, j.y);
        if (item.repoe) ganharFigurinha(jogo, item.repoe, j.x + L / 2, j.y);
        jogo.eventos.push({ tipo: 'comprou', item: id });
        return 'ok';
    }

    function sairLoja(jogo) {
        if (jogo.fase === 'loja') { jogo.fase = 'jogando'; jogo.vendedor = null; }
    }

    /** Fecha a tela de habilidade nova e volta ao jogo. */
    function continuar(jogo) {
        if (jogo.fase === 'pegou') { jogo.fase = 'jogando'; jogo.pegou = null; }
    }

    function atualizarCameos(jogo, dt) {
        const j = jogo.jogador;
        for (const c of jogo.cameos) {
            if (c.final) continue;
            c.t += dt;
            if (c.estado === 'parado') {
                if (Math.abs(j.x - (c.x + c.w / 2)) < 130 && Math.abs(j.y - c.y) < 90) {
                    c.estado = 'fugindo';
                    c.t = 0;
                    jogo.eventos.push({ tipo: 'fugiu', x: c.x + c.w / 2, y: c.y });
                }
            } else if (c.estado === 'fugindo') {
                c.x += 270 * dt;
                c.y -= Math.max(0, 240 - c.t * 500) * dt;
                if (c.t > 1.1) { c.estado = 'sumiu'; jogo.progresso.fugas.add(c.id); }
            }
        }
    }

    const PISO_ESTAVEL = new Set(['#', 'X', 'r']);

    /** Último lugar seguro (para voltar depois de encostar em espinho). */
    function atualizarSeguro(jogo, mundo) {
        const j = jogo.jogador;
        if (!j.noChao || j.estado !== 'normal' || j.plataforma >= 0 || jogo.arena != null) return;
        const nivel = jogo.nivel;
        const ty = Math.floor((j.y + A + 1) / T);
        const x0 = Math.floor(j.x / T);
        const x1 = Math.floor((j.x + L) / T);
        for (let tx = x0; tx <= x1; tx++) {
            if (!PISO_ESTAVEL.has(tileEm(nivel, tx, ty)) || !solido(mundo, tx, ty)) return;
        }
        const perto = { x: j.x - T, y: j.y - T, w: L + 2 * T, h: A + T + 4 };
        if (perigoNaCaixa(nivel, perto, jogo.tempo, true)) return;
        for (const s of nivel.serras) {
            const p = posSerra(s, jogo.tempo);
            if (Math.hypot(p.x - (j.x + L / 2), p.y - (j.y + A / 2)) < 110) return;
        }
        j.seguro = { x: j.x, y: j.y };
    }

    function atualizarTelhas(jogo, dt) {
        for (const [k, s] of jogo.caidas) {
            s.t += dt;
            if (!s.caiu && s.t >= CONFIG.tempoTelha) s.caiu = true;
            if (s.caiu && s.t >= CONFIG.tempoTelha + CONFIG.voltaTelha) {
                const [tx, ty] = k.split(',').map(Number);
                if (!colide(caixa(jogo.jogador), { x: tx * T, y: ty * T, w: T, h: T })) jogo.caidas.delete(k);
            }
        }
    }

    function atualizarInimigos(jogo, mundo, dt) {
        const novos = [];
        const c = contexto(jogo, mundo, novos);
        for (const en of jogo.inimigos) {
            if (!en.vivo) continue;
            en.flash = Math.max(0, en.flash - dt);
            if (en.chefe && jogo.arena == null) continue;
            Inimigos.TIPOS[en.tipo].atualizar(en, c, dt);
            if (!en.voa && en.y > jogo.nivel.alturaPx + 40) {
                // Caiu fora do mundo: some como os derrotados, mas sem virgulas nem evento.
                en.vivo = false;
                if (en.id) jogo.mortos.add(en.id);
            }
        }
        if (novos.length) jogo.inimigos.push(...novos);
        if (jogo.inimigos.length > 40) jogo.inimigos = jogo.inimigos.filter((e) => e.vivo);
    }

    /** Pouso da Queda de Bigorna: acerta quem estiver em volta dos pés. */
    function impactoMergulho(jogo) {
        const j = jogo.jogador;
        const cx = j.x + L / 2;
        const cy = j.y + A;
        const R = CONFIG.mergulhoRaio;
        for (const en of jogo.inimigos) {
            if (!en.vivo || en.intangivel || (en.chefe && jogo.arena == null)) continue;
            if (!colideCirculo(en, cx, cy - 8, R)) continue;
            ferirInimigo(jogo, en, CONFIG.mergulhoDano * (usa(jogo, 'pimenta') && j.vida === 1 ? 2 : 1), Math.sign(en.x + en.w / 2 - cx) || 1, -1);
        }
        jogo.eventos.push({ tipo: 'impacto', x: cx, y: cy, forte: true, mergulho: true });
    }

    /** Buzz!: acerta uma vez cada inimigo que atravessar. */
    function atropelarNoBuzz(jogo) {
        const j = jogo.jogador;
        const cj = caixa(j);
        j.buzzAtingidos = j.buzzAtingidos || new Set();
        for (const en of jogo.inimigos) {
            if (!en.vivo || en.intangivel || j.buzzAtingidos.has(en) || (en.chefe && jogo.arena == null) || !colide(cj, en)) continue;
            j.buzzAtingidos.add(en);
            ferirInimigo(jogo, en, CONFIG.buzzDano, j.dashLado, 0);
        }
    }

    /** Liga a arena quando o Degustador entra de vez na sala do chefe. */
    function verificarArena(jogo) {
        const sala = jogo.sala;
        if (!sala.chefeDef || jogo.arena != null || jogo.progresso.chefes.has(sala.chefeDef.id)) return;
        const chefe = jogo.inimigos.find((e) => e.chefe && e.vivo);
        if (!chefe) return;
        const j = jogo.jogador;
        const px = sala.px;
        if (j.x > px.x + 2 * T && j.x + L < px.x + px.w - 2 * T && j.y > px.y + T && j.y + A < px.y + px.h) {
            jogo.arena = sala.idx;
            jogo.eventos.push({ tipo: 'arena', chefe: chefe.tipo });
        }
    }

    function consumir(e) {
        e.puloPedido = false;
        e.golpePedido = false;
        e.magiaPedido = false;
        e.dashPedido = false;
        e.cimaPedido = false;
    }

    /** Um passo fixo da partida. */
    function passo(jogo, e, dt) {
        // O relógio do mundo só corre com o Degustador em jogo: nas outras telas
        // (sentado, perigo, morto…) as serras e plataformas móveis ficam paradas.
        if (jogo.fase === 'jogando') jogo.tempo += dt;
        const j = jogo.jogador;
        if (jogo.fimEm && jogo.tempo >= jogo.fimEm && jogo.fase !== 'final') {
            jogo.fase = 'final';
            jogo.progresso.final = true;
            jogo.fimEm = 0;
            jogo.eventos.push({ tipo: 'final' });
        }
        switch (jogo.fase) {
            case 'perigo':
                jogo.faseT += dt;
                if (jogo.faseT >= CONFIG.tempoPerigo / 2 && !jogo.teleportou) {
                    jogo.teleportou = true;
                    j.x = j.seguro.x;
                    j.y = j.seguro.y;
                    j.vx = 0;
                    j.vy = 0;
                    j.estado = 'normal';
                    j.golpe = null;
                    j.noChao = true;
                    jogo.caidas.clear();
                }
                if (jogo.faseT >= CONFIG.tempoPerigo) {
                    jogo.fase = 'jogando';
                    j.invencivel = Math.max(j.invencivel, 0.5);
                }
                consumir(e);
                return;
            case 'morto':
                jogo.faseT += dt;
                if (jogo.faseT >= CONFIG.tempoMorte) renascerNoBanco(jogo);
                consumir(e);
                return;
            case 'sentado':
                jogo.progresso.tempo += dt;
                if (e.cimaPedido) {
                    abrirAlbum(jogo);
                } else if (e.esquerda || e.direita || e.puloPedido || e.baixo || e.golpePedido) {
                    jogo.fase = 'jogando';
                    jogo.eventos.push({ tipo: 'levantou' });
                }
                consumir(e);
                return;
            case 'jogando':
                break;
            default:
                consumir(e);
                return;
        }
        jogo.progresso.tempo += dt;
        const mundo = mundoDo(jogo);
        const hab = jogo.progresso.habilidades;
        j.invencivel = Math.max(0, j.invencivel - dt);
        j.recargaGolpe = Math.max(0, j.recargaGolpe - dt);
        j.recargaMagia = Math.max(0, j.recargaMagia - dt);
        atualizarTelhas(jogo, dt);

        // Degustar: segurar para comer um lanche e curar 1 cogumelo.
        const tempoDegustar = jogo.progresso.loja.has('lanche') ? CONFIG.tempoDegustarRapido : CONFIG.tempoDegustar;
        const coxinha = usa(jogo, 'coxinha');
        const custoCura = coxinha ? CONFIG.custoCoxinha : CONFIG.custoMagia;
        // Como no Hollow Knight, o dash interrompe a cura: perde a carga e só volta a curar
        // depois de soltar e segurar a tecla de novo.
        if (!e.degustar) j.soltarCura = false;
        if (j.estado === 'degustando' && e.dashPedido && (hab.has('dash') || hab.has('buzz'))) {
            j.estado = 'normal';
            j.degustarT = 0;
            j.soltarCura = true;
        }
        const podeDegustar = e.degustar && !j.soltarCura && j.noChao && j.pontuacao >= custoCura && j.vida < vidaTotal(jogo)
            && (j.estado === 'normal' || j.estado === 'degustando') && j.atordoado <= 0;
        if (podeDegustar) {
            if (j.estado !== 'degustando') jogo.eventos.push({ tipo: 'degustando', x: j.x + L / 2, y: j.y });
            j.estado = 'degustando';
            j.degustarT += dt;
            if (j.degustarT >= tempoDegustar) {
                j.degustarT = 0;
                j.pontuacao -= custoCura;
                const vidaAntes = j.vida;
                j.vida = Math.min(vidaTotal(jogo), j.vida + (coxinha ? 2 : 1));
                jogo.eventos.push({ tipo: 'curou', x: j.x + L / 2, y: j.y, de: vidaAntes, ate: j.vida });
            }
        } else if (j.estado === 'degustando') {
            j.estado = 'normal';
            j.degustarT = 0;
        }

        if (e.golpePedido && j.recargaGolpe <= 0 && j.estado === 'normal' && j.atordoado <= 0) iniciarGolpe(jogo, e);
        if (e.magiaPedido && hab.has('rajada') && j.pontuacao >= CONFIG.custoMagia && j.recargaMagia <= 0
            && (j.estado === 'normal' || j.estado === 'degustando') && j.atordoado <= 0) {
            if (j.estado === 'degustando') { j.estado = 'normal'; j.degustarT = 0; }
            lancarRajada(jogo);
        }

        for (const tipo of passoJogador(mundo, j, e, dt, jogo.tempo - dt)) {
            jogo.eventos.push({ tipo, x: j.x + L / 2, y: j.y + A, lado: j.olhando });
            if (tipo === 'pousoMergulho') impactoMergulho(jogo);
            if (tipo === 'buzz') j.buzzAtingidos = new Set();
        }
        if (j.estado === 'buzz') atropelarNoBuzz(jogo);
        const pogou = atualizarGolpe(jogo, mundo, dt);
        consumir(e);

        verificarSala(jogo);
        verificarArena(jogo);
        atualizarInimigos(jogo, mundo, dt);
        atualizarTiros(jogo, mundo, dt);
        atualizarProjeteis(jogo, mundo, dt);
        atualizarCameos(jogo, dt);

        if (!pogou) {
            const perigo = tocouPerigo(jogo.nivel, j, jogo.tempo);
            if (perigo) { atingidoPorPerigo(jogo, perigo); return; }
        }
        colisoesComInimigos(jogo);
        if (jogo.fase !== 'jogando') return;
        coletar(jogo);
        if (jogo.fase !== 'jogando') return;
        if (e.cimaAgora) interagir(jogo);
        atualizarSeguro(jogo, mundo);
    }

    /** Avança `dt` segundos em passos fixos (60 Hz e 144 Hz jogam igual). */
    function avancar(jogo, dt, entrada) {
        jogo.acumulado += Math.min(dt, 0.1);
        while (jogo.acumulado >= CONFIG.passo) {
            jogo.acumulado -= CONFIG.passo;
            // ↑ "de verdade" só no primeiro passo depois de apertar (interagir).
            entrada.cimaAgora = entrada.cimaPedido;
            passo(jogo, entrada, CONFIG.passo);
            entrada.cimaAgora = false;
        }
    }

    // ------------------------------------------------------------ save

    function exportarSave(jogo) {
        const p = jogo.progresso;
        return {
            v: 2,
            habilidades: [...p.habilidades], vidaMax: p.vidaMax, fragmentos: p.fragmentos, virgulas: p.virgulas,
            coletados: [...p.coletados], quebrados: [...p.quebrados], abertos: [...p.abertos], chefes: [...p.chefes],
            visitadas: [...p.visitadas], banco: p.banco, loja: [...p.loja], fugas: [...p.fugas], sombra: p.sombra,
            tempo: p.tempo, mortes: p.mortes, final: p.final,
            figurinhas: [...p.figurinhas], equipadas: [...p.equipadas], quebradas: [...p.quebradas], encaixes: p.encaixes, copos: p.copos,
        };
    }

    function importarSave(d) {
        const p = progressoNovo();
        if (!d || d.v !== 2) return p;
        const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
        p.habilidades = new Set(lista(d.habilidades).filter((h) => h in HABILIDADES));
        p.vidaMax = Math.max(CONFIG.vidaInicial, Math.min(CONFIG.vidaMaxima, Number(d.vidaMax) || CONFIG.vidaInicial));
        p.fragmentos = Math.max(0, Math.min(3, Number(d.fragmentos) || 0));
        p.virgulas = Math.max(0, Number(d.virgulas) || 0);
        p.coletados = new Set(lista(d.coletados));
        p.quebrados = new Set(lista(d.quebrados));
        p.abertos = new Set(lista(d.abertos));
        p.chefes = new Set(lista(d.chefes));
        p.visitadas = new Set(lista(d.visitadas));
        p.banco = typeof d.banco === 'string' ? d.banco : null;
        p.loja = new Set(lista(d.loja));
        p.fugas = new Set(lista(d.fugas));
        p.sombra = d.sombra && typeof d.sombra.sala === 'string' ? { sala: d.sombra.sala, x: Number(d.sombra.x) || 0, y: Number(d.sombra.y) || 0, virgulas: Number(d.sombra.virgulas) || 0 } : null;
        p.tempo = Number(d.tempo) || 0;
        p.mortes = Number(d.mortes) || 0;
        p.final = !!d.final;
        p.figurinhas = new Set(lista(d.figurinhas).filter((f) => f in FIGURINHAS));
        p.encaixes = Math.max(CONFIG.encaixesIniciais, Math.min(CONFIG.encaixesMax, Number(d.encaixes) || CONFIG.encaixesIniciais));
        p.equipadas = [...new Set(lista(d.equipadas).filter((f) => p.figurinhas.has(f)))].slice(0, p.encaixes);
        p.quebradas = new Set(lista(d.quebradas).filter((f) => f in FIGURINHAS));
        p.copos = Math.max(0, Math.min(CONFIG.copos * CONFIG.pedacosPorCopo, Math.floor(Number(d.copos) || 0)));
        return p;
    }

    return {
        CONFIG,
        HABILIDADES,
        LOJA,
        LOJAS,
        FIGURINHAS,
        LEGENDA,
        Inimigos,
        carregarMundo,
        aberturasSemPar,
        posPlataforma,
        posSerra,
        tileEm,
        solido,
        colide,
        salaEm,
        criarJogador,
        clonarJogador,
        passoJogador,
        tocouPerigo,
        perigoNaCaixa,
        caixaGolpe,
        criarJogo,
        iniciar,
        passo,
        avancar,
        comprar,
        itensDaLoja,
        sairLoja,
        abrirAlbum,
        fecharAlbum,
        trocarFigurinha,
        encaixesLivres,
        usa,
        vidaTotal,
        pontuacaoTotal,
        zonaDeUso,
        continuar,
        ferirJogador,
        exportarSave,
        importarSave,
        alturaPulo: () => (CONFIG.impulso * CONFIG.impulso) / (2 * CONFIG.gravidade),
    };
});
