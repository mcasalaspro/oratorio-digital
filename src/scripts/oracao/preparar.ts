// ════════════════════════════════════════════════════════════════
//  Oratório Digital — preparação do texto da oração NO BUILD
//  (usada só por src/pages/oracao/[...slug].astro; não vai para o navegador)
//
//  O HTML que o Markdown gera recebe aqui, uma única vez, tudo o que antes o
//  navegador fazia ao abrir a página (e que "picotava" o texto em milhares de
//  <span>, apagava negrito/itálico e fazia a página saltar):
//   • rubricas: parágrafo inteiramente em itálico → class="rubric" (o assistente pula);
//     rubrica longa (nota de abertura, fonte, "como rezar") ganha também class="nota"
//     (alinhada à esquerda, como texto corrido) — G9
//   • rótulo: parágrafo só em negrito, curto e sem ponto final ("**Oração final**",
//     "**Para começar**", "**A Fé**") → class="rotulo" (aparece igual; o assistente pula) — G9
//   • instrução no meio da oração, entre parênteses — "(faça aqui o seu pedido)",
//     "(diga aqui a sua intenção)", "(Nome)" → <span class="rubrica-inline" data-leitor-pular> — G9
//   • "10x …" no começo de um parágrafo ou citação: o marcador sai do texto e
//     entram as continhas (data-rep="10" + <span class="rep">); "1x" só perde o marcador
//   • seção repetida (G8): título começando por um número e "x" — ex.: "## 5x Dezenas" —
//     repete a seção inteira, até o próximo título do mesmo nível ou maior
//     → <section class="od-secao" data-repetir="5"> com a sua barra de continhas
//   • novena: cada bloco depois de "## Dia N" recebe data-dia="N" (os dias ≠ 1 saem
//     com hidden; o script curto da página escolhe o dia certo antes de pintar);
//     um título "## … todos os dias" / "## … cada dia" DEPOIS dos dias encerra os dias:
//     o que vem dali em diante é comum e aparece no fim de todos eles
//   • capitular: class="lead" no 1º parágrafo lido (novena sem introdução: o 1º de cada dia)
//   • Terço / Rosário completo / páginas de mistérios (G7): seletor de dias e sumário
//  Nenhum texto é reescrito além do marcador "Nx": negrito, itálico e quebras ficam
//  exatamente como no .md. O HTML do Markdown é simples e bem formado (p, blockquote,
//  h2/h3, hr, br, em, strong e poucos blocos de HTML), então um leitor pequeno basta.
// ════════════════════════════════════════════════════════════════
import { CONJUNTOS, ORDEM, DIAS_CURTOS, DIAS_LONGOS, type ModoMisterios } from './misterios';

// ───────── árvore mínima de HTML ─────────
interface El { t: 'el'; tag: string; attrs: [string, string | null][]; filhos: No[]; pai: El | null }
interface Txt { t: 'txt'; v: string; pai: El | null }   // v = texto CRU (com entidades)
interface Raw { t: 'raw'; v: string; pai: El | null }   // comentário / conteúdo de script
type No = El | Txt | Raw;

const VAZIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const CRUS = new Set(['script', 'style', 'textarea', 'title']);
const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATRIB = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NOMEADAS: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodificar(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return NOMEADAS[e.toLowerCase()] ?? m;
  });
}
const escTexto = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
const escAtrib = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function analisar(html: string): El {
  const raiz: El = { t: 'el', tag: '#raiz', attrs: [], filhos: [], pai: null };
  let atual = raiz, i = 0;
  const texto = (v: string) => { if (v) atual.filhos.push({ t: 'txt', v, pai: atual }); };
  TOKEN.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = TOKEN.exec(html)); ) {
    texto(html.slice(i, m.index));
    i = TOKEN.lastIndex;
    if (m[0].startsWith('<!--')) { atual.filhos.push({ t: 'raw', v: m[0], pai: atual }); continue; }
    if (m[1]) { // fechamento: sobe até o elemento aberto de mesmo nome (sobra solta é ignorada)
      const tag = m[1].toLowerCase();
      for (let e: El | null = atual; e && e !== raiz; e = e.pai) if (e.tag === tag) { atual = e.pai!; break; }
      continue;
    }
    const tag = m[2].toLowerCase();
    const attrs: [string, string | null][] = [];
    ATRIB.lastIndex = 0;
    for (let a: RegExpExecArray | null; (a = ATRIB.exec(m[3] || '')); ) {
      const v = a[2] ?? a[3] ?? a[4];
      attrs.push([a[1].toLowerCase(), v == null ? null : decodificar(v)]);
    }
    const el: El = { t: 'el', tag, attrs, filhos: [], pai: atual };
    atual.filhos.push(el);
    if (VAZIOS.has(tag)) continue;
    if (CRUS.has(tag)) { // conteúdo cru até o fechamento
      const fim = html.toLowerCase().indexOf(`</${tag}`, i);
      const corpo = html.slice(i, fim < 0 ? html.length : fim);
      if (corpo) el.filhos.push({ t: 'raw', v: corpo, pai: el });
      i = fim < 0 ? html.length : html.indexOf('>', fim) + 1;
      TOKEN.lastIndex = i;
      continue;
    }
    atual = el;
  }
  texto(html.slice(i));
  return raiz;
}

function serializar(n: No): string {
  if (n.t !== 'el') return n.v;
  const corpo = n.filhos.map(serializar).join('');
  if (n.tag === '#raiz') return corpo;
  const a = n.attrs.map(([k, v]) => (v == null ? ` ${k}` : ` ${k}="${escAtrib(v)}"`)).join('');
  return VAZIOS.has(n.tag) ? `<${n.tag}${a}>` : `<${n.tag}${a}>${corpo}</${n.tag}>`;
}

// ───────── utilidades da árvore ─────────
const ehEl = (n: No | undefined | null): n is El => !!n && n.t === 'el';
const attr = (e: El, k: string) => { const a = e.attrs.find((x) => x[0] === k); return a ? a[1] : null; };
function setAttr(e: El, k: string, v: string | null) {
  const a = e.attrs.find((x) => x[0] === k);
  if (a) a[1] = v; else e.attrs.push([k, v]);
}
const temClasse = (e: El, c: string) => (attr(e, 'class') || '').split(/\s+/).includes(c);
function addClasse(e: El, c: string) {
  if (temClasse(e, c)) return;
  const v = (attr(e, 'class') || '').trim();
  setAttr(e, 'class', v ? `${v} ${c}` : c);
}
function textoDe(n: No): string {
  if (n.t === 'txt') return decodificar(n.v);
  if (n.t === 'raw') return '';
  return n.filhos.map(textoDe).join('');
}
function* descendentes(e: El): Generator<El> {
  for (const f of e.filhos) if (ehEl(f)) { yield f; yield* descendentes(f); }
}
const dentroDe = (e: El, tag: string) => { for (let p = e.pai; p; p = p.pai) if (p.tag === tag) return true; return false; };
const elementos = (e: El) => e.filhos.filter(ehEl);
// fragmento de HTML pronto → nós (para inserir marcação gerada aqui)
function fragmento(html: string, pai: El): No[] {
  const r = analisar(html);
  for (const f of r.filhos) f.pai = pai;
  return r.filhos;
}

// primeiro texto não vazio (em ordem de documento) dentro de e — onde fica o marcador "Nx"
function primeiroTexto(e: El): Txt | null {
  for (const f of e.filhos) {
    if (f.t === 'txt') { if (decodificar(f.v).trim()) return f; continue; }
    if (ehEl(f)) { const t = primeiroTexto(f); if (t) return t; }
  }
  return null;
}

// "10x " / "{10x}" / "10× · " no começo — o mesmo padrão de antes (S:REP_RE)
export const REP_RE = /^\s*\{?\s*(\d{1,2})\s*[x×]\s*\}?\s*[·.\-:]?\s*/i;

// tira o marcador do primeiro texto de e; devolve o número (ou 0)
function tirarMarcador(e: El): number {
  const t = primeiroTexto(e);
  if (!t) return 0;
  const txt = decodificar(t.v);
  // o marcador precisa estar no começo do texto do bloco (não no meio de uma frase)
  if (textoDe(e).trimStart().indexOf(txt.trimStart()) !== 0) return 0;
  const m = txt.match(REP_RE);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  t.v = escTexto(txt.slice(m[0].length));
  return n;
}

// barra de continhas (a mesma do "10x"): <span> para valer dentro de <p>
function barraContas(n: number, extra = ''): string {
  let dots = '';
  for (let i = 0; i < n; i++) dots += '<i class="rep-dot"></i>';
  return `<span class="rep${extra}" role="button" tabindex="0" data-n="${n}" aria-label="toque para contar (0 de ${n})">`
    + `<span class="rep-dots" aria-hidden="true">${dots}</span>`
    + `<span class="rep-count" aria-hidden="true">0 / ${n}</span>`
    + `<span class="rep-hint" data-i18n="count_tap" aria-hidden="true">toque para contar</span></span>`;
}

// ───────── G7: Terço / Rosário completo / páginas de mistérios ─────────
const esc = (s: string) => escTexto(s);
// dias de um conjunto nas duas distribuições: o CSS mostra o da escolha (html.od-trad, posto
// antes de pintar pelo script curto da página) — nada muda de texto depois de aberto
function diasDe(k: keyof typeof CONJUNTOS): string {
  const d = CONJUNTOS[k].diasTexto;
  return `<span class="od-mist-dias"><span class="od-dias-jp2">${esc(d.jp2)}</span><span class="od-dias-trad">${esc(d.trad)}</span></span>`;
}
// Rosário tradicional (15 mistérios) ou com os Luminosos (2002): a escolha fica no aparelho
function escolhaDaDistribuicao(): string {
  return `<div class="od-distrib" role="group" aria-label="Distribuição dos mistérios" data-i18n-aria="myst_dist_aria">`
    + `<button type="button" class="od-distrib-op" data-distrib="jp2" aria-pressed="true" data-i18n="myst_dist_jp2">Com os Luminosos (2002)</button>`
    + `<button type="button" class="od-distrib-op" data-distrib="trad" aria-pressed="false" data-i18n="myst_dist_trad">Tradicional (15 mistérios)</button>`
    + `</div>`;
}
function seletorDoTerco(ids: string[]): string {
  let chips = '';
  for (let d = 0; d < 7; d++) chips += `<button type="button" class="day-chip" data-semana="${d}" aria-pressed="false" aria-label="${DIAS_LONGOS[d]}">${DIAS_CURTOS[d]}</button>`;
  let lista = '';
  for (let i = 0; i < 5; i++) {
    const alvo = ids[i] ? ` href="#${escAtrib(ids[i])}"` : '';
    lista += `<li><a${alvo} data-misterio="${i}">${i + 1}º Mistério</a></li>`;
  }
  return escolhaDaDistribuicao()
    + `<div class="terco-days-label" data-i18n="myst_pick_day">Toque no dia para ver os mistérios:</div>`
    + `<div class="terco-days-row" role="group" aria-label="Dias da semana">${chips}</div>`
    + `<p class="od-mist-hoje" data-hoje aria-live="polite"></p>`
    + `<ol class="od-mist-sumario">${lista}</ol>`;
}
function caixaDoRosario(ids: Record<string, string>): string {
  const itens = ORDEM.map((k) => {
    const c = CONJUNTOS[k];
    const alvo = ids[k] ? ` href="#${escAtrib(ids[k])}"` : '';
    const lum = k === 'luminosos' ? ' data-luminosos' : '';
    return `<li data-conjunto="${k}"${lum}><a${alvo}>${esc(c.nome)}</a> ${diasDe(k)}</li>`;
  }).join('');
  return `<nav class="od-misterios" data-misterios="rosario" aria-label="Mistérios do Rosário">`
    + `<p class="od-mist-titulo" data-i18n="myst_summary">Sumário dos mistérios</p>`
    + escolhaDaDistribuicao()
    + `<p class="od-mist-hoje" data-hoje aria-live="polite"></p>`
    + `<ol class="od-mist-sumario">${itens}</ol></nav>`;
}
function caixaDoConjunto(k: keyof typeof CONJUNTOS, itens: { id: string; nome: string }[]): string {
  const c = CONJUNTOS[k];
  const lista = (itens.length ? itens : c.misterios.map((nome) => ({ id: '', nome })))
    .map((x) => `<li><a${x.id ? ` href="#${escAtrib(x.id)}"` : ''}>${esc(x.nome)}</a></li>`).join('');
  return `<nav class="od-misterios" data-misterios="${k}" aria-label="${esc(c.nome)}">`
    + `<p class="od-mist-titulo">${esc(c.nome)} · ${diasDe(k)}</p>`
    + `<p class="od-mist-hoje" data-hoje aria-live="polite"></p>`
    + `<ol class="od-mist-sumario">${lista}</ol></nav>`;
}

// ───────── preparação ─────────
export interface Opcoes { novena: boolean; misterios: ModoMisterios }
export interface Preparo {
  html: string;
  dias: number;      // dias achados no texto ("## Dia N"); 0 = não é novena
  reps: number;      // barras "Nx" criadas
  secoes: number;    // seções repetidas (G8)
  avisos: string[];
}

const DIA_RE = /^\s*(dia|day)\s+\d+/i;
const COMUM_RE = /\b(todos os dias|cada dia|every day|each day)\b/i;
const TITULO = /^h([1-6])$/;
// G9: rubrica a partir deste tamanho vira "nota" (texto corrido, à esquerda)
const NOTA_MIN = 120;
// G9: instrução entre parênteses no meio da oração (não é lida; aparece em itálico suave)
// (a pontuação logo depois vai junto: senão o assistente pararia num "." sozinho)
const INSTRUCAO_INLINE = /\((?:(?:faça|faz|diga|dizer|mencione|apresente|peça|pedir|reze|repita)\b[^()]{0,80}|Nome|N\.)\)[.,;:]?/gi;

export function prepararOracao(html: string, op: Opcoes): Preparo {
  const raiz = analisar(html);
  const avisos: string[] = [];
  let reps = 0, secoes = 0;

  // 1) G8 — seções repetidas: "## 5x Dezenas" (o marcador sai do título)
  for (let i = 0; i < raiz.filhos.length; i++) {
    const h = raiz.filhos[i];
    if (!ehEl(h)) continue;
    const nivel = TITULO.exec(h.tag);
    if (!nivel || !REP_RE.test(textoDe(h))) continue;
    const n = tirarMarcador(h);
    if (!(n >= 2 && n <= 99)) continue; // "1x" no título: só some o marcador
    const sec: El = { t: 'el', tag: 'section', attrs: [['class', 'od-secao'], ['data-repetir', String(n)]], filhos: [], pai: raiz };
    let j = i + 1;
    for (; j < raiz.filhos.length; j++) {
      const s = raiz.filhos[j];
      const nv = ehEl(s) ? TITULO.exec(s.tag) : null;
      if (nv && +nv[1] <= +nivel[1]) break;
    }
    const corpo = raiz.filhos.splice(i, j - i, sec);
    sec.filhos.push(corpo[0]);
    sec.filhos.push(...fragmento(barraContas(n, ' rep-secao'), sec));
    for (const c of corpo.slice(1)) { c.pai = sec; sec.filhos.push(c); }
    corpo[0].pai = sec;
    secoes++;
  }

  // 2) novena: data-dia em cada bloco de topo depois de "## Dia N"
  let dias = 0;
  if (op.novena) {
    let d = 0, comum = false;
    for (const e of elementos(raiz)) {
      if (e.tag === 'h2') {
        const t = textoDe(e);
        if (DIA_RE.test(t)) { d++; comum = false; }
        else if (d > 0 && COMUM_RE.test(t)) comum = true; // "## Para todos os dias": fim dos dias
      }
      if (d > 0 && !comum) { setAttr(e, 'data-dia', String(d)); if (d !== 1) setAttr(e, 'hidden', null); }
    }
    dias = d;
  }

  // 3) rubricas: <p> cujo <em>/<i> direto cobre todo o texto (antes: markRubrics no navegador)
  for (const e of descendentes(raiz)) {
    if (e.tag !== 'p') continue;
    const em = e.filhos.find((f) => ehEl(f) && (f.tag === 'em' || f.tag === 'i')) as El | undefined;
    const txt = textoDe(e).trim();
    if (em && txt && textoDe(em).trim() === txt) {
      addClasse(e, 'rubric');
      if (txt.length >= NOTA_MIN) addClasse(e, 'nota');
      continue;
    }
    // G9 — rótulo: só negrito, curto, sem ponto final, fora de citação/lista
    // (uma resposta de ladainha em negrito termina em ponto e continua sendo lida)
    if (dentroDe(e, 'blockquote') || dentroDe(e, 'li')) continue;
    const st = e.filhos.find((f) => ehEl(f) && (f.tag === 'strong' || f.tag === 'b')) as El | undefined;
    const semDoisPontos = (s: string) => s.trim().replace(/:$/, '').trim();
    if (st && txt && txt.length <= 60 && semDoisPontos(textoDe(st)) === semDoisPontos(txt) && !/[.!?…]$/.test(txt)) addClasse(e, 'rotulo');
  }

  // 3b) G9 — instrução entre parênteses dentro da oração: "(faça aqui o seu pedido)" etc.
  const ehRubricaEl = (e: El) => temClasse(e, 'rubric') || temClasse(e, 'rotulo');
  for (const e of [...descendentes(raiz)]) {
    if (e.tag === 'script' || e.tag === 'style' || ehRubricaEl(e)) continue;
    let dentroRubrica = false;
    for (let p: El | null = e; p; p = p.pai) if (ehRubricaEl(p) || p.tag === 'nav') { dentroRubrica = true; break; }
    if (dentroRubrica) continue;
    for (let i = 0; i < e.filhos.length; i++) {
      const f = e.filhos[i];
      if (f.t !== 'txt') continue;
      INSTRUCAO_INLINE.lastIndex = 0;
      if (!INSTRUCAO_INLINE.test(f.v)) continue;
      const novos: No[] = [];
      let pos = 0;
      INSTRUCAO_INLINE.lastIndex = 0;
      for (let m: RegExpExecArray | null; (m = INSTRUCAO_INLINE.exec(f.v)); ) {
        if (m.index > pos) novos.push({ t: 'txt', v: f.v.slice(pos, m.index), pai: e });
        const span: El = { t: 'el', tag: 'span', attrs: [['class', 'rubrica-inline'], ['data-leitor-pular', null]], filhos: [], pai: e };
        span.filhos.push({ t: 'txt', v: m[0], pai: span });
        novos.push(span);
        pos = m.index + m[0].length;
      }
      if (pos < f.v.length) novos.push({ t: 'txt', v: f.v.slice(pos), pai: e });
      e.filhos.splice(i, 1, ...novos);
      i += novos.length - 1;
    }
  }

  // 4) "Nx": citação (o marcador no 1º <p>) ou parágrafo fora de citação
  for (const e of [...descendentes(raiz)]) {
    if (e.tag !== 'blockquote' && !(e.tag === 'p' && !dentroDe(e, 'blockquote'))) continue;
    if (e.tag === 'blockquote' && dentroDe(e, 'blockquote')) continue;
    const alvo = e.tag === 'blockquote' ? ([...descendentes(e)].find((x) => x.tag === 'p') || e) : e;
    if (!REP_RE.test(textoDe(alvo))) continue;
    const n = tirarMarcador(alvo);
    if (n === 1 || !(n >= 2 && n <= 99)) continue; // "1x": só tira o marcador, sem contas
    setAttr(e, 'data-rep', String(n));
    e.filhos.push(...fragmento(barraContas(n), e));
    reps++;
  }

  // 5) capitular: 1º parágrafo lido (pula rubricas, mistérios do Terço e blocos sem texto)
  const legivel = (e: El) => (e.tag === 'p' || e.tag === 'blockquote')
    && !temClasse(e, 'rubric') && !temClasse(e, 'rotulo') && !temClasse(e, 'terco-mystery') && textoDe(e).trim().length > 1;
  // blocos lidos de uma lista de elementos de topo (desce em <section>/<div>, não em citações)
  const blocos = (lista: El[]): El[] => {
    const out: El[] = [];
    for (const e of lista) {
      if (e.tag === 'section' || e.tag === 'div') out.push(...blocos(elementos(e)));
      else if (legivel(e)) out.push(e);
    }
    return out;
  };
  const topo = elementos(raiz);
  // comuns de ABERTURA (antes do 1º dia); o que é comum no fim ("## Para todos os dias") não leva a capitular
  const iDia1 = topo.findIndex((e) => attr(e, 'data-dia') != null);
  const comuns = blocos((iDia1 < 0 ? topo : topo.slice(0, iDia1)).filter((e) => !attr(e, 'data-dia')));
  const leadComum = comuns.find((e) => e.tag === 'p');
  if (leadComum) addClasse(leadComum, 'lead');
  else if (dias > 0) {
    for (let d = 1; d <= dias; d++) {
      const l = blocos(topo.filter((e) => attr(e, 'data-dia') === String(d))).find((e) => e.tag === 'p');
      if (l) addClasse(l, 'lead');
    }
  }

  // 6) G7 — mistérios
  if (op.misterios === 'terco') {
    const caixa = [...descendentes(raiz)].find((e) => attr(e, 'id') === 'terco-days');
    if (caixa) {
      const ids = topo.filter((e) => e.tag === 'h3' && /dezena/i.test(textoDe(e))).map((e) => attr(e, 'id') || '');
      addClasse(caixa, 'terco-days');
      setAttr(caixa, 'data-misterios', 'terco');
      caixa.filhos = fragmento(seletorDoTerco(ids), caixa);
    } else avisos.push('Terço sem <div id="terco-days">: seletor de dias omitido');
  } else if (op.misterios) {
    let caixa = '';
    if (op.misterios === 'rosario') {
      const ids: Record<string, string> = {};
      let naLuminosa = false;
      for (const e of topo) {
        if (e.tag === 'h2') {
          const t = textoDe(e).toLowerCase();
          for (const k of ORDEM) if (t.includes(k.slice(0, -1))) ids[k] = attr(e, 'id') || '';
          naLuminosa = t.includes('luminos');
        }
        // a coroa dos Luminosos inteira (título e dezenas): some no Rosário tradicional
        if (naLuminosa) setAttr(e, 'data-luminosos', '');
      }
      if (!ids.luminosos) avisos.push('Rosário completo sem "## Mistérios Luminosos": a escolha "Tradicional" não tem o que esconder');
      caixa = caixaDoRosario(ids);
    } else {
      // "Primeiro Mistério Gozoso — A Anunciação…" → nome depois do travessão
      const itens = topo.filter((e) => e.tag === 'h2' && /mist[ée]rio/i.test(textoDe(e)))
        .map((e) => ({ id: attr(e, 'id') || '', nome: textoDe(e).split(/\s+[—–-]\s+/).slice(1).join(' — ').trim() || textoDe(e).trim() }));
      caixa = caixaDoConjunto(op.misterios, itens.length === 5 ? itens : []);
    }
    const iH2 = raiz.filhos.findIndex((f) => ehEl(f) && f.tag === 'h2');
    raiz.filhos.splice(iH2 < 0 ? raiz.filhos.length : iH2, 0, ...fragmento(caixa, raiz));
  }

  return { html: serializar(raiz), dias, reps, secoes, avisos };
}
