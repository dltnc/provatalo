import type { Article } from '@/payload-types'

import { ArticleCard } from '@/components/ArticleCard'
import { Pagination } from '@/components/Pagination'

/**
 * The shared body of every listing page — category, subcategory, tag, author and search all render
 * the same responsive grid of standard cards followed by the pager. Centralising it keeps those
 * pages down to data-fetching plus a header, and guarantees they look identical. An empty result
 * shows a message instead of a bare pager.
 */
export const ArticleListing = ({
  articles,
  emptyMessage = 'এই মুহূর্তে কোনো খবর নেই।',
  makeHref,
  page,
  totalPages,
}: {
  articles: Article[]
  emptyMessage?: string
  makeHref: (page: number) => string
  page: number
  totalPages: number
}) => {
  if (articles.length === 0) {
    return <p className="py-12 text-center text-muted">{emptyMessage}</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article, i) => (
          <ArticleCard article={article} key={article.id} priority={i < 3} variant="standard" />
        ))}
      </div>
      <Pagination makeHref={makeHref} page={page} totalPages={totalPages} />
    </>
  )
}
