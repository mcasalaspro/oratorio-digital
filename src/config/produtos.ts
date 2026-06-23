import fs from 'node:fs';
import { load as yamlLoad } from 'js-yaml';
import { withBase } from './site';

export type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  imagem?: string;
  link: string;
  paginas: string[];
  santo?: string;
};

// Categorias comuns (só aparecem na página /produtos quando têm itens)
export const CATEGORIAS: { key: string; pt: string; en: string }[] = [
  { key: 'livro', pt: 'Livros', en: 'Books' },
  { key: 'vestuario', pt: 'Vestuário', en: 'Apparel' },
  { key: 'acessorio', pt: 'Acessórios', en: 'Accessories' },
  { key: 'arte', pt: 'Arte e imagens', en: 'Art & images' },
  { key: 'terco', pt: 'Terços e rosários', en: 'Rosaries' },
  { key: 'medalha', pt: 'Medalhas', en: 'Medals' },
  { key: 'curso', pt: 'Cursos', en: 'Courses' },
  { key: 'outro', pt: 'Outros', en: 'Other' },
];

const norm = (s: string) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

let _cache: Produto[] | null = null;

export function getProdutos(): Produto[] {
  if (_cache) return _cache;
  let arr: any[] = [];
  try {
    const raw = fs.readFileSync('src/data/produtos.yaml', 'utf-8');
    const loaded = yamlLoad(raw);
    if (Array.isArray(loaded)) arr = loaded;
  } catch {
    arr = [];
  }
  _cache = arr
    .filter((p) => p && p.nome && p.link)
    .map((p, i) => ({
      id: String(p.id ?? `produto-${i}`),
      nome: String(p.nome),
      descricao: p.descricao != null ? String(p.descricao) : undefined,
      categoria: String(p.categoria ?? 'outro').toLowerCase(),
      imagem: p.imagem != null ? String(p.imagem) : undefined,
      link: String(p.link),
      paginas: Array.isArray(p.paginas) ? p.paginas.map((s: any) => String(s)) : [],
      santo: p.santo != null ? String(p.santo) : undefined,
    }));
  return _cache;
}

// Produtos relacionados a uma página (por slug listado em "paginas" OU por santo)
export function produtosForPage(slug: string, saint?: string): Produto[] {
  const sn = norm(saint ?? '');
  return getProdutos().filter((p) => {
    if (p.paginas.includes(slug)) return true;
    if (p.santo && sn) {
      const ps = norm(p.santo);
      return !!ps && (sn.includes(ps) || ps.includes(sn));
    }
    return false;
  });
}

// Resolve a imagem: link externo como está; local usa thumb se existir
export function produtoImagem(p: Produto): string {
  if (!p.imagem) return withBase('/produtos/default.webp');
  if (/^https?:\/\//i.test(p.imagem)) return p.imagem;
  const path = p.imagem.startsWith('/') ? p.imagem : `/produtos/${p.imagem}`;
  const thumbPath = path.replace(/\.(webp|png|jpe?g)$/i, '_thumb.webp');
  try {
    if (fs.existsSync(`public${thumbPath}`)) return withBase(thumbPath);
  } catch {}
  return withBase(path);
}

// Agrupa por categoria, mantendo só as categorias que têm produtos
export function categoriasComProdutos() {
  const prods = getProdutos();
  return CATEGORIAS
    .map((c) => ({ ...c, items: prods.filter((p) => p.categoria === c.key) }))
    .filter((c) => c.items.length > 0);
}

export function catLabelPt(key: string): string {
  return CATEGORIAS.find((c) => c.key === key)?.pt ?? 'Outros';
}
