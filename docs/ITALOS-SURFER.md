# Italo's Surfer — Operator Village

Primeiro mapa jogável: uma metrópole industrial com trilhos, fábricas, contêineres, tanques e passarelas. Italolol foge de Enzo Games furioso, que se aproxima a cada impacto. A terceira colisão encerra a corrida. A velocidade aumenta gradualmente; todas as fileiras preservam uma pista livre.

## Rodar e publicar

- `npm ci`, `npm run build`, `npm run serve`.
- Abrir `/italos-surfer.html`; também há um cartão na grade de jogos da home.
- A publicação existente do site inclui automaticamente a página, os módulos e todos os assets através de `tools/dist.js`. Não depende de CDN, Vite ou serviço externo para jogar.
- `npm run build:surfer` reexporta os modelos e os sons, a partir das mesmas fábricas usadas pelo renderer.
- `npm run test:surfer`: colisões contínuas, pulo, deslize, padrões, poderes, pausa/reset, exportações e áudio.

## Controles

Setas ou WASD: trocar de pista, pular e deslizar. Espaço também pula. P/Esc pausam. B ou duplo toque na pista ativa a prancha; há um botão dedicado. Em telas pequenas e dispositivos de toque, há botões e gestos que respondem assim que ultrapassam o limiar, sem esperar o dedo soltar. A troca de aba pausa automaticamente. Som, recorde, total de macarronadas e corridas ficam salvos neste navegador. O menu oferece treino guiado dos cinco comandos.

O salto usa gravidade e velocidade vertical, alcança aproximadamente 2,2 metros e aceita troca de pista no ar. Pular cancela o deslize; baixo no ar acelera a descida e inicia o rolamento. Um comando pouco antes do pouso fica armazenado por 180 ms. As colisões, rampas, tetos e coleta usam altura real; o personagem não volta visualmente ao chão ao pausar no ar.

## Assets

`assets/italos-surfer/manifest.json` lista 22 modelos 3D, 7 sons e a capa. Inclui prancha, jetpack, supertênis, bônus de pontos, vagão longo, rampa e guindaste. Personagens exportados como JSON compatível com `THREE.ObjectLoader`, com clipes de correr, pular, deslizar e tropeçar. O jogo anima as articulações dessas mesmas fábricas em tempo real. Sons WAV ficam disponíveis para reutilização; o jogo sintetiza os efeitos e a trilha com Web Audio.

Os personagens seguem as fichas visuais atuais de Italolol e Enzo Games. O cabelo preto e rosa, as manchas e a corrente de Italolol seguem a ficha visual, que é mais recente que o texto do guia. Adaptação 3D estilizada com contornos, materiais chapados e cores do gibi. A capa foi gerada a partir das duas fichas, inspecionada e salva no projeto; a versão WebP está no catálogo de jogos.

## Mecânicas da versão 2

Corrida infinita de três pistas com barreiras, tubulações, trens parados e em movimento. Rampas amarelas dão acesso aos tetos; é possível correr, saltar e coletar macarronadas sobre eles. Cada fileira mantém uma pista livre. A aproximação e a quantidade de obstáculos ficam mais exigentes com o tempo.

- Duas pranchas por corrida, cada uma com 25 segundos de duração e proteção contra um impacto.
- Ímã de macarronada, supertênis, escudo de aura e pontuação de distância em dobro: 12 segundos cada.
- Jetpack: 9 segundos de voo com atração de comida e proteção na aterrissagem.
- Três missões por corrida: 500 metros, 40 macarronadas e 12 saltos. Cada uma entrega 500 pontos, uma prancha e +1 no multiplicador da corrida.
- Sequências de coleta, bônus ao superar obstáculos, barras de duração de poderes, sombra de contato, poses de salto/prancha, reação de aterrissagem e câmera que acompanha a altura.

O recorde fica neste navegador; este jogo ainda não envia partidas ao ranking global do site. Não há loja, outros mapas ou sistema de skins nesta versão.

`?qa` abre cenários determinísticos, incluindo rampa, prancha e os cinco poderes, e leitura do estado a cada 50 ms. Isso não aparece na navegação normal. Cenários de QA não gravam recordes. As geometrias do cenário, obstáculos e coletáveis são agrupadas por material; objetos e partículas são reutilizados para manter o uso de memória estável. Nenhum asset remoto é necessário.

## Verificação

- `npm test` inclui agora os testes `.mjs` do jogo: 347 aprovados, 4 pulados, 0 falhas.
- Runner: 25 testes, incluindo salto em diferentes velocidades, cancelamento de deslize, buffer, descida rápida, rampas/tetos, prancha, voo e aterrissagem, coleta vertical, cinco poderes, missões e três minutos de simulação com contagem limitada de objetos.
- Modelos exportados são carregados com `THREE.ObjectLoader`; sons passam pela verificação PCM.
- Navegador: salto por espaço e por gesto vertical sobre barreira sem dano; rampa até altura 2,65 com coleta no teto; prancha por B absorvendo impacto; coleta de jetpack; treino completo pelo teclado; tela de computador e celular. Não substitui testes em aparelhos físicos.
