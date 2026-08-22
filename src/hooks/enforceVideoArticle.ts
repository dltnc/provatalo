import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import { parseYouTubeUrl } from '@/lib/youtube'

/**
 * A published video article must actually have a playable video.
 *
 * The `video` group already carries `admin.condition`, and Payload honours conditions server-side
 * by skipping validation for the fields a false condition hides
 * (`fields/hooks/beforeChange/promise.js:43`). That is the behaviour we want in the admin — it is
 * what keeps a required `youtubeUrl` from blocking every text article — but it also means a partial
 * write such as `PATCH { video: { youtubeUrl: '' } }`, which carries no `articleType`, fails the
 * condition and slips past the field validator entirely. This hook sees the merged document, so it
 * closes that path.
 *
 * It only fires when the result is published: a half-finished video story must still be saveable
 * as a draft.
 */
export const enforceVideoArticle: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  // `_status` is only present in `data` when the caller is explicitly saving a draft or
  // publishing (`collections/operations/utilities/update.js`), so an ordinary edit of a published
  // article carries no status at all — hence the fallback to the stored one.
  const status = data?._status ?? originalDoc?._status
  if (status !== 'published') return data

  // A shallow merge is enough: `video` is a group, so a write that touches any part of it sends
  // the whole group, and one that touches none leaves the stored value in place.
  const articleType = data?.articleType ?? originalDoc?.articleType
  if (articleType !== 'video') return data

  const youtubeUrl = (data?.video ?? originalDoc?.video)?.youtubeUrl

  if (!parseYouTubeUrl(youtubeUrl)) {
    throw new APIError(
      'A video article needs a valid YouTube link before it can be published. Add one, or switch the article type back to Text.',
      400,
    )
  }

  return data
}
