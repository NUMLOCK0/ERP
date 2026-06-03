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
      `SELECT * FROM brand WHERE ${where} ORDER BY sort_order ASC, id ASC`, params
    );
    res.json(Response.success(all));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM brand WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('品牌不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name, sort_order = 0 } = req.body;
    if (!name) return res.json(Response.error('品牌名称不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO brand (name, sort_order) VALUES (?,?)', [name, sort_order]
    );
    await writeSystemLog(pool, req.user.id, '品牌管理', '新增品牌', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, sort_order } = req.body;
    if (!name) return res.json(Response.error('品牌名称不能为空'));
    await pool.execute(
      'UPDATE brand SET name=?, sort_order=? WHERE id=?',
      [name, sort_order ?? 0, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '品牌管理', '编辑品牌', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM brand WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '品牌管理', '删除品牌', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
