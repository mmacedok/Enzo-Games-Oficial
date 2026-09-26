# Mudar o site do Netlify para a Cloudflare Pages: estudo

> Escrito em 2026-09-26, depois que a cota grátis do Netlify (300 créditos) acabou.
> Nada foi mudado na produção: o protótipo vive só no branch `claude/project-thread-w3fqm9`.

## Resumo
**Recomendo mudar.** Na Cloudflare grátis as páginas e imagens não têm limite de tráfego, os
deploys não custam nada (500 builds por mês) e a API cabe em 100 mil chamadas **por dia**. A
mudança é pequena: a API (`api/`) roda igual, só troca a "casca" da Function e o jeito de conferir
o login do Google. Testei no motor local da Cloudflare (workerd): login, recordes, ranking,
progresso e leitores funcionaram.

## 1. Por que a cota do Netlify acabou (inferido, não medido)
No plano grátis por créditos do Netlify, **cada deploy de produção custa 15 créditos** e cada GB de
tráfego custa 20. O `main` teve 49 commits entre 23 e 25/09; umas 20 publicações já dão os 300
créditos. O tráfego das imagens também conta (o site serve versões .webp menores, mas cada
leitura de capítulo ainda baixa vários MB). O banco (Netlify Database) também gasta créditos de computação.
Quando a cota acaba, o Netlify para **tudo que é medido**: deploy novo e, provavelmente, a API
(login, ranking). Vale conferir no painel se o login está funcionando agora.

## 2. Limites grátis que importam (docs oficiais, 2026-09-26)
| | Netlify grátis | Cloudflare grátis |
|---|---|---|
| Deploy | 15 créditos cada (de 300/mês) | 500 builds/mês, sem custo |
| Tráfego de páginas e imagens | 20 créditos por GB | **ilimitado e grátis** |
| API (Functions) | créditos por requisição e por tempo | **100 mil requisições por dia** (zera 21h de Brasília) |
| Tempo de CPU por chamada | não é o limite | **10 ms** (esperar o banco não conta) |
| Arquivos do site | | até 20.000, máx. 25 MB cada (o site tem 537, o maior 10 MB) |
| Banco | Netlify Database (gasta créditos) | não tem Postgres; usamos **Neon grátis** direto |
| Quando estoura | site congela até o mês virar | só a API recusa até o dia virar; páginas continuam |

Neon grátis (conta própria): 100 horas de computação/mês, 0,5 GB de dados, 5 GB de tráfego, dorme
após 5 min parado. Sobra muito para o site.

## 3. O que muda no código (já feito no branch)
| Arquivo | O que faz |
|---|---|
| `cloudflare/worker-src.mjs` | a "casca" da API na Cloudflare (igual ao `netlify/functions-src/api.mjs`) |
| `cloudflare/google-id-token.mjs` | confere o login do Google com `jose` em vez de `google-auth-library`, que não roda na Cloudflare |
| `tools/build-cloudflare.mjs` | empacota tudo em `dist/_worker.js`, e escreve `_routes.json` (só `/api/*` usa a cota) e `_headers` (mesmo cache do `netlify.toml`) |
| `wrangler.toml` | liga o modo Node (`nodejs_compat`) e diz que a saída é `dist/` |
| `package.json` | `npm run build:cloudflare` e a dependência `jose` |
| `test/cloudflare.test.js` | testes do verificador do Google |

`api/` não mudou nada: o driver do Neon (`@neondatabase/serverless`, por HTTP) já é o certo para a
Cloudflare. O `netlify.toml` e o build do Netlify continuam funcionando, então dá para voltar atrás.

## 4. Passo a passo da mudança
Coisas que só o Henrique pode fazer estão marcadas com **(H)**.
1. **(H)** Criar conta grátis na Cloudflare e no Neon (planos grátis).
2. **Copiar o banco**: pegar a senha do Netlify Database (`netlify database status --show-credentials`),
   fazer `pg_dump` dele e `pg_restore` num projeto novo do Neon. **(H)** precisa rodar ou passar as
   senhas por um lugar seguro (nunca no chat).
3. **(H)** Na Cloudflare: Workers & Pages → criar Pages ligado ao GitHub, branch `main`, build
   `npm run build:cloudflare`, pasta `dist`. Variáveis: `DATABASE_URL` (Neon), `GOOGLE_CLIENT_ID`,
   `SESSION_SECRET` (a mesma do Netlify, para ninguém perder a sessão no banco), `ADMIN_EMAILS`.
4. **Importante**: em *Preview deployments*, escolher **nenhum branch** (ou só `main`). Senão a
   Cloudflare publica um link público para cada branch, **inclusive o `TCG` com o Baralho**.
5. **(H)** No Google Cloud (login): adicionar `https://enzo-games.pages.dev` em *Origens JavaScript
   autorizadas*.
6. Testar tudo no endereço `*.pages.dev` (login, recordes, leitor, admin, comentários).
7. Quando a cota do Netlify virar: um último deploy lá só com redirecionamento
   (`/* https://enzo-games.pages.dev/:splat 301`) e desligar o deploy automático do Netlify.

## 5. Riscos
- **Endereço novo**: sai `enzo-games.netlify.app`, entra `enzo-games.pages.dev` (se o nome estiver
  livre). O redirecionamento do passo 7 resolve links antigos. **O progresso de quem joga sem login
  fica no navegador e não passa para o endereço novo**; quem tem login não perde nada. Um domínio
  próprio (ex. `enzogames.com.br`, uns R$ 40 por ano) evita isso em qualquer mudança futura.
- **10 ms de CPU**: a API de hoje gasta pouco (espera o banco, e isso não conta). No teste local cada
  chamada levou 3 a 36 ms no total, a maior parte esperando o banco. Precisa medir no ar.
- **Pages ou Workers**: a Cloudflare tem recomendado Workers com arquivos estáticos para
  projetos novos. O código do branch serve para os dois; se preferir, a troca é só de configuração.
- **Copiar o banco** é o passo mais delicado; fazer com o site parado para escrita por uns minutos
  ou aceitar perder o que for escrito durante a cópia.
- **O que não testei**: o deploy de verdade na Cloudflare e o Neon de verdade (usei um Neon falso
  local com o mesmo protocolo). O login foi testado com chaves falsas no lugar das do Google.

## 6. E o multiplayer da Batalha dos Torados?
Cabe, e fica melhor que no Netlify:
- **O plano atual (polling, `PLANO-MULTIPLAYER.md` no branch TCG) funciona sem mudar nada**: ~300
  chamadas por partida contra 100 mil por dia dá umas 300 partidas por dia, sem risco de congelar o
  site (se estourar, só a API para até o dia virar, e as páginas continuam).
- **Tempo real grátis**: a Cloudflare grátis tem **Durable Objects** (100 mil requisições por dia,
  com WebSocket). Dá para trocar o "teve jogada?" a cada 2,5 s por aviso na hora, gastando bem menos
  requisições. Isso seria uma fase depois, não precisa agora.
- Ponto de atenção: o motor (`js/tcg-regras.js`) aplicando uma jogada tem que caber nos 10 ms de CPU.
  Medir na fase M1 do plano.

## Fontes (consultadas em 2026-09-26)
- [Cloudflare Pages, limites](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers, limites](https://developers.cloudflare.com/workers/platform/limits/) e [preços](https://developers.cloudflare.com/workers/platform/pricing/)
- [Netlify, planos por créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify Database, cobrança](https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/) e [exportar dados](https://docs.netlify.com/build/data-and-storage/netlify-database/switch-to-netlify-database/)
- [Neon, planos](https://neon.com/docs/introduction/plans)
