const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('./config');

let pool;

async function initDatabase() {
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log('MySQL 数据库连接成功');
  } finally {
    conn.release();
  }

  await createTables();
  await initData();

  return pool;
}

async function createTables() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_user (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      real_name VARCHAR(100) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      role_id INT DEFAULT 0,
      status TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_role (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      permissions JSON DEFAULT NULL,
      description TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS product_category (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      parent_id INT DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS product (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) DEFAULT '',
      barcode VARCHAR(100) DEFAULT '',
      spec VARCHAR(100) DEFAULT '',
      unit_id INT DEFAULT 0,
      category_id INT DEFAULT 0,
      brand_id INT DEFAULT 0,
      cost_price DOUBLE DEFAULT 0,
      sale_price DOUBLE DEFAULT 0,
      description TEXT DEFAULT NULL,
      image_urls JSON DEFAULT NULL,
      status TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS brand (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS unit (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS warehouse (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      address TEXT DEFAULT NULL,
      manager VARCHAR(100) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      status TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS employee (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      position VARCHAR(100) DEFAULT '',
      department VARCHAR(100) DEFAULT '',
      status TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS supplier_customer (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'supplier',
      contact VARCHAR(100) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      address TEXT DEFAULT NULL,
      bank_name VARCHAR(255) DEFAULT '',
      bank_account VARCHAR(100) DEFAULT '',
      tax_no VARCHAR(100) DEFAULT '',
      status TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS purchase_order (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL UNIQUE,
      supplier_id INT DEFAULT 0,
      warehouse_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      auditor_id INT DEFAULT 0,
      audit_time DATETIME DEFAULT NULL,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS purchase_order_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS purchase_inbound (
      id INT PRIMARY KEY AUTO_INCREMENT,
      inbound_no VARCHAR(50) NOT NULL UNIQUE,
      order_id INT DEFAULT 0,
      warehouse_id INT DEFAULT 0,
      supplier_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS purchase_inbound_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      inbound_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS purchase_return (
      id INT PRIMARY KEY AUTO_INCREMENT,
      return_no VARCHAR(50) NOT NULL UNIQUE,
      inbound_id INT DEFAULT 0,
      supplier_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      reason TEXT DEFAULT NULL,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS purchase_return_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      return_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sale_order (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL UNIQUE,
      customer_id INT DEFAULT 0,
      warehouse_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      auditor_id INT DEFAULT 0,
      audit_time DATETIME DEFAULT NULL,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sale_order_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sale_delivery (
      id INT PRIMARY KEY AUTO_INCREMENT,
      delivery_no VARCHAR(50) NOT NULL UNIQUE,
      order_id INT DEFAULT 0,
      customer_id INT DEFAULT 0,
      warehouse_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      logistics_company VARCHAR(100) DEFAULT '',
      logistics_no VARCHAR(100) DEFAULT '',
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sale_delivery_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      delivery_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sale_return (
      id INT PRIMARY KEY AUTO_INCREMENT,
      return_no VARCHAR(50) NOT NULL UNIQUE,
      delivery_id INT DEFAULT 0,
      customer_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      reason TEXT DEFAULT NULL,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS sale_return_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      return_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS inventory_stock (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT DEFAULT 0,
      warehouse_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_product_warehouse (product_id, warehouse_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS inventory_check (
      id INT PRIMARY KEY AUTO_INCREMENT,
      check_no VARCHAR(50) NOT NULL UNIQUE,
      warehouse_id INT DEFAULT 0,
      status INT DEFAULT 0,
      creator_id INT DEFAULT 0,
      checked_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS inventory_check_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      check_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      book_quantity DOUBLE DEFAULT 0,
      actual_quantity DOUBLE DEFAULT 0,
      difference DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS inventory_transfer (
      id INT PRIMARY KEY AUTO_INCREMENT,
      transfer_no VARCHAR(50) NOT NULL UNIQUE,
      from_warehouse_id INT DEFAULT 0,
      to_warehouse_id INT DEFAULT 0,
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS inventory_transfer_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      transfer_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS inventory_log (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT DEFAULT 0,
      warehouse_id INT DEFAULT 0,
      change_type VARCHAR(50) DEFAULT '',
      change_quantity DOUBLE DEFAULT 0,
      before_quantity DOUBLE DEFAULT 0,
      after_quantity DOUBLE DEFAULT 0,
      ref_no VARCHAR(50) DEFAULT '',
      remark TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS other_inbound (
      id INT PRIMARY KEY AUTO_INCREMENT,
      inbound_no VARCHAR(50) NOT NULL UNIQUE,
      warehouse_id INT DEFAULT 0,
      type VARCHAR(50) DEFAULT '',
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      remark TEXT DEFAULT NULL,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS other_inbound_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      inbound_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS other_outbound (
      id INT PRIMARY KEY AUTO_INCREMENT,
      outbound_no VARCHAR(50) NOT NULL UNIQUE,
      warehouse_id INT DEFAULT 0,
      type VARCHAR(50) DEFAULT '',
      total_amount DOUBLE DEFAULT 0,
      status INT DEFAULT 0,
      remark TEXT DEFAULT NULL,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS other_outbound_item (
      id INT PRIMARY KEY AUTO_INCREMENT,
      outbound_id INT DEFAULT 0,
      product_id INT DEFAULT 0,
      quantity DOUBLE DEFAULT 0,
      price DOUBLE DEFAULT 0,
      amount DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS finance_payment (
      id INT PRIMARY KEY AUTO_INCREMENT,
      payment_no VARCHAR(50) NOT NULL UNIQUE,
      supplier_id INT DEFAULT 0,
      inbound_id INT DEFAULT 0,
      amount DOUBLE DEFAULT 0,
      pay_method VARCHAR(50) DEFAULT '',
      status INT DEFAULT 0,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS finance_receipt (
      id INT PRIMARY KEY AUTO_INCREMENT,
      receipt_no VARCHAR(50) NOT NULL UNIQUE,
      customer_id INT DEFAULT 0,
      delivery_id INT DEFAULT 0,
      amount DOUBLE DEFAULT 0,
      pay_method VARCHAR(50) DEFAULT '',
      status INT DEFAULT 0,
      creator_id INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS system_log (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT DEFAULT 0,
      module VARCHAR(100) DEFAULT '',
      action VARCHAR(100) DEFAULT '',
      target VARCHAR(255) DEFAULT '',
      content TEXT DEFAULT NULL,
      ip VARCHAR(50) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS system_config (
      id INT PRIMARY KEY AUTO_INCREMENT,
      \`key\` VARCHAR(100) NOT NULL UNIQUE,
      value TEXT DEFAULT NULL,
      description TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS print_template (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT '',
      content TEXT DEFAULT NULL,
      is_default TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log('MySQL 数据库表创建/校验完成');
  } finally {
    conn.release();
  }
}

async function initData() {
  const [countRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM sys_role');
  if (Number(countRows[0].cnt) > 0) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

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
    await conn.execute(
      'INSERT INTO sys_role (name, permissions, description) VALUES (?, ?, ?)',
      ['admin', JSON.stringify(permissions), '超级管理员']
    );

    const hash = bcrypt.hashSync('admin123', 10);
    await conn.execute(
      'INSERT INTO sys_user (username, password_hash, real_name, role_id) VALUES (?, ?, ?, ?)',
      ['admin', hash, '系统管理员', 1]
    );

    const units = ['个', '箱', '件', 'kg', 'g', '瓶', '包', '卷', '台', '套'];
    for (const u of units) {
      await conn.execute('INSERT INTO unit (name) VALUES (?)', [u]);
    }

    await conn.execute('INSERT INTO warehouse (name, status) VALUES (?, 1)', ['默认仓库']);

    await conn.execute('INSERT INTO product_category (name, parent_id, sort_order) VALUES (?, 0, 1)', ['原材料']);
    await conn.execute('INSERT INTO product_category (name, parent_id, sort_order) VALUES (?, 0, 2)', ['半成品']);
    await conn.execute('INSERT INTO product_category (name, parent_id, sort_order) VALUES (?, 0, 3)', ['成品']);

    const configs = [
      ['company_name', '', '公司名称'],
      ['company_address', '', '公司地址'],
      ['company_phone', '', '公司电话'],
      ['default_warehouse_id', '1', '默认仓库ID']
    ];
    for (const [key, value, desc] of configs) {
      await conn.execute('INSERT INTO system_config (`key`, value, description) VALUES (?, ?, ?)', [key, value, desc]);
    }

    await conn.commit();
    console.log('MySQL 初始数据写入完成');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function getPool() {
  return pool;
}

module.exports = { initDatabase, getPool };
