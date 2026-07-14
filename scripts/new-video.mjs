import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

const [slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ').trim();
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title) {
  console.error('Использование: npm run new:video -- my-video "Заголовок видео"');
  process.exit(1);
}
const root = resolve(import.meta.dirname, '..');
const folder = join(root, 'content', 'videos', slug);
await mkdir(folder, { recursive: false }).catch(() => {
  console.error(`Папка уже существует: content/videos/${slug}`);
  process.exit(1);
});
const today = new Date().toISOString().slice(0, 10);
const config = `title: ${JSON.stringify(title)}
description: "Коротко опишите, что показано в ролике."
category: "Огород"
author: "Редакция «Дача Практик»"
publishedAt: "${today}"
duration: "00:08"
quality: "HD"
tags: ["видео"]
poster: "poster.svg"
video: "video.mp4"
status: "draft"
featured: false
placeholder: true
note: "Короткая видеозаметка-заставка. Полная версия материала готовится."
`;
const poster = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#183c2c"/><circle cx="1030" cy="140" r="190" fill="#a04f2c" opacity=".75"/><circle cx="640" cy="330" r="76" fill="#f5f0e5"/><path d="M620 285v90l76-45z" fill="#183c2c"/><text x="76" y="610" font-family="Georgia,serif" font-size="58" font-weight="700" fill="#fff">${title.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text></svg>`;
await Promise.all([
  writeFile(join(folder, 'config.yml'), config, 'utf8'),
  writeFile(join(folder, 'poster.svg'), poster, 'utf8'),
  copyFile(join(root, 'content', 'templates', 'video', 'video.mp4'), join(folder, 'video.mp4'))
]);
console.log(`Создан черновик: content/videos/${slug}/config.yml`);
