// ============================================================================
// Inimigos e chefes da "Caçada ao Inominável" (inspirados em Hollow Knight).
// Cada tipo tem tamanho, vida, dano de contato, vírgulas que solta e uma
// função `atualizar(e, c, dt)` com o comportamento. `c` é o contexto que o
// motor (js/cacada-core.js) monta a cada passo:
//   c.T, c.tempo, c.alvo {x,y} (centro do Degustador), c.sala {x,y,w,h},
//   c.rng(), c.solido(tx,ty), c.tileEm(tx,ty), c.mover(e,dx,dy) → {esq,dir,chao,teto},
//   c.projetil(p), c.invocar(tipo,x,y), c.evento(ev), c.lugarLivre(...), c.contar(tipo)
// Sem DOM: roda no navegador e no Node (testes).
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CacadaInimigos = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const GRAVIDADE = 1800;
    const QUEDA_MAX = 560;

    const centro = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
    const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

    function cair(e, dt) {
        e.vy = Math.min(e.vy + GRAVIDADE * dt, QUEDA_MAX);
    }

    /** Recuo de quem anda no chão (leva um tranco e para). */
    function recuoChao(e, dt) {
        const kx = e.kx || 0;
        e.kx = Math.abs(kx) < 5 ? 0 : kx * Math.exp(-9 * dt);
        return kx;
    }

    /** Tem chão (ou marquise) logo à frente dos pés? */
    function chaoAFrente(c, e, dir) {
        const tx = Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1) / c.T);
        const ty = Math.floor((e.y + e.h + 1) / c.T);
        return c.solido(tx, ty) || c.tileEm(tx, ty) === '=';
    }

    /** Parede logo à frente do corpo? */
    function paredeAFrente(c, e, dir) {
        const tx = Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1) / c.T);
        for (let ty = Math.floor((e.y + 2) / c.T); ty <= Math.floor((e.y + e.h - 2) / c.T); ty++) if (c.solido(tx, ty)) return true;
        return false;
    }

    /** Voo com curva suave até a velocidade desejada. */
    function guiar(e, alvoVx, alvoVy, forca, dt) {
        const k = Math.min(1, forca * dt);
        e.vx += (alvoVx - e.vx) * k;
        e.vy += (alvoVy - e.vy) * k;
    }

    /** Move quem voa; quica de leve ao bater. */
    function voar(c, e, dt, quique = -0.3) {
        const r = c.mover(e, e.vx * dt, e.vy * dt);
        if (r.esq || r.dir) e.vx *= quique;
        if (r.chao || r.teto) e.vy *= quique;
        return r;
    }

    /** Tiro em leque na direção do alvo. */
    function leque(c, e, n, abertura, velocidade, tipo, raio = 5) {
        const o = centro(e);
        const base = Math.atan2(c.alvo.y - o.y, c.alvo.x - o.x);
        for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * abertura;
            c.projetil({ tipo, x: o.x, y: o.y, vx: Math.cos(a) * velocidade, vy: Math.sin(a) * velocidade, r: raio, vida: 3.5 });
        }
    }

    const TIPOS = {
        // ------------------------------------------------ Crawlid: anda e vira
        capanga: {
            nome: 'Capanga do Coração', w: 18, h: 22, vida: 3, dano: 1, virgulas: 3, peso: 1,
            atualizar(e, c, dt) {
                cair(e, dt);
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (e.dir * 45 + kx) * dt, e.vy * dt);
                if (r.chao) e.vy = 0;
                if ((r.esq && e.dir < 0) || (r.dir && e.dir > 0)) e.dir = -e.dir;
                else if (r.chao && !kx && !chaoAFrente(c, e, e.dir)) e.dir = -e.dir;
            },
        },

        // ------------------------------------------------ Vengefly: te vê e persegue voando
        ping: {
            nome: 'Ping', w: 16, h: 14, vida: 2, dano: 1, virgulas: 2, peso: 0.8, voa: true,
            atualizar(e, c, dt) {
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                const d = Math.hypot(dx, dy) || 1;
                if (e.estado !== 'caca' && d < 170) {
                    e.estado = 'caca';
                    c.evento({ tipo: 'alerta', x: o.x, y: e.y });
                }
                if (e.estado === 'caca' && d > 380) e.estado = 'voltar';
                if (e.estado === 'caca') {
                    guiar(e, (dx / d) * 118, (dy / d) * 118, 2.6, dt);
                } else {
                    const hx = e.x0 + Math.sin(c.tempo * 1.3 + e.fase * 6) * 14 - e.x;
                    const hy = e.y0 + Math.sin(c.tempo * 2.3 + e.fase * 6) * 7 - e.y;
                    const hd = Math.hypot(hx, hy) || 1;
                    const v = Math.min(60, hd * 3);
                    guiar(e, (hx / hd) * v, (hy / hd) * v, 3, dt);
                    if (e.estado === 'voltar' && hd < 10) e.estado = 'pairar';
                }
                voar(c, e, dt);
                if (Math.abs(e.vx) > 5) e.dir = e.vx > 0 ? 1 : -1;
            },
        },

        // ------------------------------------------------ Gruzzer: voa em diagonal e quica
        emoji: {
            nome: 'Emoji Raivoso', w: 16, h: 16, vida: 2, dano: 1, virgulas: 2, peso: 0.8, voa: true,
            atualizar(e, c, dt) {
                if (!e.iniciado) {
                    e.iniciado = true;
                    e.vx = e.fase > 0.5 ? 72 : -72;
                    e.vy = e.fase > 0.25 && e.fase < 0.75 ? 58 : -58;
                }
                // Depois de um tranco, volta à velocidade de cruzeiro.
                const sx = Math.sign(e.vx) || 1;
                const sy = Math.sign(e.vy) || 1;
                e.vx += (sx * 72 - e.vx) * Math.min(1, 3 * dt);
                e.vy += (sy * 58 - e.vy) * Math.min(1, 3 * dt);
                const r = c.mover(e, e.vx * dt, e.vy * dt);
                if (r.esq || r.dir) e.vx = -e.vx;
                if (r.chao || r.teto) e.vy = -e.vy;
                e.dir = e.vx > 0 ? 1 : -1;
            },
        },

        // ------------------------------------------------ Aspid: fica de longe e cospe em leque
        drone: {
            nome: 'Drone do Inominável', w: 20, h: 16, vida: 3, dano: 1, virgulas: 4, peso: 0.9, voa: true,
            atualizar(e, c, dt) {
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const d = Math.hypot(dx, c.alvo.y - o.y);
                e.t += dt;
                e.dir = dx > 0 ? 1 : -1;
                if (e.estado === 'mirar') {
                    guiar(e, 0, 0, 6, dt);
                    if (e.t >= 0.5) {
                        leque(c, e, 3, 0.26, 150, 'bola');
                        c.evento({ tipo: 'tiroInimigo', x: o.x, y: o.y });
                        e.estado = 'voar';
                        e.t = 0;
                        e.recarga = 2.2;
                    }
                } else if (d < 330) {
                    // Paira do lado em que está, acima do jogador, balançando (Silksong).
                    const lado = dx > 0 ? -1 : 1;
                    const tx = c.alvo.x + lado * 125 + Math.sin(c.tempo * 1.7 + e.fase * 6) * 26;
                    const ty = c.alvo.y - 72 + Math.sin(c.tempo * 2.3 + e.fase * 6) * 10;
                    const hx = tx - o.x;
                    const hy = ty - o.y;
                    const hd = Math.hypot(hx, hy) || 1;
                    const v = Math.min(95, hd * 2.5);
                    guiar(e, (hx / hd) * v, (hy / hd) * v, 2.5, dt);
                    e.recarga = (e.recarga ?? 1.2) - dt;
                    if (e.recarga <= 0) { e.estado = 'mirar'; e.t = 0; }
                } else {
                    guiar(e, 0, Math.sin(c.tempo * 2 + e.fase * 6) * 12, 2, dt);
                }
                voar(c, e, dt);
            },
        },

        // ------------------------------------------------ Mosscharger: prepara e dá investida
        troll: {
            nome: 'Troll', w: 22, h: 24, vida: 5, dano: 1, virgulas: 6, peso: 1.6,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                let vx = 0;
                if (e.estado === 'preparar') {
                    if (e.t >= 0.45) { e.estado = 'investida'; e.t = 0; c.evento({ tipo: 'investida', x: o.x, y: o.y }); }
                } else if (e.estado === 'investida') {
                    vx = e.dir * 290;
                    if (paredeAFrente(c, e, e.dir) || !chaoAFrente(c, e, e.dir) || e.t > 1.4) { e.estado = 'cansado'; e.t = 0; vx = 0; }
                } else if (e.estado === 'cansado') {
                    if (e.t >= 0.8) { e.estado = 'andar'; e.t = 0; }
                } else {
                    vx = e.dir * 28;
                    if (paredeAFrente(c, e, e.dir) || !chaoAFrente(c, e, e.dir)) { e.dir = -e.dir; vx = 0; }
                    if (Math.abs(dy) < 40 && Math.abs(dx) < 220 && Math.sign(dx) === e.dir && e.t > 0.3) {
                        e.estado = 'preparar';
                        e.t = 0;
                        c.evento({ tipo: 'alerta', x: o.x, y: e.y });
                    } else if (Math.abs(dy) < 40 && Math.abs(dx) < 120 && Math.sign(dx) === -e.dir) {
                        e.dir = -e.dir;
                    }
                }
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                if (r.chao) e.vy = 0;
            },
        },

        // ------------------------------------------------ Leaping Husk: pula em cima de você
        spam: {
            nome: 'Spam Saltitante', w: 18, h: 16, vida: 3, dano: 1, virgulas: 4, peso: 1,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const d = Math.hypot(dx, c.alvo.y - o.y);
                if (e.noChao && e.t >= (e.espera || 1)) {
                    if (d < 260) {
                        e.vxPulo = limitar(dx * 1.5, -170, 170);
                        e.vy = -440;
                    } else {
                        e.vxPulo = e.dir * 35;
                        e.vy = -200;
                    }
                    e.noChao = false;
                    e.t = 0;
                    e.espera = 0.8 + c.rng() * 0.6;
                    c.evento({ tipo: 'puloInimigo', x: o.x, y: e.y + e.h });
                }
                const kx = recuoChao(e, dt);
                const r = c.mover(e, ((e.noChao ? 0 : e.vxPulo || 0) + kx) * dt, e.vy * dt);
                if (r.chao) {
                    e.vy = 0;
                    if (!e.noChao) { e.noChao = true; e.t = 0; }
                } else if (e.vy > 0) {
                    e.noChao = false;
                }
                if (r.esq || r.dir) e.vxPulo = -(e.vxPulo || 0) * 0.5;
                if (Math.abs(dx) > 4) e.dir = dx > 0 ? 1 : -1;
            },
        },

        // ------------------------------------------------ Tiktik: anda em volta das plataformas
        bug: {
            nome: 'Bug', w: 14, h: 14, vida: 2, dano: 1, virgulas: 3, peso: 99, andaNasParedes: true,
            atualizar(e, c, dt) {
                if (!e.preso) grudar(e, c);
                andarNaBorda(e, c, 38 * dt);
                e.x = e.px + e.nx * 7 - 7;
                e.y = e.py + e.ny * 7 - 7;
            },
        },

        // ------------------------------------------------ Husk Sentry: escudo na frente
        moderador: {
            nome: 'Moderador', w: 20, h: 28, vida: 5, dano: 1, virgulas: 8, peso: 2,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                let vx = 0;
                e.ataque = null;
                if (e.estado === 'erguer') {
                    e.escudo = true;
                    if (e.t >= 0.5) { e.estado = 'golpe'; e.t = 0; c.evento({ tipo: 'martelo', x: o.x, y: o.y }); }
                } else if (e.estado === 'golpe') {
                    e.escudo = false;
                    if (chaoAFrente(c, e, e.dir) && !paredeAFrente(c, e, e.dir)) vx = e.dir * 190;
                    e.ataque = { x: e.dir > 0 ? e.x + e.w : e.x - 30, y: e.y + 2, w: 30, h: 24 };
                    if (e.t >= 0.25) { e.estado = 'recuperar'; e.t = 0; }
                } else if (e.estado === 'recuperar') {
                    e.escudo = false;
                    if (e.t >= 0.75) { e.estado = 'guarda'; e.t = 0; }
                } else {
                    e.escudo = true;
                    if (Math.abs(dx) < 260 && Math.abs(dy) < 60) {
                        e.dir = dx > 0 ? 1 : -1;
                        if (Math.abs(dx) > 62) {
                            if (chaoAFrente(c, e, e.dir) && !paredeAFrente(c, e, e.dir)) vx = e.dir * 42;
                        } else if (e.t > 0.35) {
                            e.estado = 'erguer';
                            e.t = 0;
                        }
                    }
                }
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                if (r.chao) e.vy = 0;
            },
        },

        // ------------------------------------------------ Soul Twister: teleporta e lança magia teleguiada
        feiticeira: {
            nome: 'Feiticeira', w: 20, h: 28, vida: 4, dano: 1, virgulas: 8, peso: 1.2, voa: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const d = Math.hypot(dx, c.alvo.y - o.y);
                e.dir = dx > 0 ? 1 : -1;
                e.alpha = 1;
                e.intangivel = false;
                if (e.estado === 'sumir') {
                    e.alpha = Math.max(0, 1 - e.t / 0.35);
                    e.intangivel = e.alpha < 0.35;
                    if (e.t >= 0.35) {
                        const lugar = c.lugarLivre(c.alvo.x, c.alvo.y, 90, 170, e.w, e.h);
                        if (lugar) { e.x = lugar.x; e.y = lugar.y; e.y0 = lugar.y; }
                        e.estado = 'aparecer';
                        e.t = 0;
                    }
                } else if (e.estado === 'aparecer') {
                    e.alpha = Math.min(1, e.t / 0.35);
                    e.intangivel = e.alpha < 0.35;
                    if (e.t >= 0.35) { e.estado = 'conjurar'; e.t = 0; }
                } else if (e.estado === 'conjurar') {
                    if (e.t >= 0.6) {
                        c.projetil({ tipo: 'magia', x: o.x + e.dir * 10, y: o.y - 4, vx: e.dir * 90, vy: -30, r: 6, vida: 3.2, guiado: 125 });
                        c.evento({ tipo: 'magia', x: o.x, y: o.y });
                        e.estado = 'flutuar';
                        e.t = 0;
                        e.recarga = 2.4;
                    }
                } else {
                    e.estado = 'flutuar';
                    e.vx = 0;
                    e.vy = (e.y0 + Math.sin(c.tempo * 3 + e.fase * 6) * 4 - e.y) * 4;
                    if (d < 300) e.recarga = (e.recarga ?? 1) - dt;
                    if (e.recarga <= 0) { e.estado = 'sumir'; e.t = 0; }
                }
                if (e.estado === 'flutuar') voar(c, e, dt);
            },
        },

        // ------------------------------------------------ Sombra do Degustador (guarda as vírgulas perdidas)
        sombra: {
            nome: 'Sombra do Degustador', w: 16, h: 24, vida: 4, dano: 1, virgulas: 0, peso: 1, voa: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                const d = Math.hypot(dx, dy) || 1;
                e.dir = dx > 0 ? 1 : -1;
                if (e.estado === 'preparar') {
                    guiar(e, 0, 0, 6, dt);
                    if (e.t >= 0.4) { e.estado = 'investida'; e.t = 0; e.vx = (dx / d) * 250; e.vy = (dy / d) * 250; }
                } else if (e.estado === 'investida') {
                    if (e.t >= 0.35) { e.estado = 'pairar'; e.t = 0; e.recarga = 1.8; }
                } else {
                    if (d < 280) guiar(e, (dx / d) * 55, (dy / d) * 55, 2, dt);
                    else guiar(e, 0, Math.sin(c.tempo * 2) * 10, 2, dt);
                    e.recarga = (e.recarga ?? 1.5) - dt;
                    if (e.recarga <= 0 && d < 170) { e.estado = 'preparar'; e.t = 0; }
                }
                voar(c, e, dt);
            },
        },

        // ================================================ CHEFES
        // False Knight: salto com onda de choque, investida que derruba entulho, marretada.
        capangaMor: {
            nome: 'Capanga-Mor', w: 40, h: 52, vida: 26, dano: 1, virgulas: 60, peso: 99, chefe: true,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const fase2 = e.vida <= e.vidaMax / 2;
                const k = fase2 ? 0.72 : 1;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                let vx = 0;
                e.ataque = null;
                const pe = e.y + e.h;
                switch (e.estado) {
                    case 'inicio':
                        if (e.t > 1.1) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'ocioso':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.7 * k) {
                            e.t = 0;
                            if (Math.abs(dx) < 85) e.estado = 'marretaPrep';
                            else e.estado = c.rng() < 0.5 ? 'saltoPrep' : 'corridaPrep';
                        }
                        break;
                    case 'saltoPrep':
                        if (e.t >= 0.45 * k) {
                            e.vy = -640;
                            e.vxSalto = limitar(dx / 0.7, -300, 300);
                            e.estado = 'salto';
                            e.t = 0;
                            e.noChao = false;
                        }
                        break;
                    case 'salto':
                        vx = e.vxSalto;
                        break;
                    case 'corridaPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.5 * k) { e.estado = 'corrida'; e.t = 0; }
                        break;
                    case 'corrida':
                        vx = e.dir * (fase2 ? 340 : 300);
                        break;
                    case 'atordoado':
                        if (e.t >= 1.1) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'marretaPrep':
                        if (e.t >= 0.55 * k) {
                            e.estado = 'marreta';
                            e.t = 0;
                            c.projetil({ tipo: 'onda', x: o.x + e.dir * 30, y: pe - 22, w: 14, h: 22, vx: e.dir * 240, vy: 0, vida: 4, chao: true });
                            c.evento({ tipo: 'impacto', x: o.x + e.dir * 30, y: pe, forte: true });
                            if (fase2) entulho(c, e, 2);
                        }
                        break;
                    case 'marreta':
                        e.ataque = { x: e.dir > 0 ? e.x + e.w - 6 : e.x - 44, y: e.y + 8, w: 50, h: e.h - 8 };
                        if (e.t >= 0.25) { e.estado = 'recuperar'; e.t = 0; }
                        break;
                    case 'recuperar':
                        if (e.t >= 0.5) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    default:
                        e.estado = 'inicio';
                        e.t = 0;
                }
                const r = c.mover(e, vx * dt, e.vy * dt);
                if (r.chao) {
                    e.vy = 0;
                    if (e.estado === 'salto' && e.t > 0.1) {
                        // Pouso: duas ondas de choque pelo chão.
                        for (const lado of [-1, 1]) {
                            c.projetil({ tipo: 'onda', x: o.x + lado * 24, y: pe - 22, w: 14, h: 22, vx: lado * 230, vy: 0, vida: 4, chao: true });
                        }
                        c.evento({ tipo: 'impacto', x: o.x, y: pe, forte: true });
                        if (fase2) entulho(c, e, 2);
                        e.estado = 'ocioso';
                        e.t = 0;
                    }
                }
                if (e.estado === 'corrida' && (r.esq || r.dir)) {
                    e.estado = 'atordoado';
                    e.t = 0;
                    c.evento({ tipo: 'impacto', x: o.x + e.dir * 20, y: o.y, forte: true });
                    entulho(c, e, fase2 ? 5 : 3);
                }
            },
        },

        // O Opressor do Chat (Stand do Inominável): joinha esmagador, gritos de fossa, glitch e pings.
        opressor: {
            nome: 'O Opressor do Chat', w: 56, h: 64, vida: 40, dano: 1, virgulas: 0, peso: 99, voa: true, chefe: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const fase2 = e.vida <= e.vidaMax / 2;
                const k = fase2 ? 0.75 : 1;
                const o = centro(e);
                const s = c.sala;
                const chao = e.chaoY;
                e.ataque = null;
                if (e.fila && e.fila.length) {
                    // Palavras do grito saindo em sequência.
                    e.fila[0].espera -= dt;
                    if (e.fila[0].espera <= 0) c.projetil(e.fila.shift().p);
                }
                switch (e.estado) {
                    case 'inicio':
                        guiar(e, 0, 0, 4, dt);
                        if (e.t > 1.4) { e.estado = 'flutuar'; e.t = 0; }
                        break;
                    case 'flutuar': {
                        const lado = e.lado || 1;
                        const hx = s.x + s.w / 2 + lado * 150 + Math.sin(c.tempo * 1.4) * 30 - o.x;
                        const hy = chao - 170 + Math.sin(c.tempo * 2.1) * 14 - o.y;
                        const hd = Math.hypot(hx, hy) || 1;
                        guiar(e, (hx / hd) * Math.min(130, hd * 2), (hy / hd) * Math.min(130, hd * 2), 3, dt);
                        if (e.t >= 1.3 * k) {
                            const opcoes = ['joinha', 'grito', 'glitch'];
                            if (fase2 && c.contar('ping') < 2) opcoes.push('invocar');
                            let escolha = opcoes[Math.floor(c.rng() * opcoes.length)];
                            if (escolha === e.ultimo) escolha = opcoes[(opcoes.indexOf(escolha) + 1) % opcoes.length];
                            e.ultimo = escolha;
                            e.estado = escolha;
                            e.t = 0;
                            e.lado = -lado;
                            if (escolha === 'joinha') e.alvoX = c.alvo.x;
                            if (escolha === 'grito') gritar(c, e, fase2);
                            c.evento({ tipo: 'ataqueChefe', ataque: escolha, x: o.x, y: o.y });
                        }
                        break;
                    }
                    case 'joinha':
                        guiar(e, 0, 0, 5, dt);
                        // Sombra do punho no chão (aviso) e depois o soco de cima.
                        e.aviso = { x: e.alvoX - 20, y: chao - 6, w: 40, h: 6, t: e.t / (0.8 * k) };
                        if (e.t >= 0.8 * k && !e.socou) {
                            e.socou = true;
                            c.projetil({ tipo: 'punho', x: e.alvoX - 20, y: s.y, w: 40, h: chao - s.y, vx: 0, vy: 0, vida: 0.4, atravessa: true });
                            c.evento({ tipo: 'impacto', x: e.alvoX, y: chao, forte: true });
                        }
                        if (e.t >= 0.8 * k + 0.6) { e.estado = 'flutuar'; e.t = 0; e.socou = false; e.aviso = null; }
                        break;
                    case 'grito':
                        guiar(e, 0, 0, 5, dt);
                        if (e.t >= (fase2 ? 3.6 : 3.1) && !(e.fila && e.fila.length)) { e.estado = 'flutuar'; e.t = 0; }
                        break;
                    case 'glitch':
                        guiar(e, 0, 0, 5, dt);
                        if (e.t >= 0.4 && !e.rajada1) { e.rajada1 = true; leque(c, e, 5, 0.3, 150, 'glitch', 5); }
                        if (e.t >= 1.0 && !e.rajada2) { e.rajada2 = true; leque(c, e, fase2 ? 7 : 5, 0.25, 165, 'glitch', 5); }
                        if (e.t >= 1.5) { e.estado = 'flutuar'; e.t = 0; e.rajada1 = e.rajada2 = false; }
                        break;
                    case 'invocar':
                        guiar(e, 0, 0, 5, dt);
                        if (e.t >= 0.5 && !e.invocou) {
                            e.invocou = true;
                            c.invocar('ping', s.x + 60, s.y + 70);
                            c.invocar('ping', s.x + s.w - 76, s.y + 70);
                        }
                        if (e.t >= 1.1) { e.estado = 'flutuar'; e.t = 0; e.invocou = false; }
                        break;
                    default:
                        e.estado = 'inicio';
                        e.t = 0;
                }
                voar(c, e, dt, 0);
                e.dir = c.alvo.x > o.x ? 1 : -1;
            },
        },
    };

    const PALAVRAS = ['OFENSA', 'BUEIRO', 'LIXO', 'CRINGE', 'BAN', 'L', 'RATIO', 'SPAM'];

    /** Grito de Fossa: palavras voando rente ao chão (pule) ou na altura da cabeça (fique no chão). */
    function gritar(c, e, fase2) {
        const s = c.sala;
        const lado = c.alvo.x > s.x + s.w / 2 ? -1 : 1; // vêm do lado oposto ao jogador
        const padrao = fase2 ? ['baixo', 'alto', 'baixo', 'baixo', 'alto', 'baixo'] : ['baixo', 'alto', 'baixo', 'alto'];
        e.fila = padrao.map((altura, i) => {
            const texto = PALAVRAS[Math.floor(c.rng() * PALAVRAS.length)];
            const w = 16 + texto.length * 10;
            const y = altura === 'baixo' ? e.chaoY - 20 : e.chaoY - 62;
            return {
                espera: i === 0 ? 0.5 : fase2 ? 0.5 : 0.62,
                p: { tipo: 'palavra', texto, x: lado > 0 ? s.x - w : s.x + s.w, y, w, h: 18, vx: lado * (fase2 ? 235 : 205), vy: 0, vida: 6, atravessa: true },
            };
        });
    }

    /** Entulho caindo do teto (False Knight): aviso de poeira e depois a pedra. */
    function entulho(c, e, n) {
        const s = c.sala;
        for (let i = 0; i < n; i++) {
            const x = s.x + 40 + c.rng() * (s.w - 80);
            c.projetil({ tipo: 'pedra', x, y: s.y + 44, vx: 0, vy: 0, r: 7, vida: 4, espera: 0.55 + i * 0.18, gravidade: 900 });
        }
    }

    // ------------------------------------------------------------ Bug nas bordas

    /** Gruda o bug na superfície mais próxima (chão, teto ou parede). */
    function grudar(e, c) {
        const T = c.T;
        const tx = Math.floor((e.x + e.w / 2) / T);
        const ty = Math.floor((e.y + e.h / 2) / T);
        const opcoes = [
            [0, 1, 0, -1, tx * T + T / 2, (ty + 1) * T],   // chão embaixo
            [0, -1, 0, 1, tx * T + T / 2, ty * T],         // teto em cima
            [-1, 0, 1, 0, tx * T, ty * T + T / 2],         // parede à esquerda
            [1, 0, -1, 0, (tx + 1) * T, ty * T + T / 2],   // parede à direita
        ];
        for (const [ox, oy, nx, ny, px, py] of opcoes) {
            if (c.solido(tx + ox, ty + oy)) {
                e.nx = nx; e.ny = ny; e.px = px; e.py = py;
                e.preso = true;
                return;
            }
        }
        e.nx = 0; e.ny = -1; e.px = tx * T + T / 2; e.py = (ty + 1) * T;
        e.preso = true;
    }

    /**
     * Anda `dist` px pela borda entre sólido e vazio, em volta dos blocos
     * (sentido horário quando e.sentido > 0). Nas quinas vira: quina externa
     * (a superfície acaba) → dobra para baixo dela; quina interna (parede na
     * frente) → sobe por ela.
     */
    function andarNaBorda(e, c, dist) {
        const T = c.T;
        const sentido = e.sentido || 1;
        const cel = (x, y) => c.solido(Math.floor(x / T), Math.floor(y / T));
        let resta = dist;
        for (let guarda = 0; resta > 1e-6 && guarda < 6; guarda++) {
            const tx = sentido > 0 ? -e.ny : e.ny;
            const ty = sentido > 0 ? e.nx : -e.nx;
            const coord = tx !== 0 ? e.px : e.py;
            const passo = tx !== 0 ? tx : ty;
            // Distância até a próxima linha da grade na direção do movimento.
            const linha = passo > 0 ? (Math.floor(coord / T + 1e-7) + 1) * T : (Math.ceil(coord / T - 1e-7) - 1) * T;
            const ate = Math.abs(linha - coord);
            const anda = Math.min(resta, ate);
            e.px += tx * anda;
            e.py += ty * anda;
            resta -= anda;
            if (anda < ate - 1e-7) break;
            // Chegou numa linha da grade: vê se a superfície continua.
            e.px = Math.round(e.px * 1000) / 1000;
            e.py = Math.round(e.py * 1000) / 1000;
            const fx = e.px + tx * 0.5 + e.nx * 0.5;
            const fy = e.py + ty * 0.5 + e.ny * 0.5;
            const dx = e.px + tx * 0.5 - e.nx * 0.5;
            const dy = e.py + ty * 0.5 - e.ny * 0.5;
            if (cel(fx, fy)) {
                // Quina interna: parede na frente.
                e.nx = -tx; e.ny = -ty;
            } else if (!cel(dx, dy)) {
                // Quina externa: acabou o chão, dobra.
                e.nx = tx; e.ny = ty;
            }
        }
    }

    /** Cria um inimigo novo a partir da marcação no mapa. */
    function criar(def, fase = 0) {
        const tipo = TIPOS[def.tipo];
        if (!tipo) throw new Error(`Inimigo desconhecido: ${def.tipo}`);
        const e = {
            id: def.id,
            tipo: def.tipo,
            x: def.x,
            y: def.y,
            w: tipo.w,
            h: tipo.h,
            x0: def.x,
            y0: def.y,
            vx: 0,
            vy: 0,
            kx: 0,
            vida: tipo.vida,
            vidaMax: tipo.vida,
            dano: tipo.dano,
            voa: !!tipo.voa,
            chefe: !!tipo.chefe,
            estado: tipo.chefe ? 'inicio' : 'andar',
            t: 0,
            dir: -1,
            fase,
            flash: 0,
            vivo: true,
            noChao: false,
            escudo: false,
            ataque: null,
            alpha: 1,
            intangivel: false,
            sentido: fase > 0.5 ? 1 : -1,
        };
        return e;
    }

    return { TIPOS, criar, andarNaBorda, grudar };
});
