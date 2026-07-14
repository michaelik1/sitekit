<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string; message?: string } }>();
const isNotFound = computed(() => props.error.statusCode === 404);
useSeoMeta({ title: isNotFound.value ? "Страница не найдена" : "Ошибка" });
</script>

<template>
  <div class="site-shell">
    <SiteHeader />
    <main id="main-content" class="container error-page">
      <span class="error-code">{{ error.statusCode || 500 }}</span>
      <p class="eyebrow">{{ isNotFound ? "Такой страницы нет" : "Не удалось открыть страницу" }}</p>
      <h1>{{ isNotFound ? "Материал мог быть перенесён" : "Попробуйте ещё раз чуть позже" }}</h1>
      <p>{{ error.statusMessage || error.message || "Вернитесь на главную или откройте каталог статей." }}</p>
      <div class="hero-actions"><NuxtLink to="/" class="button primary">На главную</NuxtLink><NuxtLink to="/articles" class="button text-button">К статьям →</NuxtLink></div>
    </main>
    <SiteFooter />
  </div>
</template>
