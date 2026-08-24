import { getNewsArticles, getSiteSettings } from '@/lib/queries'
import { absoluteUrl } from '@/lib/seo'
import { articleHref } from '@/lib/urls'

// Refresh every 15 minutes; the window itself is only the trailing 48h Google News indexes.
export const revalidate = 900

const escape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * Google News sitemap. Distinct from the general `/sitemap.xml` because it carries the `news:`
 * namespace and is deliberately scoped to recent articles — News drops anything older than ~48h,
 * so listing the full archive here would only waste crawl budget. Built by hand rather than through
 * `MetadataRoute.Sitemap`, which has no news-namespace support.
 */
export async function GET(): Promise<Response> {
  const [settings, articles] = await Promise.all([getSiteSettings(), getNewsArticles()])
  const publication = escape(settings.siteName)

  const urls = articles
    .filter((article) => article.publishedAt)
    .map(
      (article) => `  <url>
    <loc>${escape(absoluteUrl(articleHref(article)))}</loc>
    <news:news>
      <news:publication>
        <news:name>${publication}</news:name>
        <news:language>bn</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt}</news:publication_date>
      <news:title>${escape(article.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
