'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { YouTubeVideo } from '@/lib/youtube'

import { youtubeEmbedUrl, youtubeWatchUrl } from '@/lib/youtube'

import styles from './index.module.css'

export type VideoEmbedProps = {
  caption?: null | string
  /**
   * Our own poster frame. Deliberately not YouTube's `i.ytimg.com` still: hotlinking it would
   * contact Google on page load, which is exactly what the click-to-play below exists to avoid.
   */
  poster?: null | { alt: string; url: string }
  /** Accessible name for the play button and the iframe. */
  title: string
  video: YouTubeVideo
}

const PlayIcon = () => (
  <svg aria-hidden="true" focusable="false" height="26" viewBox="0 0 24 24" width="26">
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
)

/**
 * Click-to-play YouTube embed.
 *
 * The iframe is only mounted after a click, which keeps roughly a megabyte of player JavaScript
 * and a set of third-party cookies off the initial page load — the difference between meeting and
 * missing the LCP < 2.5s target in PRD §4.1 on an article whose hero *is* the video.
 */
export const VideoEmbed = ({ caption, poster, title, video }: VideoEmbedProps) => {
  const [playing, setPlaying] = useState(false)

  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        {playing ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className={styles.player}
            src={youtubeEmbedUrl(video, { autoplay: true })}
            title={title}
          />
        ) : (
          <button
            aria-label={`ভিডিও দেখুন: ${title}`}
            className={styles.trigger}
            onClick={() => setPlaying(true)}
            type="button"
          >
            {poster ? (
              <Image
                alt={poster.alt}
                className={styles.poster}
                fill
                // The player is capped at the article measure on desktop and full-bleed below it.
                sizes="(max-width: 800px) 100vw, 800px"
                src={poster.url}
              />
            ) : null}
            <span className={styles.badge}>
              <PlayIcon />
            </span>
          </button>
        )}
      </div>

      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}

      {/* Without JavaScript the button above cannot mount the player, so offer the way out. */}
      <noscript>
        <a className={styles.fallback} href={youtubeWatchUrl(video)} rel="noopener" target="_blank">
          ইউটিউবে ভিডিওটি দেখুন
        </a>
      </noscript>
    </figure>
  )
}
