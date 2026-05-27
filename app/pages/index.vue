<script setup lang="ts">
import { articleCategories, articles, getFeaturedArticles } from "~~/shared/articles";
import type { VideoItem } from "~~/shared/videos";

const featuredArticles = getFeaturedArticles();
const { data } = await useFetch<{ videos: VideoItem[]; categories: string[] }>("/api/videos", {
  default: () => ({ videos: [], categories: [] })
});
const latestVideos = computed(() => (data.value?.videos ?? []).slice(0, 6));
</script>

<template>
  <section class="hero-section">
    <div class="container hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Сезонные инструкции для участка</p>
        <h1>Дача без суеты: статьи, видео и понятные планы работ</h1>
        <p>Собрали практические материалы по огороду, саду, теплице, хранению урожая и благоустройству. Можно быстро найти инструкцию и вернуться к работе на участке.</p>
        <div class="hero-actions">
          <NuxtLink to="/articles" class="button primary">Смотреть статьи</NuxtLink>
          <NuxtLink to="/videos" class="button ghost">Перейти к видео</NuxtLink>
        </div>
      </div>
      <div class="hero-panel" aria-label="Календарь работ">
        <div class="panel-title">Что актуально сейчас</div>
        <ul>
          <li><strong>Теплица:</strong> проветривание, подвязка, полив утром.</li>
          <li><strong>Огород:</strong> мульча, защита рассады, рыхление.</li>
          <li><strong>Сад:</strong> осмотр ягодников, полив малины, подкормка клубники.</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="container section-block">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Популярные статьи</p>
        <h2>Пошаговые инструкции</h2>
      </div>
      <NuxtLink to="/articles" class="text-link">Все статьи</NuxtLink>
    </div>
    <div class="content-grid three">
      <ArticleCard v-for="article in featuredArticles" :key="article.slug" :article="article" />
    </div>
  </section>

  <section class="wide-strip">
    <div class="container strip-grid">
      <NuxtLink
        v-for="category in articleCategories"
        :key="category"
        :to="`/articles?category=${encodeURIComponent(category)}`"
        class="category-tile"
      >
        <span>{{ category }}</span>
        <small>{{ articles.filter((article) => article.category === category).length }} материалов</small>
      </NuxtLink>
    </div>
  </section>

  <section class="container section-block">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Видеотека</p>
        <h2>Короткие ролики и мастер-классы</h2>
      </div>
      <NuxtLink to="/videos" class="text-link">Все видео</NuxtLink>
    </div>
    <div class="content-grid three">
      <VideoCard v-for="video in latestVideos" :key="video.id" :video="video" />
    </div>
  </section>
</template>
