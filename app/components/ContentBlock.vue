<script setup lang="ts">
import type { RenderedBlock } from '~~/shared/content';
defineProps<{ block: RenderedBlock }>();
</script>
<template>
  <section v-if="block.type === 'hero'" class="home-hero">
    <div :class="['container', block.panel ? 'hero-layout' : 'hero-single']">
      <div class="hero-intro">
        <p v-if="block.eyebrow" class="eyebrow">{{ block.eyebrow }}</p>
        <h1>{{ block.title }}</h1>
        <p v-if="block.text" class="hero-lead">{{ block.text }}</p>
        <div v-if="block.actions.length" class="hero-actions">
          <ContentLink
            v-for="(action, index) in block.actions"
            :key="action.href"
            :href="action.href"
            :class="['button', index === 0 ? 'primary' : 'text-button']"
            >{{ action.label }}</ContentLink
          >
        </div>
      </div>
      <aside v-if="block.panel" class="season-panel">
        <h2>{{ block.panel.title }}</h2>
        <p v-if="block.panel.text">{{ block.panel.text }}</p>
        <ol v-if="block.panel.items.length">
          <li v-for="item in block.panel.items" :key="item.title">
            <strong>{{ item.title }}</strong
            ><span v-if="item.text">{{ item.text }}</span>
          </li>
        </ol>
      </aside>
    </div>
  </section>
  <div
    v-else-if="block.type === 'markdown'"
    class="article-body content-prose"
    v-html="block.html"
  />
  <figure v-else-if="block.type === 'image'" class="content-figure">
    <img :src="block.src" :alt="block.alt" loading="lazy" decoding="async" />
    <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
  </figure>
  <figure v-else-if="block.type === 'video'" class="content-figure">
    <div class="video-player-shell">
      <video controls playsinline preload="metadata" :poster="block.poster" class="video-player">
        <source
          :src="block.src"
          :type="block.src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'"
        />
        Your browser does not support embedded video.
      </video>
    </div>
    <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
  </figure>
  <section v-else-if="block.type === 'collection'" class="content-section">
    <div v-if="block.title || block.eyebrow || block.actions.length" class="section-header ruled">
      <div>
        <p v-if="block.eyebrow" class="eyebrow">{{ block.eyebrow }}</p>
        <h2 v-if="block.title">{{ block.title }}</h2>
        <p v-if="block.description">{{ block.description }}</p>
      </div>
      <div>
        <ContentLink
          v-for="action in block.actions"
          :key="action.href"
          :href="action.href"
          class="section-link"
          >{{ action.label }}</ContentLink
        >
      </div>
    </div>
    <ContentCollection
      :entries="block.entries ?? []"
      :searchable="block.searchable"
      :variant="block.variant"
    />
  </section>
  <section v-else-if="block.type === 'featured' && block.entry" class="content-section">
    <div v-if="block.title || block.eyebrow" class="section-header ruled">
      <div>
        <p v-if="block.eyebrow" class="eyebrow">{{ block.eyebrow }}</p>
        <h2 v-if="block.title">{{ block.title }}</h2>
      </div>
    </div>
    <div :class="['lead-story', { 'without-media': !block.entry.cover }]">
      <NuxtLink v-if="block.entry.cover" :to="block.entry.path" class="lead-story-image"
        ><img :src="block.entry.cover" :alt="block.entry.title" loading="lazy"
      /></NuxtLink>
      <div class="lead-story-copy">
        <p v-if="block.entry.category" class="eyebrow">{{ block.entry.category }}</p>
        <h2>
          <NuxtLink :to="block.entry.path">{{ block.entry.title }}</NuxtLink>
        </h2>
        <p>{{ block.entry.description }}</p>
        <p v-if="block.entry.author" class="byline">{{ block.entry.author }}</p>
        <NuxtLink :to="block.entry.path" class="button primary">{{ block.label }}</NuxtLink>
      </div>
    </div>
  </section>
  <section v-else-if="block.type === 'links'" class="topic-band block-band">
    <div class="section-header light">
      <div>
        <p v-if="block.eyebrow" class="eyebrow">{{ block.eyebrow }}</p>
        <h2 v-if="block.title">{{ block.title }}</h2>
        <p v-if="block.description">{{ block.description }}</p>
      </div>
    </div>
    <div class="topic-grid">
      <ContentLink v-for="item in block.items" :key="item.href" :href="item.href"
        ><span>{{ item.label }}</span
        ><small v-if="item.description">{{ item.description }}</small></ContentLink
      >
    </div>
  </section>
  <section v-else-if="block.type === 'cards'" class="content-section">
    <div v-if="block.title || block.eyebrow" class="section-header ruled">
      <div>
        <p v-if="block.eyebrow" class="eyebrow">{{ block.eyebrow }}</p>
        <h2 v-if="block.title">{{ block.title }}</h2>
        <p v-if="block.description">{{ block.description }}</p>
      </div>
    </div>
    <div class="calendar-task-grid">
      <article v-for="(item, index) in block.items" :key="item.title">
        <span v-if="block.numbered" class="task-number">{{
          String(index + 1).padStart(2, '0')
        }}</span>
        <h3>
          <ContentLink v-if="item.href" :href="item.href">{{ item.title }}</ContentLink
          ><template v-else>{{ item.title }}</template>
        </h3>
        <p>{{ item.text }}</p>
      </article>
    </div>
  </section>
  <aside
    v-else-if="block.type === 'callout'"
    :class="['content-callout', { accent: block.tone === 'accent' }]"
  >
    <p v-if="block.eyebrow" class="eyebrow">{{ block.eyebrow }}</p>
    <h2 v-if="block.title">{{ block.title }}</h2>
    <div class="article-body" v-html="block.html" />
    <div v-if="block.actions.length" class="hero-actions">
      <ContentLink
        v-for="action in block.actions"
        :key="action.href"
        :href="action.href"
        class="button primary"
        >{{ action.label }}</ContentLink
      >
    </div>
  </aside>
  <section v-else-if="block.type === 'stats'" class="project-stats" aria-label="At a glance">
    <div v-for="item in block.items" :key="item.label">
      <strong>{{ item.value }}</strong
      ><span>{{ item.label }}</span>
    </div>
  </section>
</template>
