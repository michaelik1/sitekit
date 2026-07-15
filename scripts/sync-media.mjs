import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { loadDotEnv, r2Client, r2Config } from './r2.mjs';

const root = resolve(import.meta.dirname, '..');
const manifestPath = join(root, 'content', 'media-manifest.json');

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
const r2 = r2Config();
const baseUrl = process.env.DECOY_MEDIA_BASE_URL?.replace(/\/+$/, '');
if (!r2 && !baseUrl) throw new Error('Set DECOY_R2_* or DECOY_MEDIA_BASE_URL in decoy/.env before syncing media.');
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
  console.log(`[media] Downloading: ${item.localPath}`);
  let body;
  if (r2) {
    const result = await r2Client(r2).send(new GetObjectCommand({ Bucket: r2.bucket, Key: item.path }));
    body = result.Body;
    if (!body) throw new Error(`Empty response for ${item.path}`);
  } else {
    const url = `${baseUrl}/${item.path.split('/').map(encodeURIComponent).join('/')}`;
    const headers = process.env.DECOY_MEDIA_TOKEN ? { authorization: `Bearer ${process.env.DECOY_MEDIA_TOKEN}` } : {};
    const response = await fetch(url, { headers, redirect: 'error' });
    if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}) for ${item.path}`);
    body = response.body;
  }
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.download`;
  await rm(temporary, { force: true });
  const hash = createHash('sha256');
  const stream = typeof body.transformToWebStream === 'function' ? Readable.fromWeb(body.transformToWebStream()) : body;
  const verifier = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(stream, verifier, createWriteStream(temporary, { flags: 'wx' }));
  const info = await stat(temporary);
  const actualHash = hash.digest('hex');
  if (info.size !== item.bytes || actualHash !== item.sha256) {
    await rm(temporary, { force: true });
    throw new Error(`Integrity check failed for ${item.path}`);
  }
  await rename(temporary, destination);
}
console.log('[media] Sync complete.');
