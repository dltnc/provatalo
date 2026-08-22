// @vitest-environment node
//
// Node, not the project-wide jsdom: these exercise the Local API, and jsdom's Uint8Array comes
// from a different realm, which makes the upload pipeline's file-type detection throw.
import { randomUUID } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import { findVideoArticles } from '@/lib/content'
import config from '@/payload.config'

/**
 * Integration coverage for the security- and correctness-critical behaviours of Phase 1:
 * Bangla slug generation, draft leakage through the public API, and RBAC.
 *
 * These run against the configured database, so every fixture is tagged with MARKER and torn
 * down afterwards. A leftover fixture from a crashed run would break slug uniqueness, so the
 * teardown also runs before the suite.
 */
const MARKER = 'int-test'
const email = (who: string) => `${who}.${MARKER}@example.com`

let payload: Payload

let superadmin: User
let editor: User
let reporterA: User
let reporterB: User
let mediaId: string
let categoryId: string

/** Minimal valid Lexical document — richText is required on articles. */
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
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            version: 1,
          },
        ],
      },
    ],
  },
})

const createdArticleIds = new Set<string>()
const createdJobIds = new Set<string>()

type CreateArticleArgs = {
  title: string
  slug?: string
  /** Acting user. Omitted means an anonymous request. */
  user?: User
  published?: boolean
  /** Video articles carry a `video` group; text articles must not require one. */
  video?: { youtubeUrl: string }
}

/**
 * `_status` is passed through data rather than via the `draft: true` option on purpose: `draft`
 * skips validation, and these tests need the slug validator and required fields to actually run.
 */
const createArticle = async ({
  title,
  slug,
  user,
  published = false,
  video,
}: CreateArticleArgs) => {
  const doc = await payload.create({
    collection: 'articles',
    data: {
      title,
      ...(slug === undefined ? {} : { slug }),
      articleType: video ? 'video' : 'text',
      ...(video ? { video } : {}),
      content: lexical(title),
      featuredImage: mediaId,
      category: categoryId,
      author: (user?.id ?? superadmin.id) as string,
      reviewState: 'drafting',
      _status: published ? 'published' : 'draft',
    },
    user: user ?? superadmin,
    overrideAccess: false,
    // Revalidation is exercised in its own right by the app; here it would only emit a warning
    // per write, since revalidatePath has no Next request scope to work in.
    context: { disableRevalidate: true },
  })

  createdArticleIds.add(String(doc.id))
  return doc
}

const teardown = async () => {
  const req = { context: { disableRevalidate: true } } as const

  const users = await payload.find({
    collection: 'users',
    where: { email: { contains: `.${MARKER}@` } },
    limit: 100,
    depth: 0,
  })
  const userIds = users.docs.map((doc) => doc.id)

  if (userIds.length) {
    await payload.delete({
      collection: 'articles',
      where: { author: { in: userIds } },
      ...req,
    })
  }

  if (createdJobIds.size) {
    await payload.delete({
      collection: 'payload-jobs',
      where: { id: { in: [...createdJobIds] } },
    })
    createdJobIds.clear()
  }

  if (createdArticleIds.size) {
    await payload.delete({
      collection: 'audit-log',
      where: { documentId: { in: [...createdArticleIds] } },
    })
    createdArticleIds.clear()
  }

  await payload.delete({ collection: 'categories', where: { slug: { contains: MARKER } } })
  await payload.delete({ collection: 'media', where: { credit: { equals: MARKER } } })
  await payload.delete({ collection: 'users', where: { email: { contains: `.${MARKER}@` } } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  await teardown()

  const makeUser = (name: string, roles: User['roles']) =>
    payload.create({
      collection: 'users',
      data: { name, email: email(name), password: randomUUID(), roles },
    }) as Promise<User>

  superadmin = await makeUser('superadmin', ['superadmin'])
  editor = await makeUser('editor', ['editor'])
  reporterA = await makeUser('reportera', ['reporter'])
  reporterB = await makeUser('reporterb', ['reporter'])

  // A real (tiny) image, so the upload pipeline and image sizes run as they would in production.
  const dir = await mkdtemp(path.join(tmpdir(), 'provatalo-'))
  const filePath = path.join(dir, 'fixture.png')
  await writeFile(
    filePath,
    await sharp({
      create: { width: 1400, height: 900, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer(),
  )

  const media = await payload.create({
    collection: 'media',
    data: { alt: 'ফিক্সচার ছবি', credit: MARKER },
    filePath,
  })
  mediaId = String(media.id)

  const category = await payload.create({
    collection: 'categories',
    data: { name: 'রাজনীতি', slug: `politics-${MARKER}` },
  })
  categoryId = String(category.id)
})

afterAll(teardown)

describe('slugs', () => {
  it('derives a Bangla slug from a Bangla title', async () => {
    const article = await createArticle({ title: 'বাংলাদেশে আজকের খবর' })

    expect(article.slug).toBe('বাংলাদেশে-আজকের-খবর')
  })

  it('normalises a hand-typed slug instead of trusting it', async () => {
    const article = await createArticle({
      title: 'হাতে লেখা স্লাগ',
      slug: '  ২০২৬ সালের নির্বাচন!! ',
    })

    expect(article.slug).toBe('২০২৬-সালের-নির্বাচন')
  })

  it('keeps a manual slug when a later update omits it', async () => {
    const article = await createArticle({ title: 'পুরনো শিরোনাম', slug: 'manual-slug' })

    // A partial update, the shape a headless client sends. Re-deriving here would silently
    // change a published URL.
    const updated = await payload.update({
      collection: 'articles',
      id: article.id,
      data: { title: 'সম্পূর্ণ নতুন শিরোনাম' },
      user: superadmin,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })

    expect(updated.slug).toBe('manual-slug')
  })

  it('regenerates when the slug is explicitly cleared', async () => {
    const article = await createArticle({ title: 'প্রথম শিরোনাম', slug: 'to-be-cleared' })

    const updated = await payload.update({
      collection: 'articles',
      id: article.id,
      data: { title: 'দ্বিতীয় শিরোনাম', slug: '' },
      user: superadmin,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })

    expect(updated.slug).toBe('দ্বিতীয়-শিরোনাম')
  })

  it('rejects a category slug that would shadow a site route', async () => {
    // A ValidationError's top-level message only names the offending field; the reason lives in
    // the per-field errors.
    await expect(
      payload.create({
        collection: 'categories',
        data: { name: 'অনুসন্ধান', slug: 'search' },
      }),
    ).rejects.toMatchObject({
      data: { errors: [{ message: expect.stringMatching(/reserved/i) }] },
    })
  })
})

describe('draft visibility', () => {
  it('hides drafts from anonymous reads and reveals them once published', async () => {
    const article = await createArticle({ title: 'অপ্রকাশিত প্রতিবেদন', user: editor })

    const anonymous = () =>
      payload.find({
        collection: 'articles',
        where: { id: { equals: article.id } },
        overrideAccess: false,
        depth: 0,
      })

    expect((await anonymous()).totalDocs).toBe(0)

    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { _status: 'published' },
      user: editor,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })

    expect((await anonymous()).totalDocs).toBe(1)
  })

  it('refuses an anonymous read of a draft by id', async () => {
    const article = await createArticle({ title: 'আইডি দিয়ে খোঁজা ড্রাফট', user: editor })

    await expect(
      payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('stamps publishedAt on the first publish', async () => {
    const article = await createArticle({ title: 'প্রকাশের সময়', user: editor, published: true })

    expect(article.publishedAt).toBeTruthy()
  })
})

describe('RBAC', () => {
  it('lets a reporter create their own draft', async () => {
    const article = await createArticle({ title: 'রিপোর্টারের খসড়া', user: reporterA })

    expect(article._status).toBe('draft')
    expect(article.author).toBeTruthy()
  })

  it('stops a reporter publishing', async () => {
    const article = await createArticle({ title: 'প্রকাশের চেষ্টা', user: reporterA })

    await expect(
      payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'published' },
        user: reporterA,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow(/publish/i)
  })

  it('lets an editor publish', async () => {
    const article = await createArticle({ title: 'সম্পাদক প্রকাশ করছেন', user: reporterA })

    const published = await payload.update({
      collection: 'articles',
      id: article.id,
      data: { _status: 'published' },
      user: editor,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })

    expect(published._status).toBe('published')
  })

  it('stops a reporter unpublishing', async () => {
    const article = await createArticle({
      title: 'অপ্রকাশ করার চেষ্টা',
      user: editor,
      published: true,
    })

    // Denied by `canUpdateArticle` before the publish hook is even reached — a reporter has no
    // write access to a published article at all, which subsumes the unpublish case.
    await expect(
      payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'draft' },
        user: reporterA,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow(/not allowed/i)
  })

  it("hides one reporter's draft from another", async () => {
    const article = await createArticle({ title: 'বি-এর অদেখা খসড়া', user: reporterA })

    const asB = await payload.find({
      collection: 'articles',
      where: { id: { equals: article.id } },
      user: reporterB,
      overrideAccess: false,
      depth: 0,
    })

    expect(asB.totalDocs).toBe(0)

    const asA = await payload.find({
      collection: 'articles',
      where: { id: { equals: article.id } },
      user: reporterA,
      overrideAccess: false,
      depth: 0,
    })

    expect(asA.totalDocs).toBe(1)
  })

  it("stops a reporter editing another reporter's draft", async () => {
    const article = await createArticle({ title: 'বি সম্পাদনা করতে পারবে না', user: reporterA })

    await expect(
      payload.update({
        collection: 'articles',
        id: article.id,
        data: { title: 'ছিনতাই করা শিরোনাম' },
        user: reporterB,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow()
  })

  it('stops a reporter self-promoting', async () => {
    await payload.update({
      collection: 'users',
      id: reporterA.id,
      data: { roles: ['superadmin'], name: 'reportera renamed' },
      user: reporterA,
      overrideAccess: false,
    })

    const after = await payload.findByID({ collection: 'users', id: reporterA.id, depth: 0 })

    // The roles field is stripped by field-level access; the rest of the update still lands.
    expect(after.roles).toEqual(['reporter'])
    expect(after.name).toBe('reportera renamed')
  })

  it('stops a reporter deleting an article', async () => {
    const article = await createArticle({ title: 'মুছে ফেলার চেষ্টা', user: reporterA })

    await expect(
      payload.delete({
        collection: 'articles',
        id: article.id,
        user: reporterA,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow()
  })
})

describe('audit log', () => {
  it('records a publish and refuses writes through access control', async () => {
    const article = await createArticle({ title: 'নিরীক্ষা লগ পরীক্ষা', user: editor })

    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { _status: 'published' },
      user: editor,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })

    const entries = await payload.find({
      collection: 'audit-log',
      where: {
        and: [{ documentId: { equals: String(article.id) } }, { action: { equals: 'published' } }],
      },
      depth: 0,
    })

    expect(entries.totalDocs).toBe(1)

    await expect(
      payload.create({
        collection: 'audit-log',
        data: {
          action: 'deleted',
          collectionSlug: 'articles',
          documentId: String(article.id),
        },
        user: superadmin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('is unreadable by an editor', async () => {
    await expect(
      payload.find({ collection: 'audit-log', user: editor, overrideAccess: false }),
    ).rejects.toThrow()
  })
})

describe('publishing from server-side code', () => {
  it('allows a publish with no acting user', async () => {
    // Seeds, migrations and the schedulePublish job all run without a user. The publish guard
    // must not treat that as a reporter, or scheduled publishing fails permanently.
    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'সার্ভার সাইড প্রকাশ',
        articleType: 'text',
        content: lexical('সার্ভার সাইড প্রকাশ'),
        featuredImage: mediaId,
        category: categoryId,
        author: superadmin.id,
        reviewState: 'drafting',
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })
    createdArticleIds.add(String(article.id))

    expect(article._status).toBe('published')
  })

  it('publishes a scheduled article when the queue runs', async () => {
    const article = await createArticle({ title: 'নির্ধারিত সময়ে প্রকাশ', user: editor })

    const job = await payload.jobs.queue({
      task: 'schedulePublish',
      input: {
        type: 'publish',
        doc: { relationTo: 'articles', value: String(article.id) },
        user: String(editor.id),
      },
      // Already due, so the next run picks it up.
      waitUntil: new Date(Date.now() - 60_000),
    })
    createdJobIds.add(String(job.id))

    await payload.jobs.run()

    const after = await payload.findByID({ collection: 'articles', id: article.id, depth: 0 })

    expect(after._status).toBe('published')
    expect(after.publishedAt).toBeTruthy()
  })
})

describe('video articles', () => {
  const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

  /**
   * `createArticle` derives `articleType` from the presence of `video`. These cases need the two
   * decoupled — a video article whose link is missing or unusable — so they build data directly.
   */
  const videoData = (title: string, youtubeUrl?: string) => ({
    title,
    articleType: 'video' as const,
    ...(youtubeUrl === undefined ? {} : { video: { youtubeUrl } }),
    content: lexical(title),
    featuredImage: mediaId,
    category: categoryId,
    author: editor.id as string,
    reviewState: 'drafting' as const,
  })

  /**
   * Which layer refused matters here, and the message cannot tell you: `youtubeUrl`'s label is
   * literally "YouTube link", and `ValidationError` appends the label of every offending field to
   * its message. `name` can — `ValidationError` extends `APIError`, so a plain `APIError` is the
   * collection hook, and that is the guard these tests exist to pin down.
   */
  const rejection = async (promise: Promise<unknown>): Promise<Error> => {
    try {
      await promise
    } catch (error) {
      return error as Error
    }

    throw new Error('expected the write to be refused')
  }

  it('publishes with a usable YouTube link', async () => {
    const article = await createArticle({
      title: 'ভিডিও প্রতিবেদন',
      user: editor,
      published: true,
      video: { youtubeUrl: VALID_URL },
    })

    expect(article.articleType).toBe('video')
    expect(article.video?.youtubeUrl).toBe(VALID_URL)
  })

  it('leaves text articles alone', async () => {
    // `youtubeUrl` is required, and only the group's `admin.condition` stops that from applying to
    // every article. If the condition ever regresses, nothing text-shaped publishes again.
    const article = await createArticle({ title: 'ভিডিওহীন প্রতিবেদন', user: editor, published: true })

    expect(article.articleType).toBe('text')
  })

  it('refuses to publish a video article with no link', async () => {
    const error = await rejection(
      payload.create({
        collection: 'articles',
        data: { ...videoData('লিঙ্ক ছাড়া ভিডিও'), _status: 'published' },
        user: editor,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    )

    // Collection `beforeChange` runs ahead of field validation, so the hook is what the caller sees.
    expect(error.name).toBe('APIError')
    expect(error.message).toMatch(/YouTube link/i)
  })

  it('refuses to publish a link it cannot parse', async () => {
    const error = await rejection(
      payload.create({
        collection: 'articles',
        data: { ...videoData('ভুল লিঙ্ক', 'https://vimeo.com/76979871'), _status: 'published' },
        user: editor,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    )

    expect(error.name).toBe('APIError')
    expect(error.message).toMatch(/YouTube link/i)
  })

  it('saves an unfinished video article as a draft', async () => {
    // `draft: true` is the admin's Save-draft path: a reporter must be able to park a video story
    // before they have the link.
    const article = await payload.create({
      collection: 'articles',
      data: videoData('অসম্পূর্ণ ভিডিও খসড়া'),
      draft: true,
      user: editor,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })
    createdArticleIds.add(String(article.id))

    expect(article._status).toBe('draft')
    expect(article.video?.youtubeUrl).toBeFalsy()
  })

  it('refuses a partial update that empties the link of a published article', async () => {
    const article = await createArticle({
      title: 'প্রকাশিত ভিডিও সম্পাদনা',
      user: editor,
      published: true,
      video: { youtubeUrl: VALID_URL },
    })

    // No `articleType` in this payload, so the group's condition is false and Payload skips the
    // field validator entirely. The collection hook is the only thing between this write and a
    // published video article with no video.
    const error = await rejection(
      payload.update({
        collection: 'articles',
        id: article.id,
        data: { video: { youtubeUrl: '' } },
        user: editor,
        overrideAccess: false,
        context: { disableRevalidate: true },
      }),
    )

    expect(error.name).toBe('APIError')
    expect(error.message).toMatch(/YouTube link/i)

    const after = await payload.findByID({ collection: 'articles', id: article.id, depth: 0 })

    expect(after.video?.youtubeUrl).toBe(VALID_URL)
  })

  it('lists published video articles and nothing else', async () => {
    const published = await createArticle({
      title: 'তালিকায় থাকা ভিডিও',
      user: editor,
      published: true,
      video: { youtubeUrl: VALID_URL },
    })
    const draft = await createArticle({
      title: 'তালিকার বাইরে থাকা ভিডিও খসড়া',
      user: editor,
      video: { youtubeUrl: VALID_URL },
    })
    const text = await createArticle({
      title: 'তালিকার বাইরে থাকা লেখা',
      user: editor,
      published: true,
    })

    const slugs = (await findVideoArticles()).map((doc) => doc.slug)

    expect(slugs).toContain(published.slug)
    expect(slugs).not.toContain(draft.slug)
    expect(slugs).not.toContain(text.slug)
  })

  it('rejects a category slug that would shadow /video', async () => {
    await expect(
      payload.create({
        collection: 'categories',
        data: { name: 'ভিডিও', slug: 'video' },
      }),
    ).rejects.toMatchObject({
      data: { errors: [{ message: expect.stringMatching(/reserved/i) }] },
    })
  })
})

describe('localization', () => {
  it('stores localized text under the locale key', async () => {
    const article = await createArticle({ title: 'স্থানীয়করণ পরীক্ষা' })

    const raw = await payload.db.collections.articles
      .findOne({ _id: article.id })
      .lean<{ title?: unknown }>()

    expect(raw?.title).toEqual({ bn: 'স্থানীয়করণ পরীক্ষা' })
  })

  it('computes read time from the body', async () => {
    const article = await createArticle({ title: 'পড়ার সময় পরীক্ষা' })

    expect(article.readTime).toBe(1)
  })
})
