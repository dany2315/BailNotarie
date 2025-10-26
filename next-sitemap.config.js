const { PrismaClient } = require('@prisma/client');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://bailnotarie.fr',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ['/server-sitemap-index.xml'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/api/', '/_next/', '/admin/'],
      },
    ],
    additionalSitemaps: [
      'https://bailnotarie.fr/sitemap.xml',
    ],
  },
  additionalPaths: async (config) => {
    const prisma = new PrismaClient();
    
    try {
      // Récupérer tous les articles de blog
      const articles = await prisma.article.findMany({
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Convertir en format sitemap
      const blogPaths = articles.map((article) => ({
        loc: `/blog/${article.slug}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: article.updatedAt.toISOString(),
      }));

      return blogPaths;
    } catch (error) {
      console.error('Erreur lors de la génération du sitemap:', error);
      return [];
    } finally {
      await prisma.$disconnect();
    }
  },
  transform: async (config, path) => {
    // Personnaliser les priorités et fréquences
    const customPriorities = {
      '/': 1.0,
      '/blog': 0.8,
    };

    const customChangefreq = {
      '/': 'weekly',
      '/blog': 'weekly',
    };

    return {
      loc: path,
      changefreq: customChangefreq[path] || 'monthly',
      priority: customPriorities[path] || 0.5,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};