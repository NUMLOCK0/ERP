const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND name LIKE ?'; params.push(`%${keyword}%`); }
    const [all] = await pool.execute(
      `SELECT * FROM warehouse WHERE ${where} ORDER BY id ASC`, params
    );
    res.json(Response.success(all));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM warehouse WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('仓库不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name, address = '', manager = '', phone = '', status = 1 } = req.body;
    if (!name) return res.json(Response.error('仓库名称不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO warehouse (name, address, manager, phone, status) VALUES (?,?,?,?,?)',
      [name, address, manager, phone, status]
    );
    await writeSystemLog(pool, req.user.id, '仓库管理', '新增仓库', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, address, manager, phone, status } = req.body;
    if (!name) return res.json(Response.error('仓库名称不能为空'));
    await pool.execute(
      'UPDATE warehouse SET name=?, address=?, manager=?, phone=?, status=? WHERE id=?',
      [name, address ?? '', manager ?? '', phone ?? '', status ?? 1, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '仓库管理', '编辑仓库', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [stockRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM inventory_stock WHERE warehouse_id = ?', [req.params.id]);
    if (Number(stockRows[0].cnt) > 0) {
      return res.json(Response.error('该仓库下还有库存，不能删除'));
    }
    await pool.execute('DELETE FROM warehouse WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '仓库管理', '删除仓库', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
