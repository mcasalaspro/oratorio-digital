import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ui, withBase } from '../config/site';

// Índice da busca global (lupa do topo; o script está em src/layouts/Base.astro).
// Cada item: k = tipo (o oração, b biografia, t texto, c canto), y = tipo da oração,
// u = endereço, ti = título, su = linha de baixo; t/n/g/d = título, santo, tags e
// descrição JÁ normalizados (sem acento, minúsculas, só letras e números) — a busca
// dá mais pontos ao que aparece no título, depois no santo, nas tags e na descrição.
const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// títulos das seções do texto (## …): ajudam a achar "credo", "kyrie", "fortaleza"…
const secoes = (body?: string) =>
  (body || '').split('\n').filter((l) => /^#{2,4}\s/.test(l)).map((l) => l.replace(/^#+\s*/, '').replace(/[*_`]/g, '')).join(' ');

// nome do tipo em português (Terço, Novena, Ladainha…) entra nas tags: "ladainha" acha todas
const PT = ui['pt-BR'] as Record<string, string>;
const nomeTipo = (t: string) => (t && t !== 'outro' && PT[`type_${t}`]) || '';

export const GET: APIRoute = async () => {
  const [prayers, bios, textos, cantos] = await Promise.all([
    getCollection('prayers'), getCollection('biografias'), getCollection('textos'), getCollection('cantos'),
  ]);
  const items = [
    ...prayers.map((p) => ({
      k: 'o', y: p.data.type,
      u: withBase(`/oracao/${p.id}`),
      // linha de baixo: o santo, só quando acrescenta algo ("Novena a São José" já diz "São José")
      ti: p.data.title, su: p.data.saint && !norm(p.data.title).includes(norm(p.data.saint)) ? p.data.saint : '',
      t: norm(p.data.title), n: norm(p.data.saint ?? ''),
      g: norm(`${p.data.tags.join(' ')} ${nomeTipo(p.data.type)}`), d: norm(p.data.description),
    })),
    ...bios.map((b) => ({
      k: 'b', y: '',
      u: withBase(`/biografia/${b.id}`),
      ti: b.data.name ?? b.id, su: b.data.title ?? b.data.patronage ?? '',
      t: norm(b.data.name ?? b.id), n: norm(`${b.data.title ?? ''} ${b.data.patronage ?? ''}`),
      g: norm(b.data.tags.join(' ')), d: norm(b.data.summary),
    })),
    ...textos.map((x) => ({
      k: 't', y: '',
      u: withBase(`/textos/${x.id}`),
      ti: x.data.title, su: x.data.summary || x.data.description,
      t: norm(x.data.title), n: '',
      g: '', d: norm(`${x.data.description} ${x.data.summary} ${secoes(x.body)}`),
    })),
    ...cantos.map((x) => ({
      k: 'c', y: '',
      u: withBase(`/cantos/${x.id}`),
      ti: x.data.title, su: x.data.summary || x.data.description,
      t: norm(x.data.title), n: '',
      g: norm(x.data.tags.join(' ')), d: norm(`${x.data.description} ${x.data.summary} ${secoes(x.body)}`),
    })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
};
