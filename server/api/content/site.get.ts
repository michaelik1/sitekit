export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store');
  try {
    const { site } = await contentStore().get();
    const url = String(useRuntimeConfig(event).public.siteUrl || site.url).replace(/\/$/, '');
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
