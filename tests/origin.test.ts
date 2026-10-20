import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiteOrigin } from '../server/content/origin.ts';
import { siteSchema } from '../shared/content.ts';

test('direct requests retain their host, port and transport protocol', () => {
  assert.equal(resolveSiteOrigin({ host: 'localhost:3000' }), 'http://localhost:3000');
  assert.equal(resolveSiteOrigin({ host: 'example.com' }, 'https'), 'https://example.com');
  assert.equal(resolveSiteOrigin({ host: '[::1]:3000' }), 'http://[::1]:3000');
});

test('proxy headers resolve public origins independently for consecutive requests', () => {
  assert.equal(
    resolveSiteOrigin({
      host: 'site:3000',
      forwardedHost: 'first.example',
      forwardedProto: 'https'
    }),
    'https://first.example'
  );
  assert.equal(
    resolveSiteOrigin({
      host: 'site:3000',
      forwardedHost: 'second.example:8443',
      forwardedProto: 'https, http'
    }),
    'https://second.example:8443'
  );
  assert.equal(
    resolveSiteOrigin({ host: 'public.example', forwardedProto: 'https' }),
    'https://public.example'
  );
  assert.equal(
    resolveSiteOrigin({
      host: 'internal:3000',
      forwardedHost: 'public.example, internal:3000',
      forwardedProto: 'https'
    }),
    'https://public.example'
  );
});

test('a fixed origin overrides request headers and rejects invalid configuration', () => {
  assert.equal(
    resolveSiteOrigin({ host: 'localhost:3000' }, 'http', ' https://canonical.example/ '),
    'https://canonical.example'
  );
  for (const override of [
    'file:///tmp/site',
    'https://user:password@example.com',
    'https://example.com/base',
    'https://example.com/?query=1',
    'https://example.com/#fragment',
    'not-a-url'
  ]) {
    assert.throws(() => resolveSiteOrigin({ host: 'localhost:3000' }, 'http', override));
  }
});

test('malformed authorities and unsupported protocols cannot become generated links', () => {
  for (const host of [
    '',
    'example.com/path',
    'user@example.com',
    'example.com?query=1',
    'example.com#fragment',
    'example.com\\path',
    'example.com\nmalformed'
  ])
    assert.throws(() => resolveSiteOrigin({ host }));
  assert.throws(() => resolveSiteOrigin({ host: 'example.com', forwardedProto: 'javascript' }));
});

test('site configs work without a domain and accept legacy url fields', () => {
  assert.equal(siteSchema.parse({ schemaVersion: 1, name: 'Portable site' }).url, undefined);
  assert.equal(
    siteSchema.parse({ schemaVersion: 1, name: 'Existing site', url: 'https://legacy.example' })
      .url,
    'https://legacy.example'
  );
});
