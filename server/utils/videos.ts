import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { CounterSpec, RawVideo, VideoItem } from "~~/shared/videos";

function resolveMetadataPath() {
  const candidates = [
    join(process.cwd(), "public", "media", "videos", "videos.yml"),
    join(process.cwd(), ".output", "public", "media", "videos", "videos.yml"),
    join(process.cwd(), "media", "videos", "videos.yml")
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw createError({ statusCode: 500, statusMessage: "Файл videos.yml не найден." });
  }

  return found;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function resolveCounter(value: CounterSpec, id: string, salt: string, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  const randomMatch = trimmed.match(/^rand\[(\d+)\s*,\s*(\d+)\]$/i);
  if (randomMatch) {
    const min = Number(randomMatch[1]);
    const max = Number(randomMatch[2]);
    if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
      const seed = hashSeed(`${id}:${salt}:${trimmed}`);
      return min + (seed % (max - min + 1));
    }
  }

  const parsed = Number(trimmed.replace(/\s+/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

export function getVideos(): VideoItem[] {
  const raw = readFileSync(resolveMetadataPath(), "utf8");
  const parsed = yaml.load(raw) as { videos?: RawVideo[] } | RawVideo[] | null;
  const list = Array.isArray(parsed) ? parsed : parsed?.videos ?? [];

  return list.map((item, index) => {
    const id = String(item.id ?? index + 1);
    const filename = item.filename ?? `${id}.mp4`;

    return {
      id,
      title: item.title,
      description: item.description,
      category: item.category ?? "Видеоинструкция",
      author: item.author ?? "Редакция «Дача Практик»",
      date: item.date ?? "2026-05-01",
      duration: item.duration ?? "08:00",
      tags: item.tags ?? [],
      likes: resolveCounter(item.likes, id, "likes", 12),
      views: resolveCounter(item.views, id, "views", 180),
      comments: resolveCounter(item.comments, id, "comments", 3),
      poster: item.poster ?? `/media/videos/posters/${id}.svg`,
      src: `/media/videos/${filename}`,
      filename,
      quality: item.quality ?? "HD",
      status: item.status ?? "published"
    };
  });
}

export function getVideoById(id: string) {
  return getVideos().find((video) => video.id === id);
}

export function getVideoCategories() {
  return Array.from(new Set(getVideos().map((video) => video.category))).sort((a, b) => a.localeCompare(b, "ru"));
}
