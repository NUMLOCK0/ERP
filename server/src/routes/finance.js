const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

// ==================== 采购付款 ====================

router.get('/payment', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (fp.payment_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND fp.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fp.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fp.*, sc.name AS supplier_name, u.real_name AS creator_name
       FROM finance_payment fp
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       LEFT JOIN sys_user u ON fp.creator_id = u.id
       WHERE ${where} ORDER BY fp.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/payment/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT fp.*, sc.name AS supplier_name FROM finance_payment fp LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id WHERE fp.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('付款单不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/payment', async (req, res) => {
  try {
    const pool = getPool();
    const { supplier_id, inbound_id = 0, amount, pay_method = '', status = 1 } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!amount || amount <= 0) return res.json(Response.error('金额无效'));

    const paymentNo = await generateNo(pool, 'FK');
    const [result] = await pool.execute(
      'INSERT INTO finance_payment (payment_no, supplier_id, inbound_id, amount, pay_method, status, creator_id) VALUES (?,?,?,?,?,?,?)',
      [paymentNo, supplier_id, inbound_id, amount, pay_method, status, req.user.id]
    );
    await writeSystemLog(pool, req.user.id, '资金账单', '新增付款单', paymentNo);
    res.json(Response.success({ id: result.insertId, payment_no: paymentNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/payment/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { amount, pay_method, status } = req.body;
    await pool.execute(
      'UPDATE finance_payment SET amount=?, pay_method=?, status=? WHERE id=?',
      [amount ?? 0, pay_method ?? '', status ?? 1, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '资金账单', '编辑付款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/payment/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM finance_payment WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '资金账单', '删除付款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售收款 ====================

router.get('/receipt', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (fr.receipt_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND fr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fr.*, sc.name AS customer_name, u.real_name AS creator_name
       FROM finance_receipt fr
       LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
       LEFT JOIN sys_user u ON fr.creator_id = u.id
       WHERE ${where} ORDER BY fr.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/receipt/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT fr.*, sc.name AS customer_name FROM finance_receipt fr LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id WHERE fr.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('收款单不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/receipt', async (req, res) => {
  try {
    const pool = getPool();
    const { customer_id, delivery_id = 0, amount, pay_method = '', status = 1 } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!amount || amount <= 0) return res.json(Response.error('金额无效'));

    const receiptNo = await generateNo(pool, 'SK');
    const [result] = await pool.execute(
      'INSERT INTO finance_receipt (receipt_no, customer_id, delivery_id, amount, pay_method, status, creator_id) VALUES (?,?,?,?,?,?,?)',
      [receiptNo, customer_id, delivery_id, amount, pay_method, status, req.user.id]
    );
    await writeSystemLog(pool, req.user.id, '资金账单', '新增收款单', receiptNo);
    res.json(Response.success({ id: result.insertId, receipt_no: receiptNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/receipt/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { amount, pay_method, status } = req.body;
    await pool.execute(
      'UPDATE finance_receipt SET amount=?, pay_method=?, status=? WHERE id=?',
      [amount ?? 0, pay_method ?? '', status ?? 1, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '资金账单', '编辑收款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/receipt/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM finance_receipt WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '资金账单', '删除收款单', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function generateNo(pool, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tableMap = {
    'FK': { table: 'finance_payment', col: 'payment_no' },
    'SK': { table: 'finance_receipt', col: 'receipt_no' }
  };
  const mapping = tableMap[prefix] || { table: 'finance_payment', col: 'payment_no' };
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM ${mapping.table} WHERE ${mapping.col} LIKE ?`,
    [`${prefix}-${dateStr}-%`]
  );
  const seq = (Number(rows[0]?.cnt) || 0) + 1;
  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
