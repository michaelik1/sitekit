<script setup lang="ts">
import type { PageSummary } from '~~/shared/content';
const props = defineProps<{
  entries: PageSummary[];
  searchable: boolean;
  variant: 'article' | 'video';
}>();
const route = useRoute();
const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const category = ref(typeof route.query.category === 'string' ? route.query.category : '');
const categories = computed(() => [
  ...new Set(
    props.entries.map((entry) => entry.category).filter((value): value is string => !!value)
  )
]);
const filtered = computed(() =>
  props.entries.filter((entry) => {
    if (!props.searchable) return true;
    const needle = query.value.trim().toLocaleLowerCase();
    return (
      (!category.value || entry.category === category.value) &&
      (!needle ||
        [entry.title, entry.description, entry.category, entry.author, ...entry.tags]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(needle))
    );
  })
);
</script>
<template>
  <div class="browser-section">
    <div v-if="searchable" class="catalog-toolbar">
      <label class="search-field"
        ><span>Search content</span
        ><input v-model="query" type="search" placeholder="Title or keyword"
      /></label>
      <label
        ><span>Category</span
        ><select v-model="category">
          <option value="">All</option>
          <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
        </select></label
      >
      <div class="result-count" aria-live="polite">Results: {{ filtered.length }}</div>
    </div>
    <div
      v-if="filtered.length"
      :class="variant === 'video' ? 'video-list-grid' : 'article-list-grid'"
    >
      <PageCard v-for="page in filtered" :key="page.path" :page="page" :variant="variant" />
    </div>
    <div v-else class="empty-state">
      <strong>No content found</strong>
      <p v-if="searchable">Try a different search or category.</p>
    </div>
  </div>
</template>
