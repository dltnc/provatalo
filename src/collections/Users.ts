import type { CollectionConfig } from 'payload'

import { isSuperAdmin, isSuperAdminField } from '@/access/roles'
import { slugField } from '@/fields/slugField'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles'],
    group: 'Admin',
  },
  auth: true,
  access: {
    // Deliberately not public. Users hold email addresses, and an auth collection's `email`
    // field cannot be hidden per-role, so the whole collection stays behind auth. Public
    // author pages (`/author/[slug]`) render server-side through the Local API, which runs
    // with `overrideAccess` and is unaffected.
    read: ({ req }) => Boolean(req.user),
    create: isSuperAdmin,
    delete: isSuperAdmin,
    update: ({ req, id }) => {
      if (!req.user) return false
      // Anyone may edit their own profile; only a superadmin may edit someone else's.
      return req.user.id === id || Boolean(req.user.roles?.includes('superadmin'))
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({ from: 'name' }),
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['reporter'],
      // Read from the JWT instead of the database on every access-control check.
      saveToJWT: true,
      options: [
        { label: 'Super Admin', value: 'superadmin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Reporter', value: 'reporter' },
      ],
      access: {
        // Without this a reporter could promote themselves by editing their own profile,
        // since the collection-level rule above lets them update their own document.
        create: isSuperAdminField,
        update: isSuperAdminField,
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'richText',
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['facebook', 'x', 'instagram', 'youtube', 'linkedin', 'website'],
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
