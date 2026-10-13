// ════════════════════════════════════════════════════════════════
//  Assistente de leitura (palavra a palavra) — SEM reescrever o texto (E8)
//
//  • A página abre como veio do build: nenhum <span> por palavra, negrito e itálico
//    intactos. As palavras de um bloco só são localizadas quando o assistente chega
//    nele (TreeWalker nos nós de texto; linhas separadas por <br>).
//  • O destaque usa a API nativa de realce (CSS Custom Highlight API: Range +
//    CSS.highlights → ::highlight(od-linha) e ::highlight(od-palavra), estilos na página).
//  • Navegador sem a API: reserva que embrulha em <span> SÓ o bloco que está sendo
//    lido (dividindo os nós de texto, dentro do próprio <strong>/<em>) e desfaz ao sair.
//  • Contas "Nx" (data-rep) e seções repetidas (section.od-secao, G8): o bloco/seção
//    é lido N vezes; a barra de continhas acompanha.
//  • Ritmo natural (G4): pausa na vírgula, no ponto, no fim do verso e entre blocos.
//  • Rolagem (B11): dedo/roda/teclado suspendem o acompanhamento por 4 s; com
//    "reduzir movimento", acompanha sem animação (salto só quando a linha sai da faixa).
//  • Tela bloqueada / troca de app (B13): pausa e nunca conclui sozinho.
//  • Pausar no meio de uma repetição não zera a contagem (B12).
//  • Tocar num parágrafo/verso começa dali (G6).
// ════════════════════════════════════════════════════════════════
import { tt, reduzMovimento } from './dados';

// ───────── continhas ("Nx" e seções repetidas) ─────────
export interface Conta { n: number; k: number; dono: HTMLElement; barra: HTMLElement; dots: HTMLElement[]; rotulo: HTMLElement | null }
const CONTAS = new WeakMap<Element, Conta>();
export const contaDe = (el: Element | null): Conta | null => (el && CONTAS.get(el)) || null;

export function desenharConta(c: Conta): void {
  for (let i = 0; i < c.dots.length; i++) c.dots[i].classList.toggle('on', i < c.k);
  if (c.rotulo) c.rotulo.textContent = c.k + ' / ' + c.n;
  c.dono.classList.toggle('rep-done', c.k >= c.n);
  c.barra.setAttribute('aria-label', tt('count_tap', 'toque para contar') + ' — ' + c.k + ' / ' + c.n);
}

export function iniciarContas(content: HTMLElement): Conta[] {
  const todas: Conta[] = [];
  content.querySelectorAll<HTMLElement>('.rep').forEach((barra) => {
    const dono = barra.closest<HTMLElement>('[data-rep], section.od-secao');
    if (!dono || CONTAS.has(dono)) return;
    const n = parseInt(barra.dataset.n || dono.dataset.rep || dono.dataset.repetir || '0', 10);
    if (!(n >= 2)) return;
    const c: Conta = { n, k: 0, dono, barra, dots: Array.from(barra.querySelectorAll<HTMLElement>('.rep-dot')), rotulo: barra.querySelector<HTMLElement>('.rep-count') };
    CONTAS.set(dono, c);
    todas.push(c);
    const tocar = () => { c.k = c.k < c.n ? c.k + 1 : 0; desenharConta(c); };
    barra.addEventListener('click', tocar);
    barra.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tocar(); } });
    desenharConta(c);
  });
  return todas;
}

// ───────── texto: linhas e palavras de um bloco ─────────
type Pos = [Text, number];
interface Palavra { a: Pos; b: Pos; txt: string; pecas: [Text, number, number][]; faixa: AbstractRange | null; partes: HTMLElement[] | null }
interface Linha { palavras: Palavra[]; faixa: Range | null }
interface Bloco { el: HTMLElement; linhas: Linha[] | null; rep: Conta | null; secao: Conta | null }

// nunca lidos: barras de continhas, sumários/seletores de mistérios
export const PULAR = '.rep, .od-misterios, .terco-days, [data-leitor-pular]';
const ehRubrica = (el: Element) => el.classList.contains('rubric') || el.classList.contains('terco-mystery');

// onde ficam as linhas de um bloco: na citação, CADA <p> que não é rubrica (B2 da Fase 1)
function hospedes(el: HTMLElement): HTMLElement[] {
  if (el.tagName !== 'BLOCKQUOTE') return [el];
  const ps = Array.from(el.querySelectorAll<HTMLElement>('p')).filter((p) => !ehRubrica(p) && !p.closest(PULAR));
  return ps.length ? ps : [el];
}

function linhasDe(host: HTMLElement): Linha[] {
  const brutas: { segs: { no: Text; ini: number }[]; txt: string }[] = [{ segs: [], txt: '' }];
  (function andar(n: Node) {
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) {
        const v = (c as Text).data;
        if (v) { const L = brutas[brutas.length - 1]; L.segs.push({ no: c as Text, ini: L.txt.length }); L.txt += v; }
      } else if (c.nodeType === 1) {
        const e = c as HTMLElement;
        if (e.tagName === 'BR') { brutas.push({ segs: [], txt: '' }); continue; }
        if (e.matches(PULAR) || /^(UL|OL|BLOCKQUOTE|SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)) continue;
        andar(e);
      }
    }
  })(host);
  const out: Linha[] = [];
  for (const L of brutas) {
    const palavras: Palavra[] = [];
    const re = /\S+/g;
    for (let m: RegExpExecArray | null; (m = re.exec(L.txt)); ) {
      const s = m.index, e = s + m[0].length;
      const pecas: [Text, number, number][] = [];
      for (let i = 0; i < L.segs.length; i++) {
        const sg = L.segs[i], fim = sg.ini + sg.no.data.length;
        const a = Math.max(s, sg.ini), b = Math.min(e, fim);
        if (a < b) pecas.push([sg.no, a - sg.ini, b - sg.ini]);
      }
      if (!pecas.length) continue;
      const u = pecas[pecas.length - 1];
      palavras.push({ a: [pecas[0][0], pecas[0][1]], b: [u[0], u[2]], txt: m[0], pecas, faixa: null, partes: null });
    }
    if (palavras.length) out.push({ palavras, faixa: null });
  }
  return out;
}

function faixa(a: Pos, b: Pos): Range {
  const r = document.createRange();
  r.setStart(a[0], a[1]);
  r.setEnd(b[0], b[1]);
  return r;
}
// palavra: StaticRange basta para o realce (o texto nunca muda) e não pesa nas mutações do DOM
const temEstatica = typeof (window as any).StaticRange === 'function';
function faixaFixa(a: Pos, b: Pos): AbstractRange {
  if (!temEstatica) return faixa(a, b);
  try { return new StaticRange({ startContainer: a[0], startOffset: a[1], endContainer: b[0], endOffset: b[1] }); }
  catch (e) { return faixa(a, b); }
}

// ───────── o motor ─────────
export interface Motor {
  tocar(): void;
  pausar(): void;
  alternar(): void;
  reiniciar(pintarInicio?: boolean): void;   // nova leitura (zera contas e posição)
  proximo(): void;                           // próximo bloco; se estava tocando, continua (G4)
  reconstruir(): void;                       // o texto visível mudou (outro dia da novena)
  readonly tocando: boolean;
  readonly iniciado: boolean;
  setRitmo(r: string): void;
  depurar(): unknown;
}

export interface OpcoesMotor {
  content: HTMLElement;
  barra: HTMLElement | null;           // barra do assistente (para não esconder a linha atrás dela)
  aoMudar: (tocando: boolean) => void; // rótulo do botão, tela acesa…
  aoTerminar: () => void;              // fim da leitura com a página visível → concluir
  aoRecomecar: () => void;             // leitura nova (do começo): o fim volta a poder concluir
  ritmo: string;
}

//            base  porLetra  mín  vírgula  ponto  verso  bloco  (ms)
const RITMOS: Record<string, number[]> = {
  slow:   [240, 60, 300, 260, 560, 420, 900],
  medium: [150, 45, 220, 180, 400, 300, 650],
  fast:   [ 90, 32, 150, 110, 250, 180, 400],
};

export function criarMotor(op: OpcoesMotor): Motor {
  const { content } = op;
  const W = window as any;
  const temRealce = typeof W.CSS !== 'undefined' && !!W.CSS.highlights && typeof W.Highlight === 'function';
  let hlLinha: any = null, hlPalavra: any = null;
  if (temRealce) {
    hlLinha = new W.Highlight();
    hlPalavra = new W.Highlight();
    hlPalavra.priority = 1;
    W.CSS.highlights.set('od-linha', hlLinha);
    W.CSS.highlights.set('od-palavra', hlPalavra);
  }

  let blocos: Bloco[] = [];
  let bi = 0, li = 0, wi = 0;
  let tocando = false, iniciado = false, timer = 0;
  let entrou = false;           // B12: já entrou neste bloco nesta passagem (continuar não zera a conta)
  let ritmo = RITMOS[op.ritmo] ? op.ritmo : 'medium';

  function blocosLegiveis(): Bloco[] {
    const out: Bloco[] = [];
    content.querySelectorAll<HTMLElement>('p, blockquote, li').forEach((el) => {
      if (el.tagName !== 'BLOCKQUOTE' && el.closest('blockquote')) return;  // a citação é a unidade
      if (el.tagName === 'LI' && el.querySelector(':scope > p')) return;     // item com parágrafos: lê os <p>
      if (el.closest(PULAR) || el.closest('[hidden]') || ehRubrica(el)) return;
      if (!(el.textContent || '').trim()) return;
      out.push({ el, linhas: null, rep: contaDe(el), secao: contaDe(el.closest('section.od-secao')) });
    });
    return out;
  }
  function garantir(): void { if (!blocos.length) blocos = blocosLegiveis(); }
  function linhas(b: Bloco): Linha[] {
    if (!b.linhas) { const ls: Linha[] = []; hospedes(b.el).forEach((h) => ls.push(...linhasDe(h))); b.linhas = ls; }
    return b.linhas;
  }

  // ── reserva sem a API de realce: <span> só no bloco atual ──
  let embrulhado: Bloco | null = null;
  let pintadas: HTMLElement[] = [];
  function desembrulhar(): void {
    if (!embrulhado) return;
    const pais = new Set<Element>();
    for (const L of embrulhado.linhas || []) for (const p of L.palavras) for (const sp of p.partes || []) {
      const pai = sp.parentNode as Element | null;
      if (!pai) continue;
      while (sp.firstChild) pai.insertBefore(sp.firstChild, sp);
      pai.removeChild(sp);
      pais.add(pai);
    }
    pais.forEach((p) => p.normalize());
    embrulhado.linhas = null; // as posições antigas não valem mais
    embrulhado = null;
    pintadas = [];
  }
  function embrulhar(b: Bloco): void {
    if (embrulhado === b) return;
    desembrulhar();
    b.linhas = null;
    const todas: Palavra[] = [];
    linhas(b).forEach((L) => todas.push(...L.palavras));
    // de trás para frente: dividir o fim de um nó não mexe nas posições anteriores
    for (let i = todas.length - 1; i >= 0; i--) {
      const p = todas[i];
      p.partes = [];
      for (let j = p.pecas.length - 1; j >= 0; j--) {
        const [no, ini, fim] = p.pecas[j];
        if (fim < no.data.length) no.splitText(fim);
        const meio = ini > 0 ? no.splitText(ini) : no;
        const sp = document.createElement('span');
        sp.className = 'rg-w';
        meio.parentNode!.insertBefore(sp, meio);
        sp.appendChild(meio);
        p.partes.unshift(sp);
      }
    }
    embrulhado = b;
  }

  function apagar(): void {
    if (temRealce) { hlLinha.clear(); hlPalavra.clear(); }
    for (const s of pintadas) s.classList.remove('rg-w-linha', 'rg-w-ativa');
    pintadas = [];
  }

  function retanguloDaLinha(L: Linha): DOMRect | null {
    if (temRealce) { if (!L.faixa) L.faixa = faixa(L.palavras[0].a, L.palavras[L.palavras.length - 1].b); return L.faixa.getBoundingClientRect(); }
    const pr = L.palavras[0].partes, ul = L.palavras[L.palavras.length - 1].partes;
    if (!pr || !ul || !pr.length || !ul.length) return null;
    const r = document.createRange();
    r.setStartBefore(pr[0]); r.setEndAfter(ul[ul.length - 1]);
    return r.getBoundingClientRect();
  }

  // ── acompanhar a leitura (B11) ──
  let manualAte = 0, ultimaSeguida: Linha | null = null;
  const manual = () => { manualAte = performance.now() + 4000; };
  window.addEventListener('wheel', manual, { passive: true });
  window.addEventListener('touchmove', manual, { passive: true });
  window.addEventListener('keydown', (e) => {
    const alvo = e.target as HTMLElement | null;
    if (alvo && (/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(alvo.tagName) || alvo.isContentEditable || alvo.getAttribute('role') === 'button')) return;
    if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' '].includes(e.key)) manual();
  });
  function seguir(L: Linha): void {
    if (L === ultimaSeguida) return;
    if (performance.now() < manualAte) return; // o dedo manda: volta a acompanhar na próxima linha depois de 4 s
    ultimaSeguida = L;
    const r = retanguloDaLinha(L);
    if (!r) return;
    const vh = window.innerHeight;
    const barra = op.barra ? op.barra.getBoundingClientRect().height : 0;
    if (reduzMovimento()) {
      // sem animação: salta só quando a linha sai da faixa confortável
      if (r.top >= vh * 0.12 && r.bottom <= vh - barra - vh * 0.12) return;
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - vh * 0.3), behavior: 'auto' });
    } else {
      // linha por volta de 42% da altura (acima do centro, livre da barra)
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (vh * 0.42 - r.height / 2)), behavior: 'smooth' });
    }
  }

  function pintar(): void {
    const b = blocos[bi]; if (!b) return;
    if (!temRealce) embrulhar(b);
    const L = linhas(b)[li]; if (!L) return;
    const P = L.palavras[wi]; if (!P) return;
    if (temRealce) {
      if (!L.faixa) L.faixa = faixa(L.palavras[0].a, L.palavras[L.palavras.length - 1].b);
      if (!P.faixa) P.faixa = faixaFixa(P.a, P.b);
      hlLinha.clear(); hlLinha.add(L.faixa);
      hlPalavra.clear(); hlPalavra.add(P.faixa);
    } else {
      for (const s of pintadas) s.classList.remove('rg-w-linha', 'rg-w-ativa');
      pintadas = [];
      for (const p of L.palavras) for (const s of p.partes || []) { s.classList.add('rg-w-linha'); pintadas.push(s); }
      for (const s of P.partes || []) s.classList.add('rg-w-ativa');
    }
    seguir(L);
  }

  function entrar(b: Bloco): void {
    entrou = true;
    if (b.secao && b.secao.k === 0) { b.secao.k = 1; desenharConta(b.secao); }
    if (b.rep) { b.rep.k = 1; desenharConta(b.rep); }
  }

  function demora(P: Palavra, fimLinha: boolean, fimBloco: boolean): number {
    const r = RITMOS[ritmo] || RITMOS.medium;
    let ms = Math.max(r[2], r[0] + P.txt.length * r[1]);
    const ult = P.txt.replace(/["'”’»)\]]+$/, '').slice(-1);
    const pont = /[.!?…]/.test(ult) ? r[4] : /[,;:—–]/.test(ult) ? r[3] : 0;
    ms += Math.max(pont, fimBloco ? r[6] : fimLinha ? r[5] : 0);
    return ms;
  }

  const limpar = () => { if (timer) { clearTimeout(timer); timer = 0; } };

  function fimDaLeitura(): void {
    tocando = false; limpar();
    apagar(); desembrulhar();
    bi = blocos.length; li = 0; wi = 0; entrou = false; ultimaSeguida = null;
    op.aoMudar(false);
    // B13: só conclui sozinho se a pessoa está vendo a página
    if (document.visibilityState === 'visible') op.aoTerminar();
  }

  function passo(): void {
    if (!tocando) return;
    let b = blocos[bi];
    // pula blocos sem palavras
    while (b && !linhas(b).length) { bi++; li = 0; wi = 0; entrou = false; b = blocos[bi]; }
    if (!b) { fimDaLeitura(); return; }
    if (!entrou) entrar(b);
    const ls = linhas(b);
    if (li >= ls.length) { li = ls.length - 1; wi = 0; }
    const L = ls[li];
    if (wi >= L.palavras.length) wi = L.palavras.length - 1;
    pintar();
    const P = L.palavras[wi];
    const fimLinha = wi === L.palavras.length - 1;
    const ultimo = fimLinha && li === ls.length - 1;
    const repete = ultimo && !!b.rep && b.rep.k < b.rep.n;
    timer = window.setTimeout(() => {
      timer = 0;
      if (!tocando) return;
      if (wi < L.palavras.length - 1) { wi++; passo(); return; }                 // próxima palavra
      if (li < ls.length - 1) { li++; wi = 0; passo(); return; }                 // próximo verso
      if (b.rep && b.rep.k < b.rep.n) { b.rep.k++; desenharConta(b.rep); li = 0; wi = 0; passo(); return; } // repetição
      // fim de uma seção repetida (G8): volta ao 1º bloco da seção
      const s = b.secao;
      if (s && s.k < s.n) {
        let ultimoDaSecao = true;
        for (let j = bi + 1; j < blocos.length; j++) if (blocos[j].secao === s) { ultimoDaSecao = false; break; }
        if (ultimoDaSecao) {
          let ini = bi;
          while (ini > 0 && blocos[ini - 1].secao === s) ini--;
          s.k++; desenharConta(s);
          bi = ini; li = 0; wi = 0; entrou = false;
          passo(); return;
        }
      }
      bi++; li = 0; wi = 0; entrou = false;                                      // próximo bloco
      if (bi >= blocos.length) { fimDaLeitura(); return; }
      passo();
    }, demora(P, fimLinha, ultimo && !repete));
  }

  function zerarContas(): void {
    content.querySelectorAll<HTMLElement>('[data-rep], section.od-secao').forEach((el) => {
      const c = contaDe(el);
      if (c && c.k) { c.k = 0; desenharConta(c); }
    });
  }

  const motor: Motor = {
    get tocando() { return tocando; },
    get iniciado() { return iniciado; },
    tocar() {
      garantir();
      if (!blocos.length) return;
      if (bi >= blocos.length) { bi = 0; li = 0; wi = 0; entrou = false; zerarContas(); op.aoRecomecar(); }
      tocando = true; iniciado = true; ultimaSeguida = null;
      op.aoMudar(true);
      limpar();
      passo();
    },
    pausar() {
      limpar();
      if (!tocando) return;
      tocando = false;
      op.aoMudar(false);
    },
    alternar() { if (tocando) motor.pausar(); else motor.tocar(); },
    reiniciar(pintarInicio = false) {
      limpar(); tocando = false;
      apagar(); desembrulhar();
      blocos = blocosLegiveis();
      bi = 0; li = 0; wi = 0; entrou = false; ultimaSeguida = null; iniciado = false;
      zerarContas();
      op.aoRecomecar();
      if (pintarInicio && blocos.length) {
        while (bi < blocos.length && !linhas(blocos[bi]).length) bi++;
        if (bi < blocos.length) { entrar(blocos[bi]); pintar(); iniciado = true; }
      }
      op.aoMudar(false);
    },
    proximo() {
      garantir();
      if (!blocos.length) return;
      limpar();
      bi = Math.min((bi >= blocos.length ? -1 : bi) + 1, blocos.length - 1);
      li = 0; wi = 0; entrou = false; ultimaSeguida = null; iniciado = true;
      if (tocando) { passo(); return; }       // G4: "Próximo" continua tocando
      if (!temRealce) desembrulhar();
      entrar(blocos[bi]); pintar();
      op.aoMudar(false);
    },
    reconstruir() { motor.reiniciar(false); },
    setRitmo(r: string) { if (RITMOS[r]) ritmo = r; },
    depurar() {
      garantir();
      return {
        realce: temRealce, tocando, bi, li, wi, total: blocos.length,
        blocos: blocos.map((b) => ({ tag: b.el.tagName, rep: b.rep ? b.rep.n : 0, secao: b.secao ? b.secao.n : 0, linhas: linhas(b).map((L) => L.palavras.map((p) => p.txt).join(' ')) })),
        palavra: (() => { const b = blocos[bi]; const L = b && linhas(b)[li]; const P = L && L.palavras[wi]; return P ? P.txt : null; })(),
      };
    },
  };

  // ── B13: tela bloqueada / troca de app → pausa (e o fim nunca conclui escondido) ──
  document.addEventListener('visibilitychange', () => { if (document.hidden) motor.pausar(); });
  window.addEventListener('pagehide', () => motor.pausar());

  // ── G6: tocar num parágrafo/verso começa dali ──
  // (espera 250 ms: um duplo clique ou uma seleção de texto cancelam — quem copia não liga o assistente)
  let toque = 0;
  content.addEventListener('click', (e) => {
    if (e.button !== 0 || e.defaultPrevented) return;
    if (toque) { clearTimeout(toque); toque = 0; }
    if (e.detail > 1) return;
    const alvo = e.target as Element | null;
    if (!alvo || alvo.closest('a, button, input, select, textarea, label, summary, [role="button"], ' + PULAR)) return;
    const unidade = (alvo.closest('blockquote') || alvo.closest('p, li')) as HTMLElement | null;
    if (!unidade || !content.contains(unidade) || ehRubrica(unidade)) return;
    if (!temRealce) desembrulhar();
    garantir();
    const k = blocos.findIndex((b) => b.el === unidade);
    if (k < 0) return;
    const ls = linhas(blocos[k]);
    if (!ls.length) return;
    // linha e palavra pelo ponto tocado (medidos agora, antes de qualquer rolagem)
    let nl = 0, nw = 0, melhor = Infinity;
    for (let i = 0; i < ls.length; i++) {
      const r = faixa(ls[i].palavras[0].a, ls[i].palavras[ls[i].palavras.length - 1].b);
      for (const q of Array.from(r.getClientRects())) {
        const d = e.clientY < q.top ? q.top - e.clientY : e.clientY > q.bottom ? e.clientY - q.bottom : 0;
        if (d < melhor) { melhor = d; nl = i; }
      }
    }
    melhor = Infinity;
    ls[nl].palavras.forEach((p, j) => {
      for (const q of Array.from(faixa(p.a, p.b).getClientRects())) {
        const dy = e.clientY < q.top ? q.top - e.clientY : e.clientY > q.bottom ? e.clientY - q.bottom : 0;
        const dx = e.clientX < q.left ? q.left - e.clientX : e.clientX > q.right ? e.clientX - q.right : 0;
        const d = dy * 4 + dx;
        if (d < melhor) { melhor = d; nw = j; }
      }
    });
    toque = window.setTimeout(() => {
      toque = 0;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && String(sel).trim()) return; // selecionando texto
      if (blocos[k] !== undefined && blocos[k].el !== unidade) return; // o texto visível mudou
      limpar();
      const mesmo = k === bi && entrou;
      bi = k; li = nl; wi = nw; ultimaSeguida = null;
      if (!mesmo) entrou = false;
      tocando = true; iniciado = true;
      op.aoMudar(true);
      passo();
    }, 250);
  });

  return motor;
}
