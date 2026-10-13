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
  linha?: number; // linha do produto em src/data/produtos.yaml (para o relatório)
};

/** Problema achado em src/data/produtos.yaml (aparece no log do build e no relatório). */
export type ProblemaProduto = { linha: number; msg: string };

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

const ARQUIVO = 'src/data/produtos.yaml';

const norm = (s: string) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let _cache: Produto[] | null = null;
let _problemas: ProblemaProduto[] = [];

// ── Leitura do produtos.yaml ──
// Um erro de digitação NÃO some calado: vira aviso no log do build (arquivo e linha)
// e no relatório /ferramentas/relatorio/. Se só um produto estiver estragado, os
// outros continuam no site (o arquivo é lido produto a produto).
export function getProdutos(): Produto[] {
  if (_cache) return _cache;
  _problemas = [];
  const problema = (linha: number, msg: string) => _problemas.push({ linha, msg });
  const lista: Produto[] = [];
  const ids = new Set<string>();
  for (const { p, linha } of lerItens(problema)) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) { problema(linha, 'item que não é um produto (cada produto começa com "- id: …")'); continue; }
    const rotulo = p.id != null ? `"${p.id}" ` : '';
    if (!p.nome || !p.link) { problema(linha, `produto ${rotulo}sem ${!p.nome ? 'nome' : 'link'}: fica fora do site`); continue; }
    const id = String(p.id ?? `produto-${lista.length}`);
    if (ids.has(id)) problema(linha, `id "${id}" repetido: use um id diferente para cada produto`);
    ids.add(id);
    let categoria = norm(String(p.categoria ?? 'outro'));
    if (!CATEGORIAS.some((c) => c.key === categoria)) {
      problema(linha, `categoria "${p.categoria}" desconhecida: o produto vai para "Outros" (use: ${CATEGORIAS.map((c) => c.key).join(', ')})`);
      categoria = 'outro';
    }
    const link = String(p.link).trim();
    if (!/^https?:\/\//i.test(link)) problema(linha, `link "${link}" não começa com https:// — o botão do produto não vai funcionar`);
    const imagem = p.imagem != null && String(p.imagem).trim() ? String(p.imagem).trim() : undefined;
    if (imagem && !/^https?:\/\//i.test(imagem)) {
      const caminho = imagem.startsWith('/') ? imagem : `/produtos/${imagem}`;
      if (!fs.existsSync(`public${caminho}`)) problema(linha, `imagem public${caminho} não encontrada: o cartão fica sem foto`);
    }
    if (p.paginas != null && !Array.isArray(p.paginas)) problema(linha, `"paginas" deve ser uma lista, ex.: paginas: [pai-nosso, ave-maria]`);
    lista.push({
      id,
      nome: String(p.nome),
      descricao: p.descricao != null ? String(p.descricao) : undefined,
      categoria,
      imagem,
      link,
      paginas: Array.isArray(p.paginas) ? p.paginas.map((s: any) => String(s)) : p.paginas != null ? [String(p.paginas)] : [],
      santo: p.santo != null ? String(p.santo) : undefined,
      linha: linha || undefined,
    });
  }
  for (const pr of _problemas) console.warn(`⚠️  ${ARQUIVO}, linha ${pr.linha}: ${pr.msg}`);
  _cache = lista;
  return _cache;
}

/** Problemas do produtos.yaml (vazio = tudo certo). */
export function problemasProdutos(): ProblemaProduto[] {
  getProdutos();
  return _problemas;
}

// cada produto do arquivo, com a linha onde começa
function lerItens(problema: (linha: number, msg: string) => void): { p: any; linha: number }[] {
  let raw: string;
  try { raw = fs.readFileSync(ARQUIVO, 'utf-8'); } catch { return []; } // sem o arquivo: sem produtos
  const blocos = blocosDoArquivo(raw);
  try {
    const tudo = yamlLoad(raw);
    if (tudo == null) return [];
    if (!Array.isArray(tudo)) { problema(1, 'o arquivo deve ser uma lista de produtos, cada um começando com "- "'); return []; }
    return tudo.map((p, i) => ({ p, linha: blocos.length === tudo.length ? blocos[i].linha : 0 }));
  } catch (e: any) {
    // erro de digitação: lê produto por produto e salva os que estão certos
    const ok: { p: any; linha: number }[] = [];
    let achou = false;
    for (const b of blocos) {
      try {
        const v = yamlLoad(b.texto);
        if (Array.isArray(v)) for (const p of v) ok.push({ p, linha: b.linha });
      } catch (e2: any) {
        achou = true;
        problema(b.linha + linhaDoErro(b.texto, e2), `erro de digitação: ${explicar(e2)}. Este produto fica fora do site; os outros continuam`);
      }
    }
    if (!achou) problema(1 + linhaDoErro(raw, e), `erro de digitação: ${explicar(e)}. Nenhum produto foi lido`);
    return ok;
  }
}

// "- " no começo da linha abre um produto
function blocosDoArquivo(raw: string): { texto: string; linha: number }[] {
  const linhas = raw.split(/\r?\n/);
  const out: { texto: string; linha: number }[] = [];
  let atual: { linhas: string[]; linha: number } | null = null;
  linhas.forEach((l, i) => {
    if (/^-(\s|$)/.test(l)) {
      if (atual) out.push({ texto: atual.linhas.join('\n'), linha: atual.linha });
      atual = { linhas: [l], linha: i + 1 };
    } else if (atual) atual.linhas.push(l);
  });
  if (atual) out.push({ texto: (atual as any).linhas.join('\n'), linha: (atual as any).linha });
  return out;
}

// linha (0-based, dentro do texto) do erro; aspas não fechadas: a linha onde a aspa abriu
function linhaDoErro(texto: string, e: any): number {
  const linhas = texto.split(/\r?\n/);
  let i = Math.min(e?.mark?.line ?? 0, linhas.length - 1);
  if (/quoted scalar|deficient indentation/.test(e?.reason || '')) {
    for (let j = i; j >= 0; j--) if (((linhas[j].match(/"/g) || []).length) % 2) { i = j; break; }
  }
  return i;
}

function explicar(e: any): string {
  const r = String(e?.reason || e?.message || e);
  if (/quoted scalar|deficient indentation/.test(r)) return `aspas abertas e não fechadas, ou recuo errado (${r})`;
  if (/bad indentation|mapping values/.test(r)) return `recuo errado ou um valor com ":" sem aspas (${r})`;
  if (/duplicated mapping key/.test(r)) return `o mesmo campo aparece duas vezes (${r})`;
  return `${r} — confira aspas, dois-pontos e o recuo`;
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

// Resolve a imagem: link externo como está; local usa a miniatura (gerada no build) se existir
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
