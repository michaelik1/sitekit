<script setup lang="ts">
const site = useSiteSettings();
const config = useRuntimeConfig();
const email = String(config.public.contactEmail || site.contactEmail);
const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-about">
        <div class="footer-brand">{{ site.name }}</div>
        <p>{{ site.description }}</p>
        <p class="footer-note">{{ site.footerNote }}</p>
      </div>
      <div>
        <h2>Материалы</h2>
        <NuxtLink to="/articles">Все статьи</NuxtLink>
        <NuxtLink to="/videos">Видеоразборы</NuxtLink>
        <NuxtLink to="/calendar">Сезонный календарь</NuxtLink>
        <a href="/rss.xml">RSS-лента</a>
      </div>
      <div>
        <h2>Редакция</h2>
        <NuxtLink to="/about">О проекте</NuxtLink>
        <NuxtLink to="/contacts">Связаться</NuxtLink>
        <NuxtLink to="/privacy">Конфиденциальность</NuxtLink>
        <a :href="`mailto:${email}`">{{ email }}</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© {{ year }} {{ site.name }}</span>
      <span>Без рекламных трекеров по умолчанию</span>
    </div>
  </footer>
</template>
