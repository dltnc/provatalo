/**
 * YouTube URL parsing, shared by the CMS (validation) and the frontend (rendering).
 *
 * Editors paste whatever the YouTube UI hands them — a watch URL, a `youtu.be` share link, a
 * Shorts link, sometimes an embed snippet's src. Storing the raw string and parsing it in one
 * place means the admin can reject a broken link at authoring time and the frontend never has to
 * guess at a format.
 */

/** YouTube video ids are exactly 11 characters of `[A-Za-z0-9_-]`. */
const ID_PATTERN = /^[\w-]{11}$/

const WATCH_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be'])

/** Paths that carry the id as their next segment. `/v/` is the long-dead Flash player form. */
const ID_IN_PATH = ['/embed/', '/shorts/', '/live/', '/v/']

export type YouTubeVideo = {
  id: string
  /** Start offset in seconds, from `?t=` or `?start=`. */
  start?: number
}

/**
 * `t` arrives as either a bare second count (`90`, `90s`) or a duration (`1h2m3s`) depending on
 * where the editor copied the link from.
 */
const parseStart = (raw: null | string): number | undefined => {
  if (!raw) return undefined

  if (/^\d+s?$/.test(raw)) return Number(raw.replace(/s$/, '')) || undefined

  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw)
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) return undefined

  const seconds =
    Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0)

  return seconds || undefined
}

/**
 * Returns the video the URL points at, or `null` if it is not a YouTube link we can embed.
 *
 * A bare id is accepted too, since pasting just the id is a common habit. The trade-off is that
 * any 11-character word passes — which produces a dead embed rather than a security problem, and
 * is caught the moment the editor previews the article.
 */
export const parseYouTubeUrl = (input: unknown): YouTubeVideo | null => {
  if (typeof input !== 'string') return null

  const trimmed = input.trim()
  if (!trimmed) return null
  if (ID_PATTERN.test(trimmed)) return { id: trimmed }

  let url: URL
  try {
    // Editors paste `youtube.com/watch?v=…` without a scheme often enough to be worth handling.
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  let id: null | string = null

  if (SHORT_HOSTS.has(host)) {
    id = url.pathname.slice(1).split('/')[0] ?? null
  } else if (WATCH_HOSTS.has(host)) {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else {
      const prefix = ID_IN_PATH.find((candidate) => url.pathname.startsWith(candidate))
      if (prefix) id = url.pathname.slice(prefix.length).split('/')[0] ?? null
    }
  }

  if (!id || !ID_PATTERN.test(id)) return null

  const start = parseStart(url.searchParams.get('t') ?? url.searchParams.get('start'))

  return start ? { id, start } : { id }
}

/**
 * Player URL for an iframe.
 *
 * `youtube-nocookie.com` is deliberate: on the privacy-preserving host YouTube defers its
 * tracking cookies until playback starts, which is what makes the click-to-play embed honest
 * rather than cosmetic.
 */
export const youtubeEmbedUrl = (
  { id, start }: YouTubeVideo,
  { autoplay = false }: { autoplay?: boolean } = {},
): string => {
  const params = new URLSearchParams({
    modestbranding: '1',
    playsinline: '1',
    // Keep "related videos" inside this channel rather than sending readers off-site.
    rel: '0',
  })

  if (autoplay) params.set('autoplay', '1')
  if (start) params.set('start', String(start))

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

/** Canonical watch URL, for the no-JS fallback link and for structured data. */
export const youtubeWatchUrl = ({ id, start }: YouTubeVideo): string =>
  `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ''}`
