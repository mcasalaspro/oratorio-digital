import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.oratoriodigital.com',
  base: '/',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
