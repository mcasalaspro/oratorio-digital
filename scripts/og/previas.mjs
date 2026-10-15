// ════════════════════════════════════════════════════════════════
//  IMAGENS DE PRÉVIA DE LINK (WhatsApp, Facebook, Telegram, X…)
//  1200×630, JPEG, menos de 300 KB (o WhatsApp ignora imagens maiores).
//
//  São geradas NO BUILD, direto no site gerado (dist/) — nunca em public/,
//  para não irem parar no git:
//    dist/og/oracao/<slug>.jpg      dist/og/biografia/<slug>.jpg
//    dist/og/textos/<slug>.jpg      dist/og/padrao.jpg  (todas as outras páginas)
//  O Base.astro aponta o og:image para esses caminhos por convenção
//  (/oracao/pai-nosso/ → /og/oracao/pai-nosso.jpg), sem mexer nas páginas.
//
//  Arte: o MESMO banner que a página mostra (lido do HTML gerado), em "cover",
//  + degradê escuro embaixo + o logo (public/logo-340.webp) e o nome do site.
//  O nome foi pré-renderizado uma vez com a fonte do site (Cormorant 600) em
//  scripts/og/marca.png — para mudar o texto, gere um PNG novo no mesmo lugar
//  (fundo transparente, texto creme #f6ecd6, ~1000×180 px).
//  Sem título por página: o título vai no og:title, ao lado da imagem.
//
//  Cache: cada prévia pronta fica guardada em node_modules/.astro/previas/ e só é
//  refeita quando o banner, o logo, o nome ou esta arte mudam (mude VERSAO ao
//  alterar o desenho). Sem cache (ex.: GitHub Actions) tudo é gerado de novo.
//
//  Nunca derruba o build: cada imagem tem try/catch; banner ausente usa o
//  saints/default.webp e, se ainda assim falhar, a página recebe a padrão.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const VERSAO = 'arte-1';                       // mude ao alterar o desenho: refaz as prévias guardadas
const L = 1200, A = 630;                       // tamanho da prévia
const SECOES = ['oracao', 'biografia', 'textos']; // mesmas do Base.astro (og:type "article")
const LIMITE = 295 * 1024;                     // abaixo dos 300 KB do WhatsApp
const QUALIDADES = [82, 74, 66, 58];           // tenta a primeira; reduz só se passar do limite
const PARALELO = 8;
const FAIXA = 0.42;                            // o degradê começa a 42% da altura
const MARCA = fileURLToPath(new URL('./marca.png', import.meta.url));

/** Integração do Astro: gera as prévias ao fim do build. */
export function previas() {
  let base = '/', cache = null;
  return {
    name: 'previas-de-link',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base || '/';
        try { cache = fileURLToPath(new URL('previas/', config.cacheDir)); } catch { cache = null; }
      },
      'astro:build:done': async ({ dir, logger }) => {
        const t0 = Date.now();
        try {
          const r = await gerar(fileURLToPath(dir), base, cache, logger);
          logger.info(`${r.total} prévias + padrão em ${((Date.now() - t0) / 1000).toFixed(1)} s — ` +
            `${r.feitas} geradas, ${r.guardadas} do cache (menor ${kb(r.menor)}, maior ${kb(r.maior)})` +
            (r.falhas ? ` — ${r.falhas} com a imagem padrão` : ''));
        } catch (e) {
          logger.warn(`imagens de prévia não geradas: ${e.message}`);
        }
      },
    },
  };
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
const existe = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const hash = (...partes) => { const h = crypto.createHash('sha1'); for (const p of partes) h.update(p); return h.digest('hex'); };

async function gerar(dist, base, cacheDir, logger) {
  const sharp = (await import('sharp')).default;
  const semBase = (url) => (url.startsWith(base) ? '/' + url.slice(base.length) : url);
  const arquivoDe = (url) => path.join(dist, decodeURIComponent(semBase(url).split(/[?#]/)[0]));
  const reserva = path.join(dist, 'saints/default.webp');
  const logo = path.join(dist, 'logo-340.webp');
  const molde = hash(VERSAO, fs.readFileSync(MARCA), fs.readFileSync(logo)); // muda se a arte mudar

  // ── cache: dist/og/<x>.jpg ⇄ node_modules/.astro/previas/<x>.jpg (+ .chave) ──
  const usados = new Set();
  const doCache = (rel, chave, destino) => {
    if (!cacheDir) return false;
    const jpg = path.join(cacheDir, rel), ch = jpg + '.chave';
    usados.add(jpg); usados.add(ch);
    try {
      if (fs.readFileSync(ch, 'utf8') !== chave) return false;
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(jpg, destino);
      return true;
    } catch { return false; }
  };
  const guarda = (rel, chave, buf) => {
    if (!cacheDir) return;
    try {
      const jpg = path.join(cacheDir, rel);
      fs.mkdirSync(path.dirname(jpg), { recursive: true });
      fs.writeFileSync(jpg, buf); fs.writeFileSync(jpg + '.chave', chave);
    } catch {}
  };

  // ── peças fixas, montadas uma vez ──
  const peca = async (arquivo, altura) => sharp(arquivo).resize({ height: altura }).png().toBuffer({ resolveWithObject: true });

  // prévia das páginas: degradê embaixo + logo e nome centralizados (sobrevivem ao corte quadrado do WhatsApp).
  // A camada cobre só a faixa de baixo (onde há degradê), já decodificada: reaproveitada em todas as prévias.
  const topoFaixa = Math.round(A * FAIXA), altFaixa = A - topoFaixa;
  const pLogo = await peca(logo, 86);
  const pNome = await peca(MARCA, 70);
  const vao = 12, larg = pLogo.info.width + vao + pNome.info.width;
  const esq = Math.round((L - larg) / 2), baseY = altFaixa - 44;
  const faixa = await sharp({ create: { width: L, height: altFaixa, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: Buffer.from(degrade(altFaixa, 0.9)) },
      { input: pLogo.data, left: esq, top: baseY - pLogo.info.height },
      { input: pNome.data, left: esq + pLogo.info.width + vao, top: baseY - Math.round((pLogo.info.height + pNome.info.height) / 2) - 2 },
    ]).raw().toBuffer({ resolveWithObject: true });
  const camadasPagina = [{ input: faixa.data, raw: faixa.info, top: topoFaixa, left: 0 }];

  // padrão (abertura, listas, cantos…): um dos "espaços de oração" da abertura (a capela;
  // sem ela, o rays.webp de sempre) + logo grande e nome — ver src/config/herois.ts
  const fundo = ['textures/hero-capela.webp', 'textures/rays.webp'].map((a) => path.join(dist, a)).find(existe) || reserva;
  const destPadrao = path.join(dist, 'og/padrao.jpg');
  const chavePadrao = hash(molde, fs.readFileSync(fundo));
  let padrao;
  if (doCache('padrao.jpg', chavePadrao, destPadrao)) padrao = fs.readFileSync(destPadrao);
  else {
    const gLogo = await peca(logo, 210);
    const gNome = await peca(MARCA, 104);
    padrao = await previa(sharp, fundo, [
      { input: Buffer.from(`<svg width="${L}" height="${A}"><rect width="100%" height="100%" fill="#0c0804" fill-opacity="0.5"/></svg>`) },
      { input: Buffer.from(degrade(A, 0.85)), top: 0, left: 0 },
      { input: gLogo.data, left: Math.round((L - gLogo.info.width) / 2), top: 120 },
      { input: gNome.data, left: Math.round((L - gNome.info.width) / 2), top: 120 + gLogo.info.height + 18 },
    ]);
    fs.mkdirSync(path.dirname(destPadrao), { recursive: true });
    fs.writeFileSync(destPadrao, padrao);
    guarda('padrao.jpg', chavePadrao, padrao);
  }

  // ── uma prévia por oração, biografia e texto ──
  const trabalhos = [];
  for (const secao of SECOES) {
    const raiz = path.join(dist, secao);
    if (!fs.existsSync(raiz)) continue;
    const varre = (pasta) => {
      for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
        if (!item.isDirectory()) continue;
        const sub = path.join(pasta, item.name);
        if (existe(path.join(sub, 'index.html'))) trabalhos.push({ secao, html: path.join(sub, 'index.html'), rel: path.relative(raiz, sub) });
        varre(sub);
      }
    };
    varre(raiz);
  }

  let feitas = 0, guardadas = 0, falhas = 0, menor = padrao.length, maior = padrao.length, i = 0;
  async function operario() {
    while (i < trabalhos.length) {
      const t = trabalhos[i++];
      const relJpg = path.join(t.secao, `${t.rel}.jpg`);
      const destino = path.join(dist, 'og', relJpg);
      try {
        const html = fs.readFileSync(t.html, 'utf8');
        // o banner que a própria página mostra: <img class="reader-bg" src=…> (orações e biografias)
        // ou o fundo do texto/canto: <img class="txt-bg" src=…> (o src é a imagem inteira; o srcset
        // só traz versões menores); o formato antigo <div class="txt-bg" style="background-image: …">
        // continua aceito
        const url = (html.match(/<img\b[^>]*\bclass="(?:reader-bg|txt-bg)"[^>]*\bsrc="([^"]+)"/) ||
                     html.match(/class="txt-bg"[^>]*background-image:\s*url\(['"]?([^'")]+)/) || [])[1];
        let origem = url ? arquivoDe(url) : '';
        if (!existe(origem)) {
          logger.warn(`prévia de /${t.secao}/${t.rel}/: banner ${url || '(não achado no HTML)'} ausente — usando saints/default.webp`);
          origem = reserva;
        }
        const chave = hash(molde, fs.readFileSync(origem));
        let buf;
        if (doCache(relJpg, chave, destino)) { guardadas++; buf = fs.readFileSync(destino); }
        else {
          buf = await previa(sharp, origem, camadasPagina);
          fs.mkdirSync(path.dirname(destino), { recursive: true });
          fs.writeFileSync(destino, buf);
          guarda(relJpg, chave, buf);
          feitas++;
        }
        menor = Math.min(menor, buf.length); maior = Math.max(maior, buf.length);
      } catch (e) {
        falhas++;
        logger.warn(`prévia de /${t.secao}/${t.rel}/ falhou (${e.message}) — usando a padrão`);
        try { fs.mkdirSync(path.dirname(destino), { recursive: true }); fs.copyFileSync(destPadrao, destino); } catch {}
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALELO, trabalhos.length) || 1 }, operario));

  // limpa do cache as prévias de páginas que não existem mais
  if (cacheDir && fs.existsSync(cacheDir)) {
    const limpa = (pasta) => {
      for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
        const c = path.join(pasta, item.name);
        if (item.isDirectory()) limpa(c); else if (!usados.has(c)) { try { fs.rmSync(c); } catch {} }
      }
    };
    try { limpa(cacheDir); } catch {}
  }
  return { total: trabalhos.length, feitas, guardadas, falhas, menor, maior };
}

/** Uma prévia: banner em "cover" 1200×630 (guardando a parte de cima, onde ficam rostos e
 *  auréolas dos ícones) + camadas, em JPEG abaixo do limite (reduz a qualidade só se precisar). */
async function previa(sharp, arquivo, camadas) {
  const { width: w = L, height: h = A } = await sharp(arquivo).metadata();
  const esc = Math.max(L / w, A / h);
  const rw = Math.max(L, Math.round(w * esc)), rh = Math.max(A, Math.round(h * esc));
  const corte = { left: Math.round((rw - L) / 2), top: Math.round((rh - A) * 0.2), width: L, height: A };
  let buf;
  for (const q of QUALIDADES) {
    buf = await sharp(arquivo, { failOn: 'none' }).rotate().resize(rw, rh).extract(corte)
      .flatten({ background: '#15110b' }).composite(camadas).jpeg({ quality: q }).toBuffer();
    if (buf.length <= LIMITE) break;
  }
  return buf;
}

/** Degradê vertical de "altura" px: transparente no alto, escuro (opacidade) na base. */
function degrade(altura, opacidade) {
  const meio = altura === A ? FAIXA : 0; // na imagem inteira, começa a FAIXA; na faixa, começa no topo dela
  return `<svg width="${L}" height="${altura}" xmlns="http://www.w3.org/2000/svg"><defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#0c0804" stop-opacity="0"/>` +
    `<stop offset="${meio}" stop-color="#0c0804" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0c0804" stop-opacity="${opacidade}"/>` +
    `</linearGradient></defs><rect width="${L}" height="${altura}" fill="url(#g)"/></svg>`;
}
