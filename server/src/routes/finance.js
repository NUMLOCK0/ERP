const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { generateBusinessNo } = require('../utils/bizNo');

const PAYMENT_STATUS = {
  PENDING: 0,
  PAYING: 1,
  PAID: 2,
  CLOSED: 3
};

const RECEIPT_STATUS = {
  PENDING: 0,
  RECEIVING: 1,
  RECEIVED: 2,
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
              CASE
                WHEN fp.status <> 3
                  AND COALESCE(fp.amount, 0) >= COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0)
                  AND COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) > 0 THEN 2
                ELSE fp.status
              END AS status,
              fp.amount AS paid_total_amount,
              COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) AS receivable_total_amount,
              COALESCE(NULLIF(fp.pay_method, ''), po.payment_method) AS pay_method,
              COALESCE(invoice_stats.invoice_time, fp.invoice_time) AS invoice_time,
              CASE
                WHEN COALESCE(invoice_stats.invoice_total_amount, 0) >= COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0)
                  AND COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) > 0 THEN 1
                WHEN COALESCE(invoice_stats.invoice_total_amount, 0) > 0 THEN 2
                ELSE fp.invoice_status
              END AS invoice_status,
              COALESCE(invoice_stats.invoice_total_amount, 0) AS invoice_total_amount,
              COALESCE(invoice_stats.invoice_count, 0) AS invoice_count,
              fp.invoice_remark, fp.invoice_attachment_urls,
              fp.payer, fp.pay_time, fp.voucher_urls,
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
         SELECT order_id,
                SUM(total_amount) AS invoice_total_amount,
                COUNT(*) AS invoice_count,
                MAX(COALESCE(invoice_date, created_at)) AS invoice_time
         FROM purchase_invoice
         WHERE status = 1
         GROUP BY order_id
       ) invoice_stats ON po.id = invoice_stats.order_id
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
      `SELECT fp.*, po.order_no, po.total_amount AS purchase_total_amount, sc.name AS supplier_name,
              sc.contact, sc.phone, sc.address AS detail_address,
              sc.bank_name, sc.address AS bank_address, sc.name AS bank_account_name, sc.bank_account,
              w.name AS warehouse_name,
              COALESCE(NULLIF(fp.pay_method, ''), po.payment_method) AS payment_method,
              COALESCE(fp.pay_time, fp.payment_completed_time, fp.payment_start_time, fp.updated_at) AS payment_time,
              COALESCE(NULLIF(fp.remark, ''), po.purchase_remark, po.admin_remark) AS detail_remark,
              u.real_name AS creator_name,
              COALESCE(item_stats.purchase_total_quantity, 0) AS purchase_total_quantity,
              COALESCE(return_stats.refund_amount, 0) AS purchase_refund_amount,
              COALESCE(return_stats.return_amount, 0) AS purchase_return_amount
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       LEFT JOIN warehouse w ON po.warehouse_id = w.id
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
       WHERE fp.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('付款单不存在'));
    const detail = rows[0];
    detail.receivable_total_amount = Number(detail.should_amount || detail.purchase_total_amount || 0);
    detail.paid_total_amount = Number(detail.amount || 0);
    detail.unpaid_total_amount = Math.max(detail.receivable_total_amount - detail.paid_total_amount, 0);
    const [invoiceRows] = await pool.execute(
      `SELECT id, invoice_no, external_invoice_no, invoice_date, amount, tax_rate,
              tax_amount, total_amount, remark, attachment_urls, created_at
       FROM purchase_invoice
       WHERE order_id = ? AND status = 1
       ORDER BY COALESCE(invoice_date, created_at) ASC, id ASC`,
      [detail.order_id || 0]
    );
    detail.purchase_invoices = invoiceRows;
    detail.invoice_total_amount = invoiceRows.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    if (detail.invoice_total_amount > 0) {
      detail.invoice_status = detail.receivable_total_amount > 0 && detail.invoice_total_amount >= detail.receivable_total_amount ? 1 : 2;
      detail.invoice_time = invoiceRows[invoiceRows.length - 1]?.invoice_date || invoiceRows[invoiceRows.length - 1]?.created_at || detail.invoice_time;
    }
    const [records] = await pool.execute(
      `SELECT fpr.id, fpr.payment_id, fpr.amount, fpr.payer, fpr.pay_time,
              fpr.pay_method, fpr.voucher_urls, fpr.remark, fpr.created_at,
              u.real_name AS creator_name
       FROM finance_payment_record fpr
       LEFT JOIN sys_user u ON fpr.creator_id = u.id
       WHERE fpr.payment_id = ?
       ORDER BY fpr.pay_time ASC, fpr.id ASC`,
      [req.params.id]
    );
    detail.payment_records = records.length ? records : buildFallbackPaymentRecords(detail);
    res.json(Response.success(detail));
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
    if (Number(payment.status) === PAYMENT_STATUS.PAID) throw new Error('已付款单不允许继续支付');

    const payAmount = Number(req.body.amount || 0);
    const payMethod = req.body.pay_method || payment.pay_method || '';
    const payer = String(req.body.payer || '').trim();
    const payTime = req.body.pay_time || null;
    const remark = req.body.remark ?? payment.remark ?? '';
    const rawVoucherUrls = Array.isArray(req.body.voucher_urls) ? req.body.voucher_urls : [];
    const voucherUrls = rawVoucherUrls.slice(0, 10);
    if (payAmount <= 0) throw new Error('支付金额无效');
    if (!payer) throw new Error('付款人不能为空');
    if (payer.length > 30) throw new Error('付款人最多30个字符');
    if (!payTime) throw new Error('付款时间不能为空');
    if (!payMethod) throw new Error('付款方式不能为空');
    if (String(remark || '').length > 300) throw new Error('备注最多300个字符');
    if (rawVoucherUrls.length > 10) throw new Error('付款凭证最多10个');

    const shouldAmount = Number(payment.should_amount || payment.order_total_amount || 0);
    const unpaidAmount = Math.max(shouldAmount - Number(payment.amount || 0), 0);
    if (unpaidAmount <= 0) {
      await conn.execute('UPDATE finance_payment SET status = ? WHERE id = ?', [PAYMENT_STATUS.PAID, payment.id]);
      await conn.commit();
      res.json(Response.success(null, '付款单已付清'));
      return;
    }
    if (payAmount > unpaidAmount) throw new Error(`付款金额不能大于未付金额，未付金额 ${unpaidAmount}`);
    const paidAmount = Number(payment.amount || 0) + payAmount;
    const nextStatus = shouldAmount > 0 && paidAmount >= shouldAmount ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PAYING;
    await conn.execute(
      `UPDATE finance_payment
       SET amount = ?, should_amount = ?, pay_method = ?, status = ?,
           payer = ?, pay_time = ?, voucher_urls = ?, remark = ?,
           payment_start_time = COALESCE(payment_start_time, NOW()),
           payment_completed_time = ?
       WHERE id = ?`,
      [paidAmount, shouldAmount, payMethod, nextStatus, payer, payTime, JSON.stringify(voucherUrls), remark, nextStatus === PAYMENT_STATUS.PAID ? new Date() : null, payment.id]
    );
    await conn.execute(
      `INSERT INTO finance_payment_record
       (payment_id, amount, payer, pay_time, pay_method, voucher_urls, remark, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment.id, payAmount, payer, payTime, payMethod, JSON.stringify(voucherUrls), remark, req.user.id]
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
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const invoiceStatus = Number(req.body.invoice_status);
    const invoiceRemark = String(req.body.invoice_remark || '');
    const rawAttachmentUrls = Array.isArray(req.body.invoice_attachment_urls) ? req.body.invoice_attachment_urls : [];
    const attachmentUrls = rawAttachmentUrls.filter(Boolean).slice(0, 10);
    if (![0, 1, 2, 3].includes(invoiceStatus)) throw new Error('开票状态不能为空');
    if (invoiceRemark.length > 300) throw new Error('备注最多300个字符');
    if (rawAttachmentUrls.length > 10) throw new Error('开票附件最多10个');

    const [rows] = await conn.execute(
      `SELECT fp.*, po.total_amount AS order_total_amount, COALESCE(item_stats.tax_amount, 0) AS order_tax_amount
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN (
         SELECT order_id, SUM(COALESCE(tax, 0)) AS tax_amount
         FROM purchase_order_item
         GROUP BY order_id
       ) item_stats ON po.id = item_stats.order_id
       WHERE fp.id = ? FOR UPDATE`,
      [req.params.id]
    );
    const payment = rows[0];
    if (!payment) throw new Error('付款单不存在');

    const shouldAmount = roundMoney(payment.should_amount || payment.order_total_amount || 0);
    const [invoiceTotalRows] = await conn.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS invoice_total_amount FROM purchase_invoice WHERE order_id = ? AND status = 1',
      [payment.order_id || 0]
    );
    const existingInvoiceAmount = roundMoney(invoiceTotalRows[0]?.invoice_total_amount || 0);
    if (invoiceStatus === 1 && payment.order_id && shouldAmount > existingInvoiceAmount) {
      const totalAmount = roundMoney(shouldAmount - existingInvoiceAmount);
      const orderTaxAmount = existingInvoiceAmount > 0 ? 0 : roundMoney(payment.order_tax_amount || 0);
      const taxAmount = Math.min(orderTaxAmount, totalAmount);
      const amount = roundMoney(totalAmount - taxAmount);
      const taxRate = amount > 0 ? roundMoney(taxAmount / amount * 100) : 13;
      const invoiceNo = await generateBusinessNo(conn, 'purchase_invoice');
      await conn.execute(
        `INSERT INTO purchase_invoice
         (invoice_no, order_id, supplier_id, external_invoice_no, invoice_date, amount, tax_rate, tax_amount, total_amount, status, remark, attachment_urls, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [invoiceNo, payment.order_id, payment.supplier_id, '', new Date(), amount, taxRate, taxAmount, totalAmount, 1, invoiceRemark, JSON.stringify(attachmentUrls), req.user.id]
      );
    }

    await conn.execute(
      'UPDATE finance_payment SET invoice_status = ?, invoice_time = ?, invoice_remark = ?, invoice_attachment_urls = ? WHERE id = ?',
      [invoiceStatus, invoiceStatus === 1 ? new Date() : null, invoiceRemark, JSON.stringify(attachmentUrls), req.params.id]
    );
    if (invoiceStatus === 1 || existingInvoiceAmount > 0) {
      await syncPaymentInvoiceStatus(conn, payment.order_id);
    }
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '采购付款单开票', payment.payment_no || String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/payment/:id/invoice-legacy', async (req, res) => {
  try {
    const pool = getPool();
    const invoiceStatus = Number(req.body.invoice_status);
    const invoiceRemark = String(req.body.invoice_remark || '');
    const rawAttachmentUrls = Array.isArray(req.body.invoice_attachment_urls) ? req.body.invoice_attachment_urls : [];
    const attachmentUrls = rawAttachmentUrls.filter(Boolean).slice(0, 10);
    if (![0, 1, 2, 3].includes(invoiceStatus)) throw new Error('开票状态不能为空');
    if (invoiceRemark.length > 300) throw new Error('备注最多300个字符');
    if (rawAttachmentUrls.length > 10) throw new Error('开票附件最多10个');
    const [rows] = await pool.execute('SELECT invoice_status FROM finance_payment WHERE id = ?', [req.params.id]);
    if (!rows.length) throw new Error('付款单不存在');
    if (Number(rows[0].invoice_status) === 1) throw new Error('已开票的付款单不允许重复开票');
    const invoiceTime = invoiceStatus === 1 ? new Date() : null;
    await pool.execute(
      'UPDATE finance_payment SET invoice_status = ?, invoice_time = ?, invoice_remark = ?, invoice_attachment_urls = ? WHERE id = ?',
      [invoiceStatus, invoiceTime, invoiceRemark, JSON.stringify(attachmentUrls), req.params.id]
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
    const [rows] = await pool.execute('SELECT status FROM finance_payment WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('付款单不存在'));
    if (Number(rows[0].status) !== PAYMENT_STATUS.CLOSED) return res.json(Response.error('仅已关闭付款单允许删除'));
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
    const { page = 1, pageSize = 20, keyword = '', receipt_no = '', customer_id = '', status = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    const searchText = keyword || receipt_no;
    if (searchText) {
      where += ' AND (CAST(fr.id AS CHAR) LIKE ? OR fr.receipt_no LIKE ? OR so.order_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${searchText}%`, `%${searchText}%`, `%${searchText}%`, `%${searchText}%`);
    }
    if (customer_id) { where += ' AND fr.customer_id = ?'; params.push(Number(customer_id)); }
    if (status !== '') {
      where += ` AND (CASE
        WHEN fr.status = 3 THEN 3
        WHEN COALESCE(fr.amount, 0) >= COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0)
          AND COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) > 0 THEN 2
        WHEN COALESCE(fr.amount, 0) > 0 THEN 1
        ELSE 0
      END) = ?`;
      params.push(Number(status));
    }
    if (start_date) { where += ' AND fr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
       WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fr.id, fr.receipt_no, fr.order_id, so.order_no, fr.customer_id, sc.name AS customer_name,
              CASE
                WHEN fr.status = 3 THEN 3
                WHEN COALESCE(fr.amount, 0) >= COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0)
                  AND COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) > 0 THEN 2
                WHEN COALESCE(fr.amount, 0) > 0 THEN 1
                ELSE 0
              END AS status,
              COALESCE(NULLIF(fr.pay_method, ''), so.payment_method) AS pay_method,
              CASE
                WHEN COALESCE(invoice_stats.invoice_total_amount, 0) >= COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0)
                  AND COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) > 0 THEN 1
                WHEN COALESCE(invoice_stats.invoice_total_amount, 0) > 0 THEN 2
                ELSE fr.invoice_status
              END AS invoice_status,
              COALESCE(invoice_stats.invoice_time, fr.invoice_time) AS invoice_time,
              COALESCE(invoice_stats.invoice_total_amount, 0) AS invoice_total_amount,
              COALESCE(invoice_stats.invoice_count, 0) AS invoice_count,
              fr.invoice_remark, fr.invoice_attachment_urls, fr.voucher_urls,
              COALESCE(item_stats.sale_total_quantity, 0) AS sale_total_quantity,
              COALESCE(return_stats.refund_amount, 0) AS sale_refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS sale_return_quantity,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address,
              sc.bank_name, sc.address AS bank_address, sc.name AS bank_account_name, sc.bank_account,
              COALESCE(NULLIF(fr.remark, ''), so.sale_remark, so.admin_remark) AS remark,
              fr.payment_start_time, fr.payment_completed_time, fr.close_time, fr.created_at, fr.updated_at,
              u.real_name AS creator_name
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
       LEFT JOIN sys_user u ON fr.creator_id = u.id
       LEFT JOIN (
         SELECT order_id,
                SUM(total_amount) AS invoice_total_amount,
                COUNT(*) AS invoice_count,
                MAX(COALESCE(invoice_date, created_at)) AS invoice_time
         FROM sale_invoice
         WHERE status = 1
         GROUP BY order_id
       ) invoice_stats ON so.id = invoice_stats.order_id
       LEFT JOIN (
         SELECT order_id, SUM(quantity) AS sale_total_quantity
         FROM sale_order_item
         GROUP BY order_id
       ) item_stats ON so.id = item_stats.order_id
       LEFT JOIN (
         SELECT sd.order_id,
                SUM(sr.total_amount) AS refund_amount,
                SUM(COALESCE(return_item_stats.return_quantity, 0)) AS return_quantity
         FROM sale_return sr
         LEFT JOIN sale_delivery sd ON sr.delivery_id = sd.id
         LEFT JOIN (
           SELECT return_id, SUM(quantity) AS return_quantity
           FROM sale_return_item
           GROUP BY return_id
         ) return_item_stats ON sr.id = return_item_stats.return_id
         WHERE sd.order_id IS NOT NULL
         GROUP BY sd.order_id
       ) return_stats ON so.id = return_stats.order_id
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
      `SELECT fr.*,
              so.id AS sale_order_id,
              so.order_no,
              sc.name AS customer_name,
              COALESCE(NULLIF(fr.pay_method, ''), so.payment_method) AS receipt_method,
              COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) AS receivable_amount,
              GREATEST(
                COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) - COALESCE(fr.amount, 0),
                0
              ) AS unreceived_amount,
              COALESCE(fr.payment_completed_time, fr.payment_start_time, fr.updated_at) AS receipt_time,
              COALESCE(NULLIF(fr.remark, ''), so.sale_remark, so.admin_remark) AS detail_remark,
              w.name AS warehouse_name,
              u.real_name AS receiver_name,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address,
              sc.bank_name,
              sc.address AS bank_address,
              sc.name AS bank_account_name,
              sc.bank_account,
              COALESCE(item_stats.sale_total_quantity, 0) AS sale_total_quantity,
              COALESCE(return_stats.refund_amount, 0) AS sale_refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS sale_return_quantity
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
       LEFT JOIN warehouse w ON w.id = COALESCE(NULLIF(so.warehouse_id, 0), sd.warehouse_id)
       LEFT JOIN sys_user u ON fr.creator_id = u.id
       LEFT JOIN (
         SELECT order_id, SUM(quantity) AS sale_total_quantity
         FROM sale_order_item
         GROUP BY order_id
       ) item_stats ON so.id = item_stats.order_id
       LEFT JOIN (
         SELECT sd.order_id,
                SUM(sr.total_amount) AS refund_amount,
                SUM(COALESCE(return_item_stats.return_quantity, 0)) AS return_quantity
         FROM sale_return sr
         LEFT JOIN sale_delivery sd ON sr.delivery_id = sd.id
         LEFT JOIN (
           SELECT return_id, SUM(quantity) AS return_quantity
           FROM sale_return_item
           GROUP BY return_id
         ) return_item_stats ON sr.id = return_item_stats.return_id
         WHERE sd.order_id IS NOT NULL
         GROUP BY sd.order_id
       ) return_stats ON so.id = return_stats.order_id
       WHERE fr.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('收款单不存在'));
    const detail = rows[0];
    const [invoiceRows] = await pool.execute(
      `SELECT id, invoice_no, external_invoice_no, invoice_date, amount, tax_rate,
              tax_amount, total_amount, remark, attachment_urls, created_at
       FROM sale_invoice
       WHERE order_id = ? AND status = 1
       ORDER BY COALESCE(invoice_date, created_at) ASC, id ASC`,
      [detail.sale_order_id || detail.order_id || 0]
    );
    detail.sale_invoices = invoiceRows;
    detail.invoice_total_amount = invoiceRows.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const receivableAmount = Number(detail.receivable_amount || detail.should_amount || 0);
    if (detail.invoice_total_amount > 0) {
      detail.invoice_status = receivableAmount > 0 && detail.invoice_total_amount >= receivableAmount ? 1 : 2;
      detail.invoice_time = invoiceRows[invoiceRows.length - 1]?.invoice_date || invoiceRows[invoiceRows.length - 1]?.created_at || detail.invoice_time;
    }
    res.json(Response.success(detail));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/receipt', async (req, res) => {
  try {
    res.json(Response.error('销售收款单随销售单自动创建，不支持手动新建'));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/receipt/:id/receive', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT fr.*, so.total_amount AS order_total_amount
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       WHERE fr.id = ? FOR UPDATE`,
      [req.params.id]
    );
    const receipt = rows[0];
    if (!receipt) throw new Error('收款单不存在');
    if (Number(receipt.status) === RECEIPT_STATUS.CLOSED) throw new Error('已关闭收款单不允许收款');
    if (Number(receipt.status) === RECEIPT_STATUS.RECEIVED) throw new Error('已收款单不允许继续收款');

    const receiveAmount = roundMoney(req.body.amount);
    const receiveMethod = String(req.body.pay_method || receipt.pay_method || '').trim();
    const receiveTime = req.body.pay_time || null;
    const remark = String(req.body.remark ?? receipt.remark ?? '');
    const rawVoucherUrls = Array.isArray(req.body.voucher_urls) ? req.body.voucher_urls : [];
    const voucherUrls = rawVoucherUrls.filter(Boolean).slice(0, 10);
    if (receiveAmount <= 0) throw new Error('收款金额无效');
    if (!receiveTime) throw new Error('收款时间不能为空');
    if (!receiveMethod) throw new Error('收款方式不能为空');
    if (remark.length > 300) throw new Error('备注最多300个字符');
    if (rawVoucherUrls.length > 10) throw new Error('收款凭证最多10个');

    const shouldAmount = roundMoney(receipt.should_amount || receipt.order_total_amount || 0);
    const receivedAmount = roundMoney(receipt.amount || 0);
    const unreceivedAmount = roundMoney(Math.max(shouldAmount - receivedAmount, 0));
    if (unreceivedAmount <= 0) {
      await conn.execute('UPDATE finance_receipt SET status = ? WHERE id = ?', [RECEIPT_STATUS.RECEIVED, receipt.id]);
      await conn.commit();
      res.json(Response.success(null, '收款单已收清'));
      return;
    }
    if (receiveAmount > unreceivedAmount) throw new Error(`收款金额不能大于未收金额，未收金额${unreceivedAmount.toFixed(2)}`);

    const nextAmount = roundMoney(receivedAmount + receiveAmount);
    const nextStatus = shouldAmount > 0 && nextAmount >= shouldAmount ? RECEIPT_STATUS.RECEIVED : RECEIPT_STATUS.RECEIVING;
    await conn.execute(
      `UPDATE finance_receipt
       SET amount = ?, should_amount = ?, pay_method = ?, status = ?,
           payment_start_time = COALESCE(payment_start_time, ?),
           payment_completed_time = ?,
           remark = ?,
           voucher_urls = ?
       WHERE id = ?`,
      [
        nextAmount,
        shouldAmount,
        receiveMethod,
        nextStatus,
        receiveTime,
        nextStatus === RECEIPT_STATUS.RECEIVED ? receiveTime : null,
        remark,
        JSON.stringify(voucherUrls),
        receipt.id
      ]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '销售收款单收款', receipt.receipt_no || String(receipt.id));
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/receipt/:id/invoice', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const invoiceStatus = Number(req.body.invoice_status);
    const invoiceRemark = String(req.body.invoice_remark || '');
    const rawAttachmentUrls = Array.isArray(req.body.invoice_attachment_urls) ? req.body.invoice_attachment_urls : [];
    const attachmentUrls = rawAttachmentUrls.filter(Boolean).slice(0, 10);
    if (![0, 1, 2, 3].includes(invoiceStatus)) throw new Error('开票状态不能为空');
    if (invoiceRemark.length > 300) throw new Error('备注最多300个字符');
    if (rawAttachmentUrls.length > 10) throw new Error('开票附件最多10个');

    const [rows] = await conn.execute(
      `SELECT fr.*, so.id AS sale_order_id, so.total_amount AS order_total_amount, COALESCE(item_stats.tax_amount, 0) AS order_tax_amount
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       LEFT JOIN (
         SELECT order_id, SUM(COALESCE(tax, 0)) AS tax_amount
         FROM sale_order_item
         GROUP BY order_id
       ) item_stats ON so.id = item_stats.order_id
       WHERE fr.id = ? FOR UPDATE`,
      [req.params.id]
    );
    const receipt = rows[0];
    if (!receipt) throw new Error('收款单不存在');

    const orderId = Number(receipt.sale_order_id || receipt.order_id || 0);
    const shouldAmount = roundMoney(receipt.should_amount || receipt.order_total_amount || 0);
    const [invoiceTotalRows] = await conn.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS invoice_total_amount FROM sale_invoice WHERE order_id = ? AND status = 1',
      [orderId]
    );
    const existingInvoiceAmount = roundMoney(invoiceTotalRows[0]?.invoice_total_amount || 0);
    if (invoiceStatus === 1 && orderId && shouldAmount > existingInvoiceAmount) {
      const totalAmount = roundMoney(shouldAmount - existingInvoiceAmount);
      const orderTaxAmount = existingInvoiceAmount > 0 ? 0 : roundMoney(receipt.order_tax_amount || 0);
      const taxAmount = Math.min(orderTaxAmount, totalAmount);
      const amount = roundMoney(totalAmount - taxAmount);
      const taxRate = amount > 0 ? roundMoney(taxAmount / amount * 100) : 13;
      const invoiceNo = await generateBusinessNo(conn, 'sale_invoice');
      await conn.execute(
        `INSERT INTO sale_invoice
         (invoice_no, order_id, customer_id, external_invoice_no, invoice_date, amount, tax_rate, tax_amount, total_amount, status, remark, attachment_urls, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [invoiceNo, orderId, receipt.customer_id, '', new Date(), amount, taxRate, taxAmount, totalAmount, 1, invoiceRemark, JSON.stringify(attachmentUrls), req.user.id]
      );
    }

    await conn.execute(
      'UPDATE finance_receipt SET invoice_status = ?, invoice_time = ?, invoice_remark = ?, invoice_attachment_urls = ? WHERE id = ?',
      [invoiceStatus, invoiceStatus === 1 ? new Date() : null, invoiceRemark, JSON.stringify(attachmentUrls), req.params.id]
    );
    if (invoiceStatus === 1 || existingInvoiceAmount > 0) {
      await syncReceiptInvoiceStatus(conn, orderId);
    }
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '销售收款单开票', receipt.receipt_no || String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/receipt/:id/invoice-legacy', async (req, res) => {
  try {
    const pool = getPool();
    const invoiceStatus = Number(req.body.invoice_status);
    const invoiceRemark = String(req.body.invoice_remark || '');
    const rawAttachmentUrls = Array.isArray(req.body.invoice_attachment_urls) ? req.body.invoice_attachment_urls : [];
    const attachmentUrls = rawAttachmentUrls.filter(Boolean).slice(0, 10);
    if (![0, 1, 2, 3].includes(invoiceStatus)) throw new Error('开票状态不能为空');
    if (invoiceRemark.length > 300) throw new Error('备注最多300个字符');
    if (rawAttachmentUrls.length > 10) throw new Error('开票附件最多10个');

    const [rows] = await pool.execute('SELECT id, receipt_no, invoice_status FROM finance_receipt WHERE id = ?', [req.params.id]);
    if (!rows.length) throw new Error('收款单不存在');
    if (Number(rows[0].invoice_status) === 1) throw new Error('已开票的收款单不允许重复开票');

    const invoiceTime = invoiceStatus === 1 ? new Date() : null;
    await pool.execute(
      'UPDATE finance_receipt SET invoice_status = ?, invoice_time = ?, invoice_remark = ?, invoice_attachment_urls = ? WHERE id = ?',
      [invoiceStatus, invoiceTime, invoiceRemark, JSON.stringify(attachmentUrls), req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '销售管理', '销售收款单开票', rows[0].receipt_no || String(req.params.id));
    res.json(Response.success());
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
  return generateBusinessNo(pool, prefix);
}

function buildFallbackPaymentRecords(payment) {
  const amount = Number(payment.amount || 0);
  if (amount <= 0) return [];
  return [{
    id: 0,
    payment_id: payment.id,
    amount,
    payer: payment.payer || '',
    pay_time: payment.pay_time || payment.payment_completed_time || payment.payment_start_time || null,
    pay_method: payment.pay_method || '',
    voucher_urls: payment.voucher_urls || null,
    remark: payment.remark || '',
    creator_name: payment.creator_name || '',
    created_at: payment.pay_time || payment.payment_completed_time || payment.updated_at || payment.created_at
  }];
}

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

async function syncPaymentInvoiceStatus(conn, orderId) {
  if (!orderId) return;
  const [rows] = await conn.execute(
    `SELECT COALESCE(SUM(total_amount), 0) AS invoice_total_amount,
            MAX(COALESCE(invoice_date, created_at)) AS invoice_time
     FROM purchase_invoice
     WHERE order_id = ? AND status = 1`,
    [orderId]
  );
  const invoiceAmount = roundMoney(rows[0]?.invoice_total_amount || 0);
  const invoiceTime = rows[0]?.invoice_time || null;
  const [payments] = await conn.execute('SELECT id, should_amount FROM finance_payment WHERE order_id = ?', [orderId]);
  for (const payment of payments) {
    const shouldAmount = roundMoney(payment.should_amount || 0);
    const invoiceStatus = invoiceAmount <= 0 ? 0 : (shouldAmount > 0 && invoiceAmount >= shouldAmount ? 1 : 2);
    await conn.execute(
      'UPDATE finance_payment SET invoice_status = ?, invoice_time = ? WHERE id = ?',
      [invoiceStatus, invoiceStatus === 0 ? null : invoiceTime, payment.id]
    );
  }
}

async function syncReceiptInvoiceStatus(conn, orderId) {
  if (!orderId) return;
  const [rows] = await conn.execute(
    `SELECT COALESCE(SUM(total_amount), 0) AS invoice_total_amount,
            MAX(COALESCE(invoice_date, created_at)) AS invoice_time
     FROM sale_invoice
     WHERE order_id = ? AND status = 1`,
    [orderId]
  );
  const invoiceAmount = roundMoney(rows[0]?.invoice_total_amount || 0);
  const invoiceTime = rows[0]?.invoice_time || null;
  const [receipts] = await conn.execute('SELECT id, should_amount FROM finance_receipt WHERE order_id = ?', [orderId]);
  for (const receipt of receipts) {
    const shouldAmount = roundMoney(receipt.should_amount || 0);
    const invoiceStatus = invoiceAmount <= 0 ? 0 : (shouldAmount > 0 && invoiceAmount >= shouldAmount ? 1 : 2);
    await conn.execute(
      'UPDATE finance_receipt SET invoice_status = ?, invoice_time = ? WHERE id = ?',
      [invoiceStatus, invoiceStatus === 0 ? null : invoiceTime, receipt.id]
    );
  }
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
