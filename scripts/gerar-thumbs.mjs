// ════════════════════════════════════════════════════════════════
//  IMAGENS DERIVADAS — geradas no build, ao lado de cada imagem original.
//  Nunca vão para o git (estão no .gitignore).
//
//   <nome>_w800.webp e <nome>_w1200.webp
//        versões menores dos banners (só se a original for mais larga),
//        para o celular baixar menos. Pastas: saints, biografias, textos,
//        cantos, liturgia e textures (só de originais .webp).
//   <nome>_thumb.webp
//        miniatura em pé 360×480 dos cartões (recorte "entropy": fica na parte
//        mais detalhada da imagem, em geral o santo). Pastas: saints,
//        biografias e produtos (de .webp, .jpg ou .png).
//
//  Refaz os derivados de uma imagem quando ela muda (pelo conteúdo, não pela
//  data) ou quando os parâmetros deste gerador mudam. Apaga derivados cuja
//  original sumiu. A lista do que já foi feito fica em .cache/imagens-derivadas.json.
//
//  Uso: npm run thumbs   ·   npm run thumbs:force (refaz tudo)
//  Nunca derruba o build (sai sempre com 0); falhas aparecem no log e no
//  relatório do conteúdo (/ferramentas/relatorio/).
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const BANNERS = ['saints', 'biografias', 'textos', 'cantos', 'liturgia', 'textures']; // _w800 e _w1200
const MINIATURAS = ['saints', 'biografias', 'produtos'];                             // _thumb
const LARGURAS = [800, 1200];
const MINI = { largura: 360, altura: 480 };
const QUALIDADE = 78;           // _w800 e _w1200
const QUALIDADE_MINI = 74;      // _thumb
const ESFORCO = 4;              // compressão do webp (0–6): 4 = equilíbrio entre tamanho e tempo
// mudar qualquer parâmetro acima muda a versão e refaz todos os derivados
const VERSAO = 'derivados-2:' + JSON.stringify({ LARGURAS, MINI, QUALIDADE, QUALIDADE_MINI, ESFORCO, foco: 'entropy' });

const PUBLIC = 'public';
const MANIFESTO = '.cache/imagens-derivadas.json';
const RELATORIO = '.relatorio/imagens.json';
const FORCE = process.argv.includes('--force');
const PARALELO = Math.max(2, Math.min(8, os.cpus().length));
const DERIVADO = /_(thumb|w800|w1200)\.webp$/i;
const ORIGINAL = /\.(webp|png|jpe?g)$/i;

const t0 = Date.now();
const falhas = [];
const rel = (p) => p.split(path.sep).join('/');

async function main() {
  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch { console.warn('[imagens] sharp indisponível — as páginas usam as imagens originais.'); return { semSharp: true }; }

  let manifesto = { versao: '', itens: {} };
  try {
    const m = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
    if (m && m.itens) manifesto = m;
  } catch { /* primeira vez (ou lista apagada): confere tudo */ }
  const mesmaVersao = manifesto.versao === VERSAO;
  const novo = { versao: VERSAO, itens: {} };

  // 1) originais e os derivados esperados de cada uma
  const pastas = [...new Set([...BANNERS, ...MINIATURAS])];
  const trabalhos = [];
  const existentes = []; // derivados que já estão no disco (para a faxina)
  for (const p of pastas) {
    const dir = path.join(PUBLIC, p);
    let nomes = [];
    try { nomes = fs.readdirSync(dir).sort(); } catch { continue; } // pasta pode não existir
    const porBase = new Map();
    for (const n of nomes) {
      if (DERIVADO.test(n)) { existentes.push(path.join(dir, n)); continue; }
      if (!ORIGINAL.test(n)) continue;
      const t = { pasta: p, arq: path.join(dir, n), base: path.join(dir, n.replace(ORIGINAL, '')), ext: path.extname(n).toLowerCase() };
      const outra = porBase.get(t.base);
      if (outra) {
        // foo.webp e foo.jpg gerariam o mesmo foo_thumb.webp: vale a .webp
        const [fica, sai] = t.ext === '.webp' ? [t, outra] : [outra, t];
        porBase.set(t.base, fica);
        console.warn(`[imagens] ⚠️  ${rel(sai.arq)} e ${rel(fica.arq)} têm o mesmo nome: vale ${path.basename(fica.arq)}.`);
        falhas.push({ arquivo: rel(sai.arq), motivo: `mesmo nome de ${path.basename(fica.arq)} (ignorada)` });
      } else porBase.set(t.base, t);
    }
    trabalhos.push(...porBase.values());
  }

  // 2) gera (ou reaproveita) em paralelo
  let gerados = 0, imagensRefeitas = 0, reaproveitadas = 0;
  const esperados = new Set();
  let i = 0;
  async function trabalhador() {
    while (i < trabalhos.length) {
      const t = trabalhos[i++];
      const chave = rel(path.relative(PUBLIC, t.arq));
      try {
        const buf = fs.readFileSync(t.arq);
        const hash = crypto.createHash('sha1').update(buf).digest('hex');
        const antigo = manifesto.itens[chave];
        let largura = antigo && antigo.hash === hash ? antigo.largura : 0;
        if (!largura) largura = (await sharp(buf).metadata()).width || 0;
        const saidas = derivadosDe(t, largura);
        saidas.forEach((s) => esperados.add(s.arq));
        const pronto = !FORCE && mesmaVersao && antigo && antigo.hash === hash && saidas.every((s) => fs.existsSync(s.arq));
        if (pronto) { reaproveitadas++; novo.itens[chave] = antigo; continue; }
        if (saidas.length) {
          // decodifica uma vez só, já reduzida para a maior largura necessária
          const maior = Math.min(largura, LARGURAS[LARGURAS.length - 1]);
          const { data, info } = await sharp(buf).rotate().resize({ width: maior, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
          const cru = () => sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
          for (const s of saidas) {
            let img = cru();
            if (s.tipo === 'mini') img = img.resize({ width: MINI.largura, height: MINI.altura, fit: 'cover', position: sharp.strategy.entropy, withoutEnlargement: true });
            else if (s.largura < info.width) img = img.resize({ width: s.largura });
            const tmp = `${s.arq}.tmp-${process.pid}`;
            await img.webp({ quality: s.tipo === 'mini' ? QUALIDADE_MINI : QUALIDADE, effort: ESFORCO }).toFile(tmp);
            fs.renameSync(tmp, s.arq);
            gerados++;
          }
          imagensRefeitas++;
        }
        novo.itens[chave] = { hash, largura };
      } catch (e) {
        falhas.push({ arquivo: rel(t.arq), motivo: String(e && e.message || e) });
        console.warn(`[imagens] ⚠️  ${rel(t.arq)}: não deu para gerar as versões menores (${e && e.message || e}). A página usa a imagem original.`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALELO, trabalhos.length) || 1 }, trabalhador));

  // 3) faxina: derivados sem original (ou que não fazem mais sentido) e restos temporários
  let apagados = 0;
  for (const d of existentes) {
    if (esperados.has(d)) continue;
    try { fs.rmSync(d); apagados++; } catch { /* outro processo já apagou */ }
  }
  for (const p of pastas) {
    try { for (const n of fs.readdirSync(path.join(PUBLIC, p))) if (/\.webp\.tmp-\d+$/.test(n)) fs.rmSync(path.join(PUBLIC, p, n)); } catch {}
  }

  fs.mkdirSync(path.dirname(MANIFESTO), { recursive: true });
  fs.writeFileSync(MANIFESTO, JSON.stringify(novo));
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[imagens] ${trabalhos.length} originais: ${imagensRefeitas} refeita(s) (${gerados} arquivo(s) gerado(s)), ` +
    `${reaproveitadas} reaproveitada(s), ${apagados} derivado(s) antigo(s) apagado(s), ${falhas.length} falha(s) — ${s} s`);
  return { originais: trabalhos.length, refeitas: imagensRefeitas, gerados, reaproveitadas, apagados, segundos: Number(s) };
}

// derivados esperados de uma original (com a largura dela)
function derivadosDe(t, largura) {
  const out = [];
  if (BANNERS.includes(t.pasta) && t.ext === '.webp') {
    for (const w of LARGURAS) if (largura > w) out.push({ tipo: 'banner', largura: w, arq: `${t.base}_w${w}.webp` });
  }
  if (MINIATURAS.includes(t.pasta)) out.push({ tipo: 'mini', arq: `${t.base}_thumb.webp` });
  return out;
}

main()
  .then((r) => {
    // para o relatório do conteúdo (src/pages/ferramentas/relatorio.astro)
    try {
      fs.mkdirSync(path.dirname(RELATORIO), { recursive: true });
      fs.writeFileSync(RELATORIO, JSON.stringify({ quando: new Date().toISOString(), ...(r || {}), falhas }, null, 2));
    } catch { /* relatório é opcional */ }
  })
  .catch((e) => console.warn('[imagens] erro inesperado (o site usa as imagens originais):', e && e.message || e))
  .finally(() => process.exit(0));
