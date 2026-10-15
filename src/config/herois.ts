// ════════════════════════════════════════════════════════════════
//  Fundos da abertura — "espaços de oração" (public/textures/hero-<k>.webp, 1536×1024)
//  • A abertura sorteia um a cada visita (nunca o mesmo da anterior): src/pages/index.astro.
//  • "Compartilhar o Oratório" usa o mesmo fundo que a pessoa está vendo (na abertura) ou
//    um deles ao acaso (no Sobre): src/components/CompartilharOratorio.astro.
//  • "cel" = recorte no celular, no tablet e na imagem em pé de Stories (object-position):
//    a parte da imagem que tem sentido sozinha. No computador a imagem aparece inteira.
//  Imagem nova: o arquivo em public/textures/ + uma linha aqui.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { withBase } from './site';
import { srcsetDoBanner } from '../scripts/oracao/banner';

export const HEROIS: { k: string; cel: string; nota: string }[] = [
  { k: 'manha', cel: '4% 40%', nota: 'janela ao amanhecer: crucifixo, rosas e a Bíblia' },
  { k: 'capela', cel: '72% 40%', nota: 'capela: o altar ao fundo e as velas votivas' },
  { k: 'oratorio', cel: '90% 40%', nota: 'oratório mineiro com as imagens' },
  { k: 'mesa', cel: '100% 40%', nota: 'mesa de oração: o ícone, o lírio e o crucifixo' },
];

export interface Heroi { k: string; cel: string; arq: string; u: string; s: string }

// só os que existem em public/ (com o caminho-base e as versões menores, se houver)
export function heroisDisponiveis(): Heroi[] {
  return HEROIS.filter((h) => fs.existsSync(`public/textures/hero-${h.k}.webp`)).map((h) => {
    const arq = `/textures/hero-${h.k}.webp`;
    return { k: h.k, cel: h.cel, arq, u: withBase(arq), s: srcsetDoBanner(arq) };
  });
}
