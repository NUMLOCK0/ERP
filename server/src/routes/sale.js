const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { isAuditEnabled } = require('../utils/auditConfig');
const { generateBusinessNo } = require('../utils/bizNo');

// ==================== 销售订单 ====================

router.get('/invoice', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', customer_id = '', status = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (si.invoice_no LIKE ? OR si.external_invoice_no LIKE ? OR so.order_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (customer_id) { where += ' AND si.customer_id = ?'; params.push(Number(customer_id)); }
    if (status !== '') { where += ' AND si.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND si.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND si.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM sale_invoice si
       LEFT JOIN sale_order so ON si.order_id = so.id
       LEFT JOIN supplier_customer sc ON si.customer_id = sc.id
       WHERE ${where}`,
      params
    );
    const [list] = await pool.execute(
      `SELECT si.*, so.order_no, so.total_amount AS order_total_amount,
              sc.name AS customer_name, sc.contact, sc.phone,
              COALESCE(receipt_stats.received_amount, 0) AS received_amount,
              u.real_name AS creator_name
       FROM sale_invoice si
       LEFT JOIN sale_order so ON si.order_id = so.id
       LEFT JOIN supplier_customer sc ON si.customer_id = sc.id
       LEFT JOIN sys_user u ON si.creator_id = u.id
       LEFT JOIN (
         SELECT order_id, SUM(amount) AS received_amount
         FROM finance_receipt
         GROUP BY order_id
       ) receipt_stats ON so.id = receipt_stats.order_id
       WHERE ${where}
       ORDER BY si.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, Number(totalRows[0].cnt || 0), Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/invoice/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT si.*, so.order_no, so.total_amount AS order_total_amount,
              sc.name AS customer_name, sc.contact, sc.phone,
              u.real_name AS creator_name
       FROM sale_invoice si
       LEFT JOIN sale_order so ON si.order_id = so.id
       LEFT JOIN supplier_customer sc ON si.customer_id = sc.id
       LEFT JOIN sys_user u ON si.creator_id = u.id
       WHERE si.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('销售发票不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/invoice', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const orderId = Number(req.body.order_id || 0);
    if (!orderId) throw new Error('请选择销售订单');
    const [orderRows] = await conn.execute('SELECT * FROM sale_order WHERE id = ?', [orderId]);
    const order = orderRows[0];
    if (!order) throw new Error('销售订单不存在');

    const taxRate = roundMoney(req.body.tax_rate ?? 13);
    const totalAmount = roundMoney(req.body.total_amount ?? order.total_amount ?? 0);
    const taxAmount = roundMoney(req.body.tax_amount ?? calculateIncludedTax(totalAmount, taxRate));
    const amount = roundMoney(req.body.amount ?? Math.max(totalAmount - taxAmount, 0));
    const externalInvoiceNo = String(req.body.external_invoice_no || '').trim();
    const invoiceDate = req.body.invoice_date || null;
    const remark = String(req.body.remark || '');
    const rawAttachmentUrls = Array.isArray(req.body.attachment_urls) ? req.body.attachment_urls : [];
    const attachmentUrls = rawAttachmentUrls.filter(Boolean).slice(0, 10);
    if (totalAmount <= 0) throw new Error('发票金额必须大于0');
    if (taxRate < 0 || taxRate > 100) throw new Error('税率需要在0到100之间');
    if (taxAmount < 0 || taxAmount > totalAmount) throw new Error('税金需要在0到发票金额之间');
    if (remark.length > 300) throw new Error('备注最多300个字符');
    if (rawAttachmentUrls.length > 10) throw new Error('发票附件最多10个');

    const invoiceNo = await generateBusinessNo(conn, 'sale_invoice');
    const [result] = await conn.execute(
      `INSERT INTO sale_invoice
       (invoice_no, order_id, customer_id, external_invoice_no, invoice_date, amount, tax_rate, tax_amount, total_amount, status, remark, attachment_urls, creator_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [invoiceNo, order.id, order.customer_id, externalInvoiceNo, invoiceDate, amount, taxRate, taxAmount, totalAmount, 1, remark, JSON.stringify(attachmentUrls), req.user.id]
    );
    await syncSaleReceiptInvoiceStatus(conn, order.id);

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '销售发票登记', invoiceNo);
    res.json(Response.success({ id: result.insertId, invoice_no: invoiceNo }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.get('/order', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', order_no = '', customer_id = '', status = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    const searchText = keyword || order_no;
    if (searchText) { where += ' AND (CAST(so.id AS CHAR) LIKE ? OR so.order_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${searchText}%`, `%${searchText}%`, `%${searchText}%`); }
    if (customer_id) { where += ' AND so.customer_id = ?'; params.push(Number(customer_id)); }
    if (status !== '') { where += ' AND so.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND so.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND so.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM sale_order so LEFT JOIN supplier_customer sc ON so.customer_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT so.id, so.order_no, so.customer_id, so.employee_id, so.warehouse_id,
              so.total_amount, so.admin_remark, so.sale_remark,
              so.status, so.audit_time, so.submit_time, so.completed_time,
              so.cancel_time, so.close_time, so.created_at, so.updated_at,
              sc.name AS customer_name, e.name AS employee_name, w.name AS warehouse_name,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address,
              sc.bank_name, sc.address AS bank_address, sc.name AS bank_account_name, sc.bank_account,
              COALESCE(receipt_stats.payment_total_amount, 0) AS payment_total_amount,
              COALESCE(NULLIF(receipt_stats.payment_method, ''), so.payment_method) AS payment_method,
              CASE
                WHEN COALESCE(receipt_stats.payment_total_amount, 0) <= 0 THEN 0
                WHEN COALESCE(receipt_stats.payment_total_amount, 0) >= so.total_amount THEN 2
                ELSE 1
              END AS payment_status,
              CASE WHEN COALESCE(return_stats.return_quantity, 0) > 0 THEN 1 ELSE 0 END AS return_status,
              COALESCE(item_stats.item_count, 0) AS item_count,
              CASE WHEN COALESCE(item_stats.item_count, 0) = 1 THEN COALESCE(item_stats.single_price, 0) ELSE NULL END AS unit_price,
              COALESCE(item_stats.total_tax, 0) AS total_tax,
              COALESCE(item_stats.product_total_quantity, 0) AS product_total_quantity,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
              delivery_stats.delivery_completed_time,
              u.real_name AS creator_name
       FROM sale_order so
       LEFT JOIN supplier_customer sc ON so.customer_id = sc.id
       LEFT JOIN employee e ON so.employee_id = e.id
       LEFT JOIN warehouse w ON so.warehouse_id = w.id
       LEFT JOIN sys_user u ON so.creator_id = u.id
       LEFT JOIN (
         SELECT order_id,
                COUNT(*) AS item_count,
                MAX(price) AS single_price,
                SUM(COALESCE(tax, 0)) AS total_tax,
                SUM(quantity) AS product_total_quantity
         FROM sale_order_item
         GROUP BY order_id
       ) item_stats ON so.id = item_stats.order_id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(fr.order_id, 0), sd.order_id) AS order_id,
                SUM(fr.amount) AS payment_total_amount,
                GROUP_CONCAT(DISTINCT fr.pay_method ORDER BY fr.id SEPARATOR '、') AS payment_method
         FROM finance_receipt fr
         LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
         WHERE COALESCE(NULLIF(fr.order_id, 0), sd.order_id) IS NOT NULL
         GROUP BY COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       ) receipt_stats ON so.id = receipt_stats.order_id
       LEFT JOIN (
         SELECT sd.order_id,
                MAX(COALESCE(sd.completed_time, sd.created_at)) AS delivery_completed_time
         FROM sale_delivery sd
         GROUP BY sd.order_id
       ) delivery_stats ON so.id = delivery_stats.order_id
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
         WHERE sd.order_id IS NOT NULL AND sr.status = 1
         GROUP BY sd.order_id
       ) return_stats ON so.id = return_stats.order_id
       WHERE ${where} ORDER BY so.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/order/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT so.*,
              sc.name AS customer_name,
              e.name AS employee_name,
              w.name AS warehouse_name,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address
       FROM sale_order so
       LEFT JOIN supplier_customer sc ON so.customer_id = sc.id
       LEFT JOIN employee e ON so.employee_id = e.id
       LEFT JOIN warehouse w ON so.warehouse_id = w.id
       WHERE so.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('订单不存在'));
    const order = rows[0];
    const [items] = await pool.execute(
      `SELECT soi.*, p.name AS product_name, p.code, p.spec, p.image_urls, u.name AS unit_name,
              COALESCE(pu.base_quantity, 1) AS base_quantity,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount
       FROM sale_order_item soi
       LEFT JOIN product p ON soi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT product_id, MIN(base_quantity) AS base_quantity
         FROM product_unit
         GROUP BY product_id
       ) pu ON p.id = pu.product_id
       LEFT JOIN (
         SELECT sd.order_id,
                sri.product_id,
                SUM(sri.quantity) AS return_quantity,
                SUM(sri.amount) AS refund_amount
         FROM sale_return_item sri
         INNER JOIN sale_return sr ON sri.return_id = sr.id
         INNER JOIN sale_delivery sd ON sr.delivery_id = sd.id
         WHERE sr.status = 1
         GROUP BY sd.order_id, sri.product_id
       ) return_stats ON return_stats.order_id = soi.order_id
         AND return_stats.product_id = soi.product_id
       WHERE soi.order_id = ?`, [order.id]
    );
    order.items = items;
    res.json(Response.success(order));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order', async (req, res) => {
  try {
    const pool = getPool();
    const {
      customer_id,
      employee_id = 0,
      warehouse_id,
      payment_method = '',
      admin_remark = '',
      sale_remark = '',
      customer_contact = '',
      customer_phone = '',
      detail_address = '',
      items,
      auditor_id = 0,
      create_delivery = false,
      ship = false,
      auto_restock = false
    } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));
    if (ship && !create_delivery) return res.json(Response.error('发货前请先勾选创建发货单'));

    const orderNo = await generateNo(pool, 'XS');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += calculateLineAmount(item);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO sale_order
         (order_no, customer_id, employee_id, warehouse_id, payment_method, total_amount, admin_remark, sale_remark,
          customer_contact, customer_phone, detail_address, create_delivery, ship, status, auditor_id, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderNo, customer_id, employee_id, warehouse_id, payment_method, totalAmount, admin_remark, sale_remark,
          customer_contact, customer_phone, detail_address, create_delivery ? 1 : 0, ship ? 1 : 0, 0, 0, req.user.id
        ]
      );
      const orderId = result.insertId;

      for (const item of items) {
        const taxRate = normalizeTaxRate(item.tax_rate);
        const tax = calculateItemTax(item);
        const amount = calculateLineAmount(item);
        await conn.execute(
          'INSERT INTO sale_order_item (order_id, product_id, quantity, price, tax, tax_rate, amount) VALUES (?,?,?,?,?,?,?)',
          [orderId, item.product_id, item.quantity, item.price, tax, taxRate, amount]
        );
      }

      const receiptNo = await generateFinanceReceiptNo(conn);
      await conn.execute(
        `INSERT INTO finance_receipt (receipt_no, order_id, customer_id, amount, should_amount, pay_method, status, remark, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [receiptNo, orderId, customer_id, 0, totalAmount, payment_method, 0, sale_remark || admin_remark || '', req.user.id]
      );

      const auditEnabled = await isAuditEnabled(conn, 'sale_order');
      const shouldAutoApprove = Boolean(create_delivery || auditor_id) || !auditEnabled;
      let approvalResult = null;
      if (shouldAutoApprove) {
        approvalResult = await approveSaleOrder(conn, orderId, auditor_id || req.user.id, {
          create_delivery: Boolean(create_delivery),
          ship: Boolean(ship),
          auto_restock: Boolean(auto_restock)
        });
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '销售管理', '新增销售订单', orderNo);
      res.json(Response.success({
        id: orderId,
        order_no: orderNo,
        audit_enabled: auditEnabled,
        auto_approved: Boolean(approvalResult),
        status: approvalResult ? 1 : 0,
        delivery_id: approvalResult?.delivery_id || null,
        delivery_no: approvalResult?.delivery_no || ''
      }));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/order/:id', async (req, res) => {
  try {
    const pool = getPool();
    const {
      customer_id,
      employee_id = 0,
      warehouse_id,
      payment_method = '',
      admin_remark = '',
      sale_remark = '',
      customer_contact = '',
      customer_phone = '',
      detail_address = '',
      create_delivery = true,
      ship = false,
      items
    } = req.body;
    if (ship && !create_delivery) return res.json(Response.error('发货前请先勾选创建发货单'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      await conn.execute('DELETE FROM sale_order_item WHERE order_id = ?', [req.params.id]);
      for (const item of (items || [])) {
        const taxRate = normalizeTaxRate(item.tax_rate);
        const tax = calculateItemTax(item);
        const amount = calculateLineAmount(item);
        totalAmount += amount;
        await conn.execute(
          'INSERT INTO sale_order_item (order_id, product_id, quantity, price, tax, tax_rate, amount) VALUES (?,?,?,?,?,?,?)',
          [req.params.id, item.product_id, item.quantity, item.price, tax, taxRate, amount]
        );
      }

      await conn.execute(
        `UPDATE sale_order
         SET customer_id=?, employee_id=?, warehouse_id=?, payment_method=?, total_amount=?, admin_remark=?, sale_remark=?,
             customer_contact=?, customer_phone=?, detail_address=?, create_delivery=?, ship=?
         WHERE id=?`,
        [
          customer_id, employee_id, warehouse_id, payment_method, totalAmount, admin_remark, sale_remark,
          customer_contact, customer_phone, detail_address, create_delivery ? 1 : 0, ship ? 1 : 0, req.params.id
        ]
      );

      const [receiptRows] = await conn.execute('SELECT id FROM finance_receipt WHERE order_id = ? LIMIT 1', [req.params.id]);
      if (receiptRows.length) {
        await conn.execute(
          'UPDATE finance_receipt SET customer_id=?, should_amount=?, pay_method=?, remark=? WHERE order_id=?',
          [customer_id, totalAmount, payment_method, sale_remark || admin_remark || '', req.params.id]
        );
      } else {
        const receiptNo = await generateFinanceReceiptNo(conn);
        await conn.execute(
          `INSERT INTO finance_receipt (receipt_no, order_id, customer_id, amount, should_amount, pay_method, status, remark, creator_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [receiptNo, req.params.id, customer_id, 0, totalAmount, payment_method, 0, sale_remark || admin_remark || '', req.user.id]
        );
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '销售管理', '编辑销售订单', String(req.params.id));
      res.json(Response.success());
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/order/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (![3, 4].includes(Number(order.status))) return res.json(Response.error('仅已取消或已关闭订单允许删除'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM sale_order_item WHERE order_id = ?', [req.params.id]);
      await conn.execute('DELETE FROM sale_order WHERE id = ?', [req.params.id]);
      await conn.commit();
      await writeSystemLog(pool, req.user.id, '销售管理', '删除销售订单', String(req.params.id));
      res.json(Response.success());
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/submit', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    const auditEnabled = await isAuditEnabled(pool, 'sale_order');
    if (!auditEnabled) {
      if (Number(order.status) === 1) {
        return res.json(Response.success({ id: Number(req.params.id), order_no: order.order_no, auto_approved: true }));
      }
      if (![0, 2].includes(Number(order.status))) return res.json(Response.error('当前订单状态不允许自动审核'));
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await approveSaleOrder(conn, req.params.id, req.user.id);
        await conn.commit();
        await writeSystemLog(pool, req.user.id, '销售管理', '提交并自动审核销售订单', result.order_no);
        return res.json(Response.success({ ...result, auto_approved: true }));
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
    if (Number(order.status) !== 0) return res.json(Response.error('仅草稿订单允许提交审核'));
    await pool.execute('UPDATE sale_order SET status = 2, submit_time = NOW() WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '销售管理', '提交销售订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/cancel', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (![0, 2].includes(Number(order.status))) return res.json(Response.error('仅草稿或待审核订单允许取消'));
    await pool.execute('UPDATE sale_order SET status = 3, cancel_time = NOW() WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '销售管理', '取消销售订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/close', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (Number(order.status) !== 1) return res.json(Response.error('仅进行中订单允许关闭'));
    await pool.execute('UPDATE sale_order SET status = 4, close_time = NOW() WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '销售管理', '关闭销售订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 审核销售订单（生成发货单 + 扣减库存） ====================

router.post('/order/:id/audit', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await approveSaleOrder(conn, req.params.id, req.user.id);

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '审核销售订单', result.order_no);
    res.json(Response.success({ delivery_id: result.delivery_id, delivery_no: result.delivery_no }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 销售发货单列表 ====================

router.get('/delivery', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', delivery_no = '', customer_id = '', status = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    const searchText = keyword || delivery_no;
    if (searchText) {
      where += ' AND (CAST(sd.id AS CHAR) LIKE ? OR sd.delivery_no LIKE ? OR so.order_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${searchText}%`, `%${searchText}%`, `%${searchText}%`, `%${searchText}%`);
    }
    if (customer_id) { where += ' AND sd.customer_id = ?'; params.push(Number(customer_id)); }
    if (status !== '') { where += ' AND sd.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM sale_delivery sd
       LEFT JOIN sale_order so ON sd.order_id = so.id
       LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id
       WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sd.*, so.order_no, so.employee_id, so.admin_remark, so.sale_remark,
              sc.name AS customer_name, e.name AS employee_name, w.name AS warehouse_name,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address,
              CASE WHEN COALESCE(return_stats.return_quantity, 0) > 0 THEN 1 ELSE 0 END AS return_status,
              COALESCE(item_stats.item_count, 0) AS item_count,
              CASE WHEN COALESCE(item_stats.item_count, 0) = 1 THEN COALESCE(item_stats.single_price, 0) ELSE NULL END AS unit_price,
              COALESCE(order_item_stats.total_tax, 0) AS total_tax,
              COALESCE(item_stats.delivery_total_quantity, 0) AS delivery_total_quantity,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
              u.real_name AS creator_name
       FROM sale_delivery sd
       LEFT JOIN sale_order so ON sd.order_id = so.id
       LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id
       LEFT JOIN employee e ON so.employee_id = e.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       LEFT JOIN sys_user u ON sd.creator_id = u.id
       LEFT JOIN (
         SELECT delivery_id, COUNT(*) AS item_count, MAX(price) AS single_price,
                SUM(quantity) AS delivery_total_quantity
         FROM sale_delivery_item
         GROUP BY delivery_id
       ) item_stats ON sd.id = item_stats.delivery_id
       LEFT JOIN (
         SELECT order_id, SUM(COALESCE(tax, 0)) AS total_tax
         FROM sale_order_item
         GROUP BY order_id
       ) order_item_stats ON sd.order_id = order_item_stats.order_id
       LEFT JOIN (
         SELECT sr.delivery_id, SUM(sr.total_amount) AS refund_amount,
                SUM(COALESCE(return_item_stats.return_quantity, 0)) AS return_quantity
         FROM sale_return sr
         LEFT JOIN (
           SELECT return_id, SUM(quantity) AS return_quantity
           FROM sale_return_item
           GROUP BY return_id
         ) return_item_stats ON sr.id = return_item_stats.return_id
         WHERE sr.status = 1
         GROUP BY sr.delivery_id
       ) return_stats ON sd.id = return_stats.delivery_id
       WHERE ${where} ORDER BY sd.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/delivery', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const orderNo = String(req.body?.order_no || '').trim();
    if (!orderNo) throw new Error('请输入销售订单号');

    const [orderRows] = await conn.execute(
      'SELECT * FROM sale_order WHERE order_no = ? FOR UPDATE',
      [orderNo]
    );
    const order = orderRows[0];
    if (!order) throw new Error('销售订单不存在');
    if (Number(order.status) !== 1) throw new Error('仅进行中的销售订单允许创建发货单');

    const [deliveryRows] = await conn.execute(
      'SELECT delivery_no FROM sale_delivery WHERE order_id = ? AND status IN (0, 1, 2) LIMIT 1',
      [order.id]
    );
    if (deliveryRows.length) {
      throw new Error(`该销售订单已存在发货单 ${deliveryRows[0].delivery_no}`);
    }

    const result = await createPendingSaleDelivery(conn, order, req.user.id);
    await conn.execute(
      'UPDATE sale_order SET create_delivery = 1, ship = 0 WHERE id = ?',
      [order.id]
    );
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '按销售订单创建发货单', result.delivery_no);
    res.json(Response.success(result));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.get('/delivery/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT sd.*, so.order_no, so.employee_id, so.admin_remark, so.sale_remark,
              sc.name AS customer_name, e.name AS employee_name, w.name AS warehouse_name,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address,
              CASE WHEN COALESCE(return_stats.return_quantity, 0) > 0 THEN 1 ELSE 0 END AS return_status,
              COALESCE(order_item_stats.total_tax, 0) AS total_tax,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity
       FROM sale_delivery sd
       LEFT JOIN sale_order so ON sd.order_id = so.id
       LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id
       LEFT JOIN employee e ON so.employee_id = e.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       LEFT JOIN (
         SELECT order_id, SUM(COALESCE(tax, 0)) AS total_tax
         FROM sale_order_item
         GROUP BY order_id
       ) order_item_stats ON sd.order_id = order_item_stats.order_id
       LEFT JOIN (
         SELECT sr.delivery_id, SUM(sr.total_amount) AS refund_amount,
                SUM(COALESCE(return_item_stats.return_quantity, 0)) AS return_quantity
         FROM sale_return sr
         LEFT JOIN (
           SELECT return_id, SUM(quantity) AS return_quantity
           FROM sale_return_item
           GROUP BY return_id
         ) return_item_stats ON sr.id = return_item_stats.return_id
         WHERE sr.status = 1
         GROUP BY sr.delivery_id
       ) return_stats ON sd.id = return_stats.delivery_id
       WHERE sd.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('发货单不存在'));
    const delivery = rows[0];
    const [items] = await pool.execute(
      `SELECT sdi.*, p.name AS product_name, p.code, p.spec, u.name AS unit_name,
              CASE
                WHEN COALESCE(order_item_stats.total_quantity, 0) > 0
                THEN COALESCE(order_item_stats.tax, 0) * sdi.quantity / order_item_stats.total_quantity
                ELSE 0
              END AS tax,
              COALESCE(return_item_stats.returned_quantity, 0) AS returned_quantity
       FROM sale_delivery_item sdi
       LEFT JOIN product p ON sdi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT order_id, product_id, SUM(COALESCE(tax, 0)) AS tax, SUM(quantity) AS total_quantity
         FROM sale_order_item
         GROUP BY order_id, product_id
       ) order_item_stats ON order_item_stats.order_id = ? AND order_item_stats.product_id = sdi.product_id
       LEFT JOIN (
         SELECT sri.delivery_item_id, SUM(sri.quantity) AS returned_quantity
         FROM sale_return_item sri
         INNER JOIN sale_return sr ON sri.return_id = sr.id AND sr.status <> 2
         GROUP BY sri.delivery_item_id
       ) return_item_stats ON return_item_stats.delivery_item_id = sdi.id
       WHERE sdi.delivery_id = ?`, [delivery.order_id, delivery.id]
    );
    delivery.items = items;
    delivery.item_count = items.length;
    delivery.unit_price = items.length === 1 ? Number(items[0].price || 0) : null;
    delivery.delivery_total_quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    res.json(Response.success(delivery));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/delivery/:id/ship', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM sale_delivery WHERE id = ? FOR UPDATE', [req.params.id]);
    const delivery = rows[0];
    if (!delivery) throw new Error('发货单不存在');
    if (Number(delivery.status) !== 0) throw new Error('仅待发货单允许发货');

    const [items] = await conn.execute(
      `SELECT sdi.*, p.name AS product_name
       FROM sale_delivery_item sdi
       LEFT JOIN product p ON sdi.product_id = p.id
       WHERE sdi.delivery_id = ?`,
      [delivery.id]
    );
    if (!items.length) throw new Error('发货明细不能为空');

    for (const item of items) {
      const [stockRows] = await conn.execute(
        'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
        [item.product_id, delivery.warehouse_id]
      );
      const stockQuantity = stockRows.length ? Number(stockRows[0].quantity || 0) : 0;
      if (stockQuantity < Number(item.quantity || 0)) {
        throw new Error(`库存不足：${item.product_name || `产品ID ${item.product_id}`}，当前库存 ${stockQuantity}，需要 ${item.quantity}`);
      }
    }

    for (const item of items) {
      await updateStock(conn, item.product_id, delivery.warehouse_id, -Number(item.quantity || 0), 'sale_delivery', delivery.delivery_no);
    }

    const { logistics_company = '', logistics_no = '', delivery_remark = '' } = req.body || {};
    if (String(delivery_remark).length > 200) throw new Error('备注信息最多200个字符');
    await conn.execute(
      `UPDATE sale_delivery
       SET status = 1, logistics_company = ?, logistics_no = ?, delivery_remark = ?, shipped_time = NOW()
       WHERE id = ?`,
      [logistics_company, logistics_no, delivery_remark, delivery.id]
    );
    await conn.execute(
      'UPDATE sale_order SET completed_time = COALESCE(completed_time, NOW()) WHERE id = ?',
      [delivery.order_id]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '销售发货单发货', delivery.delivery_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/delivery/:id/cancel', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_delivery WHERE id = ?', [req.params.id]);
    const delivery = rows[0];
    if (!delivery) return res.json(Response.error('发货单不存在'));
    if (Number(delivery.status) !== 0) return res.json(Response.error('仅待发货单允许取消'));
    await pool.execute('UPDATE sale_delivery SET status = 3, cancel_time = NOW() WHERE id = ?', [delivery.id]);
    await writeSystemLog(pool, req.user.id, '销售管理', '取消销售发货单', delivery.delivery_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/delivery/batch-receive', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const ids = [...new Set((req.body?.ids || []).map(Number).filter(id => Number.isInteger(id) && id > 0))];
    if (!ids.length) throw new Error('请选择需要收货的发货单');

    await conn.beginTransaction();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await conn.execute(
      `SELECT id, delivery_no, status
       FROM sale_delivery
       WHERE id IN (${placeholders})
       FOR UPDATE`,
      ids
    );
    if (rows.length !== ids.length) throw new Error('部分发货单不存在，请刷新后重试');

    const invalidRows = rows.filter(row => Number(row.status) !== 1);
    if (invalidRows.length) {
      throw new Error(`仅已发货单允许收货：${invalidRows.map(row => row.delivery_no).join('、')}`);
    }

    await conn.execute(
      `UPDATE sale_delivery
       SET status = 2, completed_time = NOW()
       WHERE id IN (${placeholders})`,
      ids
    );
    for (const row of rows) {
      await writeSystemLog(conn, req.user.id, '销售管理', '销售发货单确认收货', row.delivery_no);
    }
    await conn.commit();
    res.json(Response.success({ count: rows.length }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/delivery/:id/receive', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_delivery WHERE id = ?', [req.params.id]);
    const delivery = rows[0];
    if (!delivery) return res.json(Response.error('发货单不存在'));
    if (Number(delivery.status) !== 1) return res.json(Response.error('仅已发货单允许确认收货'));
    await pool.execute(
      'UPDATE sale_delivery SET status = 2, completed_time = NOW() WHERE id = ?',
      [delivery.id]
    );
    await writeSystemLog(pool, req.user.id, '销售管理', '销售发货单确认收货', delivery.delivery_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售退货 ====================

router.get('/return', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      customer_id = '',
      status = '',
      start_date = '',
      end_date = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (CAST(sr.id AS CHAR) LIKE ? OR sr.return_no LIKE ? OR sd.delivery_no LIKE ? OR so.order_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (customer_id) { where += ' AND sr.customer_id = ?'; params.push(Number(customer_id)); }
    if (status !== '') { where += ' AND sr.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND sr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM sale_return sr
       LEFT JOIN sale_delivery sd ON sr.delivery_id = sd.id
       LEFT JOIN sale_order so ON sd.order_id = so.id
       LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sr.id, sr.return_no, sr.delivery_id, sr.customer_id, sr.employee_id,
              sr.status, sr.express_name, sr.express_no, sr.reason,
              sr.completed_time, sr.cancel_time, sr.created_at, sr.updated_at,
              sd.delivery_no, so.order_no, w.name AS warehouse_name,
              sc.name AS customer_name, e.name AS employee_name,
              COALESCE(NULLIF(sr.contact, ''), NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(sr.phone, ''), NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(sr.address, ''), NULLIF(so.detail_address, ''), sc.address) AS address,
              sr.total_amount AS refund_total_amount,
              COALESCE(item_stats.item_count, 0) AS item_count,
              COALESCE(item_stats.return_total_quantity, 0) AS return_total_quantity,
              CASE WHEN COALESCE(item_stats.item_count, 0) = 1 THEN item_stats.unit_price ELSE NULL END AS unit_price,
              COALESCE(item_stats.tax_amount, 0) AS tax_amount,
              COALESCE(item_stats.total_price, 0) AS total_price,
              u.real_name AS creator_name
       FROM sale_return sr
       LEFT JOIN sale_delivery sd ON sr.delivery_id = sd.id
       LEFT JOIN sale_order so ON sd.order_id = so.id
       LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id
       LEFT JOIN employee e ON sr.employee_id = e.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       LEFT JOIN sys_user u ON sr.creator_id = u.id
       LEFT JOIN (
         SELECT return_id, COUNT(*) AS item_count, MAX(price) AS unit_price,
                SUM(quantity) AS return_total_quantity,
                SUM(COALESCE(tax, 0)) AS tax_amount,
                SUM(price * quantity + COALESCE(tax, 0)) AS total_price
         FROM sale_return_item
         GROUP BY return_id
       ) item_stats ON sr.id = item_stats.return_id
       WHERE ${where} ORDER BY sr.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/return/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT sr.*, sd.delivery_no, so.order_no, w.name AS warehouse_name,
              sc.name AS customer_name, e.name AS employee_name,
              COALESCE(NULLIF(sr.contact, ''), NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(sr.phone, ''), NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(sr.address, ''), NULLIF(so.detail_address, ''), sc.address) AS address
       FROM sale_return sr
       LEFT JOIN sale_delivery sd ON sr.delivery_id = sd.id
       LEFT JOIN sale_order so ON sd.order_id = so.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id
       LEFT JOIN employee e ON sr.employee_id = e.id
       WHERE sr.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('退货单不存在'));
    const ret = rows[0];
    const [items] = await pool.execute(
      `SELECT sri.*, p.name AS product_name, p.code, p.spec
       FROM sale_return_item sri
       LEFT JOIN product p ON sri.product_id = p.id
       WHERE sri.return_id = ?`, [ret.id]
    );
    ret.items = items;
    res.json(Response.success(ret));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/return', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const {
      delivery_id,
      employee_id = 0,
      status,
      express_name = '',
      express_no = '',
      contact = '',
      phone = '',
      address = '',
      reason = '',
      items
    } = req.body;
    if (!delivery_id) throw new Error('发货单不能为空');
    if (status === undefined || status === null || status === '' || ![0, 1].includes(Number(status))) {
      throw new Error('请选择退货状态');
    }
    if (!items || !items.length) throw new Error('退货明细不能为空');
    if (String(reason).length > 200) throw new Error('单据备注最多200个字符');

    const [deliveryRows] = await conn.execute(
      'SELECT * FROM sale_delivery WHERE id = ? FOR UPDATE',
      [delivery_id]
    );
    const delivery = deliveryRows[0];
    if (!delivery) throw new Error('发货单不存在');
    if (![1, 2].includes(Number(delivery.status))) throw new Error('仅已发货或已收货单允许退货');

    const [deliveryItems] = await conn.execute(
      `SELECT sdi.*,
              CASE
                WHEN COALESCE(order_item_stats.total_quantity, 0) > 0
                THEN COALESCE(order_item_stats.tax, 0) * sdi.quantity / order_item_stats.total_quantity
                ELSE 0
              END AS tax,
              COALESCE(return_item_stats.returned_quantity, 0) AS returned_quantity
       FROM sale_delivery_item sdi
       LEFT JOIN (
         SELECT order_id, product_id, SUM(COALESCE(tax, 0)) AS tax, SUM(quantity) AS total_quantity
         FROM sale_order_item
         GROUP BY order_id, product_id
       ) order_item_stats ON order_item_stats.order_id = ? AND order_item_stats.product_id = sdi.product_id
       LEFT JOIN (
         SELECT sri.delivery_item_id, SUM(sri.quantity) AS returned_quantity
         FROM sale_return_item sri
         INNER JOIN sale_return sr ON sri.return_id = sr.id AND sr.status <> 2
         GROUP BY sri.delivery_item_id
       ) return_item_stats ON return_item_stats.delivery_item_id = sdi.id
       WHERE sdi.delivery_id = ?`,
      [delivery.order_id, delivery.id]
    );
    const deliveryItemMap = new Map(deliveryItems.map(item => [Number(item.id), item]));
    let totalAmount = 0;

    for (const item of items) {
      const source = deliveryItemMap.get(Number(item.delivery_item_id));
      if (!source || Number(source.product_id) !== Number(item.product_id)) throw new Error('退货产品不属于当前发货单');
      const quantity = Number(item.quantity || 0);
      const availableQuantity = Number(source.quantity || 0) - Number(source.returned_quantity || 0);
      if (quantity <= 0) throw new Error('退货数量必须大于0');
      if (quantity > availableQuantity) throw new Error(`退货数量不能超过可退数量 ${availableQuantity}`);
      const refundAmount = Number(item.refund_amount || 0);
      const proportionalTax = Number(source.quantity || 0) > 0
        ? Number(source.tax || 0) * quantity / Number(source.quantity)
        : 0;
      const maximumRefund = quantity * Number(source.price || 0) + proportionalTax;
      if (refundAmount < 0 || refundAmount > maximumRefund + 0.01) {
        throw new Error(`退款金额不能超过 ${maximumRefund.toFixed(2)}`);
      }
      totalAmount += refundAmount;
    }

    const returnNo = await generateNo(conn, 'XT');
    const [result] = await conn.execute(
      `INSERT INTO sale_return
       (return_no, delivery_id, customer_id, employee_id, total_amount, status, express_name, express_no,
        contact, phone, address, reason, completed_time, creator_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        returnNo, delivery.id, delivery.customer_id, employee_id, totalAmount, Number(status),
        express_name, express_no, contact, phone, address, reason,
        Number(status) === 1 ? new Date() : null, req.user.id
      ]
    );
    const returnId = result.insertId;

    for (const item of items) {
      const source = deliveryItemMap.get(Number(item.delivery_item_id));
      const quantity = Number(item.quantity || 0);
      const tax = Number(source.quantity || 0) > 0
        ? Number(source.tax || 0) * quantity / Number(source.quantity)
        : 0;
      await conn.execute(
        `INSERT INTO sale_return_item
         (return_id, delivery_item_id, product_id, quantity, price, tax, amount, remark)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          returnId, source.id, source.product_id, quantity, source.price, tax,
          Number(item.refund_amount || 0), item.remark || ''
        ]
      );
      if (Number(status) === 1) {
        await updateStock(conn, source.product_id, delivery.warehouse_id, quantity, 'sale_return', returnNo);
      }
    }

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '新增发货退货单', returnNo);
    res.json(Response.success({ id: returnId, return_no: returnNo }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/return/:id/complete', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT sr.*, sd.warehouse_id
       FROM sale_return sr
       INNER JOIN sale_delivery sd ON sr.delivery_id = sd.id
       WHERE sr.id = ?
       FOR UPDATE`,
      [req.params.id]
    );
    const ret = rows[0];
    if (!ret) throw new Error('退货单不存在');
    if (Number(ret.status) !== 0) throw new Error('仅待退货单允许退货');
    if (!ret.warehouse_id) throw new Error('退货单关联仓库不存在');

    const { express_name = '', express_no = '', reason = '' } = req.body || {};
    if (String(reason).length > 200) throw new Error('备注信息最多200个字符');
    const [items] = await conn.execute(
      'SELECT * FROM sale_return_item WHERE return_id = ?',
      [ret.id]
    );
    if (!items.length) throw new Error('退货明细不能为空');

    for (const item of items) {
      await updateStock(
        conn,
        item.product_id,
        ret.warehouse_id,
        Number(item.quantity || 0),
        'sale_return',
        ret.return_no
      );
    }

    await conn.execute(
      `UPDATE sale_return
       SET status = 1, express_name = ?, express_no = ?, reason = ?,
           completed_time = NOW(), cancel_time = NULL
       WHERE id = ?`,
      [express_name, express_no, reason, ret.id]
    );
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '发货退货单退货', ret.return_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/return/:id/cancel', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT * FROM sale_return WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const ret = rows[0];
    if (!ret) throw new Error('退货单不存在');
    if (Number(ret.status) !== 0) throw new Error('仅待退货单允许取消');

    await conn.execute(
      'UPDATE sale_return SET status = 2, cancel_time = NOW() WHERE id = ?',
      [ret.id]
    );
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '取消发货退货单', ret.return_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.delete('/return/:id', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT * FROM sale_return WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const ret = rows[0];
    if (!ret) throw new Error('退货单不存在');
    if (Number(ret.status) !== 2) throw new Error('仅已取消退货单允许删除');

    await conn.execute('DELETE FROM sale_return_item WHERE return_id = ?', [ret.id]);
    await conn.execute('DELETE FROM sale_return WHERE id = ?', [ret.id]);
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '销售管理', '删除发货退货单', ret.return_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 辅助函数 ====================

async function updateStock(conn, productId, warehouseId, quantity, changeType, refNo) {
  const changeQty = Number(quantity || 0);
  const [rows] = await conn.execute(
    'SELECT * FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );
  const beforeQty = rows.length ? Number(rows[0].quantity || 0) : 0;
  const afterQty = beforeQty + changeQty;

  if (rows.length) {
    await conn.execute(
      'UPDATE inventory_stock SET quantity = ?, updated_at = NOW() WHERE id = ?',
      [afterQty, rows[0].id]
    );
  } else {
    await conn.execute(
      'INSERT INTO inventory_stock (product_id, warehouse_id, quantity) VALUES (?,?,?)',
      [productId, warehouseId, afterQty]
    );
  }

  await conn.execute(
    `INSERT INTO inventory_log (product_id, warehouse_id, change_type, change_quantity, before_quantity, after_quantity, ref_no)
     VALUES (?,?,?,?,?,?,?)`,
    [productId, warehouseId, changeType, changeQty, beforeQty, afterQty, refNo]
  );
}

async function createPendingSaleDelivery(conn, order, userId) {
  const [itemRows] = await conn.execute(
    'SELECT * FROM sale_order_item WHERE order_id = ?',
    [order.id]
  );
  if (!itemRows.length) throw new Error('销售订单明细不能为空');

  const deliveryNo = await generateNo(conn, 'FH');
  const [result] = await conn.execute(
    `INSERT INTO sale_delivery
     (delivery_no, order_id, customer_id, warehouse_id, total_amount, status, creator_id)
     VALUES (?,?,?,?,?,0,?)`,
    [deliveryNo, order.id, order.customer_id, order.warehouse_id, order.total_amount, userId]
  );

  for (const item of itemRows) {
    await conn.execute(
      'INSERT INTO sale_delivery_item (delivery_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
      [result.insertId, item.product_id, item.quantity, item.price, item.amount]
    );
  }

  return {
    id: result.insertId,
    delivery_id: result.insertId,
    delivery_no: deliveryNo,
    order_id: order.id,
    order_no: order.order_no,
    status: 0
  };
}

async function approveSaleOrder(conn, orderId, userId, options = {}) {
  const [orderRows] = await conn.execute('SELECT * FROM sale_order WHERE id = ?', [orderId]);
  const order = orderRows[0];
  if (!order) throw new Error('订单不存在');
  if (![0, 2].includes(Number(order.status))) throw new Error('订单状态不允许审核');

  const shouldCreateDelivery = options.create_delivery === undefined
    ? Boolean(Number(order.create_delivery))
    : Boolean(options.create_delivery);
  const shouldShip = shouldCreateDelivery && (
    options.ship === undefined ? Boolean(Number(order.ship)) : Boolean(options.ship)
  );
  if (!shouldCreateDelivery) {
    await conn.execute(
      'UPDATE sale_order SET status = 1, auditor_id = ?, audit_time = NOW(), completed_time = NULL WHERE id = ?',
      [userId, order.id]
    );
    return { order_no: order.order_no, delivery_id: null, delivery_no: '' };
  }

  const [itemRows] = await conn.execute(
    `SELECT soi.*, p.name AS product_name
     FROM sale_order_item soi
     LEFT JOIN product p ON soi.product_id = p.id
     WHERE soi.order_id = ?`,
    [order.id]
  );
  const shouldAutoRestock = Boolean(options.auto_restock);
  if (shouldShip) {
    const resolvedWarehouseId = await resolveSaleWarehouse(conn, order.warehouse_id, itemRows);
    if (resolvedWarehouseId && Number(resolvedWarehouseId) !== Number(order.warehouse_id)) {
      order.warehouse_id = resolvedWarehouseId;
      await conn.execute('UPDATE sale_order SET warehouse_id = ? WHERE id = ?', [resolvedWarehouseId, order.id]);
    }
    for (const item of itemRows) {
      const [stockRows] = await conn.execute(
        'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
        [item.product_id, order.warehouse_id]
      );
      const stockQty = stockRows.length ? Number(stockRows[0].quantity || 0) : 0;
      if (stockQty < item.quantity) {
        if (!shouldAutoRestock) {
          const productName = item.product_name || `产品ID ${item.product_id}`;
          throw new Error(`库存不足：${productName}，当前库存 ${stockQty}，需要 ${item.quantity}`);
        }
        await updateStock(conn, item.product_id, order.warehouse_id, Number(item.quantity) - stockQty, 'other_inbound', `${order.order_no}-自动补库`);
      }
    }
  }

  const deliveryNo = await generateNo(conn, 'FH');
  const { logistics_company = '', logistics_no = '', delivery_remark = '' } = options;
  const [result] = await conn.execute(
    `INSERT INTO sale_delivery
     (delivery_no, order_id, customer_id, warehouse_id, total_amount, status, logistics_company, logistics_no, delivery_remark, shipped_time, creator_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [deliveryNo, order.id, order.customer_id, order.warehouse_id, order.total_amount, shouldShip ? 1 : 0, logistics_company, logistics_no, delivery_remark, shouldShip ? new Date() : null, userId]
  );
  const deliveryId = result.insertId;

  for (const item of itemRows) {
    await conn.execute(
      'INSERT INTO sale_delivery_item (delivery_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
      [deliveryId, item.product_id, item.quantity, item.price, item.amount]
    );
    if (shouldShip) {
      await updateStock(conn, item.product_id, order.warehouse_id, -item.quantity, 'sale_delivery', deliveryNo);
    }
  }

  await conn.execute(
    'UPDATE sale_order SET status = 1, auditor_id = ?, audit_time = NOW(), completed_time = ? WHERE id = ?',
    [userId, shouldShip ? new Date() : null, order.id]
  );

  return { order_no: order.order_no, delivery_id: deliveryId, delivery_no: deliveryNo };
}

async function resolveSaleWarehouse(conn, preferredWarehouseId, items) {
  const productIds = [...new Set(items.map(item => Number(item.product_id || 0)).filter(Boolean))];
  if (!productIds.length) return preferredWarehouseId;

  const placeholders = productIds.map(() => '?').join(',');
  const [stockRows] = await conn.execute(
    `SELECT product_id, warehouse_id, SUM(quantity) AS quantity
     FROM inventory_stock
     WHERE product_id IN (${placeholders})
     GROUP BY product_id, warehouse_id`,
    productIds
  );

  const warehouseIds = [
    Number(preferredWarehouseId || 0),
    ...stockRows.map(row => Number(row.warehouse_id || 0))
  ].filter(Boolean);
  const candidates = [...new Set(warehouseIds)];

  for (const warehouseId of candidates) {
    const canFulfill = items.every(item => {
      const stock = stockRows.find(row => Number(row.product_id) === Number(item.product_id) && Number(row.warehouse_id) === warehouseId);
      return Number(stock?.quantity || 0) >= Number(item.quantity || 0);
    });
    if (canFulfill) return warehouseId;
  }

  return preferredWarehouseId;
}

async function syncSaleReceiptInvoiceStatus(conn, orderId) {
  const [rows] = await conn.execute(
    `SELECT COALESCE(SUM(total_amount), 0) AS invoice_amount
     FROM sale_invoice
     WHERE order_id = ? AND status = 1`,
    [orderId]
  );
  const invoiceAmount = roundMoney(rows[0]?.invoice_amount || 0);
  const [receiptRows] = await conn.execute('SELECT id, should_amount FROM finance_receipt WHERE order_id = ?', [orderId]);
  for (const receipt of receiptRows) {
    const shouldAmount = roundMoney(receipt.should_amount || 0);
    const invoiceStatus = invoiceAmount <= 0 ? 0 : (shouldAmount > 0 && invoiceAmount >= shouldAmount ? 1 : 2);
    await conn.execute(
      'UPDATE finance_receipt SET invoice_status = ?, invoice_time = ? WHERE id = ?',
      [invoiceStatus, invoiceStatus === 1 ? new Date() : null, receipt.id]
    );
  }
}

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function calculateIncludedTax(totalAmount, taxRate) {
  const total = roundMoney(totalAmount);
  const rate = roundMoney(taxRate);
  return rate > 0 ? roundMoney(total * rate / (100 + rate)) : 0;
}

function normalizeTaxRate(value) {
  const rate = Number(value ?? 13);
  if (!Number.isFinite(rate)) return 13;
  return Math.min(Math.max(roundMoney(rate), 0), 100);
}

function calculateItemTax(item) {
  if (item.tax !== undefined && item.tax !== null && item.tax !== '') {
    return roundMoney(item.tax);
  }
  const rate = normalizeTaxRate(item.tax_rate);
  const grossAmount = calculateLineAmount(item);
  return rate > 0 ? roundMoney(grossAmount * rate / (100 + rate)) : 0;
}

function calculateLineAmount(item) {
  return roundMoney(Number(item.quantity || 0) * Number(item.price || 0));
}

async function generateNo(poolOrConn, prefix) {
  return generateBusinessNo(poolOrConn, prefix);
}

async function generateFinanceReceiptNo(poolOrConn) {
  return generateBusinessNo(poolOrConn, 'finance_receipt');
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
