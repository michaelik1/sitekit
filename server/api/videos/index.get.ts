export default defineEventHandler(() => {
  return {
    videos: getVideos(),
    categories: getVideoCategories()
  };
});
