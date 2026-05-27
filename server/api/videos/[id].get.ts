export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") ?? "";
  const video = getVideoById(id);

  if (!video) {
    throw createError({ statusCode: 404, statusMessage: "Видео не найдено." });
  }

  return video;
});
