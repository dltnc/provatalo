import Link from 'next/link'

import type { Article } from '@/payload-types'

import { ArticleCard } from '@/components/ArticleCard'
import type { CardVariant } from '@/components/ArticleCard'

/**
 * Section heading used above every rail and listing: a red tab-marker, the section name, and an
 * optional "see all" link on the right. Kept separate from the rail so pages that lay out their own
 * grid (the homepage hero block, search results) can reuse just the heading.
 */
export const SectionHeader = ({
  href,
  title,
}: {
  href?: string
  title: string
}) => (
  <div className="mb-4 flex items-center justify-between border-b-2 border-line">
    <h2 className="-mb-0.5 border-b-2 border-brand pb-2 text-lg font-extrabold text-ink">
      {title}
    </h2>
    {href ? (
      <Link className="pb-2 text-sm font-semibold text-brand hover:underline" href={href}>
        সব দেখুন →
      </Link>
    ) : null}
  </div>
)

/**
 * A titled grid of article cards. The default 3-up grid covers category rails and the homepage
 * sections; `columns` and `variant` let a caller tighten it (e.g. a 4-up rail of standard cards).
 * Renders nothing when there are no articles, so an empty section never leaves a dangling header.
 */
export const ArticleRail = ({
  articles,
  columns = 3,
  href,
  title,
  variant = 'standard',
}: {
  articles: Article[]
  columns?: 2 | 3 | 4
  href?: string
  title: string
  variant?: CardVariant
}) => {
  if (articles.length === 0) return null

  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <section className="mb-10">
      <SectionHeader href={href} title={title} />
      <div className={`grid grid-cols-1 gap-6 ${cols}`}>
        {articles.map((article) => (
          <ArticleCard article={article} key={article.id} variant={variant} />
        ))}
      </div>
    </section>
  )
}
