import type { Access, FieldAccess } from 'payload'

export type Role = 'superadmin' | 'editor' | 'reporter'

/**
 * `req.user` is loosely typed, and this module is imported by the config itself — so the role
 * shape is declared locally rather than pulled from `payload-types.ts`, which does not exist
 * until `generate:types` has run against this very config.
 */
type WithRoles = { roles?: Role[] | null }

export const hasRole = (user: unknown, ...roles: Role[]): boolean => {
  const assigned = (user as WithRoles | null | undefined)?.roles
  if (!Array.isArray(assigned)) return false
  return roles.some((role) => assigned.includes(role))
}

export const anyone: Access = () => true

export const isAuthenticated: Access = ({ req }) => Boolean(req.user)

export const isSuperAdmin: Access = ({ req }) => hasRole(req.user, 'superadmin')

export const isEditorOrAbove: Access = ({ req }) => hasRole(req.user, 'superadmin', 'editor')

/** Field-level access returns a boolean only — no query constraints are possible here. */
export const isSuperAdminField: FieldAccess = ({ req }) => hasRole(req.user, 'superadmin')
