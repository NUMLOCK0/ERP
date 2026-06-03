const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// ==================== 采购订单 ====================

// 订单列表
router.get('/order', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', status, start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (po.order_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status !== undefined && status !== '') { where += ' AND po.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND po.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND po.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM purchase_order po LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT po.*, sc.name AS supplier_name, w.name AS warehouse_name, u.real_name AS creator_name FROM purchase_order po LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id LEFT JOIN warehouse w ON po.warehouse_id = w.id LEFT JOIN sys_user u ON po.creator_id = u.id WHERE ${where} ORDER BY po.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 订单详情（含明细）
router.get('/order/:id', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare(`SELECT po.*, sc.name AS supplier_name, w.name AS warehouse_name FROM purchase_order po LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id LEFT JOIN warehouse w ON po.warehouse_id = w.id WHERE po.id = ?`).get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    const items = db.prepare(`SELECT poi.*, p.name AS product_name, p.code AS product_code, p.spec AS product_spec FROM purchase_order_item poi LEFT JOIN product p ON poi.product_id = p.id WHERE poi.order_id = ?`).all(req.params.id);
    res.json(Response.success({ order, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增订单
router.post('/order', (req, res) => {
  try {
    const db = getDatabase();
    const { supplier_id, warehouse_id, items } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const orderNo = generateNo(db, 'CG');

    const createOrder = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => {
        const price = item.price || 0;
        const qty = item.quantity || 0;
        totalAmount += price * qty;
      });

      const result = db.prepare(`INSERT INTO purchase_order (order_no, supplier_id, warehouse_id, total_amount, status, creator_id) VALUES (?,?,?,?,0,?)`).run(orderNo, supplier_id, warehouse_id, totalAmount, req.user.id);
      const orderId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO purchase_order_item (order_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(orderId, item.product_id, qty, price, price * qty);
      });

      return orderId;
    });

    const orderId = createOrder();
    writeSystemLog(db, req.user.id, '采购管理', '新增采购订单', orderNo);
    res.json(Response.success({ id: orderId, order_no: orderNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 编辑订单（仅草稿状态可编辑）
router.put('/order/:id', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM purchase_order WHERE id = ?').get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    if (order.status !== 0) return res.json(Response.error('仅草稿状态可编辑'));

    const { supplier_id, warehouse_id, items } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const updateOrder = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });
      db.prepare(`UPDATE purchase_order SET supplier_id=?, warehouse_id=?, total_amount=?, updated_at=datetime('now','localtime') WHERE id=?`).run(supplier_id, warehouse_id, totalAmount, req.params.id);
      db.prepare('DELETE FROM purchase_order_item WHERE order_id = ?').run(req.params.id);
      const insertItem = db.prepare('INSERT INTO purchase_order_item (order_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(req.params.id, item.product_id, qty, price, price * qty);
      });
    });

    updateOrder();
    writeSystemLog(db, req.user.id, '采购管理', '编辑采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 审核订单
router.put('/order/:id/audit', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM purchase_order WHERE id = ?').get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    if (order.status !== 0) return res.json(Response.error('订单状态不允许审核'));

    db.prepare(`UPDATE purchase_order SET status=1, auditor_id=?, audit_time=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?`).run(req.user.id, req.params.id);
    writeSystemLog(db, req.user.id, '采购管理', '审核采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 删除订单
router.delete('/order/:id', (req, res) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM purchase_order WHERE id = ?').get(req.params.id);
    if (!order) return res.json(Response.error('订单不存在'));
    if (order.status !== 0) return res.json(Response.error('仅草稿状态可删除'));
    db.prepare('DELETE FROM purchase_order_item WHERE order_id = ?').run(req.params.id);
    db.prepare('DELETE FROM purchase_order WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '采购管理', '删除采购订单', order.order_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购入库单 ====================

// 入库单列表
router.get('/inbound', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (pi.inbound_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM purchase_inbound pi LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT pi.*, sc.name AS supplier_name, w.name AS warehouse_name, po.order_no FROM purchase_inbound pi LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id LEFT JOIN warehouse w ON pi.warehouse_id = w.id LEFT JOIN purchase_order po ON pi.order_id = po.id WHERE ${where} ORDER BY pi.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 入库单详情
router.get('/inbound/:id', (req, res) => {
  try {
    const db = getDatabase();
    const inbound = db.prepare(`SELECT pi.*, sc.name AS supplier_name, w.name AS warehouse_name, po.order_no FROM purchase_inbound pi LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id LEFT JOIN warehouse w ON pi.warehouse_id = w.id LEFT JOIN purchase_order po ON pi.order_id = po.id WHERE pi.id = ?`).get(req.params.id);
    if (!inbound) return res.json(Response.error('入库单不存在'));
    const items = db.prepare(`SELECT pii.*, p.name AS product_name, p.code AS product_code FROM purchase_inbound_item pii LEFT JOIN product p ON pii.product_id = p.id WHERE pii.inbound_id = ?`).all(req.params.id);
    res.json(Response.success({ inbound, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增入库单（基于采购订单）
router.post('/inbound', (req, res) => {
  try {
    const db = getDatabase();
    const { order_id, warehouse_id, items } = req.body;
    if (!order_id) return res.json(Response.error('采购订单不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const order = db.prepare('SELECT * FROM purchase_order WHERE id = ?').get(order_id);
    if (!order) return res.json(Response.error('采购订单不存在'));
    if (order.status !== 1) return res.json(Response.error('订单未审核，无法入库'));

    const inboundNo = generateNo(db, 'RK');

    const createInbound = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const whId = warehouse_id || order.warehouse_id;
      const result = db.prepare(`INSERT INTO purchase_inbound (inbound_no, order_id, warehouse_id, supplier_id, total_amount, status, creator_id) VALUES (?,?,?,?,?,1,?)`).run(inboundNo, order_id, whId, order.supplier_id, totalAmount, req.user.id);
      const inboundId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO purchase_inbound_item (inbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(inboundId, item.product_id, qty, price, price * qty);
        // 更新库存
        updateStock(db, item.product_id, whId, qty, 'purchase_inbound', inboundNo);
      });

      // 更新订单状态为已入库
      db.prepare(`UPDATE purchase_order SET status=2, updated_at=datetime('now','localtime') WHERE id=?`).run(order_id);
      return inboundId;
    });

    const inboundId = createInbound();
    writeSystemLog(db, req.user.id, '采购管理', '采购入库', inboundNo);
    res.json(Response.success({ id: inboundId, inbound_no: inboundNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购退货单 ====================

// 退货单列表
router.get('/return', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (pr.return_no LIKE ? OR sc.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM purchase_return pr LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT pr.*, sc.name AS supplier_name FROM purchase_return pr LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id WHERE ${where} ORDER BY pr.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 退货单详情
router.get('/return/:id', (req, res) => {
  try {
    const db = getDatabase();
    const ret = db.prepare(`SELECT pr.*, sc.name AS supplier_name FROM purchase_return pr LEFT JOIN supplier_customer sc ON pr.supplier_id = sc.id WHERE pr.id = ?`).get(req.params.id);
    if (!ret) return res.json(Response.error('退货单不存在'));
    const items = db.prepare(`SELECT pri.*, p.name AS product_name FROM purchase_return_item pri LEFT JOIN product p ON pri.product_id = p.id WHERE pri.return_id = ?`).all(req.params.id);
    res.json(Response.success({ ret, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 新增退货单
router.post('/return', (req, res) => {
  try {
    const db = getDatabase();
    const { inbound_id, supplier_id, reason = '', items } = req.body;
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const returnNo = generateNo(db, 'CT');

    const createReturn = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const result = db.prepare(`INSERT INTO purchase_return (return_no, inbound_id, supplier_id, total_amount, status, reason, creator_id) VALUES (?,?,?,?,1,?,?)`).run(returnNo, inbound_id || 0, supplier_id || 0, totalAmount, reason, req.user.id);
      const returnId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO purchase_return_item (return_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(returnId, item.product_id, qty, price, price * qty);
        // 减少库存
        const whId = db.prepare('SELECT warehouse_id FROM purchase_inbound WHERE id = ?').get(inbound_id || 0);
        if (whId) updateStock(db, item.product_id, whId.warehouse_id, -qty, 'purchase_return', returnNo);
      });

      return returnId;
    });

    const returnId = createReturn();
    writeSystemLog(db, req.user.id, '采购管理', '采购退货', returnNo);
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
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM purchase_order WHERE order_no LIKE ?").get(todayPattern);
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
