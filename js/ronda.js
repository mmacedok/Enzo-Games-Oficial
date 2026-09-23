// ============================================================================
// Ronda nos Telhados — minigame do Degustador da Noite (easter egg).
// Abre ao clicar no título da página do Degustador, na janela compartilhada
// (js/game-dialog.js). Regras em js/ronda-core.js; aqui só desenho,
// controles, telas e recorde. Sprites em assets/ronda/; os retângulos ficam de reserva.
// ============================================================================
(() => {
    'use strict';

    const core = window.RondaCore;
    const { CONFIG, TIPOS } = core;
    const W = CONFIG.largura;
    const H = CONFIG.altura;
    const RECORDE = 'ronda-recorde';
    const toque = matchMedia('(pointer: coarse)').matches;
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const janela = GameDialog.create({
        titulo: 'Ronda nos Telhados',
        descricaoCanvas: 'Ronda nos Telhados. Espaço pula, F ou clique atira, P pausa. No celular: toque à esquerda pula, à direita atira.',
        largura: W,
        altura: H,
    });
    const { canvas, ctx } = janela;

    // Cores de reserva (enquanto os sprites carregam ou se falharem).
    const COR = {
        jogador: '#e040fb',
        arma: '#ff6600',
        baixo: '#8a8f99',
        parede: '#ff6600',
        passaro: '#ffd400',
        drone: '#2ecc71',
        coracao: '#e0245e',
        feiticeira: '#b04dff',
        laser: '#ff4fd8',
        predio: '#1d0f33',
        telhado: '#8a2be2',
        janela: '#ffd76a',
        tinta: '#111111',
    };

    // ------------------------------------------------------------- artes
    // Sprites de assets/ronda/ (quadros de 128×128). Enquanto uma imagem não
    // carrega (ou se falhar), o desenho usa os retângulos de reserva.
    const carregar = (arquivo) => {
        const img = new Image();
        img.src = `assets/ronda/${arquivo}?v=1`;
        return img;
    };
    const ARTE = {
        correr: ['correr-01', 'correr-02', 'correr-03', 'correr-04'].map((n) => carregar(`degustador/${n}.png`)),
        atirar: ['atirar-01', 'atirar-02'].map((n) => carregar(`degustador/${n}.png`)),
        pular: carregar('degustador/pular.png'),
        cair: carregar('degustador/cair.png'),
        tropecar: carregar('degustador/tropecar.png'),
        passaro: ['passaro-01', 'passaro-02'].map((n) => carregar(`objetos/${n}.png`)),
        drone: ['drone-01', 'drone-02'].map((n) => carregar(`objetos/${n}.png`)),
        coracao: ['coracao-01', 'coracao-02', 'coracao-03', 'coracao-04'].map((n) => carregar(`inimigos/${n}.png`)),
        feiticeira: ['feiticeira-01', 'feiticeira-02', 'feiticeira-03', 'feiticeira-04'].map((n) => carregar(`inimigos/${n}.png`)),
        predios: ['predio-1.webp', 'predio-2.webp', 'predio-3.webp'].map((n) => carregar(`predios/${n}`)),
        parede: carregar('objetos/parede-inteira.png'),
        paredeRachada: carregar('objetos/parede-rachada.png'),
        destrocos: carregar('objetos/parede-destrocos.png'),
        baixos: ['caixa-dagua', 'ar-condicionado', 'antena'].map((n) => carregar(`objetos/${n}.png`)),
        projetil: carregar('objetos/projetil.png'),
        cidadeLonge: carregar('cidade-distante.png'),
        cidadePerto: carregar('cidade-proxima.png'),
        sinal: carregar('sinal-virgula.png'),
    };
    const pronta = (img) => img.complete && img.naturalWidth > 0;

    // Parte visível de cada sprite dentro do quadro 128×128: [x, y, largura, altura].
    const RECORTE = {
        baixos: [[20, 5, 86, 112], [16, 17, 112, 85], [20, 13, 97, 92]],
        destrocos: [5, 75, 112, 41],
        projetil: [9, 50, 93, 19],
    };
    // Parede em 3 fatias (colunas 36..92 do quadro): tampa, tijolos (repete) e base.
    const PAREDE = { x: 36, w: 57, tampa: [6, 14], meio: [20, 80], base: [100, 16], largura: 32 };

    // ------------------------------------------------------------- estado
    const jogo = core.criarJogo();
    const visual = { tempo: 0, fimEm: 0, ultimoTiro: -1, novoRecorde: false, efeitos: [], pausado: false };
    const entrada = { gatilho: false };
    let recorde = lerRecorde();
    let ultimoQuadro = null;
    let quadro = 0;

    function lerRecorde() {
        try { return Number.parseInt(localStorage.getItem(RECORDE), 10) || 0; } catch { return 0; }
    }
    function salvarRecorde(valor) {
        try { localStorage.setItem(RECORDE, String(valor)); } catch { /* modo privado */ }
    }

    // ------------------------------------------------------------- cenário
    /** Faixa de cidade (desenhada uma vez) para as camadas de paralaxe. */
    function faixaDeCidade(cor, corJanela, alturaMin, alturaMax, semente) {
        const faixa = document.createElement('canvas');
        faixa.width = W * 2;
        faixa.height = H;
        const c = faixa.getContext('2d');
        let s = semente;
        const aleatorio = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        let x = 0;
        while (x < faixa.width) {
            const w = 30 + aleatorio() * 60;
            const h = alturaMin + aleatorio() * (alturaMax - alturaMin);
            c.fillStyle = cor;
            c.fillRect(x, H - h, w - 2, h);
            c.fillStyle = corJanela;
            for (let jy = H - h + 8; jy < H - 6; jy += 12) {
                for (let jx = x + 5; jx < x + w - 8; jx += 9) if (aleatorio() < 0.25) c.fillRect(jx, jy, 3, 5);
            }
            x += w;
        }
        return faixa;
    }
    const cidadeLonge = faixaDeCidade('#241447', 'rgba(255, 215, 106, 0.35)', 90, 210, 7);
    const cidadePerto = faixaDeCidade('#170b30', 'rgba(255, 215, 106, 0.5)', 60, 150, 13);

    function desenharCeu() {
        if (pronta(ARTE.cidadeLonge)) {
            // Céu e cidade distante numa arte só (opaca). Fica parada: a arte
            // não emenda nas bordas, e a cidade próxima já dá a paralaxe.
            ctx.drawImage(ARTE.cidadeLonge, 0, 0, W, H);
        } else {
            const ceu = ctx.createLinearGradient(0, 0, 0, H);
            ceu.addColorStop(0, '#07041a');
            ceu.addColorStop(0.6, '#1c0f45');
            ceu.addColorStop(1, '#3a1a6b');
            ctx.fillStyle = ceu;
            ctx.fillRect(0, 0, W, H);
            const desloc = (jogo.distancia * 0.12) % cidadeLonge.width;
            ctx.drawImage(cidadeLonge, -desloc, 0);
            ctx.drawImage(cidadeLonge, cidadeLonge.width - desloc, 0);
        }

        // Lua.
        ctx.fillStyle = '#f3e9c6';
        ctx.beginPath(); ctx.arc(90, 60, 22, 0, Math.PI * 2); ctx.fill();

        // Batsinal da vírgula: fixo no céu, fora das camadas que repetem.
        if (pronta(ARTE.sinal)) {
            ctx.drawImage(ARTE.sinal, 396, 11, 150, 150);
        } else {
            ctx.save();
            const luz = ctx.createLinearGradient(520, H, 470, 70);
            luz.addColorStop(0, 'rgba(255, 240, 170, 0.35)');
            luz.addColorStop(1, 'rgba(255, 240, 170, 0.08)');
            ctx.fillStyle = luz;
            ctx.beginPath(); ctx.moveTo(505, H); ctx.lineTo(535, H); ctx.lineTo(520, 60); ctx.lineTo(420, 60); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255, 240, 170, 0.8)';
            ctx.beginPath(); ctx.ellipse(470, 62, 46, 28, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1c0f45';
            ctx.beginPath(); ctx.arc(470, 56, 11, 0, Math.PI * 2); ctx.fill(); // vírgula: bolinha…
            ctx.beginPath(); ctx.moveTo(478, 60); ctx.quadraticCurveTo(478, 80, 462, 86); ctx.quadraticCurveTo(472, 74, 466, 64); ctx.closePath(); ctx.fill(); // …e rabinho
            ctx.restore();
        }

        // Cidade mais próxima, em paralaxe mais rápida.
        if (pronta(ARTE.cidadePerto)) {
            const desloc = (jogo.distancia * 0.3) % W;
            ctx.drawImage(ARTE.cidadePerto, -desloc, H - 320, W, 320);
            ctx.drawImage(ARTE.cidadePerto, W - desloc, H - 320, W, 320);
        } else {
            const desloc = (jogo.distancia * 0.3) % cidadePerto.width;
            ctx.drawImage(cidadePerto, -desloc, 0);
            ctx.drawImage(cidadePerto, cidadePerto.width - desloc, 0);
        }
    }

    /** Fachada do prédio: textura repetida na horizontal (espelhada a cada cópia, para não marcar a emenda). */
    function desenharFachada(p) {
        const img = ARTE.predios[Math.floor(p.w * 7 + p.topo * 13) % 3];
        if (!pronta(img)) return false;
        const tw = img.naturalWidth;
        const th = img.naturalHeight;
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.x, p.topo, p.w, H - p.topo);
        ctx.clip();
        for (let i = 0, x = p.x; x < p.x + p.w; i++, x += tw) {
            if (x + tw < 0 || x > W) continue;
            if (i % 2 === 0) {
                ctx.drawImage(img, x, p.topo, tw, th);
            } else {
                ctx.save();
                ctx.translate(x + tw, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, p.topo, tw, th);
                ctx.restore();
            }
        }
        ctx.restore();
        return true;
    }

    function desenharPredios() {
        for (const p of jogo.predios) {
            if (p.x > W || p.x + p.w < 0) continue;
            if (!desenharFachada(p)) {
                ctx.fillStyle = COR.predio;
                ctx.fillRect(p.x, p.topo, p.w, H - p.topo);
                // Janelas: padrão fixo por prédio (não pisca ao rolar).
                ctx.fillStyle = COR.janela;
                let s = Math.floor(p.w * 7 + p.topo * 13);
                for (let y = p.topo + 18; y < H - 8; y += 22) {
                    for (let x = 12; x < p.w - 16; x += 26) {
                        s = (s * 16807) % 2147483647;
                        if (s % 5 === 0) ctx.fillRect(p.x + x, y, 8, 10);
                    }
                }
            }
            ctx.fillStyle = COR.telhado;
            ctx.fillRect(p.x, p.topo, p.w, 4);
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.topo, p.w, H - p.topo + 4);
        }
    }

    /** Laser da feiticeira: aviso tracejado piscando, depois a linha rosa que mata. */
    function desenharLaser(d) {
        const estado = core.estadoLaser(d, jogo.tempo);
        if (estado === 'pausa') return;
        const zona = core.zonaLaser(d);
        const maoX = d.x - 8;
        const maoY = d.y + d.h / 2 - 10;
        ctx.save();
        ctx.lineCap = 'round';
        if (estado === 'aviso') {
            if (Math.floor(visual.tempo * 12) % 2 === 0) {
                ctx.strokeStyle = 'rgba(255, 79, 216, 0.75)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 5]);
                ctx.beginPath(); ctx.moveTo(zona.x, d.laserY); ctx.lineTo(maoX, d.laserY); ctx.stroke();
            }
        } else {
            for (const [cor, largura] of [['rgba(255, 79, 216, 0.35)', 9], [COR.laser, 4], ['#ffd1f4', 1.5]]) {
                ctx.strokeStyle = cor;
                ctx.lineWidth = largura;
                ctx.beginPath();
                ctx.moveTo(maoX, maoY);
                ctx.lineTo(maoX, d.laserY);
                ctx.lineTo(zona.x, d.laserY);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function desenharDesafios() {
        for (const d of jogo.desafios) {
            if (d.x > W + 10 || d.x + d.w < -10) continue;
            if (d.tipo === 'feiticeira') desenharLaser(d);
            if (!desenharDesafioComArte(d)) {
                ctx.fillStyle = COR[d.tipo];
                ctx.fillRect(d.x, d.y, d.w, d.h);
                ctx.strokeStyle = COR.tinta;
                ctx.lineWidth = 2;
                ctx.strokeRect(d.x, d.y, d.w, d.h);
                if (d.tipo === 'passaro') {
                    // Asinha batendo.
                    const asa = Math.sin(visual.tempo * 18 + d.fase) * 6;
                    ctx.fillStyle = COR.passaro;
                    ctx.beginPath(); ctx.moveTo(d.x + 4, d.y + 6); ctx.lineTo(d.x + 12, d.y - 4 - asa); ctx.lineTo(d.x + 16, d.y + 6); ctx.fill(); ctx.stroke();
                }
                if (d.tipo === 'drone' && Math.floor(visual.tempo * 4) % 2 === 0) {
                    ctx.fillStyle = '#ff2d2d';
                    ctx.fillRect(d.x + d.w / 2 - 2, d.y + 3, 4, 4);
                }
            }
            const total = TIPOS[d.tipo].vida;
            if (total > 1) {
                // Barra de vida acima do alvo.
                for (let i = 0; i < total; i++) {
                    ctx.fillStyle = i < d.vida ? '#ff3b3b' : 'rgba(255, 255, 255, 0.25)';
                    ctx.fillRect(d.x + i * (d.w / total), d.y - 7, d.w / total - 2, 4);
                }
            }
        }
    }

    /** Desenha o desafio com o sprite; devolve false se a arte ainda não carregou. */
    function desenharDesafioComArte(d) {
        const cx = d.x + d.w / 2;
        const cy = d.y + d.h / 2;
        const chao = d.y + d.h;
        if (d.tipo === 'passaro') {
            const img = ARTE.passaro[Math.floor(visual.tempo * 8 + d.fase) % 2];
            if (!pronta(img)) return false;
            ctx.drawImage(img, cx - 20, cy - 20, 40, 40);
        } else if (d.tipo === 'drone') {
            const img = ARTE.drone[Math.floor(visual.tempo * 20) % 2];
            if (!pronta(img)) return false;
            ctx.drawImage(img, cx - 20, cy - 24.5, 40, 40);
        } else if (d.tipo === 'baixo') {
            const i = Math.floor(d.fase) % 3;
            const img = ARTE.baixos[i];
            if (!pronta(img)) return false;
            const [sx, sy, sw, sh] = RECORTE.baixos[i];
            const k = Math.min(36 / sw, 36 / sh);
            ctx.drawImage(img, sx, sy, sw, sh, cx - (sw * k) / 2, chao - sh * k, sw * k, sh * k);
        } else if (d.tipo === 'parede') {
            const img = d.vida < TIPOS.parede.vida ? ARTE.paredeRachada : ARTE.parede;
            if (!pronta(img)) return false;
            desenharParede(img, cx - PAREDE.largura / 2, d.y, d.h);
        } else if (d.tipo === 'coracao') {
            const img = d.correndo ? ARTE.coracao[Math.floor(visual.tempo * 10) % 4] : ARTE.coracao[0];
            if (!pronta(img)) return false;
            // 128×128 em 52×52: pés (linha 125) no telhado.
            ctx.drawImage(img, cx - 26, chao - 51, 52, 52);
        } else if (d.tipo === 'feiticeira') {
            const img = ARTE.feiticeira[Math.floor(visual.tempo * 6) % 4];
            if (!pronta(img)) return false;
            ctx.drawImage(img, cx - 28, cy - 28, 56, 56);
        } else {
            return false;
        }
        return true;
    }

    /** Parede alta: tampa em cima, base embaixo e o tijolo repetido no meio (sem esticar). */
    function desenharParede(img, x, y, altura) {
        const k = PAREDE.largura / PAREDE.w;
        const [tampaY, tampaH] = PAREDE.tampa;
        const [meioY, meioH] = PAREDE.meio;
        const [baseY, baseH] = PAREDE.base;
        const fimMeio = y + altura - baseH * k;
        ctx.drawImage(img, PAREDE.x, tampaY, PAREDE.w, tampaH, x, y, PAREDE.largura, tampaH * k);
        for (let yy = y + tampaH * k; yy < fimMeio; yy += meioH * k) {
            const h = Math.min(meioH * k, fimMeio - yy);
            ctx.drawImage(img, PAREDE.x, meioY, PAREDE.w, h / k, x, yy, PAREDE.largura, h);
        }
        ctx.drawImage(img, PAREDE.x, baseY, PAREDE.w, baseH, x, fimMeio, PAREDE.largura, baseH * k);
    }

    /** Quadro do Degustador para o momento atual. */
    function quadroDoJogador() {
        const j = jogo.jogador;
        if (jogo.fase === 'fim') return ARTE.tropecar;
        if (jogo.fase === 'pronto') return ARTE.correr[0];
        if (!j.noChao) return j.vy < 0 ? ARTE.pular : ARTE.cair;
        const passo = Math.floor(jogo.distancia / 22) % 4;
        if (visual.tempo - visual.ultimoTiro < 0.15) return ARTE.atirar[passo % 2];
        return ARTE.correr[passo];
    }

    function desenharJogador() {
        const img = quadroDoJogador();
        if (!pronta(img)) { desenharJogadorProvisorio(); return; }
        const x = CONFIG.jogadorX;
        const y = jogo.jogador.y;
        // Quadro 128×128 desenhado em 64×64: tronco (coluna 76) no centro da
        // hitbox e pés (linha 123) no chão da hitbox.
        ctx.drawImage(img, x + CONFIG.jogadorL / 2 - 38, y + CONFIG.jogadorA - 61.5, 64, 64);
        if (!jogo.jogador.noChao && visual.tempo - visual.ultimoTiro < 0.06) {
            // No ar não há quadro de tiro: clarão na ponta da arma.
            ctx.fillStyle = '#ffd400';
            ctx.beginPath();
            ctx.arc(x + 36, y + 14, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function desenharJogadorProvisorio() {
        const x = CONFIG.jogadorX;
        const y = jogo.jogador.y;
        ctx.save();
        if (jogo.fase === 'fim') {
            ctx.translate(x + CONFIG.jogadorL / 2, y + CONFIG.jogadorA / 2);
            ctx.rotate(Math.min(1.4, (visual.tempo - visual.fimEm) * 4));
            ctx.translate(-(x + CONFIG.jogadorL / 2), -(y + CONFIG.jogadorA / 2));
        }
        ctx.fillStyle = COR.jogador;
        ctx.fillRect(x, y, CONFIG.jogadorL, CONFIG.jogadorA);
        ctx.strokeStyle = COR.tinta;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, CONFIG.jogadorL, CONFIG.jogadorA);
        // Gorro do Teemo (verde) e a MP5K laranja: ajudam a ler o retângulo.
        ctx.fillStyle = '#4c8c2b';
        ctx.fillRect(x - 2, y - 5, CONFIG.jogadorL + 4, 7);
        ctx.fillStyle = COR.arma;
        ctx.fillRect(x + CONFIG.jogadorL - 4, y + CONFIG.alturaArma - 3, 16, 6);
        if (visual.tempo - visual.ultimoTiro < 0.06) {
            ctx.fillStyle = '#ffd400';
            ctx.beginPath();
            ctx.arc(x + CONFIG.jogadorL + 14, y + CONFIG.alturaArma, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function desenharTiros() {
        if (pronta(ARTE.projetil)) {
            const [sx, sy, sw, sh] = RECORTE.projetil;
            // Ponta do projétil onde termina o retângulo de reserva (t.x + 10).
            for (const t of jogo.tiros) ctx.drawImage(ARTE.projetil, sx, sy, sw, sh, t.x + 10 - 24, t.y - 3, 24, 5);
            return;
        }
        ctx.fillStyle = '#ffb347';
        for (const t of jogo.tiros) ctx.fillRect(t.x, t.y - 2, 10, 4);
    }

    function desenharEfeitos() {
        visual.efeitos = visual.efeitos.filter((e) => visual.tempo - e.inicio < 0.5);
        for (const e of visual.efeitos) {
            const t = (visual.tempo - e.inicio) / 0.5;
            ctx.save();
            ctx.globalAlpha = 1 - t;
            if (e.tipo === 'parede' && pronta(ARTE.destrocos)) {
                // Entulho fica no telhado: anda junto com o cenário.
                const [sx, sy, sw, sh] = RECORTE.destrocos;
                const x = e.x - (jogo.distancia - e.distancia);
                ctx.drawImage(ARTE.destrocos, sx, sy, sw, sh, x - 20, e.chao - 15, 40, 15);
            }
            texto('POW!', e.x, e.y - t * 20, 18 + t * 8, '#ffd400', 4);
            ctx.restore();
        }
    }

    function texto(conteudo, x, y, tamanho, cor = '#fff', contorno = 5, alinhar = 'center') {
        ctx.font = `${tamanho}px Bangers, 'Arial Black', sans-serif`;
        ctx.textAlign = alinhar;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = contorno;
        ctx.strokeStyle = COR.tinta;
        ctx.strokeText(conteudo, x, y);
        ctx.fillStyle = cor;
        ctx.fillText(conteudo, x, y);
    }

    const FIM = {
        buraco: ['SPLAT!', 'Caiu entre os prédios!'],
        predio: ['CRASH!', 'Deu de cara na fachada!'],
        desafio: ['POW!', 'Atropelado na ronda!'],
        laser: ['ZAP!', 'Fritado pelo laser!'],
    };

    /** Canto superior direito: 10 balas, barra de recarga e dica de recarregar. */
    function desenharMunicao() {
        const pente = CONFIG.pente;
        for (let i = 0; i < pente; i++) {
            const x = W - 20 - i * 9;
            ctx.fillStyle = i < jogo.balas && jogo.recarregando === 0 ? '#ffb347' : 'rgba(255, 255, 255, 0.18)';
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, 12, 5, 16, [3, 3, 1, 1]);
            ctx.fill();
            ctx.stroke();
        }
        if (jogo.recarregando > 0) {
            const feito = 1 - jogo.recarregando / CONFIG.tempoRecarga;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(W - 101, 33, 86, 5);
            ctx.fillStyle = '#ffd400';
            ctx.fillRect(W - 101, 33, 86 * feito, 5);
            texto('RECARREGANDO', W - 14, 50, 14, '#ffd400', 3, 'right');
        } else if (jogo.balas < 3 && jogo.fase === 'correndo' && Math.floor(visual.tempo * 3) % 2 === 0) {
            texto(toque ? 'toque aqui: recarregar' : 'R: recarregar', W - 14, 44, 14, '#ff4fd8', 3, 'right');
        }
    }

    function desenharTelas() {
        if (jogo.fase !== 'pronto') {
            texto(`${Math.floor(jogo.distancia / 20)} m`, 14, 22, 22, '#fff', 4, 'left');
            texto(`${core.pontos(jogo)} pts`, 14, 48, 20, '#ff9900', 4, 'left');
            desenharMunicao();
        }
        if (jogo.fase === 'pronto') {
            ctx.fillStyle = 'rgba(7, 4, 26, 0.55)';
            ctx.fillRect(0, 0, W, H);
            texto('RONDA NOS TELHADOS', W / 2, 110, 46, '#ff6600', 7);
            texto(toque ? 'Toque à esquerda: PULAR  ·  à direita: ATIRAR' : 'ESPAÇO pula  ·  F ou clique atira  ·  R recarrega', W / 2, 170, 18, '#fff', 4);
            texto('10 balas por pente: economize! E não pule no laser rosa.', W / 2, 198, 16, '#e6d6ff', 4);
            texto(toque ? 'Toque para começar' : 'Aperte ESPAÇO para começar', W / 2, 250, 26, '#ffd400', 5);
            if (recorde > 0) texto(`RECORDE: ${recorde}`, W / 2, 290, 18, '#fff', 4);
            if (toque && innerHeight > innerWidth) texto('↻ Gire o celular para jogar melhor', W / 2, 325, 16, '#e6d6ff', 4);
            if (toque) {
                // Divisão das metades da tela.
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.setLineDash([6, 6]);
                ctx.beginPath(); ctx.moveTo(W / 2, 220); ctx.lineTo(W / 2, H); ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        if (jogo.fase === 'fim') {
            const t = Math.min(1, (visual.tempo - visual.fimEm) / 0.35);
            ctx.fillStyle = `rgba(7, 4, 26, ${0.6 * t})`;
            ctx.fillRect(0, 0, W, H);
            const [onomatopeia, frase] = FIM[jogo.causa] || FIM.desafio;
            ctx.save();
            ctx.translate(W / 2, 80);
            ctx.rotate(-0.1);
            ctx.scale(0.6 + 0.4 * t, 0.6 + 0.4 * t);
            texto(onomatopeia, 0, 0, 64, '#ffd400', 8);
            ctx.restore();
            texto(frase, W / 2, 135, 22, '#fff', 5);
            ctx.fillStyle = '#fff5d1';
            ctx.strokeStyle = COR.tinta;
            ctx.lineWidth = 4;
            ctx.fillRect(W / 2 - 130, 160, 260, 110);
            ctx.strokeRect(W / 2 - 130, 160, 260, 110);
            ctx.font = "bold 16px 'Comic Neue', sans-serif";
            ctx.fillStyle = '#3b3024';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.floor(jogo.distancia / 20)} m percorridos`, W / 2, 182);
            texto(`${core.pontos(jogo)} PONTOS`, W / 2, 212, 30, '#ff9900', 5);
            ctx.fillStyle = '#3b3024';
            ctx.fillText(`Recorde: ${recorde}`, W / 2, 250);
            if (visual.novoRecorde) texto('NOVO RECORDE!', W / 2, 295, 24, '#ffd400', 5);
            if (visual.tempo - visual.fimEm > 0.6) texto(toque ? 'Toque para tentar de novo' : 'ESPAÇO para tentar de novo', W / 2, 330, 20, '#fff', 4);
        }
        if (visual.pausado) {
            ctx.fillStyle = 'rgba(7, 4, 26, 0.7)';
            ctx.fillRect(0, 0, W, H);
            texto('PAUSADO', W / 2, H / 2 - 10, 40, '#fff', 6);
            texto(toque ? 'Toque para continuar' : 'P para continuar', W / 2, H / 2 + 30, 18, '#e6d6ff', 4);
        }
    }

    function desenhar() {
        const tremor = !calmo && jogo.fase === 'fim' && visual.tempo - visual.fimEm < 0.25 ? (Math.random() - 0.5) * 8 : 0;
        ctx.save();
        ctx.translate(tremor, tremor * 0.5);
        desenharCeu();
        desenharPredios();
        desenharDesafios();
        desenharTiros();
        desenharJogador();
        desenharEfeitos();
        ctx.restore();
        desenharTelas();
    }

    // ------------------------------------------------------------- laço
    function laco(agora) {
        if (!janela.aberta) return;
        const dt = ultimoQuadro === null ? 0 : (agora - ultimoQuadro) / 1000;
        ultimoQuadro = agora;
        visual.tempo += Math.min(dt, 0.25);
        if (!visual.pausado && jogo.fase === 'correndo') {
            if (entrada.gatilho && core.atirar(jogo)) visual.ultimoTiro = visual.tempo;
            const antes = new Set(jogo.desafios);
            core.avancar(jogo, dt);
            // Desafio que sumiu sem sair da tela foi destruído: mostra o "POW!".
            for (const d of antes) {
                if (!jogo.desafios.includes(d) && d.x + d.w > 0) {
                    visual.efeitos.push({ x: d.x + d.w / 2, y: d.y, inicio: visual.tempo, tipo: d.tipo, chao: d.y + d.h, distancia: jogo.distancia });
                }
            }
            if (jogo.fase === 'fim') terminou();
        }
        desenhar();
        quadro = requestAnimationFrame(laco);
    }

    function terminou() {
        visual.fimEm = visual.tempo;
        entrada.gatilho = false;
        const total = core.pontos(jogo);
        visual.novoRecorde = total > recorde;
        if (visual.novoRecorde) { recorde = total; salvarRecorde(recorde); }
    }

    // ------------------------------------------------------------- controles
    function apertarPulo() {
        if (visual.pausado) { visual.pausado = false; return; }
        if (jogo.fase === 'fim') {
            if (visual.tempo - visual.fimEm < 0.6) return; // evita recomeçar sem querer
            core.reiniciar(jogo);
            visual.efeitos = [];
            visual.novoRecorde = false;
            return;
        }
        core.pular(jogo, true);
    }
    const soltarPulo = () => core.pular(jogo, false);

    function pausar() {
        if (jogo.fase !== 'correndo') return;
        visual.pausado = !visual.pausado;
        entrada.gatilho = false;
        soltarPulo();
    }

    const TECLAS_PULO = ['Space', 'ArrowUp', 'KeyW'];
    const TECLAS_TIRO = ['KeyF', 'KeyJ', 'KeyX'];

    janela.dialog.addEventListener('keydown', (event) => {
        if (TECLAS_PULO.includes(event.code)) {
            event.preventDefault();
            if (!event.repeat) apertarPulo();
        } else if (TECLAS_TIRO.includes(event.code)) {
            event.preventDefault();
            if (jogo.fase === 'correndo' && !visual.pausado) entrada.gatilho = true;
        } else if (event.code === 'KeyR') {
            event.preventDefault();
            if (jogo.fase === 'correndo' && !visual.pausado) core.recarregar(jogo);
        } else if (event.code === 'KeyP') {
            pausar();
        }
    });
    janela.dialog.addEventListener('keyup', (event) => {
        if (TECLAS_PULO.includes(event.code)) soltarPulo();
        if (TECLAS_TIRO.includes(event.code)) entrada.gatilho = false;
    });

    // Toque: metade esquerda pula, direita atira. Mouse: clique atira
    // (e começa/recomeça a partida quando ela não está correndo).
    const toquesDePulo = new Set();
    canvas.addEventListener('pointerdown', (event) => {
        if (event.button > 0) return;
        event.preventDefault();
        canvas.setPointerCapture?.(event.pointerId);
        const caixa = canvas.getBoundingClientRect();
        const esquerda = event.clientX - caixa.left < caixa.width / 2;
        if (jogo.fase !== 'correndo' || visual.pausado) { apertarPulo(); return; }
        // Toque/clique no canto das balas: recarregar.
        const lx = ((event.clientX - caixa.left) / caixa.width) * W;
        const ly = ((event.clientY - caixa.top) / caixa.height) * H;
        if (lx > W - 120 && ly < 60) { core.recarregar(jogo); return; }
        if (event.pointerType === 'touch' && esquerda) {
            toquesDePulo.add(event.pointerId);
            apertarPulo();
        } else {
            entrada.gatilho = true;
        }
    });
    const soltar = (event) => {
        if (toquesDePulo.delete(event.pointerId)) soltarPulo();
        else entrada.gatilho = false;
    };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    janela.aoFechar(() => {
        cancelAnimationFrame(quadro);
        entrada.gatilho = false;
        // Partida em andamento recomeça do "pronto" ao reabrir.
        if (jogo.fase === 'correndo') core.reiniciar(jogo);
        visual.pausado = false;
    });
    // Aba escondida: pausa e zera o relógio para não dar um salto ao voltar.
    document.addEventListener('visibilitychange', () => {
        ultimoQuadro = null;
        if (document.hidden && jogo.fase === 'correndo') visual.pausado = true;
    });

    function abrir() {
        if (janela.aberta) return;
        janela.abrir();
        ultimoQuadro = null;
        desenhar();
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(laco);
    }

    window.RondaDegustador = { abrir, jogo, entrada, visual, arte: ARTE };
})();
