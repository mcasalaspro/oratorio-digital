// ════════════════════════════════════════════════════════════════
//  Mistérios do dia (G7) — Terço, Rosário completo e as quatro páginas de mistérios.
//  O seletor de dias e os sumários vêm prontos do build (preparar.ts); aqui só se
//  marca o conjunto de HOJE e, no Terço, se preenchem os cinco mistérios do dia
//  escolhido.
// ════════════════════════════════════════════════════════════════
import { CONJUNTOS, DO_DIA, DIAS_LONGOS, type Conjunto } from './misterios';
import { t, lingua, pagina } from './dados';

function nomeDoDia(d: number, idioma: string): string {
  // 7/1/2024 foi domingo
  try { return new Intl.DateTimeFormat(idioma, { weekday: 'long' }).format(new Date(2024, 0, 7 + d)); }
  catch (e) { return DIAS_LONGOS[d]; }
}
// frase com o dia da semana: o nome do dia sai na língua da frase (sem tradução da chave → tudo em PT)
function comDia(chave: string, pt: string, d: number): string {
  const v = t(chave);
  const traduzida = v != null && v !== chave;
  return (traduzida ? v : pt).replace('{dia}', nomeDoDia(d, traduzida ? lingua() : 'pt-BR'));
}

function hojeTxt(): string { const v = t('today'); return v != null && v !== 'today' ? v : 'hoje'; }

export function iniciarMisterios(content: HTMLElement, modo: string): { rotular(): void } | null {
  if (!modo) return null;
  const hoje = new Date().getDay();
  const deHoje = DO_DIA[hoje];

  if (modo === 'terco') {
    const caixa = content.querySelector<HTMLElement>('[data-misterios="terco"]');
    const slots = content.querySelectorAll<HTMLElement>('.terco-mystery');
    const chips = Array.from(content.querySelectorAll<HTMLElement>('.day-chip[data-semana]'));
    const itens = Array.from(content.querySelectorAll<HTMLElement>('.od-mist-sumario a[data-misterio]'));
    const aviso = caixa ? caixa.querySelector<HTMLElement>('[data-hoje]') : null;
    let atual = hoje;
    const escolher = (d: number) => {
      atual = d;
      const c = CONJUNTOS[DO_DIA[d]];
      slots.forEach((s, i) => { if (c.misterios[i]) s.textContent = (i + 1) + 'º Mistério ' + c.adj + ' — ' + c.misterios[i]; });
      itens.forEach((a, i) => { if (c.misterios[i]) a.textContent = c.misterios[i]; });
      chips.forEach((b) => {
        const on = +(b.dataset.semana || -1) === d;
        b.classList.toggle('day-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('od-hoje', +(b.dataset.semana || -1) === hoje);
      });
      if (aviso) aviso.textContent = (d === hoje ? comDia('myst_today_is', 'Hoje ({dia}): {nome}', d) : comDia('myst_day_is', '{dia}: {nome}', d))
        .replace('{nome}', c.nome);
    };
    chips.forEach((b) => b.addEventListener('click', () => escolher(+(b.dataset.semana || 0))));
    escolher(hoje); // dia de hoje já selecionado
    return { rotular() { escolher(atual); } };
  }

  const caixa = content.querySelector<HTMLElement>('.od-misterios');
  if (!caixa) return null;
  const aviso = caixa.querySelector<HTMLElement>('[data-hoje]');

  if (modo === 'rosario') {
    const rotular = () => {
      caixa.querySelectorAll<HTMLElement>('li[data-conjunto]').forEach((li) => {
        const on = li.dataset.conjunto === deHoje;
        li.classList.toggle('od-hoje', on);
        if (on) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
        li.dataset.hojeRotulo = hojeTxt();
        // título do conjunto de hoje no texto
        const a = li.querySelector('a');
        const id = a && a.getAttribute('href') ? decodeURIComponent(a.getAttribute('href')!.slice(1)) : '';
        const h = id ? document.getElementById(id) : null;
        if (h) { h.classList.toggle('od-hoje', on); h.dataset.hojeRotulo = hojeTxt(); }
      });
      if (aviso) aviso.textContent = comDia('myst_today_is', 'Hoje ({dia}): {nome}', hoje).replace('{nome}', CONJUNTOS[deHoje].nome);
    };
    rotular();
    return { rotular };
  }

  // uma das quatro páginas: é o conjunto de hoje? se não, aponta o de hoje (E9: link com "/")
  const meu = modo as Conjunto;
  const rotular = () => {
    if (!aviso) return;
    caixa.classList.toggle('od-hoje', meu === deHoje);
    if (meu === deHoje) { aviso.textContent = comDia('myst_today_this', 'Hoje ({dia}) é dia destes mistérios.', hoje); return; }
    aviso.textContent = comDia('myst_today_other', 'Hoje ({dia}) rezam-se os', hoje) + ' ';
    const a = document.createElement('a');
    a.href = pagina('/oracao/' + CONJUNTOS[deHoje].pagina);
    a.textContent = CONJUNTOS[deHoje].nome;
    aviso.appendChild(a);
    aviso.appendChild(document.createTextNode('.'));
  };
  rotular();
  return { rotular };
}
