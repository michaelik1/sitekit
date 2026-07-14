function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig(event).public.siteUrl).replace(/\/$/, "");
  const staticPages = ["", "/articles", "/videos", "/calendar", "/about", "/contacts", "/privacy"];
  const contentDates = [...getArticles().map((article) => article.updatedAt), ...getVideos().map((video) => video.publishedAt)].sort().reverse();
  const latestContentDate = contentDates[0] ?? new Date().toISOString().slice(0, 10);
  const urls = [
    ...staticPages.map((path) => ({ loc: `${siteUrl}${path}`, lastmod: latestContentDate })),
    ...getArticles().map((article) => ({ loc: `${siteUrl}/articles/${article.slug}`, lastmod: article.updatedAt })),
    ...getVideos().map((video) => ({ loc: `${siteUrl}/videos/${video.id}`, lastmod: video.publishedAt }))
  ];
  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600, s-maxage=86400");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${item.lastmod}</lastmod></url>`).join("\n")}\n</urlset>`;
});
