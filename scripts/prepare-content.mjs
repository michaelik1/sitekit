import { cp, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const contentRoot = join(root, 'content');
const generatedRoot = join(root, 'generated');
const publicGeneratedRoot = join(root, 'public', 'generated');
// Video binaries are stored outside public/ so they are served only through the
// server route that supports Range requests (HTTP 206). This enables browser streaming.
const videoFilesRoot = join(root, '_videofiles');
const checkOnly = process.argv.includes('--check');
const todayUtc = process.env.CONTENT_TODAY ?? new Date().toISOString().slice(0, 10);

const REQUIRED_ARTICLE_FIELDS = ['title', 'summary', 'category', 'publishedAt', 'author'];
const REQUIRED_VIDEO_FIELDS = ['title', 'description', 'category', 'publishedAt'];

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

/**
 * Resolves an asset path relative to baseDir.
 * - If rawName already contains an extension that matches one of allowedExts, returns it directly.
 * - Otherwise treats rawName as a stem and scans the directory for the first file whose
 *   basename (without extension) matches the stem and whose extension is in allowedExts.
 * Returns { clean, absolute } or null if nothing found.
 */
async function resolveAssetFuzzy(rawName, baseDir, allowedExts, file) {
  const stem = rawName.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/\\/g, '/');
  if (!stem || stem.startsWith('/') || stem.includes('://')) return null;
  const absolute = resolve(baseDir, stem);
  const rel = relative(baseDir, absolute);
  if (rel.startsWith('..') || rel.split(sep).includes('..')) fail(`${file}: недопустимый путь к ресурсу "${rawName}".`);
  // If the provided name already has an allowed extension, use it directly.
  if (allowedExts.has(extname(stem).toLowerCase())) {
    return { clean: rel.split(sep).join('/'), absolute };
  }
  // Otherwise treat as a stem and search the containing directory.
  const containingDir = resolve(baseDir, stem, '..');
  const stemBase = basename(stem);
  let entries;
  try { entries = await readdir(containingDir, { withFileTypes: true }); } catch { return null; }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    const nameNoExt = entry.name.slice(0, entry.name.length - ext.length);
    if (nameNoExt === stemBase && allowedExts.has(ext)) {
      const foundAbs = join(containingDir, entry.name);
      const foundRel = relative(baseDir, foundAbs);
      return { clean: foundRel.split(sep).join('/'), absolute: foundAbs };
    }
  }
  return null;
}

/**
 * Reads the duration of an MP4 file by parsing the mvhd box without any external dependencies.
 * Returns a "MM:SS" string, or null if parsing fails.
 *
 * mvhd box layout (after the 8-byte box header already consumed by dataStart):
 *   version 0 (32-bit):  flags(4) + creation(4) + modification(4) + timescale(4) + duration(4)
 *   version 1 (64-bit):  flags(4) + creation(8) + modification(8) + timescale(4) + duration(8)
 */
async function readMp4Duration(absolutePath) {
  let fh;
  try {
    fh = await open(absolutePath, 'r');
    const fileSize = (await fh.stat()).size;
    const readUint32 = async (pos) => {
      const buf = Buffer.allocUnsafe(4);
      const { bytesRead } = await fh.read(buf, 0, 4, pos);
      if (bytesRead < 4) throw new Error('eof');
      return buf.readUInt32BE(0);
    };
    const readBox = async (pos) => {
      if (pos + 8 > fileSize) return null;
      const size = await readUint32(pos);
      const typeBuf = Buffer.allocUnsafe(4);
      await fh.read(typeBuf, 0, 4, pos + 4);
      const type = typeBuf.toString('ascii');
      const boxSize = size === 0 ? fileSize - pos : size;
      return { type, size: boxSize, dataStart: pos + 8 };
    };
    // Find moov at top level.
    let pos = 0;
    let moovStart = -1;
    let moovSize = 0;
    while (pos < fileSize) {
      const box = await readBox(pos);
      if (!box || box.size < 8) break;
      if (box.type === 'moov') { moovStart = box.dataStart; moovSize = box.size - 8; break; }
      pos += box.size;
    }
    if (moovStart < 0) return null;
    // Find mvhd inside moov.
    pos = moovStart;
    const moovEnd = moovStart + moovSize;
    while (pos < moovEnd) {
      const box = await readBox(pos);
      if (!box || box.size < 8) break;
      if (box.type === 'mvhd') {
        // Read enough bytes to cover both version layouts
        const header = Buffer.allocUnsafe(28);
        await fh.read(header, 0, 28, box.dataStart);
        const version = header[0];
        let timescale, durationRaw;
        if (version === 1) {
          // 64-bit: flags(4) + creation(8) + modification(8) + timescale(4) + duration(8)
          timescale = header.readUInt32BE(20);
          const durHigh = header.readUInt32BE(24);
          const extra = Buffer.allocUnsafe(4);
          await fh.read(extra, 0, 4, box.dataStart + 28);
          const durLow = extra.readUInt32BE(0);
          durationRaw = durHigh * 0x100000000 + durLow;
        } else {
          // 32-bit: flags(4) + creation(4) + modification(4) + timescale(4) + duration(4)
          timescale = header.readUInt32BE(12);
          durationRaw = header.readUInt32BE(16);
        }
        if (!timescale) return null;
        const totalSeconds = Math.round(durationRaw / timescale);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      pos += box.size;
    }
    return null;
  } catch {
    return null;
  } finally {
    await fh?.close();
  }
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

async function copyFolderAssets(sourceDir, destinationDir, exclude = new Set(), excludeExts = new Set()) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.has(entry.name) || entry.name.startsWith('.')) continue;
    const sourcePath = join(sourceDir, entry.name);
    const destinationPath = join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copyFolderAssets(sourcePath, destinationPath, exclude, excludeExts);
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (ALLOWED_ASSET_EXTENSIONS.has(ext) && !excludeExts.has(ext)) {
        await cp(sourcePath, destinationPath);
      }
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

    // Resolve video asset: default to "video.mp4"; accepts name with or without extension.
    const videoRaw = typeof data.video === 'string' && data.video.trim() ? data.video.trim() : 'video';
    const videoAsset = await resolveAssetFuzzy(videoRaw, videoDir, VIDEO_EXTENSIONS, file);
    if (!videoAsset) fail(`${file}: видео-файл "${videoRaw}" не найден (поддерживаются: ${[...VIDEO_EXTENSIONS].join(', ')}).`);

    // Resolve poster asset: default to "poster"; accepts name with or without extension.
    const posterRaw = typeof data.poster === 'string' && data.poster.trim() ? data.poster.trim() : 'poster';
    const posterAsset = await resolveAssetFuzzy(posterRaw, videoDir, IMAGE_EXTENSIONS, file);
    if (!posterAsset) fail(`${file}: постер "${posterRaw}" не найден (поддерживаются: ${[...IMAGE_EXTENSIONS].join(', ')}).`);

    // Auto-detect duration from MP4 if not specified in config.
    let duration;
    if (typeof data.duration === 'string' && data.duration.trim()) {
      duration = data.duration.trim();
    } else {
      const detected = await readMp4Duration(videoAsset.absolute);
      duration = detected ?? '—';
    }

    const publicBase = `/generated/videos/${slug}`;
    // Video src goes through the server range-request route (/_videofiles/…)
    const srcPath = `/stream/${slug}/${videoAsset.clean}`;
    videos.push({
      id: slug,
      title: asString(data.title, 'title', file),
      description: asString(data.description, 'description', file),
      category: asString(data.category, 'category', file),
      author: typeof data.author === 'string' && data.author.trim() ? data.author.trim() : 'Редакция «Дача Практик»',
      publishedAt,
      duration,
      quality: typeof data.quality === 'string' ? data.quality : 'HD',
      tags: Array.isArray(data.tags) ? data.tags.map(String).map((item) => item.trim()).filter(Boolean) : [],
      featured: data.featured === true,
      placeholder: data.placeholder === true,
      note: typeof data.note === 'string' ? data.note.trim() : '',
      status,
      poster: `${publicBase}/${posterAsset.clean}`,
      src: srcPath,
    });

    if (!checkOnly && status === 'published') {
      // Copy poster and other non-video assets to public/generated/videos/{slug}/
      await copyFolderAssets(videoDir, join(outputRoot, slug), new Set(['config.yml']), VIDEO_EXTENSIONS);
      // Copy video binary to _videofiles/{slug}/ (served via streaming route)
      const videoFilesDir = join(videoFilesRoot, slug);
      await mkdir(videoFilesDir, { recursive: true });
      await cp(videoAsset.absolute, join(videoFilesDir, videoAsset.clean));
    }
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

async function emptyDirectory(path) {
  await mkdir(path, { recursive: true });
  const entries = await readdir(path);
  await Promise.all(entries.map((entry) => rm(join(path, entry), { recursive: true, force: true })));
}

async function main() {
  const siteFile = join(contentRoot, 'site.json');
  const site = JSON.parse(await readFile(siteFile, 'utf8'));
  if (!site || typeof site !== 'object' || Array.isArray(site)) fail(`${siteFile}: JSON должен содержать объект.`);
  validateSiteSettings(site, siteFile);

  if (!checkOnly) {
    await emptyDirectory(publicGeneratedRoot);
    await emptyDirectory(videoFilesRoot);
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
