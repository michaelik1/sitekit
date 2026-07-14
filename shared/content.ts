export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export type ArticleSummary = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  author: string;
  tags: string[];
  featured: boolean;
  cover: string;
  wordCount: number;
};

export type ArticleDetail = ArticleSummary & {
  bodyHtml: string;
  toc: TocItem[];
};

export type ArticleCollection = {
  articles: ArticleSummary[];
  categories: string[];
};

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  publishedAt: string;
  duration: string;
  quality: string;
  tags: string[];
  featured: boolean;
  placeholder: boolean;
  note: string;
  poster: string;
  src: string;
};

export type VideoCollection = {
  videos: VideoItem[];
  categories: string[];
};

export type SiteTask = { title: string; text: string };

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  contactEmail: string;
  hero: { eyebrow: string; title: string; text: string };
  season: { month: string; note: string; tasks: SiteTask[] };
  footerNote: string;
  build: { generatedAt: string; articleCount: number; videoCount: number };
};
