<script setup lang="ts">
import type { Article } from "~~/shared/articles";

const props = defineProps<{
  articles: Article[];
  categories: readonly string[];
}>();

const query = ref("");
const category = ref("Все");

const filtered = computed(() => {
  const normalized = query.value.trim().toLowerCase();

  return props.articles.filter((article) => {
    const matchesCategory = category.value === "Все" || article.category === category.value;
    const matchesQuery = !normalized || [article.title, article.summary, article.category, article.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized);

    return matchesCategory && matchesQuery;
  });
});
</script>

<template>
  <section class="browser-section">
    <div class="toolbar">
      <label>
        <span>Поиск по статьям</span>
        <input v-model="query" placeholder="например: томаты, полив, теплица" />
      </label>
      <label>
        <span>Раздел</span>
        <select v-model="category">
          <option>Все</option>
          <option v-for="item in props.categories" :key="item">{{ item }}</option>
        </select>
      </label>
    </div>
    <div class="content-grid three">
      <ArticleCard v-for="article in filtered" :key="article.slug" :article="article" />
    </div>
    <p v-if="filtered.length === 0" class="empty-state">По такому запросу пока ничего не найдено. Попробуйте другой раздел или слово.</p>
  </section>
</template>
