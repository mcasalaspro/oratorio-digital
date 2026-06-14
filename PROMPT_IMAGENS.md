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

- **Proporção:** 16:10 — **tamanho 1600 × 1000 px** (pode ser 1920 × 1200).
- **Enquadramento:** rosto/figura sagrada no **terço superior-central** da imagem.
  O site corta a imagem como **banner largo** (mostra o topo) e como **miniatura**
  (mostra o centro) — manter o rosto em cima garante que apareça nos dois.
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
sharp, high resolution, 16:10 composition, figure framed in the upper-center.
```

### Bloco NEGATIVO (se a IA aceitar "negative prompt")
```
photorealistic, 3d render, cartoon, anime, modern clothing, contemporary objects,
text, watermark, signature, frame, border cutting the face, extra fingers,
deformed hands, harsh shadows, sexualized, low detail, blurry
```

---

## 2) Imagens necessárias (nome do arquivo → quem é)

| Arquivo (em `public/saints/`) | Figura / tema |
|---|---|
| `cristo.webp` | Cristo Pantocrator (Pai Nosso) |
| `nossa-senhora.webp` | Mãe de Deus com o Menino (Ave Maria) |
| `rosario.webp` | A Mãe de Deus com o rosário (Terço, Dezena, Rosário) |
| `santo-antonio.webp` | Santo Antônio de Pádua (novena) |
| `sao-jose.webp` | São José com o Menino (novena) |
| `sao-jose-operario.webp` | São José Operário, com ferramentas (novena) |
| `sao-miguel.webp` | São Miguel Arcanjo (oração) |
| `default.webp` | Imagem padrão (vela votiva) — usada quando uma oração não tem imagem |

---

## 3) Prompts prontos (estilo + tema)

### `cristo.webp` — Cristo Pantocrator
```
[ESTILO] A Byzantine icon of Christ Pantocrator, facing forward, right hand
raised in blessing with two fingers, left hand holding a jeweled gilded Gospel
book, cruciform halo with the Greek letters Ο Ω Ν, deep red tunic and lapis-blue
himation, calm majestic gaze, the inscription IC XC in the upper corners.
```

### `nossa-senhora.webp` — Theotokos (Mãe de Deus)
```
[ESTILO] A Byzantine icon of the Theotokos Hodegetria, the Virgin Mary holding
the Christ Child on her left arm, her right hand gesturing toward Him, deep
maroon maphorion with three gold stars (forehead and shoulders), golden halos,
the monograms ΜΡ ΘΥ, tender and solemn expression.
```

### `rosario.webp` — A Mãe de Deus e o rosário
```
[ESTILO] A Byzantine icon of the Virgin Mary offering a rosary of glowing golden
beads with a small cross, hands gracefully holding the beads, deep blue
maphorion, golden halo, gold-leaf background with faint radiating lines, devotion
and stillness.
```

### `santo-antonio.webp` — Santo Antônio de Pádua
```
[ESTILO] A Byzantine icon of Saint Anthony of Padua as a young friar, brown
Franciscan habit with a knotted rope cincture, tonsured hair, holding a white
lily and the Christ Child seated on a Gospel book, golden halo, gold-leaf
background, gentle solemn face.
```

### `sao-jose.webp` — São José
```
[ESTILO] A Byzantine icon of Saint Joseph holding the Christ Child on one arm and
a flowering lily staff in the other hand, ochre and warm-brown robes, golden
halo, gold-leaf background, kind paternal expression, dignified posture.
```

### `sao-jose-operario.webp` — São José Operário
```
[ESTILO] A Byzantine icon of Saint Joseph the Worker, a carpenter, holding a
set-square and a hand-saw, simple worker's tunic with rolled sleeves and a leather
apron, a small flowering lily beside him, golden halo, gold-leaf background,
strong yet serene face, the dignity of labor.
```

### `sao-miguel.webp` — São Miguel Arcanjo
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
   - Baixe e **renomeie** com o nome exato (ex.: `cristo.webp`).
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
