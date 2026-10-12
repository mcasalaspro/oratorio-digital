import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ── Orações / conteúdo devocional ──────────────────────────────────────────
// Cada item é um arquivo .md em src/content/prayers/.
// Os campos usam .catch() para que um cabeçalho com erro de digitação
// NÃO derrube o build inteiro — no pior caso o item usa um valor padrão.
const prayers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prayers' }),
  schema: z.object({
    title: z.string().catch('Sem título'),
    // Tipos: oracao | novena | terco | dezena | rosario | ladainha | hino |
    //        devocional | liturgia | bizantina | outro
    type: z.enum([
      'oracao', 'novena', 'terco', 'dezena', 'rosario',
      'ladainha', 'hino', 'devocional', 'liturgia', 'bizantina', 'outro',
    ]).catch('oracao'),
    totalDays: z.number().int().positive().optional().catch(undefined), // só novenas
    language: z.string().catch('pt-BR').default('pt-BR'),
    saint: z.string().optional().catch(undefined),
    image: z.string().optional().catch(undefined),
    thumbnail: z.string().optional().catch(undefined),
    parallaxImage: z.string().optional().catch(undefined),
    tags: z.array(z.string()).catch([]).default([]),
    description: z.string().catch('').default(''),

    featured: z.boolean().catch(false).default(false),
    featuredOrder: z.number().optional().catch(undefined),

    liturgicalFeast: z.string().optional().catch(undefined),  // "MM-DD"
    liturgicalColor: z.enum(['advento', 'ordinario', 'festa', 'martir']).optional().catch(undefined),
    novenaSuggestedStart: z.number().int().optional().catch(undefined),
    // OPCIONAL: trecho da imagem "Stories e Status". Sem ele, usam-se as primeiras
    // linhas do texto da oração (nunca a nota histórica nem as rubricas).
    destaque: z.string().optional().catch(undefined),
  }),
});

// ── Biografias (santos, mártires e outros) ──────────────────────────────────
// Categorias das biografias (filtro "Categoria" da página /biografias).
// Lista FECHADA: cada chave tem rótulo próprio (cat_<chave> em src/config/site.ts).
export const CATEGORIAS_BIO = [
  'martir', 'doutor', 'virgem', 'bispo', 'papa', 'apostolo', 'anjo',
  'diacono', 'religioso', 'fundador', 'profeta', 'vidente', 'realeza', 'maria',
] as const;
// Aceita lista ([martir, virgem]) ou texto ("martir, virgem"), com ou sem acento/maiúscula.
// Chave desconhecida (erro de digitação) é ignorada, com aviso no log — as outras valem.
function categoriasBio(v: unknown) {
  if (v == null || v === '') return undefined;
  const lista = (typeof v === 'string' ? v.split(',') : Array.isArray(v) ? v : [v])
    .map((x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
    .filter(Boolean);
  const validas = (CATEGORIAS_BIO as readonly string[]);
  const ruins = lista.filter((x) => !validas.includes(x));
  if (ruins.length) console.warn(`\n⚠️  Biografia com categoria desconhecida (ignorada): ${ruins.join(', ')} — use: ${CATEGORIAS_BIO.join(', ')}\n`);
  return [...new Set(lista.filter((x) => validas.includes(x)))];
}

// 'name' é OPCIONAL de propósito: se faltar, a página usa o nome do arquivo
// como reserva (e avisa no log) — assim um cabeçalho incompleto não quebra
// o build. Os demais campos usam .catch() para tolerar tipos errados.
const biografias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/biografias' }),
  schema: z.object({
    name: z.string().optional().catch(undefined),
    title: z.string().optional().catch(undefined),
    feast: z.string().optional().catch(undefined),
    born: z.string().optional().catch(undefined),
    died: z.string().optional().catch(undefined),
    patronage: z.string().optional().catch(undefined),
    image: z.string().optional().catch(undefined),
    tags: z.array(z.string()).catch([]).default([]),
    summary: z.string().catch('').default(''),
    language: z.string().catch('pt-BR').default('pt-BR'),
    featured: z.boolean().catch(false).default(false),
    order: z.number().optional().catch(undefined),
    relatedPrayers: z.array(z.string()).catch([]).default([]),
    // OPCIONAL. Ex.: categorias: [martir, virgem] — chaves de CATEGORIAS_BIO (acima).
    // Sem este campo, a página deduz as categorias pelas tags (só palavras inteiras).
    categorias: z.preprocess(categoriasBio, z.array(z.enum(CATEGORIAS_BIO)).optional()).catch(undefined),
    // OPCIONAL: frase da imagem "Stories e Status". Sem ela, a primeira citação (>)
    // do texto, se for curta; senão, o summary.
    frase: z.string().optional().catch(undefined),
  }),
});

// ── Textos (tipo blog: explicações, formação, devoção) ──────────────────────
// Cada item é um arquivo .md em src/content/textos/. Basta criar um novo .md
// com o cabeçalho abaixo que ele aparece automaticamente na página /textos.
const textos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/textos' }),
  schema: z.object({
    title: z.string().catch('Sem título'),
    description: z.string().catch('').default(''),
    summary: z.string().catch('').default(''),   // resumo curto (aparece no card)
    order: z.number().optional().catch(undefined), // ordena os cards (menor primeiro)
    icon: z.string().optional().catch(undefined),   // emoji/símbolo do card (opcional)
  }),
});

// ── Cantos litúrgicos (partes cantadas da Missa) ────────────────────────────
// Cada item é um arquivo .md em src/content/cantos/.
const cantos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cantos' }),
  schema: z.object({
    title: z.string().catch('Sem título'),
    description: z.string().catch('').default(''),
    summary: z.string().catch('').default(''),
    categoria: z.string().optional().catch(undefined), // ordinario | proprio | aclamacao | mariano | outro
    order: z.number().optional().catch(undefined),
    icon: z.string().optional().catch(undefined),
    tags: z.array(z.string()).catch([]).default([]),
  }),
});

// ── Liturgia do dia (a Liturgia da Palavra de cada dia) ─────────────────────
// Cada dia é um arquivo em src/content/liturgia/ chamado AAAAMMDD_Liturgia.md
// (ex.: 20260711_Liturgia.md) — assim os arquivos ficam em ordem cronológica.
// A DATA é lida do próprio nome do arquivo; se houver muitos, pode organizar
// em subpastas por ano (ex.: src/content/liturgia/2026/20260711_Liturgia.md).
const liturgia = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/liturgia' }),
  schema: z.object({
    title: z.string().catch('Liturgia do dia'),      // ex.: "São Bento, abade"
    date: z.string().optional().catch(undefined),     // "MM-DD" (perene)
    rank: z.string().optional().catch(undefined),     // Solenidade | Festa | Memória | Féria…
    semana: z.string().optional().catch(undefined),   // ex.: "14ª Semana do Tempo Comum"
    cor: z.string().optional().catch(undefined),      // verde | branco | roxo | vermelho | rosa
    leituras: z.array(z.string()).catch([]).default([]), // referências: ["Is 6,1-8", "Sl 92…", "Mt 10,24-33"]
    description: z.string().catch('').default(''),
    summary: z.string().catch('').default(''),
    tags: z.array(z.string()).catch([]).default([]),
  }),
});

export const collections = { prayers, biografias, textos, cantos, liturgia };
