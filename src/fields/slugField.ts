import type { TextField } from 'payload'

import { slugify } from '@/lib/slugify'

type SlugFieldOptions = {
  /** Field the slug is derived from when left blank. */
  from?: string
  /**
   * Slugs that would shadow a real route. `/[category]` sits at the site root alongside
   * `/article/...`, `/search`, `/tag/...` and `/author/...`, so a category slugged `search`
   * would make that route unreachable. Next resolves static segments first, which means the
   * breakage would be silent — hence blocking the collision at the point of authoring.
   */
  reserved?: string[]
  localized?: boolean
}

/**
 * Reusable slug field: derives from `from`, but never overwrites a value an editor typed.
 */
export const slugField = ({
  from = 'title',
  reserved = [],
  localized = false,
}: SlugFieldOptions = {}): TextField => ({
  name: 'slug',
  type: 'text',
  // Not `required`, deliberately: the hook below always populates it, and marking it required
  // would force every programmatic create (seeds, imports, tests) to duplicate that work. The
  // `validate` below still refuses to save an empty slug.
  unique: true,
  index: true,
  localized,
  admin: {
    position: 'sidebar',
    description: `Generated from ${from} when left blank. Changing this breaks existing links.`,
  },
  hooks: {
    beforeValidate: [
      ({ previousValue, siblingData, value }) => {
        // An explicit value still gets normalised, so a hand-typed slug is URL-safe too.
        if (typeof value === 'string' && value.trim()) return slugify(value)

        // `undefined` means the field was absent from the payload — a partial update such as
        // `PATCH { title }`. Re-deriving here would silently rewrite a live URL, so the stored
        // slug wins. An explicitly empty value (`''` from clearing the admin field) is different:
        // it falls through and regenerates, which is the affordance editors expect.
        if (value === undefined && typeof previousValue === 'string' && previousValue) {
          return previousValue
        }

        // With localization enabled this runs once per locale, and siblingData holds that
        // locale's values — so a Bangla title yields a Bangla slug and, later, an English
        // title yields an English one.
        const source = (siblingData as Record<string, unknown> | undefined)?.[from]
        if (typeof source === 'string' && source.trim()) return slugify(source)

        return value
      },
    ],
  },
  validate: (value: string | null | undefined) => {
    // Drafts skip validation by default, so this gates publishing rather than saving.
    if (typeof value !== 'string' || !value) {
      return `Could not generate a slug from ${from}. Please enter one manually.`
    }
    if (reserved.includes(value)) {
      return `"${value}" is reserved by a site route. Please choose a different slug.`
    }
    return true
  },
})
