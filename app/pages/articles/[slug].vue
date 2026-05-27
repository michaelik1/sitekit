<script setup lang="ts">
import { articles, getArticleBySlug } from "~~/shared/articles";

const route = useRoute();
const slug = String(route.params.slug ?? "");
const article = getArticleBySlug(slug);

if (!article) {
  throw createError({ statusCode: 404, statusMessage: "Статья не найдена.", fatal: true });
}

const related = articles
  .filter((item) => item.slug !== article.slug && item.category === article.category)
  .slice(0, 3);

useSeoMeta({
  title: article.title,
  description: article.summary,
  ogTitle: article.title,
  ogDescription: article.summary,
  ogImage: article.image
});
</script>

<template>
  <article class="container article-page">
    <NuxtLink to="/articles" class="text-link">← Все статьи</NuxtLink>
    <header class="article-hero">
      <div>
        <p class="eyebrow">{{ article.category }}</p>
        <h1>{{ article.title }}</h1>
        <p>{{ article.summary }}</p>
        <div class="meta-row large">
          <span>{{ article.author }}</span>
          <span>{{ new Date(article.date).toLocaleDateString("ru-RU") }}</span>
          <span>{{ article.readingTime }}</span>
        </div>
      </div>
      <img :src="article.image" alt="" />
    </header>

    <div class="article-layout">
      <aside class="article-aside">
        <div class="sticky-note">
          <h2>В статье</h2>
          <a v-for="section in article.sections" :key="section.heading" :href="`#${section.heading}`">
            {{ section.heading }}
          </a>
        </div>
      </aside>
      <div class="article-content">
        <section v-for="section in article.sections" :id="section.heading" :key="section.heading">
          <h2>{{ section.heading }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </section>
        <div class="note-box">
          <strong>Совет редакции:</strong> делайте фотографии до и после работ. Это помогает сравнить результат, не забыть удачные решения и быстрее заметить повторяющиеся проблемы на участке.
        </div>
      </div>
    </div>

    <section v-if="related.length > 0" class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Читайте также</p>
          <h2>Похожие материалы</h2>
        </div>
      </div>
      <div class="content-grid three">
        <ArticleCard v-for="item in related" :key="item.slug" :article="item" compact />
      </div>
    </section>
  </article>
</template>
