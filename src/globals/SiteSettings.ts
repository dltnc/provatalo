import type { GlobalConfig } from 'payload'

import { isSuperAdmin } from '@/access/roles'

/**
 * Site-wide settings. PRD §3.5 restricts these to superadmins but never modelled the global.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: isSuperAdmin,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'defaultSeo',
      type: 'group',
      label: 'Default SEO',
      admin: {
        description: 'Fallbacks used when a page or article has no SEO values of its own.',
      },
      fields: [
        { name: 'metaTitle', type: 'text', localized: true },
        { name: 'metaDescription', type: 'textarea', localized: true },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['facebook', 'x', 'instagram', 'youtube'],
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'breakingTickerEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show the breaking news ticker',
      admin: {
        description: 'Master switch for the ticker, independent of any article flagged breaking.',
      },
    },
    {
      name: 'adsEnabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Serve advertisements',
      admin: {
        description: 'Kill switch for all ad slots. Off until the ad system ships in Phase 4.',
      },
    },
  ],
}
