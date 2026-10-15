// ════════════════════════════════════════════════════════════════
//  Mistérios do Rosário — UMA tabela para o build (sumários prontos no HTML,
//  ver preparar.ts) e para o navegador (Terço: mistérios do dia; "hoje" no
//  Rosário completo e nas quatro páginas de mistérios — ver misterios-dia.ts).
//
//  Duas distribuições da semana (a pessoa escolhe no Terço e no Rosário completo;
//  fica guardada no aparelho em "od-rosario"):
//  • 'jp2' (padrão) — proposta de São João Paulo II, Rosarium Virginis Mariae (2002),
//    n. 38: segunda e sábado Gozosos · terça e sexta Dolorosos · quarta e domingo
//    Gloriosos · quinta Luminosos.
//  • 'trad' — o Rosário tradicional, de quinze mistérios (sem os Luminosos), com a
//    praxe anterior a 2002 descrita no mesmo n. 38: segunda e quinta Gozosos · terça e
//    sexta Dolorosos · quarta, sábado e domingo Gloriosos.
//  Os Luminosos foram acrescentados em 2002 e deixados "à livre valorização de cada
//  pessoa e das comunidades" (RVM, n. 19).
// ════════════════════════════════════════════════════════════════

export type Conjunto = 'gozosos' | 'luminosos' | 'dolorosos' | 'gloriosos';
export type Distribuicao = 'jp2' | 'trad';

export interface DadosConjunto {
  nome: string;                              // "Mistérios Gozosos"
  adj: string;                               // "Gozoso" (1º Mistério Gozoso — …)
  diasTexto: Record<Distribuicao, string>;   // "segundas-feiras e sábados"
  pagina: string;                            // slug da página só deste conjunto
  misterios: string[];                       // os cinco, em ordem
}

export const CONJUNTOS: Record<Conjunto, DadosConjunto> = {
  gozosos: {
    nome: 'Mistérios Gozosos', adj: 'Gozoso',
    diasTexto: { jp2: 'segundas-feiras e sábados', trad: 'segundas e quintas-feiras' },
    pagina: 'santo-rosario-misterios-gozosos',
    misterios: ['A Anunciação do Anjo a Maria', 'A Visitação de Maria a Isabel', 'O Nascimento de Jesus em Belém', 'A Apresentação do Menino Jesus no Templo', 'O Encontro do Menino Jesus no Templo'],
  },
  luminosos: {
    nome: 'Mistérios Luminosos', adj: 'Luminoso',
    diasTexto: { jp2: 'quintas-feiras', trad: 'facultativos, desde 2002' },
    pagina: 'santo-rosario-misterios-luminosos',
    misterios: ['O Batismo de Jesus no Jordão', 'A revelação de Jesus nas Bodas de Caná', 'O Anúncio do Reino de Deus', 'A Transfiguração do Senhor', 'A Instituição da Eucaristia'],
  },
  dolorosos: {
    nome: 'Mistérios Dolorosos', adj: 'Doloroso',
    diasTexto: { jp2: 'terças e sextas-feiras', trad: 'terças e sextas-feiras' },
    pagina: 'santo-rosario-misterios-dolorosos',
    misterios: ['A Agonia de Jesus no Horto', 'A Flagelação do Senhor', 'A Coroação de Espinhos', 'Jesus a caminho do Calvário', 'A Crucifixão e Morte de Jesus'],
  },
  gloriosos: {
    nome: 'Mistérios Gloriosos', adj: 'Glorioso',
    diasTexto: { jp2: 'quartas-feiras e domingos', trad: 'quartas-feiras, sábados e domingos' },
    pagina: 'santo-rosario-misterios-gloriosos',
    misterios: ['A Ressurreição de Jesus', 'A Ascensão do Senhor ao Céu', 'A Vinda do Espírito Santo', 'A Assunção de Maria ao Céu', 'A Coroação de Maria, Rainha do Céu'],
  },
};

// conjunto de cada dia da semana (0 = domingo … 6 = sábado), nas duas distribuições
export const DO_DIA_POR: Record<Distribuicao, Conjunto[]> = {
  jp2: ['gloriosos', 'gozosos', 'dolorosos', 'gloriosos', 'luminosos', 'dolorosos', 'gozosos'],
  trad: ['gloriosos', 'gozosos', 'dolorosos', 'gloriosos', 'gozosos', 'dolorosos', 'gloriosos'],
};
export const DISTRIBUICAO_PADRAO: Distribuicao = 'jp2';
export const CHAVE_DISTRIBUICAO = 'od-rosario';   // localStorage: 'trad' ou 'jp2'

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
