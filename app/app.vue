<script setup lang="ts">
import type { SiteSettings } from '~~/shared/content';
const site = useSiteSettings();
const { data, error } = await useFetch<SiteSettings>('/api/content/site');
if (error.value || !data.value)
  throw createError({
    statusCode: 503,
    statusMessage: 'Unable to load content/site.yml. Check the mounted directory and server logs.'
  });
watch(
  data,
  (value) => {
    if (value) site.value = value;
  },
  { immediate: true }
);
const themeStyle = computed(() => {
  const theme = site.value!.theme;
  return `:root{--forest:${theme.accent};--forest-2:${theme.accent};--rust:${theme.highlight};--paper:${theme.background};--container:${theme.width}px;--heading-font:${theme.font === 'sans' ? 'ui-sans-serif,system-ui,sans-serif' : 'Georgia,serif'}}`;
});
useHead(() => ({
  htmlAttrs: { lang: site.value!.language },
  titleTemplate: (title?: string) =>
    title && title !== site.value!.name ? `${title} — ${site.value!.name}` : site.value!.name,
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'alternate', type: 'application/rss+xml', title: site.value!.name, href: '/rss.xml' }
  ],
  style: [{ innerHTML: themeStyle.value }],
  meta: [
    { name: 'theme-color', content: site.value!.theme.accent },
    { property: 'og:site_name', content: site.value!.name }
  ]
}));
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader />
    <main id="main-content"><NuxtPage /></main>
    <SiteFooter />
  </div>
</template>
