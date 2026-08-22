import type { Metadata } from 'next'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import Image from 'next/image'
import { notFound } from 'next/navigation'
import React from 'react'

import { ArticleBody } from '@/components/ArticleBody'
import { VideoEmbed } from '@/components/VideoEmbed'
import { findArticleBySlug } from '@/lib/content'
import { formatDate, formatNumber } from '@/lib/format'
import { asMedia, imageUrl, posterFor } from '@/lib/media'
import { parseYouTubeUrl } from '@/lib/youtube'

import styles from './page.module.css'

type PageParams = { params: Promise<{ slug: string }> }

/**
 * Slugs are Bangla, so they travel percent-encoded. Next decodes route segments before handing
 * them over, but decoding again is harmless: `slugify` strips `%`, so a stored slug never contains
 * an escape sequence for a second pass to misread.
 */
const decodeSlug = (raw: string): string => {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export const generateMetadata = async ({ params }: PageParams): Promise<Metadata> => {
  const article = await findArticleBySlug(decodeSlug((await params).slug))

  if (!article) return { title: 'খবরটি পাওয়া যায়নি' }

  const ogImage = imageUrl(asMedia(article.seo?.ogImage) ?? asMedia(article.featuredImage), 'og')

  return {
    description: article.seo?.metaDescription ?? article.subtitle ?? undefined,
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

  const video = article.articleType === 'video' ? parseYouTubeUrl(article.video?.youtubeUrl) : null
  const featured = asMedia(article.featuredImage)
  const publishedAt = formatDate(article.publishedAt)
  const readTime = formatNumber(article.readTime)
  const author = typeof article.author === 'object' ? article.author : null
  const category = typeof article.category === 'object' ? article.category : null

  return (
    <article className={styles.article}>
      <header className={styles.header}>
        {category ? <p className={styles.kicker}>{category.name}</p> : null}

        <h1 className={styles.title}>{article.title}</h1>

        {article.subtitle ? <p className={styles.standfirst}>{article.subtitle}</p> : null}

        <p className={styles.byline}>
          {author?.name ? <span>{author.name}</span> : null}
          {article.location ? <span>{article.location}</span> : null}
          {publishedAt ? (
            <time dateTime={article.publishedAt ?? undefined}>{publishedAt}</time>
          ) : null}
          {readTime ? <span>{readTime} মিনিটের পড়া</span> : null}
        </p>
      </header>

      {video ? (
        <div className={styles.media}>
          <VideoEmbed
            caption={featured?.caption ?? null}
            // The uploaded thumbnail wins; otherwise the featured image already exists and is the
            // right shape for a poster.
            poster={posterFor([article.video?.thumbnail, article.featuredImage], 'hero')}
            title={article.title}
            video={video}
          />
        </div>
      ) : featured?.url ? (
        <figure className={styles.media}>
          <Image
            alt={featured.alt ?? ''}
            className={styles.image}
            height={featured.height ?? 630}
            priority
            sizes="(max-width: 800px) 100vw, 800px"
            src={imageUrl(featured, 'hero') ?? featured.url}
            width={featured.width ?? 1200}
          />
          {featured.caption ? (
            <figcaption className={styles.caption}>{featured.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <ArticleBody
        className={styles.body}
        content={article.content as SerializedEditorState}
        title={article.title}
      />
    </article>
  )
}
