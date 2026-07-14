function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, "");
  const items = getArticles().slice(0, 20).map((article) => {
    const link = `${siteUrl}/articles/${article.slug}`;
    return `<item><title>${escapeXml(article.title)}</title><link>${escapeXml(link)}</link><guid isPermaLink="true">${escapeXml(link)}</guid><description>${escapeXml(article.summary)}</description><pubDate>${new Date(`${article.publishedAt}T09:00:00+03:00`).toUTCString()}</pubDate><category>${escapeXml(article.category)}</category></item>`;
  });
  setHeader(event, "content-type", "application/rss+xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600, s-maxage=86400");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Дача Практик</title><link>${escapeXml(siteUrl)}</link><description>Новые статьи и сезонные памятки.</description><language>ru</language>${items.join("")}</channel></rss>`;
});
