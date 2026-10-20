export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store');
  const url = siteUrl(event);
  try {
    const { site } = await contentStore().get();
    return { ...site, url };
  } catch (error) {
    console.error('[content]', error);
    throw createError({
      statusCode: 503,
      statusMessage:
        'Content unavailable. Check the mounted content directory and run npm run content:check.'
    });
  }
});
