import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import { hasRole } from '@/access/roles'

/**
 * Reporters may write and submit, but not publish (PRD §3.1).
 *
 * This is enforced in a hook rather than as field access on `_status`, because `_status` is
 * injected by Payload's drafts feature and is not ours to attach access control to. Blocking
 * the transition also covers unpublishing, which is equally destructive.
 */
export const enforcePublishPermission: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  // No acting user means trusted server-side code: a seed script, a migration, or the
  // `schedulePublish` job when it was queued without one. An anonymous *API* request never
  // reaches here — `create` requires authentication and `update` denies anonymous outright — so
  // this is not a hole, and without it scheduled publishing would fail permanently.
  if (!req.user) return data

  const wasPublished = originalDoc?._status === 'published'
  const willBePublished = data?._status === 'published'

  const isTransition = wasPublished !== willBePublished

  if (isTransition && !hasRole(req.user, 'superadmin', 'editor')) {
    throw new APIError(
      willBePublished
        ? 'Only editors and superadmins can publish an article. Set the review state to "in-review" to submit it to the desk.'
        : 'Only editors and superadmins can unpublish an article.',
      403,
    )
  }

  return data
}
