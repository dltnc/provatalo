import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

type ArticleLike = {
  slug?: unknown
  articleType?: unknown
  category?: unknown
  _status?: unknown
}

const slugOf = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const { slug } = value as { slug?: unknown }
    if (typeof slug === 'string') return slug
  }
  return null
}

/**
 * Category arrives either as an id or as a populated object, depending on the depth of the
 * operation that triggered the hook — so both shapes are handled rather than assumed.
 */
const categorySlug = async (
  category: unknown,
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
): Promise<string | null> => {
  const populated = slugOf(category)
  if (populated) return populated

  if (typeof category !== 'string') return null

  try {
    const doc = await req.payload.findByID({
      collection: 'categories',
      id: category,
      depth: 0,
      req, // keeps the read inside the caller's transaction
    })
    return slugOf(doc)
  } catch {
    return null
  }
}

const pathsFor = async (
  doc: ArticleLike | undefined,
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
): Promise<string[]> => {
  if (!doc) return []

  const paths = ['/']
  const slug = slugOf(doc.slug)
  if (slug) paths.push(`/article/${slug}`)

  // Called for the previous doc too, so switching a story away from video also drops it from the
  // cached listing.
  if (doc.articleType === 'video') paths.push('/video')

  const category = await categorySlug(doc.category, req)
  if (category) paths.push(`/${category}`)

  return paths
}

/**
 * `revalidatePath` throws outside a Next request scope, which is where seed scripts and the
 * integration tests run — so failures are logged rather than allowed to fail the write that
 * triggered them. Revalidation is a cache optimisation; losing it must never lose content.
 */
const revalidate = (paths: string[], req: Parameters<CollectionAfterChangeHook>[0]['req']) => {
  for (const path of new Set(paths)) {
    try {
      revalidatePath(path)
    } catch (error) {
      req.payload.logger.warn(
        `Skipped revalidation of ${path}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}

export const revalidateArticle: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (req.context?.disableRevalidate) return doc

  // The previous doc matters when a slug changes or a category moves: without it the old URL
  // keeps serving stale content from the cache.
  const paths = [...(await pathsFor(doc, req)), ...(await pathsFor(previousDoc, req))]
  revalidate(paths, req)

  return doc
}

export const revalidateArticleDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (req.context?.disableRevalidate) return doc

  revalidate(await pathsFor(doc, req), req)

  return doc
}
