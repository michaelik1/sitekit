<script setup lang="ts">
import type { VideoItem } from "~~/shared/content";
const props = defineProps<{ video: VideoItem }>();
</script>

<template>
  <article class="video-card">
    <NuxtLink :to="`/videos/${props.video.id}`" class="video-poster" :aria-label="props.video.title">
      <img :src="props.video.poster" :alt="`Кадр видео: ${props.video.title}`" loading="lazy" decoding="async">
      <span class="play-badge" aria-hidden="true">▶</span>
      <span class="duration-badge">{{ props.video.duration }}</span>
    </NuxtLink>
    <div class="video-card-body">
      <div class="card-kicker"><span>{{ props.video.category }}</span><span>{{ props.video.quality }}</span></div>
      <h2><NuxtLink :to="`/videos/${props.video.id}`">{{ props.video.title }}</NuxtLink></h2>
      <p>{{ props.video.description }}</p>
      <div class="card-footer">
        <time :datetime="props.video.publishedAt">{{ formatDate(props.video.publishedAt) }}</time>
        <span>Смотреть →</span>
      </div>
    </div>
  </article>
</template>
