type OriginHeaders = { host?: string; forwardedHost?: string; forwardedProto?: string };

function first(value?: string) {
  return value?.split(',')[0]?.trim();
}

/** Resolve per request: never store a visitor's origin in the shared content snapshot. */
export function resolveSiteOrigin(headers: OriginHeaders, protocol = 'http', override = '') {
  if (override.trim()) {
    const url = new URL(override.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('Site URL override must be an HTTP(S) origin without a path or credentials');
    return url.origin;
  }

  const host = first(headers.forwardedHost) || headers.host;
  const scheme = (first(headers.forwardedProto) || protocol).toLowerCase();
  if (!host || /[\s\\/?#@]/u.test(host) || !['http', 'https'].includes(scheme)) {
    throw new Error('Invalid request origin');
  }
  const url = new URL(`${scheme}://${host}`);
  if (!url.hostname || url.username || url.password || url.pathname !== '/') {
    throw new Error('Invalid request origin');
  }
  return url.origin;
}
