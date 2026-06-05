const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

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
      `SELECT po.*, sc.name AS supplier_name, w.name AS warehouse_name, u.real_name AS creator_name
       FROM purchase_order po
       LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id
       LEFT JOIN warehouse w ON po.warehouse_id = w.id
       LEFT JOIN sys_user u ON po.creator_id = u.id
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
    const [rows] = await pool.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('订单不存在'));
    const order = rows[0];
    const [items] = await pool.execute(
      `SELECT poi.*, p.name AS product_name, p.code, p.spec
       FROM purchase_order_item poi
       LEFT JOIN product p ON poi.product_id = p.id
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
    const { supplier_id, warehouse_id, items } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const orderNo = await generateNo(pool, 'CG');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO purchase_order (order_no, supplier_id, warehouse_id, total_amount, status, auditor_id, creator_id)
         VALUES (?,?,?,?,?,?,?)`,
        [orderNo, supplier_id, warehouse_id, totalAmount, 0, 0, req.user.id]
      );
      const orderId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO purchase_order_item (order_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
          [orderId, item.product_id, item.quantity, item.price, (item.quantity || 0) * (item.price || 0)]
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
    const { supplier_id, warehouse_id, items } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      await conn.execute('DELETE FROM purchase_order_item WHERE order_id = ?', [req.params.id]);
      for (const item of (items || [])) {
        const amount = (item.quantity || 0) * (item.price || 0);
        totalAmount += amount;
        await conn.execute(
          'INSERT INTO purchase_order_item (order_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
          [req.params.id, item.product_id, item.quantity, item.price, amount]
        );
      }

      await conn.execute(
        'UPDATE purchase_order SET supplier_id=?, warehouse_id=?, total_amount=? WHERE id=?',
        [supplier_id, warehouse_id, totalAmount, req.params.id]
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
    if (Number(order.status) !== 0) return res.json(Response.error('仅草稿订单允许提交审核'));
    await pool.execute('UPDATE purchase_order SET status = 2 WHERE id = ?', [req.params.id]);
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
    if (![0, 2].includes(Number(order.status))) return res.json(Response.error('仅草稿或待审核订单允许取消'));
    await pool.execute('UPDATE purchase_order SET status = 3 WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '采购管理', '取消采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 审核采购订单（生成入库单 + 更新库存） ====================

router.post('/order/:id/audit', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.execute('SELECT * FROM purchase_order WHERE id = ?', [req.params.id]);
    const order = orderRows[0];
    if (!order) { await conn.rollback(); conn.release(); return res.json(Response.error('订单不存在')); }
    if (![0, 2].includes(Number(order.status))) { await conn.rollback(); conn.release(); return res.json(Response.error('订单状态不允许审核')); }

    const [itemRows] = await conn.execute('SELECT * FROM purchase_order_item WHERE order_id = ?', [order.id]);

    // 生成入库单
    const inboundNo = await generateNo(conn, 'RK');
    const [result] = await conn.execute(
      `INSERT INTO purchase_inbound (inbound_no, order_id, warehouse_id, supplier_id, total_amount, status, creator_id)
       VALUES (?,?,?,?,?,1,?)`,
      [inboundNo, order.id, order.warehouse_id, order.supplier_id, order.total_amount, req.user.id]
    );
    const inboundId = result.insertId;

    for (const item of itemRows) {
      await conn.execute(
        'INSERT INTO purchase_inbound_item (inbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
        [inboundId, item.product_id, item.quantity, item.price, item.amount]
      );
      // 更新库存
      await updateStock(conn, item.product_id, order.warehouse_id, item.quantity, 'purchase_inbound', inboundNo);
    }

    // 更新订单状态
    await conn.execute(
      'UPDATE purchase_order SET status = 1, auditor_id = ?, audit_time = NOW() WHERE id = ?',
      [req.user.id, order.id]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '采购管理', '审核采购订单', order.order_no);
    res.json(Response.success({ inbound_id: inboundId, inbound_no: inboundNo }));
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
      `SELECT pi.*, sc.name AS supplier_name, w.name AS warehouse_name, u.real_name AS creator_name
       FROM purchase_inbound pi
       LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id
       LEFT JOIN warehouse w ON pi.warehouse_id = w.id
       LEFT JOIN sys_user u ON pi.creator_id = u.id
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
    const [rows] = await pool.execute('SELECT * FROM purchase_inbound WHERE id = ?', [req.params.id]);
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

// ==================== 采购退货 ====================

router.get('/return', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', supplier_id = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (pr.return_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (supplier_id) { where += ' AND pr.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (start_date) { where += ' AND pr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM purchase_return pr LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT pr.*, sc.name AS supplier_name, u.real_name AS creator_name
       FROM purchase_return pr
       LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id
       LEFT JOIN sys_user u ON pr.creator_id = u.id
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
    const [rows] = await pool.execute('SELECT * FROM purchase_return WHERE id = ?', [req.params.id]);
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
        `INSERT INTO purchase_return (return_no, inbound_id, supplier_id, total_amount, status, reason, creator_id)
         VALUES (?,?,?,?,0,?,?)`,
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
