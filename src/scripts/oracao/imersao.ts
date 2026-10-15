// ════════════════════════════════════════════════════════════════
//  Modo Imersão — o "oratório digital": a imagem da oração ocupa a tela sob um
//  degradê, velas acesas tremulam ao longo da tela e o texto passa pelo meio, com a
//  linha lida sempre no centro (quem conduz é o assistente de leitura, motor.ts).
//  • Entrar: "Imersão" nas ferramentas do texto ou na barra do assistente. O assistente
//    começa a ler do trecho que está na tela (ou continua, se já estava lendo).
//  • Sair: "×" no alto, tecla Esc, o mesmo botão da barra, ou saindo da tela cheia.
//    Sair não para a leitura e não perde o lugar.
//  • Tela cheia quando o navegador permite (no iPhone não há: fica só a imersão).
//  • A camada (fundo, velas e faíscas) é montada na 1ª vez: nada pesa para quem não usa.
//    As velas "acendem" uma a uma a cada entrada.
//  • "Reduzir movimento": velas acesas e paradas, sem faíscas nem o zoom lento do fundo;
//    a linha lida salta só quando sai da faixa do meio.
//  • Não fica guardado: cada oração abre no modo normal. O CSS está na página da oração
//    ([...slug].astro, "Modo Imersão"); na impressão, nada disto aparece.
// ════════════════════════════════════════════════════════════════
import { traduzirArias, type Meta } from './dados';
import type { Motor } from './motor';
import { ancora } from './ferramentas';

export interface Posicao { alvo: number; min: number; max: number }
export interface Imersao {
  readonly ativa: boolean;
  entrar(): void;
  sair(): void;
  posicao(): Posicao | null;   // para o motor: onde fica a linha lida (null = fora da imersão)
}

// fileira de velas ao pé da tela (x em % da largura). Sem "h": lamparina num copo de vidro.
// "largo": só em telas largas; "lado": velas altas de altar, dos dois lados do texto (telas bem largas)
interface Vela { x: number; h?: number; w?: number; copo?: 'rubi' | 'ambar' | 'ouro'; largo?: boolean; lado?: boolean }
const VELAS: Vela[] = [
  { x: 4, copo: 'rubi' },
  { x: 10, h: 44, w: 12, largo: true },
  { x: 15, h: 62, w: 14 },
  { x: 21, copo: 'ambar', largo: true },
  { x: 27, copo: 'ouro' },
  { x: 33, h: 38, w: 12, largo: true },
  { x: 39, h: 52, w: 13 },
  { x: 45, copo: 'rubi', largo: true },
  { x: 50.5, h: 76, w: 16 },
  { x: 56, copo: 'ambar', largo: true },
  { x: 62, h: 46, w: 13 },
  { x: 67.5, h: 34, w: 11, largo: true },
  { x: 73, copo: 'rubi' },
  { x: 79, copo: 'ouro', largo: true },
  { x: 85, h: 58, w: 14 },
  { x: 90.5, h: 40, w: 12, largo: true },
  { x: 96, copo: 'ambar' },
  // velas de altar, altas, nas laterais (só em telas bem largas)
  { x: 5.5, h: 230, w: 24, lado: true },
  { x: 10.5, h: 300, w: 28, lado: true },
  { x: 15.5, h: 190, w: 22, lado: true },
  { x: 84.5, h: 200, w: 22, lado: true },
  { x: 89.5, h: 290, w: 28, lado: true },
  { x: 94.5, h: 240, w: 24, lado: true },
];
const BRASAS = 14;

// sorteio com semente: as velas tremulam de jeitos diferentes, mas iguais a cada visita
function sorteador(semente: number): () => number {
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const W = window as any;
const $ = (id: string) => document.getElementById(id);

export function iniciarImersao(meta: Meta, motor: Motor, aoMudar: () => void): Imersao | null {
  const html = document.documentElement;
  const botoes = [$('imersaoBtn'), $('rgImersao')].filter(Boolean) as HTMLElement[];
  if (!botoes.length) return null;

  let ativa = false;
  let montada = false;
  let fundo: HTMLElement | null = null, frente: HTMLElement | null = null, topo: HTMLElement | null = null;
  let telaCheiaNossa = false;   // pedimos a tela cheia (e ainda não largamos)
  let viuTelaCheia = false;     // ... e ela chegou (só então sair dela é "a pessoa saiu")
  let pedidos = 0;              // número do último pedido (um pedido antigo recusado não apaga o novo)
  // medidas da tela (px): altura do topo; distância do pé da tela até o alto da fileira de velas
  let mTopo = 64, mBaixo = 170;

  function montar(): void {
    if (montada) return;
    montada = true;
    const rnd = sorteador(7 + meta.slug.length * 31);

    // fundo: a mesma imagem do banner (já está no cache), o degradê, a luz das velas e as faíscas
    fundo = document.createElement('div');
    fundo.className = 'imersao';
    fundo.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.className = 'imersao-img';
    img.alt = '';
    img.decoding = 'async';
    const banner = document.querySelector<HTMLImageElement>('.reader-bg');
    if (banner && banner.getAttribute('srcset')) { img.setAttribute('srcset', banner.getAttribute('srcset')!); img.sizes = '100vw'; }
    img.src = banner ? (banner.currentSrc || banner.src) : meta.banner;
    img.onerror = () => { img.onerror = null; img.removeAttribute('srcset'); img.src = meta.bannerReserva; };
    // o mesmo recorte do banner (campo imageFocus): no celular aparece a parte que importa
    if (meta.bannerFoco) img.style.objectPosition = meta.bannerFoco;
    const veu = document.createElement('div'); veu.className = 'imersao-veu';
    const brasas = document.createElement('div'); brasas.className = 'imersao-brasas';
    for (let i = 0; i < BRASAS; i++) {
      const b = document.createElement('i');
      b.className = 'im-brasa';
      b.style.cssText = `--x:${(4 + rnd() * 92).toFixed(1)}%;--t:${(7 + rnd() * 6).toFixed(2)}s;--a:${(-rnd() * 13).toFixed(2)}s;`
        + `--dx:${(rnd() * 70 - 35).toFixed(0)}px;--s:${(2 + rnd() * 2.2).toFixed(1)}px`;
      brasas.appendChild(b);
    }
    fundo.append(img, veu, brasas);

    // frente: o degradê que apaga o texto no alto e embaixo, a luz quente das velas e as velas
    frente = document.createElement('div');
    frente.className = 'imersao-frente';
    frente.setAttribute('aria-hidden', 'true');
    const cima = document.createElement('div'); cima.className = 'imersao-nevoa imersao-nevoa-cima';
    const baixo = document.createElement('div'); baixo.className = 'imersao-nevoa imersao-nevoa-baixo';
    const luz = document.createElement('div'); luz.className = 'imersao-luz';
    const fileira = document.createElement('div'); fileira.className = 'imersao-velas';
    const lados = document.createElement('div'); lados.className = 'imersao-velas imersao-lados';
    let n = 0;
    for (const v of VELAS) {
      const s = document.createElement('span');
      // "ponta": nas telas bem largas as pontas da fileira dão lugar às velas de altar
      const ponta = !v.lado && (v.x < 19 || v.x > 81);
      s.className = 'im-vela' + (v.copo ? ' im-copo im-copo-' + v.copo : '') + (v.largo ? ' im-largo' : '') + (v.lado ? ' im-lado' : '') + (ponta ? ' im-ponta' : '');
      s.style.cssText = `--x:${v.x}%;--h:${v.h || 0}px;--w:${v.w || 14}px;--d:${(2.1 + rnd() * 1.7).toFixed(2)}s;`
        + `--a:${(-rnd() * 3).toFixed(2)}s;--i:${v.lado ? n++ % 6 : n++}`;
      s.innerHTML = '<i class="im-luz"><i class="im-halo"></i><i class="im-chama"></i></i><i class="im-corpo"></i>';
      (v.lado ? lados : fileira).appendChild(s);
    }
    frente.append(cima, baixo, luz, lados, fileira);

    // topo: nome da oração e o "×" para sair
    topo = document.createElement('div');
    topo.className = 'imersao-topo';
    const nome = document.createElement('p');
    nome.className = 'imersao-nome';
    nome.textContent = meta.titulo;
    nome.setAttribute('lang', meta.lingua || 'pt-BR');
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'imersao-sair';
    x.setAttribute('aria-label', 'Sair da imersão');
    x.dataset.i18nAria = 'immersion_exit';
    x.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    x.addEventListener('click', () => sair());
    topo.append(nome, x);

    document.body.append(fundo, frente, topo);
    traduzirArias(topo);
  }

  // medidas: o texto fica limpo entre o topo e a fileira de velas (que fica logo acima da barra).
  // A barra é medida pelo CSS (bottom + altura), não pela posição na tela: ela pode estar
  // deslizando (B17 a recolhe nas contas da novena) no instante em que a imersão liga.
  function medir(): void {
    if (!ativa) return;
    const vh = window.innerHeight;
    mTopo = topo ? Math.round(topo.getBoundingClientRect().height) : 64;
    const barra = document.querySelector<HTMLElement>('.rg-bar');
    let topoDaBarra = vh;
    if (barra) {
      const cs = getComputedStyle(barra);
      topoDaBarra = cs.position === 'fixed' ? vh - (parseFloat(cs.bottom) || 0) - barra.offsetHeight : barra.getBoundingClientRect().top;
    }
    const fileira = frente ? frente.querySelector<HTMLElement>('.imersao-velas:not(.imersao-lados)') : null;
    const altFileira = fileira ? fileira.offsetHeight : 0;   // 0 = sem velas (tela baixa, celular deitado)
    const base = Math.max(0, Math.round(vh - topoDaBarra + 8));
    mBaixo = base + altFileira;
    html.style.setProperty('--im-topo', mTopo + 'px');
    html.style.setProperty('--im-base', base + 'px');
    html.style.setProperty('--im-baixo', mBaixo + 'px');
  }

  // faixa limpa: entre o fim do degradê do alto e o começo do de baixo (um pouco para dentro
  // de cada um, onde o texto ainda se lê bem), medida nos próprios degradês
  function posicao(): Posicao | null {
    if (!ativa) return null;
    const vh = window.innerHeight || 1;
    let cima = mTopo + 70, baixo = vh - mBaixo - 80;
    const nc = frente && frente.querySelector<HTMLElement>('.imersao-nevoa-cima');
    const nb = frente && frente.querySelector<HTMLElement>('.imersao-nevoa-baixo');
    if (nc && nb) {
      const c = nc.getBoundingClientRect(), bx = nb.getBoundingClientRect();
      if (c.height && bx.height) {
        cima = c.bottom - 0.4 * Math.max(0, c.height - mTopo);
        baixo = bx.top + 0.4 * Math.max(0, bx.height - mBaixo);
      }
    }
    if (baixo - cima < 60) { const m = (cima + baixo) / 2; cima = m - 30; baixo = m + 30; }
    return { alvo: (cima + baixo) / 2 / vh, min: Math.max(0, cima / vh), max: Math.min(1, baixo / vh) };
  }

  function marcar(): void {
    for (const b of botoes) b.setAttribute('aria-pressed', ativa ? 'true' : 'false');
  }

  // aviso de conclusão, janela de compartilhar ou busca abertos: o Esc é deles
  function algoAberto(): boolean {
    const ov = $('overlay');
    return !!(ov && ov.classList.contains('show')) || !!document.querySelector('dialog[open]') || !!document.querySelector('.search-overlay:not([hidden])');
  }

  // tela cheia (Fullscreen API; Safari antigo com prefixo). Sem permissão: segue sem.
  // telaCheiaNossa = fomos nós que pedimos (e ainda não largamos)
  function pedirTelaCheia(): void {
    const el: any = document.documentElement;
    const doc: any = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!pedir) return;
    const n = ++pedidos;
    try {
      const r = pedir.call(el, { navigationUI: 'hide' });
      telaCheiaNossa = true;
      viuTelaCheia = false;
      if (r && typeof r.then === 'function') r.then(
        // a tela cheia chegou depois de a pessoa já ter saído (toques rápidos): larga agora
        () => { if (!ativa) { telaCheiaNossa = true; largarTelaCheia(); } },
        () => { if (n === pedidos && !(doc.fullscreenElement || doc.webkitFullscreenElement)) telaCheiaNossa = false; },
      );
    } catch (e) { if (n === pedidos) telaCheiaNossa = false; }
  }
  function largarTelaCheia(): void {
    const doc: any = document;
    if (!telaCheiaNossa) return;
    // pedido ainda andando: quem larga é o "then" acima, quando a tela cheia chegar
    if (!(doc.fullscreenElement || doc.webkitFullscreenElement)) return;
    telaCheiaNossa = false;
    viuTelaCheia = false;
    const sairTc = doc.exitFullscreen || doc.webkitExitFullscreen;
    try { const r = sairTc && sairTc.call(doc); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (e) {}
  }

  // muda a forma da página sem perder o lugar: o bloco do meio da tela fica onde estava
  function mudarForma(fazer: () => void): void {
    const a = ancora();
    const antes = a ? a.getBoundingClientRect().top : 0;
    fazer();
    if (a) {
      const delta = a.getBoundingClientRect().top - antes;
      if (Math.abs(delta) > 1) window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' as ScrollBehavior });
    }
  }

  let abridor: HTMLElement | null = null;
  let largura = window.innerWidth, altura = window.innerHeight;

  // pelo teclado (Enter/Espaço no botão), o foco vai para o "×"; pelo toque/mouse, não
  // (senão o Espaço, que rola a página, apertaria o "×")
  function entrar(viaTeclado = false, origem: HTMLElement | null = null): void {
    if (ativa) return;
    montar();
    pedirTelaCheia(); // precisa ser no mesmo toque do botão
    abridor = origem;
    const lugar = ancora();
    mudarForma(() => { ativa = true; html.classList.add('od-imersao'); });
    largura = window.innerWidth; altura = window.innerHeight;
    marcar();
    medir();
    aoMudar();
    // o texto passa sozinho: começa do trecho que está na tela (ou continua a leitura)
    if (!motor.tocando) motor.tocarDe(lugar);
    else motor.acompanhar();
    const x = topo && topo.querySelector<HTMLElement>('.imersao-sair');
    if (viaTeclado && x) x.focus({ preventScroll: true });
  }

  function sair(): void {
    if (!ativa) return;
    mudarForma(() => { ativa = false; html.classList.remove('od-imersao'); });
    marcar();
    largarTelaCheia();
    aoMudar();
    motor.acompanhar();
    // o foco estava no "×" (agora escondido) ou se perdeu: volta ao botão que abriu
    const f = document.activeElement as HTMLElement | null;
    if (!f || f === document.body || (topo && topo.contains(f))) {
      const visivel = (el: HTMLElement | null) => !!el && el.getClientRects().length > 0;
      const alvo = visivel(abridor) ? abridor : $('rgImersao');
      if (alvo) alvo.focus({ preventScroll: true });
    }
  }

  for (const b of botoes) b.addEventListener('click', (e) => {
    if (ativa) sair();
    else entrar((e as MouseEvent).detail === 0, b);
  });

  // Esc sai (escuta antes do aviso de conclusão e da busca, que têm o seu próprio Esc: com
  // um deles aberto, só ele fecha)
  document.addEventListener('keydown', (e) => {
    if (!ativa || e.key !== 'Escape' || algoAberto()) return;
    e.preventDefault();
    sair();
  }, true);

  // saiu da tela cheia (Esc do navegador, gesto de voltar): sai da imersão também — a não ser
  // que o Esc fosse para fechar o aviso de conclusão, a janela de compartilhar ou a busca
  const aoTrocarTelaCheia = () => {
    const doc: any = document;
    const cheia = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    // a tela cheia pedida chegou com a imersão já desligada: larga
    if (cheia && telaCheiaNossa && !ativa) { largarTelaCheia(); return; }
    if (cheia && telaCheiaNossa) viuTelaCheia = true;
    // (um aviso atrasado da tela cheia anterior, de um entra-e-sai rápido, não conta: só vale
    // sair da tela cheia que esta imersão pediu e que chegou)
    if (!cheia && telaCheiaNossa && viuTelaCheia && ativa) {
      telaCheiaNossa = false;
      viuTelaCheia = false;
      if (!algoAberto()) { sair(); return; }
    }
    requestAnimationFrame(() => {
      if (ativa) { medir(); motor.acompanhar(); largura = window.innerWidth; altura = window.innerHeight; }
      else if (!cheia) motor.acompanhar(false); // a tela voltou ao tamanho de antes
    });
  };
  document.addEventListener('fullscreenchange', aoTrocarTelaCheia);
  document.addEventListener('webkitfullscreenchange', aoTrocarTelaCheia);

  // tela girou ou mudou de tamanho: mede de novo; a linha volta ao meio se a largura mudou ou
  // a altura mudou muito (a barra de endereço que some ao rolar não conta)
  let quadro = 0;
  window.addEventListener('resize', () => {
    if (!ativa || quadro) return;
    quadro = requestAnimationFrame(() => {
      quadro = 0;
      if (!ativa) return;
      medir();
      const w = window.innerWidth, h = window.innerHeight;
      if (w !== largura || Math.abs(h - altura) > 120) motor.acompanhar(false);
      largura = w; altura = h;
    });
  }, { passive: true });

  marcar();
  // para testes e depuração
  W.odImersao = { get ativa() { return ativa; }, entrar: () => entrar(), sair, posicao };

  return {
    get ativa() { return ativa; },
    entrar: () => entrar(),
    sair,
    posicao,
  };
}

