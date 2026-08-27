import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/**
 * In production, media is served from the Cloudflare R2 domain rather than through Payload's file
 * route (see the s3Storage plugin in src/payload.config.ts and docs/deployment.md §3), and
 * `next/image` refuses to optimize any host it has not been told about. `localPatterns` stays
 * alongside it: files uploaded before the switch, and every local dev run without R2 configured,
 * are still served from `/api/media/file/**`.
 *
 * This is read at build time, so R2_PUBLIC_URL has to exist in the build environment — on Vercel
 * that means setting it for Production and Preview, not just at runtime.
 */
const r2Hostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    // R2 public access is HTTPS-only, whether it is a custom domain or the r2.dev subdomain.
    remotePatterns: r2Hostname ? [{ protocol: 'https', hostname: r2Hostname }] : [],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
