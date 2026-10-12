// ════════════════════════════════════════════════════════════════
//  SITEMAP (dist/sitemap.xml) — a lista de páginas que o Google deve conhecer.
//  Gerado no fim do build a partir das páginas que REALMENTE existem no dist/,
//  então páginas novas entram sozinhas. Ficam de fora:
//    • a 404 e qualquer página com <meta name="robots" content="noindex">
//      (o Base.astro marca assim /ferramentas/…, a Liturgia enquanto vazia etc.);
//    • /tempos-liturgicos/ (só redireciona) e /ferramentas/… (páginas internas).
//  Endereços sempre com barra final, como o GitHub Pages serve (/oracao/pai-nosso/).
//  O public/robots.txt aponta para este arquivo.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FORA = [/^\/tempos-liturgicos\//, /^\/ferramentas\//];
const NOINDEX = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i;

export function sitemap() {
  let site = '', base = '/';
  return {
    name: 'sitemap',
    hooks: {
      'astro:config:done': ({ config }) => { site = String(config.site || '').replace(/\/$/, ''); base = config.base || '/'; },
      'astro:build:done': ({ dir, logger }) => {
        try {
          if (!site) { logger.warn('"site" não definido no astro.config — sitemap não gerado'); return; }
          const dist = fileURLToPath(dir);
          const urls = [];
          const varre = (pasta) => {
            for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
              const caminho = path.join(pasta, item.name);
              if (item.isDirectory()) { varre(caminho); continue; }
              if (item.name !== 'index.html') continue; // build.format 'directory': cada página é <pasta>/index.html
              const rel = '/' + path.relative(dist, path.dirname(caminho)).split(path.sep).filter(Boolean).map((p) => p + '/').join('');
              if (FORA.some((re) => re.test(rel))) continue;
              if (NOINDEX.test(fs.readFileSync(caminho, 'utf8').slice(0, 20000))) continue;
              urls.push(rel);
            }
          };
          varre(dist);
          urls.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
          const raiz = site + base.replace(/\/$/, '');
          const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            urls.map((u) => `  <url><loc>${esc(raiz + encodeURI(u))}</loc></url>`).join('\n') +
            '\n</urlset>\n';
          fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
          logger.info(`sitemap.xml com ${urls.length} endereços`);
        } catch (e) {
          logger.warn(`sitemap não gerado: ${e.message}`);
        }
      },
    },
  };
}
