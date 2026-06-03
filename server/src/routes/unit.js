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
      `SELECT * FROM unit WHERE ${where} ORDER BY id ASC`, params
    );
    res.json(Response.success(all));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM unit WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('单位不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name } = req.body;
    if (!name) return res.json(Response.error('单位名称不能为空'));
    const [result] = await pool.execute('INSERT INTO unit (name) VALUES (?)', [name]);
    await writeSystemLog(pool, req.user.id, '单位管理', '新增单位', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name } = req.body;
    if (!name) return res.json(Response.error('单位名称不能为空'));
    await pool.execute('UPDATE unit SET name=? WHERE id=?', [name, req.params.id]);
    await writeSystemLog(pool, req.user.id, '单位管理', '编辑单位', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM unit WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '单位管理', '删除单位', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
