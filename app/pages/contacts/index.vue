<script setup lang="ts">
const site = useSiteSettings();
const config = useRuntimeConfig();
const email = String(config.public.contactEmail || site.contactEmail);
const canonical = `${String(config.public.siteUrl).replace(/\/$/, "")}/contacts`;
useSeoMeta({ title: "Контакты", description: `Контакты редакции ${site.name}: предложения тем, исправления и вопросы по материалам.`, ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container page-shell contact-page">
    <header class="archive-heading">
      <p class="eyebrow">Редакция</p>
      <h1>Напишите нам по делу</h1>
      <p>Принимаем предложения тем, сообщения об ошибках и вопросы по конкретным материалам.</p>
    </header>
    <div class="contact-layout">
      <section class="contact-primary">
        <span class="contact-label">Электронная почта</span>
        <a :href="`mailto:${email}`" class="contact-email">{{ email }}</a>
        <p>В теме письма укажите: «Исправление», «Предложение статьи» или название материала. Обычно редакция отвечает в течение трёх рабочих дней.</p>
      </section>
      <aside class="contact-checklist">
        <h2>Что приложить к сообщению</h2>
        <ul>
          <li>ссылку на страницу;</li>
          <li>точную цитату или описание вопроса;</li>
          <li>регион и погодные условия, если они важны;</li>
          <li>фото без персональных данных.</li>
        </ul>
      </aside>
    </div>
  </div>
</template>
