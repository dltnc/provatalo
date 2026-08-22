/**
 * One-off runtime verification for Phase 1 (plan items 5, 8 and 9): the REST surface, the
 * scheduled-publish job runner and its cron-secret guard. Run against a live dev server:
 *
 *   pnpm dev            # in another shell
 *   pnpm payload run ./scripts/verify-phase1.ts
 *
 * Self-cleaning: everything it creates is tagged and removed at the end.
 */
import 'dotenv/config'

import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '@/payload.config'

const MARKER = 'verify-phase1'
const ORIGIN = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET

const results: { ok: boolean; label: string; detail?: string }[] = []
const check = (ok: boolean, label: string, detail?: string) => {
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`)
}

const payload = await getPayload({ config: await config })

const cleanup = async () => {
  const users = await payload.find({
    collection: 'users',
    where: { email: { contains: `.${MARKER}@` } },
    limit: 100,
    depth: 0,
  })
  const ids = users.docs.map((doc) => doc.id)

  if (ids.length) {
    const articles = await payload.find({
      collection: 'articles',
      where: { author: { in: ids } },
      limit: 100,
      depth: 0,
    })
    for (const article of articles.docs) {
      await payload.delete({
        collection: 'audit-log',
        where: { documentId: { equals: String(article.id) } },
      })
      await payload.delete({
        collection: 'payload-jobs',
        where: { 'input.doc.value': { equals: String(article.id) } },
      })
    }
    await payload.delete({
      collection: 'articles',
      where: { author: { in: ids } },
      context: { disableRevalidate: true },
    })
  }

  await payload.delete({ collection: 'categories', where: { slug: { contains: MARKER } } })
  await payload.delete({ collection: 'media', where: { credit: { equals: MARKER } } })
  await payload.delete({ collection: 'users', where: { email: { contains: `.${MARKER}@` } } })
}

const lexical = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
        ],
      },
    ],
  },
})

await cleanup()

// --- fixtures ---------------------------------------------------------------

const editor = await payload.create({
  collection: 'users',
  data: {
    name: 'verify editor',
    email: `editor.${MARKER}@example.com`,
    password: 'verify-phase1-password',
    roles: ['editor'],
  },
})

const dir = await mkdtemp(path.join(tmpdir(), 'provatalo-verify-'))
const filePath = path.join(dir, 'fixture.png')
await writeFile(
  filePath,
  await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#123456' } })
    .png()
    .toBuffer(),
)

const media = await payload.create({
  collection: 'media',
  data: { alt: 'যাচাই ছবি', credit: MARKER },
  filePath,
})

const category = await payload.create({
  collection: 'categories',
  data: { name: 'যাচাই বিভাগ', slug: `verify-${MARKER}` },
})

const article = (title: string, published: boolean) => ({
  title,
  articleType: 'text' as const,
  content: lexical(title),
  featuredImage: media.id,
  category: category.id,
  author: editor.id,
  reviewState: 'drafting' as const,
  _status: (published ? 'published' : 'draft') as 'draft' | 'published',
})

const draft = await payload.create({
  collection: 'articles',
  data: article('যাচাই খসড়া প্রতিবেদন', false),
  context: { disableRevalidate: true },
})

const published = await payload.create({
  collection: 'articles',
  data: article('যাচাই প্রকাশিত প্রতিবেদন', true),
  context: { disableRevalidate: true },
})

// --- 5. draft leakage over REST --------------------------------------------

const list = await fetch(`${ORIGIN}/api/articles?limit=100&depth=0`)
const listBody = (await list.json()) as { docs?: { id: string; title?: string }[] }
const ids = (listBody.docs ?? []).map((doc) => String(doc.id))

check(list.status === 200, 'GET /api/articles responds 200', `status ${list.status}`)
check(!ids.includes(String(draft.id)), 'anonymous REST list omits the draft')
check(ids.includes(String(published.id)), 'anonymous REST list includes the published article')

const byId = await fetch(`${ORIGIN}/api/articles/${draft.id}`)
check(byId.status === 403 || byId.status === 404, 'anonymous REST read of a draft is refused', `status ${byId.status}`)

// --- 9. localization over REST ---------------------------------------------

const localized = await fetch(`${ORIGIN}/api/articles/${published.id}?locale=bn&depth=0`)
const localizedBody = (await localized.json()) as { title?: string }
check(
  localizedBody.title === 'যাচাই প্রকাশিত প্রতিবেদন',
  'GET ?locale=bn returns the Bangla title',
  String(localizedBody.title),
)

const raw = await payload.db.collections.articles
  .findOne({ _id: published.id })
  .lean<{ title?: unknown }>()
check(
  JSON.stringify(raw?.title) === JSON.stringify({ bn: 'যাচাই প্রকাশিত প্রতিবেদন' }),
  'Mongo stores title under the locale key',
  JSON.stringify(raw?.title),
)

// --- 8. scheduled publish + cron guard -------------------------------------

await payload.jobs.queue({
  task: 'schedulePublish',
  input: {
    type: 'publish',
    doc: { relationTo: 'articles', value: String(draft.id) },
    user: String(editor.id),
  },
  // Already due, so the very next run picks it up.
  waitUntil: new Date(Date.now() - 60_000),
})

const noAuth = await fetch(`${ORIGIN}/api/payload-jobs/run`)
check(noAuth.status === 401 || noAuth.status === 403, 'jobs run refuses an unauthenticated call', `status ${noAuth.status}`)

const wrongAuth = await fetch(`${ORIGIN}/api/payload-jobs/run`, {
  headers: { authorization: 'Bearer undefined' },
})
check(
  wrongAuth.status === 401 || wrongAuth.status === 403,
  'jobs run refuses a wrong bearer token',
  `status ${wrongAuth.status}`,
)

if (!CRON_SECRET) {
  check(false, 'CRON_SECRET is set in the environment', 'unset — skipping the positive path')
} else {
  const withSecret = await fetch(`${ORIGIN}/api/payload-jobs/run`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  })
  check(withSecret.status === 200, 'jobs run accepts the cron secret', `status ${withSecret.status}`)

  const after = await payload.findByID({ collection: 'articles', id: draft.id, depth: 0 })
  check(after._status === 'published', 'the scheduled article is now published', String(after._status))
  check(Boolean(after.publishedAt), 'publishedAt was stamped', String(after.publishedAt))
}

// --- report ----------------------------------------------------------------

await cleanup()

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
