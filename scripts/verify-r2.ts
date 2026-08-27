/**
 * Checks that media uploads really land in Cloudflare R2 and are publicly served — the part of
 * docs/deployment.md §3 that only fails once someone tries to upload a file.
 *
 *   pnpm payload run ./scripts/verify-r2.ts
 *
 * Self-cleaning: the document it uploads (and every generated size) is deleted at the end. Safe to
 * run against production, though it does briefly write objects to the bucket.
 */
import 'dotenv/config'

import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '@/payload.config'

const MARKER = 'verify-r2'

const results: { ok: boolean; label: string; detail?: string }[] = []
const check = (ok: boolean, label: string, detail?: string) => {
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`)
}

// --- environment ------------------------------------------------------------

const PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')

for (const name of [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL',
] as const) {
  // Values are secrets in three of these five cases, so only presence is reported.
  check(Boolean(process.env[name]), `${name} is set`)
}

if (!process.env.R2_BUCKET) {
  console.log('\nR2_BUCKET is unset, so the storage adapter disables itself and uploads stay on')
  console.log('local disk. That is the intended local-dev behaviour — nothing else to verify.')
  process.exit(1)
}

const payload = await getPayload({ config: await config })

// --- the adapter is actually attached to the collection ---------------------

const upload = payload.collections.media?.config.upload

check(
  Boolean(upload?.disableLocalStorage),
  'the media collection no longer writes to local disk',
  `disableLocalStorage: ${String(upload?.disableLocalStorage)}`,
)

// --- upload ----------------------------------------------------------------

await payload.delete({ collection: 'media', where: { credit: { equals: MARKER } } })

const dir = await mkdtemp(path.join(tmpdir(), 'provatalo-r2-'))
const filePath = path.join(dir, `${MARKER}-${process.pid}.png`)
await writeFile(
  filePath,
  await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#0f766e' } })
    .png()
    .toBuffer(),
)

const media = await payload.create({
  collection: 'media',
  data: { alt: 'আর টু যাচাই', credit: MARKER },
  filePath,
})

check(Boolean(media.url), 'the upload succeeded', String(media.url))
check(
  Boolean(PUBLIC_URL && media.url?.startsWith(`${PUBLIC_URL}/provatalo/`)),
  'the stored URL points at the R2 public domain, under the provatalo/ prefix',
  String(media.url),
)

// Generated sizes are separate objects; a URL that came out right for the original but wrong for
// the sizes would break every card and hero on the site while the admin thumbnail looked fine.
const sizes = Object.entries(media.sizes ?? {})
const badSizes = sizes.filter(
  ([, size]) => size?.url && !size.url.startsWith(`${PUBLIC_URL}/provatalo/`),
)
check(
  sizes.length > 0 && badSizes.length === 0,
  `all ${sizes.length} generated sizes resolve to R2`,
  badSizes.length ? badSizes.map(([name]) => name).join(', ') : undefined,
)

// --- the public domain actually serves it ----------------------------------

if (media.url) {
  const head = await fetch(media.url, { method: 'HEAD' })
  check(
    head.ok,
    'the file is publicly readable over HTTPS',
    `status ${head.status}${head.ok ? `, ${head.headers.get('content-type')}` : ' — is public access enabled on the bucket?'}`,
  )
}

// --- cleanup ---------------------------------------------------------------

await payload.delete({ collection: 'media', where: { credit: { equals: MARKER } } })

if (media.url) {
  const afterDelete = await fetch(media.url, { method: 'HEAD' })
  check(
    afterDelete.status === 404 || afterDelete.status === 403,
    'deleting the document removed the object from the bucket',
    `status ${afterDelete.status}`,
  )
}

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
