import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import type { Category } from '@/payload-types'

import { ArticleListing } from '@/components/ArticleListing'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { getArticlesByCategory, getCategoryBySlug } from '@/lib/queries'
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo'
import { categoryHref, decodeSlug, parsePage, subcategoryHref } from '@/lib/urls'

type PageProps = {
  params: Promise<{ category: string; subcategory: string }>
  searchParams: Promise<{ page?: string }>
}

const parentOf = (category: Category): Category | null =>
  typeof category.parentCategory === 'object' ? category.parentCategory : null

/**
 * Resolves the child and confirms it really sits under the parent in the URL. Without that check a
 * valid subcategory would render under any parent slug, splitting the page across bogus URLs; a
 * mismatch is a 404.
 */
const resolve = async (
  categorySlug: string,
  subcategorySlug: string,
): Promise<{ child: Category; parent: Category } | null> => {
  const child = await getCategoryBySlug(decodeSlug(subcategorySlug))
  if (!child) return null

  const parent = parentOf(child)
  if (!parent || parent.slug !== decodeSlug(categorySlug)) return null

  return { child, parent }
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { category, subcategory } = await params
  const resolved = await resolve(category, subcategory)
  if (!resolved) return { title: 'বিভাগটি পাওয়া যায়নি' }

  return {
    title: `${resolved.child.name} — ${resolved.parent.name}`,
    alternates: { canonical: absoluteUrl(subcategoryHref(resolved.parent.slug, resolved.child)) },
  }
}

export default async function SubcategoryPage({ params, searchParams }: PageProps) {
  const { category, subcategory } = await params
  const resolved = await resolve(category, subcategory)
  if (!resolved) notFound()

  const { child, parent } = resolved
  const page = parsePage((await searchParams).page)
  const result = await getArticlesByCategory({ category: child, includeChildren: false, page })

  const base = subcategoryHref(parent.slug, child)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs
        items={[
          { href: '/', label: 'হোম' },
          { href: categoryHref(parent), label: parent.name },
          { label: child.name },
        ]}
      />
      <h1 className="mb-6 border-b-2 border-brand pb-2 text-2xl font-extrabold text-ink">
        {child.name}
      </h1>

      <ArticleListing
        articles={result.docs}
        makeHref={(p) => (p === 1 ? base : `${base}?page=${p}`)}
        page={result.page ?? page}
        totalPages={result.totalPages}
      />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'হোম', path: '/' },
          { name: parent.name, path: categoryHref(parent) },
          { name: child.name, path: base },
        ])}
      />
    </div>
  )
}
