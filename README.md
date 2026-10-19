# Directory Site Engine

A small Nuxt 4 site engine. The repository contains the application and components; site settings, pages and media are loaded at runtime from a separate directory. No database, cloud SDK, content generation step or external service is required.

## Getting started

Requires Node.js 22.18 or later:

```sh
npm ci
npm run dev
```

When `content/site.yml` is missing, local development uses the starter site in `examples/content/`. To create your own site, copy the example to `content/`:

```powershell
Copy-Item examples/content content -Recurse
```

On Linux or macOS, use `cp -R examples/content content`. The `content/` directory is ignored by Git: your site content is separate from the engine source.

## Docker

```sh
docker compose up -d --build
```

The site is available at `http://localhost:3000`. Compose mounts `./content` at `/app/content` as read-only. The directory must exist and contain `site.yml` and `index/page.yml`. The image is built without site content; use the same image with a different bind mount to serve another site.

To select a different directory and port in PowerShell:

```powershell
$env:CONTENT_PATH = 'C:/sites/my-site'
$env:SITE_PORT = '8080'
docker compose up -d
```

Without Compose:

```sh
docker build -t directory-site-engine .
docker run -d --name my-site -p 3000:3000 --mount type=bind,source=/absolute/path/to/content,target=/app/content,readonly directory-site-engine
```

The host does not need Node.js or npm to run the container. The site owner manages content, storage synchronization and backups outside the engine.

## Directory structure

```text
content/
  site.yml
  index/page.yml                    -> /
  about/page.yml                    -> /about
  articles/page.yml                 -> /articles
  articles/first-story/page.yml     -> /articles/first-story
  articles/first-story/media/cover.webp
```

A directory containing `page.yml` becomes a page automatically. Intermediate directories do not need their own pages. The root `index` directory maps to `/`; nested `index` directories are not allowed. URL segments use lowercase Latin letters, digits, hyphens and underscores. Directories named `media` do not become routes; `api` and `_nuxt` are reserved names.

A minimal page:

```yaml
schemaVersion: 1
title: About
blocks:
  - type: markdown
    text: |
      ## Hello
      This is my new page.
```

See [docs/content.md](docs/content.md) for the content format and all block types. The validation schemas are defined in [shared/content.ts](shared/content.ts).

## Updates and errors

The server reloads content on the first request after the cache expires (one second by default). Edit YAML, add a directory or replace media, then refresh the browser. No image rebuild or container restart is required. An already open browser tab does not refresh automatically.

Each update is validated as a complete snapshot. Invalid YAML, unknown blocks, broken page references or missing media do not replace the last valid snapshot; the server logs the error instead. On the first launch without valid content, the server returns HTTP 503. After the problem is fixed, the next cache refresh loads the corrected content. To validate before publishing:

```sh
npm run content:check
```

The cache stores metadata and rendered text, not copies of media. When replacing media, upload a new filename and then update the YAML reference; remove the old file after the switch. This keeps the previous snapshot usable. Prepare related changes in a separate directory rather than overwriting many live files one at a time under load.

## Environment variables

| Variable                    | Purpose                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `NUXT_CONTENT_DIR`          | Content directory for the Node server; `/app/content` in the image                               |
| `NUXT_CONTENT_CACHE_TTL_MS` | Reload interval in milliseconds; defaults to `1000`                                              |
| `NUXT_PUBLIC_SITE_URL`      | Optional override for the URL in `site.yml`, used by canonical URLs, sitemap, RSS and Open Graph |
| `CONTENT_PATH`              | Compose bind mount source; defaults to `./content`                                               |
| `SITE_PORT`                 | Compose host port; defaults to `3000`                                                            |

Compose reads `.env` automatically. For `npm run content:check`, set `NUXT_CONTENT_DIR` in the process environment. The container receives its environment from Compose and does not load arbitrary `.env` files from disk.

## Checks

```sh
npm run test          # Route, block, media, cache and HTTP Range contracts
npm run content:check # Schemas, references and files in the selected directory
npm run typecheck    # Vue and TypeScript checks
npm run format:check # Source and documentation formatting
npm run build        # Build the engine without reading site content
npm run check        # Run tests, validate content, check types and build
```

`/api/health` checks the running process. `/sitemap.xml`, `/rss.xml` and `/robots.txt` are generated from the current published content. Drafts are excluded from pages, collections, sitemap, RSS and media delivery. The API only returns published data. `/media/` only exposes assets referenced by published pages.

The engine's interface labels and starter content are in English. The `language` setting controls the document language, content sorting and date formatting, and defaults to `en`. Site topics, navigation, copy and theme colors come from the content directory; new block types are added to the engine source.
