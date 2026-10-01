# Italo's Surfer — Operator Village

Primeiro mapa jogável: uma metrópole industrial com trilhos, fábricas, contêineres, tanques e passarelas. Italolol foge de Enzo Games furioso, que se aproxima a cada impacto. A terceira colisão encerra a corrida. A velocidade aumenta gradualmente; todas as fileiras preservam uma pista livre.

## Rodar e publicar

- `npm ci`, `npm run build`, `npm run serve`.
- Abrir `/italos-surfer.html`; também há um cartão na grade de jogos da home.
- A publicação existente do site inclui automaticamente a página, os módulos e todos os assets através de `tools/dist.js`. Não depende de CDN, Vite ou serviço externo para jogar.
- `npm run build:surfer` reexporta os modelos e os sons, a partir das mesmas fábricas usadas pelo renderer.
- `npm run test:surfer`: colisões contínuas, pulo, deslize, padrões, poderes, pausa/reset, exportações e áudio.

## Controles

Setas ou WASD: trocar de pista, pular e deslizar. Espaço também pula. P/Esc pausam. Em telas pequenas e dispositivos de toque, há botões e gestos de deslizar sobre o cenário. A troca de aba pausa automaticamente. Som pode ser desligado e essa escolha persiste junto com o recorde.

## Assets

`assets/italos-surfer/manifest.json` lista 15 modelos 3D, 7 sons e a capa. Personagens exportados como JSON compatível com `THREE.ObjectLoader`, com clipes de correr, pular, deslizar e tropeçar. O jogo anima as articulações dessas mesmas fábricas em tempo real. Sons WAV ficam disponíveis para reutilização; o jogo sintetiza os efeitos e a trilha com Web Audio.

Os personagens seguem as fichas visuais atuais de Italolol e Enzo Games. O cabelo preto e rosa, as manchas e a corrente de Italolol seguem a ficha visual, que é mais recente que o texto do guia. Adaptação 3D estilizada com contornos, materiais chapados e cores do gibi. A capa foi gerada a partir das duas fichas, inspecionada e salva no projeto; a versão WebP está no catálogo de jogos.

## Escopo da primeira versão

Corrida infinita de três pistas, barreiras para pular, canos para deslizar, trens para desviar, macarronadas coletáveis, escudo de aura, ímã, perseguição animada, menu, instruções, pausa, reinício e recorde local. O recorde fica neste navegador; este jogo ainda não envia partidas ao ranking global do site. Não há loja, outros mapas, rampas para subir em trens ou sistema de skins nesta versão.

`?qa` abre botões de cenários determinísticos e leitura do estado. Isso não aparece na navegação normal. As geometrias do cenário são agrupadas por material; obstáculos e partículas são reutilizados para manter o uso de memória estável.

## Verificação

- Suíte do site: 322 aprovados, 4 pulados, 0 falhas (após gerar o catálogo).
- Runner: 22 testes aprovados, incluindo 2.000 fileiras sem pistas duplicadas, carregamento real dos modelos exportados e cabeçalhos PCM.
- Build do site: concluído; catálogo com 12 gibis, 114 páginas e 2 easter eggs.
- Verificação visual no navegador: menu, modelos 3D, corrida, perseguição, coleta e pausa; layout em tela de celular. Não substitui testes em aparelhos físicos.
