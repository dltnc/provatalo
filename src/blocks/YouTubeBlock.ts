import type { Block } from 'payload'

import { validateYouTubeUrl } from '@/fields/validateYouTubeUrl'

/**
 * In-body video, for dropping a clip into the middle of a story (PRD §3.3, "embeds").
 *
 * Separate from the article-level `video` group on purpose: that group answers "is this a video
 * story?" and drives the listing at /video, while this block is just a paragraph that happens to
 * be a player. A text article can carry three of these without becoming a video article.
 *
 * Nothing here is marked `localized` — the block lives inside `content`, which already is, so
 * each locale gets its own copy of the whole body including these blocks.
 */
export const YouTubeBlock: Block = {
  slug: 'youtubeEmbed',
  interfaceName: 'YouTubeEmbedBlock',
  labels: {
    plural: 'YouTube videos',
    singular: 'YouTube video',
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'https://www.youtube.com/watch?v=…',
      },
      label: 'YouTube link',
      validate: validateYouTubeUrl,
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'Shown under the player.',
      },
    },
  ],
}
