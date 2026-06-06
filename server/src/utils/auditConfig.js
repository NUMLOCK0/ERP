const DEFAULT_AUDIT_CONFIG = {
  purchase_order: true,
  sale_order: true,
  inventory_check: true,
  inventory_transfer: false
};

function configKey(moduleKey) {
  return `audit_${moduleKey}_enabled`;
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(text)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(text)) return false;
  return defaultValue;
}

async function isAuditEnabled(poolOrConn, moduleKey) {
  const defaultValue = DEFAULT_AUDIT_CONFIG[moduleKey] ?? true;
  const [rows] = await poolOrConn.execute('SELECT value FROM system_config WHERE `key` = ? LIMIT 1', [configKey(moduleKey)]);
  return parseBoolean(rows[0]?.value, defaultValue);
}

module.exports = {
  DEFAULT_AUDIT_CONFIG,
  configKey,
  isAuditEnabled,
  parseBoolean
};
