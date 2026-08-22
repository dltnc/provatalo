import type { Media } from '@/payload-types'

/**
 * Relationship and upload fields come back as an id or as a populated document depending on the
 * `depth` of the query that fetched them. Rather than every template guessing, narrow once.
 */
export const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' && 'url' in value ? (value as Media) : null

/** Named sizes from the Media collection's image pipeline. */
export type ImageSize = 'card' | 'hero' | 'og' | 'thumbnail'

/**
 * URL for a generated size, falling back to the original.
 *
 * A size is missing whenever the source image was smaller than the target width — sharp does not
 * upscale — so the fallback is the normal path, not an error case.
 */
export const imageUrl = (media: Media | null, size?: ImageSize): null | string => {
  if (!media) return null

  const sized = size ? media.sizes?.[size]?.url : null

  return sized ?? media.url ?? null
}

/** Poster frame for a player: the shape `VideoEmbed` wants, or `null` if there is no image. */
export const posterFor = (
  candidates: unknown[],
  size: ImageSize,
): null | { alt: string; url: string } => {
  for (const candidate of candidates) {
    const media = asMedia(candidate)
    const url = imageUrl(media, size)

    if (media && url) return { alt: media.alt ?? '', url }
  }

  return null
}
