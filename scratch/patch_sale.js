const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/Administrator/Desktop/ERP/server/src/routes/sale.js';
let content = fs.readFileSync(filePath, 'utf8');

const queryStart = "SELECT sd.*, so.order_no, so.employee_id, so.admin_remark, so.sale_remark,";
// Find queryStart after line 600 or so to make sure it's in the delivery route
let startIndex = content.indexOf(queryStart);
// Let's verify we found the one that matches delivery (there is only one SELECT query in get('/delivery/:id') that has sd.*)
// Let's look for "FROM sale_delivery sd" inside it
while (startIndex !== -1) {
  const checkSlice = content.substring(startIndex, startIndex + 1000);
  if (checkSlice.includes("FROM sale_delivery sd")) {
    break;
  }
  startIndex = content.indexOf(queryStart, startIndex + 1);
}

if (startIndex === -1) {
  console.error("Error: Start of query not found!");
  process.exit(1);
}

const endStr = "WHERE sd.id = ?`";
const endIndex = content.indexOf(endStr, startIndex);
if (endIndex === -1) {
  console.error("Error: End of query not found!");
  process.exit(1);
}

const originalQuery = content.substring(startIndex, endIndex + endStr.length);
console.log("Found original query length:", originalQuery.length);

const newQuery = `SELECT sd.*, so.order_no, so.employee_id, so.admin_remark, so.sale_remark,
              sc.name AS customer_name, e.name AS employee_name, w.name AS warehouse_name,
              COALESCE(NULLIF(so.customer_contact, ''), sc.contact) AS contact,
              COALESCE(NULLIF(so.customer_phone, ''), sc.phone) AS phone,
              COALESCE(NULLIF(so.detail_address, ''), sc.address) AS detail_address,
              CASE WHEN COALESCE(return_stats.return_quantity, 0) > 0 THEN 1 ELSE 0 END AS return_status,
              COALESCE(order_item_stats.total_tax, 0) AS total_tax,
              COALESCE(return_stats.refund_amount, 0) AS refund_amount,
              COALESCE(return_stats.return_quantity, 0) AS return_quantity,
              COALESCE(item_stats.item_count, 0) AS item_count,
              CASE WHEN COALESCE(item_stats.item_count, 0) = 1 THEN COALESCE(item_stats.single_price, 0) ELSE NULL END AS unit_price
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
         SELECT delivery_id,
                COUNT(*) AS item_count,
                MAX(price) AS single_price
         FROM sale_delivery_item
         GROUP BY delivery_id
       ) item_stats ON sd.id = item_stats.delivery_id
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
       WHERE sd.id = ?\``;

content = content.replace(originalQuery, newQuery);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Replaced successfully!");
