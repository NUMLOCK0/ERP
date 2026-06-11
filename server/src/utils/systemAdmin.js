const ADMIN_ROLE_NAMES = new Set([
  'admin',
  'administrator',
  'system admin',
  'system_admin',
  'system-admin'
]);

function isSystemAdmin(user) {
  if (!user) return false;
  if (Number(user.role_id) === 1) return true;

  const roleName = String(user.role_name || '').trim().toLowerCase();
  return ADMIN_ROLE_NAMES.has(roleName);
}

module.exports = isSystemAdmin;
