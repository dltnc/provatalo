import type { Metadata } from 'next'

import { ArticleListing } from '@/components/ArticleListing'
import { SearchBox } from '@/components/SearchBox'
import { formatNumber } from '@/lib/format'
import { searchArticles } from '@/lib/queries'
import { parsePage, searchHref } from '@/lib/urls'

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>
}

// Search result pages are not useful in the index and would dilute crawl budget.
export const metadata: Metadata = {
  title: 'অনুসন্ধান',
  robots: { follow: true, index: false },
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const query = (sp.q ?? '').trim()
  const page = parsePage(sp.page)
  const result = await searchArticles({ page, query })

  const base = searchHref(query)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-extrabold text-ink">অনুসন্ধান</h1>
      <div className="mb-6">
        <SearchBox autoFocus={!query} />
      </div>

      {query ? (
        <p className="mb-6 text-sm text-muted">
          <span className="font-semibold text-ink">“{query}”</span> — {formatNumber(result.totalDocs)}টি ফলাফল
        </p>
      ) : (
        <p className="mb-6 text-sm text-muted">খবর খুঁজতে উপরে লিখুন।</p>
      )}

      {query ? (
        <ArticleListing
          articles={result.docs}
          emptyMessage="আপনার অনুসন্ধানের সঙ্গে মিলে এমন কোনো খবর পাওয়া যায়নি।"
          makeHref={(p) => (p === 1 ? base : `${base}&page=${p}`)}
          page={result.page ?? page}
          totalPages={result.totalPages}
        />
      ) : null}
    </div>
  )
}
