import { escapeXml } from '../content/xml.ts';
export default defineEventHandler(async (event) => {
  const { site, pages } = await contentStore().get();
  const url = String(useRuntimeConfig(event).public.siteUrl || site.url).replace(/\/$/, '');
  const items = [...pages.values()]
    .filter((page) => page.layout === 'article' && page.publishedAt)
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))
    .slice(0, 20);
  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8');
  setHeader(event, 'cache-control', 'no-cache');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(site.name)}</title><link>${escapeXml(url)}</link><description>${escapeXml(site.description)}</description><language>${escapeXml(site.language)}</language>${items.map((page) => `<item><title>${escapeXml(page.title)}</title><link>${escapeXml(url + page.path)}</link><guid isPermaLink="true">${escapeXml(url + page.path)}</guid><description>${escapeXml(page.description ?? '')}</description><pubDate>${new Date(`${page.publishedAt}T00:00:00Z`).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
});
