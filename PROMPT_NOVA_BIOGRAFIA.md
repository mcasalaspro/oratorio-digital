# 📖 Prompt para criar uma nova biografia (santo, mártir, testemunha da fé)

Cole o texto abaixo no chat, preenchendo os campos. O resultado é um arquivo `.md`
que vai em **`src/content/biografias/`**. O nome do arquivo (sem `.md`) é o *slug*
e também o nome da imagem.

---

> Crie uma biografia para o Oratório Digital seguindo EXATAMENTE estas regras:
>
> 1. **Formato em prosa** (não em verso), respeitoso e historicamente correto.
> 2. Use `## Subtítulos` para dividir (ex.: "Juventude", "Conversão", "Os últimos dias").
> 3. Pode usar `> citação` para uma frase marcante do santo.
> 4. **Capitalização reverencial**: maiúscula só em referências a Deus
>    (Deus, Senhor, Jesus, Cristo, Pai, Filho, Espírito Santo e os pronomes a Eles).
>    Os santos e seus pronomes ficam em minúscula; títulos próprios deles em maiúscula.
> 5. Comprimento: de 3 a 8 parágrafos.
>
> Dados:
> - Nome: **[ex.: Santa Teresa de Lisboa]**
> - Título/condição: **[ex.: Virgem, Doutora da Igreja, Mártir]**
> - Festa litúrgica (MM-DD): **[ex.: 10-01]**
> - Nascimento: **[ex.: 1873, Alençon]**
> - Falecimento: **[ex.: 1897, Lisieux]**
> - Padroeiro(a) de: **[ex.: missões, floristas]**
> - Orações relacionadas (slugs já existentes no site): **[ex.: novena-santa-teresinha]**
> - Resumo curto (1 frase, aparece no card): **[...]**

---

## Frontmatter (cabeçalho do arquivo)

```yaml
---
name: "Santo Antônio de Pádua"
title: "Doutor da Igreja"        # opcional
feast: "06-13"                   # opcional — "MM-DD"
born: "c. 1195, Lisboa"          # opcional
died: "13 de junho de 1231, Pádua"  # opcional
patronage: "objetos perdidos, pobres e noivos"  # opcional
tags: ["franciscano", "doutor"]  # opcional
summary: "Frade franciscano e pregador, o santo dos milagres."  # aparece no card
featured: true                   # opcional — destaca no topo da lista
order: 1                         # opcional — ordem entre os destacados
relatedPrayers: ["novena-santo-antonio"]  # opcional — slugs de orações
---
```

| Campo | Para que serve |
|---|---|
| `name` | Nome do santo. **Obrigatório.** |
| `title` | Condição (Mártir, Doutor, Virgem…). Aparece como "tipo" no card. |
| `feast` | Dia litúrgico `MM-DD`. Mostrado na página como `DD/MM`. |
| `born` / `died` | Nascimento / falecimento (texto livre). |
| `patronage` | "Padroeiro de…". |
| `summary` | Resumo de 1 frase (card da listagem). |
| `relatedPrayers` | Slugs de orações já existentes — viram botões no fim da página. |
| `featured` / `order` | Destaque e ordem na lista de biografias. |

## Imagem

- Salve a arte em **`public/biografias/<slug>.webp`** (mesmo nome do arquivo `.md`).
  Ex.: `santo-antonio.md` → `public/biografias/santo-antonio.webp`.
- **Nome em minúsculo, sem acento.** Se faltar, o site usa `public/biografias/default.webp`.
- O **thumbnail é automático** (gerado no build). Veja `PROMPT_IMAGENS.md` para o estilo.

## Publicar

Solte o `.md` em `src/content/biografias/` e a imagem em `public/biografias/`,
depois rode o `subir-site.bat`. A biografia aparece sozinha em **/biografias**.
