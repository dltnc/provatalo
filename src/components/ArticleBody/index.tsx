import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { RichText } from '@payloadcms/richtext-lexical/react'

import type { YouTubeEmbedBlock } from '@/payload-types'

import { VideoEmbed } from '@/components/VideoEmbed'
import { parseYouTubeUrl } from '@/lib/youtube'

type NodeTypes = DefaultNodeTypes | SerializedBlockNode<YouTubeEmbedBlock>

/**
 * Renders an article body, including the YouTube blocks reporters can drop between paragraphs.
 *
 * A block whose URL no longer parses renders as nothing rather than as a broken frame: the link
 * was validated when it was saved, so reaching here means it was edited around the validator, and
 * a silently missing embed beats an error on a live news page.
 */
const converters = (title: string): JSXConvertersFunction<NodeTypes> =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    blocks: {
      youtubeEmbed: ({ node }) => {
        const video = parseYouTubeUrl(node.fields.url)
        if (!video) return null

        return (
          <VideoEmbed caption={node.fields.caption} title={node.fields.caption ?? title} video={video} />
        )
      },
    },
  })

export const ArticleBody = ({
  className,
  content,
  title,
}: {
  className?: string
  content: SerializedEditorState
  title: string
}) => <RichText className={className} converters={converters(title)} data={content} />
