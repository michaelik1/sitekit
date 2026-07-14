<script setup lang="ts">
const site = useSiteSettings();
const config = useRuntimeConfig();
const email = String(config.public.contactEmail || site.contactEmail);
const canonical = `${String(config.public.siteUrl).replace(/\/$/, "")}/privacy`;
useSeoMeta({ title: "Политика конфиденциальности", description: `Как сайт ${site.name} обрабатывает технические данные и обращения пользователей.`, ogUrl: canonical });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <div class="container page-shell legal-page">
    <header class="archive-heading">
      <p class="eyebrow">Документы</p>
      <h1>Политика конфиденциальности</h1>
      <p>Последнее обновление: 15 июля 2026 года.</p>
    </header>
    <div class="legal-content">
      <section><h2>1. Общие положения</h2><p>Сайт публикует справочные материалы и не требует регистрации для чтения статей и просмотра видео. По умолчанию на страницах не подключены рекламные сети, профилирующие пиксели и сторонние формы авторизации.</p></section>
      <section><h2>2. Технические данные</h2><p>Хостинг и обратный прокси могут обрабатывать стандартные технические сведения: IP-адрес, время запроса, адрес страницы, код ответа и строку браузера. Срок и состав хранения зависят от настроек инфраструктуры владельца сайта.</p></section>
      <section><h2>3. Обращения по электронной почте</h2><p>При письме в редакцию обрабатываются адрес отправителя, содержание письма и приложенные файлы. Эти данные используются только для ответа, проверки материала и редакционной переписки.</p></section>
      <section><h2>4. Встроенное видео</h2><p>Видео размещено на собственном домене сайта. Страница не отправляет данные сторонним видеоплатформам только из-за открытия проигрывателя.</p></section>
      <section><h2>5. Вопросы</h2><p>По вопросам обработки данных напишите на <a :href="`mailto:${email}`">{{ email }}</a>.</p></section>
    </div>
  </div>
</template>
