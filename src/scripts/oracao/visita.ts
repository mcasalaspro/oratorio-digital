// ════════════════════════════════════════════════════════════════
//  Visita à página da oração
//  • Neste aparelho: guarda a lista das orações já abertas ("od-vistas", a mais recente
//    primeiro, até 400). O "Sortear uma oração" (public/js/sortear.js) prefere as que
//    ainda não estão nela. Nada disso sai do aparelho.
//  • No contador da comunidade (só no Supabase): +1 em "visitadas" desta oração, uma vez
//    por visita — recarregar a página ou voltar a ela na mesma sessão não conta de novo.
//    A contagem espera a página ficar pronta (não disputa a rede com o texto e as imagens).
// ════════════════════════════════════════════════════════════════
import { guarda } from './dados';

const W = window as any;
export const CHAVE_VISTAS = 'od-vistas';
const MAX_VISTAS = 400;

function lembrar(slug: string): void {
  let lista: string[] = [];
  try {
    const v = JSON.parse(guarda.ler(CHAVE_VISTAS) || '[]');
    if (Array.isArray(v)) lista = v.filter((s) => typeof s === 'string' && s && s !== slug);
  } catch (e) { /* lista ilegível: recomeça */ }
  lista.unshift(slug);
  guarda.gravar(CHAVE_VISTAS, JSON.stringify(lista.slice(0, MAX_VISTAS)));
}

function sessao(k: string): string | null { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function marcar(k: string): void { try { sessionStorage.setItem(k, '1'); } catch (e) { /* sem sessionStorage: segue */ } }

export function registrarVisita(slug: string): void {
  if (!slug) return;
  lembrar(slug);
  const C = W.odContador;
  if (!C || typeof C.contarVisitaOracao !== 'function') return;
  const k = 'od-vo:' + slug;
  if (sessao(k) === '1') return;
  // marca antes de contar: recarregar enquanto espera não conta de novo; e, se o contador
  // não responder (rede fora, banco ainda sem a função), não insiste nesta visita
  marcar(k);
  const contar = () => { C.contarVisitaOracao(slug); };
  const depois = () => {
    if (typeof W.requestIdleCallback === 'function') W.requestIdleCallback(contar, { timeout: 4000 });
    else setTimeout(contar, 1200);
  };
  if (document.readyState === 'complete') depois();
  else window.addEventListener('load', depois, { once: true });
}
