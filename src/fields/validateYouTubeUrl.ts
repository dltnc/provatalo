import type { TextFieldSingleValidation } from 'payload'

import { parseYouTubeUrl } from '@/lib/youtube'

/**
 * Shared by the article-level video group and the in-body YouTube block.
 *
 * A custom `validate` replaces Payload's built-in one rather than running alongside it
 * (`fields/config/sanitize.js:153`), so the field's own `required` flag — which arrives spread into
 * the options object — has to be honoured here or declaring it would silently do nothing.
 */
export const validateYouTubeUrl: TextFieldSingleValidation = (value, { required }) => {
  if (!value) {
    return required ? 'A video article needs a YouTube link.' : true
  }

  if (!parseYouTubeUrl(value)) {
    return 'Not a YouTube link we recognise. Paste the address from the browser bar, a youtu.be share link, or the video id.'
  }

  return true
}
