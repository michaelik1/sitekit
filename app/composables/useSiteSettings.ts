import type { SiteSettings } from "~~/shared/content";

const fallback: SiteSettings = {
  name: "Дача Практик",
  tagline: "Практические заметки для участка",
  description: "Практические материалы о саде, огороде и дачном участке.",
  contactEmail: "editor@dacha-praktik.ru",
  hero: { eyebrow: "Дача Практик", title: "Практические заметки для участка", text: "Короткие инструкции для работы на даче." },
  season: { month: "Сезонные работы", note: "Актуальные задачи для участка.", tasks: [] },
  footerNote: "Практические материалы для дачников.",
  build: { generatedAt: "", articleCount: 0, videoCount: 0 }
};

export function useSiteSettings(): SiteSettings {
  return useState<SiteSettings>("site-settings", () => fallback).value;
}
