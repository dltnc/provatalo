import type { CollectionConfig } from 'payload'

import { isSuperAdmin } from '@/access/roles'

/**
 * Append-only audit trail (PRD §3.1, §5).
 *
 * Every mutation is refused through the API. Entries are written only by `recordAudit` hooks
 * running server-side with `overrideAccess`, which means a compromised editor account cannot
 * forge or erase history.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: {
    singular: 'Audit Entry',
    plural: 'Audit Log',
  },
  admin: {
    useAsTitle: 'documentTitle',
    defaultColumns: ['action', 'collectionSlug', 'documentTitle', 'user', 'createdAt'],
    group: 'Admin',
    description: 'Read-only record of content changes.',
  },
  access: {
    read: isSuperAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: ['created', 'updated', 'published', 'unpublished', 'deleted'],
    },
    {
      name: 'collectionSlug',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'documentId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'documentTitle',
      type: 'text',
    },
    {
      name: 'changedFields',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Field names only. Version history holds the before/after content.',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
  ],
}
