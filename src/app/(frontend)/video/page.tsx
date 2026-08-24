import type { Metadata } from 'next'

import { ArticleCard } from '@/components/ArticleCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ShareButtons } from '@/components/ShareButtons'
import { findVideoArticles } from '@/lib/content'
import { getSiteSettings } from '@/lib/queries'
import { absoluteUrl } from '@/lib/seo'
import { VIDEO_HREF } from '@/lib/urls'

export const metadata: Metadata = {
  description: 'সর্বশেষ ভিডিও প্রতিবেদন।',
  title: 'ভিডিও',
  alternates: { canonical: absoluteUrl(VIDEO_HREF) },
}

/**
 * Video index. Cards are plain links to the article rather than inline players: mounting a dozen
 * YouTube iframes on one page is the most expensive thing a news site can do to its Core Web
 * Vitals, and `ArticleCard` already renders the play badge that sets the expectation.
 */
export default async function VideoIndexPage() {
  const [articles, settings] = await Promise.all([findVideoArticles(), getSiteSettings()])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ href: '/', label: 'হোম' }, { label: 'ভিডিও' }]} />
      <h1 className="mb-4 border-b-2 border-brand pb-2 text-2xl font-extrabold text-ink">ভিডিও</h1>

      <div className="mb-8">
        <ShareButtons title={`ভিডিও | ${settings.siteName}`} url={absoluteUrl(VIDEO_HREF)} />
      </div>

      {articles.length === 0 ? (
        <p className="py-12 text-center text-muted">এখনও কোনও ভিডিও প্রতিবেদন প্রকাশিত হয়নি।</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <ArticleCard article={article} key={article.id} priority={i < 3} variant="standard" />
          ))}
        </div>
      )}
    </div>
  )
}
