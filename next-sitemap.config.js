/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

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
  // 🔥 Génération dynamique des URLs
  // -----------------------------
  additionalPaths: async (config) => {
    const prisma = new PrismaClient();

    try {
      // 1) Home
      const homepage = [
        {
          loc: "/",
          changefreq: "weekly",
          priority: 1.0,
          lastmod: new Date().toISOString(),
        },
      ];

      // 2) Récupérer articles du blog
      const articles = await prisma.article.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });

      console.log("[sitemap] Articles trouvés :", articles.length);

      const blogPaths = articles.map((article) => ({
        loc: `/blog/${article.slug}`,
        changefreq: "weekly",
        priority: 0.9,
        lastmod: article.updatedAt.toISOString(),
      }));

      return [...homepage, ...blogPaths];
    } catch (err) {
      console.error("Erreur lors de la génération du sitemap:", err);

      // ⚠️ En cas d’erreur, renvoyer au moins la homepage
      return [
        {
          loc: "/",
          changefreq: "weekly",
          priority: 1.0,
          lastmod: new Date().toISOString(),
        },
      ];
    } finally {
      await prisma.$disconnect();
    }
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
};
