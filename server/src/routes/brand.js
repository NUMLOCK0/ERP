const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// 列表
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND name LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM brand WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM brand WHERE ${where} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 全部（下拉选择用）
router.get('/all', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare('SELECT id, name FROM brand ORDER BY sort_order ASC').all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 详情
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM brand WHERE id = ?').get(req.params.id);
    if (!row) return res.json(Response.error('品牌不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, sort_order = 0 } = req.body;
    if (!name) return res.json(Response.error('品牌名称不能为空'));
    const result = db.prepare('INSERT INTO brand (name, sort_order) VALUES (?, ?)').run(name, sort_order);
    writeSystemLog(db, req.user.id, '品牌管理', '新增', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, sort_order } = req.body;
    if (!name) return res.json(Response.error('品牌名称不能为空'));
    db.prepare('UPDATE brand SET name = ?, sort_order = ? WHERE id = ?').run(name, sort_order ?? 0, req.params.id);
    writeSystemLog(db, req.user.id, '品牌管理', '编辑', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM brand WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '品牌管理', '删除', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
