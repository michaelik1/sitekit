import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const contentRoot = join(root, 'content');
const generatedRoot = join(root, 'generated');
const publicGeneratedRoot = join(root, 'public', 'generated');
const checkOnly = process.argv.includes('--check');
const todayUtc = process.env.CONTENT_TODAY ?? new Date().toISOString().slice(0, 10);

const REQUIRED_ARTICLE_FIELDS = ['title', 'summary', 'category', 'publishedAt', 'author'];
const REQUIRED_VIDEO_FIELDS = ['title', 'description', 'category', 'publishedAt', 'video', 'poster'];

function parseYamlScalar(raw, file, lineNumber) {
  const value = raw.trim();
  if (!value) return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    if (value.startsWith('"')) {
      try { return JSON.parse(value); } catch { fail(`${file}:${lineNumber}: некорректная строка YAML.`); }
    }
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value.startsWith('[') || value.startsWith('{')) {
    try { return JSON.parse(value); } catch { fail(`${file}:${lineNumber}: массивы и объекты записывайте в JSON-формате.`); }
  }
  return value.replace(/\s+#.*$/, '').trim();
}

function parseFlatYaml(source, file) {
  const result = {};
  let activeList = null;
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const listMatch = rawLine.match(/^\s+-\s+(.+)$/);
    if (listMatch && activeList) {
      result[activeList].push(parseYamlScalar(listMatch[1], file, index + 1));
      continue;
    }
    const keyMatch = rawLine.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!keyMatch) fail(`${file}:${index + 1}: поддерживается плоский YAML с полями key: value.`);
    const [, key, rawValue = ''] = keyMatch;
    if (!rawValue.trim()) {
      result[key] = [];
      activeList = key;
    } else {
      result[key] = parseYamlScalar(rawValue, file, index + 1);
      activeList = null;
    }
  }
  return result;
}

const ALLOWED_ASSET_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.mp4', '.png', '.svg', '.webm', '.webp']);
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm']);

function fail(message) {
  throw new Error(`[content] ${message}`);
}

function asString(value, field, file) {
  if (typeof value !== 'string' || !value.trim()) fail(`${file}: поле "${field}" обязательно.`);
  return value.trim();
}

function parseDate(value, field, file) {
  const text = asString(value, field, file);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    fail(`${file}: поле "${field}" должно быть датой YYYY-MM-DD.`);
  }
  return text;
}

function parseFrontmatter(source, file) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) fail(`${file}: отсутствует YAML frontmatter между строками ---`);
  const data = parseFlatYaml(match[1], file);
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(`${file}: frontmatter должен быть объектом.`);
  return { data, markdown: source.slice(match[0].length).trim() };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zа-яё0-9]+/giu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function safeLocalAsset(rawPath, baseDir, file) {
  const clean = rawPath.split(/[?#]/, 1)[0].replace(/^\.\//, '');
  if (!clean || clean.startsWith('/') || clean.includes('://')) return null;
  const absolute = resolve(baseDir, clean);
  const rel = relative(baseDir, absolute);
  if (rel.startsWith('..') || rel.split(sep).includes('..')) fail(`${file}: недопустимый путь к ресурсу "${rawPath}".`);
  return { clean: rel.split(sep).join('/'), absolute };
}

function inlineMarkdown(text, assetResolver) {
  let value = escapeHtml(text);
  const placeholders = [];
  const keep = (html) => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(html);
    return token;
  };

  value = value.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, (_, alt, src, title) => {
    const resolved = assetResolver(src);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return keep(`<img src="${escapeHtml(resolved)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${titleAttr}>`);
  });
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_, label, href) => {
    const external = href.startsWith('http');
    return keep(`<a href="${escapeHtml(href)}"${external ? ' rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`);
  });
  value = value.replace(/`([^`]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`));
  value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  value = value.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  value = value.replace(/\u0000(\d+)\u0000/g, (_, index) => placeholders[Number(index)] ?? '');
  return value;
}

function renderMarkdown(markdown, articleDir, publicBase, file) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const toc = [];
  const usedIds = new Map();
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let quoteLines = [];
  let codeFence = null;
  let codeLines = [];

  const assetResolver = (rawPath) => {
    const local = safeLocalAsset(rawPath, articleDir, file);
    return local ? `${publicBase}/${local.clean}` : rawPath;
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '), assetResolver)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item, assetResolver)}</li>`).join('')}</${listType}>`);
    listType = null;
    listItems = [];
  };
  const flushQuote = () => {
    if (!quoteLines.length) return;
    html.push(`<blockquote>${quoteLines.map((line) => `<p>${inlineMarkdown(line, assetResolver)}</p>`).join('')}</blockquote>`);
    quoteLines = [];
  };
  const flushAll = () => { flushParagraph(); flushList(); flushQuote(); };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```([\w-]*)\s*$/);
    if (fence) {
      flushAll();
      if (codeFence === null) {
        codeFence = fence[1] || 'text';
        codeLines = [];
      } else {
        html.push(`<pre><code class="language-${escapeHtml(codeFence)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeFence = null;
        codeLines = [];
      }
      continue;
    }
    if (codeFence !== null) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const text = heading[2].trim();
      const baseId = slugify(text);
      const count = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, count + 1);
      const id = count ? `${baseId}-${count + 1}` : baseId;
      toc.push({ id, text: text.replace(/[*_`]/g, ''), level });
      html.push(`<h${level} id="${escapeHtml(id)}">${inlineMarkdown(text, assetResolver)}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      html.push('<hr>');
      continue;
    }
    const imageOnly = line.trim().match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)$/);
    if (imageOnly) {
      flushAll();
      const src = assetResolver(imageOnly[2]);
      const caption = imageOnly[3] || imageOnly[1];
      html.push(`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(imageOnly[1])}" loading="lazy" decoding="async">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(); flushList();
      quoteLines.push(quote[1]);
      continue;
    }
    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph(); flushQuote();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(unordered[1]);
      continue;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph(); flushQuote();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(ordered[1]);
      continue;
    }
    flushList(); flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();
  if (codeFence !== null) fail(`${file}: незакрытый блок кода.`);
  return { html: html.join('\n'), toc };
}

async function validateMarkdownAssets(markdown, articleDir, file) {
  const imagePattern = /!\[[^\]]*\]\(([^\s)]+)(?:\s+["'][^"']*["'])?\)/g;
  const checked = new Set();
  let match;
  while ((match = imagePattern.exec(markdown))) {
    const rawPath = match[1];
    const local = safeLocalAsset(rawPath, articleDir, file);
    if (!local || checked.has(local.absolute)) continue;
    checked.add(local.absolute);
    if (!IMAGE_EXTENSIONS.has(extname(local.clean).toLowerCase())) {
      fail(`${file}: неподдерживаемый формат изображения "${local.clean}".`);
    }
    const assetStats = await stat(local.absolute).catch(() => null);
    if (!assetStats?.isFile()) fail(`${file}: изображение "${local.clean}" не найдено.`);
  }
}

function parseStatus(value, file) {
  if (value === undefined || value === null || value === '') return 'published';
  if (value !== 'draft' && value !== 'published') {
    fail(`${file}: status должен быть "draft" или "published".`);
  }
  return value;
}

function validatePublishedDate(publishedAt, status, file) {
  if (status === 'published' && publishedAt > todayUtc) {
    fail(`${file}: опубликованный материал не может иметь будущую дату ${publishedAt}. Используйте status: "draft".`);
  }
}

function validateSiteSettings(site, file) {
  for (const field of ['name', 'tagline', 'description', 'contactEmail', 'footerNote']) asString(site[field], field, file);
  if (!/^\S+@\S+\.\S+$/.test(site.contactEmail)) fail(`${file}: contactEmail выглядит некорректно.`);
  if (!site.hero || typeof site.hero !== 'object' || Array.isArray(site.hero)) fail(`${file}: объект hero обязателен.`);
  for (const field of ['eyebrow', 'title', 'text']) asString(site.hero[field], `hero.${field}`, file);
  if (!site.season || typeof site.season !== 'object' || Array.isArray(site.season)) fail(`${file}: объект season обязателен.`);
  for (const field of ['month', 'note']) asString(site.season[field], `season.${field}`, file);
  if (!Array.isArray(site.season.tasks) || site.season.tasks.length < 2) fail(`${file}: season.tasks должен содержать минимум две задачи.`);
  for (const [index, task] of site.season.tasks.entries()) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) fail(`${file}: season.tasks[${index}] должен быть объектом.`);
    asString(task.title, `season.tasks[${index}].title`, file);
    asString(task.text, `season.tasks[${index}].text`, file);
  }
}

async function listDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name).sort();
}

async function copyFolderAssets(sourceDir, destinationDir, exclude = new Set()) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.has(entry.name) || entry.name.startsWith('.')) continue;
    const sourcePath = join(sourceDir, entry.name);
    const destinationPath = join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copyFolderAssets(sourcePath, destinationPath, exclude);
    } else if (ALLOWED_ASSET_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      await cp(sourcePath, destinationPath);
    }
  }
}

async function buildArticles() {
  const sourceRoot = join(contentRoot, 'articles');
  const outputRoot = join(publicGeneratedRoot, 'articles');
  const slugs = await listDirectories(sourceRoot);
  const articles = [];

  for (const slug of slugs) {
    const articleDir = join(sourceRoot, slug);
    const file = join(articleDir, 'article.md');
    const source = await readFile(file, 'utf8').catch(() => fail(`${file}: файл article.md не найден.`));
    const { data, markdown } = parseFrontmatter(source, file);
    for (const field of REQUIRED_ARTICLE_FIELDS) asString(data[field], field, file);
    const status = parseStatus(data.status, file);
    const publishedAt = parseDate(data.publishedAt, 'publishedAt', file);
    const updatedAt = data.updatedAt ? parseDate(data.updatedAt, 'updatedAt', file) : publishedAt;
    validatePublishedDate(publishedAt, status, file);
    if (updatedAt < publishedAt) fail(`${file}: updatedAt не может быть раньше publishedAt.`);
    if (!markdown.trim()) fail(`${file}: текст статьи пуст.`);
    const coverName = typeof data.cover === 'string' ? data.cover : 'cover.svg';
    const cover = safeLocalAsset(coverName, articleDir, file);
    if (!cover) fail(`${file}: cover должен быть локальным файлом.`);
    if (!IMAGE_EXTENSIONS.has(extname(cover.clean).toLowerCase())) fail(`${file}: cover должен быть изображением.`);
    const coverStats = await stat(cover.absolute).catch(() => null);
    if (!coverStats?.isFile()) fail(`${file}: обложка "${coverName}" не найдена.`);
    await validateMarkdownAssets(markdown, articleDir, file);

    const publicBase = `/generated/articles/${slug}`;
    const rendered = renderMarkdown(markdown, articleDir, publicBase, file);
    const plainWords = markdown.replace(/[`#>*_\[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.ceil(plainWords / 180));

    articles.push({
      slug,
      title: asString(data.title, 'title', file),
      summary: asString(data.summary, 'summary', file),
      category: asString(data.category, 'category', file),
      publishedAt,
      updatedAt,
      readingTime: typeof data.readingTime === 'string' && data.readingTime.trim() ? data.readingTime.trim() : `${readingMinutes} мин`,
      author: asString(data.author, 'author', file),
      tags: Array.isArray(data.tags) ? data.tags.map(String).map((item) => item.trim()).filter(Boolean) : [],
      featured: data.featured === true,
      status,
      cover: `${publicBase}/${cover.clean}`,
      bodyHtml: rendered.html,
      toc: rendered.toc,
      wordCount: plainWords,
    });

    if (!checkOnly && status === 'published') await copyFolderAssets(articleDir, join(outputRoot, slug), new Set(['article.md']));
  }

  const published = articles
    .filter((article) => article.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const duplicateTitle = published.find((item, index) => published.findIndex((other) => other.title === item.title) !== index);
  if (duplicateTitle) fail(`Повторяется заголовок статьи: ${duplicateTitle.title}`);
  return published;
}

async function buildVideos() {
  const sourceRoot = join(contentRoot, 'videos');
  const outputRoot = join(publicGeneratedRoot, 'videos');
  const slugs = await listDirectories(sourceRoot);
  const videos = [];

  for (const slug of slugs) {
    const videoDir = join(sourceRoot, slug);
    const file = join(videoDir, 'config.yml');
    const data = parseFlatYaml(await readFile(file, 'utf8').catch(() => fail(`${file}: файл config.yml не найден.`)), file);
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(`${file}: YAML должен содержать объект.`);
    for (const field of REQUIRED_VIDEO_FIELDS) asString(data[field], field, file);
    const status = parseStatus(data.status, file);
    const publishedAt = parseDate(data.publishedAt, 'publishedAt', file);
    validatePublishedDate(publishedAt, status, file);
    const videoAsset = safeLocalAsset(data.video, videoDir, file);
    const posterAsset = safeLocalAsset(data.poster, videoDir, file);
    if (!videoAsset || !posterAsset) fail(`${file}: video и poster должны быть локальными файлами.`);
    if (!VIDEO_EXTENSIONS.has(extname(videoAsset.clean).toLowerCase())) fail(`${file}: video должен быть MP4 или WebM.`);
    if (!IMAGE_EXTENSIONS.has(extname(posterAsset.clean).toLowerCase())) fail(`${file}: poster должен быть изображением.`);
    for (const asset of [videoAsset, posterAsset]) {
      const assetStats = await stat(asset.absolute).catch(() => null);
      if (!assetStats?.isFile()) fail(`${file}: файл "${asset.clean}" не найден.`);
    }
    const publicBase = `/generated/videos/${slug}`;
    videos.push({
      id: slug,
      title: asString(data.title, 'title', file),
      description: asString(data.description, 'description', file),
      category: asString(data.category, 'category', file),
      author: typeof data.author === 'string' && data.author.trim() ? data.author.trim() : 'Редакция «Дача Практик»',
      publishedAt,
      duration: typeof data.duration === 'string' ? data.duration : '—',
      quality: typeof data.quality === 'string' ? data.quality : 'HD',
      tags: Array.isArray(data.tags) ? data.tags.map(String).map((item) => item.trim()).filter(Boolean) : [],
      featured: data.featured === true,
      placeholder: data.placeholder === true,
      note: typeof data.note === 'string' ? data.note.trim() : '',
      status,
      poster: `${publicBase}/${posterAsset.clean}`,
      src: `${publicBase}/${videoAsset.clean}`,
    });
    if (!checkOnly && status === 'published') await copyFolderAssets(videoDir, join(outputRoot, slug), new Set(['config.yml']));
  }

  const published = videos.filter((video) => video.status === 'published').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const duplicateTitle = published.find((item, index) => published.findIndex((other) => other.title === item.title) !== index);
  if (duplicateTitle) fail(`Повторяется заголовок видео: ${duplicateTitle.title}`);
  return published;
}

async function writeJsonAtomic(path, value) {
  const temp = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temp, path);
}

async function main() {
  const siteFile = join(contentRoot, 'site.json');
  const site = JSON.parse(await readFile(siteFile, 'utf8'));
  if (!site || typeof site !== 'object' || Array.isArray(site)) fail(`${siteFile}: JSON должен содержать объект.`);
  validateSiteSettings(site, siteFile);

  if (!checkOnly) {
    await rm(publicGeneratedRoot, { recursive: true, force: true });
    await mkdir(publicGeneratedRoot, { recursive: true });
  }

  const [articles, videos] = await Promise.all([buildArticles(), buildVideos()]);
  const categories = [...new Set(articles.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'ru'));
  const videoCategories = [...new Set(videos.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'ru'));
  const buildInfo = { generatedAt: new Date().toISOString(), articleCount: articles.length, videoCount: videos.length };

  if (!checkOnly) {
    await writeJsonAtomic(join(generatedRoot, 'articles.json'), { articles, categories });
    await writeJsonAtomic(join(generatedRoot, 'videos.json'), { videos, categories: videoCategories });
    await writeJsonAtomic(join(generatedRoot, 'site.json'), { ...site, build: buildInfo });
  }

  console.log(`[content] ${checkOnly ? 'Проверено' : 'Собрано'}: ${articles.length} статей, ${videos.length} видео.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
