import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { ArticleListing } from '@/components/ArticleListing'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getArticlesByTag, getTagBySlug } from '@/lib/queries'
import { absoluteUrl } from '@/lib/seo'
import { decodeSlug, parsePage, tagHref } from '@/lib/urls'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const tag = await getTagBySlug(decodeSlug((await params).slug))
  if (!tag) return { title: 'ট্যাগটি পাওয়া যায়নি' }

  return {
    title: `#${tag.name}`,
    alternates: { canonical: absoluteUrl(tagHref(tag)) },
  }
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const tag = await getTagBySlug(decodeSlug((await params).slug))
  if (!tag) notFound()

  const page = parsePage((await searchParams).page)
  const result = await getArticlesByTag({ page, tag })
  const base = tagHref(tag)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ href: '/', label: 'হোম' }, { label: `#${tag.name}` }]} />
      <h1 className="mb-6 border-b-2 border-brand pb-2 text-2xl font-extrabold text-ink">
        #{tag.name}
      </h1>

      <ArticleListing
        articles={result.docs}
        makeHref={(p) => (p === 1 ? base : `${base}?page=${p}`)}
        page={result.page ?? page}
        totalPages={result.totalPages}
      />
    </div>
  )
}
