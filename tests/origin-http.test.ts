import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.SITEKIT_TEST_URL;
const fixed = process.env.SITEKIT_TEST_ORIGIN;

test(
  'HTTP routes and server-rendered metadata use the request origin consistently',
  { skip: !base },
  async () => {
    const cases = [
      { headers: {}, origin: new URL(base!).origin },
      {
        headers: { 'x-forwarded-host': 'first.example', 'x-forwarded-proto': 'https' },
        origin: 'https://first.example'
      },
      {
        headers: {
          'x-forwarded-host': 'second.example:8443, internal:3000',
          'x-forwarded-proto': 'https, http'
        },
        origin: 'https://second.example:8443'
      },
      { headers: {}, origin: new URL(base!).origin }
    ];
    for (const scenario of cases) {
      const origin = fixed || scenario.origin;
      async function get(path: string) {
        const response = await fetch(new URL(path, base), { headers: scenario.headers });
        assert.equal(response.status, 200, `${path}: ${response.status}`);
        return response;
      }
      const settings = await (await get('/api/content/site')).json();
      assert.equal(settings.url, origin);
      const html = await (await get('/articles/first-story')).text();
      assert.ok(
        html.includes(`rel="canonical" href="${origin}/articles/first-story"`),
        'SSR canonical uses the external origin'
      );
      assert.ok(
        html.includes(`content="${origin}/media/articles/first-story/media/cover.svg"`),
        'Open Graph image uses the external origin'
      );
      const sitemap = await (await get('/sitemap.xml')).text();
      assert.ok(sitemap.includes(`<loc>${origin}/articles/first-story</loc>`));
      const rss = await (await get('/rss.xml')).text();
      assert.ok(rss.includes(`<link>${origin}/articles/first-story</link>`));
      const robots = await (await get('/robots.txt')).text();
      assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
    }
  }
);
