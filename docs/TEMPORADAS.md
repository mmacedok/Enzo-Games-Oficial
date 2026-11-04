# Temporadas (seasons)

Uma **temporada** é um lote de cartas, pacotes e decks que sai junto, com **patch notes** (as mudanças e as cartas novas).
Tudo mora em `TEMPORADAS`, em `js/baralho-dados.js`. Regras gerais para IAs: `docs/GUIA-IA-CARTAS.md`.

## O que uma temporada controla

| Campo | Para quê |
|---|---|
| `id`, `numero`, `nome` | `'s2'`, `2`, `'Temporada 2'`. O `id` nunca muda depois de lançar |
| `estado` | `'rascunho'` (escondida) · `'agendada'` (sai sozinha em `lancamento`) · `'no-ar'` (todo mundo vê) |
| `lancamento` | data ISO com fuso: `'2026-12-01T12:00:00-03:00'` (só vale para `agendada`) |
| `regras` | a `REGRAS_VERSAO` que a temporada exige (nunca maior que a do motor) |
| `cartas`, `pacotes`, `decks` | ids novos que entram com ela |
| `notas` | patch notes: `{ titulo, data, resumo, imagem, itens: [{ tipo, texto, carta? }] }` |

Enquanto a temporada está escondida, as cartas dela **não saem em pacote, não aparecem no álbum nem no deck builder, o pacote
não pode ser comprado nem aberto e o deck pronto some**. `carta(id)` continua achando qualquer carta (coleção e decks salvos).
A temporada `base` (cartas anteriores) é a primeira da lista e não lista cartas: ela fica com as que ninguém reivindicou.

## Passo a passo: criar a Temporada 2

1. Ponha as artes em `assets/Cartas/<id>.png` (PNG 4:5, sem moldura).
2. Em `TODAS_AS_CARTAS` (`js/baralho-dados.js`) acrescente as cartas com os próximos `numero`.
3. Em `COMBATE` e `TODOS_OS_DECKS` (`js/tcg-cartas.js`) acrescente números de combate e decks. Efeito novo: ver o guia, seção 2.
4. Em `TEMPORADAS`, copie o bloco da `s1`, mude `id`/`numero`/`nome`, **`estado: 'rascunho'`**, liste `cartas`, `pacotes`, `decks`.
5. Se mudou regra: suba `REGRAS_VERSAO` (`js/tcg-regras.js`), ponha o mesmo número em `regras:` e escreva `docs/BATALHA-CHANGELOG.md`.
6. Escreva as `notas` (um item por carta nova e por mudança). Imagem do patch notes em `assets/Temporadas/<id>.png` e `imagem:` com o caminho.
7. Teste: para ver a temporada escondida só para você, faça os dois: `ENZO_RASCUNHOS=1 npm start` (servidor) e `localStorage.setItem('enzoRascunhos','1')` no navegador (recarregue). Depois `node --test test/contrato-cartas.test.js` e `npm test`.
8. **Soltar:** mude `estado` para `'no-ar'` (ou `'agendada'` + `lancamento`) e faça o deploy. É a única linha que muda. Quem soltar é o Henrique.

## O que ainda não existe (próximas etapas)

- Tela de patch notes para o jogador (o dado já está em `TEMPORADAS[].notas`).
- Selo da temporada na carta e filtro por temporada no álbum.
- Lançamento sem deploy (por banco, como os capítulos em `api/lancamentos.js`): hoje o `agendada` é checado pelo relógio de quem
  carrega o arquivo, então depois de uma data marcada o servidor pode precisar de um novo deploy ou reinício para refletir.
