import type { MetadataRoute } from "next";

/**
 * Web App Manifest (02_Technical_Architecture). Next.js serves this
 * file's return value at /manifest.webmanifest automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pomodoro",
    short_name: "Pomodoro",
    description: "A local-first Pomodoro timer PWA.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      // TODO: replace with real icon assets from the design/asset pipeline.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
