import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { loadDotEnv, r2Client, r2Config } from './r2.mjs';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(join(root, 'content', 'media-manifest.json'), 'utf8'));
if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('Unsupported media manifest.');
await loadDotEnv();
const config = r2Config();
if (!config) throw new Error('Set DECOY_R2_ENDPOINT, DECOY_R2_BUCKET, DECOY_R2_ACCESS_KEY_ID and DECOY_R2_SECRET_ACCESS_KEY in decoy/.env.');
const client = r2Client(config);
const dryRun = process.argv.includes('--dry-run');

for (const item of manifest.files) {
  const source = resolve(root, item.localPath);
  const info = await stat(source).catch(() => null);
  if (!info?.isFile() || info.size !== item.bytes) throw new Error(`Local file is missing or has a different size: ${item.localPath}`);
  console.log(`[media] ${dryRun ? 'Would upload' : 'Uploading'}: ${item.path}`);
  if (dryRun) continue;
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: item.path,
    Body: createReadStream(source),
    ContentType: item.path.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    Metadata: { sha256: item.sha256 },
  }));
}
console.log(`[media] ${dryRun ? 'Dry run complete.' : 'Upload complete.'}`);
