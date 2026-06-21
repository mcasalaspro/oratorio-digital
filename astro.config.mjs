import { defineConfig } from 'astro/config';
// ───────────────────────────────────────────────────────────────
//  CONFIGURAÇÃO DO DEPLOY (Domínio customizado)
//
//  Usando domínio próprio: www.oratoriodigital.com
// ───────────────────────────────────────────────────────────────
export default defineConfig({
  site: 'https://www.oratoriodigital.com',
  base: '/',
<<<<<<< HEAD
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
=======
  ...
})
>>>>>>> fb3f847242b7e2c49376e98571385aeb79c65e48
