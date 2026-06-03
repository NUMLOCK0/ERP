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
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM unit WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM unit WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 全部
router.get('/all', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare('SELECT id, name FROM unit ORDER BY id ASC').all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 详情
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM unit WHERE id = ?').get(req.params.id);
    if (!row) return res.json(Response.error('单位不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name } = req.body;
    if (!name) return res.json(Response.error('单位名称不能为空'));
    const result = db.prepare('INSERT INTO unit (name) VALUES (?)').run(name);
    writeSystemLog(db, req.user.id, '计量单位', '新增', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name } = req.body;
    if (!name) return res.json(Response.error('单位名称不能为空'));
    db.prepare('UPDATE unit SET name = ? WHERE id = ?').run(name, req.params.id);
    writeSystemLog(db, req.user.id, '计量单位', '编辑', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM unit WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '计量单位', '删除', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
