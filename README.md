# 🕯️ Oratório Digital

Um site estático e contemplativo para rezar com calma — orações, terços e
novenas. Feito em **Astro**, publica sozinho no **GitHub Pages** e cresce
apenas com arquivos Markdown. Sem login, sem banco de dados, sem servidor.

> **Quer colocar no ar agora?** Siga o [`PASSO_A_PASSO.md`](./PASSO_A_PASSO.md).
> **Quer criar uma nova oração?** Use o [`PROMPT_NOVA_ORACAO.md`](./PROMPT_NOVA_ORACAO.md).
> **Quer gerar as imagens (arte bizantina)?** Use o [`PROMPT_IMAGENS.md`](./PROMPT_IMAGENS.md).
> **Quer adicionar uma biografia de santo?** Use o [`PROMPT_NOVA_BIOGRAFIA.md`](./PROMPT_NOVA_BIOGRAFIA.md).

---

## ✨ O que ele faz
- **Catálogo por Markdown:** cada arquivo `.md` em `src/content/prayers/` vira uma oração. Adicionou arquivo = adicionou conteúdo.
- **Novenas com seletor de dias** em formato de contas de rosário, com progresso salvo no aparelho.
- **Destaque litúrgico automático:** novenas com data de festa entram em evidência na época certa, já sugerindo o dia correto.
- **Assistente de leitura:** destaca o texto progressivamente, com ritmo lento/médio/rápido e rolagem automática.
- **Contador da comunidade:** ao concluir uma oração, uma vela se acende e o site mostra quantas orações já foram elevadas por todos.
- **Modo claro/escuro**, layout para celular, textura e paralaxe suaves, multi-idioma (PT-BR e EN inclusos).

---

## 🗂️ Estrutura
```
src/
├─ config/site.ts          ← painel: destaques, contador, idioma, CAPTCHA
├─ content/prayers/        ← AS ORAÇÕES (só arquivos .md)
├─ components/             ← cartão, contador (vela)
├─ layouts/Base.astro      ← visual, temas, paralaxe, textos de interface
└─ pages/
   ├─ index.astro          ← home (destaques + catálogo + busca)
   └─ oracao/[...slug].astro ← leitura + novena + assistente + conclusão
public/
├─ saints/                 ← imagens das orações (WebP) — veja PROMPT_IMAGENS.md
│  └─ biografias/             ← imagens das biografias (WebP)
└─ textures/               ← textura de fundo e brilho do paralaxe
.github/workflows/deploy.yml ← publicação automática
```

---

## ➕ Adicionar uma oração
1. Crie `src/content/prayers/minha-oracao.md`.
2. Preencha o frontmatter e o texto (modelos no [`PROMPT_NOVA_ORACAO.md`](./PROMPT_NOVA_ORACAO.md)).
3. `git add . && git commit -m "add: minha oração" && git push`
4. Em ~2 minutos está no ar. **Nenhum código precisa ser alterado.**

**Novenas:** os títulos dos dias precisam ser `## Dia 1 — ...`, `## Dia 2 — ...`
(ou `## Day 1 — ...` em inglês), e a quantidade deve bater com `totalDays`.

---

## 🎛️ Mudar destaques e configurações
Tudo em **`src/config/site.ts`**:
- `pinnedPrayers` — orações sempre em destaque na home (use o nome do arquivo sem `.md`).
- `maxLiturgicalHighlights` — quantos destaques litúrgicos mostrar de uma vez.
- `counter` — o contador da comunidade (troque o `namespace` por um nome só seu).
- `turnstile.siteKey` — o CAPTCHA (veja abaixo).

---

## 🔢 Contador da comunidade
Usa o serviço gratuito **[Abacus](https://abacus.jasoncameron.dev)** — sem cadastro,
sem chave. Cada conclusão soma no contador **daquela oração** (mostrado ao concluir)
e também num total geral (a frase da home: "Esse site já guiou X orações…").

⚠️ **Troque `counter.namespace`** em `src/config/site.ts` por algo único seu
(ex.: `oratorio-da-paroquia-x`), senão sua contagem se mistura com a de outra pessoa.

Para desligar o contador: `counter.enabled = false`.

---

## 🤖 CAPTCHA (anti-bot) — opcional
Já vem **desligado** (`turnstile.siteKey: ''`). Sem ele, há uma proteção simples
que registra no máximo 1 conclusão por oração por dia, por aparelho.

Para ligar o **Cloudflare Turnstile** (gratuito):
1. Crie um widget em <https://dash.cloudflare.com> → **Turnstile**.
2. Cole a *Site Key* em `turnstile.siteKey` no `src/config/site.ts`.
3. `git push`. O desafio aparece antes do botão "Concluir oração".

> Observação: no GitHub Pages (site estático) a validação é só no navegador.
> Para validação 100% à prova de fraude seria preciso uma função de servidor
> (Cloudflare Workers/Netlify) — fora do escopo deste projeto.

---

## 💻 Rodar no seu computador (opcional)
Requer Node 20+.
```bash
npm install
npm run dev      # abre em http://localhost:4321
npm run build    # gera a pasta dist/ (o que vai pro ar)
npm run preview  # pré-visualiza o site já compilado
```

---

## 🚀 Publicar
Veja o [`PASSO_A_PASSO.md`](./PASSO_A_PASSO.md). Em resumo: crie um repositório
`oratorio-digital`, troque `SEU-USUARIO` no `astro.config.mjs`, dê `git push`
e ative **Settings → Pages → Source: GitHub Actions**.

---

*Textos das orações são tradicionais/de domínio público. Feito com cuidado para rezar com calma.* 🕊️
