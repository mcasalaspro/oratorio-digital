# Oratório Digital

Site de orações católicas para rezar com calma: **https://www.oratoriodigital.com**.
Feito em Astro. O GitHub confere, compila e publica sozinho a cada envio.

## Publicar

1. Dê dois cliques em **`subir-site.bat`** (na pasta do projeto).
2. Escreva em poucas palavras o que mudou e aperte ENTER.
3. No fim ele diz **PRONTO** (enviado) ou **ERRO** (o que falhou; nada foi publicado).
4. Em uns 3 minutos o site atualiza. Para acompanhar: repositório no GitHub → aba **Actions**.

Se um arquivo tiver erro (por exemplo, aspas faltando no cabeçalho), **só ele fica fora do site**: o resto é publicado e o GitHub manda um e-mail com o arquivo, a linha e o que corrigir. Corrigiu e publicou de novo, ele volta.

## Onde fica cada coisa

```
src/content/prayers/      orações (.md) — o nome do arquivo vira o endereço
src/content/biografias/   biografias dos santos
src/content/textos/       textos · cantos/ · liturgia/ (AAAAMMDD_Liturgia.md)
src/config/site.ts        painel: destaques da abertura, contador, textos da interface
src/data/produtos.yaml    produtos (instruções no topo do arquivo)
public/saints/            imagem de cada oração: <nome-do-arquivo>.webp
public/biografias/        imagem de cada biografia
public/textos/ e cantos/  fundos das páginas (veja o LEIA-ME.txt da pasta)
supabase/                 banco do contador (veja supabase/LEIA-ME.md)
scripts/                  ferramentas do build (não precisa mexer)
.github/workflows/        robôs do GitHub: publicação, contador diário e links
```

**Novenas:** os dias são títulos `## Dia 1`, `## Dia 2`…, e o `totalDays` do cabeçalho é o mesmo número.
**Data de festa** (`liturgicalFeast`): `"MM-DD"` entre aspas (ex.: `"12-08"`) ou uma festa móvel, como `"pentecostes"` ou `"corpus-christi"` (lista completa no topo de `public/js/calendario.js`).

**Imagens:** coloque só a imagem grande (.webp, até 1600 px de largura). As versões menores, para o celular e para os cartões, são feitas na publicação e não vão para o GitHub. Para reduzir uma imagem acima de 500 KB sem diferença visível: `node scripts/otimizar-imagens.mjs`.

## Relatório do conteúdo

**https://www.oratoriodigital.com/ferramentas/relatorio/**, refeito a cada publicação, só para você (fora do Google): arquivos fora do site, avisos, imagens que faltam ou sobram, orações sem data, festas por mês, categorias das biografias e produtos.

## Contador e robôs do GitHub

- **Contador da comunidade:** Supabase. Endereço e *Publishable key* em `src/config/site.ts`; como montar o banco: `supabase/LEIA-ME.md`.
- **Robô diário** (`contador-diario.yml`, 06:17): mantém o Supabase acordado (o plano grátis pausa depois de 7 dias sem uso) e guarda uma cópia dos números no ramo `dados`. A publicação usa essa cópia se o contador estiver fora do ar.
- **Links quebrados** (`links.yml`, todo dia 3): manda e-mail se um link do site quebrar ou um link externo deixar de existir.
- O GitHub desliga os robôs agendados depois de **60 dias sem nenhum envio** ao repositório. Ele avisa por e-mail; para religar: aba Actions → o robô → **Enable workflow**.

## No seu computador (opcional)

Precisa do Node 22.

```
npm install
npm run dev        abre o site em http://localhost:4321
npm run validar    confere o conteúdo (arquivo e linha de cada erro)
npm run build      gera a pasta dist/, igual ao que vai para o ar
npm run links      depois do build: confere os links
```

## Guias

- `supabase/LEIA-ME.md` — o banco do contador.
- `public/textos/LEIA-ME.txt`, `public/cantos/LEIA-ME.txt`, `public/liturgia/LEIA-ME.txt` — fundos das páginas.
- Os guias para criar orações, imagens e biografias (`PROMPT_*.md`) ficam no seu computador. Se você colocá-los nesta pasta, eles passam a ir junto para o GitHub.
