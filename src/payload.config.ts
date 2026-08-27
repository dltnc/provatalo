import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
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
      /**
       * White-labeling: swap Payload's logo on the login screen for the Daily Provat Alo mark.
       * The sidebar icon (graphics.Icon) is left untouched on purpose.
       */
      graphics: {
        Logo: '@/components/admin/LoginLogo#LoginLogo',
      },
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
  plugins: [
    /**
     * Media lives in Cloudflare R2 in production — Vercel's filesystem is ephemeral, so anything
     * written to disk would vanish on the next deploy. R2 exposes an S3-compatible API, so this
     * goes through the S3 adapter (payloadcms.com/docs/upload/storage-adapters#s3-r2); the
     * dedicated @payloadcms/storage-r2 package is for Cloudflare Workers only. Full setup:
     * docs/deployment.md.
     *
     * Without R2 env vars (local dev) the plugin disables itself and uploads stay on local disk.
     */
    s3Storage({
      enabled: Boolean(process.env.R2_BUCKET),
      collections: {
        media: {
          /**
           * Media read access is public (src/collections/Media.ts), so there is nothing for
           * Payload's file-proxy access control to protect — serve files straight from the R2
           * domain instead of streaming every image through a serverless function.
           */
          disablePayloadAccessControl: true,
          // Every object key starts with this "directory": provatalo/<file>.
          prefix: 'provatalo',
          generateFileURL: ({ filename, prefix }) => {
            const key = prefix ? `${prefix}/${filename}` : filename
            return `${process.env.R2_PUBLIC_URL}/${key}`
          },
        },
      },
      bucket: process.env.R2_BUCKET,
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto', // R2 rejects real AWS regions
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true, // R2 uses path-style bucket addressing
      },
    }),
  ],
})
