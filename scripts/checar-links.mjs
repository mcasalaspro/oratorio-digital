// ════════════════════════════════════════════════════════════════
//  CONFERÊNCIA DE LINKS — usada pelo robô mensal (.github/workflows/links.yml)
//  Confere, no site já compilado (dist/), todos os links das páginas:
//   • internos (páginas, imagens e arquivos do próprio site, e o sitemap.xml);
//   • externos (Amazon e outros sites).
//  Resultado:
//   • interno quebrado ............................. ERRO
//   • externo que não existe mais (404 ou 410) ...... ERRO
//   • externo que bloqueou robôs ou não respondeu (429, 503, 403, tempo
//     esgotado…) ........................... "não deu para verificar" (não falha)
//  Uso: npm run build && npm run links
//       node scripts/checar-links.mjs [pasta-dist] [--sem-externos]
//  Termina com erro (1) só se houver ERRO; a lista vai também para o resumo
//  da execução no GitHub.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DIST = args.find((a) => !a.startsWith('--')) || 'dist';
const SEM_EXTERNOS = args.includes('--sem-externos');
const PRAZO_MS = 20_000;
const PARALELO = 6;           // sites diferentes ao mesmo tempo
const PAUSA_MESMO_SITE = 1500; // ms entre dois pedidos ao mesmo site (Amazon bloqueia rajadas)
const AGENTE = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 OratorioDigital-links/1.0';

// endereço do site (astro.config.mjs): links absolutos para ele contam como internos
let SITE = 'https://www.oratoriodigital.com', BASE = '/';
try {
  const cfg = fs.readFileSync('astro.config.mjs', 'utf8');
  SITE = (/\bsite:\s*['"]([^'"]+)['"]/.exec(cfg) || [])[1] || SITE;
  BASE = (/\bbase:\s*['"]([^'"]+)['"]/.exec(cfg) || [])[1] || BASE;
} catch { /* usa o padrão */ }
const ORIGENS = new Set();
try { const u = new URL(SITE); ORIGENS.add(u.host); ORIGENS.add(u.host.replace(/^www\./, '')); ORIGENS.add('www.' + u.host.replace(/^www\./, '')); } catch {}

function paginasHtml(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String)) if (f.endsWith('.html')) out.push(f.split(path.sep).join('/'));
  return out.sort();
}
const ENTIDADES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>' };
const desentidade = (s) => s.replace(/&(amp|quot|#39|apos|lt|gt);/g, (m) => ENTIDADES[m]);

// links de uma página: href/src/srcset/poster das tags e as imagens de prévia (og:image)
function linksDe(html) {
  const out = [];
  const semScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.slice(0, m.indexOf('>') + 1)).replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of semScripts.matchAll(/<(a|link|img|source|script|iframe|video|audio|meta|use|image)\b[^>]*>/gi)) {
    const t = tag[0], nome = tag[1].toLowerCase();
    for (const at of t.matchAll(/\s(href|src|srcset|poster|content|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const attr = at[1].toLowerCase();
      const valor = desentidade(at[2] ?? at[3] ?? at[4] ?? '').trim();
      if (nome === 'meta') {
        if (attr === 'content' && /(property|name)=["']?(og:image|og:url|twitter:image)(["'\s>]|$)/i.test(t)) out.push(valor);
        continue;
      }
      if (attr === 'content') continue;
      if (nome === 'link' && attr === 'href' && /rel=["']?(preconnect|dns-prefetch)/i.test(t)) continue; // só a origem
      if (attr === 'srcset') for (const parte of valor.split(',')) { const u = parte.trim().split(/\s+/)[0]; if (u) out.push(u); }
      else out.push(valor);
    }
  }
  return out;
}

// classifica: null (ignorar) | { interno: caminho } | { externo: url }
function classificar(url, paginaRel) {
  if (!url || url.startsWith('#') || /^(mailto|tel|sms|javascript|data|blob|whatsapp|about):/i.test(url) || url.includes('${') || url.includes('{{')) return null;
  let u;
  try { u = new URL(url, `${SITE.replace(/\/$/, '')}/${paginaRel.replace(/index\.html$/, '').replace(/[^/]*\.html$/, '')}`); } catch { return { invalido: url }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (ORIGENS.has(u.host)) return { interno: decodeURIComponent(u.pathname) };
  u.hash = '';
  return { externo: u.href };
}

// o arquivo do dist que atende um caminho do site
function existeNoDist(caminho) {
  let p = caminho;
  const base = BASE.replace(/\/$/, '');
  if (base && p.startsWith(base + '/')) p = p.slice(base.length);
  p = p.replace(/^\/+/, '');
  const cand = p === '' || p.endsWith('/') ? [path.join(DIST, p, 'index.html')]
    : path.extname(p) ? [path.join(DIST, p)]
      : [path.join(DIST, p, 'index.html'), path.join(DIST, p + '.html'), path.join(DIST, p)];
  return cand.some((c) => { try { return fs.statSync(c).isFile(); } catch { return false; } });
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function pedir(url, metodo) {
  const r = await fetch(url, { method: metodo, redirect: 'follow', signal: AbortSignal.timeout(PRAZO_MS), headers: { 'user-agent': AGENTE, accept: 'text/html,application/xhtml+xml,image/*,*/*;q=0.8', 'accept-language': 'pt-BR,pt;q=0.9' } });
  try { await r.body?.cancel(); } catch {}
  return r.status;
}
// { situacao: 'ok' | 'quebrado' | 'incerto', detalhe }
async function conferirExterno(url) {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      let s = await pedir(url, 'HEAD');
      if (s >= 400) s = await pedir(url, 'GET'); // muitos sites recusam HEAD: confirma com GET
      if (s < 400) return { situacao: 'ok', detalhe: String(s) };
      if (s === 404 || s === 410) return { situacao: 'quebrado', detalhe: `${s} (não existe mais)` };
      if ((s === 429 || s >= 500) && tentativa === 1) { await espera(5000); continue; }
      return { situacao: 'incerto', detalhe: `${s}${s === 429 ? ' (muitos pedidos)' : s === 403 ? ' (bloqueou robôs)' : s >= 500 ? ' (site com problema)' : ''}` };
    } catch (e) {
      const motivo = e?.name === 'TimeoutError' ? `sem resposta em ${PRAZO_MS / 1000} s` : `falha de rede (${e?.cause?.code || e?.message || e})`;
      if (tentativa === 1) { await espera(3000); continue; }
      return { situacao: 'incerto', detalhe: motivo };
    }
  }
  return { situacao: 'incerto', detalhe: 'sem resposta' };
}

async function principal() {
  if (!fs.existsSync(DIST)) { console.error(`Não achei a pasta ${DIST}: rode "npm run build" antes.`); return 2; }
  const paginas = paginasHtml(DIST);
  const internos = new Map(), externos = new Map(), invalidos = new Map();
  const anotar = (mapa, chave, pagina) => { const s = mapa.get(chave) || new Set(); s.add(pagina); mapa.set(chave, s); };
  for (const rel of paginas) {
    const html = fs.readFileSync(path.join(DIST, rel), 'utf8');
    const pagina = '/' + rel.replace(/index\.html$/, '');
    for (const url of linksDe(html)) {
      const c = classificar(url, rel);
      if (!c) continue;
      if (c.interno != null) anotar(internos, c.interno, pagina);
      else if (c.externo) anotar(externos, c.externo, pagina);
      else if (c.invalido) anotar(invalidos, c.invalido, pagina);
    }
  }
  // sitemap.xml: cada endereço tem que existir
  try {
    for (const m of fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const c = classificar(desentidade(m[1].trim()), 'sitemap.xml');
      if (c?.interno != null) anotar(internos, c.interno, '/sitemap.xml');
    }
  } catch { /* sem sitemap */ }

  const quebradosInternos = [...internos].filter(([p]) => !existeNoDist(p));
  console.log(`${paginas.length} páginas · ${internos.size} links internos diferentes · ${externos.size} externos`);

  const resultados = new Map();
  if (!SEM_EXTERNOS && externos.size) {
    // um site por vez em cada "fila" (com pausa), vários sites em paralelo
    const porSite = new Map();
    for (const url of externos.keys()) { const h = new URL(url).host; porSite.set(h, [...(porSite.get(h) || []), url]); }
    const filas = [...porSite.values()];
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(PARALELO, filas.length) }, async () => {
      while (i < filas.length) {
        const fila = filas[i++];
        for (let k = 0; k < fila.length; k++) {
          if (k) await espera(PAUSA_MESMO_SITE);
          resultados.set(fila[k], await conferirExterno(fila[k]));
        }
      }
    }));
  }
  const quebradosExternos = [...externos].filter(([u]) => resultados.get(u)?.situacao === 'quebrado');
  const incertos = [...externos].filter(([u]) => resultados.get(u)?.situacao === 'incerto');

  const ondeTxt = (paginasSet) => { const l = [...paginasSet]; return l.slice(0, 4).join(', ') + (l.length > 4 ? ` e mais ${l.length - 4}` : ''); };
  const bloco = (titulo, itens, detalhe) => {
    if (!itens.length) return;
    console.log(`\n${titulo} (${itens.length}):`);
    for (const [u, pags] of itens) console.log(`  ${u}${detalhe ? ` — ${detalhe(u)}` : ''}\n      em: ${ondeTxt(pags)}`);
  };
  bloco('✗ LINKS INTERNOS QUEBRADOS', quebradosInternos);
  bloco('✗ LINKS EXTERNOS QUE NÃO EXISTEM MAIS', quebradosExternos, (u) => resultados.get(u).detalhe);
  bloco('! Não deu para verificar (o site bloqueou ou não respondeu; não é erro)', incertos, (u) => resultados.get(u).detalhe);
  bloco('! Links mal escritos', [...invalidos]);
  const okExt = [...resultados.values()].filter((r) => r.situacao === 'ok').length;
  const erros = quebradosInternos.length + quebradosExternos.length;
  const resumo = `${quebradosInternos.length} interno(s) quebrado(s) · ${SEM_EXTERNOS ? 'externos não conferidos' : `${quebradosExternos.length} externo(s) que não existem mais · ${okExt} externo(s) OK · ${incertos.length} não deu para verificar`}`;
  console.log(`\n${erros ? '✗' : '✓'} ${resumo}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = (itens, detalhe) => itens.map(([u, p]) => `| ${u.replace(/\|/g, '%7C')} | ${detalhe ? detalhe(u) : ''} | ${ondeTxt(p)} |`).join('\n');
    let s = `### Links: ${erros ? `${erros} problema(s)` : 'tudo certo'}\n\n${resumo}\n\n`;
    if (quebradosInternos.length) s += `#### Internos quebrados\n| Link | | Onde aparece |\n|---|---|---|\n${md(quebradosInternos)}\n\n`;
    if (quebradosExternos.length) s += `#### Externos que não existem mais\n| Link | Resposta | Onde aparece |\n|---|---|---|\n${md(quebradosExternos, (u) => resultados.get(u).detalhe)}\n\n`;
    if (incertos.length) s += `<details><summary>Não deu para verificar (${incertos.length}) — não é erro</summary>\n\n| Link | Resposta | Onde aparece |\n|---|---|---|\n${md(incertos, (u) => resultados.get(u).detalhe)}\n\n</details>\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s);
  }
  return erros ? 1 : 0;
}

principal().then((c) => process.exit(c), (e) => { console.error('Erro inesperado na conferência de links:', e); process.exit(2); });
