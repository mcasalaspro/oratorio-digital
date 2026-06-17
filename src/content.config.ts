import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ── Orações / conteúdo devocional ──────────────────────────────────────────
// Cada item é um arquivo .md em src/content/prayers/.
// Adicionar um arquivo = adicionar conteúdo no site. Remover = remover.
const prayers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prayers' }),
  schema: z.object({
    title: z.string(),
    // Tipos de conteúdo possíveis (escolha o mais específico):
    //   oracao      → oração avulsa
    //   novena      → novena (9 dias) — use também totalDays e novenaSuggestedStart
    //   terco       → terço (uma volta do rosário)
    //   dezena      → dezena (uma dezena)
    //   rosario     → rosário completo
    //   ladainha    → ladainha / litania
    //   hino        → hino / cântico
    //   devocional  → devoção, consagração, oferecimento, mês dedicado, etc.
    //   liturgia    → liturgia, ofício, vésperas, laudes, completas
    //   bizantina   → oração da tradição bizantina / oriental (acatistos, etc.)
    //   outro       → qualquer outro
    type: z.enum([
      'oracao', 'novena', 'terco', 'dezena', 'rosario',
      'ladainha', 'hino', 'devocional', 'liturgia', 'bizantina', 'outro',
    ]),
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

// ── Biografias (santos, mártires e outros) ──────────────────────────────────
// Cada biografia é um arquivo .md em src/content/biografias/.
// Imagem em public/biografias/<slug>.webp (o build gera o _thumb leve sozinho).
const biografias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/biografias' }),
  schema: z.object({
    name: z.string(),                 // nome (ex.: "Santo Antônio de Pádua")
    title: z.string().optional(),     // ex.: "Doutor da Igreja", "Mártir", "Virgem"
    feast: z.string().optional(),     // "MM-DD" (dia litúrgico)
    born: z.string().optional(),      // ex.: "1195, Lisboa"
    died: z.string().optional(),      // ex.: "1231, Pádua"
    patronage: z.string().optional(), // ex.: "objetos perdidos, pobres"
    image: z.string().optional(),     // padrão: /biografias/<slug>.webp
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),  // resumo curto (aparece no card)
    language: z.string().default('pt-BR'),
    featured: z.boolean().default(false),
    order: z.number().optional(),
    relatedPrayers: z.array(z.string()).default([]), // slugs de orações ligadas
  }),
});

export const collections = { prayers, biografias };
