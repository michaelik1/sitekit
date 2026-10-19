# Content format, version 1

Use YAML 1.2 in UTF-8. Unknown fields are rejected so that typos cannot silently disappear. Schemas, defaults and TypeScript types are defined in `shared/content.ts`.

## Site settings

```yaml
schemaVersion: 1
name: My Journal
tagline: Notes on projects
description: Stories and guides.
url: https://example.com
language: en
logo: MJ
navigation:
  - label: Articles
    href: /articles
footer:
  text: A note in the footer.
  links:
    - label: About
      href: /about
theme:
  accent: '#183c2c'
  highlight: '#a04f2c'
  background: '#f5f0e5'
  font: serif # serif | sans
  width: 1180 # 800–1600 px
```

Only `schemaVersion`, `name` and `url` are required. `logo` is text with a maximum of six characters. Navigation and footer links are checked against published pages. HTTP(S), `mailto:`, `tel:` and links to the built-in RSS, sitemap and robots routes are also supported. The theme sets supported CSS variables; it does not execute arbitrary CSS or JavaScript.

`language` defaults to `en`. Use a BCP 47 language tag, such as `en`, `en-GB` or `de`. It controls the HTML document language, content sorting and date formatting. Built-in interface labels are English regardless of the content language.

## Pages

```yaml
schemaVersion: 1
layout: article # default | article | video; defaults to default
title: Page title
description: A description for the page, cards and SEO.
eyebrow: A short heading label
status: published # published | draft
cover: ./media/cover.webp
author: Author name
category: Projects
publishedAt: '2026-01-01'
updatedAt: '2026-01-02'
tags: [experience, guide]
featured: false
order: 10
toc: true
duration: '02:15' # Optional display label; MP4 metadata is not analyzed
blocks: []
```

Only `schemaVersion` and `title` are required. A text page can omit the cover, category, author and dates. Dates must be valid calendar dates in `YYYY-MM-DD` format. Publication is controlled explicitly through `status`; future dates are not a publication scheduler. Draft schemas are validated, but their unfinished links and media are not loaded. A published page cannot reference a draft.

`layout` controls heading presentation and text width, not a fixed content structure. The optional table of contents collects Markdown and callout headings across the page, with unique IDs across blocks. The page title or first `hero` owns h1; Markdown headings start at h2. Breadcrumbs use existing parent pages.

## Media and links

Assets live in the `media/` directory of the page using them. References use `./media/file.webp`; the exact filename and extension are required. Nested directories within `media` are supported. Image formats: SVG, WebP, AVIF, PNG, JPEG and GIF. Video formats: MP4 and WebM. Images embedded from external URLs are not supported.

Markdown links and buttons support site paths such as `/about` or `/articles/item#section`, HTTP(S), `mailto:` and `tel:` URLs. Markdown also supports relative page links such as `../other-page`, resolved against the current page URL. Page references are checked; anchors are not. Link to page URLs, not YAML files: use `/articles/item`, not `/articles/item/page.yml`.

Raw HTML in Markdown is escaped, and the rendered output is sanitized. YAML and Markdown cannot execute code. Symbolic links in the page directory tree are not supported; media cannot escape its own page directory.

## Blocks

Blocks render in array order. Use explicit fields and page references rather than inheritance, template expressions or arbitrary bindings.

### hero

Allowed only as the first block. Replaces the standard page heading. The side panel is optional.

```yaml
- type: hero
  eyebrow: First issue
  title: Hero heading
  text: An introduction.
  actions:
    - label: Read
      href: /articles
  panel:
    title: At a glance
    text: Additional context.
    items:
      - title: First item
        text: A short explanation.
```

### markdown

Headings, paragraphs, lists, quotes, images, links, tables and code.

```yaml
- type: markdown
  text: |
    ## Section
    **An important point.**

    ![Image description](./media/photo.webp)
```

### image / video

```yaml
- type: image
  src: ./media/photo.webp
  alt: Image description
  caption: An optional caption.
- type: video
  src: ./media/demo.mp4
  poster: ./media/poster.webp
  caption: An optional caption.
```

Videos use the browser's built-in player and HTTP Range requests. Autoplay is not enabled. The poster is optional.

### collection

Specify exactly one source: explicit `items` or an automatic `source` query. `title`, `eyebrow`, `description` and `actions` are optional.

```yaml
- type: collection
  title: Latest stories
  variant: article # article | video — card presentation
  searchable: true # Client-side search and category filter
  source:
    path: /articles # Use . for children of the current page directory
    recursive: false # Include all nested levels when true
    layout: article # Optional filter
    category: Projects # Optional filter
    tag: guide # Optional filter
    featured: true # Optional filter
    sort: date # date | title | order
    order: desc # asc | desc
    limit: 6 # Optional; 1–1000
  actions:
    - label: All articles
      href: /articles
```

For a manual selection, replace `source` with:

```yaml
items:
  - /articles/first-story
  - /projects/another-page
```

Manual selections preserve their declared order. Automatic collections exclude the page containing the block. `source.path` can point to a directory without its own page. Search runs in the browser over the selected items, after source filters and `limit`; it is not a global full-text search. The URL parameter `?category=...` sets the initial category filter.

### featured

```yaml
- type: featured
  eyebrow: Editor's pick
  title: Featured story
  page: /articles/first-story
  label: Read the story
```

The title, description, author and cover come from the referenced page. A page without a cover uses a text-only presentation.

### links

```yaml
- type: links
  title: Explore
  items:
    - label: Articles
      href: /articles
      description: An optional description.
```

### cards

```yaml
- type: cards
  title: How it works
  numbered: true
  items:
    - title: Prepare
      text: Describe the step.
      href: /guide # Optional
```

### callout

```yaml
- type: callout
  title: Keep in mind
  text: |
    The text supports **Markdown** and lists.
  tone: accent # plain | accent
  actions:
    - label: Learn more
      href: /guide
```

### stats

```yaml
- type: stats
  items:
    - value: '12'
      label: published stories
```

Values are explicit; YAML does not evaluate expressions.

## Extending the engine

To add a block, extend `shared/content.ts`, handle its data in `server/content/store.ts`, render it in `app/components/ContentBlock.vue`, document it and add a contract test. File providers, R2 and other storage integrations belong outside the engine.
