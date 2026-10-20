# Sitekit

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
docker build -t sitekit:latest .
docker compose up -d
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
docker build -t sitekit:latest .
docker run -d --name my-site -p 3000:3000 --mount type=bind,source=/absolute/path/to/content,target=/app/content,readonly sitekit:latest
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

| Variable                    | Purpose                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `NUXT_CONTENT_DIR`          | Content directory for the Node server; `/app/content` in the image                                            |
| `NUXT_CONTENT_CACHE_TTL_MS` | Reload interval in milliseconds; defaults to `1000`                                                           |
| `NUXT_PUBLIC_SITE_URL`      | Optional fixed HTTP(S) origin for canonical URLs, sitemap, RSS and Open Graph; defaults to the request origin |
| `CONTENT_PATH`              | Compose bind mount source; defaults to `./content`                                                            |
| `SITE_PORT`                 | Compose host port; defaults to `3000`                                                                         |

Compose reads `.env` automatically. For `npm run content:check`, set `NUXT_CONTENT_DIR` in the process environment. The container receives its environment from Compose and does not load arbitrary `.env` files from disk.

The image already sets `NUXT_CONTENT_DIR=/app/content`, so Compose only needs to mount the directory there. Override the variable only when mounting content at a different container path.

## Domains and reverse proxies

No domain is required in the content directory. Public URLs are resolved for each request using `X-Forwarded-Host` (or `Host`) and `X-Forwarded-Proto` (or the connection protocol). The first value is used for comma-separated forwarded headers. For example, `X-Forwarded-Host: journal.example` and `X-Forwarded-Proto: https` produce `https://journal.example` in canonical links, Open Graph, sitemap, RSS and robots.txt.

Configure the reverse proxy to accept the intended domains and overwrite these forwarded headers with the public host (including its port when needed) and protocol. For direct local access, URLs use the local host and port. Sitekit serves paths at the domain root; hosting it under a URL prefix is not supported.

Changing the proxy domain does not require editing YAML or rebuilding the image. Request origins are resolved outside the shared content cache, so requests for different domains do not reuse another domain's URLs. The old `url` field in `site.yml` is accepted for compatibility but is no longer used to generate public URLs.

To pin one canonical domain regardless of the incoming host, set `NUXT_PUBLIC_SITE_URL=https://example.com` in `.env` and recreate the container with `docker compose up -d`. The override must be an HTTP(S) origin without credentials, a path, a query or a fragment; a trailing slash is allowed.

## Checks

```sh
npm run test          # Route, block, media, cache and HTTP Range contracts
npm run content:check # Schemas, references and files in the selected directory
npm run typecheck     # Vue and TypeScript checks
npm run format:check  # Source and documentation formatting
npm run build         # Build the engine without reading site content
npm run check         # Run tests, validate content, check types and build
```

To verify HTTP routes and server-rendered metadata against a running instance that serves `examples/content`, set `SITEKIT_TEST_URL` (for example, `http://localhost:3001`) and run `npm run test`. The integration test checks direct requests, proxy headers, domain changes and all generated public URLs. When the instance has a fixed origin override, also set `SITEKIT_TEST_ORIGIN` to that origin. This test is skipped when `SITEKIT_TEST_URL` is unset.

`/api/health` checks the running process. `/sitemap.xml`, `/rss.xml` and `/robots.txt` are generated from the current published content. Drafts are excluded from pages, collections, sitemap, RSS and media delivery. The API only returns published data. `/media/` only exposes assets referenced by published pages.

The engine's interface labels and starter content are in English. The `language` setting controls the document language, content sorting and date formatting, and defaults to `en`. Site topics, navigation, copy and theme colors come from the content directory; new block types are added to the engine source.
