// Gera versões "_thumb.webp" (menores) de cada imagem em public/saints/.
// Roda automaticamente antes do build. Nunca derruba o build (sai sempre com 0).
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIR = 'public/saints';
const WIDTH = 560;     // largura do thumbnail (suficiente para os cards, leve)
const QUALITY = 70;

async function main() {
  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch { console.warn('[thumbs] sharp indisponível — cards usarão a imagem normal.'); return; }

  let files = [];
  try { files = await readdir(DIR); } catch { return; }
  const fulls = files.filter((f) => f.endsWith('.webp') && !f.endsWith('_thumb.webp'));

  let made = 0;
  for (const f of fulls) {
    const base = f.slice(0, -'.webp'.length);
    const full = path.join(DIR, f);
    const thumb = path.join(DIR, `${base}_thumb.webp`);
    try {
      let regen = !existsSync(thumb);
      if (!regen) {
        const [a, b] = await Promise.all([stat(full), stat(thumb)]);
        regen = a.mtimeMs > b.mtimeMs; // imagem grande mudou -> refaz o thumb
      }
      if (!regen) continue;
      await sharp(full).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(thumb);
      made++;
    } catch (e) { console.warn(`[thumbs] falhou em ${f}: ${e.message}`); }
  }
  if (made) console.log(`[thumbs] ${made} thumbnail(s) gerado(s) em ${DIR}/`);
}
main().catch((e) => console.warn('[thumbs] erro:', e.message)).finally(() => process.exit(0));
