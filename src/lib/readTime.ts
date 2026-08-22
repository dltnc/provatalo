/** Words per minute used for the article read-time estimate. */
const WORDS_PER_MINUTE = 180

type LexicalNode = {
  text?: unknown
  children?: unknown
}

/** Depth-first collection of every text leaf in a Lexical tree. */
const collectText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''

  const { children, text } = node as LexicalNode
  const own = typeof text === 'string' ? text : ''
  const nested = Array.isArray(children) ? children.map(collectText).join(' ') : ''

  return `${own} ${nested}`
}

export const countWords = (richText: unknown): number => {
  if (!richText || typeof richText !== 'object') return 0

  const root = (richText as { root?: unknown }).root
  const text = collectText(root ?? richText)

  // Bangla is space-delimited, so whitespace splitting is a fair word count for both scripts.
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Read time in whole minutes, floored at 1 so a published article never advertises "0 min".
 */
export const readTimeMinutes = (richText: unknown): number =>
  Math.max(1, Math.ceil(countWords(richText) / WORDS_PER_MINUTE))
