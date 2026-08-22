'use client'

import { Link, LogOutIcon, useConfig, useTranslation } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

/**
 * A labelled "Log out" entry in the admin sidebar.
 *
 * Payload does ship a logout control, but it is an unlabelled icon tucked into the nav's bottom
 * control strip next to the settings gear — easy to miss, and the first thing a newsroom user
 * looks for. Registered through `admin.components.afterNavLinks`, so it sits with the collection
 * links where people actually look; the built-in icon stays where it is.
 *
 * The href is derived from config rather than hardcoded to `/admin/logout` because both the admin
 * route and the logout route are configurable, and a stale link here would look like a broken
 * session rather than a broken link.
 */
export const LogoutNavLink = () => {
  const { t } = useTranslation()
  const {
    config: {
      admin: {
        routes: { logout: logoutRoute },
      },
      routes: { admin: adminRoute },
    },
  } = useConfig()

  return (
    <Link
      className="nav__link logout-nav-link"
      href={formatAdminURL({ adminRoute, path: logoutRoute })}
      // Prefetching would hit the route that ends the session.
      prefetch={false}
    >
      <LogOutIcon />
      <span className="logout-nav-link__label">{t('authentication:logOut')}</span>
    </Link>
  )
}
