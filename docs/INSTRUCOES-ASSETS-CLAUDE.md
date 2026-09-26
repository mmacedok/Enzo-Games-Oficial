# Instruções para o Claude: pôr as imagens da Batalha dos Torados no branch

> **Fica só no branch `TCG`** (ver `CLAUDE.md`). Este arquivo é para colar (ou apontar) para um
> Claude quando o Henrique tiver imagens novas da batalha. O que cada imagem deve mostrar está em
> `docs/BATALHA-ASSETS.md`; aqui é só **onde pôr e como enviar**.

## Pedido para colar no Claude
```
Tenho imagens novas da Batalha dos Torados. Siga docs/INSTRUCOES-ASSETS-CLAUDE.md do branch TCG
do repositório mmacedok/Enzo-Games-Oficial: coloque cada imagem com o nome certo em assets/Batalha/,
rode o build, confira na tela da batalha, faça o commit e o push no TCG e me diga o que entrou.
As imagens são: <anexe as imagens ou diga a pasta onde elas estão>
```

---

## 1. Branch certo (nunca o `main`)
- **Na nuvem:** trabalhe no branch `TCG`: `git fetch origin TCG && git checkout TCG && git pull origin TCG`.
- **No computador do Henrique:** é a pasta `comic-reader`, branch local `baralho` (acompanha o
  `origin/TCG`): `git checkout baralho && git pull`.
- Confira com `git branch --show-current`. Se aparecer `main`, **pare**: o Baralho nunca vai para o `main`.
- Não mexa na pasta `animacao/`.

## 2. Descobrir qual imagem é qual
Os arquivos do Henrique podem vir com qualquer nome (ex. `ChatGPT Image 26 set.png`). **Abra cada
imagem e olhe** para decidir o nome certo pela tabela abaixo. Se não der para ter certeza (por
exemplo, duas mesas parecidas), pergunte antes de salvar.

| Nome final em `assets/Batalha/` | O que é | Formato esperado |
|---|---|---|
| `mesa.png` | Mesa padrão: feltro verde de jogo com macarronada | quadrada, ~1536×1536 |
| `mesa-piscina-de-macarronada.png` | Piscina cheia de macarronada vista de cima | quadrada |
| `mesa-toradolandia.png` | Caverna high-tech roxa com circuitos verde-água | quadrada |
| `mesa-mansao-do-inominavel.png` | Mesa gótica escura, toalha roxa, vitral | quadrada |
| `mesa-estacionamento-noturno.png` | Asfalto de estacionamento à noite, faixas amarelas | quadrada |
| `mesa-casa-do-enzo-games.png` | Tapete laranja da sala do Enzo Games | quadrada |
| `mesa-sao-joao-do-butico.png` | Laje no morro, telhas coloridas, comporta secreta | quadrada |
| `logo.png` | Texto "BATALHA DOS / TORADOS" | 1600×800, **fundo transparente** |
| `npc-torado.png` | Retrato do Torado (o NPC) | quadrada, ~512 |
| `aura.png` | Orbe de energia amarela e laranja | quadrada, ~256, **transparente** |
| `moeda-cara.png` | Moeda de ouro com o rosto do Enzo Games | quadrada, ~512, **transparente** |
| `moeda-coroa.png` | Verso da moeda, com o Torado | quadrada, ~512, **transparente** |
| `estado-notificado.png` | Ícone: sininho vermelho num círculo roxo | ~128, **transparente** |
| `estado-silenciado.png` | Ícone: martelo de ban num círculo azul | ~128, **transparente** |
| `estado-iludido.png` | Ícone: coração com olhos de hipnose, círculo rosa | ~128, **transparente** |
| `estado-escudo.png` | Ícone: parênteses dourados como escudo, círculo verde-água | ~128, **transparente** |

**Imagens da parte 2** (plano em `docs/PLANO-BATALHA-COMPLETA.md`, seção 3; o jogo passa a usar
quando o código dessa parte entrar, até lá elas só ficam guardadas):

| Nome final em `assets/Batalha/` | O que é | Formato esperado |
|---|---|---|
| `fundo-menu.png` | Entrada da arena da Toradolândia | 1920×1080 |
| `mapa-torneio.png` | Caminho com 7 plataformas subindo a caverna | 1536×1024 |
| `rival-italolol.png`, `rival-hatsune-neves.png`, `rival-superkid.png`, `rival-degustador-da-noite.png`, `rival-o-inominavel.png` | Rosto de cada rival | quadrada, ~512 |
| `caixa-turma.png`, `caixa-legiao.png`, `caixa-internet.png`, `caixa-herois.png`, `caixa-degustador.png`, `caixa-toradolandia.png` | Caixa de baralho de cada deck | ~768, **transparente** |
| `vitoria.png`, `derrota.png` | Letreiros "VITÓRIA!" e "DERROTA..." | 1600×800, **transparente**; confira o texto |

Qualquer outro nome o jogo **não usa** (a lista está em `js/batalha.js`, constante `ARTE`). Não
invente nomes novos nem mude o código para aceitar outro nome.

## 3. Conferir e salvar
1. Crie a pasta se não existir: `assets/Batalha/`.
2. **Tem que ser PNG.** Se vier JPG ou WebP, converta com o `sharp` que o projeto já tem:
   `node -e "require('sharp')('entrada.jpg').png().toFile('assets/Batalha/mesa.png')"`.
3. **Transparência:** para logo, aura, moedas e estados, confira que o fundo é transparente:
   `node -e "require('sharp')('assets/Batalha/aura.png').metadata().then(m => console.log(m.hasAlpha))"`
   tem que dar `true`, e os cantos não podem ser um quadriculado cinza desenhado (é comum a IA
   "desenhar" o xadrez da transparência). Se o fundo não for transparente, **não salve**: avise o
   Henrique para gerar de novo.
4. **Logo:** leia o texto. Tem que estar escrito exatamente "BATALHA DOS" e "TORADOS" (um R só).
5. Não precisa redimensionar: o build gera as versões menores. Só avise se a imagem for muito
   pequena (menos da metade do tamanho da tabela).
6. Substituir uma imagem que já existe é normal: salve por cima, com o mesmo nome.

## 4. Build
```
npm install        # só se ainda não tiver rodado nesta pasta
npm run build
```
O build gera as versões web em `assets/web/` e registra as imagens em `data/images.json`,
`js/images.generated.js` e `css/images.generated.css`. Confira que entrou:
`grep -c "assets/Batalha/" js/images.generated.js` (tem que ser o número de imagens da pasta).

## 5. Olhar na tela
Rode `npm run serve` e abra `http://localhost:3000/batalha.html` (a porta aparece no terminal).
Comece uma batalha e confira:
- o logo no menu; a mesa de fundo (e a mesa muda quando alguém joga um campo);
- o rosto do NPC na barra dele; a orbe de Aura no botão ao lado de "Passar";
- a moeda aparece quando alguém tira cara ou coroa (Bug do Discord, Iludido);
- os ícones de estado no canto das cartas (Notificado, Silenciado...).

Se a imagem não aparecer, quase sempre é o nome do arquivo (acento, maiúscula, espaço) ou o build
não rodou. Não mexa no código da batalha para "consertar".

## 6. Commit e push (só no `TCG`)
Adicione **só** estes caminhos (nada de `git add .`):
```
git add assets/Batalha assets/web data/images.json js/images.generated.js css/images.generated.css
git commit -m "Batalha: imagens <quais>" -- assets/Batalha assets/web data/images.json js/images.generated.js css/images.generated.css
```
- Se o `git status` mostrar outros arquivos mudados pelo build (ex. `data/database.json`), **não**
  inclua; só conte ao Henrique.
- Push: na nuvem `git push origin HEAD:TCG`; no computador `git push origin baralho:TCG`.

## 7. Atualizar o link de jogar (artifact)
O Henrique joga pelo link fixo https://claude.ai/artifact/VUPMuaHWcGXx732Y22wE47. Depois do push:
- **Se você tem a ferramenta Artifact:** rode `node tools/batalha-artifact.mjs <pasta-temporária>`
  e publique `<pasta>/batalha.html` com `url` = o link acima, `root` = a pasta e `files` = o
  conteúdo de `<pasta>/files.json`. **Nunca** publique sem `url` (criaria outro link).
- **Se não tem:** avise na thread da Batalha dos Torados, no projeto, que as imagens estão no
  `TCG`, para o Claude de lá atualizar o link.

## 8. Responder ao Henrique
Diga em poucas linhas: quais imagens entraram (e com que nome), quais foram recusadas e por quê
(fundo não transparente, texto errado), e se o link de jogar já foi atualizado.
