const DEFAULT_NO_RULES = {
  purchase_order: {
    key: 'no_formula_purchase_order',
    label: '采购订单号',
    table: 'purchase_order',
    column: 'order_no',
    prefix: 'P',
    formula: 'P{date}{time}{id}{random:6}'
  },
  purchase_inbound: {
    key: 'no_formula_purchase_inbound',
    label: '采购入库单号',
    table: 'purchase_inbound',
    column: 'inbound_no',
    prefix: 'PE',
    formula: 'PE{date}{time}{id}{random:6}'
  },
  purchase_return: {
    key: 'no_formula_purchase_return',
    label: '采购退货单号',
    table: 'purchase_return',
    column: 'return_no',
    prefix: 'PR',
    formula: 'PR{date}{time}{id}{random:6}'
  },
  sale_order: {
    key: 'no_formula_sale_order',
    label: '销售订单号',
    table: 'sale_order',
    column: 'order_no',
    prefix: 'S',
    formula: 'S{date}{time}{seq:4}{random:4}'
  },
  sale_delivery: {
    key: 'no_formula_sale_delivery',
    label: '销售发货单号',
    table: 'sale_delivery',
    column: 'delivery_no',
    prefix: 'FH',
    formula: 'FH{date}{time}{seq:4}{random:4}'
  },
  sale_return: {
    key: 'no_formula_sale_return',
    label: '销售退货单号',
    table: 'sale_return',
    column: 'return_no',
    prefix: 'XT',
    formula: 'XT{date}{time}{seq:4}{random:4}'
  },
  inventory_check: {
    key: 'no_formula_inventory_check',
    label: '库存盘点单号',
    table: 'inventory_check',
    column: 'check_no',
    prefix: 'PD',
    formula: 'PD{date}{time}{seq:4}{random:4}'
  },
  inventory_transfer: {
    key: 'no_formula_inventory_transfer',
    label: '库存调拨单号',
    table: 'inventory_transfer',
    column: 'transfer_no',
    prefix: 'DB',
    formula: 'DB{date}{time}{seq:4}{random:4}'
  },
  other_inbound: {
    key: 'no_formula_other_inbound',
    label: '其他入库单号',
    table: 'other_inbound',
    column: 'inbound_no',
    prefix: 'QT',
    formula: 'QT{date}{time}{seq:4}{random:4}'
  },
  other_outbound: {
    key: 'no_formula_other_outbound',
    label: '其他出库单号',
    table: 'other_outbound',
    column: 'outbound_no',
    prefix: 'QC',
    formula: 'QC{date}{time}{seq:4}{random:4}'
  },
  finance_payment: {
    key: 'no_formula_finance_payment',
    label: '采购付款单号',
    table: 'finance_payment',
    column: 'payment_no',
    prefix: 'FK',
    formula: 'FK{date}{time}{id}{random:6}'
  },
  purchase_invoice: {
    key: 'no_formula_purchase_invoice',
    label: '采购发票登记单号',
    table: 'purchase_invoice',
    column: 'invoice_no',
    prefix: 'PFP',
    formula: 'PFP{date}{time}{id}{random:4}'
  },
  finance_receipt: {
    key: 'no_formula_finance_receipt',
    label: '销售收款单号',
    table: 'finance_receipt',
    column: 'receipt_no',
    prefix: 'SK',
    formula: 'SK{date}{time}{seq:4}{random:4}'
  },
  sale_invoice: {
    key: 'no_formula_sale_invoice',
    label: '销售发票登记单号',
    table: 'sale_invoice',
    column: 'invoice_no',
    prefix: 'SFP',
    formula: 'SFP{date}{time}{seq:4}{random:4}'
  },
  herb_processing_order: {
    key: 'no_formula_herb_processing_order',
    label: '加工批次号',
    table: 'herb_processing_order',
    column: 'batch_no',
    prefix: 'JG',
    formula: 'JG{date}{time}{id}{random:4}'
  }
};

const PREFIX_TYPE_MAP = {
  P: 'purchase_order',
  CG: 'purchase_order',
  PE: 'purchase_inbound',
  RK: 'purchase_inbound',
  PR: 'purchase_return',
  CT: 'purchase_return',
  XS: 'sale_order',
  S: 'sale_order',
  FH: 'sale_delivery',
  XT: 'sale_return',
  PD: 'inventory_check',
  DB: 'inventory_transfer',
  QT: 'other_inbound',
  QC: 'other_outbound',
  FK: 'finance_payment',
  PFP: 'purchase_invoice',
  SK: 'finance_receipt',
  SFP: 'sale_invoice',
  JG: 'herb_processing_order'
};

function getDefaultNoConfigs() {
  return Object.values(DEFAULT_NO_RULES).map(rule => [rule.key, rule.formula, rule.label]);
}

function getNoRule(typeOrPrefix) {
  const type = DEFAULT_NO_RULES[typeOrPrefix] ? typeOrPrefix : PREFIX_TYPE_MAP[typeOrPrefix];
  const rule = DEFAULT_NO_RULES[type];
  if (!rule) throw new Error(`未知单号类型：${typeOrPrefix}`);
  return rule;
}

async function generateBusinessNo(conn, typeOrPrefix, options = {}) {
  const rule = getNoRule(typeOrPrefix);
  const formula = await getFormula(conn, rule);
  const seq = await nextDailySeq(conn, rule);
  const context = {
    now: options.now || new Date(),
    id: options.id || options.orderId || '',
    seq,
    prefix: rule.prefix
  };

  for (let i = 0; i < 20; i += 1) {
    const candidate = renderFormula(formula, context);
    const [rows] = await conn.execute(
      `SELECT id FROM ${rule.table} WHERE ${rule.column} = ?${context.id ? ' AND id <> ?' : ''} LIMIT 1`,
      context.id ? [candidate, context.id] : [candidate]
    );
    if (!rows.length) return candidate;
  }

  return `${renderFormula(formula, context)}${randomChars(2)}`;
}

async function generateTempBusinessNo(conn, typeOrPrefix) {
  const rule = getNoRule(typeOrPrefix);
  for (let i = 0; i < 20; i += 1) {
    const no = `TMP-${rule.prefix}-${Date.now()}-${randomChars(6)}`;
    const [rows] = await conn.execute(`SELECT id FROM ${rule.table} WHERE ${rule.column} = ? LIMIT 1`, [no]);
    if (!rows.length) return no;
  }
  return `TMP-${rule.prefix}-${Date.now()}-${randomChars(8)}`;
}

async function getFormula(conn, rule) {
  const [rows] = await conn.execute('SELECT value FROM system_config WHERE `key` = ? LIMIT 1', [rule.key]);
  const value = String(rows[0]?.value || '').trim();
  return value || rule.formula;
}

async function nextDailySeq(conn, rule) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM ${rule.table} WHERE DATE(created_at) = CURDATE()`
  );
  return Number(rows[0]?.cnt || 0) + 1;
}

function renderFormula(formula, context) {
  const now = context.now;
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const id = context.id || context.seq;

  return String(formula || '')
    .replace(/\{prefix\}/g, context.prefix)
    .replace(/\{date\}/g, date)
    .replace(/\{time\}/g, time)
    .replace(/\{datetime\}/g, `${date}${time}`)
    .replace(/\{timestamp\}/g, String(Date.now()))
    .replace(/\{id(?::(\d+))?\}/g, (_, len) => len ? String(id).padStart(Number(len), '0') : String(id))
    .replace(/\{seq(?::(\d+))?\}/g, (_, len) => String(context.seq).padStart(Number(len || 4), '0'))
    .replace(/\{random(?::(\d+))?\}/g, (_, len) => randomChars(Number(len || 6)))
    .replace(/\*+/g, match => randomChars(match.length));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function randomChars(length) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }
  return text;
}

module.exports = {
  DEFAULT_NO_RULES,
  getDefaultNoConfigs,
  getNoRule,
  generateBusinessNo,
  generateTempBusinessNo
};
