'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { NavCategory } from '@/lib/queries'

import { SearchBox } from '@/components/SearchBox'
import { categoryHref, subcategoryHref, VIDEO_HREF } from '@/lib/urls'

/**
 * Small-screen navigation. The category tree is the same data the desktop bar renders; here it
 * collapses into a slide-over drawer behind a hamburger. Client-only because it owns open/close
 * state — the links inside are ordinary navigations that close the drawer on click.
 */
export const MobileNav = ({ categories }: { categories: NavCategory[] }) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-label="মেনু"
        className="flex h-10 w-10 items-center justify-center rounded-md text-white"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="sr-only">মেনু খুলুন</span>
        <svg aria-hidden fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <button aria-label="বন্ধ করুন" className="flex-1 bg-black/40" onClick={close} type="button" />
          <nav className="flex w-80 max-w-[85%] flex-col overflow-y-auto bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-lg font-bold text-ink">মেনু</span>
              <button aria-label="বন্ধ করুন" className="text-2xl leading-none text-muted" onClick={close} type="button">
                ×
              </button>
            </div>

            <div className="border-b border-line p-4">
              <SearchBox />
            </div>

            <ul className="flex flex-col p-2">
              <li>
                <Link className="block rounded px-3 py-2 font-semibold text-ink hover:bg-wash" href="/" onClick={close}>
                  হোম
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    className="block rounded px-3 py-2 font-semibold text-ink hover:bg-wash"
                    href={categoryHref(cat)}
                    onClick={close}
                  >
                    {cat.name}
                  </Link>
                  {cat.children.length ? (
                    <ul className="mb-1 ml-3 border-l border-line pl-2">
                      {cat.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            className="block rounded px-3 py-1.5 text-sm text-body hover:bg-wash"
                            href={subcategoryHref(cat.slug, child)}
                            onClick={close}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              <li>
                <Link className="block rounded px-3 py-2 font-semibold text-ink hover:bg-wash" href={VIDEO_HREF} onClick={close}>
                  ভিডিও
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
