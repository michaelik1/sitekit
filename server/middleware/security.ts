export default defineEventHandler((event) => {
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-dns-prefetch-control": "off",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "cross-origin-opener-policy": "same-origin",
    "x-frame-options": "SAMEORIGIN"
  };

  if (process.env.NODE_ENV === "production") {
    headers["content-security-policy"] = "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; media-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
  }

  setResponseHeaders(event, headers);
});
