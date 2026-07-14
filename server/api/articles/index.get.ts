export default defineEventHandler((event) => {
  const query = getQuery(event);
  const category = typeof query.category === "string" ? query.category : "";
  const featured = query.featured === "true";
  const parsedLimit = Number(query.limit);
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : undefined;

  let articles = getArticleSummaries();
  if (category) articles = articles.filter((article) => article.category === category);
  if (featured) articles = articles.filter((article) => article.featured);
  if (limit) articles = articles.slice(0, limit);

  setHeader(event, "cache-control", "public, max-age=60, s-maxage=600, stale-while-revalidate=86400");
  return { articles, categories: getArticleCategories() };
});
