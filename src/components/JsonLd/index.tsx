/**
 * Emits a `<script type="application/ld+json">` for one schema.org node. Kept as a dumb renderer —
 * the node objects are built in `lib/seo.ts` so the shapes are testable without a DOM, and this
 * component only handles serialisation. Safe to render multiple times per page (Organization,
 * NewsArticle, BreadcrumbList each get their own).
 */
export const JsonLd = ({ data }: { data: Record<string, unknown> }) => (
  <script
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    type="application/ld+json"
  />
)
