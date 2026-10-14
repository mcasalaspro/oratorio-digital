-- ════════════════════════════════════════════════════════════════
--  ORATÓRIO DIGITAL — BANCO DO CONTADOR (Supabase)
--
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  No fim aparece uma tabela com "OK" em todas as linhas.
--  Pode rodar de novo quando quiser: nenhum número se perde.
--
--  O site só usa as 6 funções públicas (ler_contadores, contar_oracao,
--  contar_visita, contar_liturgia, contar_visita_oracao, ler_numeros).
--  As tabelas ficam fechadas para fora.
--  "Hoje" é sempre no horário de Brasília (America/Sao_Paulo).
--  Tudo roda numa transação só: se algo der erro, nada muda.
--  Explicações: supabase/LEIA-ME.md
-- ════════════════════════════════════════════════════════════════

begin;


-- ───────── 0. Proteção do banco dividido ─────────
-- Este banco é dividido com outro projeto. Antes de mudar qualquer coisa, este bloco
-- confere cada tabela, visão e função que o arquivo cria: se já existir uma com o mesmo
-- nome que não seja do Oratório, o arquivo para aqui e NADA é alterado.
-- É do Oratório: tem a marca "Oratório Digital…" (comentário) ou, nas criadas antes da
-- marca existir, o mesmo formato (as mesmas colunas; o corpo da função usa estas tabelas).
do $$
declare
  r record;
  alheios text[] := '{}';
  colunas constant jsonb := '{
    "contadores": ["chave","valor","atualizado_em"], "contagem_dia": ["dia","chave","n"],
    "limites": ["quem","alvo","janela","n"], "config_privada": ["nome","valor"],
    "importacoes": ["origem","em"], "resumo_mes": ["mes","chave","total"],
    "mais_rezadas_mes": ["mes","oracao","total"],
    "visitas_oracao": null, "visitas_oracao_dia": null, "mais_visitadas_mes": null }';
  -- assinatura → trecho do corpo da versão sem marca (null = função nova: só com a marca)
  funcoes constant jsonb := '{
    "_agora()": "now()", "_hoje()": "public._agora()", "_quem()": "config_privada",
    "_limite_ok(text, text, timestamp with time zone, integer)": "public.limites",
    "_faxina()": "public.limites", "_somar(text, date)": "public.contagem_dia",
    "_numeros(text, date, boolean)": "public.contagem_dia", "_contar_simples(text)": "public._limite_ok",
    "ler_contadores(text[])": "public.contagem_dia", "contar_oracao(text)": "public._somar",
    "contar_visita()": "_contar_simples(''visits'')", "contar_liturgia()": "_contar_simples(''liturgias'')",
    "contar_visita_oracao(text)": null, "ler_numeros(integer, integer)": null }';
begin
  for r in
    select c.relname::text as nome, obj_description(c.oid, 'pg_class') as marca,
           (select jsonb_agg(a.attname::text order by a.attnum) from pg_attribute a
             where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as cols
      from pg_class c
     where c.relnamespace = 'public'::regnamespace and colunas ? c.relname::text
  loop
    continue when coalesce(r.marca, '') like 'Oratório Digital%';
    if colunas -> r.nome = 'null'::jsonb or r.cols is distinct from colunas -> r.nome then
      alheios := alheios || r.nome;
    end if;
  end loop;
  for r in
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as assinatura,
           obj_description(p.oid, 'pg_proc') as marca, p.prosrc as corpo
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and funcoes ? (p.proname || '(' || oidvectortypes(p.proargtypes) || ')')
  loop
    continue when coalesce(r.marca, '') like 'Oratório Digital%';
    -- a versão de teste do relógio (simulação) também vale
    if funcoes -> r.assinatura = 'null'::jsonb
       or (strpos(r.corpo, funcoes ->> r.assinatura) = 0 and strpos(r.corpo, 'teste.agora') = 0) then
      alheios := alheios || r.assinatura;
    end if;
  end loop;
  if cardinality(alheios) > 0 then
    raise exception 'Já existe no banco algo com o mesmo nome que não é do Oratório Digital: %. Nada foi alterado.',
      array_to_string(alheios, ', ')
      using hint = 'Mande esta mensagem para o Claude. Antes de rodar de novo nesta janela, rode: rollback;';
  end if;
end $$;


-- ───────── 1. Tabelas ─────────

-- Os números: 'total', 'visits', 'liturgias' e uma linha por oração (o slug).
create table if not exists public.contadores (
  chave         text primary key
                check (char_length(chave) <= 100 and chave ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  valor         bigint not null default 0 check (valor >= 0),
  atualizado_em timestamptz not null default now()
);

-- Histórico: quantas vezes cada chave foi contada em cada dia (horário de Brasília).
create table if not exists public.contagem_dia (
  dia   date    not null,
  chave text    not null,
  n     integer not null default 0 check (n >= 0),
  primary key (dia, chave)
);

-- Para o ler_numeros: os totais por dia saem sem varrer as linhas de cada oração.
create index if not exists contagem_dia_chave_dia_idx on public.contagem_dia (chave, dia);

-- Visitas às páginas de oração: uma por visita (o site não conta de novo ao recarregar).
create table if not exists public.visitas_oracao (
  slug          text primary key
                check (char_length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  valor         bigint not null default 0 check (valor >= 0),
  atualizado_em timestamptz not null default now()
);

-- Histórico das visitas às orações, por dia (horário de Brasília).
create table if not exists public.visitas_oracao_dia (
  dia  date    not null,
  slug text    not null,
  n    integer not null default 0 check (n >= 0),
  primary key (dia, slug)
);

-- Proteção contra abuso: quantas contagens cada rede fez em cada janela de tempo.
-- "quem" é um código embaralhado (hash) do IP + dia + sal. O IP nunca é guardado.
create table if not exists public.limites (
  quem   text        not null,
  alvo   text        not null,
  janela timestamptz not null,
  n      integer     not null default 0,
  primary key (quem, alvo, janela)
);
create index if not exists limites_janela_idx on public.limites (janela);

-- Segredos internos: o "sal" do código embaralhado (criado uma vez só).
create table if not exists public.config_privada (
  nome  text primary key,
  valor text not null
);
insert into public.config_privada (nome, valor)
values ('sal', gen_random_uuid()::text)
on conflict (nome) do nothing;

-- Importações já feitas (ex.: 'abacus'): a 2ª tentativa dá erro e nada muda.
create table if not exists public.importacoes (
  origem text primary key,
  em     timestamptz not null default now()
);

-- Os três contadores gerais já nascem com zero.
insert into public.contadores (chave)
values ('total'), ('visits'), ('liturgias')
on conflict (chave) do nothing;


-- ───────── 2. Tabelas fechadas: só as funções abaixo mexem nelas ─────────
-- RLS ligado e sem políticas = ninguém de fora lê nem escreve.

alter table public.contadores     enable row level security;
alter table public.contagem_dia   enable row level security;
alter table public.limites        enable row level security;
alter table public.config_privada enable row level security;
alter table public.importacoes    enable row level security;
alter table public.visitas_oracao     enable row level security;
alter table public.visitas_oracao_dia enable row level security;

revoke all on table public.contadores, public.contagem_dia, public.limites,
                    public.config_privada, public.importacoes,
                    public.visitas_oracao, public.visitas_oracao_dia
  from anon, authenticated, public;

-- O visitante (papel anon) precisa enxergar o esquema para chamar as funções.
grant usage on schema public to anon, authenticated;


-- ───────── 3. Funções internas (o site NÃO pode chamá-las) ─────────

-- Agora (separada para os testes poderem fixar o relógio).
create or replace function public._agora()
returns timestamptz
language sql stable
set search_path = public, pg_temp
as $$ select now() $$;

-- Hoje no horário de Brasília.
create or replace function public._hoje()
returns date
language sql stable
set search_path = public, pg_temp
as $$ select (public._agora() at time zone 'America/Sao_Paulo')::date $$;

-- Quem é o visitante, sem guardar o IP: hash sha256 de IP + dia + sal.
-- O IP vem dos cabeçalhos do pedido: cf-connecting-ip, senão o 1º do
-- x-forwarded-for, senão x-real-ip. Sem IP conhecido → null (sem limite).
create or replace function public._quem()
returns text
language plpgsql stable
set search_path = public, pg_temp
as $$
declare
  h  json;
  ip text;
  e  inet;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;  -- cabeçalhos ilegíveis: não limita
  end;
  ip := coalesce(nullif(btrim(h ->> 'cf-connecting-ip'), ''),
                 nullif(btrim(split_part(h ->> 'x-forwarded-for', ',', 1)), ''),
                 nullif(btrim(h ->> 'x-real-ip'), ''));
  if ip is null then
    return null;
  end if;
  -- IPv6: vale a rede /64 (a de uma casa ou de um celular); IPv4 fica como está
  begin
    e := ip::inet;
    if e <<= '::ffff:0.0.0.0/96'::inet then
      ip := replace(host(e), '::ffff:', '');  -- IPv4 escrito como IPv6
    elsif family(e) = 6 then
      ip := network(set_masklen(e, 64))::text;
    else
      ip := host(e);
    end if;
  exception when others then
    null;  -- formato diferente: usa o texto como veio
  end;
  return encode(sha256(convert_to(
           ip || '|' || public._hoje()::text || '|' ||
           coalesce((select c.valor from public.config_privada c where c.nome = 'sal'), ''),
           'UTF8')), 'hex');
end $$;

-- Usa 1 vaga do limite. false = limite cheio (não conta). Sem visitante = sem limite.
create or replace function public._limite_ok(p_quem text, p_alvo text, p_janela timestamptz, p_max integer)
returns boolean
language plpgsql volatile
set search_path = public, pg_temp
as $$
begin
  if p_quem is null then
    return true;
  end if;
  insert into public.limites as l (quem, alvo, janela, n)
  values (p_quem, p_alvo, p_janela, 1)
  on conflict (quem, alvo, janela) do update set n = l.n + 1
    where l.n < p_max;
  return found;  -- nada inserido nem somado = já estava no máximo
end $$;

-- Faxina: apaga os limites com mais de 2 dias.
create or replace function public._faxina()
returns void
language sql volatile
set search_path = public, pg_temp
as $$ delete from public.limites where janela < public._agora() - interval '2 days' $$;

-- Soma 1 numa chave e no histórico do dia; devolve o novo valor.
create or replace function public._somar(p_chave text, p_dia date)
returns bigint
language plpgsql volatile
set search_path = public, pg_temp
as $$
declare
  v bigint;
begin
  insert into public.contadores as c (chave, valor) values (p_chave, 1)
  on conflict (chave) do update set valor = c.valor + 1, atualizado_em = now()
  returning c.valor into v;
  insert into public.contagem_dia as d (dia, chave, n) values (p_dia, p_chave, 1)
  on conflict (dia, chave) do update set n = d.n + 1;
  return v;
end $$;

-- Resposta de contar_oracao: {oracao, total, hoje, limitado} com os números atuais.
create or replace function public._numeros(p_slug text, p_dia date, p_limitado boolean)
returns json
language sql stable
set search_path = public, pg_temp
as $$
  select json_build_object(
    'oracao',   coalesce((select c.valor from public.contadores c where c.chave = p_slug), 0),
    'total',    coalesce((select c.valor from public.contadores c where c.chave = 'total'), 0),
    'hoje',     coalesce((select d.n from public.contagem_dia d where d.dia = p_dia and d.chave = 'total'), 0),
    'limitado', p_limitado)
$$;

-- Visitas e liturgias: soma 1 (até 120 por hora por rede) e devolve o número.
create or replace function public._contar_simples(p_chave text)
returns bigint
language plpgsql volatile
set search_path = public, pg_temp
as $$
declare
  v_agora timestamptz := public._agora();
begin
  if random() < 0.02 then
    perform public._faxina();  -- de vez em quando (2% das contagens)
  end if;
  if not public._limite_ok(public._quem(), p_chave,
                           date_trunc('hour', v_agora, 'America/Sao_Paulo'), 120) then
    -- passou do limite: não conta e devolve o número atual
    return coalesce((select c.valor from public.contadores c where c.chave = p_chave), 0);
  end if;
  return public._somar(p_chave, (v_agora at time zone 'America/Sao_Paulo')::date);
end $$;


-- ───────── 4. Funções que o site chama ─────────

-- Lê os contadores. p_chaves = null → todos, mais a linha 'hoje' (orações de hoje).
-- Com uma lista → só os pedidos ('hoje' só se pedido). No máximo 500 por pedido.
-- Ordem: hoje, total, visits e liturgias primeiro; depois as mais rezadas
-- (a API do Supabase entrega no máximo 1000 linhas por pedido).
create or replace function public.ler_contadores(p_chaves text[] default null)
returns table (chave text, valor bigint)
language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
begin
  if cardinality(p_chaves) > 500 then
    raise exception using errcode = '22023', message = 'No máximo 500 chaves por pedido.';
  end if;
  return query
    select x.chave, x.valor
      from (select c.chave, c.valor
              from public.contadores c
             where p_chaves is null or c.chave = any (p_chaves)
            union all
            select 'hoje'::text,
                   coalesce((select d.n from public.contagem_dia d
                              where d.dia = public._hoje() and d.chave = 'total'), 0)::bigint
             where p_chaves is null or 'hoje' = any (p_chaves)) as x (chave, valor)
     order by x.chave in ('hoje', 'total', 'visits', 'liturgias') desc, x.valor desc, x.chave;
end $$;

-- Conta uma oração: +1 na oração, +1 no 'total' e +1 no histórico do dia,
-- tudo junto. Devolve {oracao, total, hoje, limitado}.
-- Limites por rede (só com IP conhecido): 100 por dia nesta oração e 300 por
-- hora no geral. Passou do limite: não conta e devolve os números atuais.
create or replace function public.contar_oracao(p_slug text)
returns json
language plpgsql volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_agora  timestamptz := public._agora();
  v_hoje   date        := (v_agora at time zone 'America/Sao_Paulo')::date;
  v_dia    timestamptz := v_hoje::timestamp at time zone 'America/Sao_Paulo';  -- 0h de hoje
  v_hora   timestamptz := date_trunc('hour', v_agora, 'America/Sao_Paulo');
  v_quem   text        := public._quem();
begin
  if p_slug is null or char_length(p_slug) > 100
     or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Nome de oração inválido.';
  end if;
  if p_slug in ('total', 'visits', 'liturgias', 'hoje') then
    raise exception using errcode = '22023', message = 'Nome reservado: ' || p_slug;
  end if;

  if random() < 0.02 then
    perform public._faxina();  -- de vez em quando (2% das contagens)
  end if;

  -- oração nova só enquanto houver menos de 2000 chaves (proteção contra lixo)
  if not exists (select 1 from public.contadores c where c.chave = p_slug)
     and (select count(*) from public.contadores) >= 2000 then
    return public._numeros(p_slug, v_hoje, true);
  end if;

  if not public._limite_ok(v_quem, p_slug, v_dia, 100) then
    return public._numeros(p_slug, v_hoje, true);
  end if;
  if not public._limite_ok(v_quem, 'total', v_hora, 300) then
    -- devolve a vaga da oração, que acabou não sendo contada
    update public.limites l set n = l.n - 1
     where l.quem = v_quem and l.alvo = p_slug and l.janela = v_dia and l.n > 0;
    return public._numeros(p_slug, v_hoje, true);
  end if;

  perform public._somar(p_slug, v_hoje);
  perform public._somar('total', v_hoje);
  return public._numeros(p_slug, v_hoje, false);
end $$;

-- Conta uma visita (página inicial). Devolve o número de visitas.
create or replace function public.contar_visita()
returns bigint
language sql volatile
security definer
set search_path = public, pg_temp
as $$ select public._contar_simples('visits') $$;

-- Conta uma liturgia lida. Devolve o número de liturgias.
create or replace function public.contar_liturgia()
returns bigint
language sql volatile
security definer
set search_path = public, pg_temp
as $$ select public._contar_simples('liturgias') $$;

-- Conta uma visita à página de uma oração. Devolve o número de visitas dela.
-- Limite por rede (só com IP conhecido): 300 visitas a orações por hora. Passou do
-- limite: não conta e devolve o número atual. O limite é um só para todas as orações,
-- para o banco não guardar QUAL oração cada rede abriu (nem pelo código embaralhado).
create or replace function public.contar_visita_oracao(p_slug text)
returns bigint
language plpgsql volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_agora timestamptz := public._agora();
  v_hoje  date        := (v_agora at time zone 'America/Sao_Paulo')::date;
  v_hora  timestamptz := date_trunc('hour', v_agora, 'America/Sao_Paulo');
  v_quem  text        := public._quem();
  v       bigint;
begin
  if p_slug is null or char_length(p_slug) > 100
     or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Nome de oração inválido.';
  end if;

  if random() < 0.02 then
    perform public._faxina();  -- de vez em quando (2% das contagens)
  end if;

  -- oração nova só enquanto houver menos de 2000 (proteção contra lixo)
  if not exists (select 1 from public.visitas_oracao o where o.slug = p_slug)
     and (select count(*) from public.visitas_oracao) >= 2000 then
    return 0;
  end if;

  if not public._limite_ok(v_quem, 'visitas-oracoes', v_hora, 300) then
    return coalesce((select o.valor from public.visitas_oracao o where o.slug = p_slug), 0);
  end if;

  insert into public.visitas_oracao as o (slug, valor) values (p_slug, 1)
  on conflict (slug) do update set valor = o.valor + 1, atualizado_em = now()
  returning o.valor into v;
  insert into public.visitas_oracao_dia as d (dia, slug, n) values (v_hoje, p_slug, 1)
  on conflict (dia, slug) do update set n = d.n + 1;
  return v;
end $$;

-- Os números da página "Números do Oratório" (/numeros/), tudo de uma vez:
--   total, visits, liturgias, visitas_oracoes  números de sempre
--   serie       um item por dia com movimento: [dia, orações rezadas, visitas à
--               página inicial, liturgias lidas, visitas às orações]
--   rezadas_periodo / visitadas_periodo   as mais rezadas / visitadas nos últimos p_dias dias
--   rezadas_sempre  / visitadas_sempre    as mais rezadas / visitadas desde o início
--   (listas de [oração, número], no máximo p_limite cada; p_dias de 1 a 3660, p_limite de 1 a 200)
create or replace function public.ler_numeros(p_dias integer default 30, p_limite integer default 50)
returns json
language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_hoje  date    := public._hoje();
  v_dias  integer := least(greatest(coalesce(p_dias, 30), 1), 3660);
  v_lim   integer := least(greatest(coalesce(p_limite, 50), 1), 200);
  v_desde date    := v_hoje - (v_dias - 1);
begin
  return json_build_object(
    'hoje',            v_hoje,
    'dias',            v_dias,
    'inicio',          (select min(d.dia) from public.contagem_dia d),
    'inicio_visitas',  (select min(d.dia) from public.visitas_oracao_dia d),
    'total',           coalesce((select c.valor from public.contadores c where c.chave = 'total'), 0),
    'visits',          coalesce((select c.valor from public.contadores c where c.chave = 'visits'), 0),
    'liturgias',       coalesce((select c.valor from public.contadores c where c.chave = 'liturgias'), 0),
    'visitas_oracoes', coalesce((select sum(o.valor) from public.visitas_oracao o), 0),
    'serie', coalesce((
      select json_agg(json_build_array(s.dia, s.t, s.v, s.l, s.o) order by s.dia)
        from (select x.dia, sum(x.t)::bigint as t, sum(x.v)::bigint as v,
                     sum(x.l)::bigint as l, sum(x.o)::bigint as o
                from (select d.dia,
                             case when d.chave = 'total'     then d.n else 0 end as t,
                             case when d.chave = 'visits'    then d.n else 0 end as v,
                             case when d.chave = 'liturgias' then d.n else 0 end as l,
                             0 as o
                        from public.contagem_dia d
                       where d.chave in ('total', 'visits', 'liturgias')
                      union all
                      select d.dia, 0, 0, 0, d.n
                        from public.visitas_oracao_dia d) as x
               group by x.dia) as s), '[]'::json),
    'rezadas_periodo', coalesce((
      select json_agg(json_build_array(r.chave, r.n) order by r.n desc, r.chave)
        from (select d.chave, sum(d.n)::bigint as n
                from public.contagem_dia d
               where d.dia >= v_desde and d.chave not in ('total', 'visits', 'liturgias')
               group by d.chave
               order by 2 desc, 1
               limit v_lim) as r), '[]'::json),
    'rezadas_sempre', coalesce((
      select json_agg(json_build_array(r.chave, r.valor) order by r.valor desc, r.chave)
        from (select c.chave, c.valor
                from public.contadores c
               where c.chave not in ('total', 'visits', 'liturgias') and c.valor > 0
               order by c.valor desc, c.chave
               limit v_lim) as r), '[]'::json),
    'visitadas_periodo', coalesce((
      select json_agg(json_build_array(r.slug, r.n) order by r.n desc, r.slug)
        from (select d.slug, sum(d.n)::bigint as n
                from public.visitas_oracao_dia d
               where d.dia >= v_desde
               group by d.slug
               order by 2 desc, 1
               limit v_lim) as r), '[]'::json),
    'visitadas_sempre', coalesce((
      select json_agg(json_build_array(r.slug, r.valor) order by r.valor desc, r.slug)
        from (select o.slug, o.valor
                from public.visitas_oracao o
               where o.valor > 0
               order by o.valor desc, o.slug
               limit v_lim) as r), '[]'::json)
  );
end $$;


-- ───────── 5. Quem pode chamar o quê ─────────

-- Internas: ninguém de fora.
revoke all on function
  public._agora(), public._hoje(), public._quem(),
  public._limite_ok(text, text, timestamptz, integer), public._faxina(),
  public._somar(text, date), public._numeros(text, date, boolean),
  public._contar_simples(text)
  from public, anon, authenticated;

-- As 6 do site: só executar, para o visitante (anon) e para authenticated.
revoke all on function
  public.ler_contadores(text[]), public.contar_oracao(text),
  public.contar_visita(), public.contar_liturgia(),
  public.contar_visita_oracao(text), public.ler_numeros(integer, integer)
  from public, anon, authenticated;
grant execute on function
  public.ler_contadores(text[]), public.contar_oracao(text),
  public.contar_visita(), public.contar_liturgia(),
  public.contar_visita_oracao(text), public.ler_numeros(integer, integer)
  to anon, authenticated;


-- ───────── 6. Visões só para você (Table Editor) ─────────

-- Total de cada contador em cada mês (a partir do dia em que o Supabase entrou no ar).
create or replace view public.resumo_mes with (security_invoker = true) as
  select to_char(d.dia, 'YYYY-MM') as mes, d.chave, sum(d.n)::bigint as total
    from public.contagem_dia d
   group by 1, 2
   order by 1 desc, 3 desc, 2;

-- As orações mais rezadas no mês atual.
create or replace view public.mais_rezadas_mes with (security_invoker = true) as
  select to_char(public._hoje(), 'YYYY-MM') as mes, d.chave as oracao, sum(d.n)::bigint as total
    from public.contagem_dia d
   where d.dia >= date_trunc('month', public._hoje()::timestamp)::date
     and d.chave not in ('total', 'visits', 'liturgias')
   group by d.chave
   order by 3 desc, 2;

-- As orações mais visitadas no mês atual (páginas abertas).
create or replace view public.mais_visitadas_mes with (security_invoker = true) as
  select to_char(public._hoje(), 'YYYY-MM') as mes, d.slug as oracao, sum(d.n)::bigint as visitas
    from public.visitas_oracao_dia d
   where d.dia >= date_trunc('month', public._hoje()::timestamp)::date
   group by d.slug
   order by 3 desc, 2;

revoke all on table public.resumo_mes, public.mais_rezadas_mes, public.mais_visitadas_mes
  from anon, authenticated, public;



-- ───────── 7. Marca, isolamento, aviso à API e conferência ─────────

-- Marca do que é deste arquivo (a proteção do começo confere esta marca).
comment on table public.contadores           is 'Oratório Digital — números do contador';
comment on table public.contagem_dia         is 'Oratório Digital — contagem por dia';
comment on table public.limites              is 'Oratório Digital — limites por rede (código embaralhado, apagado em 2 dias)';
comment on table public.config_privada       is 'Oratório Digital — segredos internos do contador';
comment on table public.importacoes          is 'Oratório Digital — importações feitas';
comment on table public.visitas_oracao       is 'Oratório Digital — visitas às páginas de oração';
comment on table public.visitas_oracao_dia   is 'Oratório Digital — visitas às orações por dia';
comment on view  public.resumo_mes           is 'Oratório Digital — total de cada contador por mês (só o dono)';
comment on view  public.mais_rezadas_mes     is 'Oratório Digital — mais rezadas no mês (só o dono)';
comment on view  public.mais_visitadas_mes   is 'Oratório Digital — mais visitadas no mês (só o dono)';
comment on function public._agora()                                     is 'Oratório Digital — relógio';
comment on function public._hoje()                                      is 'Oratório Digital — hoje em Brasília';
comment on function public._quem()                                      is 'Oratório Digital — código embaralhado da rede';
comment on function public._limite_ok(text, text, timestamptz, integer) is 'Oratório Digital — limite por rede';
comment on function public._faxina()                                    is 'Oratório Digital — faxina dos limites';
comment on function public._somar(text, date)                           is 'Oratório Digital — soma 1';
comment on function public._numeros(text, date, boolean)                is 'Oratório Digital — resposta de contar_oracao';
comment on function public._contar_simples(text)                        is 'Oratório Digital — visitas e liturgias';
comment on function public.ler_contadores(text[])                       is 'Oratório Digital — lê os contadores';
comment on function public.contar_oracao(text)                          is 'Oratório Digital — conta uma oração';
comment on function public.contar_visita()                              is 'Oratório Digital — conta uma visita';
comment on function public.contar_liturgia()                            is 'Oratório Digital — conta uma liturgia';
comment on function public.contar_visita_oracao(text)                   is 'Oratório Digital — conta uma visita a uma oração';
comment on function public.ler_numeros(integer, integer)                is 'Oratório Digital — números da página /numeros/';

-- O outro projeto do banco usa a chave de serviço (service_role): ela não precisa
-- ler o sal nem os códigos embaralhados do Oratório.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on table public.config_privada, public.limites from service_role;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- Tudo deve aparecer como OK.
select objeto, tipo, conferencia
from (
  select i.ordem, i.objeto, i.tipo,
         case
           when i.id is null then 'ERRO: não foi criado'
           when has_function_privilege('anon', i.id, 'execute')
            and has_function_privilege('authenticated', i.id, 'execute') then 'OK'
           else 'ERRO: o site não consegue chamar'
         end as conferencia
    from (values
      (1, 'ler_contadores',       'função do site', to_regprocedure('public.ler_contadores(text[])')::oid),
      (2, 'contar_oracao',        'função do site', to_regprocedure('public.contar_oracao(text)')::oid),
      (3, 'contar_visita',        'função do site', to_regprocedure('public.contar_visita()')::oid),
      (4, 'contar_liturgia',      'função do site', to_regprocedure('public.contar_liturgia()')::oid),
      (5, 'contar_visita_oracao', 'função do site', to_regprocedure('public.contar_visita_oracao(text)')::oid),
      (6, 'ler_numeros',          'função do site', to_regprocedure('public.ler_numeros(integer,integer)')::oid)
    ) as i(ordem, objeto, tipo, id)
  union all
  select i.ordem, i.objeto, i.tipo,
         case
           when i.id is null then 'ERRO: não foi criada'
           when not has_function_privilege('anon', i.id, 'execute')
            and not has_function_privilege('authenticated', i.id, 'execute') then 'OK'
           else 'ERRO: aberta para o público'
         end
    from (values
      (7,  '_agora',          'função interna', to_regprocedure('public._agora()')::oid),
      (8,  '_hoje',           'função interna', to_regprocedure('public._hoje()')::oid),
      (9,  '_quem',           'função interna', to_regprocedure('public._quem()')::oid),
      (10, '_limite_ok',      'função interna', to_regprocedure('public._limite_ok(text,text,timestamptz,integer)')::oid),
      (11, '_faxina',         'função interna', to_regprocedure('public._faxina()')::oid),
      (12, '_somar',          'função interna', to_regprocedure('public._somar(text,date)')::oid),
      (13, '_numeros',        'função interna', to_regprocedure('public._numeros(text,date,boolean)')::oid),
      (14, '_contar_simples', 'função interna', to_regprocedure('public._contar_simples(text)')::oid)
    ) as i(ordem, objeto, tipo, id)
  union all
  select i.ordem, i.objeto, i.tipo,
         case
           when i.id is null then 'ERRO: não foi criada'
           when coalesce((select c.relrowsecurity from pg_class c where c.oid = i.id), false)
            and not has_table_privilege('anon', i.id, 'select, insert, update, delete')
            and not has_table_privilege('authenticated', i.id, 'select, insert, update, delete') then 'OK'
           else 'ERRO: aberta para o público'
         end
    from (values
      (15, 'contadores',         'tabela fechada', to_regclass('public.contadores')::oid),
      (16, 'contagem_dia',       'tabela fechada', to_regclass('public.contagem_dia')::oid),
      (17, 'visitas_oracao',     'tabela fechada', to_regclass('public.visitas_oracao')::oid),
      (18, 'visitas_oracao_dia', 'tabela fechada', to_regclass('public.visitas_oracao_dia')::oid),
      (19, 'limites',            'tabela fechada', to_regclass('public.limites')::oid),
      (20, 'config_privada',     'tabela fechada', to_regclass('public.config_privada')::oid),
      (21, 'importacoes',        'tabela fechada', to_regclass('public.importacoes')::oid)
    ) as i(ordem, objeto, tipo, id)
  union all
  select i.ordem, i.objeto, i.tipo,
         case
           when i.id is null then 'ERRO: não foi criada'
           when not has_table_privilege('anon', i.id, 'select')
            and not has_table_privilege('authenticated', i.id, 'select') then 'OK'
           else 'ERRO: aberta para o público'
         end
    from (values
      (22, 'resumo_mes',         'visão do dono', to_regclass('public.resumo_mes')::oid),
      (23, 'mais_rezadas_mes',   'visão do dono', to_regclass('public.mais_rezadas_mes')::oid),
      (24, 'mais_visitadas_mes', 'visão do dono', to_regclass('public.mais_visitadas_mes')::oid)
    ) as i(ordem, objeto, tipo, id)
  union all
  select 25, 'sal', 'segredo interno',
         case when exists (select 1 from public.config_privada c where c.nome = 'sal')
              then 'OK' else 'ERRO: faltou o sal' end
) as x
order by ordem;
