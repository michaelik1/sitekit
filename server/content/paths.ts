import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, posix } from 'node:path';

export function within(root: string, candidate: string) {
  const rel = relative(root, candidate);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

export function pagePath(folder: string) {
  return folder === 'index' ? '/' : `/${folder}`;
}

export function referencePath(value: string, current: string) {
  if (value.includes('\\') || /[?#]/.test(value) || value.startsWith('//') || value.includes(':'))
    throw new Error(`Invalid page reference: ${value}`);
  const segments = value.startsWith('/') ? [] : current.split('/').filter(Boolean);
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!segments.length) throw new Error(`Page reference escapes content: ${value}`);
      segments.pop();
    } else segments.push(part);
  }
  return `/${segments.join('/')}`;
}

export async function localAsset(root: string, folder: string, ref: string) {
  if (
    !ref.startsWith('./media/') ||
    ref.includes('\\') ||
    ref.split('/').includes('..') ||
    /[?#]/.test(ref)
  )
    throw new Error(`Invalid media reference: ${ref}`);
  const mediaRoot = resolve(root, folder, 'media');
  const file = resolve(root, folder, ref);
  if (!within(mediaRoot, file)) throw new Error(`Media escapes its page: ${ref}`);
  const actual = await realpath(file);
  if (
    !within(mediaRoot, actual) ||
    !within(await realpath(root), actual) ||
    !(await stat(actual)).isFile()
  )
    throw new Error(`Invalid media file: ${ref}`);
  const url = `/media/${posix.join(folder, ref.slice(2)).split('/').map(encodeURIComponent).join('/')}`;
  return { url, file: actual };
}
