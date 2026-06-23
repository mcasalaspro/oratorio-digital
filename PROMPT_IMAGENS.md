# 🎨 Prompt-modelo para as imagens do Oratório Digital (arte bizantina)

Este guia gera **exatamente** as imagens que o site usa, num estilo de **ícone
bizantino sofisticado** (fundo de ouro, têmpera, auréolas, detalhes finos).

Você vai gerar em outra IA de imagem (Midjourney, DALL·E, Ideogram, Leonardo,
Firefly etc.). Os prompts estão **em inglês** porque é o idioma em que esses
modelos respondem melhor.

> **Importante (formato):** a maioria das IAs entrega **PNG/JPG**, mas o site usa
> **WebP**. Depois de gerar, **converta para WebP** (veja o fim do arquivo) e salve
> com o **nome exato** indicado, dentro de `public/saints/`, por cima do
> arquivo provisório. Rode o `subir-site.bat` e pronto.

---

## 1) Especificações técnicas (valem para TODAS)

- **Proporção:** 16:10 — **tamanho exato 1600 × 1000 px** (para mais nitidez, 1920 × 1200 — mesma proporção).
- **Enquadramento:** mantenha o rosto/figura **no centro do quadro** (na horizontal **e** na vertical),
  preenchendo a parte central. O mesmo arquivo é usado de duas formas e cada uma corta de um jeito:
  o **card** (pôster 3:4) corta as **laterais** → o rosto precisa estar no centro horizontal;
  o **banner** (faixa larga) corta **topo e rodapé** → o rosto precisa estar na faixa vertical do meio.
  Deixe uma margem de segurança nas bordas; nada essencial muito perto das beiradas.
- **Fundo:** **folha de ouro maciça até as bordas** (sem transparência, sem cena externa).
- **Sem texto/marca d'água/assinatura** — exceto a caligrafia tradicional de
  ícone (ex.: `IC XC`, `ΜΡ ΘΥ`), se você quiser.
- **Nada moderno**, sem roupas atuais, sem objetos contemporâneos.

### Bloco de ESTILO (cole no início de qualquer prompt)
```
Byzantine Orthodox icon, egg-tempera and gold-leaf painting, Macedonian/Cretan
school, hieratic frontal pose, elongated solemn proportions, almond-shaped eyes,
fine confident linework, jewel-toned palette (lapis blue, vermilion, ochre,
deep green), chrysography (fine gold striations on garments), incised gold halo,
solid burnished gold-leaf background to the edges, subtle luminous modeling,
ornate but restrained detailing, sacred serenity, museum quality, ultra detailed,
sharp, high resolution, 16:10 composition, the holy figure centered in the frame with safe margins on all sides.
```

### Bloco NEGATIVO (se a IA aceitar "negative prompt")
```
photorealistic, 3d render, cartoon, anime, modern clothing, contemporary objects,
text, watermark, signature, frame, border cutting the face, extra fingers,
deformed hands, harsh shadows, sexualized, low detail, blurry
```

---

## 2) Regra de nomes: a imagem tem o MESMO nome da oração

Cada oração é um arquivo em `src/content/prayers/` (ex.: `pai-nosso.md`).
**A imagem dela é `public/saints/<mesmo-nome>.webp`** (ex.: `public/saints/pai-nosso.webp`).
É só isso: para trocar a arte de uma oração, salve um `.webp` com o nome do arquivo dela.
(Se faltar a imagem de alguma, o site usa `default.webp` automaticamente.)

> **Thumbnails são automáticos:** no build, o site gera sozinho uma versão leve
> (`<nome>_thumb.webp`) de cada imagem para deixar a página inicial leve. Você só
> precisa manter a imagem grande — não crie os thumbs à mão. Os thumbs já vêm
> prontos e são **reaproveitados** (gerados só quando faltam — rápido no deploy).
> Ao **trocar** uma imagem que já existia, rode `npm run thumbs:force` para refazer
> os thumbnails (e suba de novo).

| Arquivo da imagem (em `public/saints/`) | Oração | Sugestão de tema |
|---|---|---|
| `pai-nosso.webp` | Pai Nosso | Cristo Pantocrator |
| `ave-maria.webp` | Ave Maria | Mãe de Deus com o Menino (Theotokos) |
| `hail-mary.webp` | Hail Mary (EN) | Mãe de Deus (pode repetir a arte da Ave Maria) |
| `terco.webp` | Terço | A Mãe de Deus com o rosário |
| `dezena.webp` | Dezena | O rosário (pode repetir a arte do Terço) |
| `rosario.webp` | Rosário Completo | O rosário (pode repetir a arte do Terço) |
| `novena-santo-antonio.webp` | Novena a Santo Antônio | Santo Antônio de Pádua |
| `novena-sao-jose.webp` | Novena a São José | São José com o Menino |
| `novena-sao-jose-operario.webp` | Novena a São José Operário | São José Operário, com ferramentas |
| `ladainha-sao-jose.webp` | Ladainha de São José | São José (pode repetir a arte de São José) |
| `sao-miguel-arcanjo.webp` | Oração a São Miguel | São Miguel Arcanjo |
| `exorcismo-sao-miguel.webp` | Oração de Libertação | São Miguel Arcanjo (pode repetir a arte de São Miguel) |
| `default.webp` | (reserva) | Vela votiva — usada quando faltar a imagem de alguma oração |

> Dica: temas que se repetem (rosário, São José, São Miguel, Theotokos) podem usar
> **a mesma arte** salva com nomes diferentes — ou variações, se preferir.

### Assunto sugerido por tipo de conteúdo

Para os novos tipos, use a iconografia bizantina adequada:

| Tipo | Assunto / ícone sugerido |
|---|---|
| `oracao` | O santo ou mistério invocado. |
| `novena` | O santo da novena (rosto sereno, auréola, atributo). |
| `terco` / `dezena` / `rosario` | A Mãe de Deus (Theotokos) com o rosário. |
| `ladainha` | O santo invocado, em postura de intercessão. |
| `hino` | Anjos cantando / coro celeste, ou o santo em louvor. |
| `devocional` | O Sagrado Coração, a Theotokos, ou o tema da devoção. |
| `liturgia` | Altar, Eucaristia, anjos com incenso, luz do tabernáculo. |
| `bizantina` | Ícone oriental (Cristo, Theotokos, festa) com chrysography acentuada. |

> A imagem **sempre** tem o nome do arquivo do conteúdo (slug). Ex.: uma ladainha
> `ladainha-do-sagrado-coracao.md` → `public/saints/ladainha-do-sagrado-coracao.webp`.

### Biografias (santos, mártires)

As biografias usam a mesma arte, porém na pasta **`public/biografias/`**, com o nome
do arquivo da biografia. Ex.: `src/content/biografias/santo-antonio.md` →
`public/biografias/santo-antonio.webp` (o thumbnail é gerado sozinho). Sugestão de
assunto: **retrato do santo** — rosto, auréola e atributo — em estilo ícone bizantino.

## 3) Prompts prontos (estilo + tema)

### `pai-nosso.webp` — Cristo Pantocrator
```
[ESTILO] A Byzantine icon of Christ Pantocrator, facing forward, right hand
raised in blessing with two fingers, left hand holding a jeweled gilded Gospel
book, cruciform halo with the Greek letters Ο Ω Ν, deep red tunic and lapis-blue
himation, calm majestic gaze, the inscription IC XC in the upper corners.
```

### `ave-maria.webp` (e `hail-mary.webp`) — Theotokos (Mãe de Deus)
```
[ESTILO] A Byzantine icon of the Theotokos Hodegetria, the Virgin Mary holding
the Christ Child on her left arm, her right hand gesturing toward Him, deep
maroon maphorion with three gold stars (forehead and shoulders), golden halos,
the monograms ΜΡ ΘΥ, tender and solemn expression.
```

### `terco.webp` (e `dezena.webp`, `rosario.webp`) — A Mãe de Deus e o rosário
```
[ESTILO] A Byzantine icon of the Virgin Mary offering a rosary of glowing golden
beads with a small cross, hands gracefully holding the beads, deep blue
maphorion, golden halo, gold-leaf background with faint radiating lines, devotion
and stillness.
```

### `novena-santo-antonio.webp` — Santo Antônio de Pádua
```
[ESTILO] A Byzantine icon of Saint Anthony of Padua as a young friar, brown
Franciscan habit with a knotted rope cincture, tonsured hair, holding a white
lily and the Christ Child seated on a Gospel book, golden halo, gold-leaf
background, gentle solemn face.
```

### `novena-sao-jose.webp` (e `ladainha-sao-jose.webp`) — São José
```
[ESTILO] A Byzantine icon of Saint Joseph holding the Christ Child on one arm and
a flowering lily staff in the other hand, ochre and warm-brown robes, golden
halo, gold-leaf background, kind paternal expression, dignified posture.
```

### `novena-sao-jose-operario.webp` — São José Operário
```
[ESTILO] A Byzantine icon of Saint Joseph the Worker, a carpenter, holding a
set-square and a hand-saw, simple worker's tunic with rolled sleeves and a leather
apron, a small flowering lily beside him, golden halo, gold-leaf background,
strong yet serene face, the dignity of labor.
```

### `sao-miguel-arcanjo.webp` (e `exorcismo-sao-miguel.webp`) — São Miguel Arcanjo
```
[ESTILO] A Byzantine icon of the Archangel Michael, great feathered wings with
gold highlights, lamellar military armor of a warrior-saint, holding a slender
sword and a balance scale, trampling a defeated dark serpent beneath his feet,
golden halo, gold-leaf background, fierce but serene majesty.
```

### `default.webp` — Vela votiva (padrão)
```
[ESTILO] A Byzantine-style sacred image of a single lit votive candle with a warm
golden flame and soft radiating light, slender ornamental candlestick, gold-leaf
background, deep warm tones, contemplative and quiet, no figures.
```

> Onde está `[ESTILO]`, cole o **Bloco de ESTILO** da seção 1.

---

## Banner inicial do site (`public/textures/rays.webp`)

A capa da página inicial usa **`public/textures/rays.webp`** (faixa larga, atrás do
título). Gere algo **devocional e simbólico**, com **luz de fundo cinematográfica** —
**sem texto** e sem rostos em close (o título do site fica por cima).

- **Tamanho:** 2400 × 1400 px (paisagem larga). Mantenha a luz/símbolo no **alto-centro**,
  com margem nas laterais (as pontas são cortadas em telas estreitas).
- **Salve como** `public/textures/rays.webp` (mesma conversão do passo 5).

Prompt (tom mais cinematográfico que ícone):
```
Cinematic devotional scene, warm divine light streaming from above through darkness,
soft golden god-rays and volumetric light beams, a luminous sacred glow at the top-center,
deep atmospheric shadows, faint dust particles drifting in the light, reverent and peaceful,
symbolic and contemplative, abstract (no faces, no text, no watermark), wide cinematic banner,
rich warm gold and deep brown tones, high detail, photographic volumetric lighting, 2400x1400.
```
Variações simbólicas (troque o foco, mantendo a luz cinematográfica):
- uma **cruz** de luz ao longe;
- uma **vela** acesa solitária na penumbra;
- **mãos em oração** em silhueta sob o facho de luz;
- uma **pomba** de luz descendo (Espírito Santo).

---

## 4) (Opcional) Fundo/textura bizantina

O site já tem um fundo discreto. Se quiser trocar por uma textura bizantina,
gere esta imagem, salve como `public/textures/fundo.webp` e me peça para ligá-la
(é uma linha de ajuste):
```
[ESTILO, sem figuras] An abstract Byzantine gold mosaic texture, tiny tesserae of
gold and amber, very subtle, even, seamless, dark warm undertone, no figures, no
text, suitable as a faint background.
```

---

## 5) Converter para WebP e instalar

1. **Gere** a imagem (1600 × 1000).
2. **Converta para WebP** — jeito fácil e grátis:
   - Abra <https://squoosh.app>, arraste a imagem.
   - À direita, escolha **WebP**, qualidade **~80**.
   - Baixe e **renomeie** com o nome do arquivo da oração (ex.: `pai-nosso.webp`).
3. **Coloque** o arquivo em `public/saints/`, substituindo o provisório.
4. Rode o **`subir-site.bat`** (ou `git push`). Em ~2 min a imagem nova aparece.

> Prefere usar `.jpg`/`.png` em vez de `.webp`? Funciona também — mas aí me avise,
> ou troque a extensão no campo `image:`/`thumbnail:` do arquivo `.md` da oração
> para bater com o nome do arquivo que você salvou.

---

### Dica de consistência
Gere todas com o **mesmo Bloco de ESTILO** para o conjunto ficar harmônico (mesma
"mão" de ícone). Se a sua IA permite "seed" ou "style reference", use a mesma em
todas para manter a unidade visual.
