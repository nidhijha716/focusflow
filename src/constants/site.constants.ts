/**
 * Canonical site origin, used for `metadataBase` (app/layout.tsx),
 * `sitemap.ts`, `robots.ts`, and preset-route canonical URLs.
 *
 * No production domain has been assigned yet (Milestone 6 / POM-042 is not
 * in this phase's scope), so this falls back to `http://localhost:3000` for
 * local dev/build. Set `NEXT_PUBLIC_SITE_URL` in the deployment environment
 * once a real domain exists -- every consumer below reads from here, not a
 * hardcoded string, so that's the only place a real deploy needs to change.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
