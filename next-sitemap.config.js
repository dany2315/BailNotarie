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
  transform: async (config, path) => {
    // Personnaliser les priorités et fréquences
    const customPriorities = {
      '/': 1.0,
      //'/blog': 0.8,
      //'/blog/[id]': 0.7,
    };

    const customChangefreq = {
      '/': 'weekly',
      //'/blog': 'weekly',
      //'/blog/[id]': 'monthly',
    };

    return {
      loc: path,
      changefreq: customChangefreq[path] || 'monthly',
      priority: customPriorities[path] || 0.5,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};