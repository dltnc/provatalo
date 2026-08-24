import type { MetadataRoute } from 'next'

import { absoluteUrl, SITE_URL } from '@/lib/seo'

/**
 * robots.txt. Search result pages carry `noindex` of their own; here we also keep crawlers out of
 * the admin and the API. Both sitemaps are advertised so news and the general index are discovered.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/search'],
    },
    sitemap: [absoluteUrl('/sitemap.xml'), absoluteUrl('/news-sitemap.xml')],
    host: SITE_URL,
  }
}
