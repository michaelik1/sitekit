import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

const [slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ').trim();
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title) {
  console.error('Использование: npm run new:article -- my-article "Заголовок статьи"');
  process.exit(1);
}
const root = resolve(import.meta.dirname, '..');
const folder = join(root, 'content', 'articles', slug);
await mkdir(folder, { recursive: false }).catch(() => {
  console.error(`Папка уже существует: content/articles/${slug}`);
  process.exit(1);
});
const today = new Date().toISOString().slice(0, 10);
const markdown = `---
title: ${JSON.stringify(title)}
summary: "Коротко опишите, какую задачу решает материал и что получит читатель."
category: "Огород"
publishedAt: "${today}"
updatedAt: "${today}"
readingTime: "6 мин"
author: "Редакция «Дача Практик»"
cover: "cover.svg"
featured: false
status: "draft"
tags: ["памятка"]
---

Первый абзац должен сразу объяснять ситуацию и границы совета.

## С чего начать

Опишите диагностику и подготовку.

## Порядок работы

1. Первый конкретный шаг.
2. Второй конкретный шаг.
3. Что проверить после работы.

> **Практический ориентир.** Добавьте короткую полезную оговорку.

## Частые ошибки

- Ошибка и её последствие.
- Ещё одна типичная ошибка.

## Короткая памятка

Завершите материал кратким выводом.
`;
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#f5f0e5"/><rect x="48" y="48" width="1104" height="654" fill="none" stroke="#183c2c" stroke-width="3"/><text x="88" y="130" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#a04f2c">НОВЫЙ МАТЕРИАЛ</text><text x="88" y="330" font-family="Georgia,serif" font-size="58" font-weight="700" fill="#17231c">${title.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text><circle cx="990" cy="520" r="120" fill="#8ca36f"/><path d="M880 560c70-170 160-190 240-20" fill="none" stroke="#183c2c" stroke-width="34" stroke-linecap="round"/></svg>`;
await Promise.all([
  writeFile(join(folder, 'article.md'), markdown, 'utf8'),
  writeFile(join(folder, 'cover.svg'), cover, 'utf8')
]);
console.log(`Создан черновик: content/articles/${slug}/article.md`);
