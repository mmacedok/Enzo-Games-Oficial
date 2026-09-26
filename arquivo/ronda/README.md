# Degustação Noturna (Ronda nos Telhados) — guardada

Jogo do Degustador que ficava no título de `degustador.html`. Foi substituído pela
Caçada ao Inominável (`js/cacada*.js`) e guardado aqui em 2026-09-26, sem mudanças.

Para voltar com ele:
1. Mova `ronda.js` e `ronda-core.js` de volta para `js/`, `test/ronda-core.test.js` para `test/`
   e os dois de `tools/` para `tools/`.
2. Recoloque `tetoRonda` e o jogo `'ronda-noturna'` em `api/anti-cheat.js` (estão no histórico do
   git, commit anterior à guarda) para o servidor voltar a aceitar os pontos.
3. Aponte a chave `ronda` de `JOGOS` em `js/main.js` para `js/ronda-core.js` e `js/ronda.js`
   (global `RondaDegustador`).

Os recordes antigos (`ronda-noturna`) continuam no banco e aparecem na Ficha com o nome do jogo.
Os sprites em `assets/ronda/` e os estilos `.ronda-botao` continuam em uso pela Caçada.
