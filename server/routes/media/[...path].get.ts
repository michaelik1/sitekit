import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { MIME } from '../../content/store.ts';
import { parseRange } from '../../content/range.ts';

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'path') ?? '';
  const url = `/media/${raw.split('/').map(encodeURIComponent).join('/')}`;
  const { media } = await contentStore().get();
  const file = media.get(url);
  if (!file || (await realpath(file).catch(() => null)) !== file)
    throw createError({ statusCode: 404 });
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw createError({ statusCode: 404 });
  setHeaders(event, {
    'content-type': MIME[extname(file).toLowerCase()]!,
    'cache-control': 'no-cache',
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff'
  });
  if (extname(file).toLowerCase() === '.svg')
    setHeader(
      event,
      'content-security-policy',
      "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    );
  const range = getHeader(event, 'range');
  if (!range) {
    setHeader(event, 'content-length', info.size);
    return sendStream(event, createReadStream(file));
  }
  const parsed = parseRange(range, info.size);
  if (!parsed) {
    setHeader(event, 'content-range', `bytes */${info.size}`);
    throw createError({ statusCode: 416, statusMessage: 'Range Not Satisfiable' });
  }
  setResponseStatus(event, 206);
  setHeader(event, 'content-range', `bytes ${parsed.start}-${parsed.end}/${info.size}`);
  setHeader(event, 'content-length', parsed.end - parsed.start + 1);
  return sendStream(event, createReadStream(file, parsed));
});
