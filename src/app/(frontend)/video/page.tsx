import type { Metadata } from 'next'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { findVideoArticles } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { posterFor } from '@/lib/media'

import styles from './page.module.css'

export const metadata: Metadata = {
  description: 'সর্বশেষ ভিডিও প্রতিবেদন।',
  title: 'ভিডিও',
}

/**
 * Video index.
 *
 * Cards are plain links to the article rather than inline players: mounting a dozen YouTube
 * iframes on one page is the single most expensive thing a news site can do to its Core Web
 * Vitals, and the play badge already sets the expectation that a video is one tap away.
 */
export default async function VideoIndexPage() {
  const articles = await findVideoArticles()

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>ভিডিও</h1>

      {articles.length === 0 ? (
        <p className={styles.empty}>এখনও কোনও ভিডিও প্রতিবেদন প্রকাশিত হয়নি।</p>
      ) : (
        <ul className={styles.grid}>
          {articles.map((article) => {
            const poster = posterFor([article.video?.thumbnail, article.featuredImage], 'card')
            const publishedAt = formatDate(article.publishedAt)

            return (
              <li className={styles.card} key={article.id}>
                <Link className={styles.link} href={`/article/${article.slug}`}>
                  <span className={styles.frame}>
                    {poster ? (
                      <Image
                        alt={poster.alt}
                        className={styles.poster}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        src={poster.url}
                      />
                    ) : null}

                    <span aria-hidden="true" className={styles.badge}>
                      <svg height="20" viewBox="0 0 24 24" width="20">
                        <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                      </svg>
                    </span>

                    {article.video?.duration ? (
                      <span className={styles.duration}>{article.video.duration}</span>
                    ) : null}
                  </span>

                  <span className={styles.title}>{article.title}</span>

                  {publishedAt ? (
                    <time className={styles.date} dateTime={article.publishedAt ?? undefined}>
                      {publishedAt}
                    </time>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
