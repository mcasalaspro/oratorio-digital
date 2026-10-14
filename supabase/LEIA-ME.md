# Contador no Supabase

O arquivo `contador.sql` monta o banco do contador do site (orações rezadas, visitas, liturgias lidas e visitas às páginas de oração).

## O que ele cria

- **contadores**: os números. Uma linha para `total` (todas as orações), `visits` (visitas), `liturgias` e uma para cada oração.
- **contagem_dia**: quantas vezes cada coisa foi contada em cada dia (horário de Brasília). O histórico começa no dia em que o Supabase entrar no ar.
- **visitas_oracao** e **visitas_oracao_dia**: quantas vezes a página de cada oração foi aberta (uma vez por visita), no total e por dia. Começam no dia em que a versão com a página "Números do Oratório" for publicada.
- **limites**, **config_privada** e **importacoes**: uso interno (proteção contra quem tenta inflar o contador, sem guardar o IP de ninguém; e importação do Abacus feita uma vez só).
- 6 funções que o site usa: `ler_contadores`, `contar_oracao`, `contar_visita`, `contar_liturgia`, `contar_visita_oracao` (visita à página de uma oração) e `ler_numeros` (os números da página www.oratoriodigital.com/numeros/).
- 3 visões só para você: `resumo_mes`, `mais_rezadas_mes` e `mais_visitadas_mes`.

Ninguém de fora lê ou muda as tabelas diretamente: o site só consegue usar as 6 funções.

O banco é dividido com outro projeto. Se o `contador.sql` encontrar uma tabela ou função com um dos nomes novos que não seja do Oratório, ele para no começo com a mensagem "Já existe … que não é do Oratório Digital. Nada foi alterado." e não muda nada.

## Como rodar

1. Em supabase.com, abra o seu projeto → **SQL Editor** → **New query**.
2. Cole o conteúdo inteiro de `contador.sql` e clique em **Run**.
3. Embaixo aparece uma tabela com **OK** em todas as linhas (são 25). Pronto.

Pode rodar de novo quando quiser: nenhum número se perde. O arquivo roda numa transação só: se der qualquer erro, nada muda.

Se aparecer o erro "Já existe no banco algo com o mesmo nome que não é do Oratório Digital…", o arquivo parou antes de mudar qualquer coisa, para não estragar o outro projeto que divide este banco. Não rode de novo: mande a mensagem para o Claude.

O Supabase pode mostrar o aviso "RLS Enabled No Policy" nessas tabelas. É de propósito: sem políticas, ninguém de fora acessa.

## A troca do Abacus para o Supabase (uma vez só)

1. Rode o `contador.sql` (acima).
2. Cole a URL do projeto e a **Publishable key** em `src/config/site.ts` (o comentário lá explica onde achar) e publique o site. A partir daí, o site conta no Supabase.
3. Uns 15 minutos depois de publicar, abra www.oratoriodigital.com/ferramentas/importar-contador/, siga os passos da página e rode o SQL que ela gera no SQL Editor. Os números do Abacus se somam aos novos e nenhuma contagem se perde.

## Ver os números

No menu **Table Editor**:

- **contadores**: os números de sempre. Para corrigir um número, clique duas vezes na célula, digite o número certo e aperte Enter.
- **resumo_mes**: o total de cada contador em cada mês.
- **mais_rezadas_mes**: as orações mais rezadas no mês atual.
- **mais_visitadas_mes**: as orações mais visitadas (páginas abertas) no mês atual.

Ou abra www.oratoriodigital.com/numeros/: o gráfico do dia a dia e as listas das mais rezadas e mais visitadas, sem precisar entrar no Supabase.

Nomes estranhos: alguém pode tentar bagunçar o contador com nomes que não são orações. A página Números ignora o que não é oração do site; se quiser limpar, apague a linha em **contadores** ou **visitas_oracao** (clique com o botão direito na linha → Delete row).

## Nunca faça

- **Nunca** coloque a **Secret key** (começa com `sb_secret_`) no site, no GitHub ou numa mensagem. Ela abre o banco inteiro. O site usa só a **Publishable key** (`sb_publishable_…`). Se a Secret key vazar, gere outra em Settings → API Keys.
- Não crie políticas (policies) nem libere as tabelas para o público.

## Apagar tudo e recomeçar

Isto apaga **todos** os números e o histórico. Não tem volta (a última cópia diária continua no ramo `dados` do GitHub). Cole no SQL Editor e clique em **Run** (se o Supabase pedir confirmação, confirme). Depois, rode o `contador.sql` de novo.

```sql
-- CUIDADO: apaga o contador inteiro (números, histórico e funções).
-- 1. as visões
drop view if exists public.mais_visitadas_mes, public.mais_rezadas_mes, public.resumo_mes;
-- 2. as funções
drop function if exists
  public.ler_contadores(text[]), public.contar_oracao(text),
  public.contar_visita(), public.contar_liturgia(),
  public.contar_visita_oracao(text), public.ler_numeros(integer, integer),
  public._contar_simples(text), public._numeros(text, date, boolean),
  public._somar(text, date), public._faxina(),
  public._limite_ok(text, text, timestamptz, integer),
  public._quem(), public._hoje(), public._agora();
-- 3. as tabelas (com os números)
drop table if exists public.contadores, public.contagem_dia, public.limites,
  public.config_privada, public.importacoes,
  public.visitas_oracao, public.visitas_oracao_dia;
```
