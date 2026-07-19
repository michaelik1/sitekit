export type TextPart = {
  text: string;
  href?: string;
};

const LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

function hrefFor(value: string): string {
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

export function linkifyText(value: string): TextPart[] {
  const parts: TextPart[] = [];
  let index = 0;

  for (const match of value.matchAll(LINK_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > index) parts.push({ text: value.slice(index, matchIndex) });

    const markdownLabel = match[1];
    const markdownUrl = match[2];
    const rawUrl = match[3];
    const url = markdownUrl ?? rawUrl;
    if (!url) continue;

    const cleanUrl = url.replace(TRAILING_PUNCTUATION, "");
    parts.push({ text: markdownLabel ?? cleanUrl, href: hrefFor(cleanUrl) });

    const trailing = url.slice(cleanUrl.length);
    if (trailing) parts.push({ text: trailing });
    index = matchIndex + match[0].length;
  }

  if (index < value.length) parts.push({ text: value.slice(index) });
  return parts.length ? parts : [{ text: value }];
}
