<script setup lang="ts">
defineProps<{ error: { statusCode?: number; statusMessage?: string; message?: string } }>();
</script>

<template>
  <div>
    <SiteHeader />
    <main class="container page-shell narrow centered">
      <p class="eyebrow">{{ error.statusCode || 404 }}</p>
      <h1>{{ error.statusCode === 404 ? "Страница не найдена" : "Что-то пошло не так" }}</h1>
      <p>{{ error.statusMessage || error.message || "Возможно, материал был перенесён или адрес набран с ошибкой." }}</p>
      <NuxtLink to="/" class="button primary">На главную</NuxtLink>
    </main>
    <SiteFooter />
  </div>
</template>
