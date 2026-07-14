export default defineEventHandler((event) => {
  const slug = getRouterParam(event, "slug") ?? "";
  const article = getArticleBySlug(slug);
  if (!article) throw createError({ statusCode: 404, statusMessage: "Статья не найдена." });
  setHeader(event, "cache-control", "public, max-age=60, s-maxage=600, stale-while-revalidate=86400");
  return article;
});
