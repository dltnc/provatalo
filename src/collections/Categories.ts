import type { CollectionConfig } from 'payload'

import { isEditorOrAbove } from '@/access/roles'
import { slugField } from '@/fields/slugField'
import { RESERVED_ROOT_SLUGS } from '@/lib/reservedSlugs'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'parentCategory', 'displayOrder'],
    group: 'Content',
  },
  access: {
    read: () => true,
    create: isEditorOrAbove,
    update: isEditorOrAbove,
    delete: isEditorOrAbove,
  },
  defaultSort: 'displayOrder',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField({ from: 'name', localized: true, reserved: RESERVED_ROOT_SLUGS }),
    {
      name: 'parentCategory',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
        description: 'Leave empty for a top-level category.',
      },
      // Prevents the obvious cycle. Deeper cycles (A -> B -> A) are still possible and are
      // worth guarding in a hook if the category tree ever grows past two levels.
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      name: 'color',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Hex value used for category accents in the UI, e.g. #c8102e',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the header navigation.',
      },
    },
  ],
}
