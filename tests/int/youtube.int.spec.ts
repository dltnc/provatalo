import { describe, expect, it } from 'vitest'

import { parseYouTubeUrl, youtubeEmbedUrl, youtubeWatchUrl } from '@/lib/youtube'

/**
 * Unit coverage for the URL parser. It sits under tests/int because that is what the vitest
 * `include` glob matches; nothing here touches the database.
 */
const ID = 'dQw4w9WgXcQ'

describe('parseYouTubeUrl', () => {
  it.each([
    ['a watch URL', `https://www.youtube.com/watch?v=${ID}`],
    ['a watch URL with a playlist', `https://youtube.com/watch?v=${ID}&list=PLabc&index=2`],
    ['a scheme-less URL', `youtube.com/watch?v=${ID}`],
    ['a share link', `https://youtu.be/${ID}`],
    ['an embed URL', `https://www.youtube.com/embed/${ID}`],
    ['a Shorts URL', `https://www.youtube.com/shorts/${ID}`],
    ['a live URL', `https://www.youtube.com/live/${ID}`],
    ['a mobile URL', `https://m.youtube.com/watch?v=${ID}`],
    ['a nocookie embed', `https://www.youtube-nocookie.com/embed/${ID}`],
    ['a bare video id', ID],
    ['surrounding whitespace', `  https://youtu.be/${ID}  `],
  ])('reads the id from %s', (_label, input) => {
    expect(parseYouTubeUrl(input)?.id).toBe(ID)
  })

  it.each([
    ['seconds', 't=42', 42],
    ['seconds with a suffix', 't=90s', 90],
    ['a duration', 't=1h2m3s', 3723],
    ['minutes only', 't=2m', 120],
    ['the start parameter', 'start=15', 15],
  ])('reads a start offset from %s', (_label, query, expected) => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}?${query}`)?.start).toBe(expected)
  })

  it('leaves start undefined when there is no offset', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)?.start).toBeUndefined()
  })

  it.each([
    ['a look-alike host', `https://youtube.com.example.net/watch?v=${ID}`],
    ['a different host entirely', `https://example.com/watch?v=${ID}`],
    ['another video platform', 'https://vimeo.com/76979871'],
    ['an id of the wrong length', 'https://www.youtube.com/watch?v=tooshort'],
    ['a watch URL with no id', 'https://www.youtube.com/watch?list=PLabc'],
    ['prose', 'please embed the interview video'],
    ['an empty string', ''],
    ['whitespace', '   '],
    ['a non-string', null],
  ])('rejects %s', (_label, input) => {
    expect(parseYouTubeUrl(input)).toBeNull()
  })
})

describe('youtubeEmbedUrl', () => {
  it('uses the privacy-preserving host and does not autoplay by default', () => {
    const url = youtubeEmbedUrl({ id: ID })

    expect(url.startsWith(`https://www.youtube-nocookie.com/embed/${ID}?`)).toBe(true)
    expect(url).not.toContain('autoplay')
  })

  it('autoplays and seeks when asked', () => {
    const url = new URL(youtubeEmbedUrl({ id: ID, start: 42 }, { autoplay: true }))

    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('start')).toBe('42')
  })
})

describe('youtubeWatchUrl', () => {
  it('round-trips through the parser', () => {
    expect(parseYouTubeUrl(youtubeWatchUrl({ id: ID, start: 42 }))).toEqual({ id: ID, start: 42 })
  })
})
