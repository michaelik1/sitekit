<script setup lang="ts">
import type { VideoItem } from "~~/shared/videos";

const route = useRoute();
const id = String(route.params.id ?? "");

const { data: video, error } = await useFetch<VideoItem>(`/api/videos/${encodeURIComponent(id)}`);

if (error.value || !video.value) {
  throw createError({ statusCode: 404, statusMessage: "Видео не найдено.", fatal: true });
}

const currentVideo = video.value as VideoItem;

const { data: collection } = await useFetch<{ videos: VideoItem[]; categories: string[] }>("/api/videos", {
  default: () => ({ videos: [], categories: [] })
});
const related = computed(() => (collection.value?.videos ?? [])
  .filter((item) => item.id !== currentVideo.id && item.category === currentVideo.category)
  .slice(0, 3));

useSeoMeta({
  title: currentVideo.title,
  description: currentVideo.description,
  ogTitle: currentVideo.title,
  ogDescription: currentVideo.description,
  ogImage: currentVideo.poster
});
</script>

<template>
  <div class="container video-page">
    <NuxtLink to="/videos" class="text-link">← Все видео</NuxtLink>
    <div class="video-layout">
      <section>
        <div class="video-player-shell">
          <video controls preload="metadata" :poster="currentVideo.poster" class="video-player">
            <source :src="currentVideo.src" type="video/mp4" />
            Ваш браузер не поддерживает HTML5-видео.
          </video>
        </div>
        <h1>{{ currentVideo.title }}</h1>
        <p class="lead-text">{{ currentVideo.description }}</p>
        <div class="video-stats big">
          <span>❤ {{ currentVideo.likes }} лайков</span>
          <span>👁 {{ currentVideo.views }} просмотров</span>
          <span>💬 {{ currentVideo.comments }} комментариев</span>
          <span>{{ currentVideo.duration }}</span>
        </div>
        <div class="tag-row large">
          <span v-for="tag in currentVideo.tags" :key="tag">{{ tag }}</span>
        </div>
      </section>
      <aside class="video-side-card">
        <h2>О ролике</h2>
        <dl>
          <div><dt>Автор</dt><dd>{{ currentVideo.author }}</dd></div>
          <div><dt>Дата</dt><dd>{{ new Date(currentVideo.date).toLocaleDateString("ru-RU") }}</dd></div>
          <div><dt>Раздел</dt><dd>{{ currentVideo.category }}</dd></div>
          <div><dt>Файл</dt><dd>{{ currentVideo.filename }}</dd></div>
          <div><dt>Качество</dt><dd>{{ currentVideo.quality }}</dd></div>
        </dl>
        <p>Чтобы заменить видео, положите файл с таким же именем в папку <code>public/media/videos</code>. Карточка и страница подтянутся из <code>videos.yml</code>.</p>
      </aside>
    </div>

    <section v-if="related.length > 0" class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Похожие видео</p>
          <h2>Ещё по теме</h2>
        </div>
      </div>
      <div class="content-grid three">
        <VideoCard v-for="item in related" :key="item.id" :video="item" />
      </div>
    </section>
  </div>
</template>
