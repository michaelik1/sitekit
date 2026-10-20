import { readdir, readFile, realpath, lstat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { parseDocument } from 'yaml';
import { pageSchema, siteSchema } from '../../shared/content.ts';
import type {
  ContentPage,
  PageSource,
  PageSummary,
  RenderedBlock,
  SiteSource
} from '../../shared/content.ts';
import { localAsset, pagePath, referencePath } from './paths.ts';
import { renderMarkdown } from './markdown.ts';

export type Snapshot = {
  site: SiteSource;
  pages: Map<string, ContentPage>;
  media: Map<string, string>;
};
const reserved = new Set([
  'api',
  'media',
  '_nuxt',
  'robots.txt',
  'rss.xml',
  'sitemap.xml',
  'favicon.svg'
]);
export const MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf'
};

async function yamlFile(file: string) {
  const doc = parseDocument(await readFile(file, 'utf8'), { uniqueKeys: true });
  if (doc.errors.length)
    throw new Error(`${file}: ${doc.errors.map((error) => error.message).join('; ')}`);
  return doc.toJS({ maxAliasCount: 50 });
}

function summary(source: PageSource, path: string): PageSummary {
  const { blocks, status: _status, schemaVersion: _version, ...meta } = source;
  const words = blocks
    .filter((block) => block.type === 'markdown')
    .map((block) => block.text)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    ...meta,
    path,
    ...(words && source.layout === 'article'
      ? { readingTime: Math.max(1, Math.ceil(words / 180)) }
      : {})
  };
}

/** One validated snapshot: no partial page tree is published. No provider SDKs. */
export async function loadContent(directory: string): Promise<Snapshot> {
  const root = await realpath(resolve(directory));
  const siteFile = join(root, 'site.yml');
  const siteResult = siteSchema.safeParse(await yamlFile(siteFile));
  if (!siteResult.success) throw new Error(`${siteFile}: ${siteResult.error.message}`);
  const site = siteResult.data;
  const sources = new Map<string, { source: PageSource; folder: string }>();
  async function scan(folder: string) {
    const entries = await readdir(join(root, folder), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink())
        throw new Error(`Symlinks are not supported in content: ${join(folder, entry.name)}`);
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'media') continue;
      if (
        !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(entry.name) ||
        (!folder && reserved.has(entry.name)) ||
        (folder && entry.name === 'index')
      )
        throw new Error(`Invalid or reserved page directory: ${join(folder, entry.name)}`);
      await scan(folder ? `${folder}/${entry.name}` : entry.name);
    }
    if (entries.some((entry) => entry.name === 'page.yml' && entry.isFile())) {
      if (!folder) throw new Error('Put the home page in index/page.yml, not content/page.yml');
      const file = join(root, folder, 'page.yml');
      const result = pageSchema.safeParse(await yamlFile(file));
      if (!result.success) throw new Error(`${file}: ${result.error.message}`);
      if (folder.startsWith('index/'))
        throw new Error('The index directory cannot have child pages');
      sources.set(pagePath(folder), { source: result.data, folder });
    }
  }
  await scan('');
  const published = new Map([...sources].filter(([, { source }]) => source.status === 'published'));
  if (!published.has('/')) throw new Error('A published home page is required at index/page.yml');
  const summaries = new Map(
    [...published].map(([path, { source }]) => [path, summary(source, path)])
  );
  const media = new Map<string, string>();
  const pages = new Map<string, ContentPage>();

  function requiredPage(ref: string, current: string) {
    const path = referencePath(ref, current);
    const entry = summaries.get(path);
    if (!entry) throw new Error(`${current}: page reference does not exist or is a draft: ${ref}`);
    return entry;
  }
  function link(ref: string, current: string) {
    if (ref.startsWith('#') || /^(https?:\/\/|mailto:|tel:)/.test(ref)) return ref;
    if (/^[a-z][\w+.-]*:/i.test(ref) || ref.startsWith('//'))
      throw new Error(`${current}: unsupported link: ${ref}`);
    const path = ref.split(/[?#]/)[0]!;
    if (['/rss.xml', '/sitemap.xml', '/robots.txt'].includes(path)) return ref;
    return requiredPage(path || current, current).path + ref.slice(path.length);
  }
  for (const item of [...site.navigation, ...site.footer.links]) link(item.href, '/');

  for (const [path, { source, folder }] of published) {
    try {
      const headings = new Map<string, number>();
      const tocItems: ContentPage['tocItems'] = [];
      const asset = async (ref: string, kind?: 'image' | 'video') => {
        const extension = extname(ref).toLowerCase();
        if (!MIME[extension] || (kind && !MIME[extension]!.startsWith(`${kind}/`)))
          throw new Error(`Unsupported ${kind ?? 'media'} format: ${ref}`);
        const result = await localAsset(root, folder, ref);
        media.set(result.url, result.file);
        return result.url;
      };
      const meta = { ...summaries.get(path)! };
      if (meta.cover) meta.cover = await asset(meta.cover, 'image');
      const blocks: RenderedBlock[] = [];
      for (const raw of source.blocks) {
        const block: RenderedBlock = structuredClone(raw);
        if (block.type === 'markdown' || block.type === 'callout') {
          const rendered = await renderMarkdown(
            block.text,
            (ref) => asset(ref, 'image'),
            (ref) => link(ref, path),
            headings
          );
          block.html = rendered.html;
          tocItems.push(...rendered.toc);
        }
        if (block.type === 'image') block.src = await asset(block.src, 'image');
        if (block.type === 'video') {
          block.src = await asset(block.src, 'video');
          if (block.poster) block.poster = await asset(block.poster, 'image');
        }
        if ('actions' in block)
          for (const action of block.actions) action.href = link(action.href, path);
        if (block.type === 'links')
          for (const item of block.items) item.href = link(item.href, path);
        if (block.type === 'cards')
          for (const item of block.items) if (item.href) item.href = link(item.href, path);
        if (block.type === 'featured') block.entry = { ...requiredPage(block.page, path) };
        if (block.type === 'collection') {
          if (block.items)
            block.entries = block.items.map((ref) => ({ ...requiredPage(ref, path) }));
          else if (block.source) {
            const query = block.source;
            const parent = referencePath(query.path, path);
            // Folder-only sections are valid even without their own landing page.
            if (
              parent !== '/' &&
              !(await lstat(join(root, parent.slice(1))).catch(() => null))?.isDirectory()
            )
              throw new Error(`Collection directory not found: ${query.path}`);
            const prefix = parent === '/' ? '/' : `${parent}/`;
            let entries = [...summaries.values()].filter(
              (entry) =>
                entry.path !== path &&
                entry.path.startsWith(prefix) &&
                (query.recursive || !entry.path.slice(prefix.length).includes('/'))
            );
            if (query.layout) entries = entries.filter((entry) => entry.layout === query.layout);
            if (query.category)
              entries = entries.filter((entry) => entry.category === query.category);
            if (query.tag) entries = entries.filter((entry) => entry.tags.includes(query.tag!));
            if (query.featured !== undefined)
              entries = entries.filter((entry) => entry.featured === query.featured);
            entries.sort((a, b) => {
              const cmp =
                query.sort === 'order'
                  ? a.order - b.order
                  : query.sort === 'title'
                    ? a.title.localeCompare(b.title, site.language)
                    : (a.publishedAt ?? '').localeCompare(b.publishedAt ?? '');
              return (query.order === 'asc' ? cmp : -cmp) || a.path.localeCompare(b.path);
            });
            block.entries = entries
              .slice(0, query.limit ?? entries.length)
              .map((entry) => ({ ...entry }));
          }
        }
        blocks.push(block);
      }
      const breadcrumbs: ContentPage['breadcrumbs'] = [];
      if (path !== '/') {
        breadcrumbs.push({ label: summaries.get('/')!.title, href: '/' });
        const parts = path.slice(1).split('/');
        for (let index = 1; index < parts.length; index++) {
          const parent = summaries.get(`/${parts.slice(0, index).join('/')}`);
          if (parent) breadcrumbs.push({ label: parent.title, href: parent.path });
        }
      }
      pages.set(path, { ...meta, blocks, tocItems, breadcrumbs });
    } catch (error) {
      throw new Error(`${folder}/page.yml: ${error instanceof Error ? error.message : error}`);
    }
  }
  // Resolve summary covers after all assets have been validated.
  for (const page of pages.values())
    for (const block of page.blocks)
      for (const entry of [...(block.entries ?? []), ...(block.entry ? [block.entry] : [])])
        entry.cover = pages.get(entry.path)?.cover;
  return { site, pages, media };
}

export function createContentStore(root: string, ttlMs = 1000) {
  let snapshot: Snapshot | undefined;
  let expiresAt = 0;
  let pending: Promise<Snapshot> | undefined;
  return {
    async get(): Promise<Snapshot> {
      if (snapshot && Date.now() < expiresAt) return snapshot;
      if (pending) return pending;
      pending = loadContent(root)
        .then((value) => {
          snapshot = value;
          return value;
        })
        .catch((error) => {
          if (!snapshot) throw error;
          console.error(
            '[content] Update rejected; serving the last valid snapshot.',
            error.message
          );
          return snapshot;
        })
        .finally(() => {
          expiresAt = Date.now() + ttlMs;
          pending = undefined;
        });
      return pending;
    }
  };
}
