import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { TocItem } from '../../shared/content.ts';

export async function renderMarkdown(
  source: string,
  assets: (ref: string) => Promise<string>,
  links: (ref: string) => string,
  headings: Map<string, number>
) {
  const toc: TocItem[] = [];
  const parser = new Marked({
    gfm: true,
    async: true,
    async walkTokens(token) {
      if (token.type === 'image') token.href = await assets(token.href);
      if (token.type === 'link') token.href = links(token.href);
    },
    renderer: {
      html({ text }) {
        return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      },
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const plain = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
        const base =
          plain
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/g, '') || 'section';
        const count = (headings.get(base) ?? 0) + 1;
        headings.set(base, count);
        const id = count === 1 ? base : `${base}-${count}`;
        const level = Math.max(2, depth);
        toc.push({ id, text: plain, level });
        return `<h${level} id="${id}">${html}</h${level}>`;
      }
    }
  });
  const html = sanitizeHtml(await parser.parse(source), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'loading', 'decoding'],
      code: ['class'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      h5: ['id'],
      h6: ['id']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: 'lazy', decoding: 'async' }
      })
    }
  });
  return { html, toc };
}
