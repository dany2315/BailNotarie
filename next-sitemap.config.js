// next-sitemap.config.js
/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://bailnotarie.fr',
  generateRobotsTxt: true,
  generateIndexSitemap: false, // garde un seul sitemap.xml
  exclude: ['/server-sitemap-index.xml'],

  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/_next/', '/admin/'] },
    ],
    // Laisse ce bloc si tu veux déclarer d'autres sitemaps externes
    additionalSitemaps: [
      'https://bailnotarie.fr/sitemap.xml',
    ],
  },

  // On force l'ajout explicite de la home `/` + on ajoute les articles du blog
  additionalPaths: async (config) => {
    const prisma = new PrismaClient();

    try {
      // 1) Home — forcer l’inclusion de la racine
      const homepage = [{
        loc: '/',
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      }];

      // 2) Articles du blog (issus de ta BDD)
      const articles = await prisma.article.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      });

      const blogPaths = articles.map((article) => ({
        loc: `/blog/${article.slug}`,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: article.updatedAt.toISOString(),
      }));

      return [...homepage, ...blogPaths];
    } catch (error) {
      console.error('Erreur lors de la génération du sitemap:', error);

      // On renvoie à minima la home
      return [{
        loc: '/',
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      }];
    } finally {
      await prisma.$disconnect();
    }
  },

  // Personnalise priorité/fréquence pour certaines routes "connues" par le crawler
  // ⚠️ Si tu n'as PAS de page /blog (index), enlève-la des maps ci-dessous
  transform: async (config, path) => {
    const customPriorities = {
      '/': 1.0,
      '/blog': 0.8, // ❌ supprime si pas de page /blog
    };

    const customChangefreq = {
      '/': 'weekly',
      '/blog': 'weekly', // ❌ supprime si pas de page /blog
    };

    return {
      loc: path,
      changefreq: customChangefreq[path] || 'monthly',
      priority: customPriorities[path] || 0.5,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      // alternates: [], // ex: si tu gères l’i18n, tu peux définir ici
    };
  },
};
