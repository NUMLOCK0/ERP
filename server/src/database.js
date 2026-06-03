const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');

let db;

function initDatabase() {
  const dbPath = path.resolve(__dirname, '..', config.dbPath);
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  initData();

  return db;
}

function createTables() {
  db.exec(`
    -- 1. 管理员用户表
    CREATE TABLE IF NOT EXISTS sys_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      real_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      role_id INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 2. 角色表
    CREATE TABLE IF NOT EXISTS sys_role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      permissions TEXT DEFAULT '{}',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 3. 产品分类表
    CREATE TABLE IF NOT EXISTS product_category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 4. 产品表
    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      spec TEXT DEFAULT '',
      unit_id INTEGER DEFAULT 0,
      category_id INTEGER DEFAULT 0,
      brand_id INTEGER DEFAULT 0,
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      description TEXT DEFAULT '',
      image_urls TEXT DEFAULT '[]',
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 5. 品牌表
    CREATE TABLE IF NOT EXISTS brand (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 6. 计量单位表
    CREATE TABLE IF NOT EXISTS unit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 7. 仓库表
    CREATE TABLE IF NOT EXISTS warehouse (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      manager TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 8. 职员表
    CREATE TABLE IF NOT EXISTS employee (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      position TEXT DEFAULT '',
      department TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 9. 客商表
    CREATE TABLE IF NOT EXISTS supplier_customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'supplier' CHECK(type IN ('supplier','customer','both')),
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      bank_account TEXT DEFAULT '',
      tax_no TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 10. 采购订单表
    CREATE TABLE IF NOT EXISTS purchase_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      supplier_id INTEGER DEFAULT 0,
      warehouse_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      auditor_id INTEGER DEFAULT 0,
      audit_time TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 11. 采购订单明细表
    CREATE TABLE IF NOT EXISTS purchase_order_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 12. 采购入库单表
    CREATE TABLE IF NOT EXISTS purchase_inbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbound_no TEXT NOT NULL UNIQUE,
      order_id INTEGER DEFAULT 0,
      warehouse_id INTEGER DEFAULT 0,
      supplier_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 13. 采购入库明细表
    CREATE TABLE IF NOT EXISTS purchase_inbound_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbound_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 14. 采购退货单表
    CREATE TABLE IF NOT EXISTS purchase_return (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_no TEXT NOT NULL UNIQUE,
      inbound_id INTEGER DEFAULT 0,
      supplier_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      reason TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 15. 采购退货明细表
    CREATE TABLE IF NOT EXISTS purchase_return_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 16. 销售订单表
    CREATE TABLE IF NOT EXISTS sale_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER DEFAULT 0,
      warehouse_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      auditor_id INTEGER DEFAULT 0,
      audit_time TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 17. 销售订单明细表
    CREATE TABLE IF NOT EXISTS sale_order_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 18. 销售发货单表
    CREATE TABLE IF NOT EXISTS sale_delivery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_no TEXT NOT NULL UNIQUE,
      order_id INTEGER DEFAULT 0,
      customer_id INTEGER DEFAULT 0,
      warehouse_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      logistics_company TEXT DEFAULT '',
      logistics_no TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 19. 销售发货明细表
    CREATE TABLE IF NOT EXISTS sale_delivery_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 20. 销售退货单表
    CREATE TABLE IF NOT EXISTS sale_return (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_no TEXT NOT NULL UNIQUE,
      delivery_id INTEGER DEFAULT 0,
      customer_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      reason TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 21. 销售退货明细表
    CREATE TABLE IF NOT EXISTS sale_return_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 22. 库存表
    CREATE TABLE IF NOT EXISTS inventory_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER DEFAULT 0,
      warehouse_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(product_id, warehouse_id)
    );

    -- 23. 库存盘点单表
    CREATE TABLE IF NOT EXISTS inventory_check (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_no TEXT NOT NULL UNIQUE,
      warehouse_id INTEGER DEFAULT 0,
      status INTEGER DEFAULT 0,
      creator_id INTEGER DEFAULT 0,
      checked_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 24. 盘点明细表
    CREATE TABLE IF NOT EXISTS inventory_check_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      book_quantity REAL DEFAULT 0,
      actual_quantity REAL DEFAULT 0,
      difference REAL DEFAULT 0
    );

    -- 25. 库存调拨单表
    CREATE TABLE IF NOT EXISTS inventory_transfer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_no TEXT NOT NULL UNIQUE,
      from_warehouse_id INTEGER DEFAULT 0,
      to_warehouse_id INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 26. 调拨明细表
    CREATE TABLE IF NOT EXISTS inventory_transfer_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0
    );

    -- 27. 库存日志表
    CREATE TABLE IF NOT EXISTS inventory_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER DEFAULT 0,
      warehouse_id INTEGER DEFAULT 0,
      change_type TEXT DEFAULT '',
      change_quantity REAL DEFAULT 0,
      before_quantity REAL DEFAULT 0,
      after_quantity REAL DEFAULT 0,
      ref_no TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 28. 其他入库单表
    CREATE TABLE IF NOT EXISTS other_inbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbound_no TEXT NOT NULL UNIQUE,
      warehouse_id INTEGER DEFAULT 0,
      type TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      remark TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 29. 其他入库明细表
    CREATE TABLE IF NOT EXISTS other_inbound_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbound_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 30. 其他出库单表
    CREATE TABLE IF NOT EXISTS other_outbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outbound_no TEXT NOT NULL UNIQUE,
      warehouse_id INTEGER DEFAULT 0,
      type TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      remark TEXT DEFAULT '',
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 31. 其他出库明细表
    CREATE TABLE IF NOT EXISTS other_outbound_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outbound_id INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT 0,
      quantity REAL DEFAULT 0,
      price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );

    -- 32. 采购付款单表
    CREATE TABLE IF NOT EXISTS finance_payment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_no TEXT NOT NULL UNIQUE,
      supplier_id INTEGER DEFAULT 0,
      inbound_id INTEGER DEFAULT 0,
      amount REAL DEFAULT 0,
      pay_method TEXT DEFAULT '',
      status INTEGER DEFAULT 0,
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 33. 销售收款单表
    CREATE TABLE IF NOT EXISTS finance_receipt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER DEFAULT 0,
      delivery_id INTEGER DEFAULT 0,
      amount REAL DEFAULT 0,
      pay_method TEXT DEFAULT '',
      status INTEGER DEFAULT 0,
      creator_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 34. 操作日志表
    CREATE TABLE IF NOT EXISTS system_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 0,
      module TEXT DEFAULT '',
      action TEXT DEFAULT '',
      target TEXT DEFAULT '',
      content TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 35. 系统设置表
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT DEFAULT '',
      description TEXT DEFAULT ''
    );

    -- 36. 打印模板表
    CREATE TABLE IF NOT EXISTS print_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT '',
      content TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

function initData() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM sys_role').get();
  if (count.cnt > 0) return;

  const insertRole = db.prepare('INSERT INTO sys_role (name, permissions, description) VALUES (?, ?, ?)');
  const insertUser = db.prepare('INSERT INTO sys_user (username, password_hash, real_name, role_id) VALUES (?, ?, ?, ?)');
  const insertUnit = db.prepare('INSERT INTO unit (name) VALUES (?)');
  const insertWarehouse = db.prepare('INSERT INTO warehouse (name, status) VALUES (?, 1)');
  const insertCategory = db.prepare('INSERT INTO product_category (name, parent_id, sort_order) VALUES (?, ?, ?)');
  const insertConfig = db.prepare('INSERT INTO system_config (key, value, description) VALUES (?, ?, ?)');

  const initTx = db.transaction(() => {
    // admin 角色 — 全部权限
    const permissions = {
      product: ['view', 'create', 'edit', 'delete', 'import', 'export'],
      category: ['view', 'create', 'edit', 'delete'],
      brand: ['view', 'create', 'edit', 'delete'],
      unit: ['view', 'create', 'edit', 'delete'],
      warehouse: ['view', 'create', 'edit', 'delete'],
      employee: ['view', 'create', 'edit', 'delete'],
      supplier: ['view', 'create', 'edit', 'delete'],
      purchase: ['view', 'create', 'edit', 'delete', 'audit', 'cancel'],
      sale: ['view', 'create', 'edit', 'delete', 'audit', 'cancel'],
      inventory: ['view', 'create', 'edit', 'delete', 'check', 'transfer'],
      finance: ['view', 'create', 'edit', 'delete'],
      report: ['view', 'export'],
      system: ['view', 'setting', 'admin', 'role', 'log']
    };
    insertRole.run('admin', JSON.stringify(permissions), '超级管理员');

    // admin 管理员账号
    const hash = bcrypt.hashSync('admin123', 10);
    insertUser.run('admin', hash, '系统管理员', 1);

    // 计量单位
    ['个', '箱', '件', 'kg', 'g', '瓶', '包', '卷', '台', '套'].forEach(u => insertUnit.run(u));

    // 默认仓库
    insertWarehouse.run('默认仓库');

    // 产品分类
    insertCategory.run('原材料', 0, 1);
    insertCategory.run('半成品', 0, 2);
    insertCategory.run('成品', 0, 3);

    // 系统配置
    insertConfig.run('company_name', '', '公司名称');
    insertConfig.run('company_address', '', '公司地址');
    insertConfig.run('company_phone', '', '公司电话');
    insertConfig.run('default_warehouse_id', '1', '默认仓库ID');
  });

  initTx();
}

function getDatabase() {
  return db;
}

module.exports = { initDatabase, getDatabase };
