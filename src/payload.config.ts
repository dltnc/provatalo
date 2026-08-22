import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Articles } from './collections/Articles'
import { AuditLog } from './collections/AuditLog'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      /**
       * Payload's own logout control is an unlabelled icon in the nav's bottom control strip.
       * This adds a labelled one among the collection links, where users look for it.
       */
      afterNavLinks: ['@/components/admin/LogoutNavLink#LogoutNavLink'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Articles, Categories, Tags, Media, Users, AuditLog],
  globals: [SiteSettings],
  /**
   * Bangla is the only live locale, but localization is enabled from the start so the storage
   * shape is already per-locale. Adding English later becomes a config change instead of a
   * migration, and it is what makes the hreflang requirement in PRD §3.4 achievable at all.
   */
  localization: {
    locales: [{ label: 'বাংলা', code: 'bn' }],
    defaultLocale: 'bn',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  jobs: {
    access: {
      /**
       * Scheduled publishing needs something to actually run the queue. On Vercel that is the
       * cron in vercel.json, which sends `Authorization: Bearer $CRON_SECRET` whenever the
       * CRON_SECRET env var is set. The secret is checked for presence first — otherwise an
       * unset variable would turn the literal header "Bearer undefined" into a valid key.
       */
      run: ({ req }) => {
        const secret = process.env.CRON_SECRET
        if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true

        // Logged-in admins can also trigger a run from the admin panel.
        return Boolean(req.user)
      },
    },
  },
  plugins: [],
})
