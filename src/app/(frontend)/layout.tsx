import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

import { Noto_Sans_Bengali, Tiro_Bangla } from 'next/font/google'
import React from 'react'

import { BreakingTicker } from '@/components/BreakingTicker'
import { JsonLd } from '@/components/JsonLd'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { accentVariants } from '@/lib/color'
import { getBreakingArticles, getNavCategories, getSiteSettings } from '@/lib/queries'
import { organizationJsonLd, SITE_URL } from '@/lib/seo'

import './styles.css'

/**
 * Two-voice Bangla type system. Tiro Bangla (serif, weight 400 only) carries long-form reading —
 * article bodies — where its print heritage shines; Noto Sans Bengali keeps the UI chrome and
 * headlines on true bold weights instead of browser-synthesised ones (Tiro has no 700).
 */
const bengali = Noto_Sans_Bengali({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-bengali',
  display: 'swap',
})

const tiro = Tiro_Bangla({
  subsets: ['bengali', 'latin', 'latin-ext'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-tiro',
  display: 'swap',
})

const siteUrl = SITE_URL

export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getSiteSettings()
  const description = settings.defaultSeo?.metaDescription ?? undefined

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.defaultSeo?.metaTitle ?? settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description,
    openGraph: {
      type: 'website',
      locale: 'bn_BD',
      siteName: settings.siteName,
      title: settings.defaultSeo?.metaTitle ?? settings.siteName,
      description,
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, breaking] = await Promise.all([
    getSiteSettings(),
    getNavCategories(),
    getBreakingArticles(),
  ])

  // Admin-picked accent overrides the stylesheet tokens; inline style beats the `:root` block in
  // styles.css, and every brand utility reads these custom properties so nothing else changes.
  const accent = accentVariants(settings.accentColor)
  const accentVars = (accent
    ? ({
        '--color-brand': accent.base,
        '--color-brand-dark': accent.dark,
        '--color-brand-50': accent.tint,
      } as CSSProperties)
    : undefined)

  return (
    // The site is Bangla; screen readers pick their voice and pronunciation from this (PRD §4.4).
    <html lang="bn" className={`${bengali.variable} ${tiro.variable}`} style={accentVars}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader categories={categories} settings={settings} />
        <BreakingTicker articles={breaking} enabled={settings.breakingTickerEnabled} />
        <main className="flex-1">{children}</main>
        <SiteFooter categories={categories} settings={settings} />
        <JsonLd data={organizationJsonLd(settings)} />
      </body>
    </html>
  )
}
