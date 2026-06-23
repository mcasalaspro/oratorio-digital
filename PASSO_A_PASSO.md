# 🚀 Colocar o site no ar HOJE (passo a passo)

Tempo total: ~10 minutos. Você só precisa de uma conta no GitHub.

---

## Passo 1 — Crie o repositório
1. Acesse <https://github.com/new>.
2. Em **Repository name**, escreva exatamente: `oratorio-digital`
   *(usar esse nome evita qualquer ajuste extra de configuração).*
3. Deixe como **Public**.
4. **Não** marque "Add a README". Clique em **Create repository**.

---

## Passo 2 — Ajuste 2 coisinhas no código
Abra os arquivos e troque:

**a) `astro.config.mjs`** — troque `SEU-USUARIO` pelo seu login do GitHub:
```js
site: 'https://SEU-USUARIO.github.io',   // ex.: 'https://joaosilva.github.io'
base: '/oratorio-digital',               // deixe assim se o repo se chama oratorio-digital
```

**b) `src/config/site.ts`** — dê um nome ÚNICO ao seu contador
(para ele não se misturar com o de outra pessoa):
```ts
counter: {
  enabled: true,
  base: 'https://abacus.jasoncameron.dev',
  namespace: 'oratorio-do-joao-2026',   // 👈 troque por algo só seu
  totalKey: 'total',
},
```

> Só isso. O CAPTCHA já vem **desligado** (funciona sem ele). Para ligar depois,
> veja a seção "CAPTCHA" no `README.md`.

---

## Passo 3 — Envie os arquivos para o GitHub

### Opção A — pelo site do GitHub (sem terminal)
1. Na página do repositório recém-criado, clique em **uploading an existing file**.
2. Arraste **todo o conteúdo** da pasta do projeto (todas as pastas e arquivos).
3. Escreva uma mensagem (ex.: "primeiro envio") e clique em **Commit changes**.

### Opção B — pelo terminal (git)
Dentro da pasta do projeto:
```bash
git init
git add .
git commit -m "Oratório Digital — primeiro envio"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/oratorio-digital.git
git push -u origin main
```

---

## Passo 4 — Ligue o GitHub Pages
1. No repositório, vá em **Settings** → **Pages** (menu lateral).
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Pronto. Não precisa escolher mais nada.

---

## Passo 5 — Aguarde a publicação
1. Vá na aba **Actions** do repositório. Você verá o fluxo "Deploy no GitHub Pages" rodando.
2. Em ~2 minutos ele fica verde ✅.
3. Seu site estará no ar em:
   **`https://SEU-USUARIO.github.io/oratorio-digital/`**

---

## ✅ Depois de no ar
- **Adicionar oração:** crie um arquivo em `src/content/prayers/nome.md` e dê `git push`. Em ~2 min aparece no site. (Use o `PROMPT_NOVA_ORACAO.md` para gerar o arquivo certinho.)
- **Mudar destaques:** edite `src/config/site.ts` (lista `pinnedPrayers`) e dê push.
- **Erro comum:** se as imagens/links aparecerem quebrados, quase sempre é o `base` no `astro.config.mjs`. Repo chamado `oratorio-digital` → `base: '/oratorio-digital'`. Repo com outro nome → `base: '/aquele-nome'`.
