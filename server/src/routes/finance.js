const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// ==================== 采购付款 ====================

router.get('/payment', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (fp.payment_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND fp.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fp.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT fp.*, sc.name AS supplier_name, u.real_name AS creator_name FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id LEFT JOIN sys_user u ON fp.creator_id = u.id WHERE ${where} ORDER BY fp.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/payment/:id', (req, res) => {
  try {
    const db = getDatabase();
    const payment = db.prepare(`SELECT fp.*, sc.name AS supplier_name FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id WHERE fp.id = ?`).get(req.params.id);
    if (!payment) return res.json(Response.error('付款单不存在'));
    res.json(Response.success(payment));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/payment', (req, res) => {
  try {
    const db = getDatabase();
    const { supplier_id, inbound_id = 0, amount, pay_method = '', status = 1 } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!amount || amount <= 0) return res.json(Response.error('金额无效'));

    const paymentNo = generateNo(db, 'FK');
    const result = db.prepare(`INSERT INTO finance_payment (payment_no, supplier_id, inbound_id, amount, pay_method, status, creator_id) VALUES (?,?,?,?,?,?,?)`).run(paymentNo, supplier_id, inbound_id, amount, pay_method, status, req.user.id);
    writeSystemLog(db, req.user.id, '资金账单', '新增付款单', paymentNo);
    res.json(Response.success({ id: result.lastInsertRowid, payment_no: paymentNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/payment/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { amount, pay_method, status } = req.body;
    db.prepare('UPDATE finance_payment SET amount=?, pay_method=?, status=? WHERE id=?').run(amount ?? 0, pay_method ?? '', status ?? 1, req.params.id);
    writeSystemLog(db, req.user.id, '资金账单', '编辑付款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/payment/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM finance_payment WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '资金账单', '删除付款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售收款 ====================

router.get('/receipt', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (fr.receipt_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND fr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT fr.*, sc.name AS customer_name, u.real_name AS creator_name FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id LEFT JOIN sys_user u ON fr.creator_id = u.id WHERE ${where} ORDER BY fr.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/receipt/:id', (req, res) => {
  try {
    const db = getDatabase();
    const receipt = db.prepare(`SELECT fr.*, sc.name AS customer_name FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id WHERE fr.id = ?`).get(req.params.id);
    if (!receipt) return res.json(Response.error('收款单不存在'));
    res.json(Response.success(receipt));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/receipt', (req, res) => {
  try {
    const db = getDatabase();
    const { customer_id, delivery_id = 0, amount, pay_method = '', status = 1 } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!amount || amount <= 0) return res.json(Response.error('金额无效'));

    const receiptNo = generateNo(db, 'SK');
    const result = db.prepare(`INSERT INTO finance_receipt (receipt_no, customer_id, delivery_id, amount, pay_method, status, creator_id) VALUES (?,?,?,?,?,?,?)`).run(receiptNo, customer_id, delivery_id, amount, pay_method, status, req.user.id);
    writeSystemLog(db, req.user.id, '资金账单', '新增收款单', receiptNo);
    res.json(Response.success({ id: result.lastInsertRowid, receipt_no: receiptNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/receipt/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { amount, pay_method, status } = req.body;
    db.prepare('UPDATE finance_receipt SET amount=?, pay_method=?, status=? WHERE id=?').run(amount ?? 0, pay_method ?? '', status ?? 1, req.params.id);
    writeSystemLog(db, req.user.id, '资金账单', '编辑收款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/receipt/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM finance_receipt WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '资金账单', '删除收款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 工具 ====================

function generateNo(db, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tableMap = {
    'FK': { table: 'finance_payment', col: 'payment_no' },
    'SK': { table: 'finance_receipt', col: 'receipt_no' }
  };
  const mapping = tableMap[prefix] || { table: 'finance_payment', col: 'payment_no' };
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${mapping.table} WHERE ${mapping.col} LIKE ?`).get(`${prefix}-${dateStr}-%`);
  const seq = (row?.cnt || 0) + 1;
  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
