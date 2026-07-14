<script setup lang="ts">
import type { VideoCollection } from "~~/shared/content";
const config = useRuntimeConfig();
const { data } = await useFetch<VideoCollection>("/api/videos", { default: () => ({ videos: [], categories: [] }) });
const canonical = `${String(config.public.siteUrl).replace(/\/$/, "")}/videos`;
useSeoMeta({ title: "Видео", description: "Короткие видеоразборы по поливу, теплице, грядкам, саду и дачному хозяйству.", ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container page-shell">
    <header class="archive-heading">
      <p class="eyebrow">Видеотека</p>
      <h1>Короткие видеоразборы</h1>
      <p>Ролики собраны по темам. Для каждого видео метаданные, постер и файл лежат в одной папке, поэтому раздел легко пополнять без правки страниц.</p>
    </header>
    <VideoBrowser :videos="data?.videos ?? []" :categories="data?.categories ?? []" />
  </div>
</template>
