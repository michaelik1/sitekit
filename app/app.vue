<script setup lang="ts">
const config = useRuntimeConfig();
const siteUrl = config.public.siteUrl;

useHead({
  htmlAttrs: { lang: "ru" },
  titleTemplate: (title?: string) => title ? `${title} | Дача Практик` : "Дача Практик — инструкции для сада и огорода",
  meta: [
    {
      name: "description",
      content: "Русский дачный портал со статьями, видеоинструкциями, сезонными памятками и практическими советами."
    },
    { property: "og:title", content: "Дача Практик" },
    { property: "og:description", content: "Инструкции, статьи и видео для дачников." },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "ru_RU" },
    { property: "og:url", content: siteUrl }
  ]
});
</script>

<template>
  <div>
    <SiteHeader />
    <main>
      <NuxtPage />
    </main>
    <SiteFooter />
  </div>
</template>
