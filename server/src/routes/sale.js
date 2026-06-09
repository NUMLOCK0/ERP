const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { isAuditEnabled } = require('../utils/auditConfig');

// ==================== 销售订单 ====================

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
         WHERE sd.order_id IS NOT NULL
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
    const [rows] = await pool.execute('SELECT * FROM sale_order WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('订单不存在'));
    const order = rows[0];
    const [items] = await pool.execute(
      `SELECT soi.*, p.name AS product_name, p.code, p.spec, u.name AS unit_name, COALESCE(pu.base_quantity, 1) AS base_quantity
       FROM sale_order_item soi
       LEFT JOIN product p ON soi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT product_id, MIN(base_quantity) AS base_quantity
         FROM product_unit
         GROUP BY product_id
       ) pu ON p.id = pu.product_id
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

    const orderNo = await generateNo(pool, 'XS');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0) + Number(item.tax || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO sale_order
         (order_no, customer_id, employee_id, warehouse_id, payment_method, total_amount, admin_remark, sale_remark, customer_contact, customer_phone, detail_address, status, auditor_id, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [orderNo, customer_id, employee_id, warehouse_id, payment_method, totalAmount, admin_remark, sale_remark, customer_contact, customer_phone, detail_address, 0, 0, req.user.id]
      );
      const orderId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO sale_order_item (order_id, product_id, quantity, price, tax, amount) VALUES (?,?,?,?,?,?)',
          [orderId, item.product_id, item.quantity, item.price, item.tax || 0, (item.quantity || 0) * (item.price || 0) + Number(item.tax || 0)]
        );
      }

      const receiptNo = await generateFinanceReceiptNo(conn);
      await conn.execute(
        `INSERT INTO finance_receipt (receipt_no, order_id, customer_id, amount, should_amount, pay_method, status, remark, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [receiptNo, orderId, customer_id, 0, totalAmount, payment_method, 0, sale_remark || admin_remark || '', req.user.id]
      );

      const auditEnabled = await isAuditEnabled(conn, 'sale_order');
      const shouldAutoApprove = Boolean(create_delivery || ship || auditor_id) || !auditEnabled;
      let approvalResult = null;
      if (shouldAutoApprove) {
        approvalResult = await approveSaleOrder(conn, orderId, auditor_id || req.user.id, {
          ship: Boolean(ship || auditor_id || !auditEnabled),
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
      items
    } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      await conn.execute('DELETE FROM sale_order_item WHERE order_id = ?', [req.params.id]);
      for (const item of (items || [])) {
        const amount = (item.quantity || 0) * (item.price || 0) + Number(item.tax || 0);
        totalAmount += amount;
        await conn.execute(
          'INSERT INTO sale_order_item (order_id, product_id, quantity, price, tax, amount) VALUES (?,?,?,?,?,?)',
          [req.params.id, item.product_id, item.quantity, item.price, item.tax || 0, amount]
        );
      }

      await conn.execute(
        `UPDATE sale_order
         SET customer_id=?, employee_id=?, warehouse_id=?, payment_method=?, total_amount=?, admin_remark=?, sale_remark=?,
             customer_contact=?, customer_phone=?, detail_address=?
         WHERE id=?`,
        [customer_id, employee_id, warehouse_id, payment_method, totalAmount, admin_remark, sale_remark, customer_contact, customer_phone, detail_address, req.params.id]
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
        const result = await approveSaleOrder(conn, req.params.id, req.user.id, { ship: true });
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
    const result = await approveSaleOrder(conn, req.params.id, req.user.id, req.body);

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
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (sd.delivery_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM sale_delivery sd LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sd.*, sc.name AS customer_name, w.name AS warehouse_name, u.real_name AS creator_name
       FROM sale_delivery sd
       LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       LEFT JOIN sys_user u ON sd.creator_id = u.id
       WHERE ${where} ORDER BY sd.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/delivery/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sale_delivery WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('发货单不存在'));
    const delivery = rows[0];
    const [items] = await pool.execute(
      `SELECT sdi.*, p.name AS product_name, p.code, p.spec
       FROM sale_delivery_item sdi
       LEFT JOIN product p ON sdi.product_id = p.id
       WHERE sdi.delivery_id = ?`, [delivery.id]
    );
    delivery.items = items;
    res.json(Response.success(delivery));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售退货 ====================

router.get('/return', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (sr.return_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND sr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM sale_return sr LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sr.*, sc.name AS customer_name, u.real_name AS creator_name
       FROM sale_return sr
       LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id
       LEFT JOIN sys_user u ON sr.creator_id = u.id
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
    const [rows] = await pool.execute('SELECT * FROM sale_return WHERE id = ?', [req.params.id]);
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
  try {
    const pool = getPool();
    const { delivery_id, customer_id, items, reason = '' } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const returnNo = await generateNo(pool, 'XT');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO sale_return (return_no, delivery_id, customer_id, total_amount, status, reason, creator_id)
         VALUES (?,?,?,?,0,?,?)`,
        [returnNo, delivery_id || 0, customer_id, totalAmount, reason, req.user.id]
      );
      const returnId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO sale_return_item (return_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
          [returnId, item.product_id, item.quantity, item.price, (item.quantity || 0) * (item.price || 0)]
        );
        // 增加库存（还回）
        const [deliveryRows] = await conn.execute('SELECT warehouse_id FROM sale_delivery WHERE id = ?', [delivery_id || 0]);
        if (deliveryRows.length) {
          await updateStock(conn, item.product_id, deliveryRows[0].warehouse_id, item.quantity, 'sale_return', returnNo);
        }
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '销售管理', '新增销售退货单', returnNo);
      res.json(Response.success({ id: returnId, return_no: returnNo }));
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

// ==================== 辅助函数 ====================

async function updateStock(conn, productId, warehouseId, quantity, changeType, refNo) {
  const [rows] = await conn.execute(
    'SELECT * FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );
  const beforeQty = rows.length ? rows[0].quantity : 0;
  const afterQty = beforeQty + quantity;

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
    [productId, warehouseId, changeType, quantity, beforeQty, afterQty, refNo]
  );
}

async function approveSaleOrder(conn, orderId, userId, options = {}) {
  const [orderRows] = await conn.execute('SELECT * FROM sale_order WHERE id = ?', [orderId]);
  const order = orderRows[0];
  if (!order) throw new Error('订单不存在');
  if (![0, 2].includes(Number(order.status))) throw new Error('订单状态不允许审核');

  const [itemRows] = await conn.execute(
    `SELECT soi.*, p.name AS product_name
     FROM sale_order_item soi
     LEFT JOIN product p ON soi.product_id = p.id
     WHERE soi.order_id = ?`,
    [order.id]
  );
  const shouldShip = options.ship !== false;
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
  const { logistics_company = '', logistics_no = '' } = options;
  const [result] = await conn.execute(
    `INSERT INTO sale_delivery (delivery_no, order_id, customer_id, warehouse_id, total_amount, status, logistics_company, logistics_no, completed_time, creator_id)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [deliveryNo, order.id, order.customer_id, order.warehouse_id, order.total_amount, shouldShip ? 1 : 0, logistics_company, logistics_no, shouldShip ? new Date() : null, userId]
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

async function generateNo(poolOrConn, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tableMap = {
    'XS': { table: 'sale_order', col: 'order_no' },
    'FH': { table: 'sale_delivery', col: 'delivery_no' },
    'XT': { table: 'sale_return', col: 'return_no' }
  };
  const mapping = tableMap[prefix] || { table: 'sale_order', col: 'order_no' };
  const [rows] = await poolOrConn.execute(
    `SELECT COUNT(*) AS cnt FROM ${mapping.table} WHERE ${mapping.col} LIKE ?`,
    [`${prefix}-${dateStr}-%`]
  );
  const seq = (Number(rows[0]?.cnt) || 0) + 1;
  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

async function generateFinanceReceiptNo(poolOrConn) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const [rows] = await poolOrConn.execute(
    'SELECT COUNT(*) AS cnt FROM finance_receipt WHERE receipt_no LIKE ?',
    [`SK-${dateStr}-%`]
  );
  const seq = (Number(rows[0]?.cnt) || 0) + 1;
  return `SK-${dateStr}-${String(seq).padStart(4, '0')}`;
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
