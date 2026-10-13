// ════════════════════════════════════════════════════════════════
//  Banner responsivo (E4) — usado no build pelas páginas de oração e de biografia.
//  srcset SÓ com as variantes que existem em public/ (<nome>_w800.webp e
//  <nome>_w1200.webp, geradas no build ao lado de cada <nome>.webp) + a original
//  com a largura lida do próprio arquivo. Sem nenhuma variante: srcset vazio
//  (a página fica só com o src de sempre).
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { withBase } from '../../config/site';

// largura de um .webp pelo cabeçalho (sem bibliotecas): VP8 (com perdas), VP8L (sem perdas), VP8X (estendido)
export function larguraWebp(arq: string): number {
  try {
    const fd = fs.openSync(arq, 'r');
    const b = Buffer.alloc(30);
    fs.readSync(fd, b, 0, 30, 0);
    fs.closeSync(fd);
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return 0;
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
    if (tipo === 'VP8L') return (b.readUInt32LE(21) & 0x3fff) + 1;
    if (tipo === 'VP8X') return b.readUIntLE(24, 3) + 1;
  } catch (e) { /* arquivo ausente ou ilegível: sem largura */ }
  return 0;
}

// img: caminho público SEM o base (ex.: '/saints/pai-nosso.webp')
export function srcsetDoBanner(img: string): string {
  if (!img || /^https?:\/\//.test(img)) return '';
  const m = /^(.*)\.webp$/i.exec(img.startsWith('/') ? img : '/' + img);
  if (!m) return '';
  const partes: string[] = [];
  for (const w of [800, 1200]) {
    if (fs.existsSync(`public${m[1]}_w${w}.webp`)) partes.push(`${withBase(`${m[1]}_w${w}.webp`)} ${w}w`);
  }
  if (!partes.length) return '';
  partes.push(`${withBase(m[0])} ${larguraWebp(`public${m[0]}`) || 1600}w`);
  return partes.join(', ');
}

// o banner ocupa a largura toda da tela (object-fit: cover)
export const SIZES_BANNER = '100vw';
