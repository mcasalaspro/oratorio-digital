// ════════════════════════════════════════════════════════════════
//  Novena — dias, contas e progresso (B3, G3, J2)
//  O dia inicial, o ciclo e os dias já rezados vêm do script curto que a página
//  roda logo depois do texto (window.__odNovena — escolhe o dia antes de pintar,
//  com window.odCalendario). Aqui ficam os toques nas contas, "Próximo dia" e o
//  registro do progresso, que só acontece ao CONCLUIR um dia (abrir não marca nada).
//  Guardado em localStorage "od-novena:<slug>" = { ciclo, feitos: [1, 2, …], em }.
// ════════════════════════════════════════════════════════════════
import { guarda, reduzMovimento } from './dados';

export interface EstadoNovena {
  N: number;
  ciclo: string;
  feitos: number[];
  dia: number;
  sugerido: number;
  pintar: () => void;
}

export interface Novena {
  readonly dia: number;
  readonly total: number;
  readonly feitos: number[];
  mostrar(n: number, rolar?: boolean): void;
  concluir(): { dia: number; ultimo: boolean; feitos: number; total: number };
}

export function iniciarNovena(slug: string, aoMudarDia: () => void): Novena | null {
  const nv = (window as any).__odNovena as EstadoNovena | undefined;
  if (!nv || !(nv.N > 1)) return null;

  const contas = document.getElementById('beads');
  function mostrar(n: number, rolar = false): void {
    if (!(n >= 1 && n <= nv!.N)) return;
    nv!.dia = n;
    nv!.pintar();
    aoMudarDia();
    if (rolar && contas) contas.scrollIntoView({ block: 'start', behavior: reduzMovimento() ? 'auto' : 'smooth' });
  }
  // contas: os botões vêm prontos do build; aqui só o toque (o foco fica na conta tocada)
  if (contas) {
    contas.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('.bead');
      if (b && b.dataset.dia) mostrar(+b.dataset.dia);
    });
  }
  document.addEventListener('od:lang', () => nv.pintar());

  return {
    get dia() { return nv.dia; },
    get total() { return nv.N; },
    get feitos() { return nv.feitos.slice(); },
    mostrar,
    concluir() {
      const n = nv.dia;
      if (nv.feitos.indexOf(n) < 0) nv.feitos.push(n);
      nv.feitos.sort((a, b) => a - b);
      guarda.gravar('od-novena:' + slug, JSON.stringify({ ciclo: nv.ciclo, feitos: nv.feitos, em: Date.now() }));
      nv.pintar();
      return { dia: n, ultimo: n === nv.N, feitos: nv.feitos.length, total: nv.N };
    },
  };
}
