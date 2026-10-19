<script setup lang="ts">
const site = useSiteSettings();
const year = new Date().getFullYear();
</script>
<template>
  <footer v-if="site" class="site-footer">
    <div class="container engine-footer">
      <div class="footer-about">
        <div class="footer-brand">{{ site.name }}</div>
        <p>{{ site.description }}</p>
        <p v-if="site.footer.text" class="footer-note">{{ site.footer.text }}</p>
      </div>
      <nav aria-label="Footer navigation">
        <ContentLink v-for="item in site.footer.links" :key="item.href" :href="item.href">{{
          item.label
        }}</ContentLink>
      </nav>
    </div>
    <div class="container footer-bottom">
      <span>© {{ year }} {{ site.name }}</span>
    </div>
  </footer>
</template>
