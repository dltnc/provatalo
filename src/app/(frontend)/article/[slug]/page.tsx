import type { Metadata } from 'next'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import type { Category, Tag } from '@/payload-types'

import { ArticleBody } from '@/components/ArticleBody'
import { ArticleRail } from '@/components/ArticleRail'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import type { Crumb } from '@/components/Breadcrumbs'
import { FacebookComments } from '@/components/FacebookComments'
import { JsonLd } from '@/components/JsonLd'
import { ShareButtons } from '@/components/ShareButtons'
import { VideoEmbed } from '@/components/VideoEmbed'
import { findArticleBySlug } from '@/lib/content'
import { formatDate, formatNumber } from '@/lib/format'
import { asMedia, imageUrl, posterFor } from '@/lib/media'
import { getRelatedArticles } from '@/lib/queries'
import { absoluteUrl, breadcrumbJsonLd, newsArticleJsonLd } from '@/lib/seo'
import { getSiteSettings } from '@/lib/queries'
import { articleHref, authorHref, categoryHref, decodeSlug, subcategoryHref, tagHref } from '@/lib/urls'
import { parseYouTubeUrl } from '@/lib/youtube'

type PageParams = { params: Promise<{ slug: string }> }

const parentOf = (category: Category): Category | null =>
  typeof category.parentCategory === 'object' ? category.parentCategory : null

/** Home → [parent] → category trail for an article's section, as visual crumbs + JSON-LD nodes. */
const categoryTrail = (
  category: Category | null,
): { crumbs: Crumb[]; nodes: Array<{ name: string; path: string }> } => {
  const crumbs: Crumb[] = [{ href: '/', label: 'হোম' }]
  const nodes: Array<{ name: string; path: string }> = [{ name: 'হোম', path: '/' }]
  if (!category) return { crumbs, nodes }

  const parent = parentOf(category)
  if (parent) {
    crumbs.push({ href: categoryHref(parent), label: parent.name })
    nodes.push({ name: parent.name, path: categoryHref(parent) })
    const path = subcategoryHref(parent.slug, category)
    crumbs.push({ href: path, label: category.name })
    nodes.push({ name: category.name, path })
  } else {
    crumbs.push({ href: categoryHref(category), label: category.name })
    nodes.push({ name: category.name, path: categoryHref(category) })
  }

  return { crumbs, nodes }
}

export const generateMetadata = async ({ params }: PageParams): Promise<Metadata> => {
  const article = await findArticleBySlug(decodeSlug((await params).slug))

  if (!article) return { title: 'খবরটি পাওয়া যায়নি' }

  const ogImage = imageUrl(asMedia(article.seo?.ogImage) ?? asMedia(article.featuredImage), 'og')

  return {
    description: article.seo?.metaDescription ?? article.subtitle ?? undefined,
    alternates: { canonical: absoluteUrl(articleHref(article)) },
    openGraph: {
      description: article.seo?.metaDescription ?? article.subtitle ?? undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: article.publishedAt ?? undefined,
      title: article.seo?.metaTitle ?? article.title,
      type: 'article',
    },
    title: article.seo?.metaTitle ?? article.title,
  }
}

export default async function ArticlePage({ params }: PageParams) {
  const article = await findArticleBySlug(decodeSlug((await params).slug))

  // Drafts never reach here: the query runs with `overrideAccess: false` and no user, so access
  // control has already narrowed it to published articles.
  if (!article) notFound()

  const [settings, related] = await Promise.all([
    getSiteSettings(),
    getRelatedArticles(article),
  ])

  const video = article.articleType === 'video' ? parseYouTubeUrl(article.video?.youtubeUrl) : null
  const featured = asMedia(article.featuredImage)
  const publishedAt = formatDate(article.publishedAt)
  const readTime = formatNumber(article.readTime)
  const author = typeof article.author === 'object' ? article.author : null
  const category = typeof article.category === 'object' ? article.category : null
  const tags = (article.tags ?? []).filter((t): t is Tag => typeof t === 'object' && t !== null)
  const { crumbs, nodes } = categoryTrail(category)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs items={crumbs} />

      <article>
        <header className="mb-6">
          {category ? (
            <Link
              className="text-sm font-bold uppercase tracking-wide text-brand hover:underline"
              href={crumbs[crumbs.length - 1].href ?? categoryHref(category)}
            >
              {category.name}
            </Link>
          ) : null}

          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            {article.title}
          </h1>

          {article.subtitle ? (
            <p className="mt-3 font-serif text-lg leading-relaxed text-body">{article.subtitle}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {author?.name ? (
              <Link className="font-semibold text-ink hover:text-brand" href={authorHref(author)}>
                {author.name}
              </Link>
            ) : null}
            {article.location ? <span>{article.location}</span> : null}
            {publishedAt ? (
              <time dateTime={article.publishedAt ?? undefined}>{publishedAt}</time>
            ) : null}
            {readTime ? <span>{readTime} মিনিটের পড়া</span> : null}
          </div>

          <div className="mt-4">
            <ShareButtons title={article.title} url={absoluteUrl(articleHref(article))} />
          </div>
        </header>

        {video ? (
          <div className="mb-8">
            <VideoEmbed
              caption={featured?.caption ?? null}
              poster={posterFor([article.video?.thumbnail, article.featuredImage], 'hero')}
              title={article.title}
              video={video}
            />
          </div>
        ) : featured?.url ? (
          <figure className="mb-8">
            <Image
              alt={featured.alt ?? ''}
              className="h-auto w-full rounded-lg"
              height={featured.height ?? 630}
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              src={imageUrl(featured, 'hero') ?? featured.url}
              width={featured.width ?? 1200}
            />
            {featured.caption ? (
              <figcaption className="mt-2 text-sm text-muted">{featured.caption}</figcaption>
            ) : null}
          </figure>
        ) : null}

        <ArticleBody
          className="rich-text"
          content={article.content as SerializedEditorState}
          title={article.title}
        />

        {/* Second share row: readers who finish the piece share it at the end, not the top. */}
        <div className="mt-8">
          <ShareButtons title={article.title} url={absoluteUrl(articleHref(article))} />
        </div>

        {tags.length ? (
          <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
            {tags.map((tag) => (
              <Link
                className="rounded-full border border-line px-3 py-1 text-sm text-body hover:border-brand hover:text-brand"
                href={tagHref(tag)}
                key={tag.id}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        ) : null}
      </article>

      {related.length ? (
        <div className="mt-12">
          <ArticleRail articles={related} columns={3} title="সম্পর্কিত খবর" variant="rail" />
        </div>
      ) : null}

      {settings.facebookAppId ? (
        <section className="mt-12">
          <h2 className="mb-4 border-b-2 border-line text-lg font-extrabold text-ink">
            <span className="-mb-0.5 border-b-2 border-brand pb-2">মন্তব্য</span>
          </h2>
          <FacebookComments
            appId={settings.facebookAppId}
            url={absoluteUrl(articleHref(article))}
          />
        </section>
      ) : null}

      <JsonLd data={newsArticleJsonLd(article, settings)} />
      <JsonLd data={breadcrumbJsonLd(nodes)} />
    </div>
  )
}
