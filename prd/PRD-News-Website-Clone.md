# Product Requirements Document
## News Portal Platform (Aajtak-Style Clone)

**Version:** 1.0
**Status:** Draft
**Tech Stack:** Payload CMS 3.x (Next.js-based, frontend + backend) · Mongoose · MongoDB

---

## 1. Overview

### 1.1 Purpose
Build a full-featured Bangla news portal inspired by the layout, information density, and user flows of Aajtak — using original branding, original design assets, and original copy. The platform combines a headless-CMS-driven admin experience with a fast, SEO-optimized public-facing site, all in a single Payload CMS 3.x application (Payload 3 runs natively inside Next.js, so one codebase serves both the admin panel and the public site).

### 1.2 Goals
- Ship a production-grade news CMS that non-technical editors can use daily.
- Achieve sub-2-second page loads and strong Core Web Vitals scores.
- Rank well in search and news aggregators (Google News-style discovery).
- Support a self-serve advertisement system for banner/native ad placements.
- Keep the codebase maintainable, type-safe, and horizontally scalable.

### 1.3 Non-Goals
- No literal reproduction of Aajtak's logo, brand colors, copyrighted photos, or article text.
- No native mobile app in v1 (responsive web only).
- No real-time live-TV streaming in v1 (placeholder module only).

### 1.4 Target Users
| User | Needs |
|---|---|
| Reader (public) | Fast access to news, categories, search, minimal friction |
| Editor/Journalist | Quick article drafting, media upload, scheduling |
| Admin/Chief Editor | Full content control, user management, ad management, analytics |
| Advertiser (internal-only in v1) | Ad slots managed by admin, not self-serve initially |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js (Payload 3)                  │
│  ┌───────────────┐        ┌────────────────────────┐    │
│  │  /admin (Payload│       │  Public Route Group      │   │
│  │  Admin UI)      │       │  (app/(frontend)/...)    │   │
│  └───────┬─────────┘       └───────────┬──────────────┘  │
│          │  Local API / REST / GraphQL │                 │
│          └──────────────┬──────────────┘                 │
│                          │                                 │
│                  Payload Core (Node)                       │
│                          │                                 │
│                     Mongoose ODM                            │
│                          │                                 │
│                       MongoDB                               │
└─────────────────────────────────────────────────────────┘
        │                                   │
        ▼                                   ▼
   Cloud Storage (S3/R2)              CDN (images, static)
   for media uploads                  + Edge caching
```

**Key architectural decisions:**
- **Payload 3.x** installed as a Next.js plugin — admin panel at `/admin`, public site rendered via React Server Components in the same app, eliminating a separate API-consumption layer where possible (use Payload Local API on the server for zero-latency data fetching).
- **MongoDB + Mongoose**: Payload's `db-mongodb` adapter uses Mongoose under the hood; no custom Mongoose models needed for CMS collections, but custom Mongoose models/scripts can be used for auxiliary services (e.g., analytics counters, ad impression logs) if kept outside Payload's schema.
- **ISR (Incremental Static Regeneration) + on-demand revalidation**: article pages statically generated and revalidated via Payload hooks (`afterChange`) calling Next's `revalidatePath`.
- **Image optimization** via Next.js `<Image>` + Payload's built-in image resizing (multiple sizes generated on upload: thumbnail, card, hero, OG).
- **CDN**: static assets and media served through a CDN (e.g., Cloudflare) in front of S3-compatible storage.

---

## 3. Core Features

### 3.1 Admin Dashboard
- Secure login at `/admin` using Payload's built-in auth (email/password, hashed via bcrypt, JWT session cookies).
- Role-based access control (RBAC) with at least three roles:
  - **SuperAdmin** — full access incl. user management, site settings, ad config.
  - **Editor** — can create/edit/delete/publish any article, manage categories.
  - **Reporter** — can create/edit own drafts, submit for review; cannot publish directly.
- Dashboard home with quick stats: articles published today, pending review, top ad performers, recent activity log.
- Rich-text editor (Payload's Lexical editor) supporting embedded images, pull quotes, embeds (YouTube/Twitter), and inline ads.
- Bulk actions: bulk publish/unpublish/delete/category-assign.
- Draft/Preview mode: editors can preview an unpublished article on the live site template via a signed preview URL.
- Media Library: searchable, tag-able, reusable across articles.
- Audit log collection recording who changed what and when.

### 3.2 News Posts (Articles) — Content Model
**Collection: `articles`**

| Field | Type | Notes |
|---|---|---|
| title | text (required) | Also auto-generates slug |
| slug | text (unique, auto) | Editable override allowed |
| subtitle/deck | text | Optional standfirst |
| content | richText (Lexical) | Body with embedded media/ads |
| featuredImage | upload (relationship → media) | Required; auto-generates OG image |
| gallery | array of uploads | Optional photo gallery |
| category | relationship → `categories` | Required, single primary category |
| tags | relationship → `tags` (many) | For related-content and SEO |
| author | relationship → `users` | Required |
| coAuthors | relationship → `users` (many) | Optional |
| publishedAt | date | Controls scheduling (future dates = scheduled publish) |
| status | select: draft / in-review / published / archived | Workflow state |
| isBreaking | checkbox | Drives "Breaking News" ticker |
| isFeatured | checkbox | Drives homepage hero placement |
| readTime | number (auto-calculated) | Derived from word count |
| seo | group (metaTitle, metaDescription, ogImage) | SEO plugin integration |
| location | text | City/region tag (Aajtak-style regional news) |
| language | select: hi / en | Multi-language support |
| relatedArticles | relationship → `articles` (many, optional) | Manual override; else auto by tag/category |
| viewCount | number | Incremented via lightweight API route, not editable in admin UI |

**Collection: `categories`** — name, slug, parentCategory (for sub-categories like India > States), color/icon, displayOrder.

**Collection: `tags`** — name, slug.

**Collection: `users`** — name, email, role, avatar, bio, social links.

**Collection: `media`** — Payload-managed uploads with auto image sizes (thumbnail 150px, card 400px, hero 1200px, OG 1200x630).

### 3.3 Responsive Design
- Mobile-first layout (breakpoints: 360/768/1024/1440).
- Homepage layout pattern: top ticker → breaking news bar → hero grid (lead story + secondary stories) → category rails (horizontally scrollable on mobile) → trending sidebar → footer.
- Sticky header with category navigation, search icon, and hamburger menu on mobile.
- Article page: headline, meta (author/date/read time), share buttons, inline ad slots every N paragraphs, related articles rail, comment section (optional, can be deferred).
- Dark mode toggle (nice-to-have, not required for v1).
- Design system built with Tailwind CSS; component library documented in Storybook (optional).
- All original visual assets — no copied Aajtak logos, fonts, or photography.

### 3.4 Routing & Navigation (SSR/SEO)
- Route structure:
  - `/` — homepage
  - `/[category]` — category listing (paginated, SSR/ISR)
  - `/[category]/[subcategory]` — nested category
  - `/article/[slug]` — article detail (SSG + ISR, revalidated on publish/update)
  - `/search?q=` — search results (SSR, debounced client search UI)
  - `/author/[slug]` — author profile + article list
  - `/tag/[slug]` — tag listing
  - `/admin/*` — Payload admin (excluded from public sitemap/robots)
- `sitemap.xml` auto-generated (and a separate `news-sitemap.xml` following Google News sitemap spec for recent articles).
- `robots.txt` configured to disallow `/admin` and preview routes.
- Structured data (JSON-LD): `NewsArticle`, `BreadcrumbList`, `Organization` schemas on every article.
- Canonical URLs, hreflang tags for hi/en language variants.
- Server-rendered meta tags per page (title, description, OG, Twitter cards) via Payload SEO plugin.
- 404 and custom error pages with related-content suggestions to reduce bounce.

### 3.5 Data Validation & Security
- **Validation**: Payload field-level validation (required fields, max lengths, slug uniqueness, image size/type checks). Zod-based validation for any custom API routes (e.g., ad-click tracking, newsletter signup).
- **Authentication**: Payload's native auth for admin users; JWT stored in httpOnly, secure, sameSite cookies. Optional 2FA for SuperAdmin role.
- **Authorization**: Field- and collection-level access control functions (e.g., only SuperAdmin can edit `siteSettings`; Reporters can only edit their own drafts).
- **API security**:
  - Rate limiting on public API routes (search, comments, ad impression logging) to prevent abuse.
  - CORS restricted to known frontend origins.
  - Input sanitization on rich text (strip disallowed HTML/script tags) before render.
  - CSRF protection on admin mutation routes.
  - Environment secrets (DB URI, JWT secret, S3 keys) managed via environment variables, never committed.
- **Infrastructure security**: MongoDB access restricted by IP allowlist / VPC peering in production; automated daily backups; dependency vulnerability scanning (e.g., `npm audit` / Dependabot) in CI.
- **Logging & monitoring**: centralized error logging (e.g., Sentry), uptime monitoring, and admin audit trail for content changes.

### 3.6 Advertisement System
**Collection: `adSlots`**

| Field | Type | Notes |
|---|---|---|
| name | text | e.g., "Homepage Leaderboard" |
| placement | select | header / sidebar / in-article / footer / interstitial |
| type | select | image banner / HTML embed / Google AdSense script / video |
| creativeImage | upload | For image banners |
| embedCode | textarea | Sanitized before render for HTML/script types |
| targetUrl | text | Click-through URL |
| startDate / endDate | date | Campaign scheduling |
| priority | number | For rotation weighting when multiple ads share a placement |
| status | select: active / paused / expired | |
| impressions | number (system-managed) | |
| clicks | number (system-managed) | |
| advertiserName | text | Internal record-keeping |

- Ad component renders server-side with placement-aware slots injected into layout templates (header banner, sidebar rail, in-article native slots every 3–4 paragraphs, mobile interstitial).
- Impression/click tracking via lightweight POST API route, throttled and deduplicated per session to avoid inflated counts.
- Admin reporting view: impressions/clicks/CTR per slot, filterable by date range.
- Support for third-party ad scripts (Google AdSense/Ad Manager tags) alongside self-hosted banner creatives.
- Lazy-loading for below-the-fold ad slots to protect Core Web Vitals (avoid layout shift via reserved dimensions/`aspect-ratio`).

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Target Lighthouse scores: Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90 (mobile).
- LCP < 2.5s, CLS < 0.1, INP < 200ms.
- Image delivery via next-gen formats (WebP/AVIF), responsive `srcset`, CDN caching.
- Static generation (SSG/ISR) for all article and category pages; avoid client-side data fetching for primary content.
- Database indexes on `slug`, `category`, `publishedAt`, `status`, `tags` for fast queries.
- Redis (optional, recommended at scale) for caching trending/most-read queries and search results.

### 4.2 SEO
- Server-rendered HTML for all public pages (no client-only rendering of core content).
- News sitemap + standard sitemap, submitted via Search Console.
- AMP support (optional/deferred) for article pages if traffic from mobile search is a priority.
- Fast TTFB via edge caching / static hosting.

### 4.3 Scalability
- MongoDB Atlas (or equivalent managed cluster) with read replicas for high-traffic periods (breaking news spikes).
- Stateless Next.js app deployable behind a load balancer / on serverless-edge infra; media offloaded to object storage + CDN so app servers stay lightweight.
- Horizontal scaling of the Node/Next.js layer independent of the database tier.

### 4.4 Accessibility
- WCAG 2.1 AA target: semantic HTML, alt text enforced on image uploads, sufficient color contrast, keyboard-navigable menus.

---

## 5. Content Workflow

1. Reporter drafts article → status `draft`.
2. Reporter submits → status `in-review`.
3. Editor reviews, edits, approves → status `published` (or schedules future `publishedAt`).
4. `afterChange` hook triggers: cache revalidation, sitemap update, related-articles reindex, optional push notification/newsletter trigger.
5. SuperAdmin can archive or permanently delete with confirmation + audit log entry.

---

## 6. Milestones / Phased Rollout

| Phase | Scope | Est. Duration |
|---|---|---|
| Phase 1 | Payload setup, MongoDB connection, core collections (articles, categories, users, media), auth & RBAC | 2 weeks |
| Phase 2 | Public site: homepage, category pages, article pages, responsive layout, SEO plugin integration | 3 weeks |
| Phase 3 | Search, related articles, author pages, tag pages | 1.5 weeks |
| Phase 4 | Advertisement system (slots, tracking, reporting) | 1.5 weeks |
| Phase 5 | Performance tuning (ISR, caching, image pipeline), accessibility audit, security hardening | 1.5 weeks |
| Phase 6 | QA, load testing, deployment, monitoring setup | 1 week |

**Total estimate:** ~10–11 weeks for a single full-stack developer/small team; parallelizable with more resources.

---

## 7. Success Metrics
- Page load (LCP) under 2.5s on 4G mobile.
- ≥ 95 Lighthouse SEO score across templates.
- Editor can publish an article in under 3 minutes end-to-end.
- Zero critical security findings in pre-launch audit.
- Ad slot fill rate and CTR trackable in admin reports within 24h of launch.

---

## 8. Open Questions
- Is a comments/discussion system required for v1, or deferred to v2?
- Do we need push notifications / newsletter integration at launch?
- Self-serve advertiser portal, or admin-managed ads only (assumed for v1)?
- Multi-language beyond Hindi/English required?
- Is AMP support a launch requirement given current search traffic patterns?
