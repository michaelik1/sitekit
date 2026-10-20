import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { stringify } from 'yaml';
import { loadContent, createContentStore } from '../server/content/store.ts';
import { referencePath, within } from '../server/content/paths.ts';
import { parseRange } from '../server/content/range.ts';

async function fixture(t: Parameters<Parameters<typeof test>[1]>[0]) {
  const parent = resolve('output/tests');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, 'content-'));
  t.after(async () => {
    assert.ok(within(parent, root));
    await rm(root, { recursive: true, force: true });
  });
  const page = async (folder: string, data: Record<string, unknown>) => {
    await mkdir(join(root, folder), { recursive: true });
    await writeFile(
      join(root, folder, 'page.yml'),
      stringify({ schemaVersion: 1, title: folder, ...data })
    );
  };
  await writeFile(join(root, 'site.yml'), stringify({ schemaVersion: 1, name: 'Example' }));
  await page('index', {});
  return { root, page };
}

test('nested routes, folder-only sections, queries, explicit order and drafts', async (t) => {
  const { root, page } = await fixture(t);
  await page('notes/first', { layout: 'article', publishedAt: '2025-01-01', category: 'A' });
  await page('notes/deep/second', { layout: 'article', publishedAt: '2025-02-01', category: 'B' });
  await page('notes/draft', { status: 'draft', cover: './media/not-ready.webp' });
  await page('index', {
    blocks: [
      { type: 'collection', source: { path: '/notes', recursive: true, layout: 'article' } },
      { type: 'collection', source: { path: '/notes', category: 'A' } },
      { type: 'collection', items: ['/notes/first', '/notes/deep/second'] }
    ]
  });
  const snapshot = await loadContent(root);
  assert.equal(snapshot.pages.has('/notes/deep/second'), true);
  assert.equal(snapshot.pages.has('/notes/draft'), false);
  assert.deepEqual(
    snapshot.pages.get('/')!.blocks[0]!.entries!.map((item) => item.path),
    ['/notes/deep/second', '/notes/first']
  );
  assert.equal(snapshot.pages.get('/')!.blocks[1]!.entries!.length, 1);
  assert.equal(snapshot.pages.get('/')!.blocks[2]!.entries![0]!.path, '/notes/first');
});

test('local media, Markdown links, unique TOC IDs across blocks and HTML safety', async (t) => {
  const { root, page } = await fixture(t);
  await mkdir(join(root, 'notes', 'media'), { recursive: true });
  await writeFile(
    join(root, 'notes', 'media', 'image.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"/>'
  );
  await page('notes', {
    cover: './media/image.svg',
    toc: true,
    blocks: [
      {
        type: 'markdown',
        text: '## Heading\n\n![Image](./media/image.svg)\n\n[Home](/)\n\n<script>alert(1)</script>'
      },
      { type: 'markdown', text: '## Heading\n\n<img src="https://tracker.example/pixel">' }
    ]
  });
  const snapshot = await loadContent(root);
  const result = snapshot.pages.get('/notes')!;
  assert.equal(result.cover, '/media/notes/media/image.svg');
  assert.deepEqual(
    result.tocItems.map((item) => item.id),
    ['heading', 'heading-2']
  );
  assert.match(result.blocks[0]!.html!, /src="\/media\/notes\/media\/image.svg"/);
  assert.doesNotMatch(result.blocks[0]!.html!, /<script/);
  assert.doesNotMatch(result.blocks[1]!.html!, /<img/);
  assert.equal(snapshot.media.size, 1);
});

test('invalid schema version, typo, date, unknown block and misplaced hero are rejected', async (t) => {
  const { root, page } = await fixture(t);
  for (const invalid of [
    { schemaVersion: 2 },
    { titel: 'typo' },
    { publishedAt: '2025-02-30' },
    { blocks: [{ type: 'script', text: 'bad' }] },
    {
      blocks: [
        { type: 'markdown', text: 'Text' },
        { type: 'hero', title: 'Second h1' }
      ]
    }
  ]) {
    await page('invalid', invalid);
    await assert.rejects(loadContent(root), /invalid.*page.yml/);
  }
});

test('broken page references, unsafe links, missing media and path traversal are rejected', async (t) => {
  const { root, page } = await fixture(t);
  for (const blocks of [
    [{ type: 'featured', page: '/missing' }],
    [{ type: 'markdown', text: '[Bad](javascript:alert)' }],
    [{ type: 'markdown', text: '![Missing](./media/missing.webp)' }],
    [{ type: 'image', src: './media/../../secret.png', alt: '' }],
    [{ type: 'collection', source: { path: '../../outside' } }]
  ]) {
    await page('invalid', { blocks });
    await assert.rejects(loadContent(root));
  }
  assert.throws(() => referencePath('../../outside', '/one'));
});

test('unreferenced media and draft assets are not exposed', async (t) => {
  const { root, page } = await fixture(t);
  await mkdir(join(root, 'draft', 'media'), { recursive: true });
  await writeFile(join(root, 'draft', 'media', 'secret.svg'), '<svg/>');
  await page('draft', { status: 'draft', cover: './media/secret.svg' });
  assert.equal((await loadContent(root)).media.size, 0);
});

test('cache refresh adds, updates and removes routes; invalid edits retain last good snapshot', async (t) => {
  const { root, page } = await fixture(t);
  const store = createContentStore(root, 0);
  await store.get();
  await page('new/nested', { title: 'First' });
  assert.equal((await store.get()).pages.get('/new/nested')!.title, 'First');
  await page('new/nested', { title: 'Second' });
  assert.equal((await store.get()).pages.get('/new/nested')!.title, 'Second');
  await writeFile(join(root, 'new/nested/page.yml'), 'title: [invalid');
  const originalError = console.error;
  const errors: unknown[][] = [];
  console.error = (...args) => {
    errors.push(args);
  };
  try {
    assert.equal((await store.get()).pages.get('/new/nested')!.title, 'Second');
  } finally {
    console.error = originalError;
  }
  assert.equal(errors.length, 1);
  await rm(join(root, 'new/nested/page.yml'));
  assert.equal((await store.get()).pages.has('/new/nested'), false);
});

test('media symlinks cannot escape the page directory', async (t) => {
  if (process.platform === 'win32') {
    t.skip(
      'Creating file symlinks requires a Windows privilege; path containment is tested separately.'
    );
    return;
  }
  const { root, page } = await fixture(t);
  await mkdir(join(root, 'linked/media'), { recursive: true });
  await symlink(join(root, 'site.yml'), join(root, 'linked/media/image.svg'));
  await page('linked', { cover: './media/image.svg' });
  await assert.rejects(loadContent(root), /Invalid media file/);
});

test('HTTP Range parsing supports bounded, open and suffix requests, rejects malformed ranges', () => {
  assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=0-999', 100), { start: 0, end: 99 });
  for (const range of [
    'bytes=-',
    'bytes=-0',
    'bytes=100-',
    'bytes=9-1',
    'bytes=0-1,5-6',
    'bytes=999999999999999999-'
  ])
    assert.equal(parseRange(range, 100), null);
});

test('bundled site works without provider credentials or generated content', async () => {
  const snapshot = await loadContent(resolve('examples/content'));
  assert.ok(snapshot.pages.has('/guide/nested/hello'));
  assert.ok(snapshot.pages.size >= 2);
  const types = new Set(
    [...snapshot.pages.values()].flatMap((page) => page.blocks.map((block) => block.type))
  );
  assert.equal(types.size, 10);
  const source = await readFile('package.json', 'utf8');
  assert.doesNotMatch(source, /aws-sdk|prepare-content|media:sync/);
});
