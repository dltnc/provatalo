# Deploying Provatalo — Vercel + Cloudflare R2

Production hosting for the news site and its admin panel. Two moving parts beyond the code:

| Concern            | Service             | Why                                                                       |
| ------------------ | ------------------- | ------------------------------------------------------------------------- |
| App + admin panel  | Vercel              | Runs the Next.js app, cron for scheduled publishing                       |
| Database           | MongoDB Atlas       | Vercel has no database; the local Docker Mongo does not exist in production |
| Media files        | Cloudflare R2       | Vercel's filesystem is **ephemeral** — uploaded files would vanish on every deploy |

The app currently stores uploads on local disk (`media/`, served through `/api/media/file/**`).
That works locally but not on Vercel, so part 3 wires the `media` collection to R2.

---

## Part 1 — MongoDB Atlas

1. Create a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and an **M0 (Free) cluster**.
2. Pick a region close to Bangladesh: **Mumbai (`ap-south-1`)** or **Singapore (`ap-southeast-1`)**.
3. **Database Access** → create a database user (save the password).
4. **Network Access** → add IP `0.0.0.0/0`. Vercel serverless functions egress from a shared,
   changing IP pool, so a fixed allowlist is not possible.
5. Grab the connection string (**Connect → Drivers**), and make sure it includes a database name:

```
mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/provatalo?retryWrites=true&w=majority
```

This project reads `DATABASE_URL` (not `DATABASE_URI`) — see `src/payload.config.ts`.

---

## Part 2 — Vercel

1. Push the repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
   Vercel auto-detects Next.js; keep the defaults (`pnpm install`, `pnpm run build`).
3. **Environment Variables** (add for Production, Preview, and Development):

| Variable                 | Value                                          | Notes                                                                 |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`           | Atlas connection string from part 1            | Must include the database name                                        |
| `PAYLOAD_SECRET`         | Long random string (`openssl rand -base64 32`) | Signs sessions/JWTs — never reuse the dev value                       |
| `NEXT_PUBLIC_SERVER_URL` | `https://your-domain.com`                      | Public origin used for canonical/OG tags and preview URLs             |
| `CRON_SECRET`            | Any random string                              | See cron below                                                        |

4. **Deploy.**
5. Recommended: **Settings → Functions → Function Region → Singapore (`sin1`)** so functions sit
   near both the Atlas cluster and the audience.

### Cron (scheduled publishing)

`vercel.json` already registers a cron hitting `/api/payload-jobs/run` every 5 minutes. Vercel
automatically sends `Authorization: Bearer $CRON_SECRET`, which `jobs.access` in
`src/payload.config.ts` checks — the `CRON_SECRET` env var above is what makes it pass.

> **Plan gotcha:** on Vercel's Hobby plan, cron schedules are limited to **once per day**. The
> `*/5 * * * *` schedule requires Pro (or change the schedule to daily on Hobby).

### First run

Open `https://your-domain.com/admin` and create the first admin user. To load demo content:

```sh
# against production, with the prod DATABASE_URL in .env
pnpm seed
```

The seed creates media from in-memory buffers, so it works with local disk and R2 alike.

---

## Part 3 — Cloudflare R2 for media (in a `provatalo/` directory)

### 3.1 Create the bucket

1. Cloudflare dashboard → **R2 Object Storage → Create bucket**, e.g. `provatalo-media`.
2. Location: **Automatic**, or an APAC hint to stay close to the app.

### 3.2 Public access (required for serving images)

R2 buckets are private by default, and the S3 API endpoint is for **uploads only** — it cannot
serve files to browsers. Pick one:

- **Custom domain (recommended):** bucket → **Settings → Public access → Custom Domains**, e.g.
  `media.provatalo.com`. Requires the domain to be on Cloudflare. Free egress, CDN caching.
- **R2.dev subdomain:** bucket → **Settings → Public access → allow r2.dev**. Quick to enable but
  heavily rate-limited and not cached — fine for testing, not for production.

Whatever you choose is your `R2_PUBLIC_URL` (e.g. `https://media.provatalo.com`).

### 3.3 Create S3 API credentials

1. R2 → **Manage R2 API Tokens → Create API Token**.
2. Permission: **Object Read & Write**, scoped to only `provatalo-media`.
3. Note down the three values Cloudflare shows:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - **S3 endpoint** (`https://<accountid>.r2.cloudflarestorage.com`) → `R2_ENDPOINT`

### 3.4 Wire it into the app

Payload talks to R2 through its S3 adapter — R2 exposes an S3-compatible API. (The dedicated
`@payloadcms/storage-r2` package is only for Cloudflare Workers; the
[official docs](https://payloadcms.com/docs/upload/storage-adapters#s3-r2) recommend the S3
adapter for Vercel/Node.)

```sh
pnpm add @payloadcms/storage-s3
```

**`src/payload.config.ts`** — add the plugin:

```ts
import { s3Storage } from '@payloadcms/storage-s3'

// inside buildConfig:
plugins: [
  s3Storage({
    // No R2 env vars (local dev) → keep storing files on local disk.
    enabled: Boolean(process.env.R2_BUCKET),
    collections: {
      media: {
        // Media read access is public (src/collections/Media.ts), so files can be served
        // straight from the R2 domain instead of proxied through serverless functions.
        disablePayloadAccessControl: true,
        // Every object key starts with this "directory" in the bucket: provatalo/<file>.
        prefix: 'provatalo',
        generateFileURL: ({ filename, prefix }) => {
          const key = prefix ? `${prefix}/${filename}` : filename
          return `${process.env.R2_PUBLIC_URL}/${key}`
        },
      },
    },
    bucket: process.env.R2_BUCKET,
    config: {
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      region: 'auto', // R2 rejects real AWS regions
      endpoint: process.env.R2_ENDPOINT,
      forcePathStyle: true, // required for R2's path-style addressing
    },
  }),
],
```

**`.env` / `.env.example` / Vercel env vars:**

```
R2_BUCKET=provatalo-media
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.provatalo.com
```

**`next.config.ts`** — the frontend renders images with `next/image`, which only optimizes
hosts it knows about. Add the R2 host (keep `localPatterns` for pre-R2 files and local dev):

```ts
const r2Host = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
    remotePatterns: r2Host ? [{ protocol: 'https', hostname: r2Host }] : [],
  },
  // ...
}
```

### 3.5 Verify

1. `R2_PUBLIC_URL` must be set at **build time** on Vercel (it is read by `next.config.ts`).
2. Upload an image in the admin panel → it appears in the bucket under `provatalo/`.
3. The media doc's URL points at `https://media.provatalo.com/provatalo/<file>`.
4. Articles render the image through `/_next/image` without errors.

---

## Gotchas

- **Existing media does not migrate itself.** Files in the local `media/` folder are gitignored
  and don't exist on Vercel. Documents uploaded before the switch will 404 in production. Either
  re-upload them, or copy them up with `rclone`:

  ```sh
  rclone copy media/ r2:provatalo-media/provatalo/
  ```

  (Configure the `r2` remote once with `rclone config` — choose "Amazon S3 Compliant" provider,
  `R2_ENDPOINT` and the API credentials.) Their URLs in Mongo still point at
  `/api/media/file/...`, so re-saving each document (or a small script that rewrites `url` fields
  to the R2 domain) is needed for the frontend to pick them up.

- **4.5 MB upload cap.** Vercel serverless functions reject request bodies over 4.5 MB, so large
  original photos fail on upload. Set `clientUploads: true` in the adapter options to upload
  straight from the browser, and add a CORS rule on the bucket (allowed origin: your domain,
  methods: `PUT`/`OPTIONS`). Generated sizes (thumbnail/card/hero/og) stay well under the cap.

- **Don't skip the custom domain.** `*.r2.dev` URLs are rate-limited; a news homepage pulling
  every image through one will hit it.

- **Secure cookies** come for free — Vercel is HTTPS by default, so Payload's auth cookies get
  the `secure` flag in production.
