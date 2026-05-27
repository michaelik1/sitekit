import { articles } from "~~/shared/articles";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, "");
  const staticPages = ["", "/articles", "/videos", "/about", "/contacts", "/register", "/privacy"];

  const urls = [
    ...staticPages.map((path) => ({ loc: `${siteUrl}${path}`, lastmod: new Date().toISOString() })),
    ...articles.map((article) => ({ loc: `${siteUrl}/articles/${article.slug}`, lastmod: new Date(article.date).toISOString() })),
    ...getVideos().map((video) => ({ loc: `${siteUrl}/videos/${video.id}`, lastmod: new Date(video.date).toISOString() }))
  ];

  setHeader(event, "content-type", "application/xml; charset=utf-8");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((item) => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${item.lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>`;
});
