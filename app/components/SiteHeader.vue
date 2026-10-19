<script setup lang="ts">
const site = useSiteSettings();
const route = useRoute();
const isActive = (href: string) =>
  route.path === href || (href !== '/' && route.path.startsWith(`${href}/`));
</script>
<template>
  <header v-if="site" class="site-header">
    <div v-if="site.tagline" class="utility-bar">
      <div class="container utility-inner">
        <span>{{ site.tagline }}</span
        ><a href="/rss.xml">RSS</a>
      </div>
    </div>
    <div class="container header-main">
      <NuxtLink to="/" class="brand" :aria-label="site.name">
        <span class="brand-mark" aria-hidden="true">{{ site.logo }}</span>
        <span class="brand-copy"
          ><strong>{{ site.name }}</strong
          ><small>{{ site.tagline }}</small></span
        >
      </NuxtLink>
      <nav class="main-nav" aria-label="Main navigation">
        <ContentLink
          v-for="item in site.navigation"
          :key="item.href"
          :href="item.href"
          :aria-current="isActive(item.href) ? 'page' : undefined"
          >{{ item.label }}</ContentLink
        >
      </nav>
      <details class="mobile-menu">
        <summary aria-label="Open menu"><span /><span /><span /></summary>
        <nav aria-label="Mobile navigation">
          <ContentLink
            v-for="item in site.navigation"
            :key="item.href"
            :href="item.href"
            @click="($event.target as HTMLElement).closest('details')?.removeAttribute('open')"
            >{{ item.label }}</ContentLink
          >
        </nav>
      </details>
    </div>
  </header>
</template>
