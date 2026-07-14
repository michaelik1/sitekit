<script setup lang="ts">
import type { ArticleCollection, VideoCollection } from "~~/shared/content";

const site = useSiteSettings();
const config = useRuntimeConfig();
const siteUrl = String(config.public.siteUrl).replace(/\/$/, "");

const [{ data: articleData }, { data: videoData }] = await Promise.all([
  useFetch<ArticleCollection>("/api/articles", { query: { limit: 9 }, default: () => ({ articles: [], categories: [] }) }),
  useFetch<VideoCollection>("/api/videos", { query: { limit: 4 }, default: () => ({ videos: [], categories: [] }) })
]);

const articles = computed(() => articleData.value?.articles ?? []);
const leadArticle = computed(() => articles.value.find((item) => item.featured) ?? articles.value[0]);
const secondaryArticles = computed(() => articles.value.filter((item) => item.slug !== leadArticle.value?.slug).slice(0, 4));
const videos = computed(() => videoData.value?.videos ?? []);

useSeoMeta({
  title: "",
  description: site.description,
  ogUrl: siteUrl,
  ogImage: `${siteUrl}/og-default.png`
});

useHead({
  link: [{ rel: "canonical", href: siteUrl }],
  script: [{
    type: "application/ld+json",
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: siteUrl,
      description: site.description,
      inLanguage: "ru-RU"
    })
  }]
});
</script>

<template>
  <div>
    <section class="home-hero">
      <div class="container hero-layout">
        <div class="hero-intro">
          <p class="eyebrow">{{ site.hero.eyebrow }}</p>
          <h1>{{ site.hero.title }}</h1>
          <p class="hero-lead">{{ site.hero.text }}</p>
          <div class="hero-actions">
            <NuxtLink to="/calendar" class="button primary">Открыть календарь июля</NuxtLink>
            <NuxtLink to="/articles" class="button text-button">Все материалы →</NuxtLink>
          </div>
        </div>
        <aside class="season-panel" aria-labelledby="season-title">
          <div class="season-label">Сейчас на участке</div>
          <h2 id="season-title">{{ site.season.month }}</h2>
          <p>{{ site.season.note }}</p>
          <ol>
            <li v-for="task in site.season.tasks.slice(0, 3)" :key="task.title">
              <strong>{{ task.title }}</strong>
              <span>{{ task.text }}</span>
            </li>
          </ol>
        </aside>
      </div>
    </section>

    <section v-if="leadArticle" class="container editorial-section">
      <div class="section-header ruled">
        <div><p class="eyebrow">Выбор редакции</p><h2>Главный материал недели</h2></div>
        <NuxtLink to="/articles" class="section-link">Архив статей</NuxtLink>
      </div>
      <div class="lead-story">
        <NuxtLink :to="`/articles/${leadArticle.slug}`" class="lead-story-image">
          <img :src="leadArticle.cover" :alt="leadArticle.title">
        </NuxtLink>
        <div class="lead-story-copy">
          <div class="card-kicker"><span>{{ leadArticle.category }}</span><time :datetime="leadArticle.publishedAt">{{ formatDate(leadArticle.publishedAt) }}</time></div>
          <h2><NuxtLink :to="`/articles/${leadArticle.slug}`">{{ leadArticle.title }}</NuxtLink></h2>
          <p>{{ leadArticle.summary }}</p>
          <div class="byline">{{ leadArticle.author }} · {{ leadArticle.readingTime }}</div>
          <NuxtLink :to="`/articles/${leadArticle.slug}`" class="button primary">Читать памятку</NuxtLink>
        </div>
      </div>
    </section>

    <section class="container editorial-section">
      <div class="section-header ruled">
        <div><p class="eyebrow">Свежие публикации</p><h2>Практика по сезону</h2></div>
      </div>
      <div class="home-article-grid">
        <ArticleCard v-for="article in secondaryArticles" :key="article.slug" :article="article" compact />
      </div>
    </section>

    <section class="topic-band">
      <div class="container">
        <div class="section-header light">
          <div><p class="eyebrow">Навигация</p><h2>Выберите задачу</h2></div>
        </div>
        <div class="topic-grid">
          <NuxtLink v-for="category in articleData?.categories ?? []" :key="category" :to="`/articles?category=${encodeURIComponent(category)}`">
            <span>{{ category }}</span>
            <small>Статьи и сезонные памятки</small>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="videos.length" class="container editorial-section">
      <div class="section-header ruled">
        <div><p class="eyebrow">Видео</p><h2>Показать один раз — понятнее, чем описывать</h2></div>
        <NuxtLink to="/videos" class="section-link">Все видео</NuxtLink>
      </div>
      <div class="home-video-grid"><VideoCard v-for="video in videos" :key="video.id" :video="video" /></div>
    </section>

    <section class="container editorial-section">
      <div class="editorial-note">
        <div>
          <p class="eyebrow">Редакционный принцип</p>
          <h2>Сначала наблюдение, потом действие</h2>
        </div>
        <p>Мы не собираем советы ради количества. В каждой памятке отделяем обязательные шаги от необязательных и отмечаем, что нужно проверить через несколько дней.</p>
        <NuxtLink to="/about" class="section-link">Как мы готовим материалы →</NuxtLink>
      </div>
    </section>
  </div>
</template>
