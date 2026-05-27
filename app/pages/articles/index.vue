<script setup lang="ts">
import { articles, articleCategories } from "~~/shared/articles";

useSeoMeta({
  title: "Статьи",
  description: "Подборка русских инструкций для дачи, сада, огорода, теплицы и хозяйства."
});
</script>

<template>
  <div class="container page-shell">
    <div class="page-heading">
      <p class="eyebrow">Библиотека материалов</p>
      <h1>Статьи для дачников</h1>
      <p>Фильтруйте материалы по разделам, ищите по словам и сохраняйте полезные инструкции на сезон.</p>
    </div>
    <ArticleBrowser :articles="articles" :categories="articleCategories" />
  </div>
</template>
