export default defineNuxtConfig({
  compatibilityDate: "2026-05-06",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover"
    }
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? "https://dacha-praktik.ru",
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL ?? "editor@dacha-praktik.ru"
    }
  },
  routeRules: {
    "/generated/**": { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
    "/favicon.svg": { headers: { "cache-control": "public, max-age=86400" } },
    "/og-default.svg": { headers: { "cache-control": "public, max-age=86400" } },
    "/og-default.png": { headers: { "cache-control": "public, max-age=86400" } },
    "/api/articles/**": { headers: { "x-robots-tag": "noindex" } },
    "/api/videos/**": { headers: { "x-robots-tag": "noindex" } },
    "/register": { redirect: { to: "/calendar", statusCode: 301 } }
  },
  nitro: {
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: ["/", "/articles", "/videos", "/calendar", "/about", "/contacts", "/privacy", "/sitemap.xml", "/rss.xml", "/robots.txt"]
    }
  },
  typescript: { strict: true }
});
