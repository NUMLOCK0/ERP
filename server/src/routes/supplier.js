const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// 列表
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', type = '', status } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (name LIKE ? OR contact LIKE ? OR phone LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (type) { where += ' AND type = ?'; params.push(type); }
    if (status !== undefined && status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM supplier_customer WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM supplier_customer WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 全部供应商
router.get('/suppliers', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare("SELECT id, name FROM supplier_customer WHERE status = 1 AND type IN ('supplier','both') ORDER BY id ASC").all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 全部客户
router.get('/customers', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare("SELECT id, name FROM supplier_customer WHERE status = 1 AND type IN ('customer','both') ORDER BY id ASC").all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 详情
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM supplier_customer WHERE id = ?').get(req.params.id);
    if (!row) return res.json(Response.error('客商不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, type = 'supplier', contact = '', phone = '', email = '', address = '', bank_name = '', bank_account = '', tax_no = '', status = 1 } = req.body;
    if (!name) return res.json(Response.error('客商名称不能为空'));
    if (!['supplier', 'customer', 'both'].includes(type)) return res.json(Response.error('类型无效'));
    const result = db.prepare(`INSERT INTO supplier_customer (name, type, contact, phone, email, address, bank_name, bank_account, tax_no, status) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(name, type, contact, phone, email, address, bank_name, bank_account, tax_no, status);
    writeSystemLog(db, req.user.id, '客商管理', '新增', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, type, contact, phone, email, address, bank_name, bank_account, tax_no, status } = req.body;
    if (!name) return res.json(Response.error('客商名称不能为空'));
    db.prepare(`UPDATE supplier_customer SET name=?, type=?, contact=?, phone=?, email=?, address=?, bank_name=?, bank_account=?, tax_no=?, status=? WHERE id=?`).run(name, type ?? 'supplier', contact ?? '', phone ?? '', email ?? '', address ?? '', bank_name ?? '', bank_account ?? '', tax_no ?? '', status ?? 1, req.params.id);
    writeSystemLog(db, req.user.id, '客商管理', '编辑', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM supplier_customer WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '客商管理', '删除', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
