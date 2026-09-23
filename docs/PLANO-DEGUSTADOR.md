# Plano: todas as edições do Degustador da Noite

Status: **plano, nada implementado**. 23/09/2026.

## Objetivo
A página `degustador.html` passa a funcionar como a home: um destaque com a
edição mais recente e a **estante 3D** com todas as edições (mesmo tamanho,
efeito holográfico, animação de abrir o gibi, entrada na página 1). Tudo no
tema roxo do Degustador. A home continua **sem** o Degustador.

## O que existe hoje

| Edição | Na pasta `Spin-Offs/Degustador Da noite` | No site | Capa |
|---|---|---|---|
| Cap. 1 | `CAP1/` capa + 4 páginas | ✅ idêntico | ✅ |
| Cap. 2 | `CAP2/` capa + 6 páginas | ❌ | ✅ `CAPA CAP2.jpg` |
| Cap. 3 | `CAP3/` 6 páginas (`01.png`…`06.png`) | ❌ | ❌ **falta** |
| Cap. 4 | `CAP 4/` 10 páginas (`PAG1`…`PAG10`) | ❌ | ❌ **falta** |

Detalhes:
- No CAP2, a 1ª página se chama `CAP1 PAG 1.png`. Parece erro de nome; confirmar
  vendo a imagem antes de publicar.
- Quase todas as páginas são **deitadas (3:2)**. As exceções são as capas e a
  pág. 4 do Cap. 1.
- Hoje o catálogo guarda **uma capa por spin-off**, a do Cap. 1. A estante
  precisa de **uma capa por edição**.

## Como fazer (sem duplicar código)

### 1. Catálogo com capa por capítulo — `atualizar.js`
- `scanSpinOffs()` passa a guardar `cover` em cada capítulo (a imagem de
  `Capitulo N/Capa/`). Sem capa, usa a capa provisória do passo 5.
- O manifest aceita título e descrição por capítulo, por exemplo:
  `comics.degustador-da-noite.chapters["2"] = { "title": "Dia 02", "description": "..." }`.
- O leitor usa a capa do capítulo (`chapter.cover`) em vez da capa única do gibi.

### 2. Estante e destaque reaproveitados — `js/main.js` + `js/shelf.js`
- A lógica da home vira genérica, guiada por um atributo na página:
  - home: `data-colecao="serie"`: um gibi por capítulo da série principal (como hoje);
  - Degustador: `data-colecao="degustador"`: um gibi por capítulo do spin-off.
- Abrir um gibi passa a levar também o capítulo
  (`reader.html?comic=degustador&chapter=3`), com a mesma animação.
- A lombada mostra o nome da coleção: "ENZO GAMES #3" ou "DEGUSTADOR #3".

### 3. Página `degustador.html`
- Troca o destaque fixo (que só conhece o Cap. 1) pelo destaque automático da
  edição mais recente e pela estante com todas as edições.
- Mantém o título metálico, o botão Voltar e o cursor de morcego.

### 4. Tema roxo da estante — `css/style.css`
- `.theme-degustador .bookcase`: madeira escura com luz roxa, lombadas
  preto e roxo com letras laranja-MP5K, selo "NOVO" laranja.

### 5. Capas que faltam (Cap. 3 e Cap. 4)
- **Opção A (recomendada):** você gera as duas capas no formato 9:16, no mesmo
  estilo das capas 1 e 2.
- **Opção B (provisória, automática):** um script gera a capa a partir da
  página 1: recorte vertical do centro, faixa "DEGUSTADOR DA NOITE #3" e
  moldura roxa. Quando a capa real existir, basta colocá-la em `Capa/` e ela
  substitui a provisória.

### 6. Importar os arquivos para `assets/`
Formato que o site espera:
`assets/Spin Offs/Degustador da noite/Capitulo N/Capa/<capa>` e `.../Paginas/PAGn.<ext>`.

| Origem | Destino |
|---|---|
| `CAP2/CAPA CAP2.jpg` | `Capitulo 2/Capa/CAPA CAP2.jpg` |
| `CAP2/CAP1 PAG 1.png` | `Capitulo 2/Paginas/PAG1.png` (após confirmar) |
| `CAP2/CAP2 PAGn.jpg` (n = 2 a 6) | `Capitulo 2/Paginas/PAGn.jpg` |
| `CAP3/0n.png` (n = 1 a 6) | `Capitulo 3/Paginas/PAGn.png` |
| `CAP 4/PAGn.png` (n = 1 a 10) | `Capitulo 4/Paginas/PAGn.png` |

Depois, `npm run build` gera as versões WebP e o catálogo.

### 7. Páginas deitadas no celular (atenção)
- O leitor já tem o botão "Ampliar" para páginas deitadas, e ele funciona.
- Ajuste pequeno: na animação de abrir o gibi, se a página 1 for deitada,
  mostrar a página inteira em vez de recortá-la.
- Fora deste plano: um modo "gire o celular" para spin-offs deitados. Dá para
  fazer depois, se incomodar.

## Quem faz

| Passo | Quem | Por quê |
|---|---|---|
| 6. Importar e renomear os arquivos | **Gemini** | Mecânico, tabela exata, verificável por contagem e hash |
| 5B. Script de capa provisória (se escolher B) | **Gemini** | Tarefa de imagem com `sharp`, bem especificável |
| Confirmar a página `CAP1 PAG 1.png` do CAP2 | Claude | Precisa olhar a imagem |
| 1–4 e 7. Catálogo, estante genérica, página, tema, animação | Claude | Mexe na estrutura; lógica espalhada em vários arquivos |
| Conferência final (desktop e celular, QA atualizado) | Claude | Sempre |

Estimativa: cerca de **meia janela de 5 h do Claude** e 1 ou 2 tarefas do
Gemini. Um spin-off futuro (ex.: SuperKid) passa a custar só a página HTML e as
cores do tema.

## Decisões pendentes (Henrique)
1. Capas do Cap. 3 e 4: **você gera** (A) ou **provisória automática** (B)?
2. Títulos das edições: o Cap. 1 é "Dia 01". Os outros seguem "Dia 02", "Dia 03",
   "Dia 04"? Ou têm nomes próprios?
3. Tem descrição curta para cada edição (aparece embaixo do gibi na estante)?
