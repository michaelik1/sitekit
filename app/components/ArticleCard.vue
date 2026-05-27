<script setup lang="ts">
import type { Article } from "~~/shared/articles";

const props = withDefaults(defineProps<{
  article: Article;
  compact?: boolean;
}>(), {
  compact: false
});
</script>

<template>
  <article :class="props.compact ? 'article-card compact' : 'article-card'">
    <NuxtLink :to="`/articles/${props.article.slug}`" class="article-image-link" :aria-label="props.article.title">
      <img :src="props.article.image" alt="" class="article-image" loading="lazy" />
    </NuxtLink>
    <div class="article-card-body">
      <div class="meta-row">
        <span>{{ props.article.category }}</span>
        <span>{{ props.article.readingTime }}</span>
      </div>
      <h3>
        <NuxtLink :to="`/articles/${props.article.slug}`">{{ props.article.title }}</NuxtLink>
      </h3>
      <p>{{ props.article.summary }}</p>
      <div class="tag-row">
        <span v-for="tag in props.article.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>
