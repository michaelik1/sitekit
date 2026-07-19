<script setup lang="ts">
import type { ArticleSummary } from "~~/shared/content";

const props = withDefaults(defineProps<{ article: ArticleSummary; compact?: boolean; featured?: boolean }>(), {
  compact: false,
  featured: false
});
</script>

<template>
  <article :class="['article-card', { compact: props.compact, featured: props.featured }]">
    <NuxtLink :to="`/articles/${props.article.slug}`" class="article-media" :aria-label="props.article.title">
      <img :src="props.article.cover" :alt="`Обложка статьи: ${props.article.title}`" loading="lazy" decoding="async">
    </NuxtLink>
    <div class="article-card-body">
      <div class="card-kicker">
        <span>{{ props.article.category }}</span>
        <time :datetime="props.article.publishedAt">{{ formatDate(props.article.publishedAt) }}</time>
      </div>
      <h2><NuxtLink :to="`/articles/${props.article.slug}`">{{ props.article.title }}</NuxtLink></h2>
      <p>{{ props.article.summary }}</p>
      <div class="card-footer">
        <span>{{ props.article.readingTime }}</span>
        <span>Читать →</span>
      </div>
    </div>
  </article>
</template>
