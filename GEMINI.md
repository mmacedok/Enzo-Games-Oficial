# Instruções para IAs (Codex, Gemini, Claude e outras)

Este é o site do Enzo Games, com o Baralho Enzo e a Batalha dos Torados (jogo de cartas).

**Antes de mexer em cartas, efeitos, regras, pacotes, decks ou temporadas, leia `docs/GUIA-IA-CARTAS.md` inteiro** (é curto).
Temporadas: `docs/TEMPORADAS.md`. Regras do repositório: `CLAUDE.md`.

Resumo do que mais dá erro:

1. Carta nova precisa de **quatro peças**: dado (`js/tcg-cartas.js`), código do efeito (`EFEITOS` em `js/tcg-regras.js`), botão na tela
   (`js/batalha.js`) e teste. Faltando uma, a carta entra no jogo e não faz nada.
2. A arte tem de estar em `assets/Cartas/<id>.png` antes de a carta entrar. Moldura é CSS pela raridade: não se gera imagem.
3. Cartas novas entram dentro de uma **temporada** (`TEMPORADAS` em `js/baralho-dados.js`); `estado: 'rascunho'` esconde tudo.
4. Mudou regra ou carta existente: suba `REGRAS_VERSAO` e escreva em `docs/BATALHA-CHANGELOG.md`.
5. **Rode `node --test test/contrato-cartas.test.js` e `npm test` antes de dizer que terminou.** Não afrouxe teste para passar.
6. Fique no escopo (cartas, efeitos, regras). Não commite ajustes feitos só para testar no seu computador (ex.: `server.js`).
7. Nunca faça push no `main`. Quem libera é o Henrique.
