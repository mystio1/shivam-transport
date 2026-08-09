import helmet from 'helmet';

// Same headers as backend/server.mjs's hand-rolled res.setHeader calls, now via helmet — CSP
// explicitly configured because helmet's default CSP is stricter than this and would break the
// app's `connect-src *` requirement (the frontend can be pointed at any backend URL: LAN IP,
// Cloudflare Tunnel domain, or a custom address entered on the login screen).
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ['*'],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  // HSTS is ignored by browsers on plain-HTTP connections (LAN/localhost access), so it only
  // takes effect when actually served over HTTPS (Cloudflare Tunnel, or Render) — safe to send
  // unconditionally, exactly as the original hand-rolled header did.
  hsts: { maxAge: 31536000, includeSubDomains: true },
  // Disabling COEP/CORP — this app serves cross-origin data URLs (logos/signatures) and has no
  // need for cross-origin isolation; the original hand-rolled headers never set these either.
  crossOriginEmbedderPolicy: false,
  // Helmet's default is SAMEORIGIN; the original hand-rolled header was DENY — match it exactly.
  frameguard: { action: 'deny' },
});
