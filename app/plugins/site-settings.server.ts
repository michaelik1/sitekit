import { getSiteSettings } from "~~/server/utils/content";
import type { SiteSettings } from "~~/shared/content";

export default defineNuxtPlugin(() => {
  useState<SiteSettings>("site-settings", getSiteSettings);
});
