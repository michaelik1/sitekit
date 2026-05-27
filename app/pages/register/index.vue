<script setup lang="ts">
useSeoMeta({
  title: "Регистрация",
  description: "Создание профиля на сайте Дача Практик."
});
</script>

<template>
  <div class="container page-shell narrow">
    <div class="page-heading centered">
      <p class="eyebrow">Личный кабинет</p>
      <h1>Регистрация дачника</h1>
      <p>Создайте профиль, чтобы сохранять инструкции, отмечать понравившиеся видео и получать сезонные подборки.</p>
    </div>
    <RegisterForm />
  </div>
</template>
