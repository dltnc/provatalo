import Link from 'next/link'

export type Crumb = { href?: string; label: string }

/**
 * Visual breadcrumb trail. The matching structured data is emitted separately by `BreadcrumbJsonLd`
 * so the two can't fall out of sync in one render — pages build the crumb list once and pass it to
 * both. The final crumb is the current page and is rendered as plain text, not a link.
 */
export const Breadcrumbs = ({ items }: { items: Crumb[] }) => {
  if (items.length === 0) return null

  return (
    <nav aria-label="ব্রেডক্রাম্ব" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li className="flex items-center gap-1" key={`${item.label}-${i}`}>
              {item.href && !last ? (
                <Link className="hover:text-brand" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-ink' : ''}>
                  {item.label}
                </span>
              )}
              {last ? null : <span aria-hidden>/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
