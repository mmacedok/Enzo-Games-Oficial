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
            tcg: 'Vida 2.600 · Recuo 1 Aura · São João do Butico\nVírgula-rangue (1 Aura): 400 de dano em qualquer carta do adversário, até no banco; fica virado por 1 turno.\nEscudo de Parênteses (3 Aura): 1.800 de dano e segura 600 do próximo golpe que receber; fica virado por 1 turno.' },
        { id: 'o-inominavel', numero: 4, nome: 'O Inominável', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/o-inominavel.png', foco: '50% 30%',
            frase: 'EU VOU FALAR BESTEIRA NO DISCORD! HAHAHAH!',
            tcg: 'Vida 2.400 · Recuo 2 Aura\nPoder Besteira no Discord (1 vez por turno): deixa o ativo do adversário Notificado (perde 200 de vida no começo de cada turno dele).\nBala Dourada (2 Aura): 1.200 de dano em qualquer carta; fica virado por 1 turno.' },
        { id: 'hatsune-neves', numero: 5, nome: 'Hatsune Neves', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/hatsune-neves.png', foco: '50% 30%',
            frase: 'Invoco uma carta de Magic e fecho a porta do quarto.',
            tcg: 'Vida 1.600 · Recuo 1 Aura\nPoder Invoco uma Carta de Magic (1 vez por turno): compra 1 carta.\nPorta do Quarto (2 Aura): 600 de dano e segura 400 do próximo golpe.' },
        { id: 'superkid', numero: 6, nome: 'Superkid', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/superkid.png', foco: '50% 30%',
            frase: 'Quanto mais besteira ao redor, mais aura.',
            tcg: 'Vida 2.600 · Recuo 2 Aura\nFarmar Aura (1 Aura): sem dano, ganha +1 Aura.\nAura de 67 Segundos (2 Aura): 400 de dano, mais 400 por Aura que ele tem; se derrubar a carta, ele fica virado por 1 turno.' },
        { id: 'italolol', numero: 7, nome: 'ItaloLOL', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/italolol.png', foco: '50% 30%',
            frase: 'Au! Aura! 0/14/2 e a culpa é do jungle.',
            tcg: 'Vida 1.800 · Recuo 1 Aura\nAu! Aura! (1 Aura): 400 de dano.\n0/14/2 (2 Aura): 1.400 de dano, mas ele leva 600.' },
        { id: 'stand-do-joinha', numero: 8, nome: 'Stand do Joinha', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/stand-do-joinha.png', foco: '50% 30%',
            frase: 'Num tem eu, num tem 👍',
            tcg: 'Vida 1.400 · Recuo 1 Aura\nPoder Num Tem Eu: no banco, dá +200 de dano nos ataques do seu ativo (não soma com outro Stand).\nJoinha (1 Aura): 400 de dano.' },
        { id: 'chorao', numero: 9, nome: 'Chorão', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/chorao.png', foco: '50% 30%',
            frase: 'Vou te processar! (chorando)',
            tcg: 'Vida 2.200 · Recuo 2 Aura\nPoder Vou te Processar!: quem ataca o Chorão leva 400 de volta.\nBirra (2 Aura): 1.000 de dano.' },
        { id: 'sombra-do-degustador', numero: 10, nome: 'Sombra do Degustador', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/sombra-do-degustador.png', foco: '50% 30%',
            frase: 'Ei, eu vou pegar Teemo no top.',
            tcg: 'Vida 1.800 · Recua de graça · São João do Butico\nTeemo no Top (1 Aura): 400 de dano e deixa o alvo Notificado.\nFumaça Roxa (2 Aura): 1.000 de dano.' },
        { id: 'encantadora', numero: 11, nome: 'Encantadora', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/encantadora.png', foco: '50% 30%',
            frase: 'Vem cá, meu gadinho.',
            tcg: 'Vida 1.400 · Recuo 1 Aura\nPoder Vem Cá, Meu Gadinho (1 vez por turno, de qualquer lugar da mesa): você escolhe uma carta do banco do adversário e ela vira o ativo; depois a Encantadora fica virada por 1 turno.\nChama Rosa (2 Aura): 600 de dano e deixa o alvo Iludido (no ataque dele, joga moeda: se der coroa, ele erra e leva 400).' },
        { id: 'marreteiro-do-coracao', numero: 12, nome: 'Marreteiro do Coração', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/marreteiro-do-coracao.png', foco: '50% 30%',
            frase: 'EU VOU QUEBRAR TUDO POR ELA!',
            tcg: 'Vida 2.000 · Recuo 2 Aura\nQuebrar Tudo (1 Aura): sem dano; descarta o campo em jogo.\nMarretada (3 Aura): 1.800 de dano.' },
        { id: 'moderador-do-ban', numero: 13, nome: 'Moderador do Discord', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/moderador-do-ban.png', foco: '50% 30%',
            frase: 'Você foi silenciado por 7 dias.',
            tcg: 'Vida 1.800 · Recuo 2 Aura\nBan de 7 Dias (2 Aura): 600 de dano e deixa o alvo Silenciado (não ataca nem recua no próximo turno dele); o Moderador fica virado por 1 turno.\nSó 1 cópia por deck.' },
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
            tcg: 'Vida 800 · Recua de graça\n@everyone (de graça): 200 de dano e deixa o alvo Notificado.' },
        { id: 'emoji-pistola', numero: 17, nome: 'Emoji Pistola', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/emoji-pistola.png', foco: '50% 30%',
            frase: 'Reagiu com 😡 em todas as suas mensagens.',
            tcg: 'Vida 1.200 · Recuo 1 Aura\nReação 😡 (1 Aura): 200 de dano, +200 por goon na sua mesa (contando ele).' },
        { id: 'drone-vigia', numero: 18, nome: 'Drone Vigia', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/drone-vigia.png', foco: '50% 30%',
            frase: 'Nenhum estacionamento fica sem câmera por muito tempo.',
            tcg: 'Vida 1.200 · Recuo 1 Aura\nPoder Câmera (1 vez por turno): olha a mão do adversário.\nFacho (de graça): 400 de dano.' },
        { id: 'piscina-de-macarronada', numero: 19, nome: 'Piscina de Macarronada', tipo: 'campo', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/piscina-de-macarronada.png', foco: '50% 30%',
            frase: 'O que alguém poderia querer além de uma piscina de macarronada?',
            tcg: 'Campo (vale para os dois lados)\nAo ser jogada, cura 400 de cada carta de quem a jogou (ativo e banco), no mesmo turno.\nDepois, no começo de cada turno, cura 400 de cada carta de quem vai jogar.' },
        { id: 'toradolandia', numero: 20, nome: 'Toradolândia', tipo: 'campo', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/toradolandia.png', foco: '50% 30%',
            frase: 'BEM-VINDO À TORADOLÂNDIA!',
            tcg: 'Campo (vale para os dois lados)\nQuem começa o turno com 3 cartas ou menos na mão compra 1 a mais.' },
        { id: 'mansao-do-inominavel', numero: 21, nome: 'Mansão do Inominável', tipo: 'campo', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/mansao-do-inominavel.png', foco: '50% 30%',
            frase: 'Sim, Enzo Games... é ficção...',
            tcg: 'Campo (vale para os dois lados)\nNotificado tira 400 por turno em vez de 200. Goons ganham +400 de vida permanente na mesa (não perdem se a Mansão sair). Goon que ataca com 1 Aura a mais do que o ataque pede notifica o ativo do adversário.' },
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
            tcg: 'Campo (vale para os dois lados)\nComporta secreta: os ataques não acertam o banco. Cartas com a tag Degustador da Noite que voltarem da mesa para o baralho colocam +1 Aura em outro Degustador no seu banco.' },
        { id: 'calibra-o-smite', numero: 25, nome: 'Calibra o Smite', tipo: 'resenha', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/calibra-o-smite.png', foco: '50% 30%',
            descricaoArte: 'Raio celestial dourado-alaranjado de Smite caindo verticalmente sobre um monstro da selva com a vida cravada em 600, pulverizando-o sem espalhar dano ao redor.',
            frase: '600 no cravado.',
            tcg: 'Magia (Resenha · gasta 1 Aura sua)\nSe o ativo do adversário tiver exatamente 600 de vida, ele é destruído na hora sem causar dano de nocaute à vida do jogador.' },
        { id: 'calibra-o-smite-anuah', numero: 26, nome: 'Calibra o Smite (Anuah)', tipo: 'resenha', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/calibra-o-smite-anuah.png', foco: '50% 30%',
            descricaoArte: 'Dois orbes de Aura dourada dos aliados canalizados num raio azul-cobalto e violeta que prende o ativo inimigo em correntes translúcidas de exaustão, cortando seu dano pela metade.',
            frase: 'Dá smite pra diminuir o dano!',
            tcg: 'Magia (Resenha · gasta 2 Auras dos seus personagens)\nO personagem ativo do adversário causa apenas metade do dano até o final do próximo turno dele.' },
        { id: 'cade-meu-jungle', numero: 27, nome: 'Cadê meu Jungle', tipo: 'resenha', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/cade-meu-jungle.png', foco: '50% 30%',
            descricaoArte: 'Cena cômica na selva com um sapo gigante ranzinza (Grompe) num canto enquanto um redemoinho puxa um lutador do banco inimigo pela gola de volta para a mão, cercado por pings de interrogação amarelos (?).',
            frase: 'O cara tá fazendo grompe enquanto eu levo dive.',
            tcg: 'Magia (Resenha · gasta 2 Auras suas)\nUma carta do banco do adversário volta limpa para a mão dele.' },
        { id: 'dar-ff', numero: 28, nome: 'Dar FF', tipo: 'resenha', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/dar-ff.png', foco: '50% 30%',
            descricaoArte: 'Painel de rendição com 4 luzes verdes e 1 vermelha: uma mão enfaixada recebendo brilho de cura aperta um botão vermelho gigante enquanto a outra abana uma bandeirinha branca, com dinamites prestes a explodir para os dois lados.',
            frase: '/ff aos 15.',
            tcg: 'Magia (Resenha · gasta 1 Aura sua)\nCura 600 do lutador. Se o jogador e o adversário usarem Dar FF um depois do outro, ambos os jogadores levam 1.000 de dano direto na vida.' },
        { id: 'hoje-e-quarta-feira', numero: 29, nome: 'Hoje é Quarta-feira', tipo: 'resenha', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/hoje-e-quarta-feira.png', foco: '50% 30%',
            descricaoArte: 'Enzo Games (gato laranja baixo e balofo, listras pretas, barba/bigode curtos, tatuagem Maori e smartwatch preto no braço) jogando 2 cartas para trás enquanto devora feliz uma travessa gigante de macarronada numa quarta-feira.',
            frase: 'Dia oficial de comer macarronada.',
            tcg: 'Magia (Resenha)\nVai para o descarte após o uso. Descarta até 2 cartas da sua mão para comer macarronada e troca o seu personagem ativo por um do banco. O adversário ganha +1 Aura no próximo turno dele.' },
        { id: 'itallo-de-viego', numero: 30, nome: 'Itallo de Viego 20/0', tipo: 'resenha', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/itallo-de-viego.png', foco: '50% 30%',
            descricaoArte: 'ItaloLOL (cãozinho amarelo pequeno de orelhas marrons caídas, óculos redondos, topete preto e rosa-magenta e corrente dourada) vestido como Viego (jaqueta preta aberta, coroa e espada espectral verde-água), invocando da Névoa Negra um Enzo Games virado ao fundo.',
            frase: 'Possessão soberana na quarta-feira.',
            tcg: 'Resenha (deita atrás de um lutador)\nAo entrar em campo, joga um Enzo Games direto do seu baralho para o banco (entra virado). Dá o ataque Rei Destruído (2 Aura): 200 de dano e o próximo ataque de uma carta aliada pode acertar o banco.' },
        { id: 'pedra-mole', numero: 31, nome: 'Eu vou ir aí na Pedra Mole te matar', tipo: 'resenha', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/pedra-mole.png', foco: '50% 30%',
            descricaoArte: 'Enzo Games tentando esganar o ItaloLOL na Pedra Mole: o gato laranja baixo e gorducho (olhos em fúria, tatuagem Maori e smartwatch) aperta com as duas mãos o pescoço do cãozinho amarelo ItaloLOL (óculos redondos tortos, topete preto/rosa, olhos arregalados e língua de fora).',
            frase: 'Manda a localização.',
            tcg: 'Resenha (queima ao usar no Enzo Games)\nSe você controlar um Enzo Games virado e qualquer carta Itallo na mesa, desvira o Enzo Games na hora e ele ganha +200 de dano neste turno.' },
        { id: 'hanna', numero: 32, nome: 'Hanna', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/hanna.png', foco: '50% 30%',
            descricaoArte: 'Uma jornalista morena extremamente gananciosa: mulher jovem morena de cabelos castanho-escuros longos, blazer de repórter e crachá de imprensa, olhar e sorriso cheios de cobiça, segurando um microfone numa mão e puxando uma esfera de Aura dourada do oponente com a outra.',
            frase: 'Essa aura agora é do Superkid.',
            tcg: 'Vida 1.600 · Recuo 1 Aura\nAo entrar na mesa: rouba 1 Aura de uma carta do adversário e coloca no seu Superkid.\nOlhar Frio (1 Aura): 400 de dano.' },
        { id: 'mariana', numero: 33, nome: 'Mariana', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/mariana.png', foco: '50% 30%',
            descricaoArte: 'Inspirada na Encantadora, só que morena do cabelo cacheado e maligna no sentido de iludir: feiticeira morena de cabelos cacheados volumosos escuros, manto escuro com adornos dourados, olhar sedutor e manipulador, conjurando fios de névoa rosa-escura e corações sombrios que formam uma redoma protetora.',
            frase: 'Ninguém encosta nele enquanto eu estiver aqui.',
            tcg: 'Vida 2.000 · Recuo 1 Aura\nPoder Proteção Permanente: enquanto estiver no banco, o seu Superkid é imune a Hit Kill (sobrevive com 20 de vida a qualquer golpe letal de uma vez) e não recebe dano de efeitos.\nEmpurrão (2 Aura): 800 de dano.' },
        { id: 'julia', numero: 34, nome: 'Júlia', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/julia.png', foco: '50% 30%',
            descricaoArte: 'Inspirada no visual do Superkid, mas com um cabelo rosa curto: garota super-heroína de cabelo rosa curto vestindo o uniforme azul-royal com frisos dourados, capa vermelha esvoaçante, cinto vermelho com fivela dourada e botas vermelhas, abrindo um portal brilhante para Lavras MG.',
            frase: 'Me dá uma skin, Superkid?',
            tcg: 'Vida 2.400 · Recuo 1 Aura\nNão pode estar na mesa ao mesmo tempo que o Superkid. Ao entrar, coloca Lavras MG direto do baralho no banco.\nPedir Skin pro Superkid (2 Aura): 1.200 de dano; ela volta para o baralho e coloca um Superkid do baralho ou da mão no ativo com 1 Aura.' },
        { id: 'lavras-mg', numero: 35, nome: 'Lavras MG', tipo: 'goon', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/lavras-mg.png', foco: '50% 30%',
            descricaoArte: 'Cidade inspirada em Metrópolis (Superman): visão monumental de Lavras-MG com arranha-céus art déco reluzentes em ouro e azul, edifício central coroado por um grande globo dourado, trem moderno em trilhos elevados e colunas de Aura amarela subindo para o céu.',
            frase: 'Interior de Minas Gerais.',
            tcg: 'Vida 1.400 · Recuo 2 Aura\nEntidade: fica no banco por 2 turnos e depois vai para o descarte. No final de cada turno seu, o seu Superkid se tora (fica virado) e ganha +1 Aura.\nTrem de Minas (1 Aura): 200 de dano.' },
        { id: 'clubexx', numero: 36, nome: 'Clubexx...', tipo: 'campo', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/clubexx.png', foco: '50% 30%',
            descricaoArte: 'Definição de local para farmar aura: pista e fachada de um clube noturno de ostentação iluminado por holofotes dourados e luzes neon azuis, espelhos, fumaça dramática no chão, ventiladores para esvoaçar capas e pedestais iluminados emanando colunas de Aura dourada.',
            frase: 'O clube secreto da distribuição de aura.',
            tcg: 'Campo (vale para os dois lados)\n1 vez por turno, cada jogador pode tirar 1 Aura de um Superkid que controla e mover para outra carta no seu banco (não gasta o limite normal de colocar Aura do turno).' },
        { id: 'douglas', numero: 37, nome: 'Douglas', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/douglas.png', foco: '50% 30%',
            descricaoArte: 'Baseado na ficha DougXbox da Art Bible: jovem adulto de pele morena clara, rosto anguloso sem barba, sobrancelhas pretas grossas e cabelo preto espetado com franja diagonal, vestindo colete verde-escuro de gola alta da Tropa Box sobre traje preto e segurando controle preto com 2 pilhas AA brilhando em verde em São João do Butico.',
            frase: 'Só piso aqui se for no São João do Butico.',
            tcg: 'Vida 1.800 · Recuo 1 Aura · São João do Butico\nSó pode entrar na mesa se o campo São João do Butico estiver ativo.\nPoder Herege (1 vez por turno): se você tiver um Degustador na mesa, compra 2 cartas.\nRevezamento (2 Aura): 400 de dano e troca de lugar com um Degustador da Noite do seu banco, que ganha automaticamente Escudo de Parênteses (600).' },
        { id: 'caiam', numero: 38, nome: 'Caiam', tipo: 'personagem', raridade: 'raro', peso: 1,
            arte: 'assets/Cartas/caiam.png', foco: '50% 30%',
            descricaoArte: 'Um amigo de óculos, cabelo curto e branco, com uma camisa vermelha com uma estrela branca no centro, gritando e zangado: jovem furioso de óculos de grau e cabelo curto branco platinado, veias saltando na testa e punhos cerrados, barrando a entrada de São João do Butico.',
            frase: 'O Butico está fechado para reformas.',
            tcg: 'Vida 1.600 · Recuo 1 Aura · São João do Butico\nAo entrar na mesa: busca o campo São João do Butico direto do baralho e o coloca em jogo.\nPoder Guarda do Butico: enquanto estiver no banco, o campo não pode ser trocado nem descartado.\nConvocar (1 Aura): 200 de dano e busca até 2 cartas de São João do Butico no baralho para a mão.' },
        { id: 'teemo', numero: 39, nome: 'Teemo', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/teemo.png', foco: '50% 30%',
            descricaoArte: 'Pequeno texugo/yordle explorador peludo usando o icônico gorro verde de escoteiro com óculos vermelhos na testa e lenço vermelho no pescoço, sorriso travesso de olhos fechados, soprando uma zarabatana de bambu cercado por cogumelos roxos e verdes explodindo em gás venenoso.',
            frase: 'Capitão Teemo no dever.',
            tcg: 'Vida 1.000 · Recuo 1 Aura · São João do Butico\nPoder Veneno do Butico: no banco, todo dano de ataque do seu Degustador envenena o inimigo (1.000 de dano ao longo de 4 turnos: 250 por turno; se a carta inimiga voltar pro baralho envenenada, o dono leva metade do dano restante direto na vida).\nCampo Minado (3 Aura): 100 de dano em todos os personagens do adversário e os envenena.' },
        { id: 'tiago-cassio', numero: 40, nome: 'Tiago Cássio', tipo: 'personagem', raridade: 'epico', peso: 1,
            arte: 'assets/Cartas/tiago-cassio.png', foco: '50% 30%',
            descricaoArte: 'Inspirado no Chorão (homem adulto muito gordo e corpulento, grande barriga saliente, rosto largo avermelhado, cabelo preto curto nas laterais com topo ralo e barba por fazer), porém com expressão cínica de cobrador/agiota de Aura, sugando as esferas de Aura do inimigo com uma mão e concentrando 6 esferas colossais na outra.',
            frase: 'Empresta essa aura aí rapidão.',
            tcg: 'Vida 2.000 · Recuo 2 Aura\nAgiotagem de Aura (1 Aura): 260 de dano, rouba toda a Aura do alvo por 1 turno (devolve no turno seguinte) e fica virado por 1 turno.\nCobrança Final (6 Aura): 6.000 de dano direto na vida do jogador adversário (não pode usar Aura roubada para pagar este ataque).' },
        { id: 'pmldm', numero: 41, nome: 'PMLDM', tipo: 'personagem', raridade: 'lendario', peso: 1,
            arte: 'assets/Cartas/pmldm.png', foco: '50% 30%',
            descricaoArte: 'Uma menina com cabelo vermelho com franja, de pele bem branca, com aspectos inspirados na Xayah de League of Legends (capuz/orelhas de plumas e penas afiadas carmesim/violeta flutuando nos dedos), corpo levemente violão, óculos preto redondo e acessórios que lembram o ItaloLOL (corrente dourada grossa, detalhes preto/rosa e chaveiro do cãozinho amarelo).',
            frase: '40/0/100 de Ezreal.',
            tcg: 'Vida 2.400 · Recuo 2 Aura\nAo entrar na mesa: adiciona até 2 cartas Itallo do baralho para a mão.\nPoder Dano em Área: no banco, todo dano de ataque causado por um Itallo seu atinge também todo o banco inimigo.\nDespertar Ezreal (3 Aura): 600 de dano e transforma-se no Itallo Lendário de EZREAL 40/0/100 (imune a ataques no banco e condições especiais; 1 Aura dá 600 em todos os inimigos; 4 Aura se mata e destrói 2 cartas do oponente).' },
        { id: 'pidao-do-vape', numero: 42, nome: 'Pidão do Vape', tipo: 'goon', raridade: 'comum', peso: 2,
            arte: 'assets/Cartas/pidao-do-vape.png', foco: '50% 30%',
            descricaoArte: 'Capanga folgado de moletom esticando a mão com cara de pidão para puxar o vapor de um vape/pod eletrônico colorido que suga uma esfera de Aura dourada, enquanto segura o peito com a outra mão tossindo fumaça escura de dano pulmonar progressivo.',
            frase: 'Deixa eu dar só um puxãozinho?',
            tcg: 'Vida 1.400 · Recuo 1 Aura\nPoder Puxãozinho (1 vez por turno): rouba 1 Aura do ativo do adversário para ele ou para alguém do seu banco, mas sofre dano pulmonar progressivo (200 no 1º roubo, 400 no 2º, 600 no 3º...).\nBaforada (1 Aura): 400 de dano.' },
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
    const CREDITOS_POR_PONTO = Object.freeze({ 'flappy-enzo': 100 });

    /**
     * Créditos da Batalha dos Torados por partida. Empate paga o mesmo que a derrota.
     * "online" vem do servidor (api/tcg.js); "npc" é pedido pelo navegador e tem limite diário.
     */
    const CREDITOS_BATALHA = Object.freeze({
        online: Object.freeze({ vitoria: 500, derrota: 150 }),
        npc: Object.freeze({ vitoria: 250, derrota: 50 }),
    });

    /**
     * Presente de boas-vindas: um de cada pacote. O visitante sem login abre
     * esses mesmos 3 na chegada ao site; ao entrar, as cartas vão para a conta.
     */
    const BOAS_VINDAS = Object.freeze(['estacionamento', 'toradolandia', 'piscina-de-macarronada']);
    /** Compatibilidade: o primeiro pacote do presente. */
    const PACOTE_BOAS_VINDAS = BOAS_VINDAS[0];

    /**
     * Pacote diário (1 por dia ao entrar no site com login, dia de Brasília).
     * Dias seguidos formam a sequência; a cada `especialACada` dias vem o `especial`.
     */
    const DIARIO = Object.freeze({ tipo: 'toradolandia', especial: 'piscina-de-macarronada', especialACada: 7 });

    /**
     * Presentes que cada conta ganha UMA vez (as que já existem e as novas).
     * Para encerrar um presente, apague a linha (quem já ganhou continua com ele).
     */
    const PRESENTES_UNICOS = congelar([
        { id: 'grande-atualizacao-2026-10', tipo: 'piscina-de-macarronada', nome: 'Presente da grande atualização' },
    ]);

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
        RARIDADES, CARTAS, PACOTES, CREDITOS_POR_PONTO, CREDITOS_BATALHA, PACOTE_BOAS_VINDAS, BOAS_VINDAS, DIARIO, PRESENTES_UNICOS, MAX_POR_VEZ,
        carta, pacote, raridade, nivel, cartasDaRaridade, valorPo,
    };
});
