/**
 * Slugs that must never be used by a category.
 *
 * Categories are served from the site root (`/[category]`), which puts them in the same
 * namespace as every other top-level route. Next resolves static segments before dynamic ones,
 * so a category slugged `search` does not error — it silently becomes unreachable. Blocking
 * the collision at authoring time is the only place it is visible.
 *
 * Add to this list whenever a new top-level route is introduced.
 */
export const RESERVED_ROOT_SLUGS = [
  'admin',
  'api',
  'article',
  'author',
  'search',
  'tag',
  'video',
  '_next',
  'sitemap.xml',
  'news-sitemap.xml',
  'robots.txt',
]
