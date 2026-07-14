export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") ?? "";
  const video = getVideoById(id);
  if (!video) throw createError({ statusCode: 404, statusMessage: "Видео не найдено." });
  setHeader(event, "cache-control", "public, max-age=60, s-maxage=600, stale-while-revalidate=86400");
  return video;
});
