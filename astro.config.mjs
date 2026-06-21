import { defineConfig } from 'astro/config';

// ───────────────────────────────────────────────────────────────
//  CONFIGURAÇÃO DO DEPLOY (GitHub Pages)
//
//  • Se você nomear seu repositório EXATAMENTE como "oratorio-digital",
//    não precisa mudar nada aqui — só troque SEU-USUARIO pelo seu login.
//  • Se usar outro nome de repositório, ajuste "base" para "/nome-do-repo".
//  • Se publicar em https://SEU-USUARIO.github.io (repositório de usuário),
//    use base: '/'.
// ───────────────────────────────────────────────────────────────
export default defineConfig({
  site: 'https://www.oratoriodigital.com',
  base: '/',
  ...
})
