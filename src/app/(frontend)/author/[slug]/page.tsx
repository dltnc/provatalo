import type { Metadata } from 'next'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import Image from 'next/image'
import { notFound } from 'next/navigation'

import { ArticleBody } from '@/components/ArticleBody'
import { ArticleListing } from '@/components/ArticleListing'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getArticlesByAuthor, getAuthorBySlug } from '@/lib/queries'
import { asMedia, imageUrl } from '@/lib/media'
import { absoluteUrl } from '@/lib/seo'
import { authorHref, decodeSlug, parsePage } from '@/lib/urls'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const author = await getAuthorBySlug(decodeSlug((await params).slug))
  if (!author) return { title: 'লেখককে পাওয়া যায়নি' }

  return {
    title: author.name,
    alternates: { canonical: absoluteUrl(authorHref(author)) },
  }
}

export default async function AuthorPage({ params, searchParams }: PageProps) {
  const author = await getAuthorBySlug(decodeSlug((await params).slug))
  if (!author) notFound()

  const page = parsePage((await searchParams).page)
  const result = await getArticlesByAuthor({ author, page })
  const base = authorHref(author)
  const avatar = imageUrl(asMedia(author.avatar), 'thumbnail')

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ href: '/', label: 'হোম' }, { label: author.name }]} />

      <header className="mb-8 flex items-start gap-4 border-b border-line pb-6">
        {avatar ? (
          <Image
            alt={author.name}
            className="h-20 w-20 shrink-0 rounded-full object-cover"
            height={80}
            src={avatar}
            width={80}
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{author.name}</h1>
          {author.bio ? (
            <div className="mt-2 text-body">
              <ArticleBody content={author.bio as SerializedEditorState} title={author.name} />
            </div>
          ) : null}
        </div>
      </header>

      <ArticleListing
        articles={result.docs}
        emptyMessage="এই লেখকের কোনো প্রকাশিত খবর নেই।"
        makeHref={(p) => (p === 1 ? base : `${base}?page=${p}`)}
        page={result.page ?? page}
        totalPages={result.totalPages}
      />
    </div>
  )
}
