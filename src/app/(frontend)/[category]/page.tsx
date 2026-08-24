import type { Metadata } from 'next'

import { notFound, redirect } from 'next/navigation'

import type { Category } from '@/payload-types'

import { ArticleListing } from '@/components/ArticleListing'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { getArticlesByCategory, getCategoryBySlug } from '@/lib/queries'
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo'
import { categoryHref, decodeSlug, parsePage, subcategoryHref } from '@/lib/urls'

type PageProps = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}

const parentOf = (category: Category): Category | null =>
  typeof category.parentCategory === 'object' ? category.parentCategory : null

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const category = await getCategoryBySlug(decodeSlug((await params).category))
  if (!category) return { title: 'বিভাগটি পাওয়া যায়নি' }

  return {
    title: category.name,
    alternates: { canonical: absoluteUrl(categoryHref(category)) },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const category = await getCategoryBySlug(decodeSlug((await params).category))
  if (!category) notFound()

  // Subcategories are canonically served nested under their parent; a bare `/[child]` hit is sent
  // there so there is one URL per section, not two.
  const parent = parentOf(category)
  if (parent) redirect(subcategoryHref(parent.slug, category))

  const page = parsePage((await searchParams).page)
  const result = await getArticlesByCategory({ category, page })

  const crumbs = [
    { href: '/', label: 'হোম' },
    { label: category.name },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={crumbs} />
      <h1 className="mb-6 border-b-2 border-brand pb-2 text-2xl font-extrabold text-ink">
        {category.name}
      </h1>

      <ArticleListing
        articles={result.docs}
        makeHref={(p) => (p === 1 ? categoryHref(category) : `${categoryHref(category)}?page=${p}`)}
        page={result.page ?? page}
        totalPages={result.totalPages}
      />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'হোম', path: '/' },
          { name: category.name, path: categoryHref(category) },
        ])}
      />
    </div>
  )
}
