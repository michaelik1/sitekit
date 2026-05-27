<script setup lang="ts">
import type { VideoItem } from "~~/shared/videos";

const props = defineProps<{
  video: VideoItem;
}>();
</script>

<template>
  <article class="video-card">
    <NuxtLink :to="`/videos/${props.video.id}`" class="video-poster" :aria-label="props.video.title">
      <img :src="props.video.poster" alt="" loading="lazy" />
      <span class="play-badge">▶</span>
      <span class="duration-badge">{{ props.video.duration }}</span>
    </NuxtLink>
    <div class="video-card-body">
      <div class="meta-row">
        <span>{{ props.video.category }}</span>
        <span>{{ props.video.quality }}</span>
      </div>
      <h3>
        <NuxtLink :to="`/videos/${props.video.id}`">{{ props.video.title }}</NuxtLink>
      </h3>
      <p>{{ props.video.description }}</p>
      <div class="video-stats">
        <span>❤ {{ props.video.likes }}</span>
        <span>👁 {{ props.video.views }}</span>
        <span>💬 {{ props.video.comments }}</span>
      </div>
    </div>
  </article>
</template>
