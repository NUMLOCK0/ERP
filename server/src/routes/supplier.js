const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', type = '', status = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (name LIKE ? OR contact LIKE ? OR phone LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (type) { where += ' AND type = ?'; params.push(type); }
    if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(`SELECT COUNT(*) AS cnt FROM supplier_customer WHERE ${where}`, params);
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT * FROM supplier_customer WHERE ${where} ORDER BY id DESC LIMIT ?, ?`,
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
    const { type = '' } = req.query;
    let where = 'status = 1';
    const params = [];
    if (type) { where += ' AND type = ?'; params.push(type); }
    const [list] = await pool.execute(
      `SELECT id, name, type, contact, phone FROM supplier_customer WHERE ${where} ORDER BY id DESC`, params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM supplier_customer WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('客商不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name, type = 'supplier', contact = '', phone = '', email = '', address = '', bank_name = '', bank_account = '', tax_no = '', status = 1 } = req.body;
    if (!name) return res.json(Response.error('客商名称不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO supplier_customer (name, type, contact, phone, email, address, bank_name, bank_account, tax_no, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [name, type, contact, phone, email, address, bank_name, bank_account, tax_no, status]
    );
    await writeSystemLog(pool, req.user.id, '客商管理', '新增客商', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, type, contact, phone, email, address, bank_name, bank_account, tax_no, status } = req.body;
    if (!name) return res.json(Response.error('客商名称不能为空'));
    await pool.execute(
      'UPDATE supplier_customer SET name=?, type=?, contact=?, phone=?, email=?, address=?, bank_name=?, bank_account=?, tax_no=?, status=? WHERE id=?',
      [name, type ?? 'supplier', contact ?? '', phone ?? '', email ?? '', address ?? '', bank_name ?? '', bank_account ?? '', tax_no ?? '', status ?? 1, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '客商管理', '编辑客商', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM supplier_customer WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '客商管理', '删除客商', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
