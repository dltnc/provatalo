import type { CollectionConfig } from 'payload'

import { isEditorOrAbove, isAuthenticated } from '@/access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
    defaultColumns: ['filename', 'alt', 'credit'],
  },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isEditorOrAbove,
  },
  upload: {
    // Images only for now. Ad creatives that need video (PRD §3.6) arrive in Phase 4 and can
    // widen this or use their own collection — keeping it narrow means every upload is safe to
    // run through the image pipeline below.
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 150 },
      { name: 'card', width: 400 },
      { name: 'hero', width: 1200 },
      // Fixed dimensions: social crawlers expect exactly 1200x630 for link previews.
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    /**
     * Naming an image size here (`adminThumbnail: 'thumbnail'`) makes Payload build the preview URL
     * from its own file route — `/api/media/file/<file>-150x84.png` — which never goes through the
     * storage adapter's `generateFileURL`. Once R2 is enabled that route 500s, because the adapter
     * sets `disableLocalStorage` and there is no longer a file on disk to serve, so every preview in
     * the admin renders as a blank box.
     *
     * Reading the URL off the document keeps the thumbnail pointing at wherever the file actually
     * lives: the R2 domain in production, and `/api/media/file/**` in local dev without R2
     * configured, since that is what the adapter-less `sizes.thumbnail.url` already contains.
     */
    adminThumbnail: ({ doc }) => {
      const sizes = doc.sizes as Record<string, { url?: null | string }> | undefined
      return sizes?.thumbnail?.url ?? (doc.url as null | string | undefined) ?? null
    },
    focalPoint: true,
    crop: true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Describe the image for screen readers. Required for WCAG 2.1 AA.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
    },
    {
      name: 'credit',
      type: 'text',
      admin: {
        description: 'Photographer or agency. Not localized — attribution is a proper name.',
      },
    },
  ],
}
