import type { PaginatedDocs, Where } from 'payload'
import type { TypedLocale } from 'payload'

import { getPayload } from 'payload'

import type { Article, Category, SiteSetting, Tag, User } from '@/payload-types'

import config from '@/payload.config'

/**
 * Read layer for the public site. Every page composes its data from the helpers here rather than
 * calling the Local API directly, for the two reasons `content.ts` documents: `locale` is always
 * passed explicitly (Bangla today, a routing change away from English), and reads run with
 * `overrideAccess: false` so access control — not a hand-written `where` — is what keeps drafts
 * and unapproved work off the live site.
 *
 * `reviewState: 'approved'` is layered on top of the published check: an article can be published
 * by Payload yet pulled back to editing in the editorial workflow, and the public site follows the
 * editorial state.
 */

export const DEFAULT_LOCALE: TypedLocale = 'bn'

const client = async () => getPayload({ config: await config })

/** The published-and-approved filter every public article query starts from. */
const LIVE: Where = {
  reviewState: { equals: 'approved' },
}

export type ArticlePage = PaginatedDocs<Article>

const emptyPage = (limit: number): ArticlePage => ({
  docs: [],
  hasNextPage: false,
  hasPrevPage: false,
  limit,
  page: 1,
  pagingCounter: 0,
  totalDocs: 0,
  totalPages: 0,
  nextPage: null,
  prevPage: null,
})

/* -------------------------------------------------------------------------- */
/* Site settings + navigation                                                  */
/* -------------------------------------------------------------------------- */

export const getSiteSettings = async (
  locale: TypedLocale = DEFAULT_LOCALE,
): Promise<SiteSetting> => {
  const payload = await client()
  return payload.findGlobal({ slug: 'site-settings', depth: 1, locale, overrideAccess: false })
}

/** A root category with its immediate children attached, ready for the header nav. */
export type NavCategory = Category & { children: Category[] }

/**
 * The full category set, arranged as roots → children for the header and footer. One query, sorted
 * by `displayOrder`, then grouped in memory — categories are few and cached with the page, so a
 * per-request tree build is cheaper than N relationship lookups.
 */
export const getNavCategories = async (
  locale: TypedLocale = DEFAULT_LOCALE,
): Promise<NavCategory[]> => {
  const payload = await client()

  const { docs } = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 200,
    locale,
    overrideAccess: false,
    sort: 'displayOrder',
  })

  const parentId = (c: Category): string | null =>
    typeof c.parentCategory === 'object' && c.parentCategory
      ? c.parentCategory.id
      : (c.parentCategory ?? null)

  const roots = docs.filter((c) => !parentId(c))

  return roots.map((root) => ({
    ...root,
    children: docs.filter((c) => parentId(c) === root.id),
  }))
}

/* -------------------------------------------------------------------------- */
/* Single-document lookups by slug                                             */
/* -------------------------------------------------------------------------- */

const findOneBySlug = async <T>(
  collection: 'categories' | 'tags' | 'users',
  slug: string,
  locale: TypedLocale,
): Promise<T | null> => {
  const payload = await client()
  const { docs } = await payload.find({
    collection,
    depth: 1,
    limit: 1,
    locale,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  return (docs[0] as T) ?? null
}

export const getCategoryBySlug = (slug: string, locale: TypedLocale = DEFAULT_LOCALE) =>
  findOneBySlug<Category>('categories', slug, locale)

export const getTagBySlug = (slug: string, locale: TypedLocale = DEFAULT_LOCALE) =>
  findOneBySlug<Tag>('tags', slug, locale)

export const getAuthorBySlug = (slug: string, locale: TypedLocale = DEFAULT_LOCALE) =>
  findOneBySlug<User>('users', slug, locale)

/* -------------------------------------------------------------------------- */
/* Article listings (paginated)                                                */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 12

/** A category id plus the ids of every category whose parent is it (one level, which is all we nest). */
const categoryWithChildrenIds = async (
  category: Category,
  locale: TypedLocale,
): Promise<string[]> => {
  const payload = await client()
  const { docs } = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 200,
    locale,
    overrideAccess: false,
    where: { parentCategory: { equals: category.id } },
  })
  return [category.id, ...docs.map((c) => c.id)]
}

/**
 * Articles in a category. A root category also surfaces the stories filed under its subcategories,
 * so the section front is never emptier than the pages beneath it; a subcategory shows only its own.
 */
export const getArticlesByCategory = async ({
  category,
  includeChildren = true,
  limit = PAGE_SIZE,
  locale = DEFAULT_LOCALE,
  page = 1,
}: {
  category: Category
  includeChildren?: boolean
  limit?: number
  locale?: TypedLocale
  page?: number
}): Promise<ArticlePage> => {
  const payload = await client()
  const ids = includeChildren ? await categoryWithChildrenIds(category, locale) : [category.id]

  return payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    locale,
    overrideAccess: false,
    page,
    sort: '-publishedAt',
    where: { ...LIVE, category: { in: ids } },
  })
}

export const getArticlesByTag = async ({
  limit = PAGE_SIZE,
  locale = DEFAULT_LOCALE,
  page = 1,
  tag,
}: {
  limit?: number
  locale?: TypedLocale
  page?: number
  tag: Tag
}): Promise<ArticlePage> => {
  const payload = await client()
  return payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    locale,
    overrideAccess: false,
    page,
    sort: '-publishedAt',
    where: { ...LIVE, tags: { in: [tag.id] } },
  })
}

export const getArticlesByAuthor = async ({
  author,
  limit = PAGE_SIZE,
  locale = DEFAULT_LOCALE,
  page = 1,
}: {
  author: User
  limit?: number
  locale?: TypedLocale
  page?: number
}): Promise<ArticlePage> => {
  const payload = await client()
  return payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    locale,
    overrideAccess: false,
    page,
    sort: '-publishedAt',
    where: { ...LIVE, or: [{ author: { equals: author.id } }, { coAuthors: { in: [author.id] } }] },
  })
}

/**
 * Full-text-ish search across headline, deck and location. MongoDB `like` is a case-insensitive
 * substring match — enough for a Bangla news site's needs and, unlike a `$text` index, it needs no
 * schema change to ship. An empty query returns an empty page rather than the whole collection.
 */
export const searchArticles = async ({
  limit = PAGE_SIZE,
  locale = DEFAULT_LOCALE,
  page = 1,
  query,
}: {
  limit?: number
  locale?: TypedLocale
  page?: number
  query: string
}): Promise<ArticlePage> => {
  const q = query.trim()
  if (!q) return emptyPage(limit)

  const payload = await client()
  return payload.find({
    collection: 'articles',
    depth: 1,
    limit,
    locale,
    overrideAccess: false,
    page,
    sort: '-publishedAt',
    where: {
      ...LIVE,
      or: [
        { title: { like: q } },
        { subtitle: { like: q } },
        { location: { like: q } },
      ],
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Homepage collectors (flat lists, no pagination)                             */
/* -------------------------------------------------------------------------- */

const listArticles = async (
  where: Where,
  { depth = 1, limit = 6, locale = DEFAULT_LOCALE, sort = '-publishedAt' }: {
    depth?: number
    limit?: number
    locale?: TypedLocale
    sort?: string
  } = {},
): Promise<Article[]> => {
  const payload = await client()
  const { docs } = await payload.find({
    collection: 'articles',
    depth,
    limit,
    locale,
    overrideAccess: false,
    sort,
    where: { ...LIVE, ...where },
  })
  return docs
}

export const getFeaturedArticles = (limit = 5, locale: TypedLocale = DEFAULT_LOCALE) =>
  listArticles({ isFeatured: { equals: true } }, { limit, locale })

export const getBreakingArticles = (limit = 8, locale: TypedLocale = DEFAULT_LOCALE) =>
  listArticles({ isBreaking: { equals: true } }, { limit, locale })

export const getLatestArticles = (limit = 10, locale: TypedLocale = DEFAULT_LOCALE) =>
  listArticles({}, { limit, locale })

/** Most-viewed, all-time. viewCount is maintained by an atomic update outside Payload. */
export const getTrendingArticles = (limit = 6, locale: TypedLocale = DEFAULT_LOCALE) =>
  listArticles({}, { limit, locale, sort: '-viewCount' })

/**
 * Related stories for an article page. A manual `relatedArticles` selection wins outright — it is
 * an editor's deliberate override. Otherwise we derive them from shared tags, newest first, and
 * always exclude the article itself.
 */
export const getRelatedArticles = async (
  article: Article,
  limit = 4,
  locale: TypedLocale = DEFAULT_LOCALE,
): Promise<Article[]> => {
  const manual = (article.relatedArticles ?? []).filter(
    (a): a is Article => typeof a === 'object' && a !== null,
  )
  if (manual.length) return manual.slice(0, limit)

  const tagIds = (article.tags ?? [])
    .map((t) => (typeof t === 'object' && t ? t.id : t))
    .filter((id): id is string => typeof id === 'string')
  if (!tagIds.length) return []

  const docs = await listArticles(
    { tags: { in: tagIds }, id: { not_equals: article.id } },
    { limit, locale },
  )
  return docs
}

/* -------------------------------------------------------------------------- */
/* Sitemap + robots collectors                                                 */
/* -------------------------------------------------------------------------- */

/** Every live article, lightweight, for the sitemaps. `depth: 0` keeps relations as ids. */
export const getAllLiveArticles = async (
  locale: TypedLocale = DEFAULT_LOCALE,
): Promise<Article[]> => {
  const payload = await client()
  const { docs } = await payload.find({
    collection: 'articles',
    depth: 1,
    limit: 5000,
    locale,
    overrideAccess: false,
    sort: '-publishedAt',
    where: LIVE,
  })
  return docs
}

/** Articles from the trailing window Google News indexes (48h), for news-sitemap.xml. */
export const getNewsArticles = async (
  locale: TypedLocale = DEFAULT_LOCALE,
): Promise<Article[]> => {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  return listArticles({ publishedAt: { greater_than: since } }, { limit: 1000, locale })
}

const allOf = async (
  collection: 'categories' | 'tags' | 'users',
  locale: TypedLocale,
): Promise<Array<{ slug?: string | null; updatedAt: string }>> => {
  const payload = await client()
  const { docs } = await payload.find({
    collection,
    depth: 0,
    limit: 1000,
    locale,
    overrideAccess: false,
  })
  return docs as Array<{ slug?: string | null; updatedAt: string }>
}

export const getAllCategories = (locale: TypedLocale = DEFAULT_LOCALE) =>
  allOf('categories', locale)
export const getAllTags = (locale: TypedLocale = DEFAULT_LOCALE) => allOf('tags', locale)
export const getAllAuthors = (locale: TypedLocale = DEFAULT_LOCALE) => allOf('users', locale)

