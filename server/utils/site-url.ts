import { createError, getHeader, getRequestProtocol, type H3Event } from 'h3';
import { resolveSiteOrigin } from '../content/origin.ts';

export function siteUrl(event: H3Event) {
  const override = String(useRuntimeConfig(event).public.siteUrl || '');
  try {
    return resolveSiteOrigin(
      {
        host: getHeader(event, 'host'),
        forwardedHost: getHeader(event, 'x-forwarded-host'),
        forwardedProto: getHeader(event, 'x-forwarded-proto')
      },
      getRequestProtocol(event, { xForwardedProto: false }),
      override
    );
  } catch {
    throw createError({
      statusCode: override.trim() ? 500 : 400,
      statusMessage: override.trim() ? 'Invalid NUXT_PUBLIC_SITE_URL' : 'Invalid request origin'
    });
  }
}
