# Ícones de gibi: emojis que viram arte

O site mostra um emoji até a arte existir. Para trocar: salve o PNG com o **nome
exato** da tabela em `assets/ui/` e rode `npm run build` (vira WebP sozinho). O
código (`window.siteIcon` em `js/site.js`) passa a usar a imagem na hora; não
precisa mexer em mais nada.

## Padrão das artes

- PNG quadrado **512×512**, **fundo transparente**, desenho centralizado com ~8% de margem.
- Estilo **gibi retrô** (anos 80/90): contorno preto grosso de nanquim, cores
  chapadas, sombra com **retícula de pontinhos**, um brilho branco de "reflexo".
- **Sem texto** dentro do ícone (aparece pequeno: 34–60 px). Silhueta forte, que
  se reconheça pequena.
- Paleta do site: laranja `#f58220` / `#ff9900`, amarelo recordatório `#ffe14d`,
  papel `#fff5d1`, nanquim `#111`, vermelho `#d32f2f`, roxo Degustador `#8a2be2`.

## Gerar como imagem

| Arquivo (`assets/ui/`) | Onde aparece | Emoji hoje | O que desenhar |
|---|---|---|---|
| `chave.png` | Botão **Entrar** (medalhão) | 🔑 | Chave antiga dourada, cabeça da chave em formato de pata de gato |
| `trofeu.png` | Ranking global (ficha, jogos, placar) | 🏆 | Taça dourada com um garfo enrolado de macarrão saindo do topo |
| `medalha-1.png` | 1º lugar no placar | 🥇 | Medalha de ouro com fita laranja, estrela no meio |
| `medalha-2.png` | 2º lugar no placar | 🥈 | Mesma medalha em prata, fita laranja |
| `medalha-3.png` | 3º lugar no placar | 🥉 | Mesma medalha em bronze, fita laranja |
| `conquista-leitor-da-saga.png` | Conquista **Leitor da Saga** | 📚 | Pilha de 7 gibis, o de cima aberto com orelhas do Enzo aparecendo |
| `conquista-vigilia-completa.png` | Conquista **Vigília Completa** | 🦇 | Silhueta do Degustador da Noite (gorro de Teemo, capa) na frente da lua cheia, tons roxos |
| `conquista-heroi-de-operator-village.png` | Conquista **Herói de Operator Village** (Superkid) | 🦸 | Escudo de herói com a silhueta do Superkid e a placa "Operator Village" |
| `conquista-olho-do-torado.png` | Conquista **No Olho do Torado** | 🌪️ | Redemoinho de vento em espiral com um gibi girando no meio |
| `conquista-macarronada.png` | Conquista **Caçador de Macarronada** | 🍝 | Tigela de macarronada com almôndegas e uma auréola dourada em cima |
| `conquista-acesso-confidencial.png` | Conquista **Acesso Confidencial** (Cabo Côco) | 🥥 | Coco com uma tarja preta de censura e um carimbo vermelho |
| `cadeado.png` | Conquista ainda bloqueada | 🔒 | Cadeado de ferro fechado, pesado, com um "?" riscado de giz |
| `enzo-secreto.png` | Figurinha colada no álbum e aviso "achou 1 de 99" | 🐱 | Cabeça do Enzo espiando de trás de uma borda de quadro, piscando um olho |
| `marcador.png` | Aviso "Continuando de onde parou" | 📖 | Marcador de página de tecido laranja com a pata do Enzo |

## Continua emoji (não precisa gerar)

| Emoji | Onde | Por quê |
|---|---|---|
| ⚠️ | Aviso raro "não deu para salvar agora" | Erro; quanto mais neutro, melhor |
| 🔑 e 🏆 dentro de frases | Mensagens de texto no topo dos jogos ("Entre com Google (🔑 Entrar…)", "🏆 3º lugar no ranking") | Estão no meio do texto; imagem ali atrapalha a leitura |

## Não são emoji (já desenhados em CSS)

Explosões "PSST!", "CONQUISTA!", "PARABÉNS!", números dos recordes, balões de
fala, recordatórios amarelos, moldura de tela cheia, "−" / "+" do zoom e o
botão "×" de fechar. A cabeça do Enzo (voltar para a coleção) usa
`assets/enzo-cabeca-logo.png`, que já existe.
