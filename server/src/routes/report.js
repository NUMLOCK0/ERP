const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

// ==================== 产品库存报表 ====================

router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (warehouse_id) { where += ' AND ist.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_stock ist LEFT JOIN product p ON ist.product_id = p.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ist.*, p.name AS product_name, p.code, p.spec, p.sale_price, w.name AS warehouse_name
       FROM inventory_stock ist
       LEFT JOIN product p ON ist.product_id = p.id
       LEFT JOIN warehouse w ON ist.warehouse_id = w.id
       WHERE ${where} ORDER BY ist.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购入库报表 ====================

router.get('/purchase-inbound', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, start_date = '', end_date = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (warehouse_id) { where += ' AND pi.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM purchase_inbound pi LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id LEFT JOIN warehouse w ON pi.warehouse_id = w.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT pi.*, sc.name AS supplier_name, w.name AS warehouse_name
       FROM purchase_inbound pi
       LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id
       LEFT JOIN warehouse w ON pi.warehouse_id = w.id
       WHERE ${where} ORDER BY pi.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售发货报表 ====================

router.get('/sale-delivery', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, start_date = '', end_date = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (warehouse_id) { where += ' AND sd.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM sale_delivery sd LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id LEFT JOIN warehouse w ON sd.warehouse_id = w.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sd.*, sc.name AS customer_name, w.name AS warehouse_name
       FROM sale_delivery sd
       LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       WHERE ${where} ORDER BY sd.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购订单报表 ====================

router.get('/purchase-order', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, start_date = '', end_date = '', status } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND po.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND po.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (status !== undefined && status !== '') { where += ' AND po.status = ?'; params.push(Number(status)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM purchase_order po LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT po.*, sc.name AS supplier_name FROM purchase_order po LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id WHERE ${where} ORDER BY po.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售订单报表 ====================

router.get('/sale-order', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, start_date = '', end_date = '', status } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND so.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND so.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (status !== undefined && status !== '') { where += ' AND so.status = ?'; params.push(Number(status)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM sale_order so LEFT JOIN supplier_customer sc ON so.customer_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT so.*, sc.name AS customer_name FROM sale_order so LEFT JOIN supplier_customer sc ON so.customer_id = sc.id WHERE ${where} ORDER BY so.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购付款报表 ====================

router.get('/payment', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND fp.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fp.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fp.*, sc.name AS supplier_name FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id WHERE ${where} ORDER BY fp.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售收款报表 ====================

router.get('/receipt', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND fr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fr.*, sc.name AS customer_name FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id WHERE ${where} ORDER BY fr.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 入库汇总（按产品） ====================

router.get('/inbound-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const [list] = await pool.execute(
      `SELECT pii.product_id, p.name AS product_name, p.code, SUM(pii.quantity) AS total_quantity, SUM(pii.amount) AS total_amount
       FROM purchase_inbound_item pii
       LEFT JOIN purchase_inbound pi ON pii.inbound_id = pi.id
       LEFT JOIN product p ON pii.product_id = p.id
       WHERE ${where}
       GROUP BY pii.product_id, p.name, p.code ORDER BY total_amount DESC`, params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 出库汇总（按产品） ====================

router.get('/outbound-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const [list] = await pool.execute(
      `SELECT sdi.product_id, p.name AS product_name, p.code, SUM(sdi.quantity) AS total_quantity, SUM(sdi.amount) AS total_amount
       FROM sale_delivery_item sdi
       LEFT JOIN sale_delivery sd ON sdi.delivery_id = sd.id
       LEFT JOIN product p ON sdi.product_id = p.id
       WHERE ${where}
       GROUP BY sdi.product_id, p.name, p.code ORDER BY total_amount DESC`, params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

module.exports = router;
