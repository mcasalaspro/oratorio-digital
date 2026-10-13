// ════════════════════════════════════════════════════════════════
//  AVISOS DO BUILD NO RELATÓRIO (usado pela publicação, .github/workflows/deploy.yml)
//  Lê o log do build, separa os avisos (sem repetir) e os coloca na última seção
//  da página /ferramentas/relatorio/ (dist/ferramentas/relatorio/index.html) e
//  no resumo da execução no GitHub. Nunca falha: sem log ou sem página, só avisa.
//  Uso: node scripts/relatorio-avisos.mjs caminho/do/build.log [pasta-dist]
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const [, , arqLog, dist = 'dist'] = process.argv;
const PAGINA = path.join(dist, 'ferramentas', 'relatorio', 'index.html');

// avisos conhecidos, explicados em português
const EXPLICA = [
  [/The collection "liturgia" does not exist or is empty|No files found matching "\*\*\/\*\.md" in directory "src\/content\/liturgia"/,
    'A Liturgia ainda não tem arquivos (normal enquanto o conteúdo não chega).'],
  [/The collection "([^"]+)" does not exist or is empty/, 'A coleção "$1" está vazia.'],
  [/Duplicate id "([^"]+)"/, 'Dois arquivos com o mesmo endereço ("$1"): só um aparece no site.'],
];

function avisosDoLog(texto) {
  const contagem = new Map();
  for (let l of texto.split(/\r?\n/)) {
    l = l.replace(/\x1b\[[0-9;]*m/g, '')             // cores do terminal
      .replace(/^\s*\d{2}:\d{2}:\d{2}\s+/, '')         // hora do Astro
      .replace(/^\s*└─\s+\S+?\.html\s*/, '')           // "└─ /pagina.html" grudado no aviso
      .replace(/\(\+\d+ms\)\s*$/, '')
      .trim();
    if (!l || !/⚠️|\[WARN\]|\bwarn(ing)?\b|does not exist or is empty/i.test(l)) continue;
    l = l.replace(/^\[WARN\]\s*/, '').replace(/^⚠️\s*/, '').trim();
    for (const [re, pt] of EXPLICA) {
      const m = re.exec(l);
      if (m) { l = pt.replace(/\$(\d)/g, (_, i) => m[+i] ?? ''); break; } // aviso conhecido: só a explicação
    }
    contagem.set(l, (contagem.get(l) || 0) + 1);
  }
  return [...contagem.entries()].map(([msg, vezes]) => ({ msg, vezes }));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function principal() {
  let log = '';
  try { log = fs.readFileSync(arqLog, 'utf8'); } catch {
    console.log(`Sem o log do build (${arqLog || 'não informado'}): o relatório fica sem os avisos do build.`);
    return;
  }
  const avisos = avisosDoLog(log);
  const html = avisos.length
    ? `<p class="rel-nota">${avisos.length} aviso(s) diferente(s) no build desta publicação:</p><ul>` +
      avisos.map((a) => `<li>${esc(a.msg)}${a.vezes > 1 ? ` <span class="rel-vezes">(${a.vezes} vezes)</span>` : ''}</li>`).join('') + '</ul>'
    : '<p class="rel-ok">Nenhum aviso no build desta publicação.</p>';
  try {
    const pag = fs.readFileSync(PAGINA, 'utf8');
    const re = /(<div id="avisos-build"[^>]*>)[\s\S]*?(<\/div>)/;
    if (!re.test(pag)) throw new Error('marcador da seção não encontrado');
    // a classe gerada pelo Astro (data-astro-cid-…) vai junto, para o estilo da página valer
    const cid = (pag.match(/<div id="avisos-build"[^>]*?(data-astro-cid-[\w-]+)/) || [])[1];
    const comCid = cid ? html.replace(/<(p|ul|li|span)( |>)/g, `<$1 ${cid}$2`) : html;
    fs.writeFileSync(PAGINA, pag.replace(re, `$1${comCid}$2`));
    console.log(`Relatório: ${avisos.length} aviso(s) do build juntados em ${PAGINA}.`);
  } catch (e) {
    console.log(`Não deu para juntar os avisos ao relatório (${e.message}).`);
  }
  if (process.env.GITHUB_STEP_SUMMARY && avisos.length) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Avisos do build (${avisos.length})\n\n` +
      avisos.map((a) => `- ${a.msg.replace(/\|/g, '\\|')}${a.vezes > 1 ? ` (${a.vezes} vezes)` : ''}`).join('\n') +
      '\n\nRelatório completo do conteúdo: /ferramentas/relatorio/\n');
  }
}

try { principal(); } catch (e) { console.log('Avisos do build: erro inesperado (ignorado):', e?.message || e); }
process.exit(0);
