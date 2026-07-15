import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

const root = resolve(import.meta.dirname, '..');
const videosRoot = join(root, 'content', 'videos');
const manifestPath = join(root, 'content', 'media-manifest.json');
const videoExtensions = new Set(['.mp4', '.webm']);

async function sha256(file) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

const entries = await readdir(videosRoot, { withFileTypes: true });
const files = [];
for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const directory = join(videosRoot, entry.name);
  const assets = await readdir(directory, { withFileTypes: true });
  for (const asset of assets.filter((item) => item.isFile()).sort((a, b) => a.name.localeCompare(b.name))) {
    const extension = asset.name.slice(asset.name.lastIndexOf('.')).toLowerCase();
    if (!videoExtensions.has(extension)) continue;
    const absolute = join(directory, asset.name);
    const info = await stat(absolute);
    files.push({
      path: `videos/${entry.name}/${asset.name}`,
      localPath: relative(root, absolute).replaceAll('\\', '/'),
      bytes: info.size,
      sha256: await sha256(absolute),
    });
  }
}

const manifest = {
  version: 1,
  description: 'Binary decoy media. Upload each path to private media storage, then commit this manifest without the binaries.',
  files,
};
await mkdir(dirname(manifestPath), { recursive: true });
const temporary = `${manifestPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
await rename(temporary, manifestPath);
console.log(`[media] Manifest updated: ${files.length} files.`);
