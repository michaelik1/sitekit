<script setup lang="ts">
defineProps<{ href: string }>();
</script>
<template>
  <NuxtLink :to="href" :external="/^(https?:|mailto:|tel:)/.test(href)"><slot /></NuxtLink>
</template>
