async function resolveInlineProduct(conn, item, options = {}) {
  if (Number(item.product_id || 0) > 0) return Number(item.product_id);

  const name = String(item.product_name || '').trim();
  if (!name) throw new Error('产品标题不能为空');

  const unitName = String(item.unit_name || '').trim() || '个';
  const unitId = await resolveUnitId(conn, unitName);
  const code = String(item.code || '').trim() || await generateProductCode(conn);
  const spec = String(item.spec || '').trim();
  const price = Number(item.price || 0);
  const baseQuantity = Math.max(Number(item.base_quantity || 1), 1);
  const supplierId = Number(options.supplierId || 0);
  const warehouseId = Number(options.warehouseId || 0);

  const [result] = await conn.execute(
    `INSERT INTO product
     (name, code, barcode, spec, unit_id, category_id, brand_id, default_supplier_id,
      cost_price, sale_price, description, image_urls, status)
     VALUES (?,?,?,?,?,0,0,?,?,0,'',?,1)`,
    [name, code, '', spec, unitId, supplierId, price, JSON.stringify([])]
  );
  const productId = result.insertId;

  await conn.execute(
    `INSERT INTO product_unit
     (product_id, unit_id, warehouse_id, is_base, base_quantity, code, barcode,
      cost_price, sale_price, member_prices, spec, sort_order)
     VALUES (?,?,?,1,?,?,?,?,0,?,?,0)`,
    [
      productId,
      unitId,
      warehouseId,
      baseQuantity,
      code,
      '',
      price,
      JSON.stringify({}),
      spec
    ]
  );

  return productId;
}

async function resolveUnitId(conn, name) {
  const [rows] = await conn.execute('SELECT id FROM unit WHERE name = ? LIMIT 1', [name]);
  if (rows.length) return rows[0].id;
  const [result] = await conn.execute('INSERT INTO unit (name) VALUES (?)', [name]);
  return result.insertId;
}

async function generateProductCode(conn) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  for (let i = 0; i < 20; i += 1) {
    const code = `pu${date}${randomChars(3)}`;
    const [rows] = await conn.execute('SELECT id FROM product WHERE code = ? LIMIT 1', [code]);
    if (!rows.length) return code;
  }
  return `pu${date}${randomChars(3)}${Date.now().toString(36).slice(-2)}`;
}

function randomChars(length) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }
  return text;
}

module.exports = { resolveInlineProduct };
