import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = resolve(import.meta.dirname, '..');
const manifestPath = join(root, 'content', 'media-manifest.json');

function loadDotEnv() {
  return readFile(join(root, '.env'), 'utf8').then((source) => {
    for (const raw of source.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }).catch(() => {});
}

function safeDestination(localPath) {
  if (typeof localPath !== 'string' || !localPath) throw new Error('Manifest has an invalid localPath.');
  const destination = resolve(root, localPath);
  const rel = relative(root, destination);
  if (isAbsolute(rel) || rel.startsWith('..') || rel.split(sep).includes('..')) throw new Error(`Unsafe local path: ${localPath}`);
  return destination;
}

async function fileMatches(file, expectedHash, expectedBytes) {
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size !== expectedBytes) return false;
  } catch { return false; }
  const hash = createHash('sha256');
  const { createReadStream } = await import('node:fs');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex') === expectedHash;
}

await loadDotEnv();
const baseUrl = process.env.DECOY_MEDIA_BASE_URL?.replace(/\/+$/, '');
if (!baseUrl) throw new Error('Set DECOY_MEDIA_BASE_URL in decoy/.env before syncing media.');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('Unsupported media manifest.');

for (const item of manifest.files) {
  if (!item || typeof item.path !== 'string' || typeof item.sha256 !== 'string' || !Number.isSafeInteger(item.bytes)) {
    throw new Error('Manifest contains an invalid file entry.');
  }
  const destination = safeDestination(item.localPath);
  if (await fileMatches(destination, item.sha256, item.bytes)) {
    console.log(`[media] Already present: ${item.localPath}`);
    continue;
  }
  const url = `${baseUrl}/${item.path.split('/').map(encodeURIComponent).join('/')}`;
  console.log(`[media] Downloading: ${item.localPath}`);
  const headers = process.env.DECOY_MEDIA_TOKEN ? { authorization: `Bearer ${process.env.DECOY_MEDIA_TOKEN}` } : {};
  const response = await fetch(url, { headers, redirect: 'error' });
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}) for ${item.path}`);
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.download`;
  await rm(temporary, { force: true });
  const hash = createHash('sha256');
  await pipeline(Readable.fromWeb(response.body), hash, createWriteStream(temporary, { flags: 'wx' }));
  const info = await stat(temporary);
  const actualHash = hash.digest('hex');
  if (info.size !== item.bytes || actualHash !== item.sha256) {
    await rm(temporary, { force: true });
    throw new Error(`Integrity check failed for ${item.path}`);
  }
  await rename(temporary, destination);
}
console.log('[media] Sync complete.');
