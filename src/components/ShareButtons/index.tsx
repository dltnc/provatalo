'use client'

import { useState } from 'react'

import type { MouseEvent } from 'react'

import { FacebookIcon, LinkIcon, TelegramIcon, WhatsAppIcon, XIcon } from '@/components/SocialIcons'

type ShareTarget = {
  href: string
  icon: typeof FacebookIcon
  label: string
  /** Hover fill in the platform's own colour — recognition beats a monochrome row. */
  hoverClass: string
}

const buildTargets = (url: string, title: string): ShareTarget[] => {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)

  return [
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      hoverClass: 'hover:bg-[#1877F2]',
      icon: FacebookIcon,
      label: 'ফেসবুকে শেয়ার করুন',
    },
    {
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      hoverClass: 'hover:bg-ink',
      icon: XIcon,
      label: 'এক্সে (X) শেয়ার করুন',
    },
    {
      // Text-first: WhatsApp threads put the blurb before the bare link.
      href: `https://wa.me/?text=${t}%20${u}`,
      hoverClass: 'hover:bg-[#25D366]',
      icon: WhatsAppIcon,
      label: 'হোয়াটসঅ্যাপে শেয়ার করুন',
    },
    {
      href: `https://t.me/share/url?url=${u}&text=${t}`,
      hoverClass: 'hover:bg-[#229ED9]',
      icon: TelegramIcon,
      label: 'টেলিগ্রামে শেয়ার করুন',
    },
  ]
}

/**
 * Share bar for article pages. Every target is a plain anchor so the links work without
 * JavaScript; the only interactive extra is the copy-link button. `url` must be absolute —
 * sharers reject relative hrefs.
 */
export const ShareButtons = ({ title, url }: { title: string; url: string }) => {
  const [copied, setCopied] = useState(false)
  const targets = buildTargets(url, title)

  const onCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied or unavailable API — leave the button as-is.
    }
  }

  return (
    <div className="flex items-center gap-2 border-y border-line py-3">
      <span className="me-1 text-sm font-semibold text-muted">শেয়ার:</span>
      {targets.map(({ href, hoverClass, icon: Icon, label }) => (
        <a
          aria-label={label}
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-line text-body transition-colors hover:border-transparent hover:text-white ${hoverClass}`}
          href={href}
          key={label}
          rel="noopener noreferrer"
          target="_blank"
          title={label}
        >
          <Icon />
        </a>
      ))}
      <button
        aria-label="লিংক কপি করুন"
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-line text-body transition-colors ${
          copied ? 'border-transparent bg-brand text-white' : 'hover:bg-wash'
        }`}
        onClick={onCopy}
        title={copied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}
        type="button"
      >
        <LinkIcon />
      </button>
    </div>
  )
}
