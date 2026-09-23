# Correções e validação do site inteiro

Revisão: 17/09/2026, com redesign e limpeza em 23/09/2026 (ver seção no fim).
Relatórios antigos (`BUG_REPORT.md`, `docs/historico/`) foram removidos; estão
no primeiro commit do git se algum dia forem necessários.

## Auditoria dos 34 itens

| Item | Resultado atual | Evidência / implementação |
|---|---|---|
| 01 | Um único motor no leitor | `reader.html`, `js/reader.core.js` |
| 02 | Ranking valida tipo, teto, origem, sessão assinada, duração e uso único; gravação atômica | `server.js`, testes reais da API em arquivo temporário |
| 03 | Sem remoção de fundo em runtime | Sprites com alpha; sem `getImageData` |
| 04 | Jogo em seção própria; hero oculto enquanto aberto | `#game-slot`, `.game-open`, QA de abrir/fechar |
| 05 | Relógio real com acumulador e passo fixo | Testes em 30, 60 e 144 Hz; pausa ao sair da aba |
| 06 | Build preserva curadoria e só grava alterações | Manifest separado, backup e escrita atômica; fixture de idempotência |
| 07 | Spin-offs e capítulos ordenados numericamente | Teste com capítulos 2 e 10 e ID renomeado |
| 08 | Imagem real do easter egg, acessível por teclado | Teste de existência e clique no capítulo 5 |
| 09 | Geometria explícita dos obstáculos, hitbox menor do personagem | `game-core.js`, testes de colisão e partida |
| 10 | Asset JPEG disfarçado removido | Novos obstáculos não usam `pipe.png` antigo |
| 11 | Fundo desenhado sem request inexistente | QA de rede do jogo |
| 12 | CSS responsivo reparado; controles do leitor cabem no celular | Screenshots e verificação de limites do viewport |
| 13 | Ranking opcional; fim de partida permite reinício imediato | QA com falha simulada de envio, recuperação e reabertura |
| 14 | Testes reais em Node e navegador | `npm test`, `tools/qa-game.js`, `tools/qa-site.js` |
| 15 | Imagens WebP com hash, srcset, dimensões e cache | `lib/web-images.js`; originais preservados |
| 16 | Cursores por contexto, tema Degustador e campo de texto | CSS e teste do cursor do spin-off |
| 17 | Variáveis CSS do rodapé corrigidas | `--bg-surface`, `--font-sans` |
| 18 | Zoom persistente e ampliação real inclusive no celular | QA mede crescimento de largura e rolagem horizontal |
| 19 | Capítulos agrupados por gibi; navegação sem reload e histórico | QA voltar/avançar; `pushState` e `popstate` |
| 20 | Input do jogo só quando aberto; ignora texto, repetição e botão direito | Handlers de teclado e ponteiro |
| 21 | Reinício fecha modal e zera partida | QA de fechar/reabrir após pontuação |
| 22 | Ranking verifica HTTP, evita envio duplo, usa texto e permite nova tentativa | QA com 503 simulado e envio único |
| 23 | Estado do modal explícito | `awaitingName`, atributo `hidden` |
| 24 | Home valida catálogo antes de renderizar e oferece nova tentativa | `validate`, `renderError` em `main.js` |
| 25 | Hero usa ordem curada e também funciona com um único gibi | Campo `order`, `featured`, ordenação natural |
| 26 | Tilt só no mouse, reset em cancelamento, movimento reduzido respeitado | `attachTilt`, CSS `prefers-reduced-motion` |
| 27 | Capas/fichas responsivas, dimensões reservadas, lazy load | WebP, srcset, QA de todas as imagens |
| 28 | Máscara com buffers tipados | `lib/cabo-coco-mask.js`, testes de PNG/transparência |
| 29 | Máscara verifica transparência e mudança na arte fonte | Hash da fonte em sidecar; geração só no build |
| 30 | Pointer Events e touch-action no canvas | QA de toque no jogo |
| 31 | Scripts e CSS com versões atualizadas | HTMLs; servidor revalida código e documentos |
| 32 | Degustador presente e link funcional | QA da landing page e do leitor do spin-off |
| 33 | Utilitários antigos removidos; dependência Jimp retirada | Build usa Sharp; `npm audit`: nenhuma vulnerabilidade na verificação |
| 34 | Relatórios históricos separados; documentação atual consolidada | Este arquivo e README |

## Novos assets do jogo

O jogo usa `assets/flappy/pasta-pipe-v2.png`, arte gerada de cano de molho e
macarrão, com versão WebP no build. A boca e o corpo são recortados no desenho
do canvas e têm retângulos próprios de colisão. O fundo ao redor da arte não
é desenhado nem participa da colisão.

## Outras falhas corrigidas durante a revisão

- Galeria inteira acessível por teclado. Ficha ampliada em `dialog`, fechamento
  pelo botão, Escape ou fundo; foco retorna ao cartão. Senha incorreta dá feedback
  e senha correta abre a ficha. Não acumula clones nem esconde a imagem original.
- Galeria e botões de extras ajustados em celular; modal de senha cabe na tela.
- PIX só confirma cópia após sucesso; se o navegador negar, apresenta texto selecionável.
- Servidor retorna 404 para recursos ausentes e não publica código do servidor,
  relatórios, dependências ou arquivos privados de dados. Diretórios montados
  separadamente impedem acesso por caminhos codificados que tentem sair deles.
- Monitor observa também o manifest, ignora arquivos gerados e preserva eventos
  recebidos durante um build em execução.
- Harness de QA usa perfil e porta próprios por execução, com timeout de comandos,
  evitando interferência entre verificações simultâneas.

## Verificação reproduzível

- `npm test`: 35 testes cobrindo catálogo, pipeline, imagens, física, sessão, API e arquivos públicos.
- `npm run build` duas vezes: catálogo e arquivos gerados idênticos não são regravados.
- `npm run qa:site -- http://localhost:3016`: home, personagens, Degustador e os sete
  gibis, em 1440×900 e 390×844. Verifica imagens, zoom, senhas, easter eggs,
  conquista, cursor, navegação da galeria e cópia do PIX.
- `tools/qa-reader.js`: histórico e zoom preservado durante troca de gibi.
- `tools/qa-game.js`: 90 segundos simulados, 10 segundos de relógio real, pausa,
  dano, proteção, ranking opcional, falha de envio e reinício. Não grava scores de teste.

A rodada completa terminou com **20 de 20 cenários aprovados**, sem erros de
console, exceções ou recursos ausentes. Resultados e screenshots: `shots/site-audit/`. A transferência local medida com
as imagens da página carregadas ficou em aproximadamente **2,40 MB na home**,
**2,03 MB na galeria desktop** e **1,07 MB na galeria mobile**. São medições locais,
não uma pontuação Lighthouse nem garantia de LCP em redes móveis. Os originais
continuam em `assets/`; versões de navegação ficam em `assets/web/`.

A sessão assinada dificulta envios triviais e repetidos, mas a simulação continua
no cliente. A senha das brincadeiras de censura também é client-side: não constitui
controle de acesso a arquivos confidenciais.

## Redesign e limpeza (23/09/2026)

- Removidos: relatórios antigos de agentes, `BUG_REPORT.md`, `ORIGINAL_REQUEST.md`,
  8 imagens sem uso e suas variantes web, 48 MB de screenshots de QA (para a Lixeira).
- CSS reescrito com tokens; estilos inline e `<style>` removidos das páginas;
  fonte Outfit e Impact de texto corrido removidas; favicon único.
- Home: navegação no topo, destaque com o título real do capítulo, cards com
  número da edição (sem o preço falso "R$ 5,90"), spin-offs em seção própria,
  grade de 6/3/2 colunas sem capa órfã.
- Celular: título do Degustador não estoura mais a tela; logo em uma linha;
  barra do leitor não cobre a primeira página e some ao rolar; páginas deitadas
  com botão **Ampliar**.
- Metadados de descrição e Open Graph em todas as páginas.

## Mini-game removido (23/09/2026)

O Flappy Enzo antigo (`js/game.js`, `js/game-core.js`, API `/api/leaderboard`,
testes e QA do jogo) foi removido para ser refeito do zero. As artes
continuam em `assets/flappy/` e em `E:\AI Workshop\Enzo Games\Floppy enzo`.
Os itens da auditoria acima que citam o jogo descrevem a versão removida.
