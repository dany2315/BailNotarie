import type { MetadataRoute } from "next";

const SITE_URL = "https://www.bailnotarie.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/interface/",
        "/client/",
        "/notaire/",
        "/intakes/",
        "/login",
        "/register",
        "/blog/page/",
        "/lptest",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
