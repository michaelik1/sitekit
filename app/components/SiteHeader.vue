<script setup lang="ts">
const route = useRoute();
const site = useSiteSettings();
const navItems = [
  { href: "/articles", label: "Статьи" },
  { href: "/videos", label: "Видео" },
  { href: "/calendar", label: "Календарь" },
  { href: "/about", label: "О проекте" }
];
const isActive = (href: string) => route.path === href || route.path.startsWith(`${href}/`);
</script>

<template>
  <header class="site-header">
    <div class="utility-bar">
      <div class="container utility-inner">
        <span>Практические заметки для обычного участка</span>
        <NuxtLink to="/rss.xml" external>RSS</NuxtLink>
      </div>
    </div>
    <div class="container header-main">
      <NuxtLink to="/" class="brand" aria-label="На главную">
        <span class="brand-mark" aria-hidden="true">ДП</span>
        <span class="brand-copy">
          <strong>{{ site.name }}</strong>
          <small>{{ site.tagline }}</small>
        </span>
      </NuxtLink>

      <nav class="main-nav" aria-label="Основная навигация">
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          :aria-current="isActive(item.href) ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <NuxtLink to="/calendar" class="header-cta">Что делать сейчас</NuxtLink>

      <details class="mobile-menu">
        <summary aria-label="Открыть меню"><span></span><span></span><span></span></summary>
        <nav aria-label="Мобильная навигация">
          <NuxtLink v-for="item in navItems" :key="item.href" :to="item.href">{{ item.label }}</NuxtLink>
          <NuxtLink to="/contacts">Контакты</NuxtLink>
        </nav>
      </details>
    </div>
  </header>
</template>
