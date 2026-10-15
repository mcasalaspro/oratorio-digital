// ════════════════════════════════════════════════════════════════
//  Concluir a oração: contador da comunidade, overlay e ações depois de rezar
//  (o mesmo comportamento das Fases 1 e 2, agora fora do HTML):
//   • B4: o assistente para; "concluindo" impede contar 2×; o fim da leitura não
//     conclui de novo uma leitura já concluída.
//   • C1/C4: overlay abre na hora e o número chega depois; falha → "—" (nunca "0");
//     2ª conclusão no mesmo dia avisa que já foi contada; capa com reserva do build.
//   • D2: "Compartilhar que rezei" (public/js/compartilhar.js).
//   • Novena (B3/G3): o dia só entra no progresso ao concluir; no último dia,
//     "Novena concluída".
// ════════════════════════════════════════════════════════════════
import { t, tt, fmt, guarda, pagina, reduzMovimento, type Meta } from './dados';
import type { Motor } from './motor';
import type { Novena } from './novena';

export interface Conclusao {
  concluir(auto: boolean): void;
  novaLeitura(): void;        // nova leitura: o fim do assistente volta a poder concluir
  mostrarProximo(): void;     // "Próximo dia" só em novena, antes do último dia
  rotular(): void;            // textos dinâmicos (troca de idioma)
}

const W = window as any;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

function hojeChave(): string {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

export function iniciarConclusao(meta: Meta, motor: Motor, novena: Novena | null): Conclusao {
  const S = W.__SITE__ || {};
  const C = W.odContador || null; // contador da comunidade (Supabase ou Abacus) — public/js/contador.js
  const contadorAtivo = !!(C && C.ativo);
  const turnstileKey = (S.turnstile && S.turnstile.siteKey) || '';
  const reduzir = reduzMovimento();

  // conclusão: "concluindo" = registro em andamento (não deixa contar 2×);
  // "concluidaNaLeitura" = esta leitura já foi concluída (o fim do assistente não conclui de novo)
  let concluindo = false, concluidaNaLeitura = false;
  // últimos números do serviço (nunca a reserva): 2ª conclusão do dia e imagem "Rezei hoje"
  let numVivo: number | null = null, numOverlay: number | null = null;
  // último dia da novena concluído agora (G3)
  let novenaFeita: { feitos: number; total: number } | null = null;

  // ───────── Turnstile (CAPTCHA) opcional ─────────
  if (turnstileKey) {
    const box = $('turnstileBox');
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.defer = true;
    s.onload = () => { try { W.turnstile.render(box, { sitekey: turnstileKey, theme: 'auto' }); } catch (e) {} };
    document.head.appendChild(s);
  }

  // valor do contador desta oração; null = não deu para saber (a capa fica oculta, nunca "0").
  // odContador já tem prazo e nunca rejeita (rede caída, bloqueador ou serviço fora → null)
  function lerContagem(slug: string): Promise<number | null> {
    if (!contadorAtivo) return Promise.resolve(null);
    return C.ler([slug]).then((m: any) => (m && typeof m[slug] === 'number' ? m[slug] : null), () => null);
  }
  function animarNumero(el: HTMLElement, para: number | null): void {
    if (reduzir || para == null) { el.textContent = para == null ? '—' : fmt(para); return; }
    const dur = 1300, t0 = performance.now();
    const quadro = (agora: number) => {
      const p = Math.min(1, (agora - t0) / dur);
      el.textContent = fmt(Math.round(para * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }
  function faiscas(): void {
    const box = $('motes');
    if (!box || reduzir) return;
    box.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const m = document.createElement('span');
      m.className = 'mote';
      m.style.left = Math.random() * 100 + '%';
      m.style.animationDuration = (2 + Math.random() * 2.5) + 's';
      m.style.animationDelay = (Math.random() * 1.2) + 's';
      m.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      box.appendChild(m);
    }
  }
  function mostrarProximo(): void {
    const mostra = !!novena && novena.dia < novena.total;
    // style.display além do hidden: o CSS .btn{display:inline-flex} anula o atributo hidden
    ['paNext', 'ovNext'].forEach((id) => { const b = $(id); if (b) { b.hidden = !mostra; b.style.display = mostra ? '' : 'none'; } });
  }
  function capa(v: number | null): void {
    if (v == null || !(v > 0)) return; // sem número confiável (ou zero): a capa continua oculta
    const n = $('readerCountNum'), box = $('readerCount');
    if (n) n.textContent = fmt(v);
    if (box) box.hidden = false;
  }

  // "Compartilhar que rezei": imagem "Rezei hoje" para Stories/Status (public/js/compartilhar.js)
  const ovShare = $('ovShare');
  function rotular(): void {
    if (ovShare) ovShare.textContent = tt('share_prayed', 'Compartilhar que rezei');
    const tit = $('ovTitle'), sub = $('ovSub');
    if (novenaFeita) {
      if (tit) tit.textContent = tt('novena_done_title', 'Novena concluída');
      if (sub) sub.textContent = novenaFeita.feitos >= novenaFeita.total
        ? tt('novena_done_sub', 'Você rezou os {n} dias desta novena.').replace('{n}', String(novenaFeita.total))
        : tt('novena_done_partial', 'Você rezou {k} de {n} dias desta novena.').replace('{k}', String(novenaFeita.feitos)).replace('{n}', String(novenaFeita.total));
    } else {
      if (tit) tit.textContent = tt('completed_title', 'Oração concluída');
      if (sub) sub.textContent = tt('completed_sub', 'Você faz parte de uma corrente de oração.');
    }
    const nota = $('ovNote');
    if (nota && !nota.hidden) nota.textContent = tt('already_counted', 'Sua oração de hoje já foi contada.');
  }
  if (ovShare) ovShare.addEventListener('click', () => {
    if (!W.odCompartilhar) return;
    const n = numOverlay != null ? numOverlay : numVivo; // contagem da oração (sem número: sem a linha)
    const dia = novena ? novena.dia : 0;
    W.odCompartilhar.abrir({
      rotulo: novenaFeita ? tt('prayed_novena_done', 'Concluí a')
        : novena ? tt('prayed_day', 'Rezei o {n}º dia da').replace('{n}', String(dia)) : tt('prayed_today', 'Rezei hoje'),
      titulo: meta.titulo,
      linhas: n != null && n > 1 ? [tt('prayed_with', 'numa corrente de {n} orações').replace('{n}', fmt(n))] : [],
      banner: meta.banner, bannerReserva: meta.bannerReserva, foco: meta.bannerFoco || '',
      caminho: meta.caminho, dominio: meta.dominio,
      arquivo: 'rezei-' + meta.slug + (novena ? '-dia-' + dia : ''),
    });
  });

  // o overlay abre na hora; o número chega depois (preencher) ou fica "—"
  let focoAntes: Element | null = null;
  function abrir(): void {
    numOverlay = null;
    const num = $('ovNumber'); if (num) num.textContent = '…';
    const leg = document.querySelector<HTMLElement>('.ov-number-label'); if (leg) leg.style.display = 'none';
    if (ovShare) ovShare.hidden = !W.odCompartilhar;
    rotular();
    focoAntes = document.activeElement;
    $('overlay')!.classList.add('show');
    faiscas();
    mostrarProximo();
    const fechar = $('ovClose'); if (fechar) fechar.focus({ preventScroll: true });
  }
  function preencher(total: number | null): void {
    if (!(total != null && total > 0)) total = null; // falhou (ou zero): "—", sem inventar número
    numOverlay = total;
    if (total != null) numVivo = total;
    const leg = document.querySelector<HTMLElement>('.ov-number-label'); if (leg) leg.style.display = total == null ? 'none' : '';
    const num = $('ovNumber'); if (num) animarNumero(num, total);
    capa(total);
  }
  function nota(on: boolean): void {
    const n = $('ovNote');
    if (!n) return;
    n.hidden = !on;
    n.textContent = on ? tt('already_counted', 'Sua oração de hoje já foi contada.') : '';
  }
  function fechar(): void {
    const ov = $('overlay');
    if (!ov || !ov.classList.contains('show')) return;
    ov.classList.remove('show');
    if (focoAntes && (focoAntes as HTMLElement).focus && document.contains(focoAntes)) (focoAntes as HTMLElement).focus({ preventScroll: true });
  }

  const botao = $<HTMLButtonElement>('finishBtn');
  function concluir(auto: boolean): void {
    motor.pausar();                         // o assistente para: nada avança nem rola atrás do overlay
    const dica = $('finishHint');
    if (dica) dica.hidden = true;
    if (concluindo) return;                 // já há um registro em andamento (evita contar 2×)
    if (auto && concluidaNaLeitura) return; // o assistente chegou ao fim depois de "Concluir": não conclui de novo
    if (turnstileKey) {
      let tok = '';
      try { tok = W.turnstile ? W.turnstile.getResponse() : ''; } catch (e) {}
      if (!tok) { if (!auto && dica) { dica.hidden = false; dica.textContent = t('captcha_needed'); } return; }
    }
    const dia = novena ? novena.dia : 0;
    const chave = 'od-done:' + meta.slug + ':' + dia + ':' + hojeChave();
    const ja = !!guarda.ler(chave);
    concluidaNaLeitura = true;
    const pa = $('postActions'); if (pa) pa.style.display = 'flex';
    // B3: o dia da novena só entra no progresso ao concluir (abrir não marca nada)
    const r = novena ? novena.concluir() : null;
    novenaFeita = r && r.ultimo ? { feitos: r.feitos, total: r.total } : null;
    abrir();
    nota(contadorAtivo && ja);
    if (!contadorAtivo) { preencher(null); return; }
    // já contada hoje: mostra o número mais novo que a página conhece (a leitura do
    // odContador é guardada por página e seria a de antes da contagem)
    if (ja) { if (numVivo != null) preencher(numVivo); else lerContagem(meta.slug).then(preencher); return; }
    concluindo = true;
    let antes = '';
    if (botao) { botao.disabled = true; antes = botao.textContent || ''; botao.textContent = t('finishing'); }
    C.contarOracao(meta.slug)
      .then((res: any) => {
        const minha = res ? res.oracao : null;
        // só marca "já contada hoje" quando a contagem desta oração deu certo
        if (minha != null) guarda.gravar(chave, '1');
        if (res && res.total != null) guarda.gravar('od-total-cache', String(res.total));
        preencher(minha); // falhou → "—" (não finge que contou)
      }, () => preencher(null))
      .finally(() => { concluindo = false; if (botao) { botao.disabled = false; botao.textContent = antes; } });
  }
  if (botao) botao.addEventListener('click', () => concluir(false));

  // ações pós-oração
  function proximoDia(): void {
    fechar();
    if (novena && novena.dia < novena.total) novena.mostrar(novena.dia + 1, true);
  }
  function deNovo(): void {
    fechar();
    motor.reiniciar(false);
    concluidaNaLeitura = false;
    motor.tocar();
  }
  const catalogo = pagina('/') + '#catalogo';
  ['ovBack', 'paBack'].forEach((id) => { const a = $(id); if (a) a.setAttribute('href', catalogo); });
  ['ovNext', 'paNext'].forEach((id) => $(id)?.addEventListener('click', proximoDia));
  ['ovAgain', 'paAgain'].forEach((id) => $(id)?.addEventListener('click', deNovo));
  $('ovClose')?.addEventListener('click', fechar);
  $('overlay')?.addEventListener('click', function (this: HTMLElement, e) { if (e.target === this) fechar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

  // contagem desta oração, mostrada na capa. Se a leitura falhar, usa o número de reserva
  // do build (src/data/contadores.json); sem reserva, a capa fica oculta (nunca "0")
  if (contadorAtivo) {
    lerContagem(meta.slug).then((v) => {
      if (v != null && v > 0 && numVivo == null) numVivo = v;
      if (v == null && meta.reserva > 0) v = meta.reserva;
      capa(v);
    });
  }

  // limpeza: marcas "od-done:…" com mais de 30 dias, as antigas "od-mine:…" e o
  // antigo "od-progress:…" (marcava o dia ABERTO como progresso — B3)
  try {
    const limite = Date.now() - 30 * 86400000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.indexOf('od-mine:') === 0 || k.indexOf('od-progress:') === 0) { localStorage.removeItem(k); continue; }
      if (k.indexOf('od-done:') !== 0) continue;
      const d = k.slice(k.lastIndexOf(':') + 1).split('-');
      if (!(new Date(+d[0], +d[1] - 1, +d[2]).getTime() >= limite)) localStorage.removeItem(k);
    }
  } catch (e) {}

  mostrarProximo();
  return {
    concluir,
    novaLeitura() { concluidaNaLeitura = false; },
    mostrarProximo,
    rotular,
  };
}
