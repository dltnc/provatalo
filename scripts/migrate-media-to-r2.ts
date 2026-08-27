/**
 * Pushes media that only exists on local disk up to Cloudflare R2.
 *
 *   pnpm payload run ./scripts/migrate-media-to-r2.ts
 *
 * Why this is needed: the S3 adapter generates `url` at *read* time from `R2_PUBLIC_URL`, so the
 * moment R2 is switched on, every pre-existing media document starts reporting an R2 URL — whether
 * or not its bytes were ever uploaded. Documents created before the switch therefore look migrated
 * and 404 in the browser. This re-uploads each one through Payload itself (rather than an S3 client
 * of its own), so the object keys and the regenerated image sizes match exactly what a real admin
 * upload would produce.
 *
 * Idempotent: anything already readable over HTTPS is skipped.
 */
import 'dotenv/config'

import { access } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '@/payload.config'

if (!process.env.R2_BUCKET) {
  console.log('R2_BUCKET is unset — the storage adapter is disabled and uploads are already local.')
  process.exit(1)
}

const payload = await getPayload({ config: await config })

// Where local-disk uploads were written, per the Media collection's default `staticDir`.
const MEDIA_DIR = path.resolve(process.cwd(), 'media')

const { docs } = await payload.find({ collection: 'media', limit: 500, depth: 0 })

let uploaded = 0
let skipped = 0
let missing = 0
let failed = 0

for (const doc of docs) {
  const label = doc.filename ?? String(doc.id)

  if (!doc.url || !doc.filename) {
    console.log(` skip   ${label} — no filename or URL`)
    skipped++
    continue
  }

  const head = await fetch(doc.url, { method: 'HEAD' })
  if (head.ok) {
    console.log(` skip   ${label} — already in the bucket`)
    skipped++
    continue
  }

  const filePath = path.join(MEDIA_DIR, doc.filename)
  try {
    await access(filePath)
  } catch {
    // Nothing to upload and nothing serving it: the document needs a fresh file from an editor.
    console.log(` GONE   ${label} — not in the bucket and not in media/, re-upload it by hand`)
    missing++
    continue
  }

  try {
    // Passing `filePath` makes Payload re-run its upload pipeline: the original plus every size in
    // `imageSizes` goes through the enabled storage adapter.
    await payload.update({
      collection: 'media',
      id: doc.id,
      data: {},
      filePath,
      context: { disableRevalidate: true },
    })

    const after = await payload.findByID({ collection: 'media', id: doc.id, depth: 0 })
    const recheck = after.url ? await fetch(after.url, { method: 'HEAD' }) : undefined

    if (recheck?.ok) {
      console.log(`  ok    ${label} → ${after.url}`)
      uploaded++
    } else {
      console.log(` FAIL   ${label} — uploaded but still not readable (status ${recheck?.status})`)
      failed++
    }
  } catch (error) {
    console.log(` FAIL   ${label} — ${error instanceof Error ? error.message : String(error)}`)
    failed++
  }
}

console.log(
  `\n${uploaded} uploaded, ${skipped} already present, ${missing} missing locally, ${failed} failed`,
)
process.exit(failed || missing ? 1 : 0)
