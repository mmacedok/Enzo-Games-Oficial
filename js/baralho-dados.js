// ============================================================================
// Baralho Enzo: cartas colecionáveis e pacotes. Lista única usada pelo site
// (Ficha do Leitor, abertura de pacotes) e pelo servidor (api/baralho.js
// sorteia só cartas daqui e cobra os preços daqui).
//
// Carta nova: acrescente em CARTAS com o próximo `numero` (nunca reaproveite
// um id: as coleções salvas guardam o id). `arte` = imagem original (o site
// mostra a versão web gerada por lib/web-images.js); `foco` = object-position
// do recorte; `peso` = chance relativa dentro da mesma raridade; `chanceFixa`
// = % própria por carta em qualquer pacote (fica fora do sorteio por raridade).
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
            frase: 'Finalmente a quarta-feira.',
            tcg: 'Vida 2.800 · Recuo 2 Aura\nAlmôndega (1 Aura): 600 de dano.\nMacarronada a 300% (3 Aura): 2.400 de dano; depois a carta fica virada por 1 turno.' },
        { id: 'cabo-coco', numero: 2, nome: 'Cabo Côco', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/cabo-coco.png', foco: '50% 30%', censurada: true, chanceFixa: 0.5,
            frase: 'Conteúdo banido em 456 países.',
            tcg: 'Vida 2.600 · Recuo 2 Aura\nPoder Conteúdo Banido: com ele no ativo, o adversário não joga campos.\nArquivo Confidencial (2 Aura): 1.200 de dano e cura 400 dele.' },
        { id: 'degustador-da-noite', numero: 3, nome: 'Degustador da Noite', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/degustador-da-noite.png', foco: '50% 30%',
            frase: 'Vírgulas não lutam contra o crime. Eu luto.',
            tcg: 'Vida 2.600 · Recuo 1 Aura\nVírgula-rangue (1 Aura): 400 de dano em qualquer carta do adversário, até no banco; fica virado por 1 turno.\nEscudo de Parênteses (3 Aura): 1.800 de dano e segura 600 do próximo golpe que receber.' },
        { id: 'o-inominavel', numero: 4, nome: 'O Inominável', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/o-inominavel.png', foco: '50% 30%',
            frase: 'EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!',
            tcg: 'Vida 2.400 · Recuo 2 Aura\nPoder Besteira no Discord (1 vez por turno): deixa o ativo do adversário Notificado (perde 200 de vida no começo de cada turno dele).\nBala Dourada (3 Aura): 1.200 de dano em qualquer carta; fica virado por 1 turno.' },
        { id: 'hatsune-neves', numero: 5, nome: 'Hatsune Neves', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/hatsune-neves.png', foco: '50% 30%',
            frase: 'Invoco uma carta de Magic e fecho a porta do quarto.',
            tcg: 'Vida 1.600 · Recuo 1 Aura\nPoder Invoco uma Carta de Magic (1 vez por turno): compra 1 carta.\nPorta do Quarto (2 Aura): 600 de dano e segura 400 do próximo golpe.' },
        { id: 'superkid', numero: 6, nome: 'Superkid', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/superkid.png', foco: '50% 30%',
            frase: 'Quanto mais besteira ao redor, mais aura.',
            tcg: 'Vida 2.600 · Recuo 2 Aura\nFarmar Aura (1 Aura): sem dano, ganha +1 Aura.\nAura de 67 Segundos (2 Aura): 400 de dano, mais 400 por Aura que ele tem.' },
        { id: 'italolol', numero: 7, nome: 'ItaloLOL', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/italolol.png', foco: '50% 30%',
            frase: 'Au! Aura! 0/14/2 e a culpa é do jungle.',
            tcg: 'Vida 1.800 · Recuo 1 Aura\nAu! Aura! (1 Aura): 400 de dano.\n0/14/2 (2 Aura): 1.400 de dano, mas ele leva 600.' },
        { id: 'stand-do-joinha', numero: 8, nome: 'Stand do Joinha', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/stand-do-joinha.png', foco: '50% 30%',
            frase: 'Num tem eu, num tem 👍',
            tcg: 'Vida 1.400 · Recuo 1 Aura\nPoder Num Tem Eu: no banco, dá +200 de dano nos ataques do seu ativo (não soma com outro Stand).\nJoinha (1 Aura): 400 de dano.' },
        { id: 'chorao', numero: 9, nome: 'Chorão', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/chorao.png', foco: '50% 30%',
            frase: 'Vou te processar! (chorando)',
            tcg: 'Vida 2.200 · Recuo 2 Aura\nPoder Vou te Processar!: quem ataca o Chorão leva 400 de volta.\nBirra (2 Aura): 1.000 de dano.' },
        { id: 'sombra-do-degustador', numero: 10, nome: 'Sombra do Degustador', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/sombra-do-degustador.png', foco: '50% 30%',
            frase: 'Ei, eu vou pegar Teemo no top.',
            tcg: 'Vida 1.800 · Recua de graça\nTeemo no Top (1 Aura): 400 de dano e deixa o alvo Notificado.\nFumaça Roxa (2 Aura): 1.000 de dano.' },
        { id: 'encantadora', numero: 11, nome: 'Encantadora', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/encantadora.png', foco: '50% 30%',
            frase: 'Vem cá, meu gadinho.',
            tcg: 'Vida 1.400 · Recuo 1 Aura\nVem Cá, Meu Gadinho (1 Aura): sem dano; você escolhe uma carta do banco do adversário e ela vira o ativo.\nChama Rosa (2 Aura): 600 de dano e deixa o alvo Iludido (no ataque dele, joga moeda: se der coroa, ele erra e leva 400).' },
        { id: 'marreteiro-do-coracao', numero: 12, nome: 'Marreteiro do Coração', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/marreteiro-do-coracao.png', foco: '50% 30%',
            frase: 'EU VOU QUEBRAR TUDO POR ELA!',
            tcg: 'Vida 2.000 · Recuo 2 Aura\nQuebrar Tudo (1 Aura): sem dano; descarta o campo em jogo.\nMarretada (3 Aura): 1.800 de dano.' },
        { id: 'moderador-do-ban', numero: 13, nome: 'Moderador do Discord', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/moderador-do-ban.png', foco: '50% 30%',
            frase: 'Você foi silenciado por 7 dias.',
            tcg: 'Vida 1.800 · Recuo 2 Aura\nBan de 7 Dias (2 Aura): 600 de dano e deixa o alvo Silenciado (não ataca nem recua no próximo turno dele); o Moderador fica virado por 1 turno.' },
        { id: 'cara-de-coracao', numero: 14, nome: 'Cara de Coração', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/cara-de-coracao.png', foco: '50% 30%',
            frase: 'Iludido, mas sempre está lá por ela.',
            tcg: 'Vida 1.400 · Recuo 1 Aura\nSoco Iludido (1 Aura): 400 de dano, +400 se a Encantadora estiver na sua mesa.' },
        { id: 'bug-do-discord', numero: 15, nome: 'Bug do Discord', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/bug-do-discord.png', foco: '50% 30%',
            frase: 'Não é bug, é feature da Legião.',
            tcg: 'Vida 1.000 · Recuo 1 Aura\nGlitch (1 Aura): joga uma moeda; cara dá 800 de dano, coroa dá 0.' },
        { id: 'notificacao-morcego', numero: 16, nome: 'Notificação Morcego', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/notificacao-morcego.png', foco: '50% 30%',
            frase: '@everyone às 3 da manhã.',
            tcg: 'Vida 800 · Recua de graça\n@everyone (1 Aura): 200 de dano e deixa o alvo Notificado.' },
        { id: 'emoji-pistola', numero: 17, nome: 'Emoji Pistola', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/emoji-pistola.png', foco: '50% 30%',
            frase: 'Reagiu com 😡 em todas as suas mensagens.',
            tcg: 'Vida 1.200 · Recuo 1 Aura\nReação 😡 (1 Aura): 200 de dano, +200 por goon na sua mesa (contando ele).' },
        { id: 'drone-vigia', numero: 18, nome: 'Drone Vigia', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/drone-vigia.png', foco: '50% 30%',
            frase: 'Nenhum estacionamento fica sem câmera por muito tempo.',
            tcg: 'Vida 1.200 · Recuo 1 Aura\nPoder Câmera (1 vez por turno): olha a mão do adversário.\nFacho (1 Aura): 400 de dano.' },
        { id: 'piscina-de-macarronada', numero: 19, nome: 'Piscina de Macarronada', tipo: 'campo', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/piscina-de-macarronada.png', foco: '50% 30%',
            frase: 'O que alguém poderia querer além de uma piscina de macarronada?',
            tcg: 'Campo (vale para os dois lados)\nNo começo de cada turno, cura 400 do ativo de quem vai jogar.' },
        { id: 'toradolandia', numero: 20, nome: 'Toradolândia', tipo: 'campo', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/toradolandia.png', foco: '50% 30%',
            frase: 'BEM-VINDO À TORADOLÂNDIA!',
            tcg: 'Campo (vale para os dois lados)\nQuem começa o turno com 3 cartas ou menos na mão compra 1 a mais.' },
        { id: 'mansao-do-inominavel', numero: 21, nome: 'Mansão do Inominável', tipo: 'campo', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/mansao-do-inominavel.png', foco: '50% 30%',
            frase: 'Sim, Enzo Games... é ficção...',
            tcg: 'Campo (vale para os dois lados)\nNotificado tira 400 por turno em vez de 200. Goons ganham +400 de vida.' },
        { id: 'estacionamento-noturno', numero: 22, nome: 'Estacionamento Noturno', tipo: 'campo', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/estacionamento-noturno.png', foco: '50% 30%',
            frase: 'Absolutamente nada nunca aconteceu aqui.',
            tcg: 'Campo (vale para os dois lados)\nGoons recuam de graça.' },
        { id: 'casa-do-enzo-games', numero: 23, nome: 'Casa do Enzo Games', tipo: 'campo', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/casa-do-enzo-games.png', foco: '50% 30%',
            frase: 'Bem-vindo a Santa Maria. Trouxe macarronada?',
            tcg: 'Campo (vale para os dois lados)\n1 vez por turno, cada jogador pode devolver 1 carta da mão ao baralho e comprar 1 (não conta nas 2 devoluções do turno).' },
        { id: 'sao-joao-do-butico', numero: 24, nome: 'São João do Butico', tipo: 'campo', raridade: 'comum', peso: 1,
            arte: 'assets/Cartas/sao-joao-do-butico.png', foco: '50% 30%',
            frase: 'Vira à direita na mansão da Playboy.',
            tcg: 'Campo (vale para os dois lados)\nComporta secreta: os ataques não acertam o banco.' },
    ]);

    /**
     * Pacotes. `chances` em % por carta (somam 100). `garantia` = raridade
     * mínima de pelo menos uma carta do pacote (null = sem garantia).
     * `preco.po` ausente = não se compra com pó. `capa` = cartas no desenho do
     * pacote; `cores` = [principal, destaque, escuro] do pacote e do fundo da abertura.
     */
    const PACOTES = congelar([
        { id: 'estacionamento', nome: 'Pacote do Estacionamento', cartas: 3,
            capa: ['cara-de-coracao', 'estacionamento-noturno', 'drone-vigia'], cores: ['#3d4a52', '#ffcc00', '#15191c'],
            preco: { creditos: 100, po: 60 },
            chances: { comum: 72, raro: 22, epico: 5, lendario: 1 }, garantia: null },
        { id: 'toradolandia', nome: 'Pacote da Toradolândia', cartas: 5,
            capa: ['stand-do-joinha', 'toradolandia', 'sombra-do-degustador'], cores: ['#1f9e90', '#6a2bd9', '#120a24'],
            preco: { creditos: 300 },
            chances: { comum: 60, raro: 28, epico: 10, lendario: 2 }, garantia: 'raro' },
        { id: 'piscina-de-macarronada', nome: 'Pacote da Piscina de Macarronada', cartas: 5,
            capa: ['degustador-da-noite', 'piscina-de-macarronada', 'enzo-games'], cores: ['#e0301e', '#ff9900', '#2a0804'],
            preco: { creditos: 900 },
            chances: { comum: 40, raro: 35, epico: 19, lendario: 6 }, garantia: 'epico' },
    ]);

    /** Créditos por ponto em cada partida verificada (sem limite diário). */
    const CREDITOS_POR_PONTO = Object.freeze({ 'flappy-enzo': 10 });

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
