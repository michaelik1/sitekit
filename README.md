# Дача Практик — Nuxt 4

Переписанная версия исходного Next.js App Router проекта на Nuxt 4.

## Что перенесено

- страницы: главная, статьи, страница статьи, видео, страница видео, о проекте, контакты, регистрация, политика конфиденциальности;
- компоненты React переписаны в Vue SFC;
- форма регистрации перенесена на Nitro API `/api/register`;
- YAML-метаданные видео читаются серверным utility и отдаются через `/api/videos`;
- `robots.txt` и `sitemap.xml` перенесены в server routes;
- статические изображения и постеры сохранены в `public/media`;
- исходная визуальная стилистика сохранена в `app/assets/css/main.css`.

## Запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
npm run preview
```

Статическая генерация:

```bash
npm run generate
```

## Переменные окружения

```bash
NUXT_PUBLIC_SITE_URL=https://dacha-praktik.ru
```

Для совместимости также поддерживается старое имя `NEXT_PUBLIC_SITE_URL`.
