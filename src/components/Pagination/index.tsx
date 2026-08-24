import Link from 'next/link'

import { formatNumber } from '@/lib/format'

/**
 * Numeric pager for listing pages. Rendered server-side, so it takes a `makeHref` builder rather
 * than a base string — that lets category pages produce `?page=2` while search keeps its `q=` in
 * the query. Page numbers show in Bangla numerals to match the rest of the site.
 *
 * The window keeps the current page flanked by one neighbour each side, with first/last always
 * reachable and gaps marked by an ellipsis.
 */
export const Pagination = ({
  makeHref,
  page,
  totalPages,
}: {
  makeHref: (page: number) => string
  page: number
  totalPages: number
}) => {
  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) pages.push(p)
  }

  const cell =
    'inline-flex min-w-9 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold'

  return (
    <nav aria-label="পাতা" className="mt-8 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link className={`${cell} border-line text-ink hover:border-brand`} href={makeHref(page - 1)} rel="prev">
          পূর্ববর্তী
        </Link>
      ) : null}

      {pages.map((p, i) => {
        const gap = i > 0 && p - pages[i - 1] > 1
        return (
          <span className="flex items-center gap-1" key={p}>
            {gap ? <span className="px-1 text-muted">…</span> : null}
            {p === page ? (
              <span aria-current="page" className={`${cell} border-brand bg-brand text-white`}>
                {formatNumber(p)}
              </span>
            ) : (
              <Link className={`${cell} border-line text-ink hover:border-brand`} href={makeHref(p)}>
                {formatNumber(p)}
              </Link>
            )}
          </span>
        )
      })}

      {page < totalPages ? (
        <Link className={`${cell} border-line text-ink hover:border-brand`} href={makeHref(page + 1)} rel="next">
          পরবর্তী
        </Link>
      ) : null}
    </nav>
  )
}
