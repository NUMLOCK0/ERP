export interface RoleUser {
  role_id?: number | string
  role_name?: string
}

const ADMIN_ROLE_NAMES = new Set([
  'admin',
  'administrator',
  'system admin',
  'system_admin',
  'system-admin'
])

export function isSystemAdmin(user: RoleUser | null | undefined) {
  if (!user) return false
  if (Number(user.role_id) === 1) return true

  const roleName = String(user.role_name || '').trim().toLowerCase()
  return ADMIN_ROLE_NAMES.has(roleName)
}
