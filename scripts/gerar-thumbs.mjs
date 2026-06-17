// Gera "_thumb.webp" (versão leve) das imagens em public/saints/.
// Só processa as que FALTAM ou cuja imagem mudou (reaproveita as existentes).
// Roda em paralelo para ser rápido. Use "--force" para refazer todas.
// Nunca derruba o build (sai sempre com 0).
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIRS = ['public/saints', 'public/biografias'];
const WIDTH = 560;        // largura do thumbnail (leve e suficiente para os cards)
const QUALITY = 70;
const CONCURRENCY = 8;
const FORCE = process.argv.includes('--force');

async function main() {
  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch { console.warn('[thumbs] sharp indisponível — cards usarão a imagem normal.'); return; }

  const todo = [];
  let reused = 0;
  for (const DIR of DIRS) {
    let files = [];
    try { files = await readdir(DIR); } catch { continue; } // pasta pode não existir ainda
    const fulls = files.filter((f) => f.endsWith('.webp') && !f.endsWith('_thumb.webp'));
    for (const f of fulls) {
      const base = f.slice(0, -'.webp'.length);
      const full = path.join(DIR, f);
      const thumb = path.join(DIR, `${base}_thumb.webp`);
      if (!FORCE && existsSync(thumb)) {
        try {
          const [a, b] = await Promise.all([stat(full), stat(thumb)]);
          if (a.mtimeMs <= b.mtimeMs) { reused++; continue; }
        } catch { reused++; continue; }
      }
      todo.push({ full, thumb, name: f });
    }
  }

  // gera em paralelo (com limite) -> primeiro build rápido
  let made = 0, idx = 0;
  async function worker() {
    while (idx < todo.length) {
      const job = todo[idx++];
      try {
        await sharp(job.full).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(job.thumb);
        made++;
      } catch (e) { console.warn(`[thumbs] falhou em ${job.name}: ${e.message}`); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) || 1 }, worker));

  if (made || reused) console.log(`[thumbs] ${made} gerado(s), ${reused} reutilizado(s) (${DIRS.join(', ')})`);
}
main().catch((e) => console.warn('[thumbs] erro:', e.message)).finally(() => process.exit(0));
