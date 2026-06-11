const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');

// ==================== 产品库存报表 ====================

router.get('/dashboard', async (req, res) => {
  try {
    const pool = getPool();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartText = monthStart.toISOString().slice(0, 19).replace('T', ' ');

    const [productRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM product WHERE status = 1');
    const [purchaseRows] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS amount FROM purchase_order WHERE created_at >= ?',
      [monthStartText]
    );
    const [saleRows] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS amount FROM sale_order WHERE created_at >= ?',
      [monthStartText]
    );

    const [configRows] = await pool.execute('SELECT value FROM system_config WHERE `key` = ?', ['stock_warning']);
    const stockWarning = Number(configRows[0]?.value || 10);

    const [alertStocks] = await pool.execute(
      `SELECT ist.*, p.name AS product_name, p.code, w.name AS warehouse_name
       FROM inventory_stock ist
       LEFT JOIN product p ON ist.product_id = p.id
       LEFT JOIN warehouse w ON ist.warehouse_id = w.id
       WHERE ist.quantity <= ?
       ORDER BY ist.quantity ASC, ist.id DESC
       LIMIT 10`,
      [stockWarning]
    );
    const [alertCountRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM inventory_stock WHERE quantity <= ?',
      [stockWarning]
    );
    const [recentPurchase] = await pool.execute(
      `SELECT po.*, sc.name AS supplier_name
       FROM purchase_order po
       LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id
       ORDER BY po.id DESC
       LIMIT 5`
    );
    const [recentSale] = await pool.execute(
      `SELECT so.*, sc.name AS customer_name
       FROM sale_order so
       LEFT JOIN supplier_customer sc ON so.customer_id = sc.id
       ORDER BY so.id DESC
       LIMIT 5`
    );

    res.json(Response.success({
      productCount: Number(productRows[0]?.cnt || 0),
      monthPurchase: Number(purchaseRows[0]?.amount || 0),
      monthSale: Number(saleRows[0]?.amount || 0),
      alertCount: Number(alertCountRows[0]?.cnt || 0),
      recentPurchase,
      recentSale,
      alertStocks
    }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/stock', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (warehouse_id) { where += ' AND ist.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    if (keyword) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM inventory_stock ist LEFT JOIN product p ON ist.product_id = p.id WHERE ${where}`, params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ist.*, p.name AS product_name, p.code, p.spec, p.sale_price, w.name AS warehouse_name
       FROM inventory_stock ist
       LEFT JOIN product p ON ist.product_id = p.id
       LEFT JOIN warehouse w ON ist.warehouse_id = w.id
       WHERE ${where} ORDER BY ist.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购入库报表 ====================

router.get('/purchase-inbound', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      supplier_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (pi.inbound_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (supplier_id) { where += ' AND pi.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND pi.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM purchase_inbound_item pii
       INNER JOIN purchase_inbound pi ON pii.inbound_id = pi.id
       LEFT JOIN product p ON pii.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT pii.id,
              pii.inbound_id,
              pi.inbound_no,
              pi.order_id,
              pii.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              pii.quantity AS inbound_quantity,
              COALESCE(order_item_stats.purchase_quantity, pii.quantity) AS purchase_quantity,
              pii.price AS purchase_price,
              pii.amount AS purchase_total_amount,
              CASE
                WHEN COALESCE(order_item_stats.purchase_quantity, 0) > 0
                THEN COALESCE(order_item_stats.total_tax, 0) / order_item_stats.purchase_quantity
                ELSE 0
              END AS tax,
              CASE
                WHEN COALESCE(order_item_stats.purchase_quantity, 0) > 0
                THEN COALESCE(order_item_stats.total_tax, 0) * pii.quantity / order_item_stats.purchase_quantity
                ELSE 0
              END AS tax_total,
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
              sc.name AS supplier_name,
              w.name AS warehouse_name,
              pi.created_at,
              pi.updated_at
       FROM purchase_inbound_item pii
       INNER JOIN purchase_inbound pi ON pii.inbound_id = pi.id
       LEFT JOIN product p ON pii.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN supplier_customer sc ON pi.supplier_id = sc.id
       LEFT JOIN warehouse w ON pi.warehouse_id = w.id
       LEFT JOIN (
         SELECT order_id,
                product_id,
                SUM(COALESCE(final_quantity, quantity)) AS purchase_quantity,
                SUM(CASE WHEN final_quantity IS NOT NULL THEN COALESCE(final_tax, 0) ELSE COALESCE(tax, 0) END) AS total_tax
         FROM purchase_order_item
         GROUP BY order_id, product_id
       ) order_item_stats
         ON order_item_stats.order_id = pi.order_id
        AND order_item_stats.product_id = pii.product_id
       WHERE ${where}
       ORDER BY pii.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/purchase-inbound/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '', start_date = '', end_date = '', supplier_id = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (pi.inbound_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (supplier_id) { where += ' AND pi.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND pi.warehouse_id = ?'; params.push(Number(warehouse_id)); }

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(inbound_stats.product_total, 0) AS product_total,
              COALESCE(purchase_stats.purchase_total, 0) AS purchase_total,
              COALESCE(inbound_stats.purchase_amount, 0) AS purchase_amount,
              COALESCE(inbound_stats.tax_total, 0) AS tax_total,
              COALESCE(inbound_stats.inbound_total, 0) AS inbound_total
       FROM warehouse w
       LEFT JOIN (
         SELECT pi.warehouse_id,
                COUNT(DISTINCT pii.product_id) AS product_total,
                SUM(pii.quantity) AS inbound_total,
                SUM(pii.amount) AS purchase_amount,
                SUM(
                  CASE
                    WHEN COALESCE(order_item_stats.purchase_quantity, 0) > 0
                    THEN COALESCE(order_item_stats.total_tax, 0) * pii.quantity / order_item_stats.purchase_quantity
                    ELSE 0
                  END
                ) AS tax_total
         FROM purchase_inbound_item pii
         INNER JOIN purchase_inbound pi ON pii.inbound_id = pi.id
         LEFT JOIN product p ON pii.product_id = p.id
         LEFT JOIN (
           SELECT order_id,
                  product_id,
                  SUM(COALESCE(final_quantity, quantity)) AS purchase_quantity,
                  SUM(CASE WHEN final_quantity IS NOT NULL THEN COALESCE(final_tax, 0) ELSE COALESCE(tax, 0) END) AS total_tax
           FROM purchase_order_item
           GROUP BY order_id, product_id
         ) order_item_stats
           ON order_item_stats.order_id = pi.order_id
          AND order_item_stats.product_id = pii.product_id
         WHERE ${where}
         GROUP BY pi.warehouse_id
       ) inbound_stats ON inbound_stats.warehouse_id = w.id
       LEFT JOIN (
         SELECT purchase_groups.warehouse_id,
                SUM(purchase_groups.purchase_quantity) AS purchase_total
         FROM (
           SELECT pi.warehouse_id,
                  pi.order_id,
                  pii.product_id,
                  MAX(COALESCE(order_item_stats.purchase_quantity, pii.quantity)) AS purchase_quantity
           FROM purchase_inbound_item pii
           INNER JOIN purchase_inbound pi ON pii.inbound_id = pi.id
           LEFT JOIN product p ON pii.product_id = p.id
           LEFT JOIN (
             SELECT order_id,
                    product_id,
                    SUM(COALESCE(final_quantity, quantity)) AS purchase_quantity
             FROM purchase_order_item
             GROUP BY order_id, product_id
           ) order_item_stats
             ON order_item_stats.order_id = pi.order_id
            AND order_item_stats.product_id = pii.product_id
           WHERE ${where}
           GROUP BY pi.warehouse_id, pi.order_id, pii.product_id
         ) purchase_groups
         GROUP BY purchase_groups.warehouse_id
       ) purchase_stats ON purchase_stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      [...params, ...params]
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售发货报表 ====================

router.get('/sale-delivery', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      customer_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (sd.delivery_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (customer_id) { where += ' AND sd.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) { where += ' AND sd.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM sale_delivery_item sdi
       INNER JOIN sale_delivery sd ON sdi.delivery_id = sd.id
       LEFT JOIN product p ON sdi.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sdi.id,
              sdi.delivery_id,
              sd.delivery_no,
              sdi.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              sdi.price AS sale_price,
              sdi.amount AS sale_total_amount,
              sdi.quantity AS delivery_quantity,
              CASE
                WHEN COALESCE(order_item_stats.total_quantity, 0) > 0
                THEN COALESCE(order_item_stats.total_tax, 0) * sdi.quantity / order_item_stats.total_quantity
                ELSE 0
              END AS tax_total,
              CASE
                WHEN sdi.quantity > 0 AND COALESCE(order_item_stats.total_quantity, 0) > 0
                THEN COALESCE(order_item_stats.total_tax, 0) / order_item_stats.total_quantity
                ELSE 0
              END AS tax,
              COALESCE(return_item_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_item_stats.return_quantity, 0) AS return_quantity,
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
              sc.name AS customer_name,
              w.name AS warehouse_name,
              sd.created_at,
              sd.updated_at
       FROM sale_delivery_item sdi
       INNER JOIN sale_delivery sd ON sdi.delivery_id = sd.id
       LEFT JOIN product p ON sdi.product_id = p.id
       LEFT JOIN supplier_customer sc ON sd.customer_id = sc.id
       LEFT JOIN warehouse w ON sd.warehouse_id = w.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN (
         SELECT order_id, product_id,
                SUM(COALESCE(tax, 0)) AS total_tax,
                SUM(quantity) AS total_quantity
         FROM sale_order_item
         GROUP BY order_id, product_id
       ) order_item_stats
         ON order_item_stats.order_id = sd.order_id
        AND order_item_stats.product_id = sdi.product_id
       LEFT JOIN (
         SELECT sri.delivery_item_id,
                SUM(sri.amount) AS refund_amount,
                SUM(sri.quantity) AS return_quantity
         FROM sale_return_item sri
         INNER JOIN sale_return sr ON sri.return_id = sr.id AND sr.status = 1
         GROUP BY sri.delivery_item_id
       ) return_item_stats ON return_item_stats.delivery_item_id = sdi.id
       WHERE ${where}
       ORDER BY sdi.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/sale-delivery/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '', start_date = '', end_date = '', customer_id = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (sd.delivery_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (customer_id) { where += ' AND sd.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) { where += ' AND sd.warehouse_id = ?'; params.push(Number(warehouse_id)); }

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(stats.product_total, 0) AS product_total,
              COALESCE(stats.delivery_total, 0) AS delivery_total,
              COALESCE(stats.total_amount, 0) AS total_amount,
              COALESCE(stats.total_tax, 0) AS total_tax,
              COALESCE(stats.refund_total, 0) AS refund_total,
              COALESCE(stats.return_total, 0) AS return_total
       FROM warehouse w
       LEFT JOIN (
         SELECT sd.warehouse_id,
                COUNT(DISTINCT sdi.product_id) AS product_total,
                SUM(sdi.quantity) AS delivery_total,
                SUM(sdi.amount) AS total_amount,
                SUM(
                  CASE
                    WHEN COALESCE(order_item_stats.total_quantity, 0) > 0
                    THEN COALESCE(order_item_stats.total_tax, 0) * sdi.quantity / order_item_stats.total_quantity
                    ELSE 0
                  END
                ) AS total_tax,
                SUM(COALESCE(return_item_stats.refund_amount, 0)) AS refund_total,
                SUM(COALESCE(return_item_stats.return_quantity, 0)) AS return_total
         FROM sale_delivery_item sdi
         INNER JOIN sale_delivery sd ON sdi.delivery_id = sd.id
         LEFT JOIN product p ON sdi.product_id = p.id
         LEFT JOIN (
           SELECT order_id, product_id,
                  SUM(COALESCE(tax, 0)) AS total_tax,
                  SUM(quantity) AS total_quantity
           FROM sale_order_item
           GROUP BY order_id, product_id
         ) order_item_stats
           ON order_item_stats.order_id = sd.order_id
          AND order_item_stats.product_id = sdi.product_id
         LEFT JOIN (
           SELECT sri.delivery_item_id,
                  SUM(sri.amount) AS refund_amount,
                  SUM(sri.quantity) AS return_quantity
           FROM sale_return_item sri
           INNER JOIN sale_return sr ON sri.return_id = sr.id AND sr.status = 1
           GROUP BY sri.delivery_item_id
         ) return_item_stats ON return_item_stats.delivery_item_id = sdi.id
         WHERE ${where}
         GROUP BY sd.warehouse_id
       ) stats ON stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购订单报表 ====================

router.get('/other-inbound', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      supplier_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (oi.inbound_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND oi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (supplier_id) { where += ' AND oi.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND oi.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);

    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM other_inbound_item oii
       INNER JOIN other_inbound oi ON oii.inbound_id = oi.id
       LEFT JOIN product p ON oii.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT oii.id,
              oii.inbound_id,
              oi.inbound_no,
              oii.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              oii.price AS inbound_price,
              oii.amount AS inbound_total_amount,
              oii.quantity AS inbound_quantity,
              CASE WHEN oii.quantity > 0 THEN COALESCE(oii.tax, 0) / oii.quantity ELSE 0 END AS tax,
              COALESCE(oii.tax, 0) AS tax_total,
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
              sc.name AS supplier_name,
              w.name AS warehouse_name,
              oi.created_at,
              oi.updated_at
       FROM other_inbound_item oii
       INNER JOIN other_inbound oi ON oii.inbound_id = oi.id
       LEFT JOIN product p ON oii.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN supplier_customer sc ON oi.supplier_id = sc.id
       LEFT JOIN warehouse w ON oi.warehouse_id = w.id
       WHERE ${where}
       ORDER BY oii.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-inbound/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '', start_date = '', end_date = '', supplier_id = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (oi.inbound_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND oi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (supplier_id) { where += ' AND oi.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND oi.warehouse_id = ?'; params.push(Number(warehouse_id)); }

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(stats.product_total, 0) AS product_total,
              COALESCE(stats.inbound_total, 0) AS inbound_total,
              COALESCE(stats.inbound_amount, 0) AS inbound_amount,
              COALESCE(stats.tax_total, 0) AS tax_total
       FROM warehouse w
       LEFT JOIN (
         SELECT oi.warehouse_id,
                COUNT(DISTINCT oii.product_id) AS product_total,
                SUM(oii.quantity) AS inbound_total,
                SUM(oii.amount) AS inbound_amount,
                SUM(COALESCE(oii.tax, 0)) AS tax_total
         FROM other_inbound_item oii
         INNER JOIN other_inbound oi ON oii.inbound_id = oi.id
         LEFT JOIN product p ON oii.product_id = p.id
         WHERE ${where}
         GROUP BY oi.warehouse_id
       ) stats ON stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-outbound', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      customer_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (oo.outbound_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND oo.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oo.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (customer_id) { where += ' AND oo.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) { where += ' AND oo.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);

    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM other_outbound_item ooi
       INNER JOIN other_outbound oo ON ooi.outbound_id = oo.id
       LEFT JOIN product p ON ooi.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT ooi.id,
              ooi.outbound_id,
              oo.outbound_no,
              ooi.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              ooi.price AS outbound_price,
              ooi.amount AS outbound_total_amount,
              ooi.quantity AS outbound_quantity,
              CASE WHEN ooi.quantity > 0 THEN COALESCE(ooi.tax, 0) / ooi.quantity ELSE 0 END AS tax,
              COALESCE(ooi.tax, 0) AS tax_total,
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
              sc.name AS customer_name,
              w.name AS warehouse_name,
              oo.created_at,
              oo.updated_at
       FROM other_outbound_item ooi
       INNER JOIN other_outbound oo ON ooi.outbound_id = oo.id
       LEFT JOIN product p ON ooi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN supplier_customer sc ON oo.customer_id = sc.id
       LEFT JOIN warehouse w ON oo.warehouse_id = w.id
       WHERE ${where}
       ORDER BY ooi.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/other-outbound/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '', start_date = '', end_date = '', customer_id = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (oo.outbound_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND oo.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND oo.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (customer_id) { where += ' AND oo.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) { where += ' AND oo.warehouse_id = ?'; params.push(Number(warehouse_id)); }

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(stats.product_total, 0) AS product_total,
              COALESCE(stats.outbound_total, 0) AS outbound_total,
              COALESCE(stats.outbound_amount, 0) AS outbound_amount,
              COALESCE(stats.tax_total, 0) AS tax_total
       FROM warehouse w
       LEFT JOIN (
         SELECT oo.warehouse_id,
                COUNT(DISTINCT ooi.product_id) AS product_total,
                SUM(ooi.quantity) AS outbound_total,
                SUM(ooi.amount) AS outbound_amount,
                SUM(COALESCE(ooi.tax, 0)) AS tax_total
         FROM other_outbound_item ooi
         INNER JOIN other_outbound oo ON ooi.outbound_id = oo.id
         LEFT JOIN product p ON ooi.product_id = p.id
         WHERE ${where}
         GROUP BY oo.warehouse_id
       ) stats ON stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/purchase-order', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      status = '',
      supplier_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (po.order_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND po.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND po.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (status !== undefined && status !== '') { where += ' AND po.status = ?'; params.push(Number(status)); }
    if (supplier_id) { where += ' AND po.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND po.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM purchase_order_item poi
       INNER JOIN purchase_order po ON poi.order_id = po.id
       LEFT JOIN product p ON poi.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT poi.id,
              poi.order_id,
              po.order_no,
              poi.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              CASE
                WHEN COALESCE(inbound_stats.inbound_quantity, 0) > 0
                  THEN COALESCE(inbound_stats.inbound_amount, 0) / inbound_stats.inbound_quantity
                ELSE 0
              END AS inbound_price,
              sc.name AS supplier_name,
              poi.price AS purchase_price,
              poi.amount AS purchase_total_amount,
              poi.quantity AS purchase_quantity,
              CASE WHEN poi.quantity > 0 THEN COALESCE(poi.tax, 0) / poi.quantity ELSE 0 END AS tax,
              COALESCE(poi.tax, 0) AS tax_total,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
              COALESCE(poi.final_price, poi.price) AS final_purchase_price,
              COALESCE(
                poi.final_amount,
                COALESCE(poi.final_quantity, poi.quantity) * COALESCE(poi.final_price, poi.price)
                  + CASE
                      WHEN poi.final_quantity IS NOT NULL THEN COALESCE(poi.final_tax, 0)
                      ELSE COALESCE(poi.tax, 0)
                    END
              ) AS final_purchase_total_amount,
              COALESCE(poi.final_quantity, poi.quantity) AS final_purchase_quantity,
              CASE
                WHEN COALESCE(poi.final_quantity, poi.quantity) > 0
                  THEN (
                    CASE
                      WHEN poi.final_quantity IS NOT NULL THEN COALESCE(poi.final_tax, 0)
                      ELSE COALESCE(poi.tax, 0)
                    END
                  ) / COALESCE(poi.final_quantity, poi.quantity)
                ELSE 0
              END AS final_tax,
              CASE
                WHEN poi.final_quantity IS NOT NULL THEN COALESCE(poi.final_tax, 0)
                ELSE COALESCE(poi.tax, 0)
              END AS final_tax_total,
              COALESCE(inbound_stats.inbound_quantity, 0) AS formal_inbound_quantity,
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
              w.name AS warehouse_name,
              po.created_at,
              po.updated_at
       FROM purchase_order_item poi
       INNER JOIN purchase_order po ON poi.order_id = po.id
       LEFT JOIN product p ON poi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN supplier_customer sc ON po.supplier_id = sc.id
       LEFT JOIN warehouse w ON po.warehouse_id = w.id
       LEFT JOIN (
         SELECT pi.order_id,
                pii.product_id,
                SUM(pii.quantity) AS inbound_quantity,
                SUM(pii.amount) AS inbound_amount
         FROM purchase_inbound_item pii
         INNER JOIN purchase_inbound pi ON pii.inbound_id = pi.id
         WHERE pi.status = 1
         GROUP BY pi.order_id, pii.product_id
       ) inbound_stats ON inbound_stats.order_id = poi.order_id
         AND inbound_stats.product_id = poi.product_id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(pr.order_id, 0), pi.order_id) AS order_id,
                pri.product_id,
                SUM(pri.quantity) AS return_quantity,
                SUM(pri.amount) AS refund_amount
         FROM purchase_return_item pri
         INNER JOIN purchase_return pr ON pri.return_id = pr.id
         LEFT JOIN purchase_inbound pi ON pr.inbound_id = pi.id
         WHERE pr.status = 1
         GROUP BY COALESCE(NULLIF(pr.order_id, 0), pi.order_id), pri.product_id
       ) return_stats ON return_stats.order_id = poi.order_id
         AND return_stats.product_id = poi.product_id
       WHERE ${where}
       ORDER BY poi.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/purchase-order/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const {
      keyword = '',
      start_date = '',
      end_date = '',
      status = '',
      supplier_id = '',
      warehouse_id = ''
    } = req.query;
    const buildWhere = (warehouseExpression, fixedCondition = '1=1') => {
      let where = fixedCondition;
      const params = [];
      if (keyword) {
        where += ' AND (po.order_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      if (start_date) { where += ' AND po.created_at >= ?'; params.push(start_date); }
      if (end_date) { where += ' AND po.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
      if (status !== undefined && status !== '') { where += ' AND po.status = ?'; params.push(Number(status)); }
      if (supplier_id) { where += ' AND po.supplier_id = ?'; params.push(Number(supplier_id)); }
      if (warehouse_id) { where += ` AND ${warehouseExpression} = ?`; params.push(Number(warehouse_id)); }
      return { where, params };
    };
    const purchaseFilter = buildWhere('po.warehouse_id');
    const inboundFilter = buildWhere('pi.warehouse_id', 'pi.status = 1');
    const returnFilter = buildWhere(
      'COALESCE(NULLIF(source_inbound.warehouse_id, 0), po.warehouse_id)',
      'pr.status = 1'
    );

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(purchase_stats.product_total, 0) AS product_total,
              COALESCE(purchase_stats.inbound_amount, 0) AS inbound_amount,
              COALESCE(purchase_stats.tax_total, 0) AS tax_total,
              COALESCE(purchase_stats.final_inbound_amount, 0) AS final_inbound_amount,
              COALESCE(purchase_stats.final_tax_total, 0) AS final_tax_total,
              COALESCE(purchase_stats.final_purchase_total, 0) AS final_purchase_total,
              COALESCE(inbound_stats.formal_inbound_total, 0) AS formal_inbound_total,
              COALESCE(return_stats.refund_total, 0) AS refund_total,
              COALESCE(return_stats.return_total, 0) AS return_total
       FROM warehouse w
       LEFT JOIN (
         SELECT po.warehouse_id,
                COUNT(DISTINCT poi.product_id) AS product_total,
                SUM(COALESCE(poi.amount, 0)) AS inbound_amount,
                SUM(COALESCE(poi.tax, 0)) AS tax_total,
                SUM(
                  COALESCE(
                    poi.final_amount,
                    COALESCE(poi.final_quantity, poi.quantity) * COALESCE(poi.final_price, poi.price)
                      + CASE
                          WHEN poi.final_quantity IS NOT NULL THEN COALESCE(poi.final_tax, 0)
                          ELSE COALESCE(poi.tax, 0)
                        END
                  )
                ) AS final_inbound_amount,
                SUM(
                  CASE
                    WHEN poi.final_quantity IS NOT NULL THEN COALESCE(poi.final_tax, 0)
                    ELSE COALESCE(poi.tax, 0)
                  END
                ) AS final_tax_total,
                SUM(COALESCE(poi.final_quantity, poi.quantity)) AS final_purchase_total
         FROM purchase_order_item poi
         INNER JOIN purchase_order po ON poi.order_id = po.id
         LEFT JOIN product p ON poi.product_id = p.id
         WHERE ${purchaseFilter.where}
         GROUP BY po.warehouse_id
       ) purchase_stats ON purchase_stats.warehouse_id = w.id
       LEFT JOIN (
         SELECT pi.warehouse_id,
                SUM(pii.quantity) AS formal_inbound_total
         FROM purchase_inbound_item pii
         INNER JOIN purchase_inbound pi ON pii.inbound_id = pi.id
         INNER JOIN purchase_order po ON pi.order_id = po.id
         LEFT JOIN product p ON pii.product_id = p.id
         WHERE ${inboundFilter.where}
         GROUP BY pi.warehouse_id
       ) inbound_stats ON inbound_stats.warehouse_id = w.id
       LEFT JOIN (
         SELECT COALESCE(NULLIF(source_inbound.warehouse_id, 0), po.warehouse_id) AS warehouse_id,
                SUM(pri.amount) AS refund_total,
                SUM(pri.quantity) AS return_total
         FROM purchase_return_item pri
         INNER JOIN purchase_return pr ON pri.return_id = pr.id
         LEFT JOIN purchase_inbound source_inbound ON pr.inbound_id = source_inbound.id
         INNER JOIN purchase_order po ON po.id = COALESCE(NULLIF(pr.order_id, 0), source_inbound.order_id)
         LEFT JOIN product p ON pri.product_id = p.id
         WHERE ${returnFilter.where}
         GROUP BY COALESCE(NULLIF(source_inbound.warehouse_id, 0), po.warehouse_id)
       ) return_stats ON return_stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      [...purchaseFilter.params, ...inboundFilter.params, ...returnFilter.params]
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售订单报表 ====================

router.get('/sale-order', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      status = '',
      customer_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (so.order_no LIKE ? OR p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND so.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND so.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (status !== undefined && status !== '') { where += ' AND so.status = ?'; params.push(Number(status)); }
    if (customer_id) { where += ' AND so.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) { where += ' AND so.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM sale_order_item soi
       INNER JOIN sale_order so ON soi.order_id = so.id
       LEFT JOIN product p ON soi.product_id = p.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT soi.id,
              soi.order_id,
              so.order_no,
              soi.product_id,
              p.image_urls AS product_image_urls,
              p.name AS product_name,
              p.code AS product_code,
              p.spec AS product_spec,
              sc.name AS customer_name,
              soi.price AS sale_price,
              soi.amount AS sale_total_amount,
              soi.quantity AS sale_quantity,
              CASE WHEN soi.quantity > 0 THEN COALESCE(soi.tax, 0) / soi.quantity ELSE 0 END AS tax,
              COALESCE(soi.tax, 0) AS tax_total,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
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
              w.name AS warehouse_name,
              so.created_at,
              so.updated_at
       FROM sale_order_item soi
       INNER JOIN sale_order so ON soi.order_id = so.id
       LEFT JOIN product p ON soi.product_id = p.id
       LEFT JOIN unit u ON p.unit_id = u.id
       LEFT JOIN supplier_customer sc ON so.customer_id = sc.id
       LEFT JOIN warehouse w ON so.warehouse_id = w.id
       LEFT JOIN (
         SELECT sd.order_id,
                sri.product_id,
                SUM(sri.amount) AS refund_amount,
                SUM(sri.quantity) AS return_quantity
         FROM sale_return_item sri
         INNER JOIN sale_return sr ON sri.return_id = sr.id
         INNER JOIN sale_delivery sd ON sr.delivery_id = sd.id
         WHERE sr.status = 1
         GROUP BY sd.order_id, sri.product_id
       ) return_stats ON return_stats.order_id = soi.order_id
         AND return_stats.product_id = soi.product_id
       WHERE ${where}
       ORDER BY soi.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/sale-order/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const {
      keyword = '',
      start_date = '',
      end_date = '',
      status = '',
      customer_id = '',
      warehouse_id = ''
    } = req.query;
    const buildWhere = (productAlias) => {
      let where = '1=1';
      const params = [];
      if (keyword) {
        where += ` AND (so.order_no LIKE ? OR ${productAlias}.name LIKE ? OR ${productAlias}.code LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      if (start_date) { where += ' AND so.created_at >= ?'; params.push(start_date); }
      if (end_date) { where += ' AND so.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
      if (status !== undefined && status !== '') { where += ' AND so.status = ?'; params.push(Number(status)); }
      if (customer_id) { where += ' AND so.customer_id = ?'; params.push(Number(customer_id)); }
      if (warehouse_id) { where += ' AND so.warehouse_id = ?'; params.push(Number(warehouse_id)); }
      return { where, params };
    };
    const saleFilter = buildWhere('p');
    const returnFilter = buildWhere('return_product');

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(sale_stats.product_total, 0) AS product_total,
              COALESCE(sale_stats.sale_total, 0) AS sale_total,
              COALESCE(sale_stats.sale_amount, 0) AS sale_amount,
              COALESCE(sale_stats.tax_total, 0) AS tax_total,
              COALESCE(return_stats.return_total, 0) AS return_total,
              COALESCE(return_stats.refund_total, 0) AS refund_total
       FROM warehouse w
       LEFT JOIN (
         SELECT so.warehouse_id,
                COUNT(DISTINCT soi.product_id) AS product_total,
                SUM(soi.quantity) AS sale_total,
                SUM(soi.amount) AS sale_amount,
                SUM(COALESCE(soi.tax, 0)) AS tax_total
         FROM sale_order_item soi
         INNER JOIN sale_order so ON soi.order_id = so.id
         LEFT JOIN product p ON soi.product_id = p.id
         WHERE ${saleFilter.where}
         GROUP BY so.warehouse_id
       ) sale_stats ON sale_stats.warehouse_id = w.id
       LEFT JOIN (
         SELECT so.warehouse_id,
                SUM(sri.quantity) AS return_total,
                SUM(sri.amount) AS refund_total
         FROM sale_return_item sri
         INNER JOIN sale_return sr ON sri.return_id = sr.id AND sr.status = 1
         INNER JOIN sale_delivery sd ON sr.delivery_id = sd.id
         INNER JOIN sale_order so ON sd.order_id = so.id
         LEFT JOIN product return_product ON sri.product_id = return_product.id
         WHERE ${returnFilter.where}
         GROUP BY so.warehouse_id
       ) return_stats ON return_stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      [...saleFilter.params, ...returnFilter.params]
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 采购付款报表 ====================

router.get('/payment', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      supplier_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (po.order_no LIKE ? OR fp.payment_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND fp.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fp.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (supplier_id) { where += ' AND fp.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND po.warehouse_id = ?'; params.push(Number(warehouse_id)); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fp.id,
              fp.payment_no,
              po.order_no,
              fp.supplier_id,
              sc.name AS supplier_name,
              COALESCE(NULLIF(fp.pay_method, ''), po.payment_method) AS pay_method,
              COALESCE(fp.amount, 0) AS payment_amount,
              fp.payer,
              COALESCE(fp.pay_time, fp.payment_completed_time, fp.payment_start_time, fp.updated_at) AS payment_time,
              COALESCE(NULLIF(fp.remark, ''), po.purchase_remark, po.admin_remark) AS remark,
              w.name AS warehouse_name,
              COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) AS payable_amount,
              GREATEST(
                COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) - COALESCE(fp.amount, 0),
                0
              ) AS unpaid_amount,
              fp.created_at,
              fp.updated_at
       FROM finance_payment fp
       LEFT JOIN purchase_order po ON fp.order_id = po.id
       LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
       LEFT JOIN warehouse w ON po.warehouse_id = w.id
       WHERE ${where}
       ORDER BY fp.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/payment/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '', start_date = '', end_date = '', supplier_id = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (po.order_no LIKE ? OR fp.payment_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND fp.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fp.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (supplier_id) { where += ' AND fp.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (warehouse_id) { where += ' AND po.warehouse_id = ?'; params.push(Number(warehouse_id)); }

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(stats.payable_total, 0) AS payable_total,
              COALESCE(stats.unpaid_total, 0) AS unpaid_total,
              COALESCE(stats.paid_total, 0) AS paid_total
       FROM warehouse w
       LEFT JOIN (
         SELECT po.warehouse_id,
                SUM(COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0)) AS payable_total,
                SUM(
                  GREATEST(
                    COALESCE(NULLIF(fp.should_amount, 0), po.total_amount, 0) - COALESCE(fp.amount, 0),
                    0
                  )
                ) AS unpaid_total,
                SUM(COALESCE(fp.amount, 0)) AS paid_total
         FROM finance_payment fp
         LEFT JOIN purchase_order po ON fp.order_id = po.id
         LEFT JOIN supplier_customer sc ON fp.supplier_id = sc.id
         WHERE ${where}
         GROUP BY po.warehouse_id
       ) stats ON stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 销售收款报表 ====================

router.get('/receipt', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      start_date = '',
      end_date = '',
      customer_id = '',
      warehouse_id = ''
    } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (so.order_no LIKE ? OR fr.receipt_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND fr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (customer_id) { where += ' AND fr.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) {
      where += ' AND COALESCE(NULLIF(so.warehouse_id, 0), sd.warehouse_id) = ?';
      params.push(Number(warehouse_id));
    }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
       WHERE ${where}`,
      params
    );
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT fr.id,
              fr.receipt_no,
              so.order_no,
              fr.customer_id,
              sc.name AS customer_name,
              COALESCE(NULLIF(fr.pay_method, ''), so.payment_method) AS pay_method,
              COALESCE(fr.amount, 0) AS receipt_amount,
              u.real_name AS receiver_name,
              COALESCE(fr.payment_completed_time, fr.payment_start_time, fr.updated_at) AS receipt_time,
              COALESCE(NULLIF(fr.remark, ''), so.sale_remark, so.admin_remark) AS remark,
              w.name AS warehouse_name,
              COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) AS receivable_amount,
              GREATEST(
                COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) - COALESCE(fr.amount, 0),
                0
              ) AS unreceived_amount,
              fr.created_at,
              fr.updated_at
       FROM finance_receipt fr
       LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
       LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
       LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
       LEFT JOIN sys_user u ON fr.creator_id = u.id
       LEFT JOIN warehouse w ON w.id = COALESCE(NULLIF(so.warehouse_id, 0), sd.warehouse_id)
       WHERE ${where}
       ORDER BY fr.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/receipt/warehouse-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { keyword = '', start_date = '', end_date = '', customer_id = '', warehouse_id = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (so.order_no LIKE ? OR fr.receipt_no LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (start_date) { where += ' AND fr.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND fr.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    if (customer_id) { where += ' AND fr.customer_id = ?'; params.push(Number(customer_id)); }
    if (warehouse_id) {
      where += ' AND COALESCE(NULLIF(so.warehouse_id, 0), sd.warehouse_id) = ?';
      params.push(Number(warehouse_id));
    }

    const [list] = await pool.execute(
      `SELECT w.id,
              w.name AS warehouse_name,
              COALESCE(stats.receivable_total, 0) AS receivable_total,
              COALESCE(stats.unreceived_total, 0) AS unreceived_total,
              COALESCE(stats.received_total, 0) AS received_total
       FROM warehouse w
       LEFT JOIN (
         SELECT COALESCE(NULLIF(so.warehouse_id, 0), sd.warehouse_id) AS warehouse_id,
                SUM(COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0)) AS receivable_total,
                SUM(
                  GREATEST(
                    COALESCE(NULLIF(fr.should_amount, 0), so.total_amount, 0) - COALESCE(fr.amount, 0),
                    0
                  )
                ) AS unreceived_total,
                SUM(COALESCE(fr.amount, 0)) AS received_total
         FROM finance_receipt fr
         LEFT JOIN sale_delivery sd ON fr.delivery_id = sd.id
         LEFT JOIN sale_order so ON so.id = COALESCE(NULLIF(fr.order_id, 0), sd.order_id)
         LEFT JOIN supplier_customer sc ON fr.customer_id = sc.id
         WHERE ${where}
         GROUP BY COALESCE(NULLIF(so.warehouse_id, 0), sd.warehouse_id)
       ) stats ON stats.warehouse_id = w.id
       ORDER BY w.id ASC`,
      params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 入库汇总（按产品） ====================

router.get('/inbound-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND pi.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND pi.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const [list] = await pool.execute(
      `SELECT pii.product_id, p.name AS product_name, p.code, SUM(pii.quantity) AS total_quantity, SUM(pii.amount) AS total_amount
       FROM purchase_inbound_item pii
       LEFT JOIN purchase_inbound pi ON pii.inbound_id = pi.id
       LEFT JOIN product p ON pii.product_id = p.id
       WHERE ${where}
       GROUP BY pii.product_id, p.name, p.code ORDER BY total_amount DESC`, params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 出库汇总（按产品） ====================

router.get('/outbound-summary', async (req, res) => {
  try {
    const pool = getPool();
    const { start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (start_date) { where += ' AND sd.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND sd.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const [list] = await pool.execute(
      `SELECT sdi.product_id, p.name AS product_name, p.code, SUM(sdi.quantity) AS total_quantity, SUM(sdi.amount) AS total_amount
       FROM sale_delivery_item sdi
       LEFT JOIN sale_delivery sd ON sdi.delivery_id = sd.id
       LEFT JOIN product p ON sdi.product_id = p.id
       WHERE ${where}
       GROUP BY sdi.product_id, p.name, p.code ORDER BY total_amount DESC`, params
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

module.exports = router;
