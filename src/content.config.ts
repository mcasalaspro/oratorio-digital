import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Toda oração/novena é um arquivo .md em src/content/prayers/.
// Adicionar um arquivo = adicionar conteúdo no site. Remover = remover.
const prayers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prayers' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['oracao', 'novena', 'rosario', 'terco', 'dezena', 'outro']),
    totalDays: z.number().int().positive().optional(), // só novenas
    language: z.string().default('pt-BR'),             // pt-BR, en, es, it, la...
    saint: z.string().optional(),
    image: z.string().optional(),         // banner da página de leitura (/saints/...)
    thumbnail: z.string().optional(),     // miniatura no card
    parallaxImage: z.string().optional(), // camada flutuante opcional no paralaxe
    tags: z.array(z.string()).default([]),
    description: z.string().default(''),

    // Destaque manual (também controlável pelo painel src/config/site.ts)
    featured: z.boolean().default(false),
    featuredOrder: z.number().optional(),

    // Calendário litúrgico — destaque automático
    liturgicalFeast: z.string().optional(),  // "MM-DD" (ex.: "06-13")
    liturgicalColor: z.enum(['advento', 'ordinario', 'festa', 'martir']).optional(),
    novenaSuggestedStart: z.number().int().optional(), // dias ANTES da festa (ex.: -9)
  }),
});

export const collections = { prayers };
