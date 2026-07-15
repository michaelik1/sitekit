import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, resolve, relative, sep, extname } from 'node:path';

const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm']);
const MIME: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm' };

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') ?? '');
  const file = String(getRouterParam(event, 'file') ?? '');
  const ext = extname(file).toLowerCase();

  // Only serve video files; reject anything else
  if (!ALLOWED_VIDEO_EXTS.has(ext)) {
    throw createError({ statusCode: 404 });
  }

  // Prevent path traversal
  if (!slug || slug.includes('..') || slug.includes('/') || !file || file.includes('..') || file.includes('/')) {
    throw createError({ statusCode: 403 });
  }

  // Video binaries live in _videofiles/ (outside public/) — placed there by prepare-content.mjs
  const videoFilesRoot = resolve(process.cwd(), '_videofiles');
  const filePath = join(videoFilesRoot, slug, file);

  const rel = relative(videoFilesRoot, filePath);
  if (rel.startsWith('..') || rel.split(sep).includes('..')) {
    throw createError({ statusCode: 403 });
  }

  let fileSize: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    fileSize = info.size;
  } catch {
    throw createError({ statusCode: 404 });
  }

  const mime = MIME[ext] ?? 'video/mp4';
  const rangeHeader = getHeader(event, 'range');

  setHeader(event, 'accept-ranges', 'bytes');
  setHeader(event, 'content-type', mime);
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');

  if (!rangeHeader) {
    // No Range header — return the full file
    setHeader(event, 'content-length', fileSize);
    setResponseStatus(event, 200);
    return sendStream(event, createReadStream(filePath));
  }

  // Parse "bytes=start-end"
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    setHeader(event, 'content-range', `bytes */${fileSize}`);
    throw createError({ statusCode: 416, message: 'Range Not Satisfiable' });
  }

  const [, rawStartValue = '', rawEndValue = ''] = match;
  const rawStart = rawStartValue !== '' ? parseInt(rawStartValue, 10) : undefined;
  const rawEnd = rawEndValue !== '' ? parseInt(rawEndValue, 10) : undefined;

  let start: number;
  let end: number;

  if (rawStart === undefined && rawEnd !== undefined) {
    // Suffix range: last N bytes
    start = Math.max(0, fileSize - rawEnd);
    end = fileSize - 1;
  } else {
    start = rawStart ?? 0;
    end = rawEnd !== undefined ? Math.min(rawEnd, fileSize - 1) : fileSize - 1;
  }

  if (start > end || start >= fileSize) {
    setHeader(event, 'content-range', `bytes */${fileSize}`);
    throw createError({ statusCode: 416, message: 'Range Not Satisfiable' });
  }

  const chunkSize = end - start + 1;
  setHeader(event, 'content-range', `bytes ${start}-${end}/${fileSize}`);
  setHeader(event, 'content-length', chunkSize);
  setResponseStatus(event, 206);

  return sendStream(event, createReadStream(filePath, { start, end }));
});
