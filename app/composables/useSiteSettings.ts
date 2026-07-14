import site from "~~/generated/site.json";
import type { SiteSettings } from "~~/shared/content";

export function useSiteSettings(): SiteSettings {
  return site as SiteSettings;
}
