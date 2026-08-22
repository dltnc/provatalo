import type { Access, Where } from 'payload'

import { hasRole } from './roles'

/**
 * Constraints are declared as `Where` rather than inferred: TypeScript otherwise widens object
 * literals inside `or`/`and` arrays into a union carrying `?: undefined` members, which does not
 * satisfy Where's index signature.
 */
const PUBLISHED_ONLY: Where = { _status: { equals: 'published' } }

/**
 * Read access for articles.
 *
 * The anonymous branch is the important one: without it, unpublished articles are readable
 * through `GET /api/articles` and GraphQL, which the PRD's security section never states but
 * plainly intends. Drafts are gated on `_status` alone rather than also on `publishedAt` —
 * scheduled publishing flips `_status` when its job runs, and adding a date filter here would
 * make an article with an empty `publishedAt` vanish with no visible cause.
 */
export const canReadArticle: Access = ({ req }) => {
  if (!req.user) return PUBLISHED_ONLY

  if (hasRole(req.user, 'superadmin', 'editor')) return true

  // Reporters see the published site plus their own work — not each other's drafts.
  const ownWork: Where = { author: { equals: req.user.id } }
  return { or: [PUBLISHED_ONLY, ownWork] }
}

/**
 * Reporters may edit their own work up until it is published; after that it belongs to the
 * desk. `_status` is `changed` (not `published`) while a published doc has newer drafts, so
 * this still allows a reporter to revise a draft revision of their own published article.
 */
export const canUpdateArticle: Access = ({ req }) => {
  if (hasRole(req.user, 'superadmin', 'editor')) return true
  if (!req.user) return false

  const ownWork: Where = { author: { equals: req.user.id } }
  const notPublished: Where = { _status: { not_equals: 'published' } }

  return { and: [ownWork, notPublished] }
}
