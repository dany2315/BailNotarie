/* eslint-disable no-console */
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://www.bailnotarie.fr",
  generateRobotsTxt: true,
  generateIndexSitemap: false, // un seul sitemap.xml
  exclude: ["/server-sitemap-index.xml","/login","/register"],

  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/api/", "/_next/", "/interface/"] },
    ],
    additionalSitemaps: [
      "https://www.bailnotarie.fr/sitemap.xml",
    ],
  },

  // -----------------------------
  // ⚙️ Personnalisation auto des routes détectées
  // -----------------------------
  transform: async (config, path) => {
    const customPriority = {
      "/": 1.0,
      "/blog": 0.8,
    };

    const customChangefreq = {
      "/": "weekly",
      "/blog": "weekly",
    };

    return {
      loc: path,
      changefreq: customChangefreq[path] || "monthly",
      priority: customPriority[path] || 0.5,
      lastmod: new Date().toISOString(),
    };
  },

  additionalPaths: async () => {
    return [
      {
        loc: `/`,
        lastmod: new Date().toISOString(),
        changefreq: "weekly",
        priority: 1.0,
      },
      {
        loc: `/commencer`,
        lastmod: new Date().toISOString(),
        changefreq: "weekly",
        priority: 0.8,
      },
    ];  
  },
};
