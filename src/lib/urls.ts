import type { Article, Category, Tag, User } from '@/payload-types'

/**
 * Canonical path builders. Slugs are Bangla, so every segment is percent-encoded exactly once here
 * — templates link with these helpers and never hand-concatenate a slug into a path. `enc` guards
 * the (shouldn't-happen) null slug so a missing value degrades to `/` instead of `/undefined`.
 */
const enc = (slug?: string | null): string => (slug ? encodeURIComponent(slug) : '')

export const articleHref = (article: Pick<Article, 'slug'>): string => `/article/${enc(article.slug)}`

export const categoryHref = (category: Pick<Category, 'slug'>): string => `/${enc(category.slug)}`

export const subcategoryHref = (
  parentSlug: string | null | undefined,
  child: Pick<Category, 'slug'>,
): string => `/${enc(parentSlug)}/${enc(child.slug)}`

export const tagHref = (tag: Pick<Tag, 'slug'>): string => `/tag/${enc(tag.slug)}`

export const authorHref = (user: Pick<User, 'slug'>): string => `/author/${enc(user.slug)}`

export const searchHref = (query: string): string => `/search?q=${encodeURIComponent(query)}`

export const VIDEO_HREF = '/video'

/**
 * Route segments arrive percent-encoded (slugs are Bangla). Next decodes them once already;
 * decoding again is safe because `slugify` strips `%`, so a stored slug never contains an escape
 * sequence for a second pass to misread. A malformed sequence falls back to the raw value.
 */
export const decodeSlug = (raw: string): string => {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Parse a `?page=` query value into a 1-based page number, clamping junk to 1. */
export const parsePage = (raw?: string | string[]): number => {
  const value = Array.isArray(raw) ? raw[0] : raw
  const n = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}
