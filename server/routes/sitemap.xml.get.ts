import { escapeXml } from '../content/xml.ts';
export default defineEventHandler(async (event) => {
  const { site, pages } = await contentStore().get();
  const url = String(useRuntimeConfig(event).public.siteUrl || site.url).replace(/\/$/, '');
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  setHeader(event, 'cache-control', 'no-cache');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.values()].map((page) => `<url><loc>${escapeXml(url + (page.path === '/' ? '' : page.path))}</loc>${page.updatedAt || page.publishedAt ? `<lastmod>${page.updatedAt || page.publishedAt}</lastmod>` : ''}</url>`).join('')}</urlset>`;
});
