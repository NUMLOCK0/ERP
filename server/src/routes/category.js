const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// 获取分类树
router.get('/tree', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM product_category ORDER BY sort_order ASC, id ASC').all();
    const tree = buildTree(rows, 0);
    res.json(Response.success(tree));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 列表（平铺，带分页）
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND name LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM product_category WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM product_category WHERE ${where} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 详情
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM product_category WHERE id = ?').get(req.params.id);
    if (!row) return res.json(Response.error('分类不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, parent_id = 0, sort_order = 0 } = req.body;
    if (!name) return res.json(Response.error('分类名称不能为空'));
    const result = db.prepare('INSERT INTO product_category (name, parent_id, sort_order) VALUES (?, ?, ?)').run(name, parent_id, sort_order);
    writeSystemLog(db, req.user.id, '产品分类', '新增', name, `新增产品分类: ${name}`);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, parent_id, sort_order } = req.body;
    if (!name) return res.json(Response.error('分类名称不能为空'));
    db.prepare('UPDATE product_category SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?').run(name, parent_id ?? 0, sort_order ?? 0, req.params.id);
    writeSystemLog(db, req.user.id, '产品分类', '编辑', name, `编辑产品分类: ${name}`);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const children = db.prepare('SELECT COUNT(*) AS cnt FROM product_category WHERE parent_id = ?').get(req.params.id);
    if (children.cnt > 0) return res.json(Response.error('存在子分类，无法删除'));
    db.prepare('DELETE FROM product_category WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '产品分类', '删除', String(req.params.id), '删除产品分类');
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function buildTree(rows, parentId) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

function writeSystemLog(db, userId, module, action, target, content) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target, content) VALUES (?, ?, ?, ?, ?)').run(userId, module, action, target, content);
}

module.exports = router;
