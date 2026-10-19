import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

export default defineNuxtConfig({
  compatibilityDate: '2026-05-06',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    contentDir: existsSync(resolve('content/site.yml')) ? 'content' : 'examples/content',
    contentCacheTtlMs: 1000,
    public: { siteUrl: '' }
  },
  routeRules: {
    '/api/**': { headers: { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } }
  },
  nitro: { preset: 'node-server', compressPublicAssets: true },
  typescript: { strict: true }
});
