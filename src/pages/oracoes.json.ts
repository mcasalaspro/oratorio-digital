import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Lista leve de todas as orações, para o "Sortear uma oração" (public/js/sortear.js).
// Cada item: s = slug (o endereço é /oracao/<s>/), t = título, y = tipo e, só quando não
// for português, l = idioma. Bem menor que o search-index.json.
export const GET: APIRoute = async () => {
  const oracoes = (await getCollection('prayers'))
    .map((p) => {
      const l = p.data.language ?? 'pt-BR';
      return l === 'pt-BR' ? { s: p.id, t: p.data.title, y: p.data.type } : { s: p.id, t: p.data.title, y: p.data.type, l };
    })
    .sort((a, b) => a.s.localeCompare(b.s));
  return new Response(JSON.stringify(oracoes), { headers: { 'content-type': 'application/json' } });
};
