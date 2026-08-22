import type { Payload, TypedLocale } from 'payload'
import { getPayload } from 'payload'

import type { Article } from '@/payload-types'
import config from '@/payload.config'

/**
 * Read helpers for the public site.
 *
 * Two things are deliberately centralised here:
 *
 * 1. **`locale` is always explicit.** The Local API falls back to `defaultLocale`, which is
 *    correct today because Bangla is the only locale — and becomes a silent wrong-content bug the
 *    day English is added. Passing it from the start means adding a locale is a routing change,
 *    not an audit of every query.
 * 2. **`overrideAccess: false`.** With no user, `canReadArticle` narrows the query to
 *    `_status: 'published'`, so a public page cannot serve a draft even if a caller forgets the
 *    filter. Access control, not a `where` clause, is what keeps unpublished work private.
 */

export const DEFAULT_LOCALE: TypedLocale = 'bn'

const client = async (): Promise<Payload> => getPayload({ config: await config })

export const findArticleBySlug = async (
  slug: string,
  locale: TypedLocale = DEFAULT_LOCALE,
): Promise<Article | null> => {
  const payload = await client()

  const { docs } = await payload.find({
    collection: 'articles',
    depth: 2,
    limit: 1,
    locale,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })

  return docs[0] ?? null
}

export const findVideoArticles = async ({
  limit = 24,
  locale = DEFAULT_LOCALE,
}: { limit?: number; locale?: TypedLocale } = {}): Promise<Article[]> => {
  const payload = await client()

  const { docs } = await payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    locale,
    overrideAccess: false,
    sort: '-publishedAt',
    where: { articleType: { equals: 'video' } },
  })

  return docs
}
