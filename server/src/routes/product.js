const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', code = '', name = '', category_id = '', brand_id = '', status = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (code) { where += ' AND p.code LIKE ?'; params.push(`%${code}%`); }
    if (name) { where += ' AND p.name LIKE ?'; params.push(`%${name}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(Number(category_id)); }
    if (brand_id) { where += ' AND p.brand_id = ?'; params.push(Number(brand_id)); }
    if (status !== '') { where += ' AND p.status = ?'; params.push(Number(status)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(`SELECT COUNT(*) AS cnt FROM product p WHERE ${where}`, params);
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT p.*, pc.name AS category_name, b.name AS brand_name, u.name AS unit_name, sc.name AS supplier_name,
              COALESCE(stock.stock_total, 0) AS stock_total,
              COALESCE(pu_count.unit_count, 0) AS unit_count,
              CASE WHEN COALESCE(pu_count.unit_count, 0) > 1 THEN 1 ELSE 0 END AS is_multi_spec
       FROM product p
       LEFT JOIN product_category pc ON p.category_id = pc.id
       LEFT JOIN brand b ON p.brand_id = b.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN supplier_customer sc ON p.default_supplier_id = sc.id
       LEFT JOIN (
         SELECT product_id, SUM(quantity) AS stock_total
         FROM inventory_stock
         GROUP BY product_id
       ) stock ON p.id = stock.product_id
       LEFT JOIN (
         SELECT product_id, COUNT(*) AS unit_count
         FROM product_unit
         GROUP BY product_id
       ) pu_count ON p.id = pu_count.product_id
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
    const product = rows[0];
    const [units] = await pool.execute(
      `SELECT pu.*, u.name AS unit_name
       FROM product_unit pu
       LEFT JOIN unit u ON pu.unit_id = u.id
       WHERE pu.product_id = ?
       ORDER BY pu.sort_order ASC, pu.id ASC`,
      [product.id]
    );
    product.units = units.map(item => ({
      ...item,
      member_prices: parseJson(item.member_prices, {})
    }));
    res.json(Response.success(product));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      name,
      code = '',
      spec = '',
      unit_id = 0,
      category_id = 0,
      brand_id = 0,
      default_supplier_id = 0,
      cost_price = 0,
      sale_price = 0,
      description = '',
      image_urls = null,
      status = 1,
      units = []
    } = req.body;
    if (!name) return res.json(Response.error('产品名称不能为空'));

    const unitRows = normalizeUnits(units);
    const firstUnit = unitRows[0] || {};
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const productCode = String(code || '').trim() || await generateProductCode(conn);
      const [result] = await conn.execute(
        `INSERT INTO product
         (name, code, barcode, spec, unit_id, category_id, brand_id, default_supplier_id, cost_price, sale_price, description, image_urls, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          name,
          productCode,
          '',
          spec || firstUnit.spec || '',
          unit_id || firstUnit.unit_id || 0,
          category_id,
          brand_id,
          default_supplier_id,
          cost_price || firstUnit.cost_price || 0,
          sale_price || firstUnit.sale_price || 0,
          description,
          JSON.stringify(image_urls ?? []),
          status
        ]
      );
      const productId = result.insertId;
      await saveProductUnits(conn, productId, unitRows);
      await conn.commit();
      await writeSystemLog(pool, req.user.id, '产品管理', '新增产品', name);
      res.json(Response.success({ id: productId }));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, code, barcode, spec, unit_id, category_id, brand_id, default_supplier_id, cost_price, sale_price, description, image_urls, status, units } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name=?'); params.push(name); }
    if (code !== undefined) { fields.push('code=?'); params.push(code); }
    if (barcode !== undefined) { fields.push('barcode=?'); params.push(barcode); }
    if (spec !== undefined) { fields.push('spec=?'); params.push(spec); }
    if (unit_id !== undefined) { fields.push('unit_id=?'); params.push(unit_id); }
    if (category_id !== undefined) { fields.push('category_id=?'); params.push(category_id); }
    if (brand_id !== undefined) { fields.push('brand_id=?'); params.push(brand_id); }
    if (default_supplier_id !== undefined) { fields.push('default_supplier_id=?'); params.push(default_supplier_id); }
    if (cost_price !== undefined) { fields.push('cost_price=?'); params.push(cost_price); }
    if (sale_price !== undefined) { fields.push('sale_price=?'); params.push(sale_price); }
    if (description !== undefined) { fields.push('description=?'); params.push(description); }
    if (image_urls !== undefined) { fields.push('image_urls=?'); params.push(JSON.stringify(image_urls)); }
    if (status !== undefined) { fields.push('status=?'); params.push(status); }
    if (!fields.length && units === undefined) return res.json(Response.error('无更新数据'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (fields.length) {
        params.push(req.params.id);
        await conn.execute(`UPDATE product SET ${fields.join(',')} WHERE id=?`, params);
      }
      if (units !== undefined) {
        const unitRows = normalizeUnits(units);
        await conn.execute('DELETE FROM product_unit WHERE product_id = ?', [req.params.id]);
        await saveProductUnits(conn, req.params.id, unitRows);
      }
      await conn.commit();
      await writeSystemLog(pool, req.user.id, '产品管理', '编辑产品', String(req.params.id));
      res.json(Response.success());
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM product_unit WHERE product_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM product WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '产品管理', '删除产品', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function normalizeUnits(units) {
  if (!Array.isArray(units)) return [];
  return units
    .filter(item => item && item.unit_id)
    .map((item, index) => ({
      unit_id: Number(item.unit_id || 0),
      warehouse_id: Number(item.warehouse_id || 0),
      is_base: item.is_base ? 1 : 0,
      base_quantity: Number(item.base_quantity || 1),
      code: item.code || '',
      barcode: item.barcode || '',
      weight: Number(item.weight || 0),
      volume: Number(item.volume || 0),
      sale_price: Number(item.sale_price || 0),
      cost_price: Number(item.cost_price || 0),
      member_prices: item.member_prices && typeof item.member_prices === 'object' ? item.member_prices : {},
      spec: item.spec || '',
      bm_code: item.bm_code || '',
      remark: item.remark || '',
      sort_order: Number(item.sort_order ?? index)
    }));
}

async function saveProductUnits(conn, productId, units) {
  for (const item of units) {
    await conn.execute(
      `INSERT INTO product_unit
       (product_id, unit_id, warehouse_id, is_base, base_quantity, code, barcode, weight, volume, sale_price, cost_price, member_prices, spec, bm_code, remark, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        productId,
        item.unit_id,
        item.warehouse_id,
        item.is_base,
        item.base_quantity,
        item.code,
        item.barcode,
        item.weight,
        item.volume,
        item.sale_price,
        item.cost_price,
        JSON.stringify(item.member_prices),
        item.spec,
        item.bm_code,
        item.remark,
        item.sort_order
      ]
    );
  }
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function generateProductCode(conn) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  for (let i = 0; i < 20; i += 1) {
    const code = `pu${date}${randomChars(3)}`;
    const [rows] = await conn.execute('SELECT id FROM product WHERE code = ? LIMIT 1', [code]);
    if (!rows.length) return code;
  }
  return `pu${date}${randomChars(3)}${Date.now().toString(36).slice(-2)}`;
}

function randomChars(length) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }
  return text;
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
