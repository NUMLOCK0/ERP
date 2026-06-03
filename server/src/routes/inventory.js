const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// ==================== 库存查询 ====================

router.get('/stock', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (warehouse_id) { where += ' AND ist.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_stock ist LEFT JOIN product p ON ist.product_id = p.id WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT ist.*, p.name AS product_name, p.code AS product_code, p.spec AS product_spec, w.name AS warehouse_name FROM inventory_stock ist LEFT JOIN product p ON ist.product_id = p.id LEFT JOIN warehouse w ON ist.warehouse_id = w.id WHERE ${where} ORDER BY ist.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 库存盘点 ====================

router.get('/check', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND check_no LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_check WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT ic.*, w.name AS warehouse_name, u.real_name AS creator_name FROM inventory_check ic LEFT JOIN warehouse w ON ic.warehouse_id = w.id LEFT JOIN sys_user u ON ic.creator_id = u.id WHERE ${where} ORDER BY ic.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/check/:id', (req, res) => {
  try {
    const db = getDatabase();
    const check = db.prepare(`SELECT ic.*, w.name AS warehouse_name FROM inventory_check ic LEFT JOIN warehouse w ON ic.warehouse_id = w.id WHERE ic.id = ?`).get(req.params.id);
    if (!check) return res.json(Response.error('盘点单不存在'));
    const items = db.prepare(`SELECT ici.*, p.name AS product_name, p.code AS product_code FROM inventory_check_item ici LEFT JOIN product p ON ici.product_id = p.id WHERE ici.check_id = ?`).all(req.params.id);
    res.json(Response.success({ check, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/check', (req, res) => {
  try {
    const db = getDatabase();
    const { warehouse_id, items } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const checkNo = generateNo(db, 'PD');

    const createCheck = db.transaction(() => {
      const result = db.prepare(`INSERT INTO inventory_check (check_no, warehouse_id, status, creator_id) VALUES (?,?,0,?)`).run(checkNo, warehouse_id, req.user.id);
      const checkId = result.lastInsertRowid;
      const insertItem = db.prepare('INSERT INTO inventory_check_item (check_id, product_id, book_quantity, actual_quantity, difference) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const bookQty = item.book_quantity || 0;
        const actualQty = item.actual_quantity || 0;
        insertItem.run(checkId, item.product_id, bookQty, actualQty, actualQty - bookQty);
      });
      return checkId;
    });

    const checkId = createCheck();
    writeSystemLog(db, req.user.id, '库存管理', '新增盘点单', checkNo);
    res.json(Response.success({ id: checkId, check_no: checkNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 完成盘点（更新库存差异）
router.put('/check/:id/confirm', (req, res) => {
  try {
    const db = getDatabase();
    const check = db.prepare('SELECT * FROM inventory_check WHERE id = ?').get(req.params.id);
    if (!check) return res.json(Response.error('盘点单不存在'));
    if (check.status !== 0) return res.json(Response.error('盘点单已处理'));

    const confirmCheck = db.transaction(() => {
      const items = db.prepare('SELECT * FROM inventory_check_item WHERE check_id = ?').all(req.params.id);
      items.forEach(item => {
        if (item.difference !== 0) {
          updateStock(db, item.product_id, check.warehouse_id, item.difference, 'inventory_check', check.check_no);
        }
      });
      db.prepare("UPDATE inventory_check SET status=1, checked_at=datetime('now','localtime') WHERE id=?").run(req.params.id);
    });

    confirmCheck();
    writeSystemLog(db, req.user.id, '库存管理', '盘点确认', check.check_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 库存调拨 ====================

router.get('/transfer', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND transfer_no LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_transfer WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT it.*, fw.name AS from_warehouse_name, tw.name AS to_warehouse_name, u.real_name AS creator_name FROM inventory_transfer it LEFT JOIN warehouse fw ON it.from_warehouse_id = fw.id LEFT JOIN warehouse tw ON it.to_warehouse_id = tw.id LEFT JOIN sys_user u ON it.creator_id = u.id WHERE ${where} ORDER BY it.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/transfer/:id', (req, res) => {
  try {
    const db = getDatabase();
    const transfer = db.prepare(`SELECT it.*, fw.name AS from_warehouse_name, tw.name AS to_warehouse_name FROM inventory_transfer it LEFT JOIN warehouse fw ON it.from_warehouse_id = fw.id LEFT JOIN warehouse tw ON it.to_warehouse_id = tw.id WHERE it.id = ?`).get(req.params.id);
    if (!transfer) return res.json(Response.error('调拨单不存在'));
    const items = db.prepare(`SELECT iti.*, p.name AS product_name FROM inventory_transfer_item iti LEFT JOIN product p ON iti.product_id = p.id WHERE iti.transfer_id = ?`).all(req.params.id);
    res.json(Response.success({ transfer, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/transfer', (req, res) => {
  try {
    const db = getDatabase();
    const { from_warehouse_id, to_warehouse_id, items } = req.body;
    if (!from_warehouse_id || !to_warehouse_id) return res.json(Response.error('调出和调入仓库不能为空'));
    if (from_warehouse_id === to_warehouse_id) return res.json(Response.error('调入和调出仓库不能相同'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const transferNo = generateNo(db, 'DB');

    const createTransfer = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const result = db.prepare(`INSERT INTO inventory_transfer (transfer_no, from_warehouse_id, to_warehouse_id, total_amount, status, creator_id) VALUES (?,?,?,?,0,?)`).run(transferNo, from_warehouse_id, to_warehouse_id, totalAmount, req.user.id);
      const transferId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO inventory_transfer_item (transfer_id, product_id, quantity, price) VALUES (?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(transferId, item.product_id, qty, price);
      });

      return transferId;
    });

    const transferId = createTransfer();
    writeSystemLog(db, req.user.id, '库存管理', '新增调拨单', transferNo);
    res.json(Response.success({ id: transferId, transfer_no: transferNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 确认调拨（执行库存移动）
router.put('/transfer/:id/confirm', (req, res) => {
  try {
    const db = getDatabase();
    const transfer = db.prepare('SELECT * FROM inventory_transfer WHERE id = ?').get(req.params.id);
    if (!transfer) return res.json(Response.error('调拨单不存在'));
    if (transfer.status !== 0) return res.json(Response.error('调拨单已处理'));

    const confirmTransfer = db.transaction(() => {
      const items = db.prepare('SELECT * FROM inventory_transfer_item WHERE transfer_id = ?').all(req.params.id);
      items.forEach(item => {
        updateStock(db, item.product_id, transfer.from_warehouse_id, -item.quantity, 'inventory_transfer_out', transfer.transfer_no);
        updateStock(db, item.product_id, transfer.to_warehouse_id, item.quantity, 'inventory_transfer_in', transfer.transfer_no);
      });
      db.prepare(`UPDATE inventory_transfer SET status=1 WHERE id=?`).run(req.params.id);
    });

    confirmTransfer();
    writeSystemLog(db, req.user.id, '库存管理', '调拨确认', transfer.transfer_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 其他入库 ====================

router.get('/other-inbound', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND inbound_no LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM other_inbound WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT oi.*, w.name AS warehouse_name, u.real_name AS creator_name FROM other_inbound oi LEFT JOIN warehouse w ON oi.warehouse_id = w.id LEFT JOIN sys_user u ON oi.creator_id = u.id WHERE ${where} ORDER BY oi.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-inbound/:id', (req, res) => {
  try {
    const db = getDatabase();
    const inbound = db.prepare(`SELECT oi.*, w.name AS warehouse_name FROM other_inbound oi LEFT JOIN warehouse w ON oi.warehouse_id = w.id WHERE oi.id = ?`).get(req.params.id);
    if (!inbound) return res.json(Response.error('入库单不存在'));
    const items = db.prepare(`SELECT oii.*, p.name AS product_name FROM other_inbound_item oii LEFT JOIN product p ON oii.product_id = p.id WHERE oii.inbound_id = ?`).all(req.params.id);
    res.json(Response.success({ inbound, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/other-inbound', (req, res) => {
  try {
    const db = getDatabase();
    const { warehouse_id, type = '', remark = '', items } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const inboundNo = generateNo(db, 'QT');

    const createInbound = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const result = db.prepare(`INSERT INTO other_inbound (inbound_no, warehouse_id, type, total_amount, status, remark, creator_id) VALUES (?,?,?,?,1,?,?)`).run(inboundNo, warehouse_id, type, totalAmount, remark, req.user.id);
      const inboundId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO other_inbound_item (inbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(inboundId, item.product_id, qty, price, price * qty);
        updateStock(db, item.product_id, warehouse_id, qty, 'other_inbound', inboundNo);
      });

      return inboundId;
    });

    const inboundId = createInbound();
    writeSystemLog(db, req.user.id, '库存管理', '其他入库', inboundNo);
    res.json(Response.success({ id: inboundId, inbound_no: inboundNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 其他出库 ====================

router.get('/other-outbound', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND outbound_no LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM other_outbound WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT oo.*, w.name AS warehouse_name, u.real_name AS creator_name FROM other_outbound oo LEFT JOIN warehouse w ON oo.warehouse_id = w.id LEFT JOIN sys_user u ON oo.creator_id = u.id WHERE ${where} ORDER BY oo.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-outbound/:id', (req, res) => {
  try {
    const db = getDatabase();
    const outbound = db.prepare(`SELECT oo.*, w.name AS warehouse_name FROM other_outbound oo LEFT JOIN warehouse w ON oo.warehouse_id = w.id WHERE oo.id = ?`).get(req.params.id);
    if (!outbound) return res.json(Response.error('出库单不存在'));
    const items = db.prepare(`SELECT ooi.*, p.name AS product_name FROM other_outbound_item ooi LEFT JOIN product p ON ooi.product_id = p.id WHERE ooi.outbound_id = ?`).all(req.params.id);
    res.json(Response.success({ outbound, items }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/other-outbound', (req, res) => {
  try {
    const db = getDatabase();
    const { warehouse_id, type = '', remark = '', items } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const outboundNo = generateNo(db, 'QT');

    const createOutbound = db.transaction(() => {
      let totalAmount = 0;
      items.forEach(item => { totalAmount += (item.price || 0) * (item.quantity || 0); });

      const result = db.prepare(`INSERT INTO other_outbound (outbound_no, warehouse_id, type, total_amount, status, remark, creator_id) VALUES (?,?,?,?,1,?,?)`).run(outboundNo, warehouse_id, type, totalAmount, remark, req.user.id);
      const outboundId = result.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO other_outbound_item (outbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)');
      items.forEach(item => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        insertItem.run(outboundId, item.product_id, qty, price, price * qty);
        updateStock(db, item.product_id, warehouse_id, -qty, 'other_outbound', outboundNo);
      });

      return outboundId;
    });

    const outboundId = createOutbound();
    writeSystemLog(db, req.user.id, '库存管理', '其他出库', outboundNo);
    res.json(Response.success({ id: outboundId, outbound_no: outboundNo }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 库存日志 ====================

router.get('/log', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, product_id = '', warehouse_id = '', change_type = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (product_id) { where += ' AND il.product_id = ?'; params.push(Number(product_id)); }
    if (warehouse_id) { where += ' AND il.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (change_type) { where += ' AND il.change_type = ?'; params.push(change_type); }
    if (start_date) { where += ' AND il.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND il.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_log il WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT il.*, p.name AS product_name, w.name AS warehouse_name FROM inventory_log il LEFT JOIN product p ON il.product_id = p.id LEFT JOIN warehouse w ON il.warehouse_id = w.id WHERE ${where} ORDER BY il.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 工具函数 ====================

function generateNo(db, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tableMap = {
    'PD': { table: 'inventory_check', col: 'check_no' },
    'DB': { table: 'inventory_transfer', col: 'transfer_no' },
    'QT': { table: 'other_inbound', col: 'inbound_no' }
  };
  const mapping = tableMap[prefix] || { table: 'other_inbound', col: 'inbound_no' };
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${mapping.table} WHERE ${mapping.col} LIKE ?`).get(`${prefix}-${dateStr}-%`);
  const seq = (row?.cnt || 0) + 1;
  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

function updateStock(db, productId, warehouseId, quantity, changeType, refNo) {
  const existing = db.prepare('SELECT * FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?').get(productId, warehouseId);
  const beforeQty = existing ? existing.quantity : 0;
  const afterQty = beforeQty + quantity;
  if (afterQty < 0) throw new Error('库存不足，无法操作');
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
