<script setup lang="ts">
import type { VideoCollection, VideoItem } from "~~/shared/content";
const route = useRoute();
const config = useRuntimeConfig();
const id = String(route.params.id ?? "");
const { data: video, error } = await useFetch<VideoItem>(`/api/videos/${encodeURIComponent(id)}`);
if (error.value || !video.value) throw createError({ statusCode: 404, statusMessage: "Видео не найдено.", fatal: true });
const current = computed(() => video.value as VideoItem);
const { data: collection } = await useFetch<VideoCollection>("/api/videos", { query: { category: current.value.category }, default: () => ({ videos: [], categories: [] }) });
const related = computed(() => (collection.value?.videos ?? []).filter((item) => item.id !== current.value.id).slice(0, 3));
const siteUrl = String(config.public.siteUrl).replace(/\/$/, "");
const canonical = `${siteUrl}/videos/${current.value.id}`;
const videoMime = computed(() => current.value.src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4');
useSeoMeta({ title: current.value.title, description: current.value.description, ogTitle: current.value.title, ogDescription: current.value.description, ogImage: current.value.poster.endsWith(".svg") ? `${siteUrl}/og-default.png` : `${siteUrl}${current.value.poster}`, ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container video-page">
    <nav class="breadcrumbs" aria-label="Хлебные крошки"><NuxtLink to="/">Главная</NuxtLink><span>→</span><NuxtLink to="/videos">Видео</NuxtLink><span>→</span><span>{{ current.category }}</span></nav>
    <div class="video-layout">
      <section>
        <div class="video-player-shell">
          <video controls playsinline preload="metadata" :poster="current.poster" class="video-player">
            <source :src="current.src" :type="videoMime">
            Ваш браузер не поддерживает встроенное видео.
          </video>
        </div>
        <p v-if="current.placeholder" class="video-notice">{{ current.note }}</p>
        <p class="eyebrow video-category">{{ current.category }}</p>
        <h1>{{ current.title }}</h1>
        <p class="article-deck">{{ current.description }}</p>
        <div class="article-meta"><span>{{ current.author }}</span><time :datetime="current.publishedAt">{{ formatDate(current.publishedAt) }}</time><span>{{ current.duration }}</span><span>{{ current.quality }}</span></div>
        <div class="tag-list"><span v-for="tag in current.tags" :key="tag">#{{ tag }}</span></div>
      </section>
      <aside class="video-sidebar">
        <p class="eyebrow">Коротко</p>
        <h2>Что взять из ролика</h2>
        <p>{{ current.description }}</p>
        <dl>
          <div><dt>Раздел</dt><dd>{{ current.category }}</dd></div>
          <div><dt>Автор</dt><dd>{{ current.author }}</dd></div>
          <div><dt>Дата</dt><dd>{{ formatDate(current.publishedAt) }}</dd></div>
        </dl>
        <NuxtLink :to="`/articles?category=${encodeURIComponent(current.category)}`" class="button primary full">Статьи по теме</NuxtLink>
      </aside>
    </div>
    <section v-if="related.length" class="editorial-section"><div class="section-header ruled"><div><p class="eyebrow">Дальше</p><h2>Ещё по теме</h2></div></div><div class="home-video-grid"><VideoCard v-for="item in related" :key="item.id" :video="item" /></div></section>
  </div>
</template>
