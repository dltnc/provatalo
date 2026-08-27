import React from 'react'

/**
 * White-label logo shown on the admin login screen, registered through
 * `admin.components.graphics.Logo` in payload.config.ts.
 *
 * The source of truth is the public/ copy — the media/ original is gitignored, so referencing
 * it directly would 404 on deploys where uploads are not present.
 *
 * Sizing and the dark-theme treatment live in (payload)/custom.scss: the wordmark is dark grey,
 * which would vanish on the dark theme, so there it gets a light chip behind it.
 */
export const LoginLogo = () => {
  return (
    <img
      alt="Daily Provat Alo"
      className="login-logo"
      height={115}
      src="/daily-provat-alo-logo.png"
      width={240}
    />
  )
}
