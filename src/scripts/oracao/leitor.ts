// ════════════════════════════════════════════════════════════════
//  Oratório Digital — módulo da página da oração (E3)
//  Antes: ~33 KB de script repetidos dentro do HTML de cada uma das 234 orações.
//  Agora: este módulo (empacotado pelo Astro, com hash no nome → fica no cache do
//  navegador) + os dados da página em <script type="application/json" id="oracao-dados">.
//  O que precisa estar certo ANTES de pintar (tamanho da letra, Modo Foco, dia da
//  novena) fica em dois scripts curtos dentro da própria página; o texto já vem
//  preparado do build (src/scripts/oracao/preparar.ts).
//
//  Partes: motor.ts (assistente de leitura), novena.ts, conclusao.ts (contador e
//  overlay), ferramentas.ts (favoritar, compartilhar, letra, foco, tela acesa),
//  misterios-dia.ts (Terço e Rosários).
// ════════════════════════════════════════════════════════════════
import { lerDados, t, guarda, traduzirArias } from './dados';
import { criarMotor, iniciarContas, desenharConta, contaDe } from './motor';
import { iniciarNovena } from './novena';
import { iniciarConclusao, type Conclusao } from './conclusao';
import { iniciarFerramentas, type Ferramentas } from './ferramentas';
import { iniciarMisterios } from './misterios-dia';

const meta = lerDados();
const content = document.getElementById('prayer-content');

if (meta && content) {
  let conclusao: Conclusao | null = null;
  let ferramentas: Ferramentas | null = null;

  iniciarContas(content);

  const barra = document.querySelector<HTMLElement>('.rg-bar');
  const play = document.getElementById('rgPlay');
  const playRotulo = document.getElementById('rgPlayLabel');
  const ritmo = document.getElementById('rgSpeed') as HTMLSelectElement | null;
  // G4: lembra o ritmo escolhido
  const salvo = guarda.ler('od-ritmo');
  if (ritmo && salvo && Array.from(ritmo.options).some((o) => o.value === salvo)) ritmo.value = salvo;

  const motor = criarMotor({
    content,
    barra,
    ritmo: ritmo ? ritmo.value : 'medium',
    aoMudar: () => { rotularPlay(); ferramentas?.atualizarTela(); recolherBarra(); },
    aoTerminar: () => conclusao?.concluir(true), // marca como rezada (conta na oração e no total)
    aoRecomecar: () => conclusao?.novaLeitura(),
  });

  function rotularPlay(): void {
    const txt = motor.tocando ? t('pause') : motor.iniciado ? t('resume') : t('start');
    if (playRotulo) playRotulo.textContent = txt;
    if (play) { play.classList.toggle('is-playing', motor.tocando); play.setAttribute('aria-label', txt); }
  }
  play?.addEventListener('click', () => motor.alternar());
  document.getElementById('rgRestart')?.addEventListener('click', () => { motor.reiniciar(true); rotularPlay(); });
  document.getElementById('rgNext')?.addEventListener('click', () => { motor.proximo(); rotularPlay(); });
  ritmo?.addEventListener('change', () => { motor.setRitmo(ritmo.value); guarda.gravar('od-ritmo', ritmo.value); });

  const novena = iniciarNovena(meta.slug, () => {
    motor.reconstruir(); // outro dia: nova leitura, contas zeradas
    conclusao?.mostrarProximo();
    rotularPlay();
  });
  conclusao = iniciarConclusao(meta, motor, novena);
  ferramentas = iniciarFerramentas(meta.slug, motor);
  const misterios = iniciarMisterios(content, meta.misterios);

  // ── B17: a barra do assistente não cobre as contas da novena nem a legenda ──
  // (parada, ela se recolhe enquanto contas/legenda estão na faixa de baixo da tela)
  const cobriveis = ['beads', 'dayCaption'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  let pedido = 0;
  function recolherBarra(): void {
    if (!barra || !cobriveis.length || pedido) return;
    pedido = requestAnimationFrame(() => {
      pedido = 0;
      const vh = window.innerHeight;
      const topo = vh - barra.offsetHeight - 8;
      const cobre = cobriveis.some((el) => {
        if (el.hidden) return false;
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.bottom > topo && r.top < vh;
      });
      barra.classList.toggle('rg-recolhida', cobre && !motor.tocando);
    });
  }
  if (cobriveis.length) {
    window.addEventListener('scroll', recolherBarra, { passive: true });
    window.addEventListener('resize', recolherBarra);
    recolherBarra();
  }

  // textos dinâmicos ao trocar de idioma
  traduzirArias();
  document.addEventListener('od:lang', () => {
    rotularPlay();
    traduzirArias();
    conclusao?.rotular();
    misterios?.rotular();
    content.querySelectorAll('[data-rep], section.od-secao').forEach((el) => { const c = contaDe(el); if (c) desenharConta(c); });
  });
  rotularPlay();

  // para testes e depuração (sem efeito na página)
  (window as any).odLeitor = { motor, novena, depurar: () => motor.depurar() };
}
