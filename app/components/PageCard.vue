<script setup lang="ts">
import type { PageSummary } from '~~/shared/content';
defineProps<{ page: PageSummary; variant?: 'article' | 'video' }>();
const site = useSiteSettings();
</script>
<template>
  <article
    :class="[variant === 'video' ? 'video-card' : 'article-card', { 'without-media': !page.cover }]"
  >
    <NuxtLink
      v-if="page.cover"
      :to="page.path"
      :class="variant === 'video' ? 'video-poster' : 'article-media'"
      :aria-label="page.title"
      ><img :src="page.cover" :alt="page.title" loading="lazy" decoding="async" /><span
        v-if="variant === 'video'"
        class="play-badge"
        aria-hidden="true"
        >▶</span
      ><span v-if="page.duration" class="duration-badge">{{ page.duration }}</span></NuxtLink
    >
    <div :class="variant === 'video' ? 'video-card-body' : 'article-card-body'">
      <div v-if="page.category || page.publishedAt" class="card-kicker">
        <span v-if="page.category">{{ page.category }}</span
        ><time v-if="page.publishedAt" :datetime="page.publishedAt">{{
          formatDate(page.publishedAt, site?.language)
        }}</time>
      </div>
      <h3>
        <NuxtLink :to="page.path">{{ page.title }}</NuxtLink>
      </h3>
      <p v-if="page.description">{{ page.description }}</p>
      <div class="card-footer">
        <span>{{ page.readingTime ? `${page.readingTime} min` : page.author }}</span
        ><NuxtLink :to="page.path">{{ variant === 'video' ? 'Watch' : 'Read' }} →</NuxtLink>
      </div>
    </div>
  </article>
</template>
