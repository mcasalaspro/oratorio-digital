#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  CÓPIA DOS NÚMEROS DO CONTADOR (usada pelo robô diário do GitHub,
//  .github/workflows/contador-diario.yml)
//
//  Lê todos os contadores do Supabase e grava um arquivo assim:
//    { "gerado_em": "2026-10-12T09:17:03.000Z",
//      "contadores": { "liturgias": 12, "pai-nosso": 345, "total": 6789, "visits": 4321 } }
//
//  Uso: node scripts/backup-contador.mjs caminho/contadores.json
//   - Supabase ainda não configurado em src/config/site.ts → avisa e sai sem erro.
//   - Números iguais aos do arquivo que já existe → mantém o arquivo como está.
//   - Falha de rede ou do Supabase (3 tentativas, 20 s cada) → sai com erro (código 1).
//  Sem dependências (Node 22).
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const PRAZO_MS = 20_000;        // espera no máximo 20 s por resposta
const ESPERAS_MS = [5_000, 15_000]; // pausa antes da 2ª e da 3ª tentativa

const destino = process.argv[2];
if (!destino) {
  console.error('Uso: node scripts/backup-contador.mjs caminho/contadores.json');
  process.exit(2);
}

// ── 1. Configuração: supabaseUrl e supabaseKey de src/config/site.ts ──
const SITE_TS = new URL('../src/config/site.ts', import.meta.url);
const siteTs = fs.readFileSync(SITE_TS, 'utf8');
function campo(nome) {
  // a linha "nome: '…'" (não pega linhas comentadas com //)
  const m = siteTs.match(new RegExp(`^[ \\t]*${nome}[ \\t]*:[ \\t]*(['"\`])(.*?)\\1`, 'm'));
  return m ? m[2].trim() : '';
}
const url = campo('supabaseUrl').replace(/\/+$/, '').replace(/\/rest\/v1$/, ''); // aceita também o endereço com /rest/v1
const chave = campo('supabaseKey');
if (!url || !chave) {
  console.log('Supabase não configurado (supabaseUrl/supabaseKey vazios em src/config/site.ts): nada a copiar.');
  process.exit(0);
}
if (ehChaveSecreta(chave)) {
  console.error('ERRO GRAVE: a supabaseKey em src/config/site.ts é uma chave SECRETA (Secret key / service_role).');
  console.error('Ela dá acesso total ao banco e está publicada no site. Troque AGORA pela "Publishable key"');
  console.error('(sb_publishable_…) e, no Supabase, gere uma Secret key nova (Settings → API Keys).');
  process.exit(1);
}

// ── 2. Leitura: ler_contadores(null), com prazo e novas tentativas ──
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function lerUmaVez() {
  const r = await fetch(`${url}/rest/v1/rpc/ler_contadores`, {
    method: 'POST',
    headers: { apikey: chave, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ p_chaves: null }),
    signal: AbortSignal.timeout(PRAZO_MS),
  });
  const texto = await r.text();
  if (!r.ok) {
    const e = new Error(`o Supabase respondeu ${r.status}: ${texto.slice(0, 200)}`);
    e.status = r.status;
    throw e;
  }
  let linhas;
  try { linhas = JSON.parse(texto); } catch { throw new Error('a resposta não é JSON'); }
  if (!Array.isArray(linhas)) throw new Error('resposta inesperada (não é uma lista)');
  return linhas;
}
function motivo(e) {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return `sem resposta em ${PRAZO_MS / 1000} s`;
  if (e?.status) return e.message;
  const causa = e?.cause?.code || e?.cause?.message || e?.message || String(e);
  return `falha de rede (${causa})`;
}
const temporario = (e) => !e?.status || e.status >= 500 || e.status === 408 || e.status === 429;

let linhas = null;
for (let tentativa = 1; tentativa <= ESPERAS_MS.length + 1; tentativa++) {
  try {
    linhas = await lerUmaVez();
    break;
  } catch (e) {
    console.error(`Tentativa ${tentativa}: ${motivo(e)}`);
    if (e?.status === 401 || e?.status === 403) {
      console.error('ERRO: o Supabase recusou a chave. Confira a supabaseKey (Publishable key) em src/config/site.ts.');
      process.exit(1);
    }
    if (e?.status === 404) {
      console.error('ERRO: a função ler_contadores não foi encontrada. Rode o supabase/contador.sql no SQL Editor do Supabase.');
      process.exit(1);
    }
    if (!temporario(e)) {
      console.error(`ERRO: o Supabase respondeu com erro (${e.status}).`);
      process.exit(1);
    }
    if (tentativa > ESPERAS_MS.length) {
      console.error(`ERRO: não deu para ler o Supabase (${url}) depois de ${tentativa} tentativas.`);
      console.error('O site continua funcionando; a última cópia guardada continua valendo.');
      process.exit(1);
    }
    await espera(ESPERAS_MS[tentativa - 1]);
  }
}

// ── 3. Monta a cópia (sem a linha 'hoje') ──
const contadores = {};
for (const l of linhas) {
  if (!l || typeof l.chave !== 'string' || l.chave === 'hoje') continue;
  const n = Number(l.valor);
  if (Number.isFinite(n) && n >= 0) contadores[l.chave] = n;
}
const ordenados = Object.fromEntries(Object.keys(contadores).sort().map((k) => [k, contadores[k]]));
const soma = Object.values(ordenados).reduce((s, n) => s + n, 0);

// ── 4. Compara com a cópia que já existe ──
let anterior = null;
try { anterior = JSON.parse(fs.readFileSync(destino, 'utf8')); } catch { /* ainda não há cópia */ }
const antes = anterior && typeof anterior === 'object' ? (anterior.contadores ?? null) : null;
if (antes && JSON.stringify(antes) === JSON.stringify(ordenados)) {
  console.log(`Os números não mudaram desde a última cópia (${anterior.gerado_em ?? 'sem data'}): arquivo mantido.`);
  process.exit(0);
}
// proteção: Supabase zerado (projeto novo ou apagado) não apaga uma cópia boa
const totalAntes = Number(antes?.total) || 0;
if (soma === 0 && totalAntes > 0) {
  console.error(`ERRO: o Supabase devolveu todos os contadores zerados, mas a última cópia tinha ${totalAntes} orações.`);
  console.error('Para não perder a cópia boa, nada foi gravado. Confira se o projeto do Supabase é o certo.');
  console.error('(Se você zerou os números de propósito, apague o contadores.json do ramo "dados" no GitHub.)');
  process.exit(1);
}

// ── 5. Grava ──
const copia = { gerado_em: new Date().toISOString(), contadores: ordenados };
fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
const tmp = `${destino}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(copia, null, 2) + '\n');
fs.renameSync(tmp, destino);
console.log(`Cópia gravada em ${destino}: ${Object.keys(ordenados).length} contadores · ` +
  `total ${ordenados.total ?? 0} · visitas ${ordenados.visits ?? 0} · liturgias ${ordenados.liturgias ?? 0}.`);

// chave secreta: sb_secret_… ou um JWT antigo com role service_role
function ehChaveSecreta(k) {
  if (/^sb_secret_/i.test(k)) return true;
  const partes = k.split('.');
  if (partes.length !== 3) return false;
  try {
    const carga = JSON.parse(Buffer.from(partes[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return carga?.role === 'service_role';
  } catch {
    return false;
  }
}
