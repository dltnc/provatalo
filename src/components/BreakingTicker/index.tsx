import Link from 'next/link'

import type { Article } from '@/payload-types'

import { articleHref } from '@/lib/urls'

/**
 * The breaking-news ticker. Two gates before it renders: the global `breakingTickerEnabled` switch
 * and the presence of at least one article flagged breaking. The headline list is duplicated in the
 * markup so the CSS marquee (`animate-ticker`, a -50% translate) loops seamlessly; the animation is
 * disabled under `prefers-reduced-motion` in the stylesheet.
 */
export const BreakingTicker = ({
  articles,
  enabled,
}: {
  articles: Article[]
  enabled?: boolean | null
}) => {
  if (!enabled || articles.length === 0) return null

  const items = articles.map((article) => (
    <Link
      className="mx-6 inline-flex shrink-0 items-center gap-2 text-sm font-medium text-ink hover:text-brand"
      href={articleHref(article)}
      key={article.id}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
      {article.title}
    </Link>
  ))

  return (
    <div className="border-b border-line bg-brand-50">
      <div className="mx-auto flex max-w-6xl items-stretch overflow-hidden px-4">
        <span className="z-10 -ml-4 flex shrink-0 items-center bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
          ব্রেকিং
        </span>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="flex w-max animate-ticker whitespace-nowrap">
            <div className="flex">{items}</div>
            <div aria-hidden className="flex">
              {items}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
