import articleData from "~~/generated/articles.json";
import videoData from "~~/generated/videos.json";
import type { ArticleDetail, ArticleSummary, VideoItem } from "~~/shared/content";

const articles = articleData.articles as ArticleDetail[];
const videos = videoData.videos as VideoItem[];

export function getArticles(): ArticleDetail[] {
  return articles;
}

export function getArticleSummaries(): ArticleSummary[] {
  return articles.map(({ bodyHtml: _bodyHtml, toc: _toc, ...article }) => article);
}

export function getArticleBySlug(slug: string): ArticleDetail | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getArticleCategories(): string[] {
  return articleData.categories;
}

export function getVideos(): VideoItem[] {
  return videos;
}

export function getVideoById(id: string): VideoItem | undefined {
  return videos.find((video) => video.id === id);
}

export function getVideoCategories(): string[] {
  return videoData.categories;
}
