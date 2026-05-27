export default defineNuxtConfig({
  compatibilityDate: "2026-05-06",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1"
    }
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://dacha-praktik.ru"
    }
  },
  nitro: {
    prerender: {
      crawlLinks: true
    }
  },
  typescript: {
    strict: true
  }
});
