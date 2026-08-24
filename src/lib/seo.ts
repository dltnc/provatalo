import type { Article, SiteSetting } from '@/payload-types'

import { asMedia, imageUrl } from '@/lib/media'
import { articleHref } from '@/lib/urls'

/**
 * One source of truth for the site's public origin. Set `SITE_URL` in production; the localhost
 * fallback keeps dev and CI working. Everything canonical (metadata, sitemaps, JSON-LD) resolves
 * URLs through `absoluteUrl` so a path is only ever joined to the origin in one place.
 */
export const SITE_URL = (
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3000'
).replace(/\/$/, '')

export const absoluteUrl = (path: string): string =>
  path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`

/** Organization node for the site's identity, emitted once in the root layout. */
export const organizationJsonLd = (settings: SiteSetting): Record<string, unknown> => {
  const logo = imageUrl(asMedia(settings.logo), 'card')
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: settings.siteName,
    url: SITE_URL,
    ...(logo ? { logo: absoluteUrl(logo) } : {}),
    ...(settings.socialLinks?.length
      ? { sameAs: settings.socialLinks.map((s) => s.url).filter(Boolean) }
      : {}),
  }
}

/** NewsArticle node for an article page. */
export const newsArticleJsonLd = (
  article: Article,
  settings: SiteSetting,
): Record<string, unknown> => {
  const image = imageUrl(
    asMedia(article.seo?.ogImage) ?? asMedia(article.featuredImage),
    'og',
  )
  const author = typeof article.author === 'object' ? article.author : null

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    ...(article.subtitle ? { description: article.subtitle } : {}),
    ...(image ? { image: [absoluteUrl(image)] } : {}),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    dateModified: article.updatedAt,
    ...(author ? { author: { '@type': 'Person', name: author.name } } : {}),
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: settings.siteName,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(articleHref(article)) },
  }
}

/** BreadcrumbList node from an ordered list of {name, path}. */
export const breadcrumbJsonLd = (
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})
