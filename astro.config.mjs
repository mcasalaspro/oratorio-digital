import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { previas } from './scripts/og/previas.mjs';
import { sitemap } from './scripts/sitemap.mjs';

// Os arquivos LEIA-ME.txt dentro de public/ são instruções internas (onde pôr cada imagem).
// Eles continuam no projeto, ao lado das imagens, mas são apagados do site gerado (dist/)
// ao fim do build — assim não ficam publicados em www.oratoriodigital.com/.../LEIA-ME.txt.
const semLeiaMe = {
  name: 'sem-leia-me',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const apagar = (pasta) => {
        for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
          const caminho = path.join(pasta, item.name);
          if (item.isDirectory()) apagar(caminho);
          else if (/^leia-?me\b.*\.txt$/i.test(item.name)) fs.rmSync(caminho);
        }
      };
      apagar(fileURLToPath(dir));
    },
  },
};

export default defineConfig({
  site: 'https://www.oratoriodigital.com',
  base: '/',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // previas: imagens de prévia de link (dist/og/…) · sitemap: dist/sitemap.xml — ver scripts/
  integrations: [semLeiaMe, previas(), sitemap()],
});
