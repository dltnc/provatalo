/**
 * Slug generation for Bangla content.
 *
 * The usual slugify approach - strip everything that is not `[a-z0-9]` - produces an empty
 * string for every Bangla title, so slugs have to be Unicode-aware here. Bangla
 * (U+0980-U+09FF) is preserved as-is, including Bangla digits (U+09E6-U+09EF), and the
 * resulting slug is stored raw. Next.js percent-encodes it on the way into a URL and decodes
 * it in route params, so no transliteration step is needed.
 *
 * The character classes below use hex escapes rather than literal characters: the
 * invisible-character range is impossible to review when spelled out literally.
 */

/** Anything outside the Bangla block and Latin alphanumerics becomes a separator. */
const NON_SLUG = /[^\u0980-\u09FFa-z0-9]+/g

/**
 * ZWSP, ZWNJ, ZWJ and BOM. Invisible, but common in pasted Bangla text, and leaving them in
 * produces slugs that look identical yet compare as different.
 */
const INVISIBLE = /[\u200B-\u200D\uFEFF]/g

/**
 * Convert a title into a URL slug. Returns an empty string when the input contains nothing
 * sluggable (only punctuation or emoji, say) - callers should treat that as a validation
 * failure rather than inventing a slug, so editors never end up with a mystery URL.
 */
export const slugify = (input: string): string =>
  input
    .normalize('NFC')
    // Only affects Latin characters; Bangla is caseless.
    .toLowerCase()
    .replace(INVISIBLE, '')
    .replace(NON_SLUG, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
