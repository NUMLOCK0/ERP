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

router.get('/category', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute('SELECT * FROM supplier_category ORDER BY id DESC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/category', async (req, res) => {
  try {
    const pool = getPool();
    const { name, description = '' } = req.body;
    if (!name) return res.json(Response.error('分类名称不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO supplier_category (name, description) VALUES (?, ?)',
      [name, description]
    );
    await writeSystemLog(pool, req.user.id, '供应商分类', '新增供应商分类', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/category/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, description = '' } = req.body;
    if (!name) return res.json(Response.error('分类名称不能为空'));
    await pool.execute(
      'UPDATE supplier_category SET name=?, description=? WHERE id=?',
      [name, description, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '供应商分类', '编辑供应商分类', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/category/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM supplier_category WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '供应商分类', '删除供应商分类', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/member-level', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      id = '',
      name = '',
      description = '',
      status = '',
      sort_min = '',
      sort_max = '',
      created_start = '',
      created_end = '',
      updated_start = '',
      updated_end = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (id) { where += ' AND id = ?'; params.push(Number(id)); }
    if (name) { where += ' AND name LIKE ?'; params.push(`%${name}%`); }
    if (description) { where += ' AND description LIKE ?'; params.push(`%${description}%`); }
    if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    if (sort_min !== '') { where += ' AND sort_order >= ?'; params.push(Number(sort_min)); }
    if (sort_max !== '') { where += ' AND sort_order <= ?'; params.push(Number(sort_max)); }
    if (created_start) { where += ' AND created_at >= ?'; params.push(created_start); }
    if (created_end) { where += ' AND created_at <= ?'; params.push(`${created_end} 23:59:59`); }
    if (updated_start) { where += ' AND updated_at >= ?'; params.push(updated_start); }
    if (updated_end) { where += ' AND updated_at <= ?'; params.push(`${updated_end} 23:59:59`); }

    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(`SELECT COUNT(*) AS cnt FROM member_level WHERE ${where}`, params);
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT * FROM member_level WHERE ${where} ORDER BY sort_order ASC, id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/member-level/all', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute('SELECT * FROM member_level WHERE status = 1 ORDER BY sort_order ASC, id DESC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/member-level/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM member_level WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('会员等级不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/member-level', async (req, res) => {
  try {
    const pool = getPool();
    const { name, description = '', icon_url = '', sort_order = 0, status = 1 } = req.body;
    if (!name) return res.json(Response.error('名称不能为空'));
    if (String(name).length > 30) return res.json(Response.error('名称不能超过30个字符'));
    if (String(description).length > 230) return res.json(Response.error('描述不能超过230个字符'));
    const [result] = await pool.execute(
      'INSERT INTO member_level (name, description, icon_url, sort_order, status) VALUES (?,?,?,?,?)',
      [name, description, icon_url, sort_order, status]
    );
    await writeSystemLog(pool, req.user.id, '会员等级', '新增会员等级', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/member-level/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, description = '', icon_url = '', sort_order = 0, status = 1 } = req.body;
    if (!name) return res.json(Response.error('名称不能为空'));
    if (String(name).length > 30) return res.json(Response.error('名称不能超过30个字符'));
    if (String(description).length > 230) return res.json(Response.error('描述不能超过230个字符'));
    await pool.execute(
      'UPDATE member_level SET name=?, description=?, icon_url=?, sort_order=?, status=? WHERE id=?',
      [name, description, icon_url, sort_order, status, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '会员等级', '编辑会员等级', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/member-level/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM member_level WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '会员等级', '删除会员等级', String(req.params.id));
    res.json(Response.success());
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
