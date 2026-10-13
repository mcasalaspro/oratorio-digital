// ════════════════════════════════════════════════════════════════
//  OTIMIZAR IMAGENS PESADAS — para rodar de vez em quando, no computador.
//  Acha as imagens .webp acima de 500 KB em public/ e recomprime cada uma
//  (mesmo tamanho em pixels, no máximo 1600 de largura), escolhendo a MAIOR
//  qualidade que deixe o arquivo abaixo de 500 KB sem diferença visível
//  (semelhança SSIM de pelo menos 0,98 com a original). Se não der, deixa
//  a imagem como está.
//
//  node scripts/otimizar-imagens.mjs            → só mostra o que faria
//  node scripts/otimizar-imagens.mjs --aplicar  → grava (as originais ficam no git)
//
//  Imagens .jpg/.png pesadas só são listadas: trocar para .webp muda o nome
//  do arquivo, e as páginas apontam para o nome antigo.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const LIMITE = 500 * 1024;
const LARGURA_MAX = 1600;
const QUALIDADES = [82, 80, 78, 76];
const SSIM_MIN = 0.98;
const APLICAR = process.argv.includes('--aplicar');
const DERIVADO = /_(thumb|w800|w1200)\.webp$/i;

// semelhança estrutural (SSIM) em tons de cinza, blocos 8×8 a cada 4 px
async function cinza(entrada, largura) {
  const { data, info } = await sharp(entrada).resize({ width: largura }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
function ssim(a, b) {
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let soma = 0, n = 0;
  for (let y = 0; y + 8 <= a.h; y += 4) {
    for (let x = 0; x + 8 <= a.w; x += 4) {
      let ma = 0, mb = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * a.w + x + i; ma += a.data[k]; mb += b.data[k]; }
      ma /= 64; mb /= 64;
      let va = 0, vb = 0, cv = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const k = (y + j) * a.w + x + i, da = a.data[k] - ma, db = b.data[k] - mb;
        va += da * da; vb += db * db; cv += da * db;
      }
      va /= 63; vb /= 63; cv /= 63;
      soma += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      n++;
    }
  }
  return soma / n;
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
const pesadas = fs.readdirSync('public', { recursive: true }).map(String)
  .filter((f) => /\.(webp|jpe?g|png)$/i.test(f) && !DERIVADO.test(f))
  .map((f) => path.join('public', f))
  .filter((f) => fs.statSync(f).size > LIMITE)
  .sort();

let antes = 0, depois = 0, feitas = 0;
const linhas = [];
for (const arq of pesadas) {
  const buf = fs.readFileSync(arq);
  if (!/\.webp$/i.test(arq)) { linhas.push(`  ${arq} — ${kb(buf.length)}: não é .webp (converta à mão e troque o nome na página)`); continue; }
  const meta = await sharp(buf).metadata();
  const largura = Math.min(meta.width, LARGURA_MAX);
  const ref = await cinza(buf, largura);
  let escolhida = null, melhorAbaixo = null;
  for (const q of QUALIDADES) {
    const novo = await sharp(buf).resize({ width: largura, withoutEnlargement: true }).webp({ quality: q, effort: 6 }).toBuffer();
    const s = ssim(ref, await cinza(novo, largura));
    if (s < SSIM_MIN) break; // qualidades menores ficariam ainda mais diferentes
    if (novo.length < LIMITE) { escolhida = { q, novo, s }; break; }
    if (!melhorAbaixo || novo.length < melhorAbaixo.novo.length) melhorAbaixo = { q, novo, s };
  }
  // não chegou a 500 KB: aceita a menor versão fiel, se economizar ao menos 5%
  if (!escolhida && melhorAbaixo && melhorAbaixo.novo.length < buf.length * 0.95) escolhida = melhorAbaixo;
  if (!escolhida) { linhas.push(`  ${arq} — ${kb(buf.length)}: mantida (não dá para reduzir sem diferença visível)`); continue; }
  antes += buf.length; depois += escolhida.novo.length; feitas++;
  linhas.push(`  ${arq} — ${kb(buf.length)} → ${kb(escolhida.novo.length)} (${meta.width}×${meta.height}${largura < meta.width ? ` → largura ${largura}` : ''}, qualidade ${escolhida.q}, semelhança ${escolhida.s.toFixed(3)})`);
  if (APLICAR) fs.writeFileSync(arq, escolhida.novo);
}

console.log(`Imagens acima de ${kb(LIMITE)}: ${pesadas.length}`);
if (linhas.length) console.log(linhas.join('\n'));
if (feitas) console.log(`\n${APLICAR ? 'Gravadas' : 'Seriam gravadas'}: ${feitas} · ${kb(antes)} → ${kb(depois)} (economia de ${kb(antes - depois)}, ${Math.round((1 - depois / antes) * 100)}%)`);
if (feitas && !APLICAR) console.log('Para gravar: node scripts/otimizar-imagens.mjs --aplicar');
