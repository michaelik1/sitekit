<script setup lang="ts">
import type { ArticleCollection } from "~~/shared/content";
const config = useRuntimeConfig();
const { data } = await useFetch<ArticleCollection>("/api/articles", { default: () => ({ articles: [], categories: [] }) });
const canonical = `${String(config.public.siteUrl).replace(/\/$/, "")}/articles`;
useSeoMeta({ title: "Статьи", description: "Практические статьи по саду, огороду, теплице, хозяйству и благоустройству участка.", ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container page-shell">
    <header class="archive-heading">
      <p class="eyebrow">Библиотека</p>
      <h1>Статьи и рабочие памятки</h1>
      <p>Материалы можно фильтровать по разделу и искать по названию, автору или ключевым словам. Новые статьи появляются сверху.</p>
    </header>
    <ArticleBrowser :articles="data?.articles ?? []" :categories="data?.categories ?? []" />
  </div>
</template>
