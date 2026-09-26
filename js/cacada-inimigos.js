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
        // ================================================ EXPANSÃO
        // ------------------------------------------------ Esgoto do Chorume

        // Rato do Comentário: corre rápido, vira na beirada e dá bote quando você chega perto.
        rato: {
            nome: 'Rato do Comentário', w: 20, h: 14, vida: 3, dano: 1, virgulas: 4, peso: 0.9,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                let vx = 0;
                if (e.estado === 'preparar') {
                    if (e.t >= 0.35) {
                        e.estado = 'bote';
                        e.t = 0;
                        e.vy = -230;
                        c.evento({ tipo: 'investida', x: o.x, y: o.y });
                    }
                } else if (e.estado === 'bote') {
                    vx = e.dir * 290;
                    if (e.t > 0.1 && e.noChao) { e.estado = 'andar'; e.t = 0; e.recarga = 1.1; }
                } else {
                    vx = e.dir * 85;
                    e.recarga = Math.max(0, (e.recarga || 0) - dt);
                    if (paredeAFrente(c, e, e.dir) || !chaoAFrente(c, e, e.dir)) { e.dir = -e.dir; vx = 0; }
                    if (!e.recarga && Math.abs(dy) < 30 && Math.abs(dx) < 110 && Math.sign(dx) === e.dir) {
                        e.estado = 'preparar';
                        e.t = 0;
                        c.evento({ tipo: 'alerta', x: o.x, y: e.y });
                    }
                }
                if (e.estado === 'preparar') vx = 0;
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                e.noChao = r.chao;
                if (r.chao) e.vy = 0;
                if (e.estado === 'bote' && (r.esq || r.dir)) e.dir = -e.dir;
            },
        },

        // Boca-de-Lobo: parece um bueiro no chão; abre quando você passa por cima e morde para cima.
        bocadelobo: {
            nome: 'Boca-de-Lobo', w: 22, h: 14, vida: 4, dano: 0, virgulas: 5, peso: 99,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                e.ataque = null;
                if (e.estado === 'andar') { e.estado = 'fechada'; e.intangivel = true; }
                switch (e.estado) {
                    case 'fechada':
                        e.dano = 0;
                        if (Math.abs(dx) < 34 && dy < 0 && dy > -90) {
                            e.estado = 'abrir';
                            e.t = 0;
                            e.intangivel = false;
                            c.evento({ tipo: 'alerta', x: o.x, y: e.y });
                        }
                        break;
                    case 'abrir':
                        if (e.t >= 0.32) { e.estado = 'morder'; e.t = 0; c.evento({ tipo: 'impacto', x: o.x, y: e.y }); }
                        break;
                    case 'morder':
                        e.dano = 1;
                        e.ataque = { x: e.x - 2, y: e.y - 34, w: e.w + 4, h: 36 };
                        if (e.t >= 0.4) { e.estado = 'recuar'; e.t = 0; e.dano = 0; }
                        break;
                    case 'recuar':
                        if (e.t >= 0.9) { e.estado = 'fechada'; e.t = 0; e.intangivel = true; }
                        break;
                    default:
                        e.estado = 'fechada';
                }
            },
        },

        // Bolha de Chorume: flutua devagar até você, incha e estoura em respingos.
        bolha: {
            nome: 'Bolha de Chorume', w: 16, h: 16, vida: 1, dano: 1, virgulas: 2, peso: 0.6, voa: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                const d = Math.hypot(dx, dy) || 1;
                if (e.estado === 'inchar') {
                    guiar(e, 0, 0, 5, dt);
                    if (e.t >= 0.6) {
                        for (let i = 0; i < 6; i++) {
                            const a = (i / 6) * Math.PI * 2 + 0.3;
                            c.projetil({ tipo: 'chorume', x: o.x, y: o.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 5, vida: 0.55 });
                        }
                        c.evento({ tipo: 'estouro', x: o.x, y: o.y });
                        e.vivo = false;
                    }
                } else {
                    const alvoVy = Math.sin(c.tempo * 1.8 + e.fase * 6) * 18;
                    if (d < 240) guiar(e, (dx / d) * 28, (dy / d) * 28 + alvoVy, 1.5, dt);
                    else guiar(e, 0, alvoVy, 1.5, dt);
                    if (d < 52) { e.estado = 'inchar'; e.t = 0; c.evento({ tipo: 'alerta', x: o.x, y: e.y }); }
                }
                voar(c, e, dt);
            },
        },

        // Cano que pinga chorume (não dá para acertar; é um perigo do cenário).
        gota: {
            nome: 'Cano pingando', w: 16, h: 10, vida: 999, dano: 0, virgulas: 0, peso: 99, voa: true,
            atualizar(e, c, dt) {
                e.intangivel = true;
                e.t += dt;
                const periodo = 1.7;
                if (e.t >= periodo + e.fase * 0.8) {
                    e.t = 0;
                    const o = centro(e);
                    c.projetil({ tipo: 'gota', x: o.x, y: e.y + e.h, vx: 0, vy: 30, r: 4, vida: 3, gravidade: 900 });
                }
            },
        },

        // ------------------------------------------------ Feira da Madrugada

        // Pop-up: pisca e reaparece perto de você, mira e atira um X.
        popup: {
            nome: 'Pop-up', w: 16, h: 14, vida: 2, dano: 1, virgulas: 3, peso: 0.7, voa: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                const d = Math.hypot(dx, dy) || 1;
                e.dir = dx > 0 ? 1 : -1;
                switch (e.estado) {
                    case 'piscar':
                        guiar(e, 0, 0, 8, dt);
                        e.alpha = Math.max(0, 1 - e.t / 0.3);
                        if (e.t >= 0.3) {
                            const lugar = c.lugarLivre(c.alvo.x, c.alvo.y, 70, 130, e.w, e.h);
                            if (lugar) { e.x = lugar.x; e.y = lugar.y; }
                            e.estado = 'mirar';
                            e.t = 0;
                            e.alpha = 1;
                            e.intangivel = false;
                        }
                        break;
                    case 'mirar':
                        guiar(e, 0, 0, 8, dt);
                        if (e.t >= 0.45) {
                            c.projetil({ tipo: 'botaoX', x: o.x, y: o.y, vx: (dx / d) * 175, vy: (dy / d) * 175, r: 5, vida: 3 });
                            e.estado = 'pairar';
                            e.t = 0;
                        }
                        break;
                    default: {
                        const hx = e.x0 + Math.sin(c.tempo * 1.2 + e.fase * 5) * 16 - e.x;
                        const hy = e.y0 + Math.sin(c.tempo * 2 + e.fase * 5) * 8 - e.y;
                        guiar(e, hx * 2, hy * 2, 3, dt);
                        if (e.t >= 2.2 && d < 300) {
                            e.estado = 'piscar';
                            e.t = 0;
                            e.intangivel = true;
                            c.evento({ tipo: 'piscou', x: o.x, y: o.y });
                        }
                    }
                }
                voar(c, e, dt, 0);
            },
        },

        // Golpista do Pix: corre até você, rouba vírgulas no toque e foge (derrubado, devolve).
        golpista: {
            nome: 'Golpista do Pix', w: 14, h: 24, vida: 3, dano: 1, virgulas: 3, peso: 0.9, ladrao: true,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                let vx = 0;
                if (e.estado === 'fugir') {
                    e.dir = dx > 0 ? -1 : 1;
                    vx = e.dir * 175;
                    if (paredeAFrente(c, e, e.dir)) {
                        // Encurralado: pula a parede se der, senão fica tremendo.
                        if (e.noChao && e.t > 0.4) { e.vy = -420; e.t = 0; } else vx = 0;
                    } else if (!chaoAFrente(c, e, e.dir) && e.noChao) {
                        e.vy = -380;
                    }
                } else if (e.estado === 'correr') {
                    e.dir = dx > 0 ? 1 : -1;
                    vx = e.dir * 150;
                    if (!chaoAFrente(c, e, e.dir) || paredeAFrente(c, e, e.dir)) vx = 0;
                    if (Math.abs(dx) > 260 || Math.abs(dy) > 80) { e.estado = 'andar'; e.t = 0; }
                } else {
                    vx = e.dir * 40;
                    if (paredeAFrente(c, e, e.dir) || !chaoAFrente(c, e, e.dir)) { e.dir = -e.dir; vx = 0; }
                    if (Math.abs(dx) < 200 && Math.abs(dy) < 40) {
                        e.estado = 'correr';
                        e.t = 0;
                        c.evento({ tipo: 'alerta', x: o.x, y: e.y });
                    }
                }
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                e.noChao = r.chao;
                if (r.chao || (r.teto && e.vy < 0)) e.vy = 0;
            },
        },

        // Boneco de Posto: fica no lugar se debatendo; os braços machucam dos dois lados.
        boneco: {
            nome: 'Boneco de Posto', w: 18, h: 40, vida: 3, dano: 1, virgulas: 4, peso: 99,
            atualizar(e, c, dt) {
                e.t += dt;
                const balanco = Math.sin(c.tempo * 5 + e.fase * 6);
                e.balanco = balanco;
                const lado = balanco > 0 ? 1 : -1;
                const alcance = 8 + Math.abs(balanco) * 14;
                e.ataque = { x: lado > 0 ? e.x + e.w - 2 : e.x - alcance + 2, y: e.y + 4, w: alcance, h: 18 };
            },
        },

        // ------------------------------------------------ Ruínas do Orkut

        // Scrap Fantasma: flutua devagar ATRAVÉS das paredes e dá um bote.
        scrap: {
            nome: 'Scrap Fantasma', w: 20, h: 18, vida: 3, dano: 1, virgulas: 4, peso: 0.8, voa: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                const d = Math.hypot(dx, dy) || 1;
                e.dir = dx > 0 ? 1 : -1;
                if (e.estado === 'preparar') {
                    guiar(e, 0, 0, 6, dt);
                    if (e.t >= 0.45) { e.estado = 'atacar'; e.t = 0; e.vx = (dx / d) * 185; e.vy = (dy / d) * 185; }
                } else if (e.estado === 'atacar') {
                    if (e.t >= 0.45) { e.estado = 'pairar'; e.t = 0; }
                } else {
                    if (d < 280) guiar(e, (dx / d) * 38, (dy / d) * 38, 1.5, dt);
                    else guiar(e, 0, Math.sin(c.tempo * 2 + e.fase * 4) * 12, 2, dt);
                    if (e.t >= 2.6 && d < 150) { e.estado = 'preparar'; e.t = 0; c.evento({ tipo: 'alerta', x: o.x, y: e.y }); }
                }
                // Atravessa paredes: anda direto, só não sai da sala.
                const s = c.sala;
                e.x = limitar(e.x + e.vx * dt, s.x, s.x + s.w - e.w);
                e.y = limitar(e.y + e.vy * dt, s.y, s.y + s.h - e.h);
            },
        },

        // Fake: um saco de vírgulas de mentira que acorda e pula em você.
        fake: {
            nome: 'Fake', w: 14, h: 14, vida: 3, dano: 0, virgulas: 12, peso: 0.8,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                let vx = 0;
                if (e.estado === 'andar') e.estado = 'disfarce';
                if (e.estado === 'disfarce') {
                    e.dano = 0;
                    if ((Math.abs(dx) < 46 && Math.abs(dy) < 40) || e.vida < e.vidaMax) {
                        e.estado = 'revelar';
                        e.t = 0;
                        c.evento({ tipo: 'alerta', x: o.x, y: e.y });
                    }
                } else if (e.estado === 'revelar') {
                    e.dano = 1;
                    if (e.t >= 0.3) { e.estado = 'pular'; e.t = 0; }
                } else {
                    e.dano = 1;
                    e.dir = dx > 0 ? 1 : -1;
                    if (e.noChao && e.t >= 0.35) { e.vy = -360; e.t = 0; }
                    if (!e.noChao) vx = e.dir * 120;
                }
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                e.noChao = r.chao;
                if (r.chao) e.vy = 0;
                if (r.teto && e.vy < 0) e.vy = 0;
            },
        },

        // Recado Cintilante: torre grudada na parede, atira 3 estrelinhas.
        recado: {
            nome: 'Recado Cintilante', w: 16, h: 16, vida: 3, dano: 1, virgulas: 4, peso: 99, voa: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const o = centro(e);
                const d = Math.hypot(c.alvo.x - o.x, c.alvo.y - o.y);
                e.vx = 0;
                e.vy = 0;
                e.dir = c.alvo.x > o.x ? 1 : -1;
                if (e.estado === 'mirar') {
                    if (e.t >= 0.5) { leque(c, e, 3, 0.28, 150, 'estrela', 5); e.estado = 'andar'; e.t = 0; }
                } else if (e.t >= 2.4 + e.fase && d < 300) {
                    e.estado = 'mirar';
                    e.t = 0;
                }
            },
        },

        // ================================================ CHEFES DA EXPANSÃO

        // Ratão do Ratio (Dung Defender): rola quicando nas paredes, mergulha no chão e sai
        // embaixo de você, arremessa tampas de bueiro.
        ratao: {
            nome: 'Ratão do Ratio', w: 44, h: 50, vida: 34, dano: 1, virgulas: 80, peso: 99, chefe: true,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const fase2 = e.vida <= e.vidaMax / 2;
                const k = fase2 ? 0.72 : 1;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                let vx = 0;
                e.ataque = null;
                switch (e.estado) {
                    case 'inicio':
                        if (e.t > 1.1) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'ocioso':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.75 * k) {
                            const opcoes = ['rolarPrep', 'arremessarPrep', 'mergulharPrep'];
                            let escolha = opcoes[Math.floor(c.rng() * opcoes.length)];
                            if (escolha === e.ultimo) escolha = opcoes[(opcoes.indexOf(escolha) + 1) % opcoes.length];
                            e.ultimo = escolha;
                            e.estado = escolha;
                            e.t = 0;
                            c.evento({ tipo: 'ataqueChefe', ataque: escolha, x: o.x, y: o.y });
                        }
                        break;
                    case 'rolarPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.5 * k) { e.estado = 'rolar'; e.t = 0; e.quiques = 0; }
                        break;
                    case 'rolar':
                        vx = e.dir * (fase2 ? 360 : 310);
                        break;
                    case 'atordoado':
                        if (e.t >= 1.0) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'arremessarPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.55 * k) {
                            e.estado = 'arremessar';
                            e.t = 0;
                            const n = fase2 ? 2 : 1;
                            for (let i = 0; i < n; i++) {
                                const tempo = 0.9 + i * 0.25;
                                c.projetil({ tipo: 'tampa', x: o.x, y: e.y + 8, vx: limitar((dx + (i ? e.dir * 60 : 0)) / tempo, -320, 320), vy: -430, r: 10, vida: 3, gravidade: 900 });
                            }
                        }
                        break;
                    case 'arremessar':
                        if (e.t >= 0.5) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'mergulharPrep':
                        if (e.t >= 0.45 * k) {
                            e.estado = 'submerso';
                            e.t = 0;
                            e.intangivel = true;
                            c.evento({ tipo: 'impacto', x: o.x, y: e.y + e.h, forte: false });
                        }
                        break;
                    case 'submerso':
                        // Nada por baixo do chorume até embaixo de você.
                        vx = limitar(dx * 4, -220, 220);
                        e.aviso = { x: o.x - 22, y: e.y + e.h - 6, w: 44, h: 6, t: Math.min(1, e.t / (1.1 * k)) };
                        if (e.t >= 1.1 * k) { e.estado = 'emergir'; e.t = 0; }
                        break;
                    case 'emergir':
                        e.aviso = null;
                        if (!e.saiu) {
                            e.saiu = true;
                            e.intangivel = false;
                            e.vy = -620;
                            for (let i = -1; i <= 1; i++) {
                                c.projetil({ tipo: 'chorume', x: o.x + i * 12, y: e.y + e.h - 10, vx: i * 130, vy: -380, r: 6, vida: 2.5, gravidade: 900 });
                            }
                            c.evento({ tipo: 'impacto', x: o.x, y: e.y + e.h, forte: true });
                        }
                        e.ataque = { x: e.x - 4, y: e.y - 6, w: e.w + 8, h: e.h + 6 };
                        break;
                    default:
                        e.estado = 'inicio';
                        e.t = 0;
                }
                const kx = e.estado === 'ocioso' ? recuoChao(e, dt) : 0;
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                if (r.chao) {
                    e.vy = 0;
                    if (e.estado === 'emergir' && e.t > 0.15) { e.estado = 'ocioso'; e.t = 0; e.saiu = false; }
                }
                if (e.estado === 'rolar' && (r.esq || r.dir)) {
                    e.dir = -e.dir;
                    e.quiques++;
                    c.evento({ tipo: 'impacto', x: o.x + e.dir * 20, y: o.y, forte: true });
                    if (fase2) entulho(c, e, 2);
                    if (e.quiques >= (fase2 ? 3 : 2)) { e.estado = 'atordoado'; e.t = 0; }
                }
            },
        },

        // Coach Quântico: leque de notas falsas, invoca Pop-ups, palestra correndo e pulo com onda de som.
        coach: {
            nome: 'Coach Quântico', w: 30, h: 54, vida: 36, dano: 1, virgulas: 90, peso: 99, chefe: true,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const fase2 = e.vida <= e.vidaMax / 2;
                const k = fase2 ? 0.72 : 1;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const pe = e.y + e.h;
                let vx = 0;
                e.ataque = null;
                switch (e.estado) {
                    case 'inicio':
                        if (e.t > 1.1) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'ocioso':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.8 * k) {
                            const opcoes = ['jogarPrep', 'palestraPrep', 'puloPrep'];
                            if (c.contar('popup') < 2) opcoes.push('invocar');
                            let escolha = opcoes[Math.floor(c.rng() * opcoes.length)];
                            if (escolha === e.ultimo) escolha = opcoes[(opcoes.indexOf(escolha) + 1) % opcoes.length];
                            e.ultimo = escolha;
                            e.estado = escolha;
                            e.t = 0;
                            c.evento({ tipo: 'ataqueChefe', ataque: escolha, x: o.x, y: o.y });
                        }
                        break;
                    case 'jogarPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.5 * k) { e.estado = 'jogar'; e.t = 0; leque(c, e, 5, 0.22, 205, 'nota', 6); }
                        break;
                    case 'jogar':
                        if (fase2 && e.t >= 0.35 && !e.segunda) { e.segunda = true; leque(c, e, 4, 0.3, 225, 'nota', 6); }
                        if (e.t >= 0.6) { e.estado = 'ocioso'; e.t = 0; e.segunda = false; }
                        break;
                    case 'invocar':
                        if (e.t >= 0.55 && !e.invocou) {
                            e.invocou = true;
                            const s = c.sala;
                            c.invocar('popup', s.x + 70, s.y + 90);
                            c.invocar('popup', s.x + s.w - 86, s.y + 90);
                        }
                        if (e.t >= 1.0) { e.estado = 'ocioso'; e.t = 0; e.invocou = false; }
                        break;
                    case 'palestraPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.55 * k) { e.estado = 'palestra'; e.t = 0; }
                        break;
                    case 'palestra':
                        vx = e.dir * (fase2 ? 350 : 310);
                        e.ataque = { x: e.dir > 0 ? e.x + e.w - 4 : e.x - 10, y: e.y + 10, w: 14, h: 30 };
                        break;
                    case 'cansado':
                        if (e.t >= 0.9) { e.estado = 'ocioso'; e.t = 0; }
                        break;
                    case 'puloPrep':
                        if (e.t >= 0.45 * k) {
                            e.vy = -660;
                            e.vxSalto = limitar(dx / 0.72, -320, 320);
                            e.estado = 'pulo';
                            e.t = 0;
                        }
                        break;
                    case 'pulo':
                        vx = e.vxSalto;
                        break;
                    default:
                        e.estado = 'inicio';
                        e.t = 0;
                }
                const r = c.mover(e, vx * dt, e.vy * dt);
                if (r.chao) {
                    e.vy = 0;
                    if (e.estado === 'pulo' && e.t > 0.1) {
                        for (const lado of [-1, 1]) {
                            c.projetil({ tipo: 'anel', x: o.x + lado * 20, y: pe - 16, w: 18, h: 16, vx: lado * (fase2 ? 260 : 225), vy: 0, vida: 4, chao: true });
                        }
                        c.evento({ tipo: 'impacto', x: o.x, y: pe, forte: true });
                        e.estado = 'ocioso';
                        e.t = 0;
                    }
                }
                if (e.estado === 'palestra' && (r.esq || r.dir)) {
                    e.estado = 'cansado';
                    e.t = 0;
                    c.evento({ tipo: 'impacto', x: o.x + e.dir * 16, y: o.y, forte: true });
                }
            },
        },

        // A Scrapeira (Soul Master): teleporta, corações teleguiados, mergulho e grito de recados.
        scrapeira: {
            nome: 'A Scrapeira', w: 40, h: 60, vida: 40, dano: 1, virgulas: 100, peso: 99, voa: true, chefe: true,
            atualizar(e, c, dt) {
                e.t += dt;
                const fase2 = e.vida <= e.vidaMax / 2;
                const k = fase2 ? 0.75 : 1;
                const o = centro(e);
                const s = c.sala;
                const chao = e.chaoY;
                e.ataque = null;
                if (e.fila && e.fila.length) {
                    e.fila[0].espera -= dt;
                    if (e.fila[0].espera <= 0) c.projetil(e.fila.shift().p);
                }
                switch (e.estado) {
                    case 'inicio':
                        guiar(e, 0, 0, 4, dt);
                        if (e.t > 1.3) { e.estado = 'flutuar'; e.t = 0; }
                        break;
                    case 'flutuar': {
                        const hx = (e.pontoX ?? o.x) + Math.sin(c.tempo * 1.3) * 24 - o.x;
                        const hy = chao - 150 + Math.sin(c.tempo * 2.2) * 12 - o.y;
                        guiar(e, hx * 2, hy * 2, 3, dt);
                        if (e.t >= 1.1 * k) {
                            const opcoes = ['sumir', 'conjurar', 'mergulhoPrep'];
                            if (fase2) opcoes.push('grito');
                            let escolha = opcoes[Math.floor(c.rng() * opcoes.length)];
                            if (escolha === e.ultimo) escolha = opcoes[(opcoes.indexOf(escolha) + 1) % opcoes.length];
                            e.ultimo = escolha;
                            e.estado = escolha;
                            e.t = 0;
                            if (escolha === 'grito') gritar(c, e, fase2, RECADOS);
                            c.evento({ tipo: 'ataqueChefe', ataque: escolha, x: o.x, y: o.y });
                        }
                        break;
                    }
                    case 'sumir':
                        guiar(e, 0, 0, 6, dt);
                        e.intangivel = e.t > 0.15;
                        e.alpha = Math.max(0, 1 - e.t / 0.4);
                        if (e.t >= 0.4) {
                            e.pontoX = s.x + 80 + c.rng() * (s.w - 160);
                            e.x = e.pontoX - e.w / 2;
                            e.y = chao - 150 - e.h / 2;
                            e.estado = 'aparecer';
                            e.t = 0;
                        }
                        break;
                    case 'aparecer':
                        e.alpha = Math.min(1, e.t / 0.3);
                        if (e.t >= 0.3) { e.estado = 'flutuar'; e.t = 0; e.intangivel = false; e.alpha = 1; }
                        break;
                    case 'conjurar':
                        guiar(e, 0, 0, 5, dt);
                        if (e.t >= 0.6 && !e.conjurou) {
                            e.conjurou = true;
                            const n = fase2 ? 5 : 3;
                            for (let i = 0; i < n; i++) {
                                const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5;
                                c.projetil({ tipo: 'coracao', x: o.x, y: o.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 7, vida: 4.5, guiado: 115, espera: i * 0.08 });
                            }
                        }
                        if (e.t >= 1.2) { e.estado = 'flutuar'; e.t = 0; e.conjurou = false; }
                        break;
                    case 'mergulhoPrep':
                        // Sobe um pouco em cima de você e avisa.
                        guiar(e, limitar((c.alvo.x - o.x) * 3, -260, 260), -60, 4, dt);
                        if (e.t >= 0.6 * k) { e.estado = 'mergulho'; e.t = 0; e.vx = 0; e.vy = 520; }
                        break;
                    case 'mergulho':
                        e.ataque = { x: e.x, y: e.y + e.h - 10, w: e.w, h: 14 };
                        break;
                    case 'subir':
                        guiar(e, 0, -140, 4, dt);
                        if (e.t >= 0.8) { e.estado = 'flutuar'; e.t = 0; e.pontoX = o.x; }
                        break;
                    case 'grito':
                        guiar(e, 0, 0, 5, dt);
                        if (e.t >= (fase2 ? 3.6 : 3.1) && !(e.fila && e.fila.length)) { e.estado = 'flutuar'; e.t = 0; }
                        break;
                    default:
                        e.estado = 'inicio';
                        e.t = 0;
                }
                const r = voar(c, e, dt, 0);
                if (e.estado === 'mergulho' && (r.chao || e.t > 1.2)) {
                    e.estado = 'subir';
                    e.t = 0;
                    e.vy = 0;
                    c.evento({ tipo: 'impacto', x: o.x, y: e.y + e.h, forte: true });
                    for (const lado of [-1, 1]) {
                        c.projetil({ tipo: 'estrela', x: o.x, y: e.y + e.h - 8, vx: lado * 170, vy: -160, r: 5, vida: 2, gravidade: 500 });
                    }
                }
                e.dir = c.alvo.x > o.x ? 1 : -1;
            },
        },

        // Degustador Glitch (chefe secreto): imita você; corre, pula, dá dash, coronhada e rajada.
        glitch: {
            nome: 'Degustador Glitch', w: 14, h: 26, vida: 30, dano: 1, virgulas: 150, peso: 3, chefe: true,
            atualizar(e, c, dt) {
                cair(e, dt);
                e.t += dt;
                const fase2 = e.vida <= e.vidaMax / 2;
                const k = fase2 ? 0.7 : 1;
                const o = centro(e);
                const dx = c.alvo.x - o.x;
                const dy = c.alvo.y - o.y;
                let vx = 0;
                e.ataque = null;
                e.recarga = Math.max(0, (e.recarga ?? 0.8) - dt);
                switch (e.estado) {
                    case 'inicio':
                        if (e.t > 1.0) { e.estado = 'perseguir'; e.t = 0; }
                        break;
                    case 'perseguir':
                        e.dir = dx > 0 ? 1 : -1;
                        vx = e.dir * (fase2 ? 185 : 165);
                        if (Math.abs(dx) < 16) vx = 0;
                        if (e.noChao && dy < -50 && e.recarga <= 0) { e.vy = -560; e.recarga = 0.6; }
                        if (e.recarga <= 0) {
                            if (Math.abs(dx) < 42 && Math.abs(dy) < 40) { e.estado = 'golpePrep'; e.t = 0; }
                            else if (Math.abs(dx) > 170 && Math.abs(dy) < 40) { e.estado = c.rng() < 0.5 ? 'rajadaPrep' : 'dashPrep'; e.t = 0; }
                        }
                        break;
                    case 'golpePrep':
                        if (e.t >= 0.22 * k) { e.estado = 'golpe'; e.t = 0; c.evento({ tipo: 'golpeGlitch', x: o.x, y: o.y, lado: e.dir }); }
                        break;
                    case 'golpe':
                        e.ataque = { x: e.dir > 0 ? e.x + e.w - 4 : e.x - 30, y: e.y - 4, w: 34, h: e.h + 4 };
                        if (e.t >= 0.14) { e.estado = 'perseguir'; e.t = 0; e.recarga = 0.45 * k; }
                        break;
                    case 'rajadaPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.35 * k) {
                            c.projetil({ tipo: 'rajadaGlitch', x: e.dir > 0 ? e.x + e.w : e.x - 30, y: e.y + 4, w: 30, h: 14, vx: e.dir * 360, vy: 0, vida: 1.4 });
                            e.estado = 'perseguir';
                            e.t = 0;
                            e.recarga = 0.9 * k;
                        }
                        break;
                    case 'dashPrep':
                        e.dir = dx > 0 ? 1 : -1;
                        if (e.t >= 0.25 * k) { e.estado = 'dash'; e.t = 0; }
                        break;
                    case 'dash':
                        vx = e.dir * 470;
                        e.vy = 0;
                        if (e.t >= 0.22) { e.estado = 'perseguir'; e.t = 0; e.recarga = 0.5 * k; }
                        break;
                    default:
                        e.estado = 'inicio';
                        e.t = 0;
                }
                const kx = recuoChao(e, dt);
                const r = c.mover(e, (vx + kx) * dt, e.vy * dt);
                e.noChao = r.chao;
                if (r.chao || (r.teto && e.vy < 0)) e.vy = 0;
                if (e.estado === 'dash' && (r.esq || r.dir)) { e.estado = 'perseguir'; e.t = 0; }
            },
        },
    };

    const PALAVRAS = ['OFENSA', 'BUEIRO', 'LIXO', 'CRINGE', 'BAN', 'L', 'RATIO', 'SPAM'];
    const RECADOS = ['SCRAP', 'FAKE', 'DEPOIMENTO', 'ME ADD', 'KKKK', 'SDDS', 'TESTE', 'BJS'];

    /** Grito de Fossa: palavras voando rente ao chão (pule) ou na altura da cabeça (fique no chão). */
    function gritar(c, e, fase2, palavras = PALAVRAS) {
        const s = c.sala;
        const lado = c.alvo.x > s.x + s.w / 2 ? -1 : 1; // vêm do lado oposto ao jogador
        const padrao = fase2 ? ['baixo', 'alto', 'baixo', 'baixo', 'alto', 'baixo'] : ['baixo', 'alto', 'baixo', 'alto'];
        e.fila = padrao.map((altura, i) => {
            const texto = palavras[Math.floor(c.rng() * palavras.length)];
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
