/**
 * Security header construction for the Next.js App Router.
 *
 * Scope: 04_Security_and_Access.pdf §5 (Content Security). This app has no
 * login, no server-rendered user content beyond locally-typed task/session
 * text, and no first-party API surface that isn't same-origin — so the
 * policy below is written for a static, same-origin, local-first app.
 *
 * Approach: STATIC CSP via `next.config.ts` `headers()` (no nonce), per the
 * "Without Nonces" pattern in the official Next.js guide:
 * https://nextjs.org/docs/app/guides/content-security-policy
 *
 * `script-src`/`style-src` include `'unsafe-inline'` because Next.js injects
 * its hydration bootstrap (`__NEXT_DATA__`) and some framework-managed inline
 * styles without a nonce when no nonce is present in the CSP header. This is
 * the same trade-off the official "Without Nonces" example makes. A stricter
 * nonce-based policy (via `proxy.ts`, Next 16's replacement for
 * `middleware.ts`) is a valid Phase-2 hardening step, but it forces dynamic
 * rendering on every page and was explicitly deferred by the implementation
 * request ("static via headers first").
 *
 * `'unsafe-eval'` is added to `script-src` only in development, because React
 * uses `eval` there to reconstruct server-side error stacks in the browser
 * (see "Good to know" note in the Next.js CSP guide). It is never added in
 * production.
 */

/** Ordered CSP directives, tuned for Next.js 16 App Router + Tailwind v4 + self-hosted next/font. */
function buildCspDirectives(isDev: boolean): string {
  const directives: string[] = [
    `default-src 'self'`,
    // 'unsafe-inline' is required for Next.js's own inline bootstrap script when not using nonces.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' is required for Next.js/React-managed inline styles and Tailwind's
    // runtime-injected style tags (e.g. dev overlay) when not using nonces.
    `style-src 'self' 'unsafe-inline'`,
    // `blob:`/`data:` are required for canvas re-encoded custom backgrounds and
    // IndexedDB-sourced object URLs rendered via <img>/CSS background-image.
    `img-src 'self' blob: data:`,
    // next/font self-hosts Google fonts at build time — no external font origin needed.
    `font-src 'self'`,
    // No first-party API and no third-party network calls in the initial scope (no auth,
    // no analytics by default per §9). Tighten further (remove 'self') if a future phase
    // introduces a dedicated API origin instead of same-origin route handlers.
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // Superseded by X-Frame-Options below for older browsers, but this is the modern,
    // better-supported directive for preventing clickjacking via iframing.
    `frame-ancestors 'none'`,
  ];

  // Only in production: avoid forcing HTTPS upgrades on local/LAN http dev servers.
  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ") + ";";
}

/** Full ordered list of security response headers applied to every route via `next.config.ts`. */
export function buildSecurityHeaders(isDev: boolean): ReadonlyArray<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [
    {
      key: "Content-Security-Policy",
      value: buildCspDirectives(isDev),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      // No camera/mic/geolocation/etc. are used anywhere in the initial scope.
      // Notifications are controlled by the separate Notification permission API
      // (permissions.ts), not Permissions-Policy, and PiP is requested via the
      // Document Picture-in-Picture / video PiP APIs — neither is blocked by this policy.
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
    },
    {
      // Belt-and-suspenders alongside `frame-ancestors 'none'` for older browsers.
      key: "X-Frame-Options",
      value: "DENY",
    },
  ];

  if (!isDev) {
    headers.push({
      key: "Strict-Transport-Security",
      // 2 years, include subdomains, eligible for HSTS preload lists.
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
