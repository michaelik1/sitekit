import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { ArticleDetail, ArticleSummary, SiteSettings, VideoItem } from "~~/shared/content";

type ArticleData = { articles: ArticleDetail[]; categories: string[] };
type VideoData = { videos: VideoItem[]; categories: string[] };

const cache = new Map<string, { modifiedAt: number; value: unknown }>();

function readGenerated<T>(file: string): T {
  const path = resolve(process.cwd(), "generated", file);
  const modifiedAt = statSync(path).mtimeMs;
  const cached = cache.get(path);

  if (cached?.modifiedAt === modifiedAt) return cached.value as T;

  const value = JSON.parse(readFileSync(path, "utf8")) as T;
  cache.set(path, { modifiedAt, value });
  return value;
}

function getArticleData(): ArticleData {
  return readGenerated<ArticleData>("articles.json");
}

function getVideoData(): VideoData {
  return readGenerated<VideoData>("videos.json");
}

export function getArticles(): ArticleDetail[] {
  return getArticleData().articles;
}

export function getArticleSummaries(): ArticleSummary[] {
  return getArticles().map(({ bodyHtml: _bodyHtml, toc: _toc, ...article }) => article);
}

export function getArticleBySlug(slug: string): ArticleDetail | undefined {
  return getArticles().find((article) => article.slug === slug);
}

export function getArticleCategories(): string[] {
  return getArticleData().categories;
}

export function getVideos(): VideoItem[] {
  return getVideoData().videos;
}

export function getVideoById(id: string): VideoItem | undefined {
  return getVideos().find((video) => video.id === id);
}

export function getVideoCategories(): string[] {
  return getVideoData().categories;
}

export function getSiteSettings(): SiteSettings {
  return readGenerated<SiteSettings>("site.json");
}
