<script setup lang="ts">
import type { ArticleSummary } from "~~/shared/content";

const props = defineProps<{ articles: ArticleSummary[]; categories: string[] }>();
const route = useRoute();
const router = useRouter();
const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const category = ref(typeof route.query.category === "string" && props.categories.includes(route.query.category) ? route.query.category : "Все");

const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase("ru");
  return props.articles.filter((article) => {
    const categoryMatches = category.value === "Все" || article.category === category.value;
    const haystack = [article.title, article.summary, article.category, article.author, article.tags.join(" ")].join(" ").toLocaleLowerCase("ru");
    return categoryMatches && (!needle || haystack.includes(needle));
  });
});

watch([query, category], () => {
  const nextQuery: Record<string, string> = {};
  if (query.value.trim()) nextQuery.q = query.value.trim();
  if (category.value !== "Все") nextQuery.category = category.value;
  router.replace({ query: nextQuery });
});
</script>

<template>
  <section class="browser-section" aria-label="Каталог статей">
    <div class="catalog-toolbar">
      <label class="search-field">
        <span>Найти материал</span>
        <input v-model="query" type="search" placeholder="Например: томаты, полив, погреб" autocomplete="off">
      </label>
      <label>
        <span>Раздел</span>
        <select v-model="category">
          <option>Все</option>
          <option v-for="item in props.categories" :key="item">{{ item }}</option>
        </select>
      </label>
      <div class="result-count" aria-live="polite">{{ filtered.length }} {{ filtered.length === 1 ? "материал" : "материалов" }}</div>
    </div>
    <div v-if="filtered.length" class="article-list-grid">
      <ArticleCard v-for="article in filtered" :key="article.slug" :article="article" />
    </div>
    <div v-else class="empty-state">
      <strong>Ничего не нашли</strong>
      <p>Уберите часть запроса или выберите другой раздел.</p>
    </div>
  </section>
</template>
