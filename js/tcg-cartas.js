// ============================================================================
// Batalha dos Torados: números de combate das cartas do Baralho Enzo.
// Mesmo `id` do js/baralho-dados.js (arte, nome, raridade e tipo vêm de lá).
// Fica separado para balancear o jogo sem mexer no sorteio dos pacotes.
//
// Lutadores (personagem e goon): `hp`, `recuo` (Aura para voltar ao banco),
// `ataques` [{ nome, custo, dano, alvo?, efeitos? }] e `poder?`.
// Campos: `campo` { nome, texto, tipo, ... }.
// O que cada `tipo` de efeito faz está em js/tcg-regras.js (EFEITOS_*).
// Mudou um número? Rode `node --test test/tcg-regras.test.js`.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.EnzoTcgCartas = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const congelar = (obj) => {
        Object.values(obj).forEach((v) => { if (v && typeof v === 'object') congelar(v); });
        return Object.freeze(obj);
    };

    const COMBATE = {
        // ---- Lendários (nocaute vale 2 pontos) --------------------------------
        'enzo-games': { hp: 140, recuo: 2, ataques: [
            { nome: 'Almôndega', custo: 1, dano: 30 },
            { nome: 'Macarronada a 300%', custo: 3, dano: 120 },
        ] },
        'cabo-coco': { hp: 130, recuo: 2,
            poder: { nome: 'Conteúdo Banido', tipo: 'banirCampos', ativavel: false,
                texto: 'Com ele no ativo, o adversário não joga campos.' },
            ataques: [
                { nome: 'Copo de Lágrimas', custo: 2, dano: 60, efeitos: [{ tipo: 'curarSi', valor: 20 }] },
            ] },
        'degustador-da-noite': { hp: 130, recuo: 1, ataques: [
            { nome: 'Vírgula-rangue', custo: 1, dano: 20, alvo: 'qualquer' },
            { nome: 'Escudo de Parênteses', custo: 3, dano: 90, efeitos: [{ tipo: 'escudo', valor: 30 }] },
        ] },
        'o-inominavel': { hp: 120, recuo: 2,
            poder: { nome: 'Besteira no Discord', tipo: 'notificarAtivo', ativavel: true,
                texto: '1 vez por turno: deixa o ativo do adversário Notificado.' },
            ataques: [
                { nome: 'Bala Dourada', custo: 3, dano: 60, alvo: 'qualquer' },
            ] },
        'superkid': { hp: 130, recuo: 2, ataques: [
            { nome: 'Farmar Aura', custo: 1, dano: 0, efeitos: [{ tipo: 'auraSi', valor: 1 }] },
            { nome: 'Aura de 67 Segundos', custo: 2, dano: 20, efeitos: [{ tipo: 'bonusPorAura', valor: 20 }] },
        ] },

        // ---- Épicos ----------------------------------------------------------
        'chorao': { hp: 110, recuo: 3,
            poder: { nome: 'Vou te Processar!', tipo: 'contraAtaque', ativavel: false, valor: 20,
                texto: 'Quem ataca o Chorão leva 20 de volta.' },
            ataques: [{ nome: 'Birra', custo: 2, dano: 50 }] },
        'sombra-do-degustador': { hp: 90, recuo: 0, ataques: [
            { nome: 'Teemo no Top', custo: 1, dano: 20, efeitos: [{ tipo: 'estado', estado: 'notificado' }] },
            { nome: 'Fumaça Roxa', custo: 2, dano: 50 },
        ] },

        // ---- Raros -----------------------------------------------------------
        'hatsune-neves': { hp: 80, recuo: 1,
            poder: { nome: 'Invoco uma Carta de Magic', tipo: 'comprar', ativavel: true, valor: 1,
                texto: '1 vez por turno: compra 1 carta.' },
            ataques: [
                { nome: 'Porta do Quarto', custo: 2, dano: 30, efeitos: [{ tipo: 'escudo', valor: 20 }] },
            ] },
        'italolol': { hp: 90, recuo: 1, ataques: [
            { nome: 'Au! Aura!', custo: 1, dano: 20 },
            { nome: '0/14/2', custo: 2, dano: 70, efeitos: [{ tipo: 'danoSi', valor: 30 }] },
        ] },
        'stand-do-joinha': { hp: 70, recuo: 1,
            poder: { nome: 'Num Tem Eu', tipo: 'bonusDoBanco', ativavel: false, valor: 10,
                texto: 'No banco: +10 de dano nos ataques do seu ativo (não soma com outro Stand).' },
            ataques: [{ nome: 'Joinha', custo: 1, dano: 20 }] },
        'encantadora': { hp: 70, recuo: 1, ataques: [
            { nome: 'Vem Cá, Meu Gadinho', custo: 1, dano: 0, efeitos: [{ tipo: 'puxar' }] },
            { nome: 'Chama Rosa', custo: 2, dano: 30, efeitos: [{ tipo: 'estado', estado: 'iludido' }] },
        ] },
        'marreteiro-do-coracao': { hp: 100, recuo: 3, ataques: [
            { nome: 'Quebrar Tudo', custo: 1, dano: 0, efeitos: [{ tipo: 'descartarCampo' }] },
            { nome: 'Marretada', custo: 3, dano: 90 },
        ] },
        'moderador-do-ban': { hp: 90, recuo: 2, ataques: [
            { nome: 'Ban de 7 Dias', custo: 2, dano: 30, efeitos: [{ tipo: 'estado', estado: 'silenciado' }] },
        ] },

        // ---- Comuns ----------------------------------------------------------
        'cara-de-coracao': { hp: 70, recuo: 1, ataques: [
            { nome: 'Soco Iludido', custo: 1, dano: 20, efeitos: [{ tipo: 'bonusSeAliado', carta: 'encantadora', valor: 20 }] },
        ] },
        'bug-do-discord': { hp: 50, recuo: 1, ataques: [
            { nome: 'Glitch', custo: 1, dano: 0, efeitos: [{ tipo: 'moeda', cara: 40, coroa: 0 }] },
        ] },
        'notificacao-morcego': { hp: 40, recuo: 0, ataques: [
            { nome: '@everyone', custo: 1, dano: 10, efeitos: [{ tipo: 'estado', estado: 'notificado' }] },
        ] },
        'emoji-pistola': { hp: 60, recuo: 1, ataques: [
            { nome: 'Reação 😡', custo: 1, dano: 10, efeitos: [{ tipo: 'bonusPorGoon', valor: 10 }] },
        ] },
        'drone-vigia': { hp: 60, recuo: 1,
            poder: { nome: 'Câmera', tipo: 'espiarDeck', ativavel: true,
                texto: '1 vez por turno: olha a carta de cima do deck do adversário.' },
            ataques: [{ nome: 'Facho', custo: 1, dano: 20 }] },

        // ---- Campos (ficam na mesa e valem para os dois) --------------------
        'piscina-de-macarronada': { campo: { tipo: 'curaInicio', valor: 20,
            texto: 'No começo de cada turno, cura 20 do ativo de quem vai jogar.' } },
        'toradolandia': { campo: { tipo: 'compraExtra', limiteMao: 3,
            texto: 'Quem começa o turno com 3 cartas ou menos na mão compra 1 a mais.' } },
        'mansao-do-inominavel': { campo: { tipo: 'mansao', veneno: 20, hpGoon: 20,
            texto: 'Notificado tira 20 em vez de 10. Goons têm +20 HP.' } },
        'estacionamento-noturno': { campo: { tipo: 'recuoGratisGoon',
            texto: 'Goons recuam de graça.' } },
        'casa-do-enzo-games': { campo: { tipo: 'trocarCarta',
            texto: '1 vez por turno, cada jogador pode descartar 1 carta da mão para comprar 1.' } },
        'sao-joao-do-butico': { campo: { tipo: 'protegeBanco',
            texto: 'Comporta secreta: ataques não acertam o banco.' } },
    };

    return congelar({ COMBATE });
});
