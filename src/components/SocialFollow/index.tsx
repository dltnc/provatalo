import Link from 'next/link'

import type { SiteSetting } from '@/payload-types'

import { InstagramIcon, XIcon, YouTubeIcon, FacebookIcon } from '@/components/SocialIcons'

import { formatFollowers } from '@/lib/format'

type SocialPlatform = NonNullable<SiteSetting['socialLinks']>[number]['platform']

const SOCIAL_ICONS: Partial<Record<SocialPlatform, typeof FacebookIcon>> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  x: XIcon,
  youtube: YouTubeIcon,
}

/** Hover fills in each platform's own colour, matching the article share bar. */
const SOCIAL_COLORS: Record<string, string> = {
  facebook: 'hover:bg-[#1877F2]',
  instagram: 'hover:bg-[#E4405F]',
  x: 'hover:bg-ink',
  youtube: 'hover:bg-[#FF0000]',
}

/**
 * "Follow us" card for the homepage sidebar. Counts are the admin-maintained `followers` values
 * from SiteSettings — entries without a count still render as a plain follow link, and an
 * entirely unconfigured settings global renders nothing so the sidebar never shows a stub.
 */
export const SocialFollow = ({ settings }: { settings: SiteSetting }) => {
  const socials = (settings.socialLinks ?? []).filter((s) => s.url)
  if (socials.length === 0) return null

  return (
    <section className="mb-8 rounded-lg border border-line bg-wash p-5">
      <h2 className="text-base font-extrabold text-ink">আমাদের ফলো করুন</h2>
      <p className="mt-1 text-sm text-muted">
        সর্বশেষ সংবাদ ও ভিডিও সবার আগে পেতে আমাদের সোশ্যাল মিডিয়ায় যুক্ত থাকুন।
      </p>

      <ul className="mt-4 space-y-2">
        {socials.map((s) => {
          const Icon = SOCIAL_ICONS[s.platform]
          const followers = formatFollowers(s.followers ?? null)

          return (
            <li key={s.id ?? s.url}>
              <Link
                className="group flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 transition-colors hover:border-brand/30"
                href={s.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {Icon ? (
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-body transition-colors group-hover:border-transparent group-hover:text-white ${
                      SOCIAL_COLORS[s.platform] ?? 'group-hover:bg-brand'
                    }`}
                  >
                    <Icon height={16} width={16} />
                  </span>
                ) : null}
                <span className="flex-1 leading-tight">
                  <span className="block text-sm font-semibold capitalize text-ink">
                    {s.platform}
                  </span>
                  {followers ? (
                    <span className="block text-xs text-muted">{followers} ফলোয়ার</span>
                  ) : (
                    <span className="block text-xs text-muted">ফলো করুন</span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
