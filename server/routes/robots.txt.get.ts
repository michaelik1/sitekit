export default defineEventHandler(async (event) => {
  const { site } = await contentStore().get();
  const url = String(useRuntimeConfig(event).public.siteUrl || site.url).replace(/\/$/, '');
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${url}/sitemap.xml\n`;
});
