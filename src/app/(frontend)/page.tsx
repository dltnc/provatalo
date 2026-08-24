import Link from 'next/link'

import type { Article } from '@/payload-types'

import { ArticleCard } from '@/components/ArticleCard'
import { ArticleRail, SectionHeader } from '@/components/ArticleRail'
import { SocialFollow } from '@/components/SocialFollow'
import {
  getArticlesByCategory,
  getFeaturedArticles,
  getLatestArticles,
  getNavCategories,
  getSiteSettings,
  getTrendingArticles,
} from '@/lib/queries'
import { articleHref, categoryHref } from '@/lib/urls'
import { formatNumber } from '@/lib/format'

// The homepage is revalidated on publish via the article afterChange hook; no per-request dynamics.
export const revalidate = 300

/** Ranked compact list used in the sidebar (trending) — numbered, no thumbnails. */
const RankedList = ({ articles }: { articles: Article[] }) => (
  <ol className="space-y-3">
    {articles.map((article, i) => (
      <li className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0" key={article.id}>
        <span className="text-xl font-extrabold text-brand/40">{formatNumber(i + 1)}</span>
        <h3 className="text-sm font-semibold leading-snug text-ink">
          <Link className="hover:text-brand" href={articleHref(article)}>
            {article.title}
          </Link>
        </h3>
      </li>
    ))}
  </ol>
)

export default async function HomePage() {
  const [featured, latest, trending, navCategories, settings] = await Promise.all([
    getFeaturedArticles(5),
    getLatestArticles(7),
    getTrendingArticles(6),
    getNavCategories(),
    getSiteSettings(),
  ])

  const [lead, ...restFeatured] = featured
  const heroIds = new Set(featured.slice(0, 3).map((a) => a.id))
  const latestFiltered = latest.filter((a) => !heroIds.has(a.id))

  // A rail per top-level section, for the first few roots that actually have stories.
  const roots = navCategories.slice(0, 4)
  const categoryRails = (
    await Promise.all(
      roots.map(async (cat) => ({
        category: cat,
        articles: (await getArticlesByCategory({ category: cat, limit: 4 })).docs,
      })),
    )
  ).filter((rail) => rail.articles.length > 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Featured hero block */}
      {lead ? (
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ArticleCard article={lead} priority variant="hero" />
          </div>
          <div className="flex flex-col gap-4">
            {restFeatured.slice(0, 3).map((article) => (
              <ArticleCard article={article} key={article.id} variant="compact" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Main + sidebar */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ArticleRail articles={latestFiltered.slice(0, 6)} columns={3} title="সর্বশেষ সংবাদ" />

          {categoryRails.map(({ articles, category }) => (
            <ArticleRail
              articles={articles}
              href={categoryHref(category)}
              key={category.id}
              title={category.name}
            />
          ))}
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <SocialFollow settings={settings} />
            <SectionHeader title="জনপ্রিয়" />
            <RankedList articles={trending} />
          </div>
        </aside>
      </div>
    </div>
  )
}
