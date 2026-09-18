/** @type {import('next').NextConfig} */

/**
 * Security headers applied to every response (OWASP A05 — security
 * misconfiguration). The Content-Security-Policy is NOT here: it carries a
 * per-request nonce and therefore lives in `src/middleware.ts`.
 */
const securityHeaders = [
  // Do not let the browser guess a content type; blocks the classic
  // "upload a .txt that is served as a script" trick.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy twin of CSP's `frame-ancestors`, for browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },
  // Referrers leak URLs (which may carry ids) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs none of these devices; denying them shrinks the surface an
  // XSS could reach.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Cross-origin isolation defaults: block other origins from embedding or
  // reading our resources.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // HSTS only makes sense over TLS, so it is emitted in production, where a
  // reverse proxy terminates HTTPS.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // The "X-Powered-By: Next.js" header only tells an attacker which stack to
  // target. Removing it is no defense by itself, but there is no reason to
  // announce it either.
  poweredByHeader: false,

  /**
   * The image optimizer (`/_next/image`) stays off.
   *
   * Material images come from arbitrary URLs entered by the clinic, so the
   * optimizer would have to allowlist remote hosts — and it is the surface of
   * the cache-confusion advisory reported against this Next version. The UI
   * renders plain `<img>`, so nothing is lost by disabling the route.
   */
  images: { unoptimized: true },

  experimental: {
    // Importing from "lucide-react" pulls the package index; this rewrites the
    // import to each icon's own path, so only the used ones reach the bundle.
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
