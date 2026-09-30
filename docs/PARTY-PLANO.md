# Party Enzo — plano do protótipo

Party game estilo Mario Party dentro do site Enzo Games: **a TV é o host** (abre o site), **os celulares são só o controle** (entram por código ou QR e cada um vira um jogador).

Status: **plano para aprovação, nada implementado.** Decisões em aberto no fim.

---

## 1. Regra de ouro da latência

O celular nunca espera a TV para saber o que fazer. Tudo que depende de tempo é **medido e julgado no próprio celular**; a TV só recebe o **resultado** (e, nos jogos de toque, o progresso a 5 atualizações por segundo, só para animar).

| Quem | Faz |
|---|---|
| Celular | mostra a dica, mede a reação, conta os toques, julga acerto/erro, desenha, corta o bife |
| Servidor da sala | repassa mensagens, decide "começa em X" (horário combinado), confere limites plausíveis, soma pontos |
| TV | mostra cena, contagem regressiva, barras de progresso, revelação dos resultados, ranking |

Jogos que **não cabem** (precisam de menos de 50 ms): corrida com direção, pintar em tempo real seguindo o dedo dos outros.

### Começar juntos
1. Ao entrar, cada celular troca 5 pings com o servidor e guarda a **diferença de relógio** (mediana).
2. O servidor manda `{ inicio: T }` (horário do servidor, uns 3 s no futuro). Cada celular converte para o seu relógio e dispara a rodada nesse instante.
3. Diferença esperada entre aparelhos: menos de ~40 ms em Wi-Fi e ~100 ms em 4G, o bastante para jogos de reflexo e ritmo em que cada um é julgado contra o **próprio** início.

### Trapaça (festa entre amigos, mas com trava)
O servidor recusa o impossível: mais de 12 toques por segundo, reação abaixo de 100 ms (antes da luz = queimou a largada), resultados fora da janela da rodada, ou jogador respondendo duas vezes.

---

## 2. Tudo no site

Mesmo repositório, mesmo domínio, mesmo deploy de código. Sem login obrigatório (quem quiser usa a conta do site).

| Peça | Onde | O que é |
|---|---|---|
| Entrada | `party.html` | "Criar sala na TV" ou "Entrar com código" |
| Tela da TV | `party-tv.html` + `js/party/tv.js` | lobby com QR e código, cena de cada jogo, placar |
| Controle | `party-controle.html` + `js/party/controle.js` | nome, avatar, botões do minigame atual |
| Minigames | `js/party/jogos/<id>.js` | cada jogo tem as 3 metades juntas: **regras** (pontos, limites), **tv** (desenho) e **controle** (desenho e toque); no mesmo estilo UMD dos `js/*-dados.js` |
| Servidor da sala | `cloudflare/party/` (Worker com **Durable Object** `SalaParty`) | uma sala = um objeto com WebSocket; some sozinha depois de 2 h parada |
| Ligação com o site | o worker atual (`cloudflare/worker-src.mjs`) repassa `/api/party/ws/<código>` para o objeto | o navegador só conhece o domínio do site |

**Por que Durable Object:** o worker atual só responde pedido a pedido e não segura conexão aberta. Polling de uma partida (6 aparelhos × 1 pedido/s) gastaria ~3,6 mil requisições por partida de 10 min, e o plano grátis da Cloudflare tem 100 mil por dia. Com WebSocket "hibernante" a sala praticamente não gasta nada entre mensagens.

**Custo de manter tudo no site:** um passo a mais no deploy (`wrangler deploy` do worker da sala, separado do Pages) e uma variável de ligação (binding) no painel da Cloudflare. O código continua todo no mesmo repositório.

### Protocolo (mensagens JSON curtas)
- Celular → sala: `entrar {nome, avatar, chave?}`, `pronto`, `resultado {jogo, dados}`, `progresso {n}`, `ping`.
- Sala → todos: `lobby {jogadores}`, `rodada {jogo, semente, inicio, duracao}`, `placar {rodada, total}`, `fim`.
- Sala → TV: `progresso {jogador, n}` (máx 5 por segundo por jogador), `revelar {jogador, dados}`.
- **Semente:** o servidor manda uma semente por rodada; atrasos aleatórios e sequências saem dela, então todos os celulares geram o mesmo sem precisar de mensagem extra.
- **Reconexão:** cada jogador recebe uma chave guardada na aba; se o celular apagar a tela e voltar, retoma o mesmo lugar. A sala segura a vaga por 60 s.

### Celular
- Tela ligada: `navigator.wakeLock`.
- Som liberado pelo primeiro toque (regra do navegador).
- iPhone não vibra pelo navegador: o feedback tem que ser visual e sonoro.
- Fica em pé e na horizontal só onde o jogo pedir.

---

## 3. Formato de uma partida

- 2 a 8 jogadores (começa em 2 a 6 no protótipo).
- 5 rodadas, cada uma com: explicação de 5 s na TV + minigame de 10 a 30 s + revelação de 10 s.
- Pontos por rodada: 1º 10, 2º 7, 3º 5, 4º 3, demais 1. Partida inteira em ~6 a 8 minutos.
- Pódio no fim, com o vencedor em destaque.
- Nas próximas fases: tabuleiro entre as rodadas (dado no celular, peões na TV), créditos do Baralho para quem joga (com limite por dia), Enzos secretos como prêmio.

---

## 4. Minigames propostos

Todos no universo do site. Marcados por **como o celular julga** (nenhum depende da latência).

### A. Corte do Bife
- **Tema:** Macarronada do Enzo (um bife gigante).
- **Celular:** aparece o bife com formato irregular. Cada jogador arrasta o dedo **uma vez** para traçar o corte que divide a área em 50% / 50%. Tempo: 12 s para cortar.
- **Nota:** quão perto de 50% ficou cada lado (o celular calcula a área de cada metade; o servidor confere com a mesma forma, que vem da semente).
- **TV:** no fim, revela o corte de cada um, em sequência, com o "49 / 51", do menos preciso ao mais preciso.
- **Pontos:** ordem de precisão.

### B. Reflexo do Torado
- **Tema:** o Torado acorda quando a luz fica verde.
- **Celular:** tela vermelha "não toque...", tempo aleatório de 2 a 6 s (gerado pela semente), tela verde. Toque = reação em milissegundos. Tocar antes = "queimou a largada" (vale a pior reação).
- **Nota:** melhor de 3 tentativas.
- **TV:** mostra só os tempos no final.

### C. Sprint de Macarrão
- **Tema:** enrolar o espaguete.
- **Celular:** botão grande, 10 s de toques rápidos.
- **TV:** barras de progresso que crescem ao vivo (5 atualizações por segundo). O resultado vale o total contado no celular.
- **Trava:** máximo 12 toques por segundo.

### D. Parada do Relógio
- **Tema:** o Degustador conta os segundos.
- **Celular:** um cronômetro sobe de 0 a 3 s e **some**. O jogador toca quando acha que deu 5,00 s.
- **Nota:** diferença para 5,00 s. Tudo local, tempo medido no celular.
- **TV:** revela os tempos com a diferença ("4,87 — faltaram 0,13").

### E. Batida do Enzo (ritmo)
- **Tema:** 20 notas caindo em 4 colunas, no ritmo de uma música do jogo.
- **Celular:** o jogador toca nas colunas no compasso. Antes, uma tela curta de **calibração** desconta o atraso do áudio do aparelho.
- **Nota:** acertos com janela de tolerância (perfeito, bom, errou).
- **Observação:** é a mais cara de fazer (música, notas, calibração); ficaria para depois dos quatro primeiros.

### F. Desenhe o Inominável
- **Tema:** "desenhe o Inominável em 30 s" (prompt sorteado).
- **Celular:** tela de desenho.
- **TV:** galeria numerada, e depois todos votam no celular no melhor (não em si mesmo).
- **Moderação:** desenhos só aparecem na TV da sala, sem ficar salvos.

### G. Quiz da Saga
- **Tema:** perguntas sobre os gibis.
- **TV:** mostra a pergunta e 4 respostas. O celular mostra 4 botões coloridos.
- **Nota:** acerto, com bônus de rapidez medido no celular desde a hora em que a pergunta apareceu nele.

### H. Equilíbrio da Macarronada (inclinar o celular)
- **Celular:** inclinar o aparelho para manter uma bola no centro durante 15 s (giroscópio).
- **Nota:** tempo no centro. No iPhone exige um toque de permissão antes.
- **Risco:** a precisão do sensor varia entre aparelhos; bom candidato a teste depois.

---

## 5. Sugestão para o protótipo

Fase 0 (antes de qualquer jogo): **medir a latência real** com uma página de teste (celular ↔ servidor ↔ TV) em Wi-Fi e 4G.

Protótipo jogável: **A, B, C, D e F**, e depois o **G**:
- A, B, C e D mostram os quatro "jeitos" de julgar (toque único, reflexo, contagem, tempo estimado) com quase nenhuma arte.
- F dá a parte social, que é a que faz festa rir.
- E (ritmo) e H (inclinar) ficam para a segunda onda.

### Fases
| Fase | Entrega | Como saber que funcionou |
|---|---|---|
| 0 | Durable Object + WebSocket + página de ping | latência medida em 2 celulares reais (Wi-Fi e 4G) |
| 1 | Lobby: criar sala, QR, entrar, nome e avatar, reconexão | 4 celulares entram, um apaga a tela e volta |
| 2 | Motor de rodadas, pontos, pódio | partida vazia de 5 rodadas fecha sem travar |
| 3 | Minigames B e C, depois A e D | cada um testado com limites (toque falso, largada antes) |
| 4 | Desenhe o Inominável | desenho chega na TV e a votação fecha |
| 5 | Acabamento: sons, animações da TV, QR bonito, textos | aprovação do Henrique na sala de casa |

### Testes
- Testes automáticos da parte de regras (pontos, limites, sementes, pontuação de cada minigame) no `node:test`, como o resto do site.
- Robôs com vários "celulares" em paralelo e a TV: vão para o **Gemini** (Bridge), como nas outras tarefas.
- Teste real com celulares (inclusive iPhone) fica com o Henrique.

---

## 6. Riscos

| Risco | Como lidar |
|---|---|
| Durable Objects no plano grátis | confirmar o limite atual antes da fase 0; o uso por sala é pequeno, mas não zero |
| Wi-Fi da sala ruim | mostrar "sinal fraco" no celular e permitir reentrar sem perder pontos |
| Celular que dorme | wakeLock + reconexão automática |
| iPhone sem vibração | feedback visual e sonoro em tudo |
| Trapaça | limites no servidor; para festa basta |
| Desenhos impróprios | só ficam na TV da sala, não são gravados |
| Jogo de ritmo com áudio atrasado | tela de calibração (só na segunda onda) |

---

## 7. Decisões em aberto

1. **Durable Object** como servidor da sala (um passo de deploy a mais, o código continua no site): aprovado?
2. **Quais minigames entram no protótipo?** Sugestão: A, B, C, D, F (+ G depois).
3. **Sala:** 2 a 6 jogadores no protótipo (mais tarde 8)?
4. **Login:** só convidado com nome e avatar, ou já ligar à conta do site (créditos do Baralho)?
5. **Número de rodadas e pontuação** (5 rodadas; 10/7/5/3/1) e se haverá tabuleiro entre elas (fase futura).
6. Personagem de cada jogador: usar os personagens do site como avatares?
