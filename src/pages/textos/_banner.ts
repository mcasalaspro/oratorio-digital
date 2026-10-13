// Banner de fundo responsivo (textos, cantos e "Sobre"). O "_" no nome tira este arquivo das rotas.
// Usa a imagem de public/ e as variantes <nome>_w800.webp e <nome>_w1200.webp QUE EXISTIREM
// (geradas à parte); sem variantes, fica só a imagem original, como antes.
import fs from 'node:fs';
import { withBase } from '../../config/site';

// largura e altura de um .webp, lidas do cabeçalho do arquivo (sem dependências)
function medidas(arquivo: string): { w: number; h: number } | null {
  try {
    const fd = fs.openSync(arquivo, 'r');
    const b = Buffer.alloc(32);
    fs.readSync(fd, b, 0, 32, 0);
    fs.closeSync(fd);
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (tipo === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >>> 14) & 0x3fff) + 1 }; }
  } catch (e) { /* arquivo ausente ou ilegível: segue sem medidas */ }
  return null;
}

export function banner(caminho: string) {
  const m = medidas(`public${caminho}`);
  const raiz = caminho.replace(/\.webp$/i, '');
  const fontes: string[] = [];
  for (const sufixo of ['_w800', '_w1200']) {
    const v = `${raiz}${sufixo}.webp`;
    const mv = fs.existsSync(`public${v}`) ? medidas(`public${v}`) : null;
    if (mv && (!m || mv.w < m.w)) fontes.push(`${withBase(v)} ${mv.w}w`);
  }
  if (fontes.length && m) fontes.push(`${withBase(caminho)} ${m.w}w`);
  return { src: withBase(caminho), srcset: fontes.length ? fontes.join(', ') : undefined, width: m?.w, height: m?.h };
}
