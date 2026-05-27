<script setup lang="ts">
import type { VideoItem } from "~~/shared/videos";

useSeoMeta({
  title: "Видео",
  description: "Видеоинструкции для дачников: теплица, полив, грядки, сад, защита растений и благоустройство."
});

const { data } = await useFetch<{ videos: VideoItem[]; categories: string[] }>("/api/videos", {
  default: () => ({ videos: [], categories: [] })
});
</script>

<template>
  <div class="container page-shell">
    <div class="page-heading">
      <p class="eyebrow">Видеотека</p>
      <h1>Видеоинструкции</h1>
      <p>Ролики сгруппированы по темам. Метаданные берутся из YAML-файла в папке с видео, поэтому раздел удобно пополнять без правки компонентов.</p>
    </div>
    <VideoBrowser :videos="data?.videos ?? []" :categories="data?.categories ?? []" />
  </div>
</template>
