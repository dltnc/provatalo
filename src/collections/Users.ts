import type { CollectionConfig } from 'payload'

import { isAuthenticatedField, isSuperAdmin, isSuperAdminField } from '@/access/roles'
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
    // Public: author profiles are public content (bylines, /author/[slug] pages, sitemap).
    // Sensitive fields below are hidden from anonymous reads via field-level access.
    read: () => true,
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
      // Declaring `email` explicitly lets us attach field-level access to it; Payload merges
      // this over its base auth field (keeping the login behaviour intact). Without it the
      // auth collection's email would be readable by anyone once `read` is public.
      name: 'email',
      type: 'email',
      required: true,
      access: {
        read: isAuthenticatedField,
      },
    },
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
        read: isAuthenticatedField,
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
