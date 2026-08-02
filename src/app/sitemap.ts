import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site.constants";
import { TIMER_PRESETS } from "@/constants/presets.constants";

/**
 * Lists every public, indexable route (POM-037). The main app (`/`) and the
 * dedicated `/stopwatch` route are the two functional entry points; the
 * four `/presets/*` routes are the SEO landing pages (POM-036). `/offline`
 * is deliberately excluded (see its own `robots: { index: false }`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/stopwatch`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...TIMER_PRESETS.map((preset) => ({
      url: `${SITE_URL}/presets/${preset.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
