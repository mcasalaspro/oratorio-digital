// ════════════════════════════════════════════════════════════════
//  PAINEL DE CONFIGURAÇÃO DO SITE
//  Edite este arquivo e dê "git push" para alterar o site.
// ════════════════════════════════════════════════════════════════

export const site = {
  name: 'Oratório Digital',
  tagline: 'Um espaço para rezar com calma — orações, terços e novenas.',
  defaultLang: 'pt-BR' as const,

  // ── Contador da comunidade (serviço Abacus, grátis, sem cadastro) ──
  // IMPORTANTE: troque o namespace por algo ÚNICO seu (3–64 caracteres,
  // letras/números/._-) para seu contador não se misturar com o de outra
  // pessoa. Ex.: 'oratorio-do-joao-2026'.
  counter: {
    enabled: true,
    base: 'https://abacus.jasoncameron.dev',
    namespace: 'oratorio-digital-EXEMPLO-troque-isto',
    totalKey: 'total', // chave do contador global somado de todas as orações
  },

  // ── CAPTCHA anti-bot (Cloudflare Turnstile) — OPCIONAL ──
  // Deixe siteKey vazio para desativar (o botão "Concluir" funciona sem ele,
  // com proteção simples de 1x por dia por oração). Para ativar, crie um
  // widget grátis em https://dash.cloudflare.com → Turnstile e cole a chave.
  turnstile: {
    siteKey: '', // ex.: '0x4AAAAAAA...'
  },

  // ── Destaques fixos na home (orações sempre em evidência) ──
  // Use o "id" do arquivo .md (nome do arquivo sem .md).
  pinnedPrayers: [
    { id: 'pai-nosso', order: 1 },
    { id: 'ave-maria', order: 2 },
    { id: 'terco', order: 3 },
    { id: 'dezena', order: 4 },
    { id: 'rosario', order: 5 },
  ],

  // Quantos destaques litúrgicos automáticos mostrar de uma vez
  maxLiturgicalHighlights: 3,

  showCommunityCounter: true,
};

// ── Textos da interface (i18n leve). Adicione idiomas aqui. ──
export const ui = {
  'pt-BR': {
    langLabel: 'Português',
    nav_home: 'Início',
    nav_catalog: 'Catálogo',
    hero_kicker: 'Reze com calma',
    community_pre: 'Esse site já guiou',
    community_post: 'orações, ajudando a iluminar nosso mundo.',
    count_tap: 'toque para contar',
    times_prayed: 'vezes que esta oração já foi rezada',
    count_short: 'vezes rezada',
    today_seal: 'Oração do dia',
    today_cta: 'Rezar agora',
    today_begin: 'Comece hoje esta novena',
    pinned_title: 'Orações do dia a dia',
    catalog_title: 'Catálogo',
    search_placeholder: 'Buscar oração, novena ou santo…',
    filter_all: 'Todas',
    filter_today: 'Hoje',
    filter_week: 'Essa semana',
    filter_month: 'Este mês',
    lbl_type: 'Tipo',
    lbl_date: 'Data',
    lbl_lang: 'Idioma',
    filter_type: 'Tipo',
    filter_lang: 'Idioma',
    type_oracao: 'Oração',
    type_novena: 'Novena',
    type_rosario: 'Rosário',
    type_terco: 'Terço',
    type_dezena: 'Dezena',
    type_outro: 'Outro',
    no_results: 'Nenhuma oração encontrada com esses filtros.',
    open: 'Abrir',
    day: 'Dia',
    day_of: 'de',
    reading_assistant: 'Assistente de leitura',
    speed: 'Ritmo',
    speed_slow: 'Lento',
    speed_medium: 'Médio',
    speed_fast: 'Rápido',
    start: 'Iniciar',
    pause: 'Pausar',
    resume: 'Continuar',
    restart: 'Reiniciar',
    next: 'Próximo',
    finish_prayer: 'Concluir oração',
    finishing: 'Registrando…',
    completed_title: 'Oração concluída',
    completed_sub: 'Você faz parte de uma corrente de oração.',
    total_now: 'orações no total',
    next_day: 'Próximo dia',
    pray_again: 'Rezar de novo',
    back_catalog: 'Voltar ao catálogo',
    days_to_feast: 'dias para a festa',
    feast_today: 'A festa é hoje!',
    suggested_day: 'comece pelo',
    captcha_needed: 'Confirme que você não é um robô para registrar.',
    progress_saved: 'Progresso salvo neste aparelho.',
  },
  en: {
    langLabel: 'English',
    nav_home: 'Home',
    nav_catalog: 'Catalog',
    hero_kicker: 'Pray with calm',
    community_pre: 'This site has already guided',
    community_post: 'prayers, helping to light up our world.',
    count_tap: 'tap to count',
    times_prayed: 'times this prayer has been prayed',
    count_short: 'times prayed',
    today_seal: 'Prayer of the day',
    today_cta: 'Pray now',
    today_begin: 'Begin this novena today',
    pinned_title: 'Everyday prayers',
    catalog_title: 'Catalog',
    search_placeholder: 'Search a prayer, novena or saint…',
    filter_all: 'All',
    filter_today: 'Today',
    filter_week: 'This week',
    filter_month: 'This month',
    lbl_type: 'Type',
    lbl_date: 'Date',
    lbl_lang: 'Language',
    filter_type: 'Type',
    filter_lang: 'Language',
    type_oracao: 'Prayer',
    type_novena: 'Novena',
    type_rosario: 'Rosary',
    type_terco: 'Chaplet',
    type_dezena: 'Decade',
    type_outro: 'Other',
    no_results: 'No prayers match these filters.',
    open: 'Open',
    day: 'Day',
    day_of: 'of',
    reading_assistant: 'Reading assistant',
    speed: 'Pace',
    speed_slow: 'Slow',
    speed_medium: 'Medium',
    speed_fast: 'Fast',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    next: 'Next',
    finish_prayer: 'Complete prayer',
    finishing: 'Recording…',
    completed_title: 'Prayer completed',
    completed_sub: 'You are part of a chain of prayer.',
    total_now: 'prayers in total',
    next_day: 'Next day',
    pray_again: 'Pray again',
    back_catalog: 'Back to catalog',
    days_to_feast: 'days to the feast',
    feast_today: 'The feast is today!',
    suggested_day: 'start on',
    captcha_needed: 'Confirm you are not a robot to record it.',
    progress_saved: 'Progress saved on this device.',
  },
} as const;

export type Lang = keyof typeof ui;

// Prefixa o caminho-base do site (para funcionar em GitHub Pages /repo/).
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path) return base || '/';
  if (/^https?:\/\//.test(path)) return path; // URL externa
  return base + (path.startsWith('/') ? path : '/' + path);
}
