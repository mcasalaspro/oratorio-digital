// ════════════════════════════════════════════════════════════════
//  Orações que saíram do site por serem duplicadas (A12, 13/10/2026).
//  O endereço antigo continua funcionando: /oracao/<antigo>/ leva para /oracao/<novo>/
//  (página src/pages/oracao/[antigo].astro, fora do Google e do sitemap), e os
//  favoritos guardados no aparelho passam sozinhos para a oração que ficou.
//  Para acrescentar: 'endereço-antigo': 'endereço-que-ficou'.
// ════════════════════════════════════════════════════════════════
export const oracoesMovidas: Record<string, string> = {
  'oracao-anjo-guarda': 'oracao-anjo-da-guarda',
  'oracao-santa-gertrudes-pelas-almas-purgatorio': 'oracao-santa-gertrudes-almas',
  'oracao-sao-ricardo-chichester-dia-apos-dia': 'oracao-sao-ricardo-chichester',
  'de-profundis-salmo-129': 'profundis-salmo-130-pelos-defuntos',
  'novena-santo-antonio': 'novena-santo-antonio-padua',
};
