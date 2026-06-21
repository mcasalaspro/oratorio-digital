import { defineConfig } from 'astro/config';
// ───────────────────────────────────────────────────────────────
//  CONFIGURAÇÃO DO DEPLOY (Domínio customizado)
//
//  Usando domínio próprio: www.oratoriodigital.com
// ───────────────────────────────────────────────────────────────
export default defineConfig({
  site: 'https://www.oratoriodigital.com',
  base: '/',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});