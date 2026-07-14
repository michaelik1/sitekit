<script setup lang="ts">
import type { ArticleCollection, ArticleDetail } from "~~/shared/content";
const route = useRoute();
const config = useRuntimeConfig();
const site = useSiteSettings();
const slug = String(route.params.slug ?? "");
const { data: article, error } = await useFetch<ArticleDetail>(`/api/articles/${encodeURIComponent(slug)}`);
if (error.value || !article.value) throw createError({ statusCode: 404, statusMessage: "Статья не найдена.", fatal: true });
const current = computed(() => article.value as ArticleDetail);
const { data: relatedData } = await useFetch<ArticleCollection>("/api/articles", { query: { category: current.value.category }, default: () => ({ articles: [], categories: [] }) });
const related = computed(() => (relatedData.value?.articles ?? []).filter((item) => item.slug !== current.value.slug).slice(0, 3));
const siteUrl = String(config.public.siteUrl).replace(/\/$/, "");
const canonical = `${siteUrl}/articles/${current.value.slug}`;
const socialImage = current.value.cover.endsWith(".svg") ? `${siteUrl}/og-default.png` : `${siteUrl}${current.value.cover}`;

useSeoMeta({
  title: current.value.title,
  description: current.value.summary,
  ogTitle: current.value.title,
  ogDescription: current.value.summary,
  ogImage: socialImage,
  ogType: "article",
  ogUrl: canonical,
  articlePublishedTime: `${current.value.publishedAt}T09:00:00+03:00`,
  articleModifiedTime: `${current.value.updatedAt}T09:00:00+03:00`
});
useHead({
  link: [{ rel: "canonical", href: canonical }],
  script: [{ type: "application/ld+json", innerHTML: JSON.stringify({
    "@context": "https://schema.org", "@type": "Article", headline: current.value.title,
    description: current.value.summary, image: socialImage,
    datePublished: current.value.publishedAt, dateModified: current.value.updatedAt,
    author: { "@type": "Person", name: current.value.author },
    publisher: { "@type": "Organization", name: site.name, url: siteUrl },
    mainEntityOfPage: canonical, inLanguage: "ru-RU"
  }) }]
});
</script>

<template>
  <article class="article-page">
    <div class="container">
      <nav class="breadcrumbs" aria-label="Хлебные крошки">
        <NuxtLink to="/">Главная</NuxtLink><span>→</span><NuxtLink to="/articles">Статьи</NuxtLink><span>→</span><span>{{ current.category }}</span>
      </nav>
      <header class="article-header">
        <div class="article-heading-copy">
          <p class="eyebrow">{{ current.category }}</p>
          <h1>{{ current.title }}</h1>
          <p class="article-deck">{{ current.summary }}</p>
          <div class="article-meta">
            <span>Автор: {{ current.author }}</span>
            <time :datetime="current.publishedAt">{{ formatDate(current.publishedAt) }}</time>
            <span>{{ current.readingTime }}</span>
          </div>
        </div>
        <img :src="current.cover" :alt="`Обложка статьи: ${current.title}`" class="article-cover">
      </header>

      <div class="article-layout">
        <aside class="article-toc" aria-label="Содержание статьи">
          <div class="toc-inner">
            <strong>В этой статье</strong>
            <a v-for="item in current.toc.filter((entry) => entry.level === 2)" :key="item.id" :href="`#${item.id}`">{{ item.text }}</a>
          </div>
        </aside>
        <div class="article-body-wrap">
          <div class="article-body" v-html="current.bodyHtml" />
          <div class="article-disclaimer">
            <strong>Учитывайте условия участка.</strong>
            <p>Погода, почва, возраст растений и предыдущий уход меняют результат. Сначала проверяйте совет на небольшом участке или одном растении.</p>
          </div>
        </div>
      </div>
    </div>

    <section v-if="related.length" class="related-section">
      <div class="container">
        <div class="section-header ruled"><div><p class="eyebrow">Продолжить чтение</p><h2>Материалы из раздела «{{ current.category }}»</h2></div></div>
        <div class="article-list-grid"><ArticleCard v-for="item in related" :key="item.slug" :article="item" compact /></div>
      </div>
    </section>
  </article>
</template>
