import { z } from 'zod';

const text = z.string().trim().min(1);
const date = z.iso.date();
const href = text.refine(
  (value) => /^(\/(?!\/)|#|mailto:|tel:|https?:\/\/)/.test(value),
  'Use a site path, anchor, mailto:, tel: or HTTP(S) URL'
);
const asset = text.refine(
  (value) => /^\.\/media\/[^?#\\]+$/.test(value) && !value.split('/').includes('..'),
  'Use ./media/file relative to this page'
);
const action = z.object({ label: text, href }).strict();
const heading = { title: text.optional(), eyebrow: text.optional(), description: text.optional() };
const query = z
  .object({
    path: text.default('.'),
    recursive: z.boolean().default(false),
    layout: z.enum(['default', 'article', 'video']).optional(),
    category: text.optional(),
    tag: text.optional(),
    featured: z.boolean().optional(),
    sort: z.enum(['date', 'title', 'order']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
    limit: z.number().int().min(1).max(1000).optional()
  })
  .strict();

export const blockSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('hero'),
      title: text,
      eyebrow: text.optional(),
      text: text.optional(),
      actions: z.array(action).default([]),
      panel: z
        .object({
          title: text,
          text: text.optional(),
          items: z.array(z.object({ title: text, text: text.optional() }).strict()).default([])
        })
        .strict()
        .optional()
    })
    .strict(),
  z.object({ type: z.literal('markdown'), text }).strict(),
  z
    .object({ type: z.literal('image'), src: asset, alt: z.string(), caption: text.optional() })
    .strict(),
  z
    .object({
      type: z.literal('video'),
      src: asset,
      poster: asset.optional(),
      caption: text.optional()
    })
    .strict(),
  z
    .object({
      type: z.literal('collection'),
      ...heading,
      items: z.array(text).optional(),
      source: query.optional(),
      variant: z.enum(['article', 'video']).default('article'),
      searchable: z.boolean().default(false),
      actions: z.array(action).default([])
    })
    .strict()
    .refine(
      (value) => Boolean(value.items) !== Boolean(value.source),
      'Specify either items or source'
    ),
  z
    .object({
      type: z.literal('featured'),
      ...heading,
      page: text,
      label: text.default('View page')
    })
    .strict(),
  z
    .object({
      type: z.literal('links'),
      ...heading,
      items: z.array(action.extend({ description: text.optional() })).min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal('cards'),
      ...heading,
      numbered: z.boolean().default(false),
      items: z.array(z.object({ title: text, text, href: href.optional() }).strict()).min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal('callout'),
      ...heading,
      text,
      tone: z.enum(['plain', 'accent']).default('plain'),
      actions: z.array(action).default([])
    })
    .strict(),
  z
    .object({
      type: z.literal('stats'),
      items: z.array(z.object({ value: text, label: text }).strict()).min(1)
    })
    .strict()
]);

export const pageSchema = z
  .object({
    schemaVersion: z.literal(1),
    layout: z.enum(['default', 'article', 'video']).default('default'),
    title: text,
    description: text.optional(),
    eyebrow: text.optional(),
    status: z.enum(['draft', 'published']).default('published'),
    cover: asset.optional(),
    author: text.optional(),
    category: text.optional(),
    publishedAt: date.optional(),
    updatedAt: date.optional(),
    duration: text.optional(),
    tags: z.array(text).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(0),
    toc: z.boolean().default(false),
    blocks: z.array(blockSchema).default([])
  })
  .strict()
  .refine(
    (value) => !value.updatedAt || !value.publishedAt || value.updatedAt >= value.publishedAt,
    'updatedAt cannot precede publishedAt'
  )
  .refine(
    (value) => value.blocks.every((block, index) => block.type !== 'hero' || index === 0),
    'hero is allowed only as the first block'
  );

export const siteSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: text,
    tagline: text.default(''),
    description: text.default(''),
    // Accepted for existing content directories; public URLs are resolved per request.
    url: z
      .url()
      .refine((value) => /^https?:\/\//.test(value), 'Use an HTTP(S) site URL')
      .optional(),
    language: text.default('en'),
    logo: text.max(6).default('S'),
    navigation: z.array(action).default([]),
    footer: z
      .object({ text: z.string().default(''), links: z.array(action).default([]) })
      .strict()
      .default({ text: '', links: [] }),
    theme: z
      .object({
        accent: z
          .string()
          .regex(/^#[\da-fA-F]{6}$/)
          .default('#183c2c'),
        highlight: z
          .string()
          .regex(/^#[\da-fA-F]{6}$/)
          .default('#a04f2c'),
        background: z
          .string()
          .regex(/^#[\da-fA-F]{6}$/)
          .default('#f5f0e5'),
        font: z.enum(['serif', 'sans']).default('serif'),
        width: z.number().int().min(800).max(1600).default(1180)
      })
      .strict()
      .default({
        accent: '#183c2c',
        highlight: '#a04f2c',
        background: '#f5f0e5',
        font: 'serif',
        width: 1180
      })
  })
  .strict();

export type SiteSource = z.infer<typeof siteSchema>;
export type SiteSettings = Omit<SiteSource, 'url'> & { url: string };
export type PageSource = z.infer<typeof pageSchema>;
export type Block = z.infer<typeof blockSchema>;
export type PageSummary = Omit<PageSource, 'blocks' | 'status' | 'schemaVersion'> & {
  path: string;
  readingTime?: number;
};
export type TocItem = { id: string; text: string; level: number };
export type RenderedBlock = Block & { html?: string; entries?: PageSummary[]; entry?: PageSummary };
export type ContentPage = PageSummary & {
  blocks: RenderedBlock[];
  tocItems: TocItem[];
  breadcrumbs: { label: string; href: string }[];
};
