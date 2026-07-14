<script setup lang="ts">
const config = useRuntimeConfig();
const site = useSiteSettings();
const siteUrl = String(config.public.siteUrl).replace(/\/$/, "");

useHead({
  htmlAttrs: { lang: "ru" },
  titleTemplate: (title?: string) => title ? `${title} — ${site.name}` : `${site.name} — ${site.tagline}`,
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "alternate", type: "application/rss+xml", title: `${site.name}: новые статьи`, href: "/rss.xml" }
  ],
  meta: [
    { name: "theme-color", content: "#183c2c" },
    { property: "og:site_name", content: site.name },
    { property: "og:locale", content: "ru_RU" },
    { property: "og:type", content: "website" }
  ]
});

useSeoMeta({
  description: site.description,
  ogTitle: `${site.name} — ${site.tagline}`,
  ogDescription: site.description,
  ogImage: `${siteUrl}/og-default.png`,
  twitterCard: "summary_large_image"
});
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">К содержанию</a>
    <SiteHeader />
    <main id="main-content">
      <NuxtPage />
    </main>
    <SiteFooter />
  </div>
</template>
