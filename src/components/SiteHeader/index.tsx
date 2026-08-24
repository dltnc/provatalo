import Image from 'next/image'
import Link from 'next/link'

import type { NavCategory } from '@/lib/queries'
import type { SiteSetting } from '@/payload-types'

import { MobileNav } from '@/components/MobileNav'
import { SearchBox } from '@/components/SearchBox'
import { formatDate } from '@/lib/format'
import { asMedia, imageUrl } from '@/lib/media'
import { categoryHref, subcategoryHref, VIDEO_HREF } from '@/lib/urls'

/**
 * Masthead + primary navigation. The brand row carries the logo and the day's date (Bangla
 * numerals, matching the rest of the site); the red bar below is the category nav, with
 * subcategories in a hover/focus dropdown on desktop and folded into the drawer on mobile.
 */
export const SiteHeader = ({
  categories,
  settings,
}: {
  categories: NavCategory[]
  settings: SiteSetting
}) => {
  const logo = asMedia(settings.logo)
  const logoUrl = imageUrl(logo, 'card')
  const today = formatDate(new Date())

  return (
    <header className="border-b border-line bg-surface">
      {/* Brand row */}
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <div className="lg:hidden">
          {/* Spacer balances the mobile hamburger so the logo stays centred-ish */}
        </div>
        <Link className="flex items-center gap-2" href="/">
          {logoUrl ? (
            <Image alt={settings.siteName} height={40} src={logoUrl} width={160} priority />
          ) : (
            <span className="text-2xl font-extrabold tracking-tight text-brand">
              {settings.siteName}
            </span>
          )}
        </Link>
        {today ? (
          <span className="ml-auto hidden text-sm text-muted md:block">{today}</span>
        ) : null}
        <div className="ml-auto hidden w-72 md:block lg:ml-6">
          <SearchBox />
        </div>
      </div>

      {/* Nav bar */}
      <div className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center px-4">
          <MobileNav categories={categories} />

          <nav className="hidden lg:block">
            <ul className="flex items-stretch">
              <li>
                <Link className="block px-3 py-3 text-sm font-semibold hover:bg-brand-dark" href="/">
                  হোম
                </Link>
              </li>
              {categories.map((cat) => (
                <li className="group relative" key={cat.id}>
                  <Link
                    className="block px-3 py-3 text-sm font-semibold hover:bg-brand-dark"
                    href={categoryHref(cat)}
                  >
                    {cat.name}
                  </Link>
                  {cat.children.length ? (
                    <ul className="invisible absolute left-0 top-full z-40 min-w-44 border border-line bg-white py-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      {cat.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            className="block px-4 py-2 text-sm text-ink hover:bg-wash"
                            href={subcategoryHref(cat.slug, child)}
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
                <Link className="block px-3 py-3 text-sm font-semibold hover:bg-brand-dark" href={VIDEO_HREF}>
                  ভিডিও
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
