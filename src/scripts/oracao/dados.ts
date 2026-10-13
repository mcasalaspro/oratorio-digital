// ════════════════════════════════════════════════════════════════
//  Página da oração — dados e utilidades comuns do módulo do leitor
//  Os dados da página vêm do <script type="application/json" id="oracao-dados">
//  (montado no build por src/pages/oracao/[...slug].astro).
// ════════════════════════════════════════════════════════════════

export interface Meta {
  slug: string;
  type: string;
  dias: number;          // dias da novena achados no texto ("## Dia N"); 0 = não é novena
  titulo: string;
  banner: string;
  bannerReserva: string;
  caminho: string;
  dominio: string;
  reserva: number;       // número de reserva da capa (src/data/contadores.json)
  misterios: string;     // 'terco' | 'rosario' | 'gozosos' | … | ''
  lingua: string;        // língua do texto (H3)
}

export function lerDados(): Meta | null {
  const el = document.getElementById('oracao-dados');
  if (!el) return null;
  try { return JSON.parse(el.textContent || 'null'); } catch (e) { return null; }
}

const W = window as any;

// textos de interface: chave do site.ts; sem tradução ainda → texto PT de reserva
export function t(k: string): string { return W.odt ? W.odt(k) : k; }
export function tt(k: string, pt: string): string { const v = t(k); return v == null || v === k ? pt : v; }
export function lingua(): string { return document.documentElement.getAttribute('data-lang') || 'pt-BR'; }
export function fmt(n: number): string {
  try { return new Intl.NumberFormat(lingua()).format(n); } catch (e) { return String(n); }
}

// guardar no aparelho (modo anônimo / bloqueado: segue sem guardar)
export const guarda = {
  ler(k: string): string | null { try { return localStorage.getItem(k); } catch (e) { return null; } },
  gravar(k: string, v: string): void { try { localStorage.setItem(k, v); } catch (e) {} },
  apagar(k: string): void { try { localStorage.removeItem(k); } catch (e) {} },
};

// E9: link de PÁGINA montado no JavaScript sempre termina em "/" (antes de ? e #)
export function pagina(p: string): string {
  const base = W.odBase || ((x: string) => x);
  const m = /^([^?#]*)(.*)$/.exec(p) || ['', p, ''];
  let c = m[1] || '/';
  if (!c.endsWith('/') && !/\.[a-z0-9]+$/i.test(c)) c += '/';
  return base(c) + m[2];
}

export const reduzMovimento = (): boolean => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};

// rótulo acessível traduzível: data-i18n-aria="chave" (o texto do HTML é a reserva em PT)
export function traduzirArias(raiz: ParentNode = document): void {
  raiz.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    if (!el.dataset.ariaPt) el.dataset.ariaPt = el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', tt(el.dataset.i18nAria || '', el.dataset.ariaPt));
  });
}
