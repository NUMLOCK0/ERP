const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// ==================== 销售订单 ====================

// 订单列表
router.get('/order', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', status, start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (so.order_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status !== undefined && status !== '') { where += ' AND so.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND so.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND so.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM sale_order so LEFT JOIN supplier_customer sc ON so.customer_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT so.*, sc.name AS customer_name, w.name AS warehouse_name, u.real_name AS creator_name FROM sale_order so LEFT JOIN supplier_customer sc ON so.customer_id = sc.id LEFT JOIN warehouse w ON so.warehouse_id = w.id LEFT JOIN sys_user u ON so.creator_id = u.id WHERE ${where} ORDER BY so.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 订单详情
router.get('/order/:id', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare(`SELECT so.*, sc.name AS customer_name, w.name AS warehouse_name FROM sale_order so LEFT JOIN supplier_customer sc ON so.customer_id = sc.id LEFT JOIN warehouse w ON so.warehouse_id = w.id WHERE so.id = ?`).get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    const items = db.prepare(`SELECT soi.*, p.name AS product_name, p.code AS product_code, p.spec AS product_spec FROM sale_order_item soi LEFT JOIN product p ON soi.product_id = p.id WHERE soi.order_id = ?`).all(req.params.id);
    res.json(Response.success({ order, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增订单
router.post('/order', (req, res) => {
  try {
    const db = getDatabase();
    const { customer_id, warehouse_id, items } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const orderNo = generateNo(db, 'XS');

    const createOrder = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const result = db.prepare(`INSERT INTO sale_order (order_no, customer_id, warehouse_id, total_amount, status, creator_id) VALUES (?,?,?,?,0,?)`).run(orderNo, customer_id, warehouse_id, totalAmount, req.user.id);
      const orderId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO sale_order_item (order_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(orderId, item.product_id, qty, price, price * qty);
      });

      return orderId;
    });

    const orderId = createOrder();
    writeSystemLog(db, req.user.id, '销售管理', '新增销售订单', orderNo);
    res.json(Response.success({ id: orderId, order_no: orderNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑订单（仅草稿状态）
router.put('/order/:id', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM sale_order WHERE id = ?').get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    if (order.status !== 0) return res.json(Response.error('仅草稿状态可编辑'));

    const { customer_id, warehouse_id, items } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const updateOrder = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });
      db.prepare(`UPDATE sale_order SET customer_id=?, warehouse_id=?, total_amount=?, updated_at=datetime('now','localtime') WHERE id=?`).run(customer_id, warehouse_id, totalAmount, req.params.id);
      db.prepare('DELETE FROM sale_order_item WHERE order_id = ?').run(req.params.id);
      const insertItem = db.prepare('INSERT INTO sale_order_item (order_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(req.params.id, item.product_id, qty, price, price * qty);
      });
    });

    updateOrder();
    writeSystemLog(db, req.user.id, '销售管理', '编辑销售订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 审核
router.put('/order/:id/audit', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM sale_order WHERE id = ?').get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    if (order.status !== 0) return res.json(Response.error('订单状态不允许审核'));
    db.prepare(`UPDATE sale_order SET status=1, auditor_id=?, audit_time=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?`).run(req.user.id, req.params.id);
    writeSystemLog(db, req.user.id, '销售管理', '审核销售订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除
router.delete('/order/:id', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM sale_order WHERE id = ?').get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    if (order.status !== 0) return res.json(Response.error('仅草稿状态可删除'));
    db.prepare('DELETE FROM sale_order_item WHERE order_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sale_order WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '销售管理', '删除销售订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售发货单 ====================

router.get('/delivery', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (sd.delivery_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM sale_delivery sd LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT sd.*, sc.name AS customer_name, w.name AS warehouse_name, so.order_no FROM sale_delivery sd LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id LEFT JOIN warehouse w ON sd.warehouse_id = w.id LEFT JOIN sale_order so ON sd.order_id = so.id WHERE ${where} ORDER BY sd.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/delivery/:id', (req, res) => {
  try {
    const db = getDatabase();
    const delivery = db.prepare(`SELECT sd.*, sc.name AS customer_name, w.name AS warehouse_name, so.order_no FROM sale_delivery sd LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id LEFT JOIN warehouse w ON sd.warehouse_id = w.id LEFT JOIN sale_order so ON sd.order_id = so.id WHERE sd.id = ?`).get(req.params.id);
    if (!delivery) return res.json(Response.error('发货单不存在'));
    const items = db.prepare(`SELECT sdi.*, p.name AS product_name FROM sale_delivery_item sdi LEFT JOIN product p ON sdi.product_id = p.id WHERE sdi.delivery_id = ?`).all(req.params.id);
    res.json(Response.success({ delivery, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增发货单
router.post('/delivery', (req, res) => {
  try {
    const db = getDatabase();
    const { order_id, warehouse_id, logistics_company = '', logistics_no = '', items } = req.body;
    if (!order_id) return res.json(Response.error('销售订单不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const order = db.prepare('SELECT * FROM sale_order WHERE id = ?').get(order_id);
    if (!order) return res.json(Response.error('销售订单不存在'));
    if (order.status !== 1) return res.json(Response.error('订单未审核，无法发货'));

    const deliveryNo = generateNo(db, 'FH');

    const createDelivery = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const whId = warehouse_id || order.warehouse_id;
      const result = db.prepare(`INSERT INTO sale_delivery (delivery_no, order_id, customer_id, warehouse_id, total_amount, status, logistics_company, logistics_no, creator_id) VALUES (?,?,?,?,?,1,?,?,?)`).run(deliveryNo, order_id, order.customer_id, whId, totalAmount, logistics_company, logistics_no, req.user.id);
      const deliveryId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO sale_delivery_item (delivery_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(deliveryId, item.product_id, qty, price, price * qty);
        // 减少库存
        updateStock(db, item.product_id, whId, -qty, 'sale_delivery', deliveryNo);
      });

      db.prepare(`UPDATE sale_order SET status=2, updated_at=datetime('now','localtime') WHERE id=?`).run(order_id);
      return deliveryId;
    });

    const deliveryId = createDelivery();
    writeSystemLog(db, req.user.id, '销售管理', '销售发货', deliveryNo);
    res.json(Response.success({ id: deliveryId, delivery_no: deliveryNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售退货单 ====================

router.get('/return', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (sr.return_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM sale_return sr LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT sr.*, sc.name AS customer_name FROM sale_return sr LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id WHERE ${where} ORDER BY sr.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/return/:id', (req, res) => {
  try {
    const db = getDatabase();
    const ret = db.prepare(`SELECT sr.*, sc.name AS customer_name FROM sale_return sr LEFT JOIN supplier_customer sc ON sr.customer_id = sc.id WHERE sr.id = ?`).get(req.params.id);
    if (!ret) return res.json(Response.error('退货单不存在'));
    const items = db.prepare(`SELECT sri.*, p.name AS product_name FROM sale_return_item sri LEFT JOIN product p ON sri.product_id = p.id WHERE sri.return_id = ?`).all(req.params.id);
    res.json(Response.success({ ret, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/return', (req, res) => {
  try {
    const db = getDatabase();
    const { delivery_id, customer_id, reason = '', items } = req.body;
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const returnNo = generateNo(db, 'XT');

    const createReturn = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const result = db.prepare(`INSERT INTO sale_return (return_no, delivery_id, customer_id, total_amount, status, reason, creator_id) VALUES (?,?,?,?,1,?,?)`).run(returnNo, delivery_id || 0, customer_id || 0, totalAmount, reason, req.user.id);
      const returnId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO sale_return_item (return_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(returnId, item.product_id, qty, price, price * qty);
        // 增加库存
        const whId = db.prepare('SELECT warehouse_id FROM sale_delivery WHERE id = ?').get(delivery_id || 0);
        if (whId) updateStock(db, item.product_id, whId.warehouse_id, qty, 'sale_return', returnNo);
      });

      return returnId;
    });

    const returnId = createReturn();
    writeSystemLog(db, req.user.id, '销售管理', '销售退货', returnNo);
    res.json(Response.success({ id: returnId, return_no: returnNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 工具函数 ====================

function generateNo(db, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const todayPattern = `${prefix}-${dateStr}-%`;
  let tableName = 'sale_order';
  let colName = 'order_no';
  if (prefix === 'FH') { tableName = 'sale_delivery'; colName = 'delivery_no'; }
  if (prefix === 'XT') { tableName = 'sale_return'; colName = 'return_no'; }
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${tableName} WHERE ${colName} LIKE ?`).get(todayPattern);
  const seq = (row?.cnt || 0) + 1;
  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

function updateStock(db, productId, warehouseId, quantity, changeType, refNo) {
  const existing = db.prepare('SELECT * FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?').get(productId, warehouseId);
  const beforeQty = existing ? existing.quantity : 0;
  const afterQty = beforeQty + quantity;
  if (existing) {
    db.prepare("UPDATE inventory_stock SET quantity = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(afterQty, existing.id);
  } else {
    db.prepare('INSERT INTO inventory_stock (product_id, warehouse_id, quantity) VALUES (?,?,?)').run(productId, warehouseId, afterQty);
  }
  db.prepare('INSERT INTO inventory_log (product_id, warehouse_id, change_type, change_quantity, before_quantity, after_quantity, ref_no) VALUES (?,?,?,?,?,?,?)').run(productId, warehouseId, changeType, quantity, beforeQty, afterQty, refNo);
}

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
