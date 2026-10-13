// ════════════════════════════════════════════════════════════════
//  Mistérios do Rosário — UMA tabela para o build (sumários prontos no HTML,
//  ver preparar.ts) e para o navegador (Terço: mistérios do dia; "hoje" no
//  Rosário completo e nas quatro páginas de mistérios — ver leitor.ts).
//  Dias tradicionais (São João Paulo II, Rosarium Virginis Mariae, 2002):
//  segunda e sábado Gozosos · terça e sexta Dolorosos · quarta e domingo
//  Gloriosos · quinta Luminosos.
// ════════════════════════════════════════════════════════════════

export type Conjunto = 'gozosos' | 'luminosos' | 'dolorosos' | 'gloriosos';

export interface DadosConjunto {
  nome: string;        // "Mistérios Gozosos"
  adj: string;         // "Gozoso" (1º Mistério Gozoso — …)
  dias: number[];      // 0 = domingo … 6 = sábado
  diasTexto: string;   // "segundas-feiras e sábados"
  pagina: string;      // slug da página só deste conjunto
  misterios: string[]; // os cinco, em ordem
}

export const CONJUNTOS: Record<Conjunto, DadosConjunto> = {
  gozosos: {
    nome: 'Mistérios Gozosos', adj: 'Gozoso', dias: [1, 6], diasTexto: 'segundas-feiras e sábados',
    pagina: 'santo-rosario-misterios-gozosos',
    misterios: ['A Anunciação do Anjo a Maria', 'A Visitação de Maria a Isabel', 'O Nascimento de Jesus em Belém', 'A Apresentação do Menino Jesus no Templo', 'O Encontro do Menino Jesus no Templo'],
  },
  luminosos: {
    nome: 'Mistérios Luminosos', adj: 'Luminoso', dias: [4], diasTexto: 'quintas-feiras',
    pagina: 'santo-rosario-misterios-luminosos',
    misterios: ['O Batismo de Jesus no Jordão', 'A revelação de Jesus nas Bodas de Caná', 'O Anúncio do Reino de Deus', 'A Transfiguração do Senhor', 'A Instituição da Eucaristia'],
  },
  dolorosos: {
    nome: 'Mistérios Dolorosos', adj: 'Doloroso', dias: [2, 5], diasTexto: 'terças e sextas-feiras',
    pagina: 'santo-rosario-misterios-dolorosos',
    misterios: ['A Agonia de Jesus no Horto', 'A Flagelação do Senhor', 'A Coroação de Espinhos', 'Jesus a caminho do Calvário', 'A Crucifixão e Morte de Jesus'],
  },
  gloriosos: {
    nome: 'Mistérios Gloriosos', adj: 'Glorioso', dias: [0, 3], diasTexto: 'quartas-feiras e domingos',
    pagina: 'santo-rosario-misterios-gloriosos',
    misterios: ['A Ressurreição de Jesus', 'A Ascensão do Senhor ao Céu', 'A Vinda do Espírito Santo', 'A Assunção de Maria ao Céu', 'A Coroação de Maria, Rainha do Céu'],
  },
};

// conjunto de cada dia da semana (0 = domingo … 6 = sábado)
export const DO_DIA: Conjunto[] = ['gloriosos', 'gozosos', 'dolorosos', 'gloriosos', 'luminosos', 'dolorosos', 'gozosos'];

// ordem do Rosário completo
export const ORDEM: Conjunto[] = ['gozosos', 'luminosos', 'dolorosos', 'gloriosos'];

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DIAS_LONGOS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// qual página de mistérios é esta (pelo slug da oração)
export type ModoMisterios = 'terco' | 'rosario' | Conjunto | '';
export function modoMisterios(slug: string): ModoMisterios {
  if (slug === 'terco') return 'terco';
  if (slug === 'rosario') return 'rosario';
  for (const k of ORDEM) if (CONJUNTOS[k].pagina === slug) return k;
  return '';
}
