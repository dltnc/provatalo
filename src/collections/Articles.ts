import type { CollectionConfig } from 'payload'

import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { canReadArticle, canUpdateArticle } from '@/access/articles'
import { isAuthenticated, isEditorOrAbove } from '@/access/roles'
import { YouTubeBlock } from '@/blocks/YouTubeBlock'
import { slugField } from '@/fields/slugField'
import { validateYouTubeUrl } from '@/fields/validateYouTubeUrl'
import { computeReadTime } from '@/hooks/computeReadTime'
import { enforcePublishPermission } from '@/hooks/enforcePublishPermission'
import { enforceVideoArticle } from '@/hooks/enforceVideoArticle'
import { recordAuditChange, recordAuditDelete } from '@/hooks/recordAudit'
import { revalidateArticle, revalidateArticleDelete } from '@/hooks/revalidateArticle'

/** `data.articleType` is only present on the article form, so this is safe to reuse per field. */
const isVideoArticle = (data: Partial<{ articleType?: string }>) => data?.articleType === 'video'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: {
    singular: 'Article',
    plural: 'Articles',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'articleType', 'category', 'author', 'reviewState', 'publishedAt'],
    group: 'Content',
    listSearchableFields: ['title', 'slug'],
  },
  access: {
    read: canReadArticle,
    create: isAuthenticated,
    update: canUpdateArticle,
    delete: isEditorOrAbove,
  },
  versions: {
    drafts: {
      // Future-dated publishing (PRD §3.2). Depends on the jobs queue actually being run —
      // see vercel.json for the cron that drives it.
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  defaultSort: '-publishedAt',
  hooks: {
    beforeChange: [enforcePublishPermission, enforceVideoArticle, computeReadTime],
    afterChange: [revalidateArticle, recordAuditChange],
    afterDelete: [revalidateArticleDelete, recordAuditDelete],
  },
  fields: [
    {
      name: 'articleType',
      type: 'select',
      required: true,
      defaultValue: 'text',
      index: true,
      admin: {
        description: 'Video stories lead with a player and also appear at /video.',
      },
      label: 'Article type',
      options: [
        { label: 'Text', value: 'text' },
        { label: 'Video', value: 'video' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      index: true,
    },
    // Articles live under /article/[slug], outside the root namespace, so no reserved list.
    slugField({ from: 'title', localized: true }),
    {
      name: 'subtitle',
      type: 'text',
      localized: true,
      label: 'Standfirst',
      admin: {
        description: 'Optional deck shown under the headline.',
      },
    },
    {
      name: 'video',
      type: 'group',
      admin: {
        // Admin-only in intent, but Payload also skips validation for fields a false condition
        // hides, which is what keeps `youtubeUrl` below from blocking every text article.
        condition: (data) => isVideoArticle(data),
        description: 'The clip this story is built around.',
      },
      fields: [
        {
          name: 'youtubeUrl',
          type: 'text',
          required: true,
          admin: {
            placeholder: 'https://www.youtube.com/watch?v=…',
          },
          label: 'YouTube link',
          validate: validateYouTubeUrl,
        },
        {
          name: 'thumbnail',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description:
              'Poster frame for the player. Falls back to the featured image. Uploading our own avoids hotlinking a still from Google before the reader has consented to anything.',
          },
        },
        {
          name: 'duration',
          type: 'text',
          admin: {
            description: 'Shown on video cards, e.g. 4:12. Free text — YouTube is the source of truth.',
          },
        },
      ],
      label: 'Video',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
      /**
       * Scoped to this field rather than set globally: a YouTube block belongs in a story body,
       * not in an author bio or a site-settings blurb.
       */
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({ blocks: [YouTubeBlock] }),
        ],
      }),
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Used for the card, the hero, and the social preview.',
      },
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'location',
      type: 'text',
      localized: true,
      admin: {
        description: 'City or region for regional news, e.g. ঢাকা',
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: [
        { name: 'metaTitle', type: 'text', localized: true },
        { name: 'metaDescription', type: 'textarea', localized: true },
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Falls back to the featured image when empty.' },
        },
      ],
    },

    // --- Sidebar: taxonomy, workflow and derived values ---

    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }) => user?.id,
      admin: { position: 'sidebar' },
    },
    {
      name: 'coAuthors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewState',
      type: 'select',
      required: true,
      defaultValue: 'drafting',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Editorial workflow. Separate from the Draft/Published state, which Payload owns.',
      },
      options: [
        { label: 'Drafting', value: 'drafting' },
        { label: 'In review', value: 'in-review' },
        { label: 'Approved', value: 'approved' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set a future date and use Schedule Publish to release it automatically.',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            // Stamp the first publish, but never overwrite a date an editor chose.
            if (siblingData?._status === 'published' && !value) return new Date()
            return value
          },
        ],
      },
    },
    {
      name: 'isBreaking',
      type: 'checkbox',
      defaultValue: false,
      label: 'Breaking news',
      admin: {
        position: 'sidebar',
        description: 'Adds this article to the ticker.',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Feature on homepage',
      admin: { position: 'sidebar' },
    },
    {
      name: 'relatedArticles',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: {
        position: 'sidebar',
        description: 'Manual override. Left empty, related articles are derived from tags.',
      },
    },
    {
      name: 'readTime',
      type: 'number',
      // Derived from `content`, which is localized, so this has to be too.
      localized: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Minutes, calculated from the body on save.',
      },
    },
    {
      name: 'viewCount',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Incremented outside Payload by a direct atomic update. Writing it through Payload would fire the revalidation hooks on every page view.',
      },
    },
  ],
}
