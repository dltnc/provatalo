import type { MetadataRoute } from 'next'

import {
  getAllAuthors,
  getAllLiveArticles,
  getAllTags,
  getNavCategories,
} from '@/lib/queries'
import { absoluteUrl } from '@/lib/seo'
import { articleHref, authorHref, categoryHref, subcategoryHref, tagHref, VIDEO_HREF } from '@/lib/urls'

/**
 * XML sitemap for the whole public site. Next serves this at `/sitemap.xml`; the route group
 * `(frontend)` doesn't affect the URL. Categories come from the nav tree so subcategories get their
 * canonical nested path, and everything is absolutised through `absoluteUrl` so a single `SITE_URL`
 * drives every entry.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, tags, authors, articles] = await Promise.all([
    getNavCategories(),
    getAllTags(),
    getAllAuthors(),
    getAllLiveArticles(),
  ])

  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl(VIDEO_HREF), lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ]

  const categoryEntries: MetadataRoute.Sitemap = categories.flatMap((cat) => [
    {
      url: absoluteUrl(categoryHref(cat)),
      lastModified: new Date(cat.updatedAt),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    },
    ...cat.children.map((child) => ({
      url: absoluteUrl(subcategoryHref(cat.slug, child)),
      lastModified: new Date(child.updatedAt),
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    })),
  ])

  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: absoluteUrl(tagHref(tag)),
    lastModified: new Date(tag.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.4,
  }))

  const authorEntries: MetadataRoute.Sitemap = authors.map((author) => ({
    url: absoluteUrl(authorHref(author)),
    lastModified: new Date(author.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.4,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(articleHref(article)),
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    ...staticEntries,
    ...categoryEntries,
    ...tagEntries,
    ...authorEntries,
    ...articleEntries,
  ]
}
