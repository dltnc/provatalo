import type { Payload } from 'payload'

import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '@/payload.config'
import { slugify } from '@/lib/slugify'

import {
  articles,
  authors,
  categories,
  richText,
  tags,
  type SeedArticle,
  type SeedAuthor,
  type SeedCategory,
} from './content'

/**
 * Idempotent demo-data seed for the Bangla news portal.
 *
 * Run with:  pnpm seed        (alias for `payload run src/seed/index.ts`)
 *
 * Safe to re-run: every record is looked up first (categories/tags/articles by slug, users by
 * email, media by alt text) and only created when missing. It never deletes existing data.
 *
 * Placeholder images are generated on the fly with sharp — no network access and no bundled
 * binaries, so the seed works fully offline. They are abstract gradients, not real photographs.
 */

const LOCALE = 'bn' as const

/** Demo login password for every seeded editor/reporter. Override with SEED_PASSWORD. */
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'ChangeMe!Demo123'

// --- Placeholder image generation -----------------------------------------

/** Blend a hex colour toward white so a gradient reads as light-to-dark of one hue. */
const lighten = (hex: string, amount = 0.45): string => {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/**
 * A 1600×900 gradient PNG. No text — Bangla glyph rendering depends on fonts that may not be
 * installed, and an abstract placeholder always renders. Payload's image pipeline resizes it
 * into the thumbnail/card/hero/og sizes on upload.
 */
const gradientPng = async (color: string): Promise<Buffer> => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${lighten(color)}"/>
      <stop offset="100%" stop-color="${color}"/>
    </linearGradient></defs>
    <rect width="1600" height="900" fill="url(#g)"/>
    <circle cx="1250" cy="230" r="200" fill="#ffffff" fill-opacity="0.10"/>
    <circle cx="320" cy="760" r="280" fill="#000000" fill-opacity="0.08"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// --- Upsert helpers --------------------------------------------------------

const findBySlug = async (payload: Payload, collection: 'categories' | 'tags' | 'articles', slug: string) => {
  const { docs } = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    locale: LOCALE,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]
}

/** One reusable placeholder image per category, keyed by category slug. Idempotent by alt text. */
const upsertMedia = async (payload: Payload, cat: SeedCategory): Promise<string> => {
  const alt = `${cat.name} বিভাগের প্রতীকী ছবি`
  const existing = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    locale: LOCALE,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) return String(existing.docs[0].id)

  const data = await gradientPng(cat.color)
  const doc = await payload.create({
    collection: 'media',
    locale: LOCALE,
    overrideAccess: true,
    data: { alt, caption: null, credit: 'Provatalo Demo' },
    file: {
      data,
      mimetype: 'image/png',
      name: `demo-${slugify(cat.name) || 'category'}.png`,
      size: data.length,
    },
  })
  return String(doc.id)
}

const upsertCategory = async (
  payload: Payload,
  cat: SeedCategory,
  parentId?: string,
): Promise<string> => {
  const slug = slugify(cat.name)
  const existing = await findBySlug(payload, 'categories', slug)
  if (existing) return String(existing.id)

  const doc = await payload.create({
    collection: 'categories',
    locale: LOCALE,
    overrideAccess: true,
    data: {
      name: cat.name,
      slug,
      color: cat.color,
      displayOrder: cat.displayOrder,
      parentCategory: parentId ?? undefined,
    },
  })
  return String(doc.id)
}

const upsertTag = async (payload: Payload, name: string): Promise<string> => {
  const slug = slugify(name)
  const existing = await findBySlug(payload, 'tags', slug)
  if (existing) return String(existing.id)

  const doc = await payload.create({
    collection: 'tags',
    locale: LOCALE,
    overrideAccess: true,
    data: { name, slug },
  })
  return String(doc.id)
}

const upsertAuthor = async (payload: Payload, author: SeedAuthor): Promise<string> => {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: author.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) return String(existing.docs[0].id)

  const doc = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      name: author.name,
      slug: slugify(author.name),
      email: author.email,
      password: DEMO_PASSWORD,
      roles: author.roles,
      bio: richText([author.bio]) as never,
    },
  })
  return String(doc.id)
}

const upsertArticle = async (
  payload: Payload,
  article: SeedArticle,
  refs: { categoryId: string; tagIds: string[]; authorId: string; mediaId: string },
): Promise<boolean> => {
  const slug = slugify(article.title)
  if (await findBySlug(payload, 'articles', slug)) return false

  const publishedAt = new Date(Date.now() - article.daysAgo * 86_400_000).toISOString()

  await payload.create({
    collection: 'articles',
    locale: LOCALE,
    overrideAccess: true,
    // The revalidate hook no-ops on this flag — no Next request scope exists during a seed.
    context: { disableRevalidate: true },
    data: {
      articleType: article.type ?? 'text',
      title: article.title,
      slug,
      subtitle: article.subtitle,
      content: richText(article.body) as never,
      featuredImage: refs.mediaId,
      location: article.location,
      category: refs.categoryId,
      tags: refs.tagIds,
      author: refs.authorId,
      reviewState: 'approved',
      publishedAt,
      isBreaking: Boolean(article.isBreaking),
      isFeatured: Boolean(article.isFeatured),
      seo: { metaDescription: article.metaDescription },
      _status: 'published',
      ...(article.type === 'video' && article.youtubeUrl
        ? { video: { youtubeUrl: article.youtubeUrl, duration: article.duration } }
        : {}),
    },
  })
  return true
}

const run = async (): Promise<void> => {
  const payload = await getPayload({ config: await config })
  payload.logger.info('Seeding demo data…')

  // Categories: parents first so children can reference them. Also make one placeholder image
  // per category, reused as the featured image for that category's articles.
  const categoryIds = new Map<string, string>()
  const mediaIds = new Map<string, string>()

  for (const cat of categories.filter((c) => !c.parent)) {
    categoryIds.set(cat.name, await upsertCategory(payload, cat))
    mediaIds.set(cat.name, await upsertMedia(payload, cat))
  }
  for (const cat of categories.filter((c) => c.parent)) {
    const parentId = categoryIds.get(cat.parent as string)
    categoryIds.set(cat.name, await upsertCategory(payload, cat, parentId))
    mediaIds.set(cat.name, await upsertMedia(payload, cat))
  }

  const tagIds = new Map<string, string>()
  for (const tag of tags) tagIds.set(tag, await upsertTag(payload, tag))

  const authorIds = new Map<string, string>()
  for (const author of authors) authorIds.set(author.email, await upsertAuthor(payload, author))

  let created = 0
  for (const article of articles) {
    const categoryId = categoryIds.get(article.category)
    const authorId = authorIds.get(article.author)
    const mediaId = mediaIds.get(article.category)
    if (!categoryId || !authorId || !mediaId) {
      payload.logger.warn(`Skipping "${article.title}" — unresolved category/author/media reference.`)
      continue
    }
    const resolvedTags = (article.tags ?? [])
      .map((t) => tagIds.get(t))
      .filter((id): id is string => Boolean(id))

    if (await upsertArticle(payload, article, { categoryId, tagIds: resolvedTags, authorId, mediaId })) {
      created += 1
    }
  }

  await payload.updateGlobal({
    slug: 'site-settings',
    locale: LOCALE,
    overrideAccess: true,
    data: {
      siteName: 'প্রভাতালো',
      breakingTickerEnabled: true,
      adsEnabled: false,
      socialLinks: [
        { platform: 'facebook', url: 'https://facebook.com/provatalo', followers: 1250000 },
        { platform: 'youtube', url: 'https://youtube.com/@provatalo', followers: 452000 },
        { platform: 'instagram', url: 'https://instagram.com/provatalo', followers: 153000 },
        { platform: 'x', url: 'https://x.com/provatalo', followers: 88500 },
      ],
    },
  })

  payload.logger.info(
    `Seed complete: ${categoryIds.size} categories, ${tagIds.size} tags, ${authorIds.size} authors, ${created} new articles.`,
  )
  payload.logger.info(`Demo editor/reporter password: ${DEMO_PASSWORD} (set SEED_PASSWORD to override).`)
}

await run()
process.exit(0)
