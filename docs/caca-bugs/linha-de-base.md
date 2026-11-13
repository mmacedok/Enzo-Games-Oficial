# Linha de base — `npm test`

- **Data/hora**: 2026-11-13 19:26 (UTC-3)
- **Branch / worktree**: `caca-bugs` (`693069a`, em `D:\AI Workshop\Jogos\Enzo Games\caca-bugs`)
- **Node / npm**: `v26.12.1` / `11.20.0`
- **Comando**: `npm ci` (concluído com 145 pacotes instalados) seguido de `npm test` (`node --test "test/*.test.js" "test/*.test.mjs"`)

## Resumo

| Métrica | Valor |
|---|---|
| Total (`tests`) | 393 |
| Passaram (`pass`) | 375 |
| Falharam (`fail`) | 14 |
| Pulados (`skipped`) | 4 (`CACADA_BLOQUEIOS=1` em `test/cacada-robo.test.js`) |
| Cancelados | 0 |
| Duração | 59.31 s |

## Testes que já falhavam na linha de base (14)

1. `test/cabo-coco-mask.test.js:14` — **máscara gerada existe e é um PNG válido**: `assets/Personagens/cabo-coco.png precisa existir (rode npm run build)`
2. `test/cabo-coco-mask.test.js:20` — **máscara tem pixels transparentes (não é cópia opaca do original)**: `ENOENT: assets/Personagens/cabo-coco.png`
3. `test/cabo-coco-mask.test.js:25` — **máscara é RGBA e tem fundo removido (bordas com transparência)**: `ENOENT: assets/Personagens/cabo-coco.png`
4. `test/catalog.test.js:17` — **database.json e manifest existem e são JSON válido**: `rode npm run build para gerar data/database.json`
5. `test/catalog.test.js:23` — **todo gibi tem id, título e pelo menos um capítulo com páginas**: `ENOENT: data/database.json`
6. `test/catalog.test.js:34` — **toda capa e página citada no catálogo existe no disco**: `ENOENT: data/database.json`
7. `test/catalog.test.js:46` — **todo easter egg com imagem existe no disco**: `ENOENT: data/database.json`
8. `test/catalog.test.js:53` — **censura aponta para gibis e páginas que existem**: `ENOENT: data/database.json`
9. `test/catalog.test.js:68` — **o spin-off Degustador da Noite continua no catálogo (não pode sumir no build)**: `ENOENT: data/database.json`
10. `test/catalog.test.js:74` — **toda página de gibi é uma imagem com extensão conhecida**: `ENOENT: data/database.json`
11. `test/comentarios.test.js:11` — **erro ao carregar o arquivo**: `Cannot find module '../data/database.json'`
12. `test/conquistas.test.js:72` — **5. integridade da LISTA de conquistas com o catálogo real**: `Cannot find module '../data/database.json'`
13. `test/musicas.test.js:11` — **erro ao carregar o arquivo**: `ENOENT: data/database.json`
14. `test/pipeline.test.js:35` — **variantes web têm dimensões, arquivos e orçamento adequado para capas e fichas**: `AssertionError: capas: 5236360` (linha 48)
