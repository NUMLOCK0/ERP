const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// 列表
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', category_id = '', brand_id = '', status } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ? OR p.spec LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(Number(category_id)); }
    if (brand_id) { where += ' AND p.brand_id = ?'; params.push(Number(brand_id)); }
    if (status !== undefined && status !== '') { where += ' AND p.status = ?'; params.push(Number(status)); }
    const total = db.prepare(`SELECT COUNT(DISTINCT p.id) AS cnt FROM product p LEFT JOIN brand b ON p.brand_id = b.id LEFT JOIN product_category c ON p.category_id = c.id LEFT JOIN unit u ON p.unit_id = u.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`
      SELECT p.*, b.name AS brand_name, c.name AS category_name, u.name AS unit_name
      FROM product p
      LEFT JOIN brand b ON p.brand_id = b.id
      LEFT JOIN product_category c ON p.category_id = c.id
      LEFT JOIN unit u ON p.unit_id = u.id
      WHERE ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 全部
router.get('/all', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare('SELECT id, name, code, spec, sale_price FROM product WHERE status = 1 ORDER BY id ASC').all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 详情
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT p.*, b.name AS brand_name, c.name AS category_name, u.name AS unit_name
      FROM product p
      LEFT JOIN brand b ON p.brand_id = b.id
      LEFT JOIN product_category c ON p.category_id = c.id
      LEFT JOIN unit u ON p.unit_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!row) return res.json(Response.error('产品不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { name, code = '', barcode = '', spec = '', unit_id = 0, category_id = 0, brand_id = 0, cost_price = 0, sale_price = 0, description = '', image_urls = '[]', status = 1 } = req.body;
    if (!name) return res.json(Response.error('产品名称不能为空'));
    const result = db.prepare(`INSERT INTO product (name, code, barcode, spec, unit_id, category_id, brand_id, cost_price, sale_price, description, image_urls, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(name, code, barcode, spec, unit_id, category_id, brand_id, cost_price, sale_price, description, typeof image_urls === 'string' ? image_urls : JSON.stringify(image_urls), status);
    writeSystemLog(db, req.user.id, '产品管理', '新增', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, code, barcode, spec, unit_id, category_id, brand_id, cost_price, sale_price, description, image_urls, status } = req.body;
    if (!name) return res.json(Response.error('产品名称不能为空'));
    db.prepare(`UPDATE product SET name=?, code=?, barcode=?, spec=?, unit_id=?, category_id=?, brand_id=?, cost_price=?, sale_price=?, description=?, image_urls=?, status=?, updated_at=datetime('now','localtime') WHERE id=?`).run(name, code ?? '', barcode ?? '', spec ?? '', unit_id ?? 0, category_id ?? 0, brand_id ?? 0, cost_price ?? 0, sale_price ?? 0, description ?? '', typeof image_urls === 'string' ? image_urls : JSON.stringify(image_urls ?? []), status ?? 1, req.params.id);
    writeSystemLog(db, req.user.id, '产品管理', '编辑', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const stock = db.prepare('SELECT SUM(quantity) AS qty FROM inventory_stock WHERE product_id = ?').get(req.params.id);
    if (stock.qty > 0) return res.json(Response.error('该产品仍有库存，无法删除'));
    db.prepare('DELETE FROM product WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '产品管理', '删除', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
