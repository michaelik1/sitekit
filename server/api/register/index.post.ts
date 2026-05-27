type RegisterPayload = {
  name?: unknown;
  email?: unknown;
  interest?: unknown;
  agree?: unknown;
};

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default defineEventHandler(async (event) => {
  const payload = await readBody<RegisterPayload>(event).catch(() => ({}));

  if (typeof payload.name !== "string" || payload.name.trim().length < 2) {
    setResponseStatus(event, 400);
    return { ok: false, message: "Укажите имя минимум из двух символов." };
  }

  if (!isValidEmail(payload.email)) {
    setResponseStatus(event, 400);
    return { ok: false, message: "Укажите корректный email." };
  }

  // Намеренно ничего не сохраняем: без БД, без файлов, без внешней отправки.
  // Endpoint нужен только для реалистичного POST-цикла формы.
  return {
    ok: true,
    message: "Заявка принята. После проверки адреса профиль будет активирован."
  };
});
