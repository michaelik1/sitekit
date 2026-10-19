<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string } }>();
useSeoMeta({
  title: props.error.statusCode === 404 ? 'Page not found' : 'Error',
  robots: 'noindex'
});
</script>
<template>
  <div class="site-shell">
    <SiteHeader />
    <main id="main-content" class="container error-page">
      <span class="error-code">{{ error.statusCode || 500 }}</span>
      <h1>{{ error.statusCode === 404 ? 'Page not found' : 'Unable to load the site' }}</h1>
      <p>{{ error.statusMessage }}</p>
      <NuxtLink to="/" class="button primary" @click.prevent="clearError({ redirect: '/' })"
        >Go home</NuxtLink
      >
    </main>
    <SiteFooter />
  </div>
</template>
