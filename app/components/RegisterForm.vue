<script setup lang="ts">
type Status = "idle" | "sending" | "success" | "error";

const status = ref<Status>("idle");
const message = ref("");
const interest = ref("Огород");

async function handleSubmit(event: Event) {
  const form = event.currentTarget as HTMLFormElement;
  status.value = "sending";
  message.value = "";

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message ?? "Ошибка отправки формы");
    }

    status.value = "success";
    message.value = payload?.message ?? "Профиль создан. Проверьте почту для подтверждения.";
    form.reset();
    interest.value = "Огород";
  } catch (error) {
    status.value = "error";
    message.value = error instanceof Error ? error.message : "Не удалось отправить форму. Попробуйте позже.";
  }
}
</script>

<template>
  <form class="register-form" @submit.prevent="handleSubmit">
    <div class="form-grid">
      <label>
        <span>Имя</span>
        <input name="name" type="text" minlength="2" autocomplete="name" required placeholder="Иван" />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" required placeholder="ivan@example.ru" />
      </label>
    </div>
    <label>
      <span>Интересы</span>
      <select v-model="interest" name="interest">
        <option>Огород</option>
        <option>Сад</option>
        <option>Теплица</option>
        <option>Благоустройство</option>
        <option>Видеоинструкции</option>
      </select>
    </label>
    <label class="checkbox-line">
      <input name="agree" type="checkbox" required />
      <span>Согласен получать сезонные подборки и инструкции.</span>
    </label>
    <button type="submit" :disabled="status === 'sending'">
      {{ status === "sending" ? "Отправляем..." : "Зарегистрироваться" }}
    </button>
    <p v-if="message" :class="status === 'success' ? 'form-message success' : 'form-message error'">{{ message }}</p>
    <p class="form-note">Нажимая кнопку, вы соглашаетесь получать сезонные подборки и уведомления сайта.</p>
  </form>
</template>
