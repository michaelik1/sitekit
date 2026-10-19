import { createContentStore } from '../content/store.ts';

const stores = new Map<string, ReturnType<typeof createContentStore>>();
export function contentStore() {
  const config = useRuntimeConfig();
  const root = String(config.contentDir);
  const ttl = Number(config.contentCacheTtlMs);
  const key = `${root}:${ttl}`;
  if (!stores.has(key))
    stores.set(key, createContentStore(root, Number.isFinite(ttl) && ttl >= 0 ? ttl : 1000));
  return stores.get(key)!;
}
