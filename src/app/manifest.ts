import type { MetadataRoute } from "next";

/**
 * Web App Manifest (02_Technical_Architecture). Next.js serves this
 * file's return value at /manifest.webmanifest automatically.
 *
 * Icons: generated placeholders (scripts/generate-assets.mjs) using the
 * `--focus` brand color from src/styles/tokens.css -- no design/asset
 * pipeline exists yet, but installability (POM-033) requires real,
 * non-404ing icon files rather than the earlier `/icon-192.png` TODO stub.
 * `purpose: "maskable"` gets a dedicated 512px asset with safe-zone padding
 * per https://developer.mozilla.org/docs/Web/Progressive_web_apps/Manifest/Reference/icons#purpose.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pomodoro",
    short_name: "Pomodoro",
    description: "A local-first Pomodoro timer PWA.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#e85d3f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
