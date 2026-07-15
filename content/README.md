# Контент сайта

Контент полностью отделён от Vue-компонентов. После изменения файлов выполните `npm run content:build`. В режиме `npm run dev` папка `content/` отслеживается автоматически.

## Новая статья

Самый быстрый способ:

```bash
npm run new:article -- poliv-grushi-letom "Как поливать грушу летом"
```

Будет создана папка:

```text
content/articles/poliv-grushi-letom/
├── article.md
└── cover.svg
```

В `article.md` есть YAML frontmatter и обычный Markdown. Картинки можно класть рядом и вставлять относительным путём:

```md
![Капельница под мульчей](./drip-line.webp "Линия полива после укладки")
```

Поддерживаются заголовки `##`–`####`, списки, цитаты, ссылки, изображения, жирный и курсивный текст, inline-code и блоки кода. Черновики с `status: "draft"` проверяются, но не попадают на сайт.

## Новое видео

```bash
npm run new:video -- poliv-teplicy "Полив теплицы утром"
```

Структура папки:

```text
content/videos/poliv-teplicy/
├── config.yml
├── poster.svg
└── video.mp4
```

После замены демонстрационного `video.mp4` укажите настоящую длительность, поставьте `placeholder: false` и `status: "published"`.

## Video storage

`video.mp4`, `video.webm`, article covers and video posters are not committed to Git. Keep them locally while editing, update the tracked manifest and upload them to the configured private media storage from the `decoy/` directory:

```bash
npm run media:manifest
docker compose run --rm --build media-upload
```

On a new server, configure `DECOY_R2_*` values in `.env`, then run `docker compose run --rm --build media-sync` before building the decoy. Node.js and npm are contained in the one-off Docker service and are not required on the host. Each file is checked against its SHA-256 checksum in `content/media-manifest.json`.

## Проверка

```bash
npm run content:check
npm run typecheck
npm run build
```

Генератор проверяет обязательные поля, даты, локальные пути, наличие обложек и видео, затем создаёт `generated/*.json`. Медиа остаётся единственной копией в `content/` и раздаётся приложением по `/media/...`.
