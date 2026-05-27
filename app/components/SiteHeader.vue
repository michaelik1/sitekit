<script setup lang="ts">
const navItems = [
  { href: "/articles", label: "Статьи" },
  { href: "/videos", label: "Видео" },
  { href: "/about", label: "О проекте" },
  { href: "/contacts", label: "Контакты" }
];
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <NuxtLink to="/" class="brand" aria-label="Дача Практик — на главную">
        <span class="brand-mark">ДП</span>
        <span>
          <strong>Дача Практик</strong>
          <small>инструкции, сад и видео</small>
        </span>
      </NuxtLink>
      <nav class="main-nav" aria-label="Основная навигация">
        <NuxtLink v-for="item in navItems" :key="item.href" :to="item.href">
          {{ item.label }}
        </NuxtLink>
      </nav>
      <NuxtLink to="/register" class="header-cta">Войти</NuxtLink>
    </div>
  </header>
</template>
