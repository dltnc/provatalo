import Image from 'next/image'
import Link from 'next/link'

import type { Article, Category } from '@/payload-types'

import { formatDate } from '@/lib/format'
import { asMedia, imageUrl } from '@/lib/media'
import { articleHref, categoryHref } from '@/lib/urls'

export type CardVariant = 'compact' | 'hero' | 'rail' | 'standard'

const category = (article: Article): Category | null =>
  typeof article.category === 'object' ? article.category : null

/** Small play glyph overlaid on video posters. */
const PlayBadge = ({ duration }: { duration?: string | null }) => (
  <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
    <svg aria-hidden fill="currentColor" height="12" viewBox="0 0 24 24" width="12">
      <path d="M8 5v14l11-7z" />
    </svg>
    {duration ? <span>{duration}</span> : <span className="sr-only">ভিডিও</span>}
  </span>
)

const Kicker = ({ article }: { article: Article }) => {
  const cat = category(article)
  if (!cat) return null
  return (
    <Link
      className="text-xs font-bold uppercase tracking-wide text-brand hover:underline"
      href={categoryHref(cat)}
    >
      {cat.name}
    </Link>
  )
}

const Meta = ({ article }: { article: Article }) => {
  const date = formatDate(article.publishedAt)
  if (!date) return null
  return (
    <time className="text-xs text-muted" dateTime={article.publishedAt ?? undefined}>
      {date}
    </time>
  )
}

const Thumb = ({
  article,
  priority,
  sizes,
}: {
  article: Article
  priority?: boolean
  sizes: string
}) => {
  const media = asMedia(article.featuredImage)
  const url = imageUrl(media, 'card')
  const isVideo = article.articleType === 'video'

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-wash">
      {url ? (
        <Image
          alt={media?.alt ?? article.title}
          className="object-cover transition-transform duration-300 hover:scale-105"
          fill
          priority={priority}
          sizes={sizes}
          src={url}
        />
      ) : null}
      {isVideo ? <PlayBadge duration={article.video?.duration} /> : null}
    </div>
  )
}

/**
 * The one card the whole site is built from. `variant` picks the layout — a lead `hero`, a grid
 * `standard`/`rail`, or a thumbnail-beside-headline `compact` for sidebars and latest lists — while
 * the data (kicker, headline, deck, date, video badge) stays identical across all of them.
 */
export const ArticleCard = ({
  article,
  priority = false,
  variant = 'standard',
}: {
  article: Article
  priority?: boolean
  variant?: CardVariant
}) => {
  const href = articleHref(article)

  if (variant === 'compact') {
    return (
      <article className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
        <Link className="w-24 shrink-0" href={href}>
          <Thumb article={article} sizes="96px" />
        </Link>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-ink">
            <Link className="hover:text-brand" href={href}>
              {article.title}
            </Link>
          </h3>
          <div className="mt-1">
            <Meta article={article} />
          </div>
        </div>
      </article>
    )
  }

  if (variant === 'hero') {
    return (
      <article className="group">
        <Link className="block" href={href}>
          <Thumb article={article} priority={priority} sizes="(max-width: 1024px) 100vw, 680px" />
        </Link>
        <div className="mt-3">
          <Kicker article={article} />
          <h2 className="mt-1 text-2xl font-extrabold leading-tight text-ink md:text-3xl">
            <Link className="hover:text-brand" href={href}>
              {article.title}
            </Link>
          </h2>
          {article.subtitle ? (
            <p className="mt-2 line-clamp-3 text-body">{article.subtitle}</p>
          ) : null}
          <div className="mt-2">
            <Meta article={article} />
          </div>
        </div>
      </article>
    )
  }

  // standard + rail
  return (
    <article className="group flex flex-col">
      <Link className="block" href={href}>
        <Thumb article={article} priority={priority} sizes="(max-width: 640px) 100vw, 320px" />
      </Link>
      <div className="mt-2">
        <Kicker article={article} />
        <h3 className="mt-1 text-base font-bold leading-snug text-ink">
          <Link className="hover:text-brand" href={href}>
            {article.title}
          </Link>
        </h3>
        {variant === 'standard' && article.subtitle ? (
          <p className="mt-1 line-clamp-2 text-sm text-body">{article.subtitle}</p>
        ) : null}
        <div className="mt-1">
          <Meta article={article} />
        </div>
      </div>
    </article>
  )
}
