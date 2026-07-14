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

## Проверка

```bash
npm run content:check
npm run typecheck
npm run build
```

Генератор проверяет обязательные поля, даты, локальные пути, наличие обложек и видео, затем создаёт `generated/*.json` и копирует медиа в `public/generated/`.
