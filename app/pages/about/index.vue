<script setup lang="ts">
import type { ArticleCollection, VideoCollection } from "~~/shared/content";
const site = useSiteSettings();
const config = useRuntimeConfig();
const [{ data: articleData }, { data: videoData }] = await Promise.all([
  useFetch<ArticleCollection>("/api/articles", { default: () => ({ articles: [], categories: [] }) }),
  useFetch<VideoCollection>("/api/videos", { default: () => ({ videos: [], categories: [] }) })
]);
const canonical = `${String(config.public.siteUrl).replace(/\/$/, "")}/about`;
useSeoMeta({ title: "О проекте", description: `Как редакция ${site.name} готовит практические материалы для дачников.`, ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container page-shell prose-page">
    <header class="prose-hero">
      <p class="eyebrow">О проекте</p>
      <h1>Не энциклопедия, а рабочий блокнот для участка</h1>
      <p>{{ site.name }} собирает короткие инструкции для ситуаций, которые повторяются каждый сезон: полив, теплица, рассада, ягодники, хранение урожая и устройство участка.</p>
    </header>

    <div class="project-stats">
      <div><strong>{{ articleData?.articles.length ?? site.build.articleCount }}</strong><span>статей и памяток</span></div>
      <div><strong>{{ videoData?.videos.length ?? site.build.videoCount }}</strong><span>видеоразборов</span></div>
      <div><strong>{{ articleData?.categories.length ?? 5 }}</strong><span>практических разделов</span></div>
    </div>

    <section>
      <h2>Как устроен материал</h2>
      <p>Сначала мы формулируем задачу обычным языком, затем отделяем обязательные действия от дополнительных. В конце оставляем короткий список того, что стоит проверить через несколько дней. Такой формат легче использовать прямо на участке.</p>
    </section>
    <section>
      <h2>Что мы сознательно не делаем</h2>
      <p>Не публикуем универсальные дозировки без контекста, не обещаем результат за одну обработку и не заменяем наблюдение за растением календарной схемой. Там, где важны анализ почвы, диагноз специалиста или инструкция производителя, мы прямо об этом говорим.</p>
    </section>
    <section>
      <h2>Исправления и обновления</h2>
      <p>Если материал дополняется, на странице сохраняется дата обновления. Замечания можно прислать редакции — особенно ценны фотографии, описание условий участка и точная формулировка спорного места.</p>
      <NuxtLink to="/contacts" class="button primary">Связаться с редакцией</NuxtLink>
    </section>
  </div>
</template>
