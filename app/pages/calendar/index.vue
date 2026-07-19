<script setup lang="ts">
import type { ArticleCollection } from "~~/shared/content";
const site = useSiteSettings();
const config = useRuntimeConfig();
const { data } = await useFetch<ArticleCollection>("/api/articles", { query: { limit: 8 }, default: () => ({ articles: [], categories: [] }) });
const canonical = `${String(config.public.siteUrl).replace(/\/$/, "")}/calendar`;
useSeoMeta({ title: `Календарь работ: ${site.season.month}`, description: site.season.note, ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container page-shell calendar-page">
    <header class="calendar-header">
      <p class="eyebrow">Сезонный календарь</p>
      <h1>{{ site.season.month }} на участке</h1>
      <p>{{ site.season.note }}</p>
      <div class="calendar-stamp">Обновлено для сезона 2026</div>
    </header>

    <section class="calendar-task-grid">
      <article v-for="(task, index) in site.season.tasks" :key="task.title">
        <span class="task-number">0{{ index + 1 }}</span>
        <h2>{{ task.title }}</h2>
        <p>{{ task.text }}</p>
      </article>
    </section>

    <section class="calendar-checklist">
      <div>
        <p class="eyebrow">Один вечер на даче</p>
        <h2>Минимум, который стоит успеть</h2>
      </div>
      <ul>
        <li>Проверить влажность под мульчей и у молодых деревьев.</li>
        <li>Собрать переросшие плоды и падалицу.</li>
        <li>Проветрить теплицу и убрать листья, лежащие на земле.</li>
        <li>Осмотреть фильтр и соединения системы полива.</li>
        <li>Записать, где повторяются болезни или застой воды.</li>
      </ul>
    </section>

    <section class="editorial-section">
      <div class="section-header ruled"><div><p class="eyebrow">Полезно сейчас</p><h2>Свежие статьи</h2></div><NuxtLink to="/articles" class="section-link">Все статьи</NuxtLink></div>
      <div class="article-list-grid"><ArticleCard v-for="article in data?.articles ?? []" :key="article.slug" :article="article" compact /></div>
    </section>
  </div>
</template>
