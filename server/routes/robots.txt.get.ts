export default defineEventHandler(async (event) => {
  const url = siteUrl(event);
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${url}/sitemap.xml\n`;
});
