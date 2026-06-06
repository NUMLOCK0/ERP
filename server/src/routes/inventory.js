const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { isAuditEnabled } = require('../utils/auditConfig');

// ==================== 库存查询 ====================

router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', warehouse_id = '', category_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (warehouse_id) { where += ' AND ist.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(Number(category_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_stock ist LEFT JOIN product p ON ist.product_id = p.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ist.*, p.name AS product_name, p.code, p.spec, p.cost_price, p.sale_price, p.unit_id,
              u.name AS unit_name, w.name AS warehouse_name
       FROM inventory_stock ist
       LEFT JOIN product p ON ist.product_id = p.id
       LEFT JOIN warehouse w ON ist.warehouse_id = w.id
       LEFT JOIN unit u ON p.unit_id = u.id
       WHERE ${where} ORDER BY ist.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 库存日志 ====================

router.get('/log', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, product_id = '', warehouse_id = '', change_type = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (product_id) { where += ' AND il.product_id = ?'; params.push(Number(product_id)); }
    if (warehouse_id) { where += ' AND il.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (change_type) { where += ' AND il.change_type = ?'; params.push(change_type); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_log il LEFT JOIN product p ON il.product_id = p.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT il.*, p.name AS product_name, p.code, w.name AS warehouse_name
       FROM inventory_log il
       LEFT JOIN product p ON il.product_id = p.id
       LEFT JOIN warehouse w ON il.warehouse_id = w.id
       WHERE ${where} ORDER BY il.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 库存盘点 ====================

router.get('/check', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND ic.check_no LIKE ?'; params.push(`%${keyword}%`); }
    if (start_date) { where += ' AND ic.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND ic.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_check ic LEFT JOIN warehouse w ON ic.warehouse_id = w.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ic.*, w.name AS warehouse_name, u.real_name AS creator_name
       FROM inventory_check ic
       LEFT JOIN warehouse w ON ic.warehouse_id = w.id
       LEFT JOIN sys_user u ON ic.creator_id = u.id
       WHERE ${where} ORDER BY ic.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/check/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM inventory_check WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('盘点单不存在'));
    const check = rows[0];
    const [items] = await pool.execute(
      `SELECT ici.*, p.name AS product_name, p.code, p.spec
       FROM inventory_check_item ici
       LEFT JOIN product p ON ici.product_id = p.id
       WHERE ici.check_id = ?`, [check.id]
    );
    check.items = items;
    res.json(Response.success(check));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/check', async (req, res) => {
  try {
    const pool = getPool();
    const { warehouse_id, items } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const checkNo = await generateNo(pool, 'PD');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        'INSERT INTO inventory_check (check_no, warehouse_id, status, creator_id) VALUES (?,?,0,?)',
        [checkNo, warehouse_id, req.user.id]
      );
      const checkId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO inventory_check_item (check_id, product_id, book_quantity, actual_quantity, difference) VALUES (?,?,?,?,?)',
          [checkId, item.product_id, item.book_quantity, item.actual_quantity, item.actual_quantity - item.book_quantity]
        );
      }

      if (!(await isAuditEnabled(conn, 'inventory_check'))) {
        await confirmInventoryCheck(conn, checkId);
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '库存管理', '新增盘点单', checkNo);
      res.json(Response.success({ id: checkId, check_no: checkNo }));
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

router.post('/check/:id/confirm', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const check = await confirmInventoryCheck(conn, req.params.id);
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '库存管理', '确认盘点单', check.check_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 库存调拨 ====================

router.get('/transfer', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND it.transfer_no LIKE ?'; params.push(`%${keyword}%`); }
    if (start_date) { where += ' AND it.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND it.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_transfer it WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT it.*, fw.name AS from_warehouse_name, tw.name AS to_warehouse_name, u.real_name AS creator_name
       FROM inventory_transfer it
       LEFT JOIN warehouse fw ON it.from_warehouse_id = fw.id
       LEFT JOIN warehouse tw ON it.to_warehouse_id = tw.id
       LEFT JOIN sys_user u ON it.creator_id = u.id
       WHERE ${where} ORDER BY it.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/transfer/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM inventory_transfer WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('调拨单不存在'));
    const transfer = rows[0];
    const [items] = await pool.execute(
      `SELECT iti.*, p.name AS product_name, p.code, p.spec
       FROM inventory_transfer_item iti
       LEFT JOIN product p ON iti.product_id = p.id
       WHERE iti.transfer_id = ?`, [transfer.id]
    );
    transfer.items = items;
    res.json(Response.success(transfer));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/transfer', async (req, res) => {
  try {
    const pool = getPool();
    const { from_warehouse_id, to_warehouse_id, items } = req.body;
    if (!from_warehouse_id) return res.json(Response.error('调出仓库不能为空'));
    if (!to_warehouse_id) return res.json(Response.error('调入仓库不能为空'));
    if (from_warehouse_id === to_warehouse_id) return res.json(Response.error('调出仓库和调入仓库不能相同'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const transferNo = await generateNo(pool, 'DB');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 检查库存
      for (const item of items) {
        const [stockRows] = await conn.execute(
          'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
          [item.product_id, from_warehouse_id]
        );
        const stockQty = stockRows.length ? stockRows[0].quantity : 0;
        if (stockQty < item.quantity) {
          await conn.rollback(); conn.release();
          return res.json(Response.error(`调出仓库库存不足：产品ID ${item.product_id}，当前库存 ${stockQty}，需要 ${item.quantity}`));
        }
      }

      const auditEnabled = await isAuditEnabled(conn, 'inventory_transfer');
      const [result] = await conn.execute(
        'INSERT INTO inventory_transfer (transfer_no, from_warehouse_id, to_warehouse_id, total_amount, status, creator_id) VALUES (?,?,?,?,0,?)',
        [transferNo, from_warehouse_id, to_warehouse_id, totalAmount, req.user.id]
      );
      const transferId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO inventory_transfer_item (transfer_id, product_id, quantity, price) VALUES (?,?,?,?)',
          [transferId, item.product_id, item.quantity, item.price]
        );
      }

      if (!auditEnabled) {
        await confirmInventoryTransfer(conn, transferId);
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '库存管理', '新增调拨单', transferNo);
      res.json(Response.success({ id: transferId, transfer_no: transferNo }));
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

router.post('/transfer/:id/confirm', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const transfer = await confirmInventoryTransfer(conn, req.params.id);
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '库存管理', '确认调拨单', transfer.transfer_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

// ==================== 其他入库 ====================

router.get('/other-inbound', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND oi.inbound_no LIKE ?'; params.push(`%${keyword}%`); }
    if (start_date) { where += ' AND oi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM other_inbound oi LEFT JOIN warehouse w ON oi.warehouse_id = w.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT oi.*, w.name AS warehouse_name, u.real_name AS creator_name
       FROM other_inbound oi
       LEFT JOIN warehouse w ON oi.warehouse_id = w.id
       LEFT JOIN sys_user u ON oi.creator_id = u.id
       WHERE ${where} ORDER BY oi.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-inbound/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM other_inbound WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('入库单不存在'));
    const inbound = rows[0];
    const [items] = await pool.execute(
      `SELECT oii.*, p.name AS product_name, p.code, p.spec
       FROM other_inbound_item oii
       LEFT JOIN product p ON oii.product_id = p.id
       WHERE oii.inbound_id = ?`, [inbound.id]
    );
    inbound.items = items;
    res.json(Response.success(inbound));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/other-inbound', async (req, res) => {
  try {
    const pool = getPool();
    const { warehouse_id, type = '', items, remark = '' } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const inboundNo = await generateNo(pool, 'QT');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        'INSERT INTO other_inbound (inbound_no, warehouse_id, type, total_amount, status, remark, creator_id) VALUES (?,?,?,?,1,?,?)',
        [inboundNo, warehouse_id, type, totalAmount, remark, req.user.id]
      );
      const inboundId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO other_inbound_item (inbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
          [inboundId, item.product_id, item.quantity, item.price, (item.quantity || 0) * (item.price || 0)]
        );
        await updateStock(conn, item.product_id, warehouse_id, item.quantity, 'other_inbound', inboundNo);
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '库存管理', '新增其他入库单', inboundNo);
      res.json(Response.success({ id: inboundId, inbound_no: inboundNo }));
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

// ==================== 其他出库 ====================

router.get('/other-outbound', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND oo.outbound_no LIKE ?'; params.push(`%${keyword}%`); }
    if (start_date) { where += ' AND oo.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oo.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM other_outbound oo LEFT JOIN warehouse w ON oo.warehouse_id = w.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT oo.*, w.name AS warehouse_name, u.real_name AS creator_name
       FROM other_outbound oo
       LEFT JOIN warehouse w ON oo.warehouse_id = w.id
       LEFT JOIN sys_user u ON oo.creator_id = u.id
       WHERE ${where} ORDER BY oo.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-outbound/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM other_outbound WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('出库单不存在'));
    const outbound = rows[0];
    const [items] = await pool.execute(
      `SELECT ooi.*, p.name AS product_name, p.code, p.spec
       FROM other_outbound_item ooi
       LEFT JOIN product p ON ooi.product_id = p.id
       WHERE ooi.outbound_id = ?`, [outbound.id]
    );
    outbound.items = items;
    res.json(Response.success(outbound));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/other-outbound', async (req, res) => {
  try {
    const pool = getPool();
    const { warehouse_id, type = '', items, remark = '' } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!items || !items.length) return res.json(Response.error('明细不能为空'));

    const outboundNo = await generateNo(pool, 'QC');
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item.price || 0);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 检查库存
      for (const item of items) {
        const [stockRows] = await conn.execute(
          'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
          [item.product_id, warehouse_id]
        );
        const stockQty = stockRows.length ? stockRows[0].quantity : 0;
        if (stockQty < item.quantity) {
          await conn.rollback(); conn.release();
          return res.json(Response.error(`库存不足：产品ID ${item.product_id}，当前库存 ${stockQty}，需要 ${item.quantity}`));
        }
      }

      const [result] = await conn.execute(
        'INSERT INTO other_outbound (outbound_no, warehouse_id, type, total_amount, status, remark, creator_id) VALUES (?,?,?,?,1,?,?)',
        [outboundNo, warehouse_id, type, totalAmount, remark, req.user.id]
      );
      const outboundId = result.insertId;

      for (const item of items) {
        await conn.execute(
          'INSERT INTO other_outbound_item (outbound_id, product_id, quantity, price, amount) VALUES (?,?,?,?,?)',
          [outboundId, item.product_id, item.quantity, item.price, (item.quantity || 0) * (item.price || 0)]
        );
        await updateStock(conn, item.product_id, warehouse_id, -item.quantity, 'other_outbound', outboundNo);
      }

      await conn.commit();
      await writeSystemLog(pool, req.user.id, '库存管理', '新增其他出库单', outboundNo);
      res.json(Response.success({ id: outboundId, outbound_no: outboundNo }));
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

async function confirmInventoryCheck(conn, checkId) {
  const [checkRows] = await conn.execute('SELECT * FROM inventory_check WHERE id = ?', [checkId]);
  const check = checkRows[0];
  if (!check) throw new Error('盘点单不存在');
  if (Number(check.status) !== 0) throw new Error('盘点单状态不允许确认');

  const [items] = await conn.execute('SELECT * FROM inventory_check_item WHERE check_id = ?', [check.id]);
  for (const item of items) {
    if (Number(item.difference) !== 0) {
      await updateStock(conn, item.product_id, check.warehouse_id, item.difference, 'inventory_check', check.check_no);
    }
  }

  await conn.execute('UPDATE inventory_check SET status = 1, checked_at = NOW() WHERE id = ?', [check.id]);
  return check;
}

async function confirmInventoryTransfer(conn, transferId) {
  const [transferRows] = await conn.execute('SELECT * FROM inventory_transfer WHERE id = ?', [transferId]);
  const transfer = transferRows[0];
  if (!transfer) throw new Error('调拨单不存在');
  if (Number(transfer.status) !== 0) throw new Error('调拨单状态不允许确认');

  const [items] = await conn.execute('SELECT * FROM inventory_transfer_item WHERE transfer_id = ?', [transfer.id]);
  for (const item of items) {
    const [stockRows] = await conn.execute(
      'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
      [item.product_id, transfer.from_warehouse_id]
    );
    const stockQty = stockRows.length ? stockRows[0].quantity : 0;
    if (stockQty < item.quantity) {
      throw new Error(`调出仓库库存不足：产品ID ${item.product_id}，当前库存 ${stockQty}，需要 ${item.quantity}`);
    }
    await updateStock(conn, item.product_id, transfer.from_warehouse_id, -item.quantity, 'inventory_transfer_out', transfer.transfer_no);
    await updateStock(conn, item.product_id, transfer.to_warehouse_id, item.quantity, 'inventory_transfer_in', transfer.transfer_no);
  }

  await conn.execute('UPDATE inventory_transfer SET status = 1 WHERE id = ?', [transfer.id]);
  return transfer;
}

async function generateNo(poolOrConn, prefix) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tableMap = {
    'PD': { table: 'inventory_check', col: 'check_no' },
    'DB': { table: 'inventory_transfer', col: 'transfer_no' },
    'QT': { table: 'other_inbound', col: 'inbound_no' },
    'QC': { table: 'other_outbound', col: 'outbound_no' }
  };
  const mapping = tableMap[prefix] || { table: 'inventory_check', col: 'check_no' };
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
