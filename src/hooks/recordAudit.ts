import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

type AuditAction = 'created' | 'updated' | 'published' | 'unpublished' | 'deleted'

/** Top-level fields whose churn is noise in an audit trail. */
const IGNORED = new Set(['updatedAt', 'createdAt', 'readTime', 'viewCount'])

const changedFields = (doc: unknown, previous: unknown): string[] => {
  if (!doc || typeof doc !== 'object') return []
  if (!previous || typeof previous !== 'object') return []

  const next = doc as Record<string, unknown>
  const prior = previous as Record<string, unknown>

  return Object.keys(next).filter((key) => {
    if (IGNORED.has(key)) return false
    return JSON.stringify(next[key]) !== JSON.stringify(prior[key])
  })
}

const titleOf = (doc: unknown): string | undefined => {
  const title = (doc as { title?: unknown } | undefined)?.title
  return typeof title === 'string' ? title : undefined
}

/**
 * Writes the audit trail required by PRD §3.1 and §5.
 *
 * Only field *names* are recorded, not values: article bodies are large Lexical trees, and
 * snapshotting them on every save would grow the audit collection faster than the content
 * itself. Version history already holds the actual before/after content.
 */
export const recordAuditChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc?._status === 'published'

  let action: AuditAction = operation === 'create' ? 'created' : 'updated'
  if (!wasPublished && isPublished) action = 'published'
  else if (wasPublished && !isPublished) action = 'unpublished'

  await req.payload.create({
    collection: 'audit-log',
    data: {
      action,
      collectionSlug: collection.slug,
      documentId: String(doc?.id ?? ''),
      documentTitle: titleOf(doc),
      changedFields: changedFields(doc, previousDoc),
      user: req.user?.id ?? null,
    },
    // `req` keeps this inside the caller's transaction, so a failed write cannot leave an
    // audit entry describing a change that never landed.
    req,
    overrideAccess: true, // the collection refuses writes through the API by design
  })

  return doc
}

export const recordAuditDelete: CollectionAfterDeleteHook = async ({ collection, doc, req }) => {
  await req.payload.create({
    collection: 'audit-log',
    data: {
      action: 'deleted',
      collectionSlug: collection.slug,
      documentId: String(doc?.id ?? ''),
      documentTitle: titleOf(doc),
      changedFields: [],
      user: req.user?.id ?? null,
    },
    req,
    overrideAccess: true,
  })

  return doc
}
