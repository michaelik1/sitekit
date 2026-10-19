import type { SiteSettings } from '~~/shared/content';

export function useSiteSettings() {
  return useState<SiteSettings | null>('site-settings', () => null);
}
