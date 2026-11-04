# Guia para IAs e pessoas: mexer nas cartas, nos efeitos e nas regras

> **Leia isto inteiro antes de editar `js/baralho-dados.js`, `js/tcg-cartas.js`, `js/tcg-regras.js`, `js/batalha.js`
> ou qualquer arquivo de carta.** É curto de propósito. Aqui estão os erros que já aconteceram e como não repetir.
> Escrito em português porque o projeto, os textos do jogo e os comentários são em português.

## 0. Antes de dizer "terminei"

```bash
node --test test/contrato-cartas.test.js     # o contrato: barra os erros abaixo (rode SEMPRE)
node --test test/tcg-regras.test.js          # regras e cartas
npm test                                     # tudo, antes de pedir merge
```

Se o contrato falhar, a mensagem diz o que consertar. **Não apague, não pule e não afrouxe um teste para ele passar:**
conserte o dado ou o código. Nunca escreva no teste um número fixo que muda quando entra carta (já aconteceu: `total 24`).

## 1. O mapa (onde cada coisa mora)

| O que | Onde | Observação |
|---|---|---|
| Carta: nome, raridade, tipo, arte, frase, texto | `js/baralho-dados.js` → `TODAS_AS_CARTAS` | `numero` é o próximo da fila; **o `id` nunca muda nem se reaproveita** |
| Pacotes, preços, chances | `js/baralho-dados.js` → `TODOS_OS_PACOTES` | `chances` somam 100 |
| Temporadas (lotes lançados juntos) | `js/baralho-dados.js` → `TEMPORADAS` | passo a passo em `docs/TEMPORADAS.md` |
| Números de combate (vida, ataques, efeitos) | `js/tcg-cartas.js` → `COMBATE` | mesmo `id` da carta |
| Decks prontos | `js/tcg-cartas.js` → `TODOS_OS_DECKS` | liste o deck na temporada (`decks`) |
| Regras e o que cada efeito faz | `js/tcg-regras.js` → `EFEITOS`, `BONUS_DANO`, `TIPOS`, `ficha()` | o motor é o mesmo no navegador e no servidor |
| A tela da Batalha | `js/batalha.js`, `css/batalha.css` | |
| Arte da carta | `assets/Cartas/<id>.png` | PNG vertical 4:5 (1122×1402), **sem moldura e sem texto** |
| Moldura | CSS, pela raridade (`.carta-tcg--raro` etc. em `css/style.css`) | **não se gera imagem de moldura**; loja, álbum e Batalha usam a mesma função |
| Histórico de regras | `docs/BATALHA-CHANGELOG.md` | uma entrada por `REGRAS_VERSAO` |

## 2. Uma mecânica nova precisa de QUATRO peças (faltar uma é o erro mais comum)

1. **Dado** em `COMBATE` (`js/tcg-cartas.js`): descreve a carta com `efeitos`, `aoEntrar`, `poder`, `campo` ou `anexo`.
2. **Código** do motor em `js/tcg-regras.js`: toda palavra `tipo: 'xyz'` escrita nos dados precisa existir como `xyz(...)` em `EFEITOS`
   (ou em `BONUS_DANO`). Sem isso a carta entra no jogo e **não faz nada, sem avisar**.
3. **Tela** em `js/batalha.js`: se o motor aceita uma jogada nova (um `case 'xyz'` em `motivoInvalida` e em `aplicar`), o jogador
   precisa de um botão ou gesto que envie `{ tipo: 'xyz', ... }`. Também ponha a jogada em `jogadasValidas` (os robôs usam).
4. **Teste** em `test/tcg-regras.test.js`: monte uma `mesa({...})`, jogue, confira o resultado.

Se o efeito precisa de uma **escolha do jogador** (qual carta descartar, qual alvo), a escolha vai dentro da jogada
(exemplo: `descartes` em `anexar`) e o motor **valida** a escolha. Quem não escolhe (robô) cai num padrão fixo. Ver "Hoje é quarta-feira".

## 3. Regras de ouro do motor (`js/tcg-regras.js`)

- **Determinismo.** Nada de `Math.random()`, `Date.now()` ou ordem de objeto dentro do motor. Sorteio usa o gerador do
  estado (`estado.rng`, via `moeda()`/`embaralhar()`); a mesma partida tem de repetir igualzinha (o servidor reexecuta).
- **O estado vai para o banco como JSON.** Nada de `Set`, `Map`, função, `undefined` ou referência circular em `estado`.
- **Campo novo numa carta em jogo** (`inst.alguma_coisa`)? Acrescente em `limparExtrasInstancia()`, senão ele "vaza"
  quando a carta volta para a mão, o baralho ou o descarte.
- **Escala.** Vida e dano nos dados ficam na escala pequena; o motor multiplica por `ESCALA`. O texto da carta
  (`tcg:`) é na escala grande, a que o jogador vê (1.200 de dano = `dano: 60` com `ESCALA` 20). Confira a conta.
- **Mudou uma regra ou o efeito de uma carta que já existia?** Suba `REGRAS_VERSAO` (uma vez por lote) e escreva em
  `docs/BATALHA-CHANGELOG.md`. Partida online de versão antiga é encerrada sem resultado: é de propósito.
- **Efeito que mexe em vida, Aura ou carta de alguém** precisa respeitar o que já existe: `superkidProtegido`,
  `imuneBanco`, `imuneEstados`, `campoTravado`, `protegeBanco`. Procure por esses nomes antes de escrever um efeito de dano em área.
- Termine o efeito com `verificarNocautes(estado, eventos)` quando ele puder derrubar alguém.

## 4. Arte e carta (o que já deu errado)

- A arte tem de **estar no repositório** em `assets/Cartas/<id>.png` antes de a carta entrar. O contrato confere.
- `visual.arte` (aparência de uma carta que se transforma) é **um id de carta ou o caminho completo** (`assets/Cartas/x.png`).
  Id inventado vira imagem quebrada.
- Arte nova pesa ~4 MB. As versões `.webp` leves e `data/images.json` são **geradas no deploy** (`npm run build:deploy`): não precisa incluir `assets/web/`, `data/images.json` nem `js/images.generated.js` na sua PR (deixe o Henrique gerar).
- **Não mude `id`, `numero` ou raridade de carta já lançada**: coleções, decks e placar guardam isso.

## 5. Temporadas (resumo; o passo a passo está em `docs/TEMPORADAS.md`)

- Carta, pacote e deck novos entram **dentro de uma temporada** (`TEMPORADAS`, campos `cartas`, `pacotes`, `decks`).
- `estado: 'rascunho'` esconde tudo da temporada (sorteio, loja, álbum, deck builder). Mude para `'no-ar'` (ou `'agendada'` com
  `lancamento`) só quando o Henrique mandar soltar.
- Para ver rascunho no seu computador faça **os dois** (servidor e navegador leem separado): `ENZO_RASCUNHOS=1 npm start` e, no navegador, `localStorage.setItem('enzoRascunhos','1')` e recarregue. Nunca deixe isso ligado no site no ar.
- Um deck pronto só pode usar cartas da própria temporada ou de anteriores. O contrato confere.

## 6. Escopo do seu trabalho (o que NÃO fazer)

- **Só cartas, efeitos, regras e o que for preciso para eles funcionarem na tela.** Não misture na mesma PR: mudança de layout,
  `server.js`, login, atalhos do admin, reescrita de docs de planejamento. Se precisar mexer em algo assim para **testar no seu
  computador** (ex.: `dotfiles: 'allow'` no `server.js` porque a sua pasta tem um ponto no caminho), **não faça commit disso**.
- Não reescreva `docs/PLANO-*.md`, `docs/PENDENCIAS.md` nem `docs/CARTAS-IDEIAS.md` por conta própria: são do Henrique.
- Mudou `api/` ou `js/*-dados.js`? Reinicie o servidor local (`npm run serve`).
- Mudou um `.js` que o HTML carrega? Troque o `?v=` desse script nos `.html` (o navegador guarda cache).
- Commit com `git commit -- <arquivos>` (a pasta `animacao/` é de outra conversa). **Nunca dê push no `main`**; só o Henrique libera.
- Textos do jogo, mensagens de erro e comentários: português. Sem emoji na interface.
- Em dúvida entre dois jeitos, escolha o mais simples e deixe uma linha de comentário dizendo o porquê.

## 7. Checklist de carta nova (copie para a PR)

- [ ] `TODAS_AS_CARTAS`: id novo, `numero` seguinte, raridade, `frase`, `tcg` (na escala grande), `arte`, `foco`
- [ ] `assets/Cartas/<id>.png` no lugar
- [ ] `COMBATE`: hp/recuo/ataques/poder (ou `campo`/`anexo`) e os `efeitos`
- [ ] Todo `tipo` de efeito usado existe em `EFEITOS`/`BONUS_DANO`; se for novo, escrevi o código
- [ ] Se há jogada ou escolha nova: botão em `js/batalha.js` e linha em `jogadasValidas`
- [ ] Na temporada certa (`cartas`), e em pacote/deck só se a temporada deles já tem a carta
- [ ] Teste em `test/tcg-regras.test.js`
- [ ] `REGRAS_VERSAO` subida e entrada no `docs/BATALHA-CHANGELOG.md` (se mudou regra ou carta existente)
- [ ] `node --test test/contrato-cartas.test.js` e `npm test` passando
- [ ] Nota na temporada (`notas.itens`) para o patch notes
