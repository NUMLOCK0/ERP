const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', category_id = '', brand_id = '', status = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(Number(category_id)); }
    if (brand_id) { where += ' AND p.brand_id = ?'; params.push(Number(brand_id)); }
    if (status !== '') { where += ' AND p.status = ?'; params.push(Number(status)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM product p WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT p.*, pc.name AS category_name, b.name AS brand_name, u.name AS unit_name
       FROM product p
       LEFT JOIN product_category pc ON p.category_id = pc.id
       LEFT JOIN brand b ON p.brand_id = b.id
       LEFT JOIN unit u ON p.unit_id = u.id
       WHERE ${where} ORDER BY p.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/all', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute('SELECT id, name, code, spec, cost_price, sale_price FROM product WHERE status = 1 ORDER BY id DESC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM product WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('产品不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name, code = '', barcode = '', spec = '', unit_id = 0, category_id = 0, brand_id = 0, cost_price = 0, sale_price = 0, description = '', image_urls = null } = req.body;
    if (!name) return res.json(Response.error('产品名称不能为空'));
    const [result] = await pool.execute(
      `INSERT INTO product (name, code, barcode, spec, unit_id, category_id, brand_id, cost_price, sale_price, description, image_urls)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [name, code, barcode, spec, unit_id, category_id, brand_id, cost_price, sale_price, description, JSON.stringify(image_urls ?? [])]
    );
    await writeSystemLog(pool, req.user.id, '产品管理', '新增产品', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, code, barcode, spec, unit_id, category_id, brand_id, cost_price, sale_price, description, image_urls, status } = req.body;
    const fields = [], params = [];
    if (name !== undefined) { fields.push('name=?'); params.push(name); }
    if (code !== undefined) { fields.push('code=?'); params.push(code); }
    if (barcode !== undefined) { fields.push('barcode=?'); params.push(barcode); }
    if (spec !== undefined) { fields.push('spec=?'); params.push(spec); }
    if (unit_id !== undefined) { fields.push('unit_id=?'); params.push(unit_id); }
    if (category_id !== undefined) { fields.push('category_id=?'); params.push(category_id); }
    if (brand_id !== undefined) { fields.push('brand_id=?'); params.push(brand_id); }
    if (cost_price !== undefined) { fields.push('cost_price=?'); params.push(cost_price); }
    if (sale_price !== undefined) { fields.push('sale_price=?'); params.push(sale_price); }
    if (description !== undefined) { fields.push('description=?'); params.push(description); }
    if (image_urls !== undefined) { fields.push('image_urls=?'); params.push(JSON.stringify(image_urls)); }
    if (status !== undefined) { fields.push('status=?'); params.push(status); }
    if (!fields.length) return res.json(Response.error('无更新数据'));
    params.push(req.params.id);
    await pool.execute(`UPDATE product SET ${fields.join(',')} WHERE id=?`, params);
    await writeSystemLog(pool, req.user.id, '产品管理', '编辑产品', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM product WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '产品管理', '删除产品', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
