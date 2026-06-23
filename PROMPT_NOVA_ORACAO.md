# 🕊️ Prompt para criar uma nova oração/novena (formato MD perfeito)

Copie o bloco abaixo, cole numa conversa com o Claude (ou outro assistente)
e troque o que está entre colchetes. O assistente devolve **um arquivo `.md`
pronto**. Você só salva em `src/content/prayers/` e dá `git push`.

---

## ✂️ Copie a partir daqui

> Você é um editor de orações católicas. Gere **um único arquivo Markdown**
> para o meu site "Oratório Digital" (feito em Astro). Siga EXATAMENTE estas regras:
>
> 1. Comece com o *frontmatter* YAML entre `---`, com os campos abaixo.
> 2. Depois do frontmatter, escreva o texto da oração em Markdown limpo.
> 3. **Se for novena** (`type: novena`), divida o conteúdo em seções e use
>    títulos **exatamente** no formato `## Dia N — Título do dia`
>    (ex.: `## Dia 1 — A coragem da fé`). O site usa esse padrão para criar
>    o seletor de dias. O número de seções `## Dia N` deve bater com `totalDays`.
> 4. Use `>` (citação) para a oração final repetida em cada dia, se houver.
> 5. Use texto de **domínio público / tradicional**. Não invente dogmas.
> 6. **Formato em verso:** escreva **uma frase por linha** e termine cada
>    linha com `<br>`, deixando uma linha em branco entre as estrofes.
>    (Não coloque `<br>` na última linha de cada estrofe.)
> 7. **Maiúscula reverente:** escreva com letra maiúscula toda referência a
>    Deus — nomes (Deus, Senhor, Jesus, Cristo, Pai, Filho, Espírito Santo)
>    e pronomes/possessivos d'Ele (Vós, Vosso, Vossa, Convosco, Tu, Teu, Ele,
>    Seu, Sua). Pronomes que se referem a um santo ou a Maria ficam minúsculos.
> 8. **Repetições:** para orações repetidas (terço, rosário), escreva a
>    oração UMA vez e comece o bloco com `Nx` (ex.: `10x Ave Maria...`).
>    O site mostra continhas que avançam sozinhas e contam por você.
> 9. Responda **somente com o conteúdo do arquivo**, sem comentários extras.
>
> Dados desta oração:
> - Título: **[ex.: Novena a Nossa Senhora Aparecida]**
> - Tipo: **[oracao | novena | terco | dezena | rosario | ladainha | hino | devocional | liturgia | bizantina | outro]**
> - Santo/devoção (se houver): **[ex.: Nossa Senhora Aparecida]**
> - Idioma: **[pt-BR | en | es | it | la]**
> - Se for novena, total de dias: **[ex.: 9]**
> - Festa litúrgica (se houver), no formato MM-DD: **[ex.: 10-12]**
> - Quantos dias antes da festa começar a novena: **[ex.: -9]**
> - Tema/intenções (palavras-chave): **[ex.: proteção, família, Brasil]**
> - Cor litúrgica: **[advento | ordinario | festa | martir]**

## ✂️ Até aqui

---

## 📐 Modelo do arquivo (referência)

### Oração simples

```markdown
---
title: "Oração a São Miguel Arcanjo"
type: "oracao"
saint: "São Miguel Arcanjo"
language: "pt-BR"
image: "/saints/default.webp"
thumbnail: "/saints/default.webp"
tags: ["proteção", "anjos"]
description: "Breve oração de proteção a São Miguel."
featured: false
liturgicalColor: "festa"
---

São Miguel Arcanjo, defendei-nos no combate...
```

### Novena (atenção aos `## Dia N`)

```markdown
---
title: "Novena a Santo Antônio"
type: "novena"
totalDays: 9
saint: "Santo Antônio"
language: "pt-BR"
image: "/saints/santo-antonio.webp"
thumbnail: "/saints/santo-antonio.webp"
parallaxImage: "/textures/rays.svg"
tags: ["intercessão", "objetos perdidos"]
description: "Novena tradicional a Santo Antônio de Pádua."
featured: true
liturgicalFeast: "06-13"     # festa em 13 de junho
liturgicalColor: "festa"
novenaSuggestedStart: -9     # começa 9 dias antes da festa
---

Breve introdução comum a todos os dias (opcional).

## Dia 1 — A coragem da fé

Texto do primeiro dia...

> Santo Antônio, rogai por nós.

## Dia 2 — O amor à Palavra

Texto do segundo dia...

> Santo Antônio, rogai por nós.
```

---

## 🧾 O que cada campo faz

| Campo | Para que serve |
|---|---|
| `title` | Nome exibido no card e no topo da leitura. **Obrigatório.** |
| `type` | Tipo do conteúdo. **Obrigatório.** Veja a lista de tipos abaixo. |
| `totalDays` | Nº de dias da novena (cria as "contas" do seletor). Só novenas. |
| `language` | Idioma (`pt-BR`, `en`, `es`…). Vira filtro no catálogo. |
| `saint` | Santo/devoção (aparece em itálico e na busca). |
| `image` | Imagem de banner no topo da página de leitura. |
| `thumbnail` | Miniatura no card do catálogo. |
| `parallaxImage` | Camada que flutua suavemente no paralaxe (opcional). |
| `tags` | Palavras-chave para a busca. |
| `description` | Frase curta no card. |
| `featured` | `true` coloca em destaque na home. |
| `featuredOrder` | Ordem entre os destaques (número menor vem antes). |
| `liturgicalFeast` | Data da festa `"MM-DD"`. Ativa o destaque automático na época. |
| `liturgicalColor` | `advento` (roxo), `ordinario` (verde), `festa` (dourado), `martir` (vermelho). |
| `novenaSuggestedStart` | Dias **antes** da festa para iniciar (ex.: `-9`). |

### Tipos de conteúdo (`type`)

Escolha sempre o **mais específico** (o catálogo cria um filtro para cada tipo usado):

| `type` | Quando usar |
|---|---|
| `oracao` | Oração avulsa (ex.: a São Miguel, ato de contrição). |
| `novena` | Novena de 9 dias (use também `totalDays` e `novenaSuggestedStart`). |
| `terco` | Terço — uma volta do rosário. |
| `dezena` | Uma dezena. |
| `rosario` | Rosário completo (todos os mistérios). |
| `ladainha` | Ladainha / litania (invocações com resposta "rogai por nós"). |
| `hino` | Hino ou cântico. |
| `devocional` | Devoção, consagração, oferecimento, mês dedicado. |
| `liturgia` | Liturgia das Horas, ofício, vésperas, laudes, completas. |
| `bizantina` | Oração da tradição bizantina/oriental (acatistos, paráclise, etc.). |
| `outro` | Qualquer outro conteúdo devocional. |

### Regra de ouro das novenas
O seletor de dias só funciona se os títulos seguirem
`## Dia 1 — ...`, `## Dia 2 — ...` etc., e a quantidade bater com `totalDays`.
Em inglês, use `## Day 1 — ...`.

---

## 🖼️ Imagens (opcional)
- Coloque arquivos em `public/saints/` (ex.: `public/saints/aparecida.webp`).
- No frontmatter, referencie como `/saints/aparecida.webp` (sem `public`).
- A imagem deve ter o **mesmo nome do arquivo da oração** (ex.: `minha-oracao.md` → `public/saints/minha-oracao.webp`). Não precisa declarar `image:` no frontmatter — o site usa o nome automaticamente.
- Use **WebP** (leve). Para gerar a arte no estilo do site, veja **PROMPT_IMAGENS.md**.
- Se não colocar imagem, o site usa uma vela dourada padrão automaticamente.
