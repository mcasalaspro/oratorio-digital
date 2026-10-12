-- ════════════════════════════════════════════════════════════════
--  ORATÓRIO DIGITAL — BANCO DO CONTADOR (Supabase)
--
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  No fim aparece uma tabela com "OK" em todas as linhas.
--  Pode rodar de novo quando quiser: nenhum número se perde.
--
--  O site só usa as 4 funções públicas (ler_contadores, contar_oracao,
--  contar_visita, contar_liturgia). As tabelas ficam fechadas para fora.
--  "Hoje" é sempre no horário de Brasília (America/Sao_Paulo).
--  Explicações: supabase/LEIA-ME.md
-- ════════════════════════════════════════════════════════════════


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

revoke all on table public.contadores, public.contagem_dia, public.limites,
                    public.config_privada, public.importacoes
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


-- ───────── 5. Quem pode chamar o quê ─────────

-- Internas: ninguém de fora.
revoke all on function
  public._agora(), public._hoje(), public._quem(),
  public._limite_ok(text, text, timestamptz, integer), public._faxina(),
  public._somar(text, date), public._numeros(text, date, boolean),
  public._contar_simples(text)
  from public, anon, authenticated;

-- As 4 do site: só executar, para o visitante (anon) e para authenticated.
revoke all on function
  public.ler_contadores(text[]), public.contar_oracao(text),
  public.contar_visita(), public.contar_liturgia()
  from public, anon, authenticated;
grant execute on function
  public.ler_contadores(text[]), public.contar_oracao(text),
  public.contar_visita(), public.contar_liturgia()
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

revoke all on table public.resumo_mes, public.mais_rezadas_mes
  from anon, authenticated, public;


-- ───────── 7. Avisa a API e confere ─────────

notify pgrst, 'reload schema';

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
      (1, 'ler_contadores',  'função do site', to_regprocedure('public.ler_contadores(text[])')::oid),
      (2, 'contar_oracao',   'função do site', to_regprocedure('public.contar_oracao(text)')::oid),
      (3, 'contar_visita',   'função do site', to_regprocedure('public.contar_visita()')::oid),
      (4, 'contar_liturgia', 'função do site', to_regprocedure('public.contar_liturgia()')::oid)
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
      (5,  '_agora',          'função interna', to_regprocedure('public._agora()')::oid),
      (6,  '_hoje',           'função interna', to_regprocedure('public._hoje()')::oid),
      (7,  '_quem',           'função interna', to_regprocedure('public._quem()')::oid),
      (8,  '_limite_ok',      'função interna', to_regprocedure('public._limite_ok(text,text,timestamptz,integer)')::oid),
      (9,  '_faxina',         'função interna', to_regprocedure('public._faxina()')::oid),
      (10, '_somar',          'função interna', to_regprocedure('public._somar(text,date)')::oid),
      (11, '_numeros',        'função interna', to_regprocedure('public._numeros(text,date,boolean)')::oid),
      (12, '_contar_simples', 'função interna', to_regprocedure('public._contar_simples(text)')::oid)
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
      (13, 'contadores',     'tabela fechada', to_regclass('public.contadores')::oid),
      (14, 'contagem_dia',   'tabela fechada', to_regclass('public.contagem_dia')::oid),
      (15, 'limites',        'tabela fechada', to_regclass('public.limites')::oid),
      (16, 'config_privada', 'tabela fechada', to_regclass('public.config_privada')::oid),
      (17, 'importacoes',    'tabela fechada', to_regclass('public.importacoes')::oid)
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
      (18, 'resumo_mes',       'visão do dono', to_regclass('public.resumo_mes')::oid),
      (19, 'mais_rezadas_mes', 'visão do dono', to_regclass('public.mais_rezadas_mes')::oid)
    ) as i(ordem, objeto, tipo, id)
  union all
  select 20, 'sal', 'segredo interno',
         case when exists (select 1 from public.config_privada c where c.nome = 'sal')
              then 'OK' else 'ERRO: faltou o sal' end
) as x
order by ordem;
