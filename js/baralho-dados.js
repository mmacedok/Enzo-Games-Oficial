// ============================================================================
// Baralho Enzo: cartas colecionáveis e pacotes. Lista única usada pelo site
// (Ficha do Leitor, abertura de pacotes) e pelo servidor (api/baralho.js
// sorteia só cartas daqui e cobra os preços daqui).
//
// Carta nova: acrescente em CARTAS com o próximo `numero` (nunca reaproveite
// um id: as coleções salvas guardam o id). `arte` = imagem original (o site
// mostra a versão web gerada por lib/web-images.js); `foco` = object-position
// do recorte; `peso` = chance relativa dentro da mesma raridade.
// Mudou preço, chance ou carta? Reinicie o servidor local (npm run serve).
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.EnzoBaralho = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const congelar = (lista) => Object.freeze(lista.map(Object.freeze));

    /** Da mais comum para a mais rara. `po` = pó de estrela ao transformar uma repetida. */
    const RARIDADES = congelar([
        { id: 'comum', nome: 'Comum', po: 5 },
        { id: 'raro', nome: 'Raro', po: 15 },
        { id: 'epico', nome: 'Épico', po: 50 },
        { id: 'lendario', nome: 'Lendário', po: 200 },
    ]);

    const CARTAS = congelar([
        { id: 'enzo-games', numero: 1, nome: 'Enzo Games', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Personagens/Enzo games ficha.png', foco: '50% 18%',
            frase: 'Segunda-feira de novo. Pelo menos tem macarronada.' },
        { id: 'cabo-coco', numero: 2, nome: 'Cabo Côco', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Personagens/Cabo Côco.png', foco: '50% 20%', censurada: true,
            frase: 'Conteúdo banido em 456 países.' },
        { id: 'degustador-da-noite', numero: 3, nome: 'Degustador da Noite', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Personagens/Degustador da noite Ficha.png', foco: '50% 25%',
            frase: 'A cidade dorme. A vírgula mal posta, não.' },
        { id: 'o-inominavel', numero: 4, nome: 'O Inominável', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Personagens/O Inominavel Ficha.png', foco: '50% 12%',
            frase: 'EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!' },
        { id: 'hatsune-neves', numero: 5, nome: 'Hatsune Neves', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Personagens/Hatsune Neves Ficha.png', foco: '50% 22%',
            frase: 'Invoco uma carta de Magic e fecho a porta do quarto.' },
        { id: 'superkid', numero: 6, nome: 'Superkid', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Personagens/Superkid Ficha.png', foco: '50% 22%',
            frase: 'Quanto mais besteira ao redor, mais aura.' },
        { id: 'italolol', numero: 7, nome: 'ItaloLOL', tipo: 'personagem', raridade: 'comum', peso: 1,
            arte: 'assets/Personagens/Italolol.png', foco: '50% 25%',
            frase: 'Au! Aura! 0/14/2 e a culpa é do jungle.' },
    ]);

    /**
     * Pacotes. `chances` em % por carta (somam 100). `garantia` = raridade
     * mínima de pelo menos uma carta do pacote (null = sem garantia).
     * `preco.po` ausente = não se compra com pó. `capa` = cartas no desenho do
     * pacote; `cores` = [principal, destaque, escuro] do pacote e do fundo da abertura.
     */
    const PACOTES = congelar([
        { id: 'estacionamento', nome: 'Pacote do Estacionamento', cartas: 3,
            capa: ['hatsune-neves', 'italolol', 'superkid'], cores: ['#3d4a52', '#ffcc00', '#15191c'],
            preco: { creditos: 100, po: 60 },
            chances: { comum: 72, raro: 22, epico: 5, lendario: 1 }, garantia: null },
        { id: 'toradolandia', nome: 'Pacote da Toradolândia', cartas: 5,
            capa: ['superkid', 'degustador-da-noite', 'hatsune-neves'], cores: ['#1f9e90', '#6a2bd9', '#120a24'],
            preco: { creditos: 300 },
            chances: { comum: 60, raro: 28, epico: 10, lendario: 2 }, garantia: 'raro' },
        { id: 'piscina-de-macarronada', nome: 'Pacote da Piscina de Macarronada', cartas: 5,
            capa: ['o-inominavel', 'enzo-games', 'degustador-da-noite'], cores: ['#e0301e', '#ff9900', '#2a0804'],
            preco: { creditos: 900 },
            chances: { comum: 40, raro: 35, epico: 19, lendario: 6 }, garantia: 'epico' },
    ]);

    /** Créditos por ponto em cada partida verificada (sem limite diário). */
    const CREDITOS_POR_PONTO = Object.freeze({ 'flappy-enzo': 10, 'ronda-noturna': 1 });

    /** Pacote dado de presente no primeiro acesso ao Baralho. */
    const PACOTE_BOAS_VINDAS = 'estacionamento';

    /** Máximo de pacotes abertos (ou comprados) de uma vez. */
    const MAX_POR_VEZ = 10;

    const carta = (id) => CARTAS.find((c) => c.id === id) || null;
    const pacote = (id) => PACOTES.find((p) => p.id === id) || null;
    const raridade = (id) => RARIDADES.find((r) => r.id === id) || null;
    /** Posição da raridade (0 = comum): compara "raro ou melhor". */
    const nivel = (id) => RARIDADES.findIndex((r) => r.id === id);
    const cartasDaRaridade = (id) => CARTAS.filter((c) => c.raridade === id);
    /** Pó de estrela que UMA cópia repetida da carta vale. */
    const valorPo = (cardId) => raridade(carta(cardId)?.raridade)?.po ?? 0;

    return {
        RARIDADES, CARTAS, PACOTES, CREDITOS_POR_PONTO, PACOTE_BOAS_VINDAS, MAX_POR_VEZ,
        carta, pacote, raridade, nivel, cartasDaRaridade, valorPo,
    };
});
