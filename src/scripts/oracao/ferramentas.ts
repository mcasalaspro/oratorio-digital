// ════════════════════════════════════════════════════════════════
//  Ferramentas de leitura: favoritar, compartilhar, tamanho da letra (B15),
//  Modo Foco (G11) e tela acesa (G1).
//  • A+/A− mudam --reader-scale; o CSS da página faz rubricas, mistérios, títulos e
//    citações acompanharem. O valor salvo já foi aplicado antes de pintar (script curto
//    da página).
//  • Foco: esconde topo, rodapé, ferramentas, biografia e produtos; lembra a escolha
//    ("od-foco") e mantém a tela acesa. Botão também na barra do assistente (liga no meio
//    da leitura, sem parar e sem perder o lugar).
//  • Tela acesa (Wake Lock API): enquanto o assistente toca, no Modo Foco, na Imersão
//    (imersao.ts) ou pelo botão "Manter tela acesa"; libera ao pausar, ao sair do foco e ao deixar a página
//    (o navegador libera sozinho ao esconder; ao voltar, pede de novo se ainda precisa).
// ════════════════════════════════════════════════════════════════
import { t, guarda } from './dados';
import type { Motor } from './motor';

export interface Ferramentas { atualizarTela(): void; readonly telaAcesa: boolean }

const W = window as any;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

// bloco do texto que está no meio da tela (para não perder o lugar quando a página muda de forma:
// Foco e Imersão)
export function ancora(): HTMLElement | null {
  const conteudo = $('prayer-content');
  if (!conteudo) return null;
  const SEL = '#prayer-content p, #prayer-content blockquote, #prayer-content li, #prayer-content h2, #prayer-content h3';
  const r0 = conteudo.getBoundingClientRect();
  const sob = document.elementFromPoint(Math.round(r0.left + Math.min(40, r0.width / 2)), Math.round(window.innerHeight * 0.45));
  const bloco = sob ? (sob as Element).closest<HTMLElement>(SEL) : null;
  if (bloco) return bloco;
  for (const b of Array.from(conteudo.querySelectorAll<HTMLElement>('p, blockquote, li, h2, h3'))) {
    const r = b.getBoundingClientRect();
    if (r.height && r.bottom > 0) return r.top < window.innerHeight ? b : null;
  }
  return null;
}

export function iniciarFerramentas(slug: string, motor: Motor): Ferramentas {
  // ── favoritar ──
  const fav = $('favBtn');
  if (fav && W.odFav) {
    const marcar = () => {
      const on = W.odFav.has(slug);
      fav.setAttribute('aria-pressed', on ? 'true' : 'false');
      const lab = fav.querySelector('span');
      if (lab) lab.textContent = t(on ? 'fav_saved' : 'fav_save');
    };
    marcar();
    fav.addEventListener('click', () => { W.odFav.toggle(slug); marcar(); });
    document.addEventListener('od:lang', marcar);
  }

  // ── compartilhar o link ──
  const share = $('shareBtn');
  if (share) share.addEventListener('click', () => {
    const url = location.href.split('#')[0];
    // menu do aparelho; se falhar (sem ser cancelamento), copia o link; "Link copiado!" só se
    // copiou; sem área de transferência, mostra o endereço — ver public/js/compartilhar.js
    if (W.odCompartilhar) { W.odCompartilhar.link({ url, titulo: document.title, botao: share }); return; }
    if (navigator.share) navigator.share({ title: document.title, url }).catch(() => {});
  });

  // ── tamanho da letra (B15) ──
  const PASSOS = [0.9, 1, 1.15, 1.3, 1.45];
  let fi = PASSOS.indexOf(parseFloat(guarda.ler('od-fontscale') || '1'));
  if (fi < 0) fi = 1;
  const up = $('fsUp'), down = $('fsDown');
  function escala(): void {
    document.documentElement.style.setProperty('--reader-scale', String(PASSOS[fi]));
    guarda.gravar('od-fontscale', String(PASSOS[fi]));
    if (up) up.setAttribute('aria-disabled', fi >= PASSOS.length - 1 ? 'true' : 'false');
    if (down) down.setAttribute('aria-disabled', fi <= 0 ? 'true' : 'false');
  }
  escala();
  up?.addEventListener('click', () => { fi = Math.min(PASSOS.length - 1, fi + 1); escala(); });
  down?.addEventListener('click', () => { fi = Math.max(0, fi - 1); escala(); });

  // ── tela acesa (G1) ──
  const WL = (navigator as any).wakeLock;
  let sentinela: any = null, pedindo = false, querAcesa = false;
  // a classe no <html> vem do script curto do <head> (antes de pintar); a do <body> é a do Base.astro
  const emFoco = () => document.documentElement.classList.contains('od-foco');
  const emImersao = () => document.documentElement.classList.contains('od-imersao');
  const precisa = () => motor.tocando || querAcesa || emFoco() || emImersao();
  async function atualizarTela(): Promise<void> {
    if (!WL) return;
    const quer = precisa() && document.visibilityState === 'visible';
    if (quer && !sentinela && !pedindo) {
      pedindo = true;
      try {
        const s = await WL.request('screen');
        sentinela = s;
        s.addEventListener('release', () => { if (sentinela === s) sentinela = null; });
        if (!(precisa() && document.visibilityState === 'visible')) { sentinela = null; await s.release(); }
      } catch (e) { /* negado (bateria fraca, sem permissão): segue sem */ }
      finally { pedindo = false; }
    } else if (!quer && sentinela) {
      const s = sentinela; sentinela = null;
      try { await s.release(); } catch (e) {}
    }
  }
  document.addEventListener('visibilitychange', () => { atualizarTela(); });
  const acesa = $('wakeBtn');
  if (acesa && WL) {
    acesa.hidden = false;
    acesa.addEventListener('click', () => {
      querAcesa = !querAcesa;
      acesa.setAttribute('aria-pressed', querAcesa ? 'true' : 'false');
      atualizarTela();
    });
  }

  // ── Modo Foco (G11) — o estado salvo já foi aplicado antes de pintar ──
  // Dois botões: nas ferramentas (topo do texto) e na barra do assistente (rgFoco), que fica
  // sempre à mão durante a leitura. Ligar ou desligar não para o assistente e não perde o lugar:
  // o bloco que está no meio da tela continua na mesma altura depois que topo e ferramentas somem.
  const botoesFoco = [$('focusBtn'), $('rgFoco')].filter(Boolean) as HTMLElement[];
  function aplicarFoco(on: boolean, guardar: boolean): void {
    const a = guardar ? ancora() : null;
    const antes = a ? a.getBoundingClientRect().top : 0;
    document.documentElement.classList.toggle('od-foco', on);
    document.body.classList.toggle('reader-focus', on);
    for (const b of botoesFoco) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (guardar) guarda.gravar('od-foco', on ? '1' : '0');
    if (a) {
      const delta = a.getBoundingClientRect().top - antes;
      if (Math.abs(delta) > 1) window.scrollBy(0, delta);
    }
    atualizarTela();
  }
  aplicarFoco(emFoco(), false);
  for (const b of botoesFoco) b.addEventListener('click', () => aplicarFoco(!emFoco(), true));

  return {
    atualizarTela() { atualizarTela(); },
    get telaAcesa() { return !!sentinela; },
  };
}
