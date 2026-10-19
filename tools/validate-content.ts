import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { loadContent } from '../server/content/store.ts';

try {
  const root = resolve(
    process.env.NUXT_CONTENT_DIR ||
      (existsSync('content/site.yml') ? 'content' : 'examples/content')
  );
  const { pages, media } = await loadContent(root);
  console.log(
    `[content] Valid: ${pages.size} published pages, ${media.size} referenced media files (${root}).`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
