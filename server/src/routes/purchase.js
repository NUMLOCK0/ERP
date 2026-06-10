const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { isAuditEnabled } = require('../utils/auditConfig');
const { resolveInlineProduct } = require('../utils/inlineProduct');

const PURCHASE_STATUS = {
  PENDING_SUBMIT: 0,
  PURCHASING: 1,
  PENDING_AUDIT: 2,
  CANCELED: 3,
  CLOSED: 4,
  AUDITED: 5,
  PURCHASED: 6,
  INBOUNDING: 7,
  INBOUNDED: 8,
  REJECTED: 9
};

// ==================== 采购订单 ====================

router.get('/order', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', supplier_id = '', status = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (po.order_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (supplier_id) { where += ' AND po.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status !== '') { where += ' AND po.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND po.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND po.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM purchase_order po LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT po.*, sc.name AS supplier_name, sc.contact, sc.phone, sc.bank_name, sc.address AS bank_address,
              sc.name AS bank_account_name, sc.bank_account, w.name AS warehouse_name, u.real_name AS creator_name,
              COALESCE(item_stats.product_total_quantity, 0) AS product_total_quantity,
              COALESCE(item_stats.unit_price, 0) AS unit_price,
              COALESCE(item_stats.tax_amount, 0) AS tax_amount,
              po.total_amount AS total_price,
              COALESCE(final_stats.final_unit_price, item_stats.unit_price, 0) AS final_unit_price,
              COALESCE(final_stats.final_tax_amount, item_stats.tax_amount, 0) AS final_tax_amount,
              COALESCE(final_stats.final_product_total_quantity, item_stats.product_total_quantity, 0) AS final_product_total_quantity,
              COALESCE(inbound_stats.inbound_quantity, 0) AS inbound_quantity,
              GREATEST(
                COALESCE(final_stats.final_product_total_quantity, item_stats.product_total_quantity, 0)
                - COALESCE(inbound_stats.inbound_quantity, 0)
                - COALESCE(return_stats.return_quantity, 0),
                0
              ) AS remaining_quantity,
              COALESCE(payment_stats.payment_total_amount, 0) AS payment_total_amount,
              COALESCE(NULLIF(po.payment_method, ''), payment_stats.payment_method) AS payment_method,
              CASE
                WHEN COALESCE(payment_stats.payment_total_amount, 0) <= 0 THEN 0
                WHEN COALESCE(payment_stats.payment_total_amount, 0) >= po.total_amount THEN 2
                ELSE 1
              END AS payment_status,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
              CASE WHEN COALESCE(return_stats.return_quantity, 0) > 0 THEN 1 ELSE 0 END AS return_status,
              po.admin_remark,
              po.purchase_remark,
              po.completed_time,
              COALESCE(po.inbound_start_time, inbound_stats.inbound_start_time) AS inbound_start_time,
              po.purchase_completed_time,
              po.purchase_start_time,
              po.audit_time,
              po.submit_time,
              po.cancel_time,
              po.close_time
       FROM purchase_order po
       LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id
       LEFT JOIN warehouse w ON po.warehouse_id = w.id
       LEFT JOIN sys_user u ON po.creator_id = u.id
       LEFT JOIN (
         SELECT order_id, SUM(quantity) AS product_total_quantity, AVG(price) AS unit_price, SUM(COALESCE(tax, 0)) AS tax_amount
         FROM purchase_order_item
         GROUP BY order_id
       ) item_stats ON po.id = item_stats.order_id
       LEFT JOIN (
         SELECT order_id,
                SUM(COALESCE(final_quantity, quantity)) AS final_product_total_quantity,
                AVG(COALESCE(final_price, price)) AS final_unit_price,
                SUM(COALESCE(final_tax, tax, 0)) AS final_tax_amount
         FROM purchase_order_item
         GROUP BY order_id
       ) final_stats ON po.id = final_stats.order_id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(fp.order_id, 0), pi.order_id) AS order_id,
                SUM(fp.amount) AS payment_total_amount,
                GROUP_CONCAT(DISTINCT fp.pay_method ORDER BY fp.id SEPARATOR '、') AS payment_method
         FROM finance_payment fp
         LEFT JOIN purchase_inbound pi ON fp.inbound_id = pi.id
         GROUP BY COALESCE(NULLIF(fp.order_id, 0), pi.order_id)
       ) payment_stats ON po.id = payment_stats.order_id
       LEFT JOIN (
         SELECT pi.order_id, MIN(pi.created_at) AS inbound_start_time, SUM(COALESCE(pii.quantity, 0)) AS inbound_quantity
         FROM purchase_inbound pi
         LEFT JOIN purchase_inbound_item pii ON pi.id = pii.inbound_id
         GROUP BY pi.order_id
       ) inbound_stats ON po.id = inbound_stats.order_id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(pr.order_id, 0), pi.order_id) AS order_id,
                SUM(pr.total_amount) AS refund_amount,
                SUM(COALESCE(pri.return_quantity, 0)) AS return_quantity
         FROM purchase_return pr
         LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
         LEFT JOIN (
           SELECT return_id, SUM(quantity) AS return_quantity
           FROM purchase_return_item
           GROUP BY return_id
         ) pri ON pr.id = pri.return_id
         GROUP BY COALESCE(NULLIF(pr.order_id, 0), pi.order_id)
       ) return_stats ON po.id = return_stats.order_id
       WHERE ${where} ORDER BY po.id DESC LIMIT ?, ?`,
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
      `SELECT po.*, sc.name AS supplier_name, sc.contact, sc.phone, sc.bank_name, sc.address AS bank_address,
              sc.name AS bank_account_name, sc.bank_account, w.name AS warehouse_name
       FROM purchase_order po
       LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id
       LEFT JOIN warehouse w ON po.warehouse_id = w.id
       WHERE po.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('订单不存在'));
    const order = rows[0];
    const [items] = await pool.execute(
      `SELECT poi.*, p.name AS product_name, p.code, p.spec, u.name AS unit_name,
              COALESCE(pu.base_quantity, 1) AS base_quantity,
              COALESCE(inbound_item_stats.inbound_quantity, 0) AS inbounded_quantity,
              COALESCE(return_item_stats.return_quantity, 0) AS returned_quantity,
              GREATEST(
                COALESCE(poi.final_quantity, poi.quantity)
                - COALESCE(inbound_item_stats.inbound_quantity, 0)
                - COALESCE(return_item_stats.return_quantity, 0),
                0
              ) AS remaining_quantity
       FROM purchase_order_item poi
       LEFT JOIN product p ON poi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT product_id, MIN(base_quantity) AS base_quantity
         FROM product_unit
         GROUP BY product_id
       ) pu ON p.id = pu.product_id
       LEFT JOIN (
         SELECT pi.order_id, pii.product_id, SUM(pii.quantity) AS inbound_quantity
         FROM purchase_inbound_item pii
         LEFT JOIN purchase_inbound pi ON pii.inbound_id = pi.id
         GROUP BY pi.order_id, pii.product_id
       ) inbound_item_stats ON poi.order_id = inbound_item_stats.order_id AND poi.product_id = inbound_item_stats.product_id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(pr.order_id, 0), pi.order_id) AS order_id, pri.product_id, SUM(pri.quantity) AS return_quantity
         FROM purchase_return_item pri
         LEFT JOIN purchase_return pr ON pri.return_id = pr.id
         LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
         GROUP BY COALESCE(NULLIF(pr.order_id, 0), pi.order_id), pri.product_id
       ) return_item_stats ON poi.order_id = return_item_stats.order_id AND poi.product_id = return_item_stats.product_id
       WHERE poi.order_id = ?`, [order.id]
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
    const { supplier_id, warehouse_id, payment_method = '', admin_remark = '', purchase_remark = '', items } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0) + (item.tax || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const tempOrderNo = await generateTempOrderNo(conn);

      const auditEnabled = await isAuditEnabled(conn, 'purchase_order');
      const initialStatus = auditEnabled ? PURCHASE_STATUS.PENDING_SUBMIT : PURCHASE_STATUS.PURCHASING;
      const startTimeSql = auditEnabled ? 'NULL' : 'NOW()';

      const [result] = await conn.execute(
        `INSERT INTO purchase_order (order_no, supplier_id, warehouse_id, payment_method, total_amount, admin_remark, purchase_remark, status, auditor_id, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [tempOrderNo, supplier_id, warehouse_id, payment_method, totalAmount, admin_remark, purchase_remark, initialStatus, 0, req.user.id]
      );
      const orderId = result.insertId;
      const orderNo = await generatePurchaseOrderNo(conn, orderId);
      await conn.execute('UPDATE purchase_order SET order_no = ? WHERE id = ?', [orderNo, orderId]);
      const tempPaymentNo = await generateTempBizNo(conn, 'finance_payment', 'payment_no', 'TMP-FK');
      const [paymentResult] = await conn.execute(
        `INSERT INTO finance_payment (payment_no, order_id, supplier_id, amount, should_amount, pay_method, status, remark, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [tempPaymentNo, orderId, supplier_id, 0, totalAmount, payment_method, 0, purchase_remark || admin_remark || '', req.user.id]
      );
      const paymentNo = await generateIdBizNo(conn, 'finance_payment', 'payment_no', 'FK', paymentResult.insertId);
      await conn.execute('UPDATE finance_payment SET payment_no = ? WHERE id = ?', [paymentNo, paymentResult.insertId]);
      if (!auditEnabled) {
        await conn.execute(`UPDATE purchase_order SET purchase_start_time = ${startTimeSql} WHERE id = ?`, [orderId]);
      }

      for (const item of items) {
        const productId = await resolveInlineProduct(conn, item, {
          supplierId: supplier_id,
          warehouseId: warehouse_id
        });
        await conn.execute(
          'INSERT INTO purchase_order_item (order_id, product_id, quantity, price, tax, amount, remark) VALUES (?,?,?,?,?,?,?)',
          [orderId, productId, item.quantity, item.price, item.tax || 0, (item.quantity || 0) * (item.price || 0) + (item.tax || 0), item.remark || '']
        );
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '采购管理', '新增采购订单', orderNo);
      res.json(Response.success({ id: orderId, order_no: orderNo }));
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
    const { supplier_id, warehouse_id, payment_method = '', admin_remark = '', purchase_remark = '', items } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      await conn.execute('DELETE FROM purchase_order_item WHERE order_id = ?', [req.params.id]);
      for (const item of (items || [])) {
        const amount = (item.quantity || 0) * (item.price || 0) + (item.tax || 0);
        totalAmount += amount;
        const productId = await resolveInlineProduct(conn, item, {
          supplierId: supplier_id,
          warehouseId: warehouse_id
        });
        await conn.execute(
          'INSERT INTO purchase_order_item (order_id, product_id, quantity, price, tax, amount, remark) VALUES (?,?,?,?,?,?,?)',
          [req.params.id, productId, item.quantity, item.price, item.tax || 0, amount, item.remark || '']
        );
      }

      await conn.execute(
        'UPDATE purchase_order SET supplier_id=?, warehouse_id=?, payment_method=?, total_amount=?, admin_remark=?, purchase_remark=? WHERE id=?',
        [supplier_id, warehouse_id, payment_method, totalAmount, admin_remark, purchase_remark, req.params.id]
      );
      await conn.execute(
        'UPDATE finance_payment SET supplier_id = ?, should_amount = ?, pay_method = ?, remark = ? WHERE order_id = ?',
        [supplier_id, totalAmount, payment_method, purchase_remark || admin_remark || '', req.params.id]
      );

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '采购管理', '编辑采购订单', String(req.params.id));
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
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (![3, 4].includes(Number(order.status))) return res.json(Response.error('仅已取消或已关闭订单允许删除'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM purchase_order_item WHERE order_id = ?', [req.params.id]);
      await conn.execute('DELETE FROM purchase_order WHERE id = ?', [req.params.id]);
      await conn.commit();
      await writeSystemLog(pool, req.user.id, '采购管理', '删除采购订单', String(req.params.id));
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
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (Number(order.status) !== PURCHASE_STATUS.PENDING_SUBMIT) return res.json(Response.error('仅待提交订单允许提交审核'));
    await pool.execute('UPDATE purchase_order SET status = ?, submit_time = NOW() WHERE id = ?', [PURCHASE_STATUS.PENDING_AUDIT, req.params.id]);
    await writeSystemLog(pool, req.user.id, '采购管理', '提交采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/cancel', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (![PURCHASE_STATUS.PENDING_SUBMIT, PURCHASE_STATUS.PENDING_AUDIT, PURCHASE_STATUS.AUDITED, PURCHASE_STATUS.PURCHASING].includes(Number(order.status))) {
      return res.json(Response.error('当前状态不允许取消'));
    }
    await pool.execute('UPDATE purchase_order SET status = ?, cancel_time = NOW() WHERE id = ?', [PURCHASE_STATUS.CANCELED, req.params.id]);
    await pool.execute(
      'UPDATE finance_payment SET status = 3, close_time = COALESCE(close_time, NOW()) WHERE order_id = ? AND status <> 2',
      [req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '采购管理', '取消采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/close', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (![PURCHASE_STATUS.AUDITED, PURCHASE_STATUS.PURCHASING, PURCHASE_STATUS.PURCHASED, PURCHASE_STATUS.INBOUNDING, PURCHASE_STATUS.INBOUNDED].includes(Number(order.status))) {
      return res.json(Response.error('当前状态不允许关闭'));
    }
    await pool.execute('UPDATE purchase_order SET status = ?, close_time = NOW() WHERE id = ?', [PURCHASE_STATUS.CLOSED, req.params.id]);
    await pool.execute(
      'UPDATE finance_payment SET status = 3, close_time = COALESCE(close_time, NOW()) WHERE order_id = ? AND status <> 2',
      [req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '采购管理', '关闭采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/reject', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (Number(order.status) !== PURCHASE_STATUS.PENDING_AUDIT) return res.json(Response.error('仅待审核订单允许拒绝'));
    await pool.execute('UPDATE purchase_order SET status = ?, auditor_id = ?, audit_time = NOW() WHERE id = ?', [PURCHASE_STATUS.REJECTED, req.user.id, req.params.id]);
    await writeSystemLog(pool, req.user.id, '采购管理', '拒绝采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/start-purchase', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (Number(order.status) !== PURCHASE_STATUS.AUDITED) return res.json(Response.error('仅已审核订单允许开始采购'));
    await pool.execute('UPDATE purchase_order SET status = ?, purchase_start_time = NOW() WHERE id = ?', [PURCHASE_STATUS.PURCHASING, req.params.id]);
    await writeSystemLog(pool, req.user.id, '采购管理', '开始采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/confirm-purchased', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) throw new Error('订单不存在');
    if (Number(order.status) !== PURCHASE_STATUS.PURCHASING) throw new Error('仅采购中订单允许已采确认');

    const { payment_method = '', admin_remark = '', purchase_remark = '' } = req.body;
    let totalAmount = 0;
    for (const item of (req.body.items || [])) {
      const finalQuantity = Number(item.final_quantity || item.quantity || 0);
      const finalPrice = Number(item.final_price || item.price || 0);
      const finalTax = Number(item.final_tax || 0);
      const finalAmount = Number(item.final_amount ?? (finalQuantity * finalPrice + finalTax));
      totalAmount += finalAmount;
      await conn.execute(
        `UPDATE purchase_order_item
         SET final_quantity = ?, final_price = ?, final_tax = ?, final_amount = ?, final_remark = ?
         WHERE id = ? AND order_id = ?`,
        [finalQuantity, finalPrice, finalTax, finalAmount, item.final_remark || item.remark || '', item.id, order.id]
      );
    }

    await conn.execute(
      `UPDATE purchase_order
       SET status = ?, payment_method = ?, admin_remark = ?, purchase_remark = ?, total_amount = ?, purchase_completed_time = NOW()
       WHERE id = ?`,
      [PURCHASE_STATUS.PURCHASED, payment_method, admin_remark, purchase_remark, totalAmount || order.total_amount, order.id]
    );
    await conn.execute(
      'UPDATE finance_payment SET should_amount = ?, pay_method = ?, remark = ? WHERE order_id = ?',
      [totalAmount || order.total_amount, payment_method, purchase_remark || admin_remark || '', order.id]
    );
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '采购已采确认', order.order_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/start-inbound', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('订单不存在'));
    if (Number(order.status) !== PURCHASE_STATUS.PURCHASED) return res.json(Response.error('仅已采购订单允许开始入库'));
    await pool.execute('UPDATE purchase_order SET status = ?, inbound_start_time = NOW() WHERE id = ?', [PURCHASE_STATUS.INBOUNDING, req.params.id]);
    await writeSystemLog(pool, req.user.id, '采购管理', '开始采购入库', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/complete-inbound', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await completePurchaseInbound(conn, req.params.id, req.user.id);
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '完成采购入库', result.order_no);
    res.json(Response.success({ inbound_id: result.inbound_id, inbound_no: result.inbound_no }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/inbound', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [orderRows] = await conn.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = orderRows[0];
    if (!order) throw new Error('订单不存在');
    if (![PURCHASE_STATUS.PURCHASED, PURCHASE_STATUS.INBOUNDING, PURCHASE_STATUS.INBOUNDED].includes(Number(order.status))) {
      throw new Error('当前状态不允许入库');
    }

    const { warehouse_id, inbound_status = 0, remark = '', items = [] } = req.body;
    const inboundItems = items.filter(item => Number(item.inbound_quantity || 0) > 0);
    if (!warehouse_id) throw new Error('仓库不能为空');
    if (!inboundItems.length) throw new Error('入库明细不能为空');

    const remainingMap = await getPurchaseRemainingMap(conn, order.id);
    const usageMap = new Map();
    for (const item of inboundItems) {
      const productId = Number(item.product_id || 0);
      const quantity = Number(item.inbound_quantity || 0);
      const remaining = Number(remainingMap.get(productId)?.remaining_quantity || 0);
      if (!remainingMap.has(productId)) throw new Error(`产品ID ${productId} 不在采购单中`);
      const usedQuantity = Number(usageMap.get(productId) || 0) + quantity;
      if (usedQuantity > remaining) throw new Error(`产品ID ${productId} 入库数量超过剩余数量，剩余 ${remaining}`);
      usageMap.set(productId, usedQuantity);
    }

    let totalAmount = 0;
    const tempNo = await generateTempBizNo(conn, 'purchase_inbound', 'inbound_no', 'TMP-PE');
    const [result] = await conn.execute(
      `INSERT INTO purchase_inbound (inbound_no, order_id, warehouse_id, supplier_id, total_amount, status, remark, completed_time, creator_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [tempNo, order.id, warehouse_id, order.supplier_id, 0, Number(inbound_status), remark, Number(inbound_status) === 1 ? new Date() : null, req.user.id]
    );
    const inboundId = result.insertId;
    const inboundNo = await generateIdBizNo(conn, 'purchase_inbound', 'inbound_no', 'PE', inboundId);
    await conn.execute('UPDATE purchase_inbound SET inbound_no = ? WHERE id = ?', [inboundNo, inboundId]);

    for (const item of inboundItems) {
      const quantity = Number(item.inbound_quantity || 0);
      const price = Number(item.price || 0);
      const amount = Number((quantity * price).toFixed(2));
      totalAmount += amount;
      await conn.execute(
        'INSERT INTO purchase_inbound_item (inbound_id, product_id, quantity, price, amount, location, remark) VALUES (?,?,?,?,?,?,?)',
        [inboundId, item.product_id, quantity, price, amount, item.location || '', item.remark || '']
      );
      if (Number(inbound_status) === 1) {
        await updateStock(conn, item.product_id, warehouse_id, quantity, 'purchase_inbound', inboundNo);
      }
    }

    await conn.execute('UPDATE purchase_inbound SET total_amount = ? WHERE id = ?', [totalAmount, inboundId]);
    const hasRemainingAfter = Array.from(remainingMap.entries()).some(([productId, stats]) => {
      const used = Number(usageMap.get(productId) || 0);
      return Number(stats.remaining_quantity || 0) - used > 0;
    });
    if (Number(inbound_status) === 1 && !hasRemainingAfter) {
      await conn.execute(
        'UPDATE purchase_order SET status = ?, inbound_start_time = COALESCE(inbound_start_time, NOW()), completed_time = NOW() WHERE id = ?',
        [PURCHASE_STATUS.INBOUNDED, order.id]
      );
    } else {
      await conn.execute(
        'UPDATE purchase_order SET status = ?, inbound_start_time = COALESCE(inbound_start_time, NOW()) WHERE id = ?',
        [PURCHASE_STATUS.INBOUNDING, order.id]
      );
    }

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '采购单入库', inboundNo);
    res.json(Response.success({ id: inboundId, inbound_no: inboundNo }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/return', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [orderRows] = await conn.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = orderRows[0];
    if (!order) throw new Error('订单不存在');
    if (![PURCHASE_STATUS.PURCHASED, PURCHASE_STATUS.INBOUNDING, PURCHASE_STATUS.INBOUNDED].includes(Number(order.status))) {
      throw new Error('当前状态不允许退单');
    }

    const {
      return_status = 0,
      express_name = '',
      express_no = '',
      contact = '',
      phone = '',
      address = '',
      remark = '',
      items = []
    } = req.body;
    const returnItems = items.filter(item => Number(item.return_quantity || 0) > 0 || Number(item.return_amount || 0) > 0);
    if (!returnItems.length) throw new Error('退单明细不能为空');

    const remainingMap = await getPurchaseRemainingMap(conn, order.id);
    const returnUsageMap = new Map();
    for (const item of returnItems) {
      const productId = Number(item.product_id || 0);
      const quantity = Number(item.return_quantity || 0);
      const remaining = Number(remainingMap.get(productId)?.remaining_quantity || 0);
      if (!remainingMap.has(productId)) throw new Error(`产品ID ${productId} 不在采购单中`);
      const usedQuantity = Number(returnUsageMap.get(productId) || 0) + quantity;
      if (usedQuantity > remaining) throw new Error(`产品ID ${productId} 退货数量超过剩余数量，剩余 ${remaining}`);
      returnUsageMap.set(productId, usedQuantity);
    }

    const tempNo = await generateTempBizNo(conn, 'purchase_return', 'return_no', 'TMP-PR');
    const [result] = await conn.execute(
      `INSERT INTO purchase_return (return_no, inbound_id, order_id, supplier_id, total_amount, status, express_name, express_no, contact, phone, address, reason, completed_time, creator_id)
       VALUES (?,0,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tempNo, order.id, order.supplier_id, 0, Number(return_status), express_name, express_no, contact, phone, address, remark, Number(return_status) === 1 ? new Date() : null, req.user.id]
    );
    const returnId = result.insertId;
    const returnNo = await generateIdBizNo(conn, 'purchase_return', 'return_no', 'PR', returnId);
    await conn.execute('UPDATE purchase_return SET return_no = ? WHERE id = ?', [returnNo, returnId]);

    let totalAmount = 0;
    for (const item of returnItems) {
      const quantity = Number(item.return_quantity || 0);
      const amount = Number(item.return_amount ?? (quantity * Number(item.price || 0)));
      totalAmount += amount;
      await conn.execute(
        'INSERT INTO purchase_return_item (return_id, product_id, quantity, price, amount, remark) VALUES (?,?,?,?,?,?)',
        [returnId, item.product_id, quantity, item.price || 0, amount, item.remark || '']
      );
    }

    await conn.execute('UPDATE purchase_return SET total_amount = ? WHERE id = ?', [totalAmount, returnId]);
    if (Number(return_status) === 1) {
      await closePurchaseOrderIfFullyReturned(conn, order.id, { includeInbounded: true });
    }
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '采购单退单', returnNo);
    res.json(Response.success({ id: returnId, return_no: returnNo }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 审核采购订单 ====================

router.post('/order/:id/audit', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await approvePurchaseOrder(conn, req.params.id, req.user.id);

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '审核采购订单', result.order_no);
    res.json(Response.success({ inbound_id: result.inbound_id, inbound_no: result.inbound_no }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 采购入库单列表 ====================

router.get('/inbound', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', supplier_id = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (pi.inbound_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (supplier_id) { where += ' AND pi.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM purchase_inbound pi LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT pi.*, po.order_no, sc.name AS supplier_name, sc.contact, sc.phone AS mobile_phone,
              '' AS telephone, sc.email, w.name AS warehouse_name, u.real_name AS creator_name,
              COALESCE(item_stats.unit_price, 0) AS unit_price,
              0 AS tax_amount,
              pi.total_amount AS total_price,
              COALESCE(item_stats.inbound_total_quantity, 0) AS inbound_total_quantity
       FROM purchase_inbound pi
       LEFT JOIN purchase_order po ON pi.order_id = po.id
       LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id
       LEFT JOIN warehouse w ON pi.warehouse_id = w.id
       LEFT JOIN sys_user u ON pi.creator_id = u.id
       LEFT JOIN (
         SELECT inbound_id, AVG(price) AS unit_price, SUM(quantity) AS inbound_total_quantity
         FROM purchase_inbound_item
         GROUP BY inbound_id
       ) item_stats ON pi.id = item_stats.inbound_id
       WHERE ${where} ORDER BY pi.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/inbound/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT pi.*, po.order_no, sc.name AS supplier_name, sc.contact, sc.phone AS mobile_phone,
              '' AS telephone, sc.email, w.name AS warehouse_name
       FROM purchase_inbound pi
       LEFT JOIN purchase_order po ON pi.order_id = po.id
       LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id
       LEFT JOIN warehouse w ON pi.warehouse_id = w.id
       WHERE pi.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('入库单不存在'));
    const inbound = rows[0];
    const [items] = await pool.execute(
      `SELECT pii.*, p.name AS product_name, p.code, p.spec
       FROM purchase_inbound_item pii
       LEFT JOIN product p ON pii.product_id = p.id
       WHERE pii.inbound_id = ?`, [inbound.id]
    );
    inbound.items = items;
    res.json(Response.success(inbound));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/inbound/:id/complete', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM purchase_inbound WHERE id = ?', [req.params.id]);
    const inbound = rows[0];
    if (!inbound) throw new Error('入库单不存在');
    if (Number(inbound.status) !== 0) throw new Error('仅待入库单允许入库');

    const [items] = await conn.execute('SELECT * FROM purchase_inbound_item WHERE inbound_id = ?', [inbound.id]);
    if (!items.length) throw new Error('入库明细不能为空');
    for (const item of items) {
      await updateStock(conn, item.product_id, inbound.warehouse_id, item.quantity, 'purchase_inbound', inbound.inbound_no);
    }

    await conn.execute('UPDATE purchase_inbound SET status = 1, completed_time = NOW() WHERE id = ?', [inbound.id]);

    const remainingMap = await getPurchaseRemainingMap(conn, inbound.order_id);
    const hasRemaining = Array.from(remainingMap.values()).some(stats => Number(stats.remaining_quantity || 0) > 0);
    const [pendingRows] = await conn.execute(
      'SELECT id FROM purchase_inbound WHERE order_id = ? AND status = 0 LIMIT 1',
      [inbound.order_id]
    );
    const hasPendingInbound = pendingRows.length > 0;
    await conn.execute(
      `UPDATE purchase_order
       SET status = ?, inbound_start_time = COALESCE(inbound_start_time, NOW()), completed_time = ?
       WHERE id = ?`,
      [hasRemaining || hasPendingInbound ? PURCHASE_STATUS.INBOUNDING : PURCHASE_STATUS.INBOUNDED, hasRemaining || hasPendingInbound ? null : new Date(), inbound.order_id]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '采购入库单入库', inbound.inbound_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 采购退货 ====================

router.get('/return', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', supplier_id = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (pr.return_no LIKE ? OR po.order_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (supplier_id) { where += ' AND pr.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (start_date) { where += ' AND pr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM purchase_return pr
       LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
       LEFT JOIN purchase_order po ON COALESCE(NULLIF(pr.order_id, 0), pi.order_id) = po.id
       LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id
       WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT pr.*, po.order_no, sc.name AS supplier_name, u.real_name AS creator_name,
              COALESCE(pr.contact, sc.contact) AS contact,
              COALESCE(NULLIF(pr.phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(pr.address, ''), sc.address) AS address,
              pr.total_amount AS refund_total_amount,
              COALESCE(item_stats.refund_total_quantity, 0) AS refund_total_quantity,
              COALESCE(item_stats.unit_price, 0) AS unit_price,
              0 AS tax_amount,
              pr.total_amount AS total_price
       FROM purchase_return pr
       LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
       LEFT JOIN purchase_order po ON COALESCE(NULLIF(pr.order_id, 0), pi.order_id) = po.id
       LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id
       LEFT JOIN sys_user u ON pr.creator_id = u.id
       LEFT JOIN (
         SELECT return_id, AVG(price) AS unit_price, SUM(quantity) AS refund_total_quantity
         FROM purchase_return_item
         GROUP BY return_id
       ) item_stats ON pr.id = item_stats.return_id
       WHERE ${where} ORDER BY pr.id DESC LIMIT ?, ?`,
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
      `SELECT pr.*, po.order_no, sc.name AS supplier_name,
              COALESCE(pr.contact, sc.contact) AS contact,
              COALESCE(NULLIF(pr.phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(pr.address, ''), sc.address) AS address
       FROM purchase_return pr
       LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
       LEFT JOIN purchase_order po ON COALESCE(NULLIF(pr.order_id, 0), pi.order_id) = po.id
       LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id
       WHERE pr.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('退货单不存在'));
    const ret = rows[0];
    const [items] = await pool.execute(
      `SELECT pri.*, p.name AS product_name, p.code, p.spec
       FROM purchase_return_item pri
       LEFT JOIN product p ON pri.product_id = p.id
       WHERE pri.return_id = ?`, [ret.id]
    );
    ret.items = items;
    res.json(Response.success(ret));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/return/:id/complete', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM purchase_return WHERE id = ?', [req.params.id]);
    const ret = rows[0];
    if (!ret) throw new Error('退货单不存在');
    if (Number(ret.status) !== 0) throw new Error('仅待退货单允许退货');

    const [items] = await conn.execute('SELECT * FROM purchase_return_item WHERE return_id = ?', [ret.id]);
    if (!items.length) throw new Error('退货明细不能为空');

    const { express_name = '', express_no = '', remark = '' } = req.body || {};
    if (String(remark || '').length > 200) throw new Error('备注最多200个字');

    if (Number(ret.inbound_id || 0) > 0) {
      const [inboundRows] = await conn.execute('SELECT warehouse_id FROM purchase_inbound WHERE id = ?', [ret.inbound_id]);
      if (!inboundRows.length) throw new Error('关联入库单不存在');
      for (const item of items) {
        await updateStock(conn, item.product_id, inboundRows[0].warehouse_id, -Number(item.quantity || 0), 'purchase_return', ret.return_no);
      }
    }

    await conn.execute(
      'UPDATE purchase_return SET status = 1, express_name = ?, express_no = ?, reason = ?, completed_time = NOW() WHERE id = ?',
      [express_name, express_no, remark, ret.id]
    );

    const orderId = await getPurchaseReturnOrderId(conn, ret);
    if (orderId) {
      await closePurchaseOrderIfFullyReturned(conn, orderId, { includeInbounded: Number(ret.order_id || 0) > 0 });
    }

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '采购退货单退货', ret.return_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/return', async (req, res) => {
  try {
    const pool = getPool();
    const { inbound_id, supplier_id, items, reason = '' } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const returnNo = await generateNo(pool, 'CT');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO purchase_return (return_no, inbound_id, supplier_id, total_amount, status, reason, completed_time, creator_id)
         VALUES (?,?,?,?,1,?,NOW(),?)`,
        [returnNo, inbound_id || 0, supplier_id, totalAmount, reason, req.user.id]
      );
      const returnId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO purchase_return_item (return_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
          [returnId, item.product_id, item.quantity, item.price, (item.quantity || 0) * (item.price || 0)]
        );
        // 减少库存
        const [inboundRows] = await conn.execute('SELECT warehouse_id FROM purchase_inbound WHERE id = ?', [inbound_id || 0]);
        if (inboundRows.length) {
          await updateStock(conn, item.product_id, inboundRows[0].warehouse_id, -item.quantity, 'purchase_return', returnNo);
        }
      }

      const orderId = await getPurchaseReturnOrderId(conn, { order_id: 0, inbound_id: inbound_id || 0 });
      if (orderId) {
        await closePurchaseOrderIfFullyReturned(conn, orderId, { includeInbounded: false });
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '采购管理', '新增采购退货单', returnNo);
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

async function getPurchaseRemainingMap(conn, orderId) {
  const [rows] = await conn.execute(
    `SELECT poi.product_id,
            COALESCE(poi.final_quantity, poi.quantity) AS final_quantity,
            COALESCE(inbound_item_stats.inbound_quantity, 0) AS inbounded_quantity,
            COALESCE(return_item_stats.return_quantity, 0) AS returned_quantity
     FROM purchase_order_item poi
     LEFT JOIN (
       SELECT pi.order_id, pii.product_id, SUM(pii.quantity) AS inbound_quantity
       FROM purchase_inbound_item pii
       LEFT JOIN purchase_inbound pi ON pii.inbound_id = pi.id
       GROUP BY pi.order_id, pii.product_id
     ) inbound_item_stats ON poi.order_id = inbound_item_stats.order_id AND poi.product_id = inbound_item_stats.product_id
     LEFT JOIN (
       SELECT COALESCE(NULLIF(pr.order_id, 0), pi.order_id) AS order_id, pri.product_id, SUM(pri.quantity) AS return_quantity
       FROM purchase_return_item pri
       LEFT JOIN purchase_return pr ON pri.return_id = pr.id
       LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
       GROUP BY COALESCE(NULLIF(pr.order_id, 0), pi.order_id), pri.product_id
     ) return_item_stats ON poi.order_id = return_item_stats.order_id AND poi.product_id = return_item_stats.product_id
     WHERE poi.order_id = ?`,
    [orderId]
  );
  const map = new Map();
  rows.forEach(row => {
    const productId = Number(row.product_id || 0);
    const finalQuantity = Number(row.final_quantity || 0);
    const inboundedQuantity = Number(row.inbounded_quantity || 0);
    const returnedQuantity = Number(row.returned_quantity || 0);
    map.set(productId, {
      final_quantity: finalQuantity,
      inbounded_quantity: inboundedQuantity,
      returned_quantity: returnedQuantity,
      remaining_quantity: Math.max(finalQuantity - inboundedQuantity - returnedQuantity, 0)
    });
  });
  return map;
}

async function getPurchaseReturnOrderId(conn, ret) {
  if (Number(ret.order_id || 0) > 0) return Number(ret.order_id);
  if (Number(ret.inbound_id || 0) <= 0) return 0;
  const [rows] = await conn.execute('SELECT order_id FROM purchase_inbound WHERE id = ?', [ret.inbound_id]);
  return Number(rows[0]?.order_id || 0);
}

async function closePurchaseOrderIfFullyReturned(conn, orderId, options = {}) {
  const allReturned = await isPurchaseOrderFullyReturned(conn, orderId, options);
  if (!allReturned) return false;
  await conn.execute(
    'UPDATE purchase_order SET status = ?, close_time = COALESCE(close_time, NOW()) WHERE id = ?',
    [PURCHASE_STATUS.CLOSED, orderId]
  );
  await conn.execute(
    'UPDATE finance_payment SET status = 3, close_time = COALESCE(close_time, NOW()) WHERE order_id = ? AND status <> 2',
    [orderId]
  );
  return true;
}

async function isPurchaseOrderFullyReturned(conn, orderId, options = {}) {
  const includeInbounded = Boolean(options.includeInbounded);
  const [rows] = await conn.execute(
    `SELECT poi.product_id,
            COALESCE(poi.final_quantity, poi.quantity) AS final_quantity,
            COALESCE(inbound_item_stats.inbound_quantity, 0) AS inbounded_quantity,
            COALESCE(return_item_stats.return_quantity, 0) AS returned_quantity
     FROM purchase_order_item poi
     LEFT JOIN (
       SELECT pi.order_id, pii.product_id, SUM(pii.quantity) AS inbound_quantity
       FROM purchase_inbound_item pii
       LEFT JOIN purchase_inbound pi ON pii.inbound_id = pi.id
       WHERE pi.status = 1
       GROUP BY pi.order_id, pii.product_id
     ) inbound_item_stats ON poi.order_id = inbound_item_stats.order_id AND poi.product_id = inbound_item_stats.product_id
     LEFT JOIN (
       SELECT COALESCE(NULLIF(pr.order_id, 0), pi.order_id) AS order_id, pri.product_id, SUM(pri.quantity) AS return_quantity
       FROM purchase_return_item pri
       LEFT JOIN purchase_return pr ON pri.return_id = pr.id
       LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
       WHERE pr.status = 1
       GROUP BY COALESCE(NULLIF(pr.order_id, 0), pi.order_id), pri.product_id
     ) return_item_stats ON poi.order_id = return_item_stats.order_id AND poi.product_id = return_item_stats.product_id
     WHERE poi.order_id = ?`,
    [orderId]
  );
  return rows.length > 0 && rows.every(row => {
    const finalQuantity = Number(row.final_quantity || 0);
    const inboundedQuantity = includeInbounded ? Number(row.inbounded_quantity || 0) : 0;
    const returnedQuantity = Number(row.returned_quantity || 0);
    return inboundedQuantity + returnedQuantity >= finalQuantity;
  });
}

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

async function approvePurchaseOrder(conn, orderId, userId) {
  const [orderRows] = await conn.execute('SELECT * FROM purchase_order WHERE id = ?', [orderId]);
  const order = orderRows[0];
  if (!order) throw new Error('订单不存在');
  if (Number(order.status) !== PURCHASE_STATUS.PENDING_AUDIT) throw new Error('仅待审核订单允许审核');

  await conn.execute(
    'UPDATE purchase_order SET status = ?, auditor_id = ?, audit_time = NOW() WHERE id = ?',
    [PURCHASE_STATUS.AUDITED, userId, order.id]
  );

  return { order_no: order.order_no };
}

async function completePurchaseInbound(conn, orderId, userId) {
  const [orderRows] = await conn.execute('SELECT * FROM purchase_order WHERE id = ?', [orderId]);
  const order = orderRows[0];
  if (!order) throw new Error('订单不存在');
  if (![PURCHASE_STATUS.PURCHASED, PURCHASE_STATUS.INBOUNDING].includes(Number(order.status))) throw new Error('当前状态不允许入库');

  const [existingRows] = await conn.execute('SELECT id, inbound_no FROM purchase_inbound WHERE order_id = ? LIMIT 1', [order.id]);
  if (existingRows.length) throw new Error('该采购单已生成入库单');

  const [itemRows] = await conn.execute('SELECT * FROM purchase_order_item WHERE order_id = ?', [order.id]);
  if (!itemRows.length) throw new Error('订单明细不能为空');

  const tempNo = await generateTempBizNo(conn, 'purchase_inbound', 'inbound_no', 'TMP-PE');
  const totalAmount = itemRows.reduce((sum, item) => sum + Number(item.final_amount ?? item.amount ?? 0), 0);
  const [result] = await conn.execute(
    `INSERT INTO purchase_inbound (inbound_no, order_id, warehouse_id, supplier_id, total_amount, status, completed_time, creator_id)
     VALUES (?,?,?,?,?,1,NOW(),?)`,
    [tempNo, order.id, order.warehouse_id, order.supplier_id, totalAmount, userId]
  );
  const inboundId = result.insertId;
  const inboundNo = await generateIdBizNo(conn, 'purchase_inbound', 'inbound_no', 'PE', inboundId);
  await conn.execute('UPDATE purchase_inbound SET inbound_no = ? WHERE id = ?', [inboundNo, inboundId]);

  for (const item of itemRows) {
    const quantity = Number(item.final_quantity ?? item.quantity ?? 0);
    const price = Number(item.final_price ?? item.price ?? 0);
    const amount = Number(item.final_amount ?? (quantity * price + Number(item.final_tax || 0)));
    await conn.execute(
      'INSERT INTO purchase_inbound_item (inbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
      [inboundId, item.product_id, quantity, price, amount]
    );
    await updateStock(conn, item.product_id, order.warehouse_id, quantity, 'purchase_inbound', inboundNo);
  }

  await conn.execute(
    `UPDATE purchase_order
     SET status = ?, total_amount = ?, inbound_start_time = COALESCE(inbound_start_time, NOW()), completed_time = NOW()
     WHERE id = ?`,
    [PURCHASE_STATUS.INBOUNDED, totalAmount, order.id]
  );

  return { order_no: order.order_no, inbound_id: inboundId, inbound_no: inboundNo };
}

async function generateTempOrderNo(conn) {
  for (let i = 0; i < 20; i += 1) {
    const no = `TMP-P-${Date.now()}-${randomChars(6)}`;
    const [rows] = await conn.execute('SELECT id FROM purchase_order WHERE order_no = ? LIMIT 1', [no]);
    if (!rows.length) return no;
  }
  return `TMP-P-${Date.now()}-${randomChars(8)}`;
}

async function generatePurchaseOrderNo(conn, orderId) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  for (let i = 0; i < 20; i += 1) {
    const no = `P${date}${time}${orderId}${randomChars(6)}`;
    const [rows] = await conn.execute('SELECT id FROM purchase_order WHERE order_no = ? AND id <> ? LIMIT 1', [no, orderId]);
    if (!rows.length) return no;
  }
  return `P${date}${time}${orderId}${randomChars(6)}${Date.now().toString(36).slice(-2)}`;
}

async function generateTempBizNo(conn, table, column, prefix) {
  for (let i = 0; i < 20; i += 1) {
    const no = `${prefix}-${Date.now()}-${randomChars(6)}`;
    const [rows] = await conn.execute(`SELECT id FROM ${table} WHERE ${column} = ? LIMIT 1`, [no]);
    if (!rows.length) return no;
  }
  return `${prefix}-${Date.now()}-${randomChars(8)}`;
}

async function generateIdBizNo(conn, table, column, prefix, id) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  for (let i = 0; i < 20; i += 1) {
    const no = `${prefix}${date}${time}${id}${randomChars(6)}`;
    const [rows] = await conn.execute(`SELECT id FROM ${table} WHERE ${column} = ? AND id <> ? LIMIT 1`, [no, id]);
    if (!rows.length) return no;
  }
  return `${prefix}${date}${time}${id}${randomChars(6)}${Date.now().toString(36).slice(-2)}`;
}

function randomChars(length) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }
  return text;
}

async function generateNo(poolOrConn, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tableMap = {
    'CG': { table: 'purchase_order', col: 'order_no' },
    'RK': { table: 'purchase_inbound', col: 'inbound_no' },
    'CT': { table: 'purchase_return', col: 'return_no' }
  };
  const mapping = tableMap[prefix] || { table: 'purchase_order', col: 'order_no' };
  const [rows] = await poolOrConn.execute(
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
