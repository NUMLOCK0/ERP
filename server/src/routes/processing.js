const express = require('express');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const { generateBusinessNo, generateTempBusinessNo } = require('../utils/bizNo');

const PROCESSING_STATUS = {
  DRAFT: 0,
  PROCESSING: 1,
  INBOUNDED: 2,
  CANCELED: 3,
  PENDING_INBOUND: 4,
  CLOSED: 5
};

const STAGES = [
  { key: 'raw_package', name: '原包货', sort: 1, input: 'source' },
  { key: 'screening', name: '过筛', sort: 2, input: 'source' },
  { key: 'color_sorting', name: '色选', sort: 3, input: 'source', next: 'general_sorting' },
  { key: 'general_sorting', name: '普选', sort: 4, input: 'color_sorting', next: 'fine_sorting' },
  { key: 'fine_sorting', name: '精选', sort: 5, input: 'general_sorting' }
];

const SOURCE_STAGE_KEYS = STAGES.filter(stage => stage.input === 'source').map(stage => stage.key);

router.get('/order', async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      status = '',
      source_warehouse_id = '',
      target_warehouse_id = '',
      start_date = '',
      end_date = ''
    } = req.query;

    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (hpo.batch_no LIKE ? OR sp.name LIKE ? OR sc.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status !== '') { where += ' AND hpo.status = ?'; params.push(Number(status)); }
    if (source_warehouse_id) { where += ' AND hpo.source_warehouse_id = ?'; params.push(Number(source_warehouse_id)); }
    if (target_warehouse_id) { where += ' AND hpo.target_warehouse_id = ?'; params.push(Number(target_warehouse_id)); }
    if (start_date) { where += ' AND hpo.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND hpo.created_at <= ?'; params.push(`${end_date} 23:59:59`); }

    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM herb_processing_order hpo
       LEFT JOIN product sp ON hpo.source_product_id = sp.id
       LEFT JOIN supplier_customer sc ON hpo.supplier_id = sc.id
       WHERE ${where}`,
      params
    );
    const [list] = await pool.execute(
      `SELECT hpo.*,
              sp.name AS source_product_name,
              sp.code AS source_product_code,
              su.name AS source_unit_name,
              sw.name AS source_warehouse_name,
              tw.name AS target_warehouse_name,
              sc.name AS supplier_name,
              u.real_name AS creator_name,
              stage_stats.total_stage_count,
              stage_stats.finished_stage_count,
              stage_stats.current_stage_name,
              stage_stats.generated_quantity,
              stage_stats.generated_amount
       FROM herb_processing_order hpo
       LEFT JOIN product sp ON hpo.source_product_id = sp.id
       LEFT JOIN unit su ON sp.unit_id = su.id
       LEFT JOIN warehouse sw ON hpo.source_warehouse_id = sw.id
       LEFT JOIN warehouse tw ON hpo.target_warehouse_id = tw.id
       LEFT JOIN supplier_customer sc ON hpo.supplier_id = sc.id
       LEFT JOIN sys_user u ON hpo.creator_id = u.id
       LEFT JOIN (
         SELECT order_id,
                COUNT(*) AS total_stage_count,
                SUM(CASE WHEN processed_at IS NOT NULL THEN 1 ELSE 0 END) AS finished_stage_count,
                SUBSTRING_INDEX(
                  GROUP_CONCAT(CASE WHEN processed_at IS NULL THEN stage_name END ORDER BY sort_order SEPARATOR ','),
                  ',', 1
                ) AS current_stage_name,
                SUM(output_quantity + byproduct_quantity) AS generated_quantity,
                SUM(output_quantity * output_unit_price + byproduct_quantity * byproduct_unit_price) AS generated_amount
         FROM herb_processing_stage
         WHERE stage_key <> 'raw_material'
         GROUP BY order_id
       ) stage_stats ON hpo.id = stage_stats.order_id
       WHERE ${where}
       ORDER BY hpo.id DESC
       LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );

    res.json(Response.paginate(list, Number(totalRows[0].cnt), Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/order/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT hpo.*,
              sp.name AS source_product_name,
              sp.code AS source_product_code,
              su.name AS source_unit_name,
              sw.name AS source_warehouse_name,
              tw.name AS target_warehouse_name,
              sc.name AS supplier_name,
              u.real_name AS creator_name
       FROM herb_processing_order hpo
       LEFT JOIN product sp ON hpo.source_product_id = sp.id
       LEFT JOIN unit su ON sp.unit_id = su.id
       LEFT JOIN warehouse sw ON hpo.source_warehouse_id = sw.id
       LEFT JOIN warehouse tw ON hpo.target_warehouse_id = tw.id
       LEFT JOIN supplier_customer sc ON hpo.supplier_id = sc.id
       LEFT JOIN sys_user u ON hpo.creator_id = u.id
       WHERE hpo.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('加工批次不存在'));

    const order = rows[0];
    try {
      order.image_urls = JSON.parse(order.image_urls || '[]');
    } catch (e) {
      order.image_urls = [];
    }
    await normalizeOrderStages(pool, order.id);
    const [stages] = await pool.execute(
      `SELECT hps.*,
              op.name AS output_product_name,
              op.code AS output_product_code,
              bp.name AS byproduct_product_name,
              bp.code AS byproduct_product_code
       FROM herb_processing_stage hps
       LEFT JOIN product op ON hps.output_product_id = op.id
       LEFT JOIN product bp ON hps.byproduct_product_id = bp.id
       WHERE hps.order_id = ? AND hps.stage_key <> 'raw_material'
       ORDER BY hps.sort_order ASC`,
      [order.id]
    );
    const [inboundItems] = await pool.execute(
      `SELECT hpi.*, p.name AS product_name, p.code AS product_code, w.name AS warehouse_name
       FROM herb_processing_inbound_item hpi
       LEFT JOIN product p ON hpi.product_id = p.id
       LEFT JOIN warehouse w ON hpi.warehouse_id = w.id
       WHERE hpi.order_id = ?
       ORDER BY hpi.id ASC`,
      [order.id]
    );
    order.stages = stages;
    order.inbound_items = inboundItems;
    res.json(Response.success(order));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const {
      source_product_id,
      source_warehouse_id,
      target_warehouse_id,
      supplier_id = 0,
      source_quantity,
      source_unit_price = 0,
      remark = '',
      image_urls
    } = req.body;

    if (!source_product_id) throw new Error('请选择采购原包货');
    if (!source_warehouse_id) throw new Error('请选择原包货仓库');
    if (!target_warehouse_id) throw new Error('请选择加工产品入库仓库');
    if (Number(source_quantity || 0) <= 0) throw new Error('原包货数量必须大于0');
    if (Number(source_unit_price || 0) < 0) throw new Error('采购单价不能小于0');

    await conn.beginTransaction();
    const tempNo = await generateTempNo(conn);
    const [result] = await conn.execute(
      `INSERT INTO herb_processing_order
       (batch_no, source_product_id, source_warehouse_id, target_warehouse_id, supplier_id,
        source_quantity, source_unit_price, status, remark, creator_id, image_urls)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tempNo,
        source_product_id,
        source_warehouse_id,
        target_warehouse_id,
        supplier_id || 0,
        Number(source_quantity),
        Number(source_unit_price || 0),
        PROCESSING_STATUS.DRAFT,
        remark,
        req.user.id,
        JSON.stringify(image_urls || [])
      ]
    );
    const orderId = result.insertId;
    const batchNo = await generateBatchNo(conn, orderId);
    await conn.execute('UPDATE herb_processing_order SET batch_no = ? WHERE id = ?', [batchNo, orderId]);

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '新增药材加工批次', batchNo);
    res.json(Response.success({ id: orderId, batch_no: batchNo }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.put('/order/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM herb_processing_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('加工批次不存在'));
    if (Number(order.status) !== PROCESSING_STATUS.DRAFT) return res.json(Response.error('仅待开工批次允许编辑'));

    const sourceQuantity = Number(req.body.source_quantity ?? order.source_quantity);
    const sourceUnitPrice = Number(req.body.source_unit_price ?? order.source_unit_price);
    if (sourceQuantity <= 0) return res.json(Response.error('原包货数量必须大于0'));
    if (sourceUnitPrice < 0) return res.json(Response.error('采购单价不能小于0'));

    await pool.execute(
      `UPDATE herb_processing_order
       SET source_product_id = ?, source_warehouse_id = ?, target_warehouse_id = ?, supplier_id = ?,
           source_quantity = ?, source_unit_price = ?, remark = ?, image_urls = ?
       WHERE id = ?`,
      [
        req.body.source_product_id ?? order.source_product_id,
        req.body.source_warehouse_id ?? order.source_warehouse_id,
        req.body.target_warehouse_id ?? order.target_warehouse_id,
        req.body.supplier_id ?? order.supplier_id,
        sourceQuantity,
        sourceUnitPrice,
        req.body.remark ?? order.remark,
        JSON.stringify(req.body.image_urls || []),
        order.id
      ]
    );
    await pool.execute(
      `UPDATE herb_processing_stage SET input_quantity = 0
       WHERE order_id = ? AND stage_key IN (${SOURCE_STAGE_KEYS.map(() => '?').join(',')})`,
      [order.id, ...SOURCE_STAGE_KEYS]
    );
    await writeSystemLog(pool, req.user.id, '加工管理', '编辑药材加工批次', order.batch_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/start', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.DRAFT) throw new Error('仅待开工批次允许开工');

    await assertStockEnough(conn, order.source_product_id, order.source_warehouse_id, Number(order.source_quantity));
    await updateStock(
      conn,
      order.source_product_id,
      order.source_warehouse_id,
      -Number(order.source_quantity),
      'herb_processing_issue',
      order.batch_no,
      '药材加工原包货领料'
    );
    await conn.execute(
      'UPDATE herb_processing_order SET status = ?, start_time = NOW() WHERE id = ?',
      [PROCESSING_STATUS.PROCESSING, order.id]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '加工批次开工领料', order.batch_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/stage', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute('SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = orders[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PROCESSING) throw new Error('仅加工中批次允许添加工序');

    const stageConfig = getStageConfig(req.body.stage_key);
    if (!stageConfig) throw new Error('请选择正确的加工工序');

    const [existing] = await conn.execute(
      'SELECT id FROM herb_processing_stage WHERE order_id = ? AND stage_key = ? LIMIT 1',
      [order.id, stageConfig.key]
    );
    if (existing.length) throw new Error(`${stageConfig.name}工序已存在`);

    let inputQuantity = 0;
    if (stageConfig.input !== 'source') {
      const [upstreamRows] = await conn.execute(
        'SELECT * FROM herb_processing_stage WHERE order_id = ? AND stage_key = ? LIMIT 1',
        [order.id, stageConfig.input]
      );
      const upstreamStage = upstreamRows[0];
      if (!upstreamStage) throw new Error(`请先添加${stageNameOf(stageConfig.input)}工序`);
      inputQuantity = Number(upstreamStage.transfer_quantity || 0);
    }

    const [result] = await conn.execute(
      `INSERT INTO herb_processing_stage
       (order_id, stage_key, stage_name, input_quantity, sort_order)
       VALUES (?,?,?,?,?)`,
      [order.id, stageConfig.key, stageConfig.name, inputQuantity, stageConfig.sort]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '添加加工工序', `${order.batch_no}/${stageConfig.name}`);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.put('/order/:id/stage/:stageKey', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute('SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = orders[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PROCESSING) throw new Error('仅加工中批次允许填写工序');

    const stageConfig = getStageConfig(req.params.stageKey);
    if (!stageConfig) throw new Error('工序不存在');
    const [stageRows] = await conn.execute(
      `SELECT * FROM herb_processing_stage
       WHERE order_id = ? AND stage_key <> 'raw_material'
       ORDER BY sort_order ASC FOR UPDATE`,
      [order.id]
    );
    const stage = stageRows.find(item => item.stage_key === stageConfig.key);
    if (!stage) throw new Error('工序不存在');
    const upstreamStage = stageConfig.input === 'source' ? null : stageRows.find(item => item.stage_key === stageConfig.input);
    if (stageConfig.input !== 'source' && !upstreamStage) throw new Error(`请先添加${stageNameOf(stageConfig.input)}工序`);
    if (upstreamStage && !upstreamStage.processed_at) throw new Error(`请先完成${upstreamStage.stage_name}`);
    const nextStage = stageConfig.next ? stageRows.find(item => item.stage_key === stageConfig.next) : null;
    if (nextStage?.processed_at) throw new Error(`${nextStage.stage_name}已完成，不能再修改${stage.stage_name}`);

    const inputQuantity = stageConfig.input === 'source'
      ? Number(req.body.input_quantity ?? stage.input_quantity ?? 0)
      : Number(upstreamStage?.transfer_quantity || 0);
    const outputProductId = Number(req.body.output_product_id || 0);
    const outputQuantity = Number(req.body.output_quantity || 0);
    const outputUnitPrice = Number(req.body.output_unit_price || 0);
    const transferQuantity = Number(req.body.transfer_quantity || 0);
    const byproductProductId = Number(req.body.byproduct_product_id || 0);
    const byproductQuantity = Number(req.body.byproduct_quantity || 0);
    const byproductUnitPrice = Number(req.body.byproduct_unit_price || 0);
    const lossQuantity = Number(req.body.loss_quantity || 0);
    const operator = await resolveOperator(conn, req.body.operator_id, req.body.operator_name, req.user.id);
    const quantities = [inputQuantity, outputQuantity, transferQuantity, byproductQuantity, lossQuantity];
    if (quantities.some(value => !Number.isFinite(value) || value < 0)) throw new Error('工序数量不能小于0');
    if (inputQuantity <= 0) throw new Error(`${stage.stage_name}投入数量必须大于0`);
    assertSourceStageInputWithinOrder(stageRows, stage.stage_key, inputQuantity, Number(order.source_quantity));
    if (!outputProductId || outputQuantity <= 0 || outputUnitPrice <= 0) throw new Error(`${stage.stage_name}的等级产品、数量和单价必须填写`);
    if (!byproductProductId || byproductQuantity <= 0 || byproductUnitPrice < 0) throw new Error(`${stage.stage_name}的下料产品、数量和单价必须填写`);
    if (stageConfig.next && transferQuantity <= 0) throw new Error(`${stage.stage_name}流转到下一工序的数量必须大于0`);
    if (!stageConfig.next && transferQuantity !== 0) throw new Error(`${stage.stage_name}没有下道工序，流转数量必须为0`);

    const accountedQuantity = outputQuantity + transferQuantity + byproductQuantity + lossQuantity;
    if (Math.abs(inputQuantity - accountedQuantity) > 0.001) {
      throw new Error(`数量不平衡：投入${formatNumber(inputQuantity)}，产出、流转、下料和损耗合计${formatNumber(accountedQuantity)}`);
    }

    await conn.execute(
      `UPDATE herb_processing_stage
       SET is_skipped = 0, input_quantity = ?, output_product_id = ?, output_quantity = ?, output_unit_price = ?,
           transfer_quantity = ?, byproduct_product_id = ?, byproduct_quantity = ?, byproduct_unit_price = ?,
           return_quantity = ?, loss_quantity = ?, operator_id = ?, operator_name = ?, processed_at = ?, remark = ?
       WHERE id = ?`,
      [
        inputQuantity,
        outputProductId,
        outputQuantity,
        outputUnitPrice,
        transferQuantity,
        byproductProductId,
        byproductQuantity,
        byproductUnitPrice,
        byproductQuantity,
        lossQuantity,
        operator.id,
        operator.name,
        req.body.processed_at || new Date(),
        req.body.remark || '',
        stage.id
      ]
    );
    if (nextStage) {
      await conn.execute(
        'UPDATE herb_processing_stage SET input_quantity = ? WHERE id = ?',
        [transferQuantity, nextStage.id]
      );
    }
    if (stage.stage_key === 'fine_sorting') {
      await conn.execute(
        'UPDATE herb_processing_order SET target_product_id = ? WHERE id = ?',
        [outputProductId, order.id]
      );
    }

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '登记加工工序产出', `${order.batch_no}/${stage.stage_name}`);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/stage/:stageKey/skip', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute(
      'SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const order = orders[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PROCESSING) throw new Error('仅加工中批次允许跳过工序');

    const [stages] = await conn.execute(
      `SELECT * FROM herb_processing_stage
       WHERE order_id = ? AND stage_key <> 'raw_material'
       ORDER BY sort_order ASC FOR UPDATE`,
      [order.id]
    );
    const stageConfig = getStageConfig(req.params.stageKey);
    if (!stageConfig) throw new Error('工序不存在');
    if (stageConfig.key === 'fine_sorting') throw new Error('精选是最后一道工序，不能跳过');

    const stage = stages.find(item => item.stage_key === stageConfig.key);
    if (!stage) throw new Error('工序不存在');
    const upstreamStage = stageConfig.input === 'source' ? null : stages.find(item => item.stage_key === stageConfig.input);
    if (stageConfig.input !== 'source' && !upstreamStage) throw new Error(`请先添加${stageNameOf(stageConfig.input)}工序`);
    if (upstreamStage && !upstreamStage.processed_at) throw new Error(`请先完成${upstreamStage.stage_name}`);
    const nextStage = stageConfig.next ? stages.find(item => item.stage_key === stageConfig.next) : null;
    if (nextStage?.processed_at) throw new Error(`${nextStage.stage_name}已完成，不能再跳过${stage.stage_name}`);
    if (stage.processed_at) throw new Error(`${stage.stage_name}已完成，不能跳过`);
    const inputQuantity = stageConfig.input === 'source'
      ? Number(req.body?.input_quantity ?? stage.input_quantity ?? 0)
      : Number(upstreamStage?.transfer_quantity || 0);
    if (!Number.isFinite(inputQuantity) || inputQuantity < 0) throw new Error('工序数量不能小于0');
    if (nextStage && inputQuantity <= 0) throw new Error('当前工序没有可流转的投入数量');
    assertSourceStageInputWithinOrder(stages, stage.stage_key, inputQuantity, Number(order.source_quantity));
    const operator = await resolveOperator(conn, req.body?.operator_id, req.body?.operator_name, req.user.id);

    await conn.execute(
      `UPDATE herb_processing_stage
       SET is_skipped = 1, input_quantity = ?, output_product_id = 0, output_quantity = 0,
           output_unit_price = 0, transfer_quantity = ?, byproduct_product_id = 0,
           byproduct_quantity = 0, byproduct_unit_price = 0, return_quantity = 0,
           loss_quantity = 0, operator_id = ?, operator_name = ?, processed_at = NOW(),
           remark = ?
       WHERE id = ?`,
      [inputQuantity, nextStage ? inputQuantity : 0, operator.id, operator.name, req.body?.remark || '已跳过该工序', stage.id]
    );
    if (nextStage) {
      await conn.execute(
        'UPDATE herb_processing_stage SET input_quantity = ? WHERE id = ?',
        [inputQuantity, nextStage.id]
      );
    }

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '跳过加工工序', `${order.batch_no}/${stage.stage_name}`);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.delete('/order/:id/stage/:stageKey', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute(
      'SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const order = orders[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PROCESSING) throw new Error('仅加工中批次允许删除工序');

    const stageConfig = getStageConfig(req.params.stageKey);
    if (!stageConfig) throw new Error('工序不存在');
    const [stages] = await conn.execute(
      `SELECT * FROM herb_processing_stage
       WHERE order_id = ? AND stage_key <> 'raw_material'
       ORDER BY sort_order ASC FOR UPDATE`,
      [order.id]
    );
    const stage = stages.find(item => item.stage_key === stageConfig.key);
    if (!stage) throw new Error('工序不存在');
    if (stage.processed_at || Number(stage.is_skipped)) throw new Error('已完成或已跳过的工序不能删除');

    const downstreamConfig = STAGES.find(item => item.input === stageConfig.key);
    const downstreamStage = downstreamConfig ? stages.find(item => item.stage_key === downstreamConfig.key) : null;
    if (downstreamStage) throw new Error(`请先删除下游${downstreamStage.stage_name}工序`);

    const [inboundRows] = await conn.execute(
      'SELECT id FROM herb_processing_inbound_item WHERE stage_id = ? LIMIT 1',
      [stage.id]
    );
    if (inboundRows.length) throw new Error('该工序已生成入库记录，不能删除');

    await conn.execute('DELETE FROM herb_processing_stage WHERE id = ?', [stage.id]);
    await conn.commit();

    await writeSystemLog(getPool(), req.user.id, '加工管理', '删除加工工序', `${order.batch_no}/${stage.stage_name}`);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/complete', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PROCESSING) throw new Error('仅加工中批次允许提交入库');

    const [stages] = await conn.execute(
      `SELECT * FROM herb_processing_stage
       WHERE order_id = ? AND stage_key <> 'raw_material'
       ORDER BY sort_order ASC`,
      [order.id]
    );
    validateAllStages(stages, order.source_quantity);
    const generatedQuantity = sumBy(stages, 'output_quantity') + sumBy(stages, 'byproduct_quantity');
    const byproductQuantity = sumBy(stages, 'byproduct_quantity');
    const lossQuantity = sumBy(stages, 'loss_quantity');

    await conn.execute(
      `UPDATE herb_processing_order
       SET status = ?, processed_quantity = ?, return_quantity = ?, loss_quantity = ?, completed_time = NOW()
       WHERE id = ?`,
      [PROCESSING_STATUS.PENDING_INBOUND, generatedQuantity, byproductQuantity, lossQuantity, order.id]
    );
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '加工完成待入库', order.batch_no);
    res.json(Response.success());
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
    const [rows] = await conn.execute('SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PENDING_INBOUND) throw new Error('仅待入库批次允许确认入库');

    const [existing] = await conn.execute('SELECT id FROM herb_processing_inbound_item WHERE order_id = ? LIMIT 1', [order.id]);
    if (existing.length) throw new Error('该批次已生成入库记录，请勿重复操作');
    const [stages] = await conn.execute(
      `SELECT * FROM herb_processing_stage
       WHERE order_id = ? AND stage_key <> 'raw_material'
       ORDER BY sort_order ASC`,
      [order.id]
    );
    validateAllStages(stages, order.source_quantity);

    const inboundItems = [];
    for (const stage of stages.filter(item => !Number(item.is_skipped))) {
      inboundItems.push({
        stage,
        outputType: 'grade',
        productId: Number(stage.output_product_id),
        quantity: Number(stage.output_quantity),
        unitPrice: Number(stage.output_unit_price)
      });
      inboundItems.push({
        stage,
        outputType: 'byproduct',
        productId: Number(stage.byproduct_product_id),
        quantity: Number(stage.byproduct_quantity),
        unitPrice: Number(stage.byproduct_unit_price)
      });
    }
    if (!inboundItems.length) throw new Error('没有可入库的加工产品');

    for (const item of inboundItems) {
      await updateStock(
        conn,
        item.productId,
        order.target_warehouse_id,
        item.quantity,
        'herb_processing_inbound',
        order.batch_no,
        `${item.stage.stage_name}${item.outputType === 'grade' ? '等级成品' : '下料'}入库，单价${formatNumber(item.unitPrice)}`
      );
      await conn.execute(
        `INSERT INTO herb_processing_inbound_item
         (order_id, stage_id, stage_key, output_type, product_id, warehouse_id,
          quantity, unit_price, amount, creator_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          order.id,
          item.stage.id,
          item.stage.stage_key,
          item.outputType,
          item.productId,
          order.target_warehouse_id,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
          req.user.id
        ]
      );
    }

    await conn.execute(
      `UPDATE herb_processing_order
       SET status = ?, inbound_time = NOW(), inbound_user_id = ?
       WHERE id = ?`,
      [PROCESSING_STATUS.INBOUNDED, req.user.id, order.id]
    );
    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '加工产品确认入库', order.batch_no);
    res.json(Response.success({ item_count: inboundItems.length }));
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.post('/order/:id/cancel', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM herb_processing_order WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) return res.json(Response.error('加工批次不存在'));
    if (Number(order.status) !== PROCESSING_STATUS.DRAFT) return res.json(Response.error('仅待开工批次允许取消'));
    await pool.execute(
      'UPDATE herb_processing_order SET status = ?, cancel_time = NOW() WHERE id = ?',
      [PROCESSING_STATUS.CANCELED, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '加工管理', '取消药材加工批次', order.batch_no);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/order/:id/close', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.PROCESSING) throw new Error('仅加工中的批次允许关闭');

    const [inboundRows] = await conn.execute(
      'SELECT id FROM herb_processing_inbound_item WHERE order_id = ? LIMIT 1',
      [order.id]
    );
    if (inboundRows.length) throw new Error('该批次已生成入库记录，不能关闭');

    await updateStock(
      conn,
      order.source_product_id,
      order.source_warehouse_id,
      Number(order.source_quantity),
      'herb_processing_return',
      order.batch_no,
      '加工批次关闭，原包货退回库存'
    );
    await conn.execute(
      'UPDATE herb_processing_order SET status = ?, close_time = NOW() WHERE id = ?',
      [PROCESSING_STATUS.CLOSED, order.id]
    );

    await conn.commit();
    await writeSystemLog(getPool(), req.user.id, '加工管理', '关闭加工批次并退回库存', order.batch_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.delete('/order/:id', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT * FROM herb_processing_order WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    const order = rows[0];
    if (!order) throw new Error('加工批次不存在');
    if (Number(order.status) !== PROCESSING_STATUS.CANCELED) throw new Error('仅已取消的加工批次允许删除');

    const [inboundRows] = await conn.execute(
      'SELECT id FROM herb_processing_inbound_item WHERE order_id = ? LIMIT 1',
      [order.id]
    );
    if (inboundRows.length) throw new Error('该批次存在入库记录，不能删除');

    await conn.execute('DELETE FROM herb_processing_stage WHERE order_id = ?', [order.id]);
    await conn.execute('DELETE FROM herb_processing_inbound_item WHERE order_id = ?', [order.id]);
    await conn.execute('DELETE FROM herb_processing_order WHERE id = ?', [order.id]);
    await conn.commit();

    await writeSystemLog(getPool(), req.user.id, '加工管理', '删除已取消加工批次', order.batch_no);
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

async function normalizeOrderStages(conn, orderId) {
  const [rows] = await conn.execute(
    `SELECT stage_key FROM herb_processing_stage
     WHERE order_id = ? AND stage_key <> 'raw_material'`,
    [orderId]
  );
  const keys = new Set(rows.map(row => row.stage_key));
  for (const stage of STAGES) {
    if (keys.has(stage.key)) {
      await conn.execute(
        'UPDATE herb_processing_stage SET stage_name = ?, sort_order = ? WHERE order_id = ? AND stage_key = ?',
        [stage.name, stage.sort, orderId, stage.key]
      );
    }
  }
}

function validateAllStages(stages, sourceQuantity) {
  if (!stages.length) throw new Error('请先添加并完成至少一个加工工序');
  const stageMap = new Map(stages.map(stage => [stage.stage_key, stage]));
  const sourceInputTotal = stages
    .filter(stage => SOURCE_STAGE_KEYS.includes(stage.stage_key))
    .reduce((sum, stage) => sum + Number(stage.input_quantity || 0), 0);
  if (sourceInputTotal - Number(sourceQuantity || 0) > 0.001) {
    throw new Error(`原包货、过筛、色选投入合计不能超过原包货数量${formatNumber(sourceQuantity)}`);
  }

  for (const stage of stages) {
    const stageConfig = getStageConfig(stage.stage_key);
    if (!stageConfig) throw new Error(`${stage.stage_name || stage.stage_key}工序配置不存在`);
    if (stageConfig.input !== 'source' && !stageMap.has(stageConfig.input)) {
      throw new Error(`${stage.stage_name}缺少上游${stageNameOf(stageConfig.input)}工序`);
    }
  }

  for (const stageConfig of STAGES.filter(item => stageMap.has(item.key))) {
    const stage = stageMap.get(stageConfig.key);
    if (!stage.processed_at) throw new Error(`请先完成${stage.stage_name}`);
    const expectedInput = stageConfig.input === 'source'
      ? Number(stage.input_quantity || 0)
      : Number(stageMap.get(stageConfig.input)?.transfer_quantity || 0);
    if (Math.abs(expectedInput - Number(stage.input_quantity || 0)) > 0.001) {
      throw new Error(`${stage.stage_name}投入数量与上道流转数量不一致`);
    }
    if (Number(stage.is_skipped)) {
      if (stageConfig.key === 'fine_sorting') throw new Error('精选工序不能跳过');
      if (stageConfig.next && Math.abs(expectedInput - Number(stage.transfer_quantity)) > 0.001) throw new Error(`${stage.stage_name}跳过后的流转数量不正确`);
      if (!stageConfig.next && Number(stage.transfer_quantity) !== 0) throw new Error(`${stage.stage_name}没有下道工序，流转数量必须为0`);
      continue;
    }
    if (expectedInput <= 0) throw new Error(`${stage.stage_name}投入数量必须大于0`);
    if (!Number(stage.output_product_id) || Number(stage.output_quantity) <= 0 || Number(stage.output_unit_price) <= 0) {
      throw new Error(`${stage.stage_name}等级产品信息不完整`);
    }
    if (!Number(stage.byproduct_product_id) || Number(stage.byproduct_quantity) <= 0 || Number(stage.byproduct_unit_price) < 0) {
      throw new Error(`${stage.stage_name}下料信息不完整`);
    }
    const accounted = Number(stage.output_quantity) + Number(stage.transfer_quantity) +
      Number(stage.byproduct_quantity) + Number(stage.loss_quantity);
    if (Math.abs(expectedInput - accounted) > 0.001) throw new Error(`${stage.stage_name}数量不平衡`);
    if (stageConfig.next && Number(stage.transfer_quantity) <= 0) throw new Error(`${stage.stage_name}缺少流转数量`);
    if (!stageConfig.next && Number(stage.transfer_quantity) !== 0) throw new Error(`${stage.stage_name}没有下道工序，流转数量必须为0`);
  }
}

function getStageConfig(stageKey) {
  return STAGES.find(stage => stage.key === stageKey);
}

function stageNameOf(stageKey) {
  return getStageConfig(stageKey)?.name || stageKey;
}

function assertSourceStageInputWithinOrder(stages, stageKey, inputQuantity, sourceQuantity) {
  if (!SOURCE_STAGE_KEYS.includes(stageKey)) return;
  const total = stages
    .filter(stage => SOURCE_STAGE_KEYS.includes(stage.stage_key))
    .reduce((sum, stage) => sum + (stage.stage_key === stageKey ? Number(inputQuantity || 0) : Number(stage.input_quantity || 0)), 0);
  if (total - Number(sourceQuantity || 0) > 0.001) {
    throw new Error(`原包货、过筛、色选投入合计不能超过原包货数量${formatNumber(sourceQuantity)}`);
  }
}

async function resolveOperator(conn, operatorId, operatorName, currentUserId) {
  const employeeId = Number(operatorId || 0);
  if (employeeId > 0) {
    const [employees] = await conn.execute(
      'SELECT id, name FROM employee WHERE id = ? AND status = 1',
      [employeeId]
    );
    if (!employees.length) throw new Error('所选加工人不存在或已停用');
    return { id: Number(employees[0].id), name: employees[0].name };
  }

  const [users] = await conn.execute(
    'SELECT real_name, username FROM sys_user WHERE id = ?',
    [currentUserId]
  );
  return {
    id: 0,
    name: operatorName || users[0]?.real_name || users[0]?.username || ''
  };
}

async function assertStockEnough(conn, productId, warehouseId, quantity) {
  const [rows] = await conn.execute(
    'SELECT quantity FROM inventory_stock WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );
  const stockQty = rows.length ? Number(rows[0].quantity || 0) : 0;
  if (stockQty < quantity) throw new Error(`原包货库存不足，当前库存${formatNumber(stockQty)}，需要${formatNumber(quantity)}`);
}

async function updateStock(conn, productId, warehouseId, quantity, changeType, refNo, remark = '') {
  const [rows] = await conn.execute(
    'SELECT * FROM inventory_stock WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
    [productId, warehouseId]
  );
  const beforeQty = rows.length ? Number(rows[0].quantity || 0) : 0;
  const afterQty = beforeQty + Number(quantity || 0);
  if (afterQty < -0.001) throw new Error('库存数量不足');

  if (rows.length) {
    await conn.execute('UPDATE inventory_stock SET quantity = ?, updated_at = NOW() WHERE id = ?', [afterQty, rows[0].id]);
  } else {
    await conn.execute(
      'INSERT INTO inventory_stock (product_id, warehouse_id, quantity) VALUES (?,?,?)',
      [productId, warehouseId, afterQty]
    );
  }
  await conn.execute(
    `INSERT INTO inventory_log
     (product_id, warehouse_id, change_type, change_quantity, before_quantity, after_quantity, ref_no, remark)
     VALUES (?,?,?,?,?,?,?,?)`,
    [productId, warehouseId, changeType, quantity, beforeQty, afterQty, refNo, remark]
  );
}

async function generateTempNo(conn) {
  return generateTempBusinessNo(conn, 'herb_processing_order');
}

async function generateBatchNo(conn, orderId) {
  return generateBusinessNo(conn, 'herb_processing_order', { id: orderId });
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

function formatNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute(
    'INSERT INTO system_log (user_id, module, action, target) VALUES (?,?,?,?)',
    [userId, module, action, target]
  );
}

module.exports = router;
