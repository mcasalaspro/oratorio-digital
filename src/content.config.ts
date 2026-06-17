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
  }),
});

// ── Biografias (santos, mártires e outros) ──────────────────────────────────
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
  }),
});

export const collections = { prayers, biografias };
