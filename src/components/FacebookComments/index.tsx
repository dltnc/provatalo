'use client'

import { useEffect, useRef } from 'react'

const SDK_VERSION = 'v23.0'

declare global {
  interface Window {
    FB?: {
      XFBML: { parse: (element?: HTMLElement) => void }
    }
  }
}

/**
 * Facebook comments plugin (PRD §3.3 deferred comments to a third-party embed rather than
 * building our own moderation stack).
 *
 * The SDK is injected on mount and the XFBML markup below it parsed by the plugin itself. When no
 * App ID is configured in SiteSettings the parent renders nothing at all — an anonymous SDK load
 * would still work but posts would land in an unmoderatable void, so we treat "no app id" as
 * "comments off".
 */
export const FacebookComments = ({
  appId,
  numPosts = 10,
  url,
}: {
  appId: string
  numPosts?: number
  /** Absolute canonical URL of the article — Facebook keys threads to this. */
  url: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // The plugin only re-parses XFBML at script boot; if the SDK arrived earlier (client-side
    // navigation between articles) we must parse our new node ourselves.
    const parseExisting = () => {
      if (typeof window !== 'undefined' && window.FB && containerRef.current) {
        window.FB.XFBML.parse(containerRef.current)
      }
    }

    if (document.getElementById('facebook-jssdk')) {
      parseExisting()
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.id = 'facebook-jssdk'
    script.onload = parseExisting
    script.src = `https://connect.facebook.net/bn_BD/sdk.js#xfbml=1&version=${SDK_VERSION}&appId=${encodeURIComponent(appId)}`
    document.head.appendChild(script)
  }, [appId])

  return (
    <div ref={containerRef}>
      <div
        className="fb-comments"
        data-colorscheme="light"
        data-href={url}
        data-numposts={String(numPosts)}
        data-width="100%"
      />
    </div>
  )
}
