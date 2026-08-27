import Image from 'next/image'
import Link from 'next/link'

import type { NavCategory } from '@/lib/queries'
import type { SiteSetting } from '@/payload-types'

import { asMedia, imageUrl } from '@/lib/media'
import { categoryHref, subcategoryHref, VIDEO_HREF } from '@/lib/urls'

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
}

/**
 * Site footer: the full category list as a sitemap-style column set, optional social links from
 * SiteSettings, and a copyright line. The year uses `bn-BD` so the numerals match every other date
 * on the site.
 */
export const SiteFooter = ({
  categories,
  settings,
}: {
  categories: NavCategory[]
  settings: SiteSetting
}) => {
  const year = new Date().getFullYear().toLocaleString('bn-BD', { useGrouping: false })
  const socials = (settings.socialLinks ?? []).filter((s) => s.url)
  const logo = asMedia(settings.logo)
  const logoUrl = imageUrl(logo, 'card')

  return (
    <footer className="mt-12 border-t border-line bg-wash">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((cat) => (
            <div key={cat.id}>
              <Link className="text-sm font-bold text-ink hover:text-brand" href={categoryHref(cat)}>
                {cat.name}
              </Link>
              {cat.children.length ? (
                <ul className="mt-2 space-y-1">
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        className="text-sm text-muted hover:text-brand"
                        href={subcategoryHref(cat.slug, child)}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <div>
            <Link className="text-sm font-bold text-ink hover:text-brand" href={VIDEO_HREF}>
              ভিডিও
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          {logoUrl ? (
            <Image alt={settings.siteName} height={48} src={logoUrl} width={192} />
          ) : (
            <p className="text-2xl font-extrabold text-brand">{settings.siteName}</p>
          )}
          {socials.length ? (
            <ul className="flex gap-4">
              {socials.map((s) => (
                <li key={s.id ?? s.url}>
                  <a
                    className="text-sm text-muted hover:text-brand"
                    href={s.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {SOCIAL_LABELS[s.platform] ?? s.platform}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.siteName}। সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p>
            Designed By{' '}
            <a
              className="font-semibold text-ink hover:text-brand"
              href="https://daltonchakma.vercel.app/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Dalton Chakma
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
