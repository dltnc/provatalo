import type { CollectionBeforeChangeHook } from 'payload'

import { readTimeMinutes } from '@/lib/readTime'

/**
 * Keeps `readTime` in sync with the article body.
 *
 * Implemented at collection level rather than as a field hook so that `originalDoc` is
 * available: a partial update that never mentions `content` would otherwise compute a read
 * time from `undefined` and quietly reset every article it touches to one minute.
 */
export const computeReadTime: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const content = data?.content ?? originalDoc?.content

  if (content) {
    data.readTime = readTimeMinutes(content)
  }

  return data
}
