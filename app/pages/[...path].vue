<script setup lang="ts">
import type { ContentPage } from '~~/shared/content';
const route = useRoute();
const site = useSiteSettings();
const { data: page, error } = await useFetch<ContentPage>('/api/content/page', {
  query: computed(() => ({ path: route.path }))
});
if (error.value || !page.value)
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage:
      error.value?.statusCode === 503 ? 'Content temporarily unavailable' : 'Page not found',
    fatal: true
  });
watch(error, (value) => {
  if (value) showError({ statusCode: value.statusCode ?? 404, statusMessage: 'Page not found' });
});
const canonical = computed(
  () => `${site.value!.url}${page.value?.path === '/' ? '' : page.value?.path}`
);
const firstHero = computed(() => page.value?.blocks[0]?.type === 'hero');
useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description ?? site.value?.description,
  ogTitle: () => page.value?.title,
  ogDescription: () => page.value?.description ?? site.value?.description,
  ogUrl: () => canonical.value,
  ogType: () => (page.value?.layout === 'article' ? 'article' : 'website'),
  ogImage: () => (page.value?.cover ? `${site.value!.url}${page.value.cover}` : undefined),
  articlePublishedTime: () => page.value?.publishedAt,
  articleModifiedTime: () => page.value?.updatedAt,
  twitterCard: 'summary_large_image'
});
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script:
    page.value?.layout === 'article'
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: page.value.title,
              description: page.value.description,
              datePublished: page.value.publishedAt,
              dateModified: page.value.updatedAt,
              ...(page.value.author
                ? { author: { '@type': 'Person', name: page.value.author } }
                : {}),
              ...(page.value.cover ? { image: `${site.value!.url}${page.value.cover}` } : {}),
              mainEntityOfPage: canonical.value,
              inLanguage: site.value!.language
            }).replace(/</g, '\\u003c')
          }
        ]
      : []
}));
</script>
<template>
  <article v-if="page" :class="['engine-page', `layout-${page.layout}`]">
    <ContentBlock v-if="firstHero" :block="page.blocks[0]!" />
    <div class="container page-shell">
      <nav v-if="page.breadcrumbs.length" class="breadcrumbs" aria-label="Breadcrumbs">
        <template v-for="crumb in page.breadcrumbs" :key="crumb.href"
          ><NuxtLink :to="crumb.href">{{ crumb.label }}</NuxtLink
          ><span aria-hidden="true">→</span></template
        ><span aria-current="page">{{ page.title }}</span>
      </nav>
      <header
        v-if="!firstHero"
        :class="[
          page.layout === 'article' && page.cover ? 'article-header' : 'archive-heading',
          'engine-heading'
        ]"
      >
        <div>
          <p v-if="page.eyebrow || page.category" class="eyebrow">
            {{ page.eyebrow || page.category }}
          </p>
          <h1>{{ page.title }}</h1>
          <p v-if="page.description" class="article-deck">{{ page.description }}</p>
          <div v-if="page.author || page.publishedAt || page.readingTime" class="article-meta">
            <span v-if="page.author">{{ page.author }}</span
            ><time v-if="page.publishedAt" :datetime="page.publishedAt">{{
              formatDate(page.publishedAt, site?.language)
            }}</time
            ><span v-if="page.readingTime">{{ page.readingTime }} min</span
            ><span v-if="page.duration">{{ page.duration }}</span>
          </div>
        </div>
        <img
          v-if="page.cover && page.layout === 'article'"
          :src="page.cover"
          :alt="page.title"
          class="article-cover"
        />
      </header>
      <div :class="{ 'article-layout': page.toc && page.tocItems.length }">
        <aside
          v-if="page.toc && page.tocItems.length"
          class="article-toc"
          aria-label="On this page"
        >
          <nav class="toc-inner">
            <strong>On this page</strong
            ><a
              v-for="item in page.tocItems.filter((item) => item.level === 2)"
              :key="item.id"
              :href="`#${item.id}`"
              >{{ item.text }}</a
            >
          </nav>
        </aside>
        <div class="content-blocks">
          <ContentBlock
            v-for="(block, index) in firstHero ? page.blocks.slice(1) : page.blocks"
            :key="`${page.path}:${index}`"
            :block="block"
          />
        </div>
      </div>
      <div v-if="page.tags.length" class="tag-list">
        <span v-for="tag in page.tags" :key="tag">#{{ tag }}</span>
      </div>
    </div>
  </article>
</template>
