import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { withBase } from '../config/site';

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const GET: APIRoute = async () => {
  const prayers = await getCollection('prayers');
  const bios = await getCollection('biografias');
  const items = [
    ...prayers.map((p) => ({
      kind: 'oracao' as const,
      type: p.data.type,
      title: p.data.title,
      sub: p.data.saint ?? '',
      url: withBase(`/oracao/${p.id}`),
      s: norm(`${p.data.title} ${p.data.saint ?? ''} ${p.data.tags.join(' ')} ${p.data.description}`),
    })),
    ...bios.map((b) => ({
      kind: 'biografia' as const,
      type: b.data.title ?? '',
      title: b.data.name ?? b.id,
      sub: b.data.patronage ?? '',
      url: withBase(`/biografia/${b.id}`),
      s: norm(`${b.data.name ?? b.id} ${b.data.title ?? ''} ${b.data.patronage ?? ''} ${b.data.tags.join(' ')} ${b.data.summary}`),
    })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
};
