import type { CollectionConfig } from 'payload'

import { isEditorOrAbove } from '@/access/roles'
import { slugField } from '@/fields/slugField'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
  },
  access: {
    read: () => true,
    // Reporters can tag their own drafts by picking existing tags, but creating taxonomy is a
    // desk decision — otherwise the tag list fragments into near-duplicates within a week.
    create: isEditorOrAbove,
    update: isEditorOrAbove,
    delete: isEditorOrAbove,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    // Tags live under /tag/[slug], so they are not in the root namespace and need no
    // reserved-slug guard.
    slugField({ from: 'name', localized: true }),
  ],
}
