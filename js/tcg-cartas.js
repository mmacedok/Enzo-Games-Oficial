// >>> AVISO PARA IAs E DEVS: antes de editar este arquivo leia docs/GUIA-IA-CARTAS.md (erros que já aconteceram + checklist).
// >>> Todo 'tipo' de efeito escrito aqui precisa existir em EFEITOS/BONUS_DANO (js/tcg-regras.js), senão a carta não faz nada.
// >>> Antes de dizer que terminou: node --test test/contrato-cartas.test.js && npm test. Não afrouxe teste para passar.
// ============================================================================
// Batalha dos Torados: números de combate das cartas do Baralho Enzo.
// Mesmo `id` do js/baralho-dados.js (arte, nome, raridade e tipo vêm de lá).
// Fica separado para balancear o jogo sem mexer no sorteio dos pacotes.
//
// Lutadores (personagem e goon): `hp`, `recuo` (Aura para voltar ao banco),
// `ataques` [{ nome, custo, dano, alvo?, recarga?, efeitos? }] e `poder?`.
// HP e números de dano ficam na escala pequena: o motor multiplica por ESCALA (js/tcg-regras.js).
// `recarga`: depois de usar, a carta fica virada (sem atacar, poder nem recuo) por N turnos do dono.
// Campos: `campo` { nome, texto, tipo, ... }.
// Cartas complementares (tipo `resenha` no js/baralho-dados.js): `anexo` { texto, ... }. Ficam deitadas atrás de
// um lutador e mudam só ele. Opcionais:
//   em: { lado: 'meu'|'dele'|'qualquer', lugar: 'ativo'|'banco', tipos: [...], cartas: [ids], tags: [...] }
//   hp, recuo, dano, reducao, custo (somam) · ataques (a mais) · trocaAtaques · efeitosAtaque · poder · tags
//   visual: { arte: id de outra carta, nome, raridade } (muda a aparência do lutador)
//   aoEntrar: [efeitos] · soAoEntrar: true (age e vai para o descarte) · usos: N ataques · turnos: N turnos do dono
//   maxNoLutador (padrão R.ANEXOS_POR_LUTADOR)
//   Exemplo: 'bone-da-sorte': { anexo: { texto: '+10 de dano; sai depois de 2 ataques.', dano: 10, usos: 2 } }
// `tags`: lista opcional em qualquer carta (ex.: ['degustador']), para efeitos do tipo "toda carta X".
// Tipo de carta novo: uma linha em TIPOS (js/tcg-regras.js). Efeito novo: uma entrada em EFEITOS ou BONUS_DANO.
// Mudou um número? Rode `node --test test/tcg-regras.test.js`.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./baralho-dados.js'));
    else root.EnzoTcgCartas = factory(root.EnzoBaralho);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Baralho) {
    'use strict';

    const congelar = (obj) => {
        Object.values(obj).forEach((v) => { if (v && typeof v === 'object') congelar(v); });
        return Object.freeze(obj);
    };

    const COMBATE = {
        // ---- Lendários (nocaute vale 1 ponto, como toda carta) --------------------------------
        'enzo-games': { hp: 140, recuo: 2, ataques: [
            { nome: 'Almôndega', custo: 1, dano: 30 },
            { nome: 'Macarronada a 300%', custo: 3, dano: 120, recarga: 1 },
        ] },
        'cabo-coco': { hp: 130, recuo: 2,
            poder: { nome: 'Conteúdo Banido', tipo: 'banirCampos', ativavel: false,
                texto: 'Com ele no ativo, o adversário não joga campos.' },
            ataques: [
                { nome: 'Arquivo Confidencial', custo: 2, dano: 60, efeitos: [{ tipo: 'curarSi', valor: 20 }] },
            ] },
        'degustador-da-noite': { hp: 130, recuo: 1, tags: ['degustador', 'sao-joao-do-butico'], ataques: [
            { nome: 'Vírgula-rangue', custo: 1, dano: 20, alvo: 'qualquer', recarga: 1 },
            { nome: 'Escudo de Parênteses', custo: 3, dano: 90, recarga: 1, efeitos: [{ tipo: 'escudo', valor: 30 }] },
        ] },
        'o-inominavel': { hp: 120, recuo: 2,
            poder: { nome: 'Besteira no Discord', tipo: 'notificarAtivo', ativavel: true,
                texto: '1 vez por turno: deixa o ativo do adversário Notificado.' },
            ataques: [
                { nome: 'Bala Dourada', custo: 2, dano: 60, alvo: 'qualquer', recarga: 1 },
            ] },
        'superkid': { hp: 130, recuo: 2, tags: ['superkid'], ataques: [
            { nome: 'Farmar Aura', custo: 1, dano: 0, efeitos: [{ tipo: 'auraSi', valor: 1 }] },
            { nome: 'Aura de 67 Segundos', custo: 2, dano: 20, efeitos: [{ tipo: 'bonusPorAura', valor: 20 }] },
        ] },

        // ---- Épicos ----------------------------------------------------------
        'chorao': { hp: 110, recuo: 2,
            poder: { nome: 'Vou te Processar!', tipo: 'contraAtaque', ativavel: false, valor: 20,
                texto: 'Quem ataca o Chorão leva 20 de volta.' },
            ataques: [{ nome: 'Birra', custo: 2, dano: 50 }] },
        'sombra-do-degustador': { hp: 90, recuo: 0, tags: ['degustador', 'sao-joao-do-butico'], ataques: [
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
        'italolol': { hp: 90, recuo: 1, tags: ['itallo'], ataques: [
            { nome: 'Au! Aura!', custo: 1, dano: 20 },
            { nome: '0/14/2', custo: 2, dano: 70, efeitos: [{ tipo: 'danoSi', valor: 30 }] },
        ] },
        'stand-do-joinha': { hp: 70, recuo: 1,
            poder: { nome: 'Num Tem Eu', tipo: 'bonusDoBanco', ativavel: false, valor: 10,
                texto: 'No banco: +10 de dano nos ataques do seu ativo (não soma com outro Stand).' },
            ataques: [{ nome: 'Joinha', custo: 1, dano: 20 }] },
        'encantadora': { hp: 70, recuo: 1,
            poder: { nome: 'Vem Cá, Meu Gadinho', tipo: 'puxar', ativavel: true,
                texto: '1 vez por turno, de qualquer lugar da mesa: escolhe uma carta do banco do adversário e ela vira o ativo. Depois a Encantadora fica virada por 1 turno.' },
            ataques: [
            { nome: 'Chama Rosa', custo: 2, dano: 30, efeitos: [{ tipo: 'estado', estado: 'iludido' }] },
        ] },
        'marreteiro-do-coracao': { hp: 100, recuo: 2, ataques: [
            { nome: 'Quebrar Tudo', custo: 1, dano: 0, efeitos: [{ tipo: 'descartarCampo' }] },
            { nome: 'Marretada', custo: 3, dano: 90 },
        ] },
        'moderador-do-ban': { hp: 90, recuo: 2, maxCopias: 1, ataques: [
            { nome: 'Ban de 7 Dias', custo: 2, dano: 30, recarga: 1, efeitos: [{ tipo: 'estado', estado: 'silenciado' }] },
        ] },

        // ---- Comuns ----------------------------------------------------------
        'cara-de-coracao': { hp: 70, recuo: 1, ataques: [
            { nome: 'Soco Iludido', custo: 1, dano: 20, efeitos: [{ tipo: 'bonusSeAliado', carta: 'encantadora', valor: 20 }] },
        ] },
        'bug-do-discord': { hp: 50, recuo: 1, ataques: [
            { nome: 'Glitch', custo: 1, dano: 0, efeitos: [{ tipo: 'moeda', cara: 40, coroa: 0 }] },
        ] },
        'notificacao-morcego': { hp: 40, recuo: 0, ataques: [
            { nome: '@everyone', custo: 0, dano: 10, efeitos: [{ tipo: 'estado', estado: 'notificado' }] },
        ] },
        'emoji-pistola': { hp: 60, recuo: 1, ataques: [
            { nome: 'Reação 😡', custo: 1, dano: 10, efeitos: [{ tipo: 'bonusPorGoon', valor: 10 }] },
        ] },
        'drone-vigia': { hp: 60, recuo: 1,
            poder: { nome: 'Câmera', tipo: 'espiarMao', ativavel: true,
                texto: '1 vez por turno: olha a mão do adversário.' },
            ataques: [{ nome: 'Facho', custo: 0, dano: 20 }] },

        // ---- Novas Cartas de Lutadores (Arquétipos e Avulsas) ----------------
        'hanna': { hp: 80, recuo: 1, tags: ['superkid'],
            aoEntrar: [{ tipo: 'roubarAuraParaSuperkid', valor: 1 }],
            ataques: [
                { nome: 'Olhar Frio', custo: 1, dano: 20 },
            ] },
        'mariana': { hp: 100, recuo: 1, tags: ['superkid'],
            poder: { nome: 'Proteção Permanente', tipo: 'protegerSuperkid', ativavel: false,
                texto: 'Enquanto estiver no banco, o seu Superkid é imune a Hit Kill e não recebe dano de efeitos.' },
            ataques: [
                { nome: 'Empurrão', custo: 2, dano: 40 },
            ] },
        'julia': { hp: 120, recuo: 1, tags: ['superkid'],
            proibidoCom: ['superkid'],
            aoEntrar: [{ tipo: 'invocarDoDeck', carta: 'lavras-mg' }],
            ataques: [
                { nome: 'Pedir Skin pro Superkid', custo: 2, dano: 60, efeitos: [{ tipo: 'trocarPorSuperkidDoDeck', aura: 1 }] },
            ] },
        'lavras-mg': { hp: 70, recuo: 2, tags: ['superkid'], turnosNaMesa: 2,
            ataques: [
                { nome: 'Trem de Minas', custo: 1, dano: 10 },
            ] },
        'douglas': { hp: 90, recuo: 1, tags: ['sao-joao-do-butico'], exigeCampo: 'sao-joao-do-butico',
            poder: { nome: 'Herege', tipo: 'comprarSeDegustador', ativavel: true, valor: 2,
                texto: '1 vez por turno: se você tiver um Degustador na mesa, compra 2 cartas.' },
            ataques: [
                { nome: 'Revezamento', custo: 2, dano: 20, efeitos: [{ tipo: 'trocarPorDegustadorComEscudo', escudo: 30 }] },
            ] },
        'caiam': { hp: 80, recuo: 1, tags: ['sao-joao-do-butico'],
            aoEntrar: [{ tipo: 'buscarCampoDoDeck', carta: 'sao-joao-do-butico' }],
            poder: { nome: 'Guarda do Butico', tipo: 'travarCampo', ativavel: false,
                texto: 'Enquanto estiver no banco, o campo não pode ser trocado nem descartado.' },
            ataques: [
                { nome: 'Convocar', custo: 1, dano: 10, efeitos: [{ tipo: 'buscarPorTag', tag: 'sao-joao-do-butico', qtd: 2 }] },
            ] },
        'teemo': { hp: 50, recuo: 1, tags: ['sao-joao-do-butico'],
            poder: { nome: 'Veneno do Butico', tipo: 'venenoTeemoBanco', ativavel: false,
                texto: 'No banco: todo dano do seu Degustador envenena o inimigo (1.000 de dano ao longo de 4 turnos; se voltar pro baralho envenenado, o jogador leva metade do dano restante).' },
            ataques: [
                { nome: 'Campo Minado', custo: 3, dano: 5, efeitos: [{ tipo: 'envenenarTodosTeemo', danoTodos: 5 }] },
            ] },
        'tiago-cassio': { hp: 100, recuo: 2, ataques: [
            { nome: 'Agiotagem de Aura', custo: 1, dano: 13, recarga: 1, efeitos: [{ tipo: 'roubarTodaAura', turnos: 1 }] },
            { nome: 'Cobrança Final', custo: 6, dano: 300, semAuraRoubada: true, efeitos: [{ tipo: 'danoDiretoJogador', valor: 300 }] },
        ] },
        'pmldm': { hp: 120, recuo: 2, tags: ['itallo'],
            aoEntrar: [{ tipo: 'buscarPorTag', tag: 'itallo', qtd: 2 }],
            poder: { nome: 'Dano em Área', tipo: 'splashItallo', ativavel: false,
                texto: 'No banco: todo dano de Itallo atinge o time inimigo inteiro. Pós-transformação (Super Italo), ele mesmo atinge o time inimigo inteiro em área.' },
            ataques: [
                { nome: 'Despertar Ezreal', custo: 3, dano: 30, efeitos: [{ tipo: 'transformarEzreal' }] },
                { nome: 'Plumas Carmesim', custo: 1, dano: 20 },
            ] },
        'pidao-do-vape': { hp: 70, recuo: 1,
            poder: { nome: 'Puxãozinho', tipo: 'roubarAuraVape', ativavel: true,
                texto: '1 vez por turno: rouba 1 Aura do adversário e leva dano pulmonar progressivo (200, 400, 600...).' },
            ataques: [
                { nome: 'Baforada', custo: 1, dano: 20 },
            ] },

        // ---- Magias e Resenhas (tipo `resenha` / modo `anexo`) ---------------
        'calibra-o-smite': { anexo: {
            texto: 'Gasta 1 Aura sua: se o ativo do adversário tiver exatamente 600 de vida, ele é destruído sem causar dano à vida do jogador.',
            em: { lado: 'dele', lugar: 'ativo' },
            custoAuraJogador: 1,
            exigeVidaExata: 30,
            soAoEntrar: true,
            aoEntrar: [{ tipo: 'smiteSemNocaute' }],
        } },
        'calibra-o-smite-anuah': { anexo: {
            texto: 'Gasta 2 Auras dos seus personagens: o ativo do adversário causa apenas metade do dano até o final do próximo turno dele.',
            em: { lado: 'dele', lugar: 'ativo' },
            custoAuraJogador: 2,
            turnos: 2,
            metadeDano: true,
        } },
        'cade-meu-jungle': { anexo: {
            texto: 'Gasta 2 Auras suas: devolve uma carta do banco do adversário para a mão dele.',
            em: { lado: 'dele', lugar: 'banco' },
            custoAuraJogador: 2,
            soAoEntrar: true,
            aoEntrar: [{ tipo: 'voltarParaMao' }],
        } },
        'dar-ff': { anexo: {
            texto: 'Gasta 1 Aura sua: cura 600. Se os dois jogadores usarem Dar FF um depois do outro, ambos levam 1.000 de dano.',
            em: { lado: 'meu' },
            custoAuraJogador: 1,
            soAoEntrar: true,
            aoEntrar: [{ tipo: 'darFF', cura: 30, danoMutuo: 50 }],
        } },
        'hoje-e-quarta-feira': { anexo: {
            texto: 'Descarta até 2 cartas da mão, o adversário ganha +1 Aura no próximo turno e troca seu ativo por um do banco.',
            em: { lado: 'meu', lugar: 'banco' },
            soAoEntrar: true,
            aoEntrar: [{ tipo: 'quartaFeira' }],
        } },
        'itallo-de-viego': { tags: ['itallo'], anexo: {
            texto: 'Ao entrar, joga um Enzo Games do baralho para a mesa (entra virado). Dá o ataque Rei Destruído (2 Aura): 200 de dano e o próximo ataque aliado pode acertar o banco.',
            em: { lado: 'meu' },
            tags: ['itallo'],
            aoEntrar: [{ tipo: 'invocarDoDeck', carta: 'enzo-games', virado: true }],
            ataques: [
                { nome: 'Rei Destruído', custo: 2, dano: 10, efeitos: [{ tipo: 'liberarAtaqueBanco' }] },
            ],
        } },
        'pedra-mole': { anexo: {
            texto: 'Se você controlar um Enzo Games virado e qualquer carta Itallo, desvira o Enzo Games e ele ganha +200 de dano neste turno.',
            em: { lado: 'meu', cartas: ['enzo-games'] },
            exigeVirado: true,
            exigeAliadoTag: 'itallo',
            dano: 10,
            turnos: 1,
            aoEntrar: [{ tipo: 'desvirarSi' }],
        } },

        // ---- Campos (ficam na mesa e valem para os dois) --------------------
        'piscina-de-macarronada': { campo: { tipo: 'curaInicio', valor: 20,
            texto: 'Quando quem a joga a põe na mesa, cura 20 de cada carta dele na mesa (ativo e banco) no mesmo turno; depois, no começo de cada turno, cura 20 de cada carta de quem vai jogar.' } },
        'toradolandia': { campo: { tipo: 'compraExtra', limiteMao: 3,
            texto: 'Quem começa o turno com 3 cartas ou menos na mão compra 1 a mais.' } },
        'mansao-do-inominavel': { campo: { tipo: 'mansao', veneno: 20, hpGoon: 20,
            texto: 'Notificado tira 20 em vez de 10. Goons ganham +20 HP permanente na mesa (não perdem se a Mansão sair). Goon que ataca com 1 Aura a mais do que o ataque pede notifica o ativo do adversário.' } },
        'estacionamento-noturno': { campo: { tipo: 'recuoGratisGoon',
            texto: 'Goons recuam de graça.' } },
        'casa-do-enzo-games': { campo: { tipo: 'trocarCarta',
            texto: '1 vez por turno, cada jogador pode devolver 1 carta da mão ao baralho para comprar 1.' } },
        'sao-joao-do-butico': { tags: ['sao-joao-do-butico'], campo: { tipo: 'protegeBanco',
            texto: 'Comporta secreta: ataques não acertam o banco. Degustadores que voltam para o baralho colocam +1 Aura em outro Degustador no banco.' } },
        'clubexx': { campo: { tipo: 'moverAuraSuperkid',
            texto: '1 vez por turno, cada jogador pode tirar 1 Aura de um Superkid que controla e mover para outra carta no banco.' } },
    };


    // Decks prontos (a tela e o servidor do online usam a mesma lista).
    const TODOS_OS_DECKS = [
        { id: 'turma', nome: 'Turma do Enzo', texto: 'Heróis fortes que curam e compram cartas.',
            capa: ['enzo-games', 'superkid', 'hatsune-neves'],
            cartas: ['enzo-games', 'superkid', 'degustador-da-noite', 'italolol', 'italolol', 'hatsune-neves', 'hatsune-neves',
                'stand-do-joinha', 'stand-do-joinha', 'chorao', 'chorao', 'casa-do-enzo-games', 'casa-do-enzo-games',
                'piscina-de-macarronada', 'sombra-do-degustador'] },
        { id: 'legiao', nome: 'Legião do Mal', texto: 'Veneno, ban e capangas que batem forte.',
            capa: ['o-inominavel', 'encantadora', 'marreteiro-do-coracao'],
            cartas: ['o-inominavel', 'cabo-coco', 'encantadora', 'encantadora', 'cara-de-coracao', 'cara-de-coracao',
                'marreteiro-do-coracao', 'marreteiro-do-coracao', 'moderador-do-ban', 'drone-vigia',
                'emoji-pistola', 'emoji-pistola', 'mansao-do-inominavel', 'mansao-do-inominavel', 'sombra-do-degustador'] },
        { id: 'internet', nome: 'Bichos da Internet', texto: 'Um enxame de goons baratos e rápidos.',
            capa: ['notificacao-morcego', 'bug-do-discord', 'drone-vigia'],
            cartas: ['bug-do-discord', 'bug-do-discord', 'notificacao-morcego', 'notificacao-morcego', 'emoji-pistola',
                'emoji-pistola', 'drone-vigia', 'drone-vigia', 'moderador-do-ban', 'marreteiro-do-coracao', 'cara-de-coracao',
                'cara-de-coracao', 'estacionamento-noturno', 'estacionamento-noturno', 'toradolandia'] },
        { id: 'pedra-mole', nome: 'Turma da Pedra Mole', texto: 'Golpes da Pedra Mole, buffs de Ezreal e a fúria do Viego.',
            capa: ['itallo-de-viego', 'pmldm', 'pedra-mole'],
            cartas: ['pmldm', 'itallo-de-viego', 'itallo-de-viego', 'pedra-mole', 'pedra-mole',
                'tiago-cassio', 'tiago-cassio', 'pidao-do-vape', 'pidao-do-vape', 'calibra-o-smite',
                'calibra-o-smite', 'cade-meu-jungle', 'cade-meu-jungle', 'dar-ff', 'hoje-e-quarta-feira'] },
        { id: 'superkid-novo', nome: 'Superkid & Butico', texto: 'Júlia, Teemo, Hanna, Mariana, Caiam e Douglas.',
            capa: ['julia', 'teemo', 'hanna'],
            cartas: ['julia', 'teemo', 'hanna', 'hanna', 'mariana', 'mariana', 'caiam', 'caiam',
                'douglas', 'douglas', 'lavras-mg', 'lavras-mg', 'clubexx', 'clubexx', 'chorao'] },
    ];

    /** Só os decks de temporadas que já saíram (a tela e o online leem esta lista). */
    const DECKS_PRONTOS = TODOS_OS_DECKS.filter((d) => !Baralho || Baralho.deckLiberado(d.id));

    return congelar({ COMBATE, DECKS_PRONTOS, TODOS_OS_DECKS });
});
