import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site.constants";

/**
 * `/offline` is a service-worker fallback shell with no unique content of
 * its own (see its `robots: { index: false }`), so it is disallowed here
 * too, belt-and-suspenders (POM-037).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/offline",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
