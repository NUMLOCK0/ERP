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
    if (keyword) {
      where += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }
    const [all] = await pool.execute(
      `SELECT * FROM unit WHERE ${where} ORDER BY is_default DESC, id ASC`,
      params
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
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const { name, is_default = 0 } = req.body;
    if (!name) return res.json(Response.error('单位名称不能为空'));

    await connection.beginTransaction();
    if (Number(is_default) === 1) {
      await connection.execute('UPDATE unit SET is_default = 0 WHERE is_default = 1');
    }
    const [result] = await connection.execute(
      'INSERT INTO unit (name, is_default) VALUES (?, ?)',
      [name, Number(is_default) === 1 ? 1 : 0]
    );
    await writeSystemLog(connection, req.user.id, '单位管理', '新增单位', name);
    await connection.commit();
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    await connection.rollback();
    res.json(Response.error(err.message));
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const { name, is_default = 0 } = req.body;
    if (!name) return res.json(Response.error('单位名称不能为空'));

    await connection.beginTransaction();
    if (Number(is_default) === 1) {
      await connection.execute('UPDATE unit SET is_default = 0 WHERE id <> ?', [req.params.id]);
    }
    await connection.execute(
      'UPDATE unit SET name=?, is_default=? WHERE id=?',
      [name, Number(is_default) === 1 ? 1 : 0, req.params.id]
    );
    await writeSystemLog(connection, req.user.id, '单位管理', '编辑单位', name);
    await connection.commit();
    res.json(Response.success());
  } catch (err) {
    await connection.rollback();
    res.json(Response.error(err.message));
  } finally {
    connection.release();
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

async function writeSystemLog(connection, userId, module, action, target) {
  await connection.execute(
    'INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)',
    [userId, module, action, target]
  );
}

module.exports = router;
