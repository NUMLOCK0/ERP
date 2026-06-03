const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// 列表
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', status } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (name LIKE ? OR manager LIKE ? OR phone LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (status !== undefined && status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM warehouse WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM warehouse WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 全部
router.get('/all', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare('SELECT id, name FROM warehouse WHERE status = 1 ORDER BY id ASC').all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 详情
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM warehouse WHERE id = ?').get(req.params.id);
    if (!row) return res.json(Response.error('仓库不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, address = '', manager = '', phone = '', status = 1 } = req.body;
    if (!name) return res.json(Response.error('仓库名称不能为空'));
    const result = db.prepare('INSERT INTO warehouse (name, address, manager, phone, status) VALUES (?, ?, ?, ?, ?)').run(name, address, manager, phone, status);
    writeSystemLog(db, req.user.id, '仓库管理', '新增', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, address, manager, phone, status } = req.body;
    if (!name) return res.json(Response.error('仓库名称不能为空'));
    db.prepare('UPDATE warehouse SET name = ?, address = ?, manager = ?, phone = ?, status = ? WHERE id = ?').run(name, address ?? '', manager ?? '', phone ?? '', status ?? 1, req.params.id);
    writeSystemLog(db, req.user.id, '仓库管理', '编辑', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const stock = db.prepare('SELECT COUNT(*) AS cnt FROM inventory_stock WHERE warehouse_id = ? AND quantity > 0').get(req.params.id);
    if (stock.cnt > 0) return res.json(Response.error('该仓库仍有库存，无法删除'));
    db.prepare('DELETE FROM warehouse WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '仓库管理', '删除', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
