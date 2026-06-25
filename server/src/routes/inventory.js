const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { isAuditEnabled } = require('../utils/auditConfig');
const { resolveInlineProduct } = require('../utils/inlineProduct');
const { generateBusinessNo } = require('../utils/bizNo');

// ==================== 库存查询 ====================

router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      product_name = '',
      warehouse_id = '',
      category_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (warehouse_id) { where += ' AND ist.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (product_name) { where += ' AND p.name LIKE ?'; params.push(`%${product_name}%`); }
    if (category_id) { where += ' AND p.category_id = ?'; params.push(Number(category_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_stock ist LEFT JOIN product p ON ist.product_id = p.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ist.id,
              ist.product_id,
              ist.warehouse_id,
              ist.quantity,
              ist.created_at,
              ist.updated_at,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              p.description AS product_description,
              p.cost_price,
              p.sale_price,
              p.unit_id,
              u.name AS unit_name,
              COALESCE(
                (
                  SELECT pu.base_quantity
                  FROM product_unit pu
                  WHERE pu.product_id = p.id
                    AND (pu.is_base = 1 OR pu.unit_id = p.unit_id)
                  ORDER BY pu.is_base DESC, pu.sort_order ASC, pu.id ASC
                  LIMIT 1
                ),
                1
              ) AS base_quantity,
              w.name AS warehouse_name
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
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      product_id = '',
      warehouse_id = '',
      change_type = '',
      operation_type = '',
      start_date = '',
      end_date = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (p.name LIKE ? OR p.code LIKE ? OR CAST(p.id AS CHAR) LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (product_id) { where += ' AND il.product_id = ?'; params.push(Number(product_id)); }
    if (warehouse_id) { where += ' AND il.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (change_type) { where += ' AND il.change_type = ?'; params.push(change_type); }
    if (operation_type === 'increase') where += ' AND il.change_quantity > 0';
    if (operation_type === 'decrease') where += ' AND il.change_quantity < 0';
    if (operation_type === 'unchanged') where += ' AND il.change_quantity = 0';
    if (start_date) { where += ' AND il.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND il.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_log il LEFT JOIN product p ON il.product_id = p.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT il.id,
              il.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.spec AS product_spec,
              p.code AS product_code,
              CASE
                WHEN il.change_quantity > 0 THEN 'increase'
                WHEN il.change_quantity < 0 THEN 'decrease'
                ELSE 'unchanged'
              END AS operation_type,
              il.change_quantity AS operation_quantity,
              u.name AS unit_name,
              w.name AS warehouse_name,
              il.change_type AS business_type,
              COALESCE(
                pi.id, pr.id, sd.id, sr.id, ic.id, itr.id, oi.id, oo.id, auto_so.id, hpo.id
              ) AS business_order_id,
              il.ref_no AS business_order_no,
              COALESCE(operator.real_name, operator.username, '') AS operator_name,
              il.created_at AS operation_time
       FROM inventory_log il
       LEFT JOIN product p ON il.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN warehouse w ON il.warehouse_id = w.id
       LEFT JOIN purchase_inbound pi
         ON il.change_type = 'purchase_inbound' AND il.ref_no = pi.inbound_no
       LEFT JOIN purchase_return pr
         ON il.change_type = 'purchase_return' AND il.ref_no = pr.return_no
       LEFT JOIN sale_delivery sd
         ON il.change_type = 'sale_delivery' AND il.ref_no = sd.delivery_no
       LEFT JOIN sale_return sr
         ON il.change_type = 'sale_return' AND il.ref_no = sr.return_no
       LEFT JOIN inventory_check ic
         ON il.change_type IN ('inventory_check', 'check') AND il.ref_no = ic.check_no
       LEFT JOIN inventory_transfer itr
         ON il.change_type IN ('inventory_transfer_in', 'inventory_transfer_out', 'transfer_in', 'transfer_out')
        AND il.ref_no = itr.transfer_no
       LEFT JOIN other_inbound oi
         ON il.change_type = 'other_inbound' AND il.ref_no = oi.inbound_no
       LEFT JOIN other_outbound oo
         ON il.change_type = 'other_outbound' AND il.ref_no = oo.outbound_no
       LEFT JOIN sale_order auto_so
         ON il.change_type = 'other_inbound'
        AND il.ref_no = CONCAT(auto_so.order_no, '-自动补库')
       LEFT JOIN herb_processing_order hpo
         ON il.change_type IN ('herb_processing_issue', 'herb_processing_return', 'herb_processing_inbound')
        AND il.ref_no = hpo.batch_no
       LEFT JOIN sys_user operator
         ON operator.id = COALESCE(
           pi.creator_id,
           pr.creator_id,
           sd.creator_id,
           sr.creator_id,
           ic.creator_id,
           itr.creator_id,
           oi.creator_id,
           oo.creator_id,
           auto_so.creator_id,
           hpo.creator_id
         )
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
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      warehouse_id = '',
      status = '',
      start_date = '',
      end_date = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (ic.check_no LIKE ? OR ic.checker_name LIKE ? OR u.real_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (warehouse_id) { where += ' AND ic.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (status !== '') { where += ' AND ic.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND ic.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND ic.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM inventory_check ic
       LEFT JOIN warehouse w ON ic.warehouse_id = w.id
       LEFT JOIN sys_user u ON ic.creator_id = u.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ic.*, w.name AS warehouse_name, u.real_name AS creator_name,
              COALESCE(item_stats.total_quantity, 0) AS product_total_quantity
       FROM inventory_check ic
       LEFT JOIN warehouse w ON ic.warehouse_id = w.id
       LEFT JOIN sys_user u ON ic.creator_id = u.id
       LEFT JOIN (
         SELECT check_id, SUM(actual_quantity) AS total_quantity
         FROM inventory_check_item
         GROUP BY check_id
       ) item_stats ON ic.id = item_stats.check_id
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
    const [rows] = await pool.execute(
      `SELECT ic.*, w.name AS warehouse_name, u.real_name AS creator_name
       FROM inventory_check ic
       LEFT JOIN warehouse w ON ic.warehouse_id = w.id
       LEFT JOIN sys_user u ON ic.creator_id = u.id
       WHERE ic.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('盘点单不存在'));
    const check = rows[0];
    const [items] = await pool.execute(
      `SELECT ici.*, p.name AS product_name, p.code, p.spec, u.name AS unit_name,
              COALESCE(pu.base_quantity, 1) AS base_quantity
       FROM inventory_check_item ici
       LEFT JOIN product p ON ici.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT product_id, MAX(CASE WHEN is_base = 1 THEN base_quantity ELSE NULL END) AS base_quantity
         FROM product_unit
         GROUP BY product_id
       ) pu ON p.id = pu.product_id
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
    const {
      warehouse_id,
      checker_name = '',
      check_time = null,
      remark = '',
      submit = false,
      items
    } = req.body;
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!Array.isArray(items) || !items.length) return res.json(Response.error('明细不能为空'));

    const productIds = new Set();
    for (const item of items) {
      const productId = Number(item.product_id || 0);
      const bookQuantity = Number(item.book_quantity || 0);
      const actualQuantity = Number(item.actual_quantity || 0);
      if (!productId || bookQuantity < 0 || actualQuantity < 0) {
        return res.json(Response.error('盘点产品和库存数量必须填写完整'));
      }
      if (productIds.has(productId)) return res.json(Response.error('盘点产品不能重复'));
      productIds.add(productId);
    }

    const checkNo = await generateNo(pool, 'PD');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const auditEnabled = await isAuditEnabled(conn, 'inventory_check');
      const initialStatus = submit && auditEnabled ? 4 : 0;
      const [result] = await conn.execute(
        `INSERT INTO inventory_check
         (check_no, warehouse_id, status, checker_name, check_time, remark, creator_id, submit_time)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          checkNo,
          warehouse_id,
          initialStatus,
          checker_name,
          check_time || null,
          remark,
          req.user.id,
          submit ? new Date() : null
        ]
      );
      const checkId = result.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO inventory_check_item
           (check_id, product_id, book_quantity, actual_quantity, difference, remark)
           VALUES (?,?,?,?,?,?)`,
          [
            checkId,
            item.product_id,
            Number(item.book_quantity || 0),
            Number(item.actual_quantity || 0),
            Number(item.actual_quantity || 0) - Number(item.book_quantity || 0),
            item.remark || ''
          ]
        );
      }

      if (submit && !auditEnabled) {
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

router.get('/stock/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS title,
              COUNT(DISTINCT ist.product_id) AS product_total,
              COALESCE(SUM(ist.quantity), 0) AS stock_total
       FROM warehouse w
       LEFT JOIN inventory_stock ist ON ist.warehouse_id = w.id
       GROUP BY w.id, w.name
       ORDER BY w.id ASC`
    );
    res.json(Response.success(list));
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
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      supplier_id = '',
      warehouse_id = '',
      status = '',
      start_date = '',
      end_date = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (oi.inbound_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (supplier_id) { where += ' AND oi.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND oi.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (status !== '') { where += ' AND oi.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND oi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM other_inbound oi
       LEFT JOIN supplier_customer sc ON oi.supplier_id = sc.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT oi.*, sc.name AS supplier_name, w.name AS warehouse_name, u.real_name AS creator_name,
              COALESCE(NULLIF(oi.total_quantity, 0), item_stats.total_quantity, 0) AS product_total_quantity
       FROM other_inbound oi
       LEFT JOIN supplier_customer sc ON oi.supplier_id = sc.id
       LEFT JOIN warehouse w ON oi.warehouse_id = w.id
       LEFT JOIN sys_user u ON oi.creator_id = u.id
       LEFT JOIN (
         SELECT inbound_id, SUM(quantity) AS total_quantity
         FROM other_inbound_item
         GROUP BY inbound_id
       ) item_stats ON oi.id = item_stats.inbound_id
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
    const [rows] = await pool.execute(
      `SELECT oi.*, sc.name AS supplier_name, w.name AS warehouse_name
       FROM other_inbound oi
       LEFT JOIN supplier_customer sc ON oi.supplier_id = sc.id
       LEFT JOIN warehouse w ON oi.warehouse_id = w.id
       WHERE oi.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('入库单不存在'));
    const inbound = rows[0];
    const [items] = await pool.execute(
      `SELECT oii.*, p.name AS product_name, p.code, p.spec, u.name AS unit_name,
              COALESCE(pu.base_quantity, 1) AS base_quantity
       FROM other_inbound_item oii
       LEFT JOIN product p ON oii.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT product_id, MAX(CASE WHEN is_base = 1 THEN base_quantity ELSE NULL END) AS base_quantity
         FROM product_unit
         GROUP BY product_id
       ) pu ON p.id = pu.product_id
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
    const {
      supplier_id,
      warehouse_id,
      items,
      admin_remark = '',
      inbound_remark = ''
    } = req.body;
    if (!supplier_id) return res.json(Response.error('供应商不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!Array.isArray(items) || !items.length) return res.json(Response.error('入库明细不能为空'));

    const inboundNo = await generateNo(pool, 'QT');
    let totalAmount = 0;
    let totalQuantity = 0;
    let taxAmount = 0;
    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const tax = Number(item.tax || 0);
      if ((!item.product_id && !String(item.product_name || '').trim()) || quantity <= 0) {
        return res.json(Response.error('入库产品和数量必须填写完整'));
      }
      totalQuantity += quantity;
      taxAmount += tax;
      totalAmount += quantity * price + tax;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO other_inbound
         (inbound_no, supplier_id, warehouse_id, total_amount, total_quantity, tax_amount, status,
          admin_remark, inbound_remark, remark, creator_id, completed_time)
         VALUES (?,?,?,?,?,?,1,?,?,?,?,NOW())`,
        [
          inboundNo,
          supplier_id,
          warehouse_id,
          totalAmount,
          totalQuantity,
          taxAmount,
          admin_remark,
          inbound_remark,
          inbound_remark,
          req.user.id
        ]
      );
      const inboundId = result.insertId;

      for (const item of items) {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const tax = Number(item.tax || 0);
        const productId = await resolveInlineProduct(conn, item, {
          supplierId: supplier_id,
          warehouseId: warehouse_id
        });
        await conn.execute(
          'INSERT INTO other_inbound_item (inbound_id, product_id, quantity, price, tax, amount) VALUES (?,?,?,?,?,?)',
          [inboundId, productId, quantity, price, tax, quantity * price + tax]
        );
        await updateStock(conn, productId, warehouse_id, quantity, 'other_inbound', inboundNo);
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
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      customer_id = '',
      warehouse_id = '',
      status = '',
      start_date = '',
      end_date = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (oo.outbound_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (customer_id) { where += ' AND oo.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) { where += ' AND oo.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (status !== '') { where += ' AND oo.status = ?'; params.push(Number(status)); }
    if (start_date) { where += ' AND oo.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oo.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM other_outbound oo
       LEFT JOIN supplier_customer sc ON oo.customer_id = sc.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT oo.*, sc.name AS customer_name, w.name AS warehouse_name, u.real_name AS creator_name,
              COALESCE(NULLIF(oo.total_quantity, 0), item_stats.total_quantity, 0) AS product_total_quantity,
              COALESCE(item_stats.unit_price, 0) AS unit_price,
              COALESCE(NULLIF(oo.tax_amount, 0), item_stats.tax_amount, 0) AS tax_amount
       FROM other_outbound oo
       LEFT JOIN supplier_customer sc ON oo.customer_id = sc.id
       LEFT JOIN warehouse w ON oo.warehouse_id = w.id
       LEFT JOIN sys_user u ON oo.creator_id = u.id
       LEFT JOIN (
         SELECT outbound_id, SUM(quantity) AS total_quantity, AVG(price) AS unit_price,
                SUM(COALESCE(tax, 0)) AS tax_amount
         FROM other_outbound_item
         GROUP BY outbound_id
       ) item_stats ON oo.id = item_stats.outbound_id
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
    const [rows] = await pool.execute(
      `SELECT oo.*, sc.name AS customer_name, w.name AS warehouse_name
       FROM other_outbound oo
       LEFT JOIN supplier_customer sc ON oo.customer_id = sc.id
       LEFT JOIN warehouse w ON oo.warehouse_id = w.id
       WHERE oo.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('出库单不存在'));
    const outbound = rows[0];
    const [items] = await pool.execute(
      `SELECT ooi.*, p.name AS product_name, p.code, p.spec, u.name AS unit_name,
              COALESCE(pu.base_quantity, 1) AS base_quantity
       FROM other_outbound_item ooi
       LEFT JOIN product p ON ooi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT product_id, MAX(CASE WHEN is_base = 1 THEN base_quantity ELSE NULL END) AS base_quantity
         FROM product_unit
         GROUP BY product_id
       ) pu ON p.id = pu.product_id
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
    const {
      customer_id,
      warehouse_id,
      contact = '',
      phone = '',
      address = '',
      express_name = '',
      express_no = '',
      admin_remark = '',
      outbound_remark = '',
      status = 0,
      items
    } = req.body;
    if (!customer_id) return res.json(Response.error('客户不能为空'));
    if (!warehouse_id) return res.json(Response.error('仓库不能为空'));
    if (!Array.isArray(items) || !items.length) return res.json(Response.error('出库明细不能为空'));
    if (![0, 1, 2].includes(Number(status))) return res.json(Response.error('出库状态不正确'));

    const outboundNo = await generateNo(pool, 'QC');
    let totalAmount = 0;
    let totalQuantity = 0;
    let taxAmount = 0;
    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const tax = Number(item.tax || 0);
      if ((!item.product_id && !String(item.product_name || '').trim()) || quantity <= 0) {
        return res.json(Response.error('出库产品和数量必须填写完整'));
      }
      totalQuantity += quantity;
      taxAmount += tax;
      totalAmount += quantity * price + tax;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const resolvedItems = [];
      for (const item of items) {
        const productId = await resolveInlineProduct(conn, item, {
          warehouseId: warehouse_id
        });
        resolvedItems.push({ ...item, product_id: productId });
      }

      if (Number(status) === 1) {
        for (const item of resolvedItems) {
          const [stockRows] = await conn.execute(
            'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
            [item.product_id, warehouse_id]
          );
          const stockQty = stockRows.length ? Number(stockRows[0].quantity || 0) : 0;
          if (stockQty < Number(item.quantity || 0)) {
            throw new Error(`库存不足：产品ID ${item.product_id}，当前库存 ${stockQty}，需要 ${item.quantity}`);
          }
        }
      }

      const [result] = await conn.execute(
        `INSERT INTO other_outbound
         (outbound_no, customer_id, warehouse_id, total_amount, total_quantity, tax_amount, status,
          contact, phone, address, express_name, express_no, admin_remark, outbound_remark,
          remark, creator_id, completed_time, cancel_time)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          outboundNo,
          customer_id,
          warehouse_id,
          totalAmount,
          totalQuantity,
          taxAmount,
          Number(status),
          contact,
          phone,
          address,
          express_name,
          express_no,
          admin_remark,
          outbound_remark,
          outbound_remark,
          req.user.id,
          Number(status) === 1 ? new Date() : null,
          Number(status) === 2 ? new Date() : null
        ]
      );
      const outboundId = result.insertId;

      for (const item of resolvedItems) {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const tax = Number(item.tax || 0);
        await conn.execute(
          'INSERT INTO other_outbound_item (outbound_id, product_id, quantity, price, tax, location, amount) VALUES (?,?,?,?,?,?,?)',
          [outboundId, item.product_id, quantity, price, tax, item.location || '', quantity * price + tax]
        );
        if (Number(status) === 1) {
          await updateStock(conn, item.product_id, warehouse_id, -quantity, 'other_outbound', outboundNo);
        }
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

async function confirmInventoryCheck(conn, checkId) {
  const [checkRows] = await conn.execute('SELECT * FROM inventory_check WHERE id = ?', [checkId]);
  const check = checkRows[0];
  if (!check) throw new Error('盘点单不存在');
  if (![0, 4].includes(Number(check.status))) throw new Error('盘点单状态不允许确认');

  const [items] = await conn.execute('SELECT * FROM inventory_check_item WHERE check_id = ?', [check.id]);
  for (const item of items) {
    if (Number(item.difference) !== 0) {
      await updateStock(conn, item.product_id, check.warehouse_id, item.difference, 'inventory_check', check.check_no);
    }
  }

  await conn.execute(
    `UPDATE inventory_check
     SET status = 1,
         checked_at = COALESCE(check_time, NOW()),
         check_time = COALESCE(check_time, NOW()),
         completed_time = NOW(),
         audit_time = NOW()
     WHERE id = ?`,
    [check.id]
  );
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
  return generateBusinessNo(poolOrConn, prefix);
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
