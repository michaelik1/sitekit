export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store');
  const raw = getQuery(event).path;
  const path = typeof raw === 'string' ? raw.replace(/\/$/, '') || '/' : '/';
  let snapshot;
  try {
    snapshot = await contentStore().get();
  } catch (error) {
    console.error('[content]', error);
    throw createError({
      statusCode: 503,
      statusMessage: 'Content unavailable. Check server logs.'
    });
  }
  const page = snapshot.pages.get(path);
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' });
  return page;
});
