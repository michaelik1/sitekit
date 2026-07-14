<script setup lang="ts">
import type { VideoItem } from "~~/shared/content";
const props = defineProps<{ videos: VideoItem[]; categories: string[] }>();
const query = ref("");
const category = ref("Все");
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase("ru");
  return props.videos.filter((video) => {
    const categoryMatches = category.value === "Все" || video.category === category.value;
    const haystack = [video.title, video.description, video.category, video.author, video.tags.join(" ")].join(" ").toLocaleLowerCase("ru");
    return categoryMatches && (!needle || haystack.includes(needle));
  });
});
</script>

<template>
  <section class="browser-section" aria-label="Каталог видео">
    <div class="catalog-toolbar">
      <label class="search-field"><span>Найти видео</span><input v-model="query" type="search" placeholder="Полив, теплица, дорожка"></label>
      <label><span>Раздел</span><select v-model="category"><option>Все</option><option v-for="item in props.categories" :key="item">{{ item }}</option></select></label>
      <div class="result-count" aria-live="polite">{{ filtered.length }} видео</div>
    </div>
    <div v-if="filtered.length" class="video-list-grid"><VideoCard v-for="video in filtered" :key="video.id" :video="video" /></div>
    <div v-else class="empty-state"><strong>Видео не найдено</strong><p>Попробуйте другой запрос или раздел.</p></div>
  </section>
</template>
