<script setup lang="ts">
import type { VideoItem } from "~~/shared/videos";

const props = defineProps<{
  videos: VideoItem[];
  categories: string[];
}>();

const query = ref("");
const category = ref("Все");

const filtered = computed(() => {
  const normalized = query.value.trim().toLowerCase();

  return props.videos.filter((video) => {
    const matchesCategory = category.value === "Все" || video.category === category.value;
    const haystack = [video.title, video.description, video.category, video.author, video.tags.join(" ")]
      .join(" ")
      .toLowerCase();

    return matchesCategory && (!normalized || haystack.includes(normalized));
  });
});
</script>

<template>
  <section class="browser-section">
    <div class="toolbar">
      <label>
        <span>Поиск по видео</span>
        <input v-model="query" placeholder="например: грядка, слизни, полив" />
      </label>
      <label>
        <span>Тематика</span>
        <select v-model="category">
          <option>Все</option>
          <option v-for="item in props.categories" :key="item">{{ item }}</option>
        </select>
      </label>
    </div>
    <div class="content-grid three">
      <VideoCard v-for="video in filtered" :key="video.id" :video="video" />
    </div>
    <p v-if="filtered.length === 0" class="empty-state">Видео по такому запросу не найдено. Попробуйте другой фильтр.</p>
  </section>
</template>
