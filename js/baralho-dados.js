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
            arte: 'assets/Cartas/enzo-games.png', foco: '50% 30%',
            frase: 'Quarta-feira de novo. Pelo menos tem macarronada.' },
        { id: 'cabo-coco', numero: 2, nome: 'Cabo Côco', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/cabo-coco.png', foco: '50% 30%', censurada: true,
            frase: 'Conteúdo banido em 456 países.' },
        { id: 'degustador-da-noite', numero: 3, nome: 'Degustador da Noite', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/degustador-da-noite.png', foco: '50% 30%',
            frase: 'A cidade dorme. A vírgula mal posta, não.' },
        { id: 'o-inominavel', numero: 4, nome: 'O Inominável', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/o-inominavel.png', foco: '50% 30%',
            frase: 'EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!' },
        { id: 'hatsune-neves', numero: 5, nome: 'Hatsune Neves', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/hatsune-neves.png', foco: '50% 30%',
            frase: 'Invoco uma carta de Magic e fecho a porta do quarto.' },
        { id: 'superkid', numero: 6, nome: 'Superkid', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/superkid.png', foco: '50% 30%',
            frase: 'Quanto mais besteira ao redor, mais aura.' },
        { id: 'italolol', numero: 7, nome: 'ItaloLOL', tipo: 'personagem', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/italolol.png', foco: '50% 30%',
            frase: 'Au! Aura! 0/14/2 e a culpa é do jungle.' },
        { id: 'stand-do-joinha', numero: 8, nome: 'Stand do Joinha', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/stand-do-joinha.png', foco: '50% 30%',
            frase: '👍 Positivo. Agora corre.' },
        { id: 'chorao', numero: 9, nome: 'Chorão', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/chorao.png', foco: '50% 30%',
            frase: 'Vou te processar! (chorando)' },
        { id: 'sombra-do-degustador', numero: 10, nome: 'Sombra do Degustador', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/sombra-do-degustador.png', foco: '50% 30%',
            frase: 'Quando a derrota no LoL é grande demais, sobra só a sombra.' },
        { id: 'feiticeiro-de-terno', numero: 11, nome: 'Feiticeiro de Terno', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/feiticeiro-de-terno.png', foco: '50% 30%',
            frase: 'O outro Stand do Degustador. Esse não faz joinha.' },
        { id: 'encantadora', numero: 12, nome: 'Encantadora', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/encantadora.png', foco: '50% 30%',
            frase: 'Um feitiço rosa e você esquece o que ia falar no Discord.' },
        { id: 'marreteiro-do-coracao', numero: 13, nome: 'Marreteiro do Coração', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/marreteiro-do-coracao.png', foco: '50% 30%',
            frase: 'Coração no peito, marreta na mão.' },
        { id: 'moderador-do-ban', numero: 14, nome: 'Moderador do BAN', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/moderador-do-ban.png', foco: '50% 30%',
            frase: 'Você foi silenciado por 7 dias.' },
        { id: 'cara-de-coracao', numero: 15, nome: 'Cara de Coração', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/cara-de-coracao.png', foco: '50% 30%',
            frase: 'Tem 40 iguais a ele. Todos com o mesmo coração.' },
        { id: 'bug-do-discord', numero: 16, nome: 'Bug do Discord', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/bug-do-discord.png', foco: '50% 30%',
            frase: 'Não é bug, é feature da Legião.' },
        { id: 'notificacao-morcego', numero: 17, nome: 'Notificação Morcego', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/notificacao-morcego.png', foco: '50% 30%',
            frase: '@everyone às 3 da manhã.' },
        { id: 'emoji-pistola', numero: 18, nome: 'Emoji Pistola', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/emoji-pistola.png', foco: '50% 30%',
            frase: 'Reagiu com 😡 em todas as suas mensagens.' },
        { id: 'drone-vigia', numero: 19, nome: 'Drone Vigia', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/drone-vigia.png', foco: '50% 30%',
            frase: 'Nenhum estacionamento fica sem câmera por muito tempo.' },
        { id: 'piscina-de-macarronada', numero: 20, nome: 'Piscina de Macarronada', tipo: 'campo', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/piscina-de-macarronada.png', foco: '50% 30%',
            frase: 'O mundo é muito mais que macarronada. Mas não hoje.' },
        { id: 'toradolandia', numero: 21, nome: 'Toradolândia', tipo: 'campo', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/toradolandia.png', foco: '50% 30%',
            frase: 'BEM-VINDO À TORADOLÂNDIA!' },
        { id: 'mansao-do-inominavel', numero: 22, nome: 'Mansão do Inominável', tipo: 'campo', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/mansao-do-inominavel.png', foco: '50% 30%',
            frase: 'Sim, Enzo Games... é ficção...' },
        { id: 'estacionamento-noturno', numero: 23, nome: 'Estacionamento Noturno', tipo: 'campo', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/estacionamento-noturno.png', foco: '50% 30%',
            frase: 'Nossa, que barulhos estranhos são esses?' },
        { id: 'casa-do-enzo-games', numero: 24, nome: 'Casa do Enzo Games', tipo: 'campo', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/casa-do-enzo-games.png', foco: '50% 30%',
            frase: 'Sofá, TV, Continental de Yu-Gi-Oh!. Não perturbe.' },
        { id: 'sao-joao-do-butico', numero: 25, nome: 'São João do Butico', tipo: 'campo', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/sao-joao-do-butico.png', foco: '50% 30%',
            frase: 'Vira à direita na mansão da Playboy.' },
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
