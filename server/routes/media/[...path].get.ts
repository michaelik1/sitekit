import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const MIME: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp"
};

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

export default defineEventHandler(async (event) => {
  const rawPath = String(getRouterParam(event, "path") ?? "");
  const parts = rawPath.split("/").filter(Boolean);
  const section = parts[0] ?? "";
  const extension = extname(rawPath).toLowerCase();

  // Only published article/video assets are exposed; source Markdown and YAML
  // configuration files must never be addressable over HTTP.
  if (
    parts.length < 3 ||
    !["articles", "videos"].includes(section) ||
    parts.some((part) => part === "." || part === ".." || part.includes("\\")) ||
    !MIME[extension]
  ) {
    throw createError({ statusCode: 404 });
  }

  const contentRoot = resolve(process.cwd(), "content");
  const filePath = resolve(contentRoot, ...parts);
  const fileRelative = relative(contentRoot, filePath);
  if (fileRelative.startsWith("..") || fileRelative.split(sep).includes("..")) {
    throw createError({ statusCode: 403 });
  }

  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    throw createError({ statusCode: 404 });
  }

  setHeader(event, "content-type", MIME[extension]);
  setHeader(event, "cache-control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");

  if (!VIDEO_EXTENSIONS.has(extension)) {
    setHeader(event, "content-length", size);
    return sendStream(event, createReadStream(filePath));
  }

  setHeader(event, "accept-ranges", "bytes");
  const range = getHeader(event, "range");
  if (!range) {
    setHeader(event, "content-length", size);
    return sendStream(event, createReadStream(filePath));
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    setHeader(event, "content-range", `bytes */${size}`);
    throw createError({ statusCode: 416, message: "Range Not Satisfiable" });
  }

  const [, startValue, endValue] = match;
  const requestedStart = startValue ? Number.parseInt(startValue, 10) : undefined;
  const requestedEnd = endValue ? Number.parseInt(endValue, 10) : undefined;
  const start = requestedStart === undefined ? Math.max(0, size - (requestedEnd ?? 0)) : requestedStart;
  const end = requestedStart === undefined ? size - 1 : Math.min(requestedEnd ?? size - 1, size - 1);

  if (start > end || start >= size) {
    setHeader(event, "content-range", `bytes */${size}`);
    throw createError({ statusCode: 416, message: "Range Not Satisfiable" });
  }

  setHeader(event, "content-range", `bytes ${start}-${end}/${size}`);
  setHeader(event, "content-length", end - start + 1);
  setResponseStatus(event, 206);
  return sendStream(event, createReadStream(filePath, { start, end }));
});
