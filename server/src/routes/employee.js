const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(`SELECT COUNT(*) AS cnt FROM employee WHERE ${where}`, params);
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT * FROM employee WHERE ${where} ORDER BY id DESC LIMIT ?, ?`,
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
    const [list] = await pool.execute('SELECT id, name, position, department FROM employee WHERE status = 1 ORDER BY id DESC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM employee WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('职员不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name, phone = '', position = '', department = '', status = 1 } = req.body;
    if (!name) return res.json(Response.error('姓名不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO employee (name, phone, position, department, status) VALUES (?,?,?,?,?)',
      [name, phone, position, department, status]
    );
    await writeSystemLog(pool, req.user.id, '职员管理', '新增职员', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, phone, position, department, status } = req.body;
    if (!name) return res.json(Response.error('姓名不能为空'));
    await pool.execute(
      'UPDATE employee SET name=?, phone=?, position=?, department=?, status=? WHERE id=?',
      [name, phone ?? '', position ?? '', department ?? '', status ?? 1, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '职员管理', '编辑职员', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM employee WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '职员管理', '删除职员', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
