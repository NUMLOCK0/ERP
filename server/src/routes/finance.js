const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

const PAYMENT_STATUS = {
  PENDING: 0,
  PAYING: 1,
  PAID: 2,
  CLOSED: 3
};

// ==================== 采购付款 ====================

router.get('/payment', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', payment_no = '', supplier_id = '', status = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    const searchText = keyword || payment_no;
    if (searchText) {
      where += ' AND (CAST(fp.id AS CHAR) LIKE ? OR fp.payment_no LIKE ? OR po.order_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${searchText}%`, `%${searchText}%`, `%${searchText}%`, `%${searchText}%`);
    }
    if (supplier_id) { where += ' AND fp.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status !== '') { where += ' AND fp.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND fp.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fp.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fp.id, fp.payment_no, fp.order_id, fp.inbound_id, fp.supplier_id,
              po.order_no, sc.name AS supplier_name,
              fp.status, fp.amount AS paid_total_amount,
              COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) AS receivable_total_amount,
              COALESCE(NULLIF(fp.pay_method, ''), po.payment_method) AS pay_method,
              fp.invoice_time, fp.invoice_status,
              po.total_amount AS purchase_total_amount,
              COALESCE(item_stats.purchase_total_quantity, 0) AS purchase_total_quantity,
              COALESCE(return_stats.refund_amount, 0) AS purchase_refund_amount,
              COALESCE(return_stats.return_amount, 0) AS purchase_return_amount,
              sc.contact, sc.phone, sc.address AS detail_address,
              sc.bank_name, sc.address AS bank_address, sc.name AS bank_account_name, sc.bank_account,
              COALESCE(NULLIF(fp.remark, ''), po.purchase_remark, po.admin_remark) AS remark,
              fp.payment_start_time, fp.payment_completed_time, fp.close_time, fp.created_at, fp.updated_at,
              u.real_name AS creator_name
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       LEFT JOIN sys_user u ON fp.creator_id = u.id
       LEFT JOIN (
         SELECT order_id, SUM(COALESCE(final_quantity, quantity)) AS purchase_total_quantity
         FROM purchase_order_item
         GROUP BY order_id
       ) item_stats ON po.id = item_stats.order_id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(pr.order_id, 0), pi.order_id) AS order_id,
                SUM(pr.total_amount) AS refund_amount,
                SUM(COALESCE(return_item_amount.amount, 0)) AS return_amount
         FROM purchase_return pr
         LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
         LEFT JOIN (
           SELECT return_id, SUM(amount) AS amount
           FROM purchase_return_item
           GROUP BY return_id
         ) return_item_amount ON pr.id = return_item_amount.return_id
         GROUP BY COALESCE(NULLIF(pr.order_id, 0), pi.order_id)
       ) return_stats ON po.id = return_stats.order_id
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
      `SELECT fp.*, po.order_no, sc.name AS supplier_name
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       WHERE fp.id = ?`,
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
    const { supplier_id, inbound_id = 0, order_id = 0, amount, should_amount = 0, pay_method = '', status = 1, remark = '' } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!amount || amount <= 0) return res.json(Response.error('金额无效'));

    const paymentNo = await generateNo(pool, 'FK');
    const [result] = await pool.execute(
      'INSERT INTO finance_payment (payment_no, order_id, supplier_id, inbound_id, amount, should_amount, pay_method, status, remark, creator_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [paymentNo, order_id, supplier_id, inbound_id, amount, should_amount, pay_method, status, remark, req.user.id]
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

router.post('/payment/:id/pay', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT fp.*, po.total_amount AS order_total_amount
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       WHERE fp.id = ?`,
      [req.params.id]
    );
    const payment = rows[0];
    if (!payment) throw new Error('付款单不存在');
    if (Number(payment.status) === PAYMENT_STATUS.CLOSED) throw new Error('已关闭付款单不允许支付');

    const payAmount = Number(req.body.amount || 0);
    const payMethod = req.body.pay_method || payment.pay_method || '';
    const remark = req.body.remark ?? payment.remark ?? '';
    if (payAmount <= 0) throw new Error('支付金额无效');

    const shouldAmount = Number(payment.should_amount || payment.order_total_amount || 0);
    const paidAmount = Number(payment.amount || 0) + payAmount;
    const nextStatus = shouldAmount > 0 && paidAmount >= shouldAmount ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PAYING;
    await conn.execute(
      `UPDATE finance_payment
       SET amount = ?, should_amount = ?, pay_method = ?, status = ?,
           remark = ?, payment_start_time = COALESCE(payment_start_time, NOW()),
           payment_completed_time = ?
       WHERE id = ?`,
      [paidAmount, shouldAmount, payMethod, nextStatus, remark, nextStatus === PAYMENT_STATUS.PAID ? new Date() : null, payment.id]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '资金账单', '采购付款单支付', payment.payment_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/payment/:id/invoice', async (req, res) => {
  try {
    const pool = getPool();
    const invoiceTime = req.body.invoice_time || new Date();
    const invoiceStatus = req.body.invoice_status === undefined ? 1 : Number(req.body.invoice_status);
    await pool.execute(
      'UPDATE finance_payment SET invoice_status = ?, invoice_time = ? WHERE id = ?',
      [invoiceStatus, invoiceTime, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '资金账单', '采购付款单开票', String(req.params.id));
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
