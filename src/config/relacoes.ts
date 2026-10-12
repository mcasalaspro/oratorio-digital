// ════════════════════════════════════════════════════════════════
//  LIGAÇÕES ORAÇÃO ↔ BIOGRAFIA (regra única, usada pelas duas páginas)
//  - src/pages/oracao/[...slug].astro   → "Conheça a vida de …"
//  - src/pages/biografia/[...slug].astro → "Orações relacionadas"
//
//  Liga pelo NOME do santo: campo `saint` da oração × `name` da biografia.
//  NUNCA liga só pela data da festa; a data serve apenas para desempatar
//  quando mais de uma biografia combina com o nome.
// ════════════════════════════════════════════════════════════════

// palavras que não identificam a pessoa (títulos e ligações)
const TITULOS = new Set(['sao', 'santo', 'santa', 'santos', 'santas', 'beato', 'beata', 'bem', 'aventurado', 'aventurada', 'veneravel', 'papa', 'padre', 'frei', 'dom', 'irma', 'madre']);
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'd']);
// palavras comuns a muitos nomes: sozinhas não bastam para ligar
const GENERICOS = new Set(['jesus', 'cristo', 'maria', 'nossa', 'senhora', 'menino', 'sagrado', 'sagrada', 'coracao', 'santissimo', 'santissima', 'mae', 'deus', 'apostolo', 'arcanjo', 'martir', 'virgem', 'doutor', 'igreja', 'abade', 'bispo', 'confessor', 'evangelista', 'rainha', 'familia']);

// Outros nomes da MESMA pessoa (conferidos nos dados). Escreva em qualquer
// grafia: os dois lados passam por norm(). Troca apenas a expressão inteira.
//  - "São Tomás Morus" (oração, 1478–1535)        = "São Tomás More" (biografia, 1478–1535)
//  - "Santa Teresa do Menino Jesus" (Oferecimento ao Amor Misericordioso, título "Santa Teresinha")
//                                                  = "Santa Teresinha do Menino Jesus" (Lisieux)
//  - "Santa Gertrudes de Helfta" (oração pelas almas do Purgatório)
//                                                  = "Santa Gertrudes Magna" (biografia: "a mística de Helfta")
//  - "Maria Santíssima — Maternidade Divina" (novena da Solenidade de 1º de janeiro)
//                                                  = "Maria Santíssima, Mãe de Deus" (biografia, festa 01-01)
const APELIDOS: Array<[string, string]> = [
  ['Tomás Morus', 'Tomás More'],
  ['Teresa do Menino Jesus', 'Teresinha do Menino Jesus'],
  ['Gertrudes de Helfta', 'Gertrudes Magna'],
  ['Maria Santíssima Maternidade Divina', 'Maria Santíssima Mãe de Deus'],
];

/** Minúsculas, sem acentos; o que não for letra vira espaço; espaços colapsados. */
export function norm(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

const _apelidos = APELIDOS.map(([de, para]) => [` ${norm(de)} `, ` ${norm(para)} `] as const);
function comApelidos(n: string): string {
  let s = ` ${n} `;
  for (const [de, para] of _apelidos) s = s.split(de).join(para);
  return s.trim();
}

const _tok = new Map<string, Set<string>>();
/** Palavras do nome, sem títulos (São, Santa, Papa…) e sem ligações (de, da, e…). */
export function tokens(s?: string | null): Set<string> {
  const k = s ?? '';
  let t = _tok.get(k);
  if (!t) {
    t = new Set(comApelidos(norm(k)).split(' ').filter((w) => w && !TITULOS.has(w) && !STOP.has(w)));
    _tok.set(k, t);
  }
  return t;
}
const _dist = new Map<string, Set<string>>();
/** tokens() sem as palavras genéricas (Jesus, Maria, Apóstolo, Arcanjo…). */
export function distintos(s?: string | null): Set<string> {
  const k = s ?? '';
  let t = _dist.get(k);
  if (!t) {
    t = new Set([...tokens(k)].filter((w) => !GENERICOS.has(w)));
    _dist.set(k, t);
  }
  return t;
}

const contido = (a: Set<string>, b: Set<string>) => [...a].every((w) => b.has(w));
const iguais = (a: Set<string>, b: Set<string>) => a.size === b.size && contido(a, b);

/** Mesmo nome (como conjunto de palavras). */
export function forte(santo: string, nomeBio: string): boolean {
  const a = tokens(santo), b = tokens(nomeBio);
  return a.size > 0 && iguais(a, b);
}
/** O nome distintivo de um cabe inteiro no nome do outro. */
export function candidato(santo: string, nomeBio: string): boolean {
  const ds = distintos(santo), db = distintos(nomeBio);
  if (!ds.size || !db.size) return false;
  return contido(ds, tokens(nomeBio)) || contido(db, tokens(santo));
}

// formatos mínimos (servem para as entradas de getCollection)
type OracaoLike = { id: string; data: { saint?: string; liturgicalFeast?: string } };
type BioLike = { id: string; data: { name?: string; feast?: string; relatedPrayers?: string[] } };

/** Nome exibido da biografia (o mesmo da página da biografia: `name` ou o nome do arquivo). */
export function nomeDaBio(b: BioLike): string {
  return b.data.name || b.id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Biografia ligada a uma oração (ou null).
 * 1) sem `saint` → nenhuma; 2) exatamente 1 nome igual ("forte") → ela;
 * 3) senão, candidatos: 1 → ele; vários → desempata pela data da festa
 *    (só se sobrar 1); senão nenhuma.
 */
export function bioDaOracao<B extends BioLike>(oracao: OracaoLike, bios: B[]): B | null {
  const santo = oracao.data.saint;
  if (!santo || !norm(santo)) return null;
  const fortes = bios.filter((b) => forte(santo, nomeDaBio(b)));
  if (fortes.length === 1) return fortes[0];
  const cands = bios.filter((b) => candidato(santo, nomeDaBio(b)));
  if (cands.length === 1) return cands[0];
  if (cands.length > 1 && oracao.data.liturgicalFeast) {
    const porData = cands.filter((b) => b.data.feast === oracao.data.liturgicalFeast);
    if (porData.length === 1) return porData[0];
  }
  return null;
}

/**
 * Orações de uma biografia: primeiro as de `relatedPrayers` (as que existem, na ordem),
 * depois as orações cuja bioDaOracao é esta biografia — sem repetir.
 */
export function oracoesDaBio<P extends OracaoLike>(bio: BioLike, oracoes: P[], bios: BioLike[]): P[] {
  const porId = new Map(oracoes.map((p) => [p.id, p]));
  const vistos = new Set<string>();
  const out: P[] = [];
  for (const s of bio.data.relatedPrayers ?? []) {
    const p = porId.get(s);
    if (p && !vistos.has(p.id)) { vistos.add(p.id); out.push(p); }
  }
  for (const p of oracoes) {
    if (vistos.has(p.id)) continue;
    const b = bioDaOracao(p, bios);
    if (b && b.id === bio.id) { vistos.add(p.id); out.push(p); }
  }
  return out;
}
