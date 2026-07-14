# Дача Практик — production-ready decoy site

Редакционный сайт на Nuxt 4 для статей и локальных видео. Контент хранится отдельно от компонентов, валидируется перед сборкой и не требует правок Vue-кода при публикации.

## Что изменено

- полностью переработаны главная, каталог статей, статья, видеотека, видео, календарь, страницы проекта, контактов и конфиденциальности;
- 24 исходные статьи перенесены в Markdown и добавлены ещё 12 материалов;
- каждая статья находится в своей папке вместе с обложкой и дополнительными изображениями;
- каждое видео находится в своей папке вместе с `config.yml`, постером и `video.mp4`;
- удалены случайные просмотры, лайки и неработающая регистрация;
- добавлены sitemap, RSS, robots.txt, JSON-LD, canonical URL, Open Graph, health-check и защитные HTTP-заголовки;
- Docker-контейнер запускается от непривилегированного пользователя, с read-only filesystem и проверкой здоровья;
- контент автоматически проверяется и собирается перед `dev`, `build` и `generate`.

## Быстрый запуск

Требуется Node.js 22.18 или новее.

```bash
cp .env.example .env
npm ci
npm run dev
```

На Windows команды выполняются из PowerShell или `cmd` так же, без `cp`:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Версия 2.0.1 запускает Nuxt CLI напрямую через текущий `node.exe`. Это устраняет `Error: spawn EINVAL`, возникавшую в версии 2.0.0 на Windows с Node.js 24.

Проверка production-сборки:

```bash
npm run check
npm run preview
```

Для репозитория добавлен GitHub Actions workflow: он проверяет контент, TypeScript, Nuxt-сборку и отдельно собирает Docker-образ.

## Структура контента

```text
content/
├── site.json
├── articles/
│   └── article-slug/
│       ├── article.md
│       ├── cover.svg
│       └── optional-photo.webp
└── videos/
    └── video-slug/
        ├── config.yml
        ├── poster.svg
        └── video.mp4
```

Подробная памятка находится в [`content/README.md`](content/README.md).

### Создать статью

```bash
npm run new:article -- poliv-grushi-letom "Как поливать грушу летом"
```

### Создать видео

```bash
npm run new:video -- poliv-teplicy "Полив теплицы утром"
```

Новые материалы создаются как черновики. После заполнения поставьте `status: "published"` и запустите:

```bash
npm run content:build
```

## Настройка сайта

Основные тексты главной страницы, сезонный блок и подпись футера находятся в `content/site.json`.

Переменные окружения:

```env
NUXT_PUBLIC_SITE_URL=https://dacha-praktik.ru
NUXT_PUBLIC_CONTACT_EMAIL=editor@dacha-praktik.ru
```

После смены домена обязательно обновите обе переменные: они используются в canonical URL, sitemap, RSS и Open Graph.

## Docker Compose

Сервис ожидает существующую внешнюю сеть `reverse-proxy-network`:

```bash
docker network create reverse-proxy-network
cp .env.example .env
docker compose up -d --build
```

Контейнер слушает порт `3000` только внутри Docker-сети. TLS и публичный маршрут должны завершаться на Traefik или другом reverse proxy.

## Команды

| Команда | Назначение |
|---|---|
| `npm run dev` | сборка контента, Nuxt dev server и наблюдение за `content/` |
| `npm run content:check` | проверка метаданных и файлов без перезаписи output |
| `npm run content:build` | генерация JSON-индексов и копирование медиа |
| `npm run source:check` | синтаксическая проверка TypeScript и `<script>` в Vue |
| `npm run typecheck` | проверка контента, Nuxt-типов и TypeScript |
| `npm run build` | production-сборка |
| `npm run check` | полный цикл проверок и сборки |

Полный список действий перед публикацией: [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md).

## Важное о демонстрационных видео

В архиве лежат короткие валидные MP4-заставки, чтобы проигрыватель и Docker-сборка работали сразу. В `config.yml` таких роликов стоит `placeholder: true`. Замените `video.mp4`, обновите `duration`, поставьте `placeholder: false` и при необходимости измените текст `note`.
