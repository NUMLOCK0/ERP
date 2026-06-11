<template>
  <div class="page-container">
    <template v-if="editorVisible">
      <div class="editor-page">
        <div class="editor-title">
          <el-button link @click="leaveEditor">←</el-button>
          <span>{{ editorMode === 'add' ? '采购单添加' : editorMode === 'edit' ? '采购单编辑' : '采购单详情' }}</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px" :disabled="editorMode === 'view'" class="purchase-form">
          <div class="purchase-form-grid">
            <el-form-item label="采购单号" required>
              <el-input v-model="form.order_no" placeholder="P{date}{time}{id}******" :disabled="editorMode !== 'add'">
                <template v-if="editorMode !== 'add'" #append><CopyableNo :value="form.order_no" icon-only /></template>
              </el-input>
            </el-form-item>
            <el-form-item label="供应商" prop="supplier_id" required>
              <el-select v-model="form.supplier_id" placeholder="请选择..." clearable filterable @change="handleSupplierChange">
                <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="付款方式">
              <el-select v-model="form.payment_method" placeholder="未确定" clearable>
                <el-option label="未确定" value="" />
                <el-option v-for="method in paymentMethodOptions" :key="method" :label="method" :value="method" />
              </el-select>
            </el-form-item>
            <el-form-item label="管理备注">
              <el-input v-model="form.admin_remark" type="textarea" :rows="1" placeholder="管理备注" />
            </el-form-item>

            <el-form-item label="单据备注">
              <el-input v-model="form.purchase_remark" type="textarea" :rows="1" placeholder="单据备注" />
            </el-form-item>
            <el-form-item label="联系信息" class="contact-form-item">
              <div class="contact-fields">
                <el-input v-model="form.supplier_contact" placeholder="供应商联系人" />
                <el-input v-model="form.supplier_phone" placeholder="供应商联系电话" />
              </div>
            </el-form-item>
            <el-form-item label="入库仓库" prop="warehouse_id">
              <el-select v-model="form.warehouse_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
          </div>

          <div class="product-actions">
            <el-button type="primary" plain @click="openProductDrawer">选择产品</el-button>
            <el-button type="primary" plain @click="addBlankItem">添加产品</el-button>
          </div>

          <el-table :data="form.items" class="purchase-detail-table" stripe>
            <template #empty>
              <div class="empty-purchase">
                <div class="cart-line">▱</div>
                <div>
                  <el-button link type="primary" @click="openProductDrawer">选择产品</el-button>
                  <el-button link type="primary" @click="addBlankItem">添加产品</el-button>
                </div>
              </div>
            </template>
            <el-table-column label="产品标题" min-width="260">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ row.product_name }}</span>
                <el-input v-else v-model="row.product_name" placeholder="产品标题" />
              </template>
            </el-table-column>
            <el-table-column label="产品编码" width="140">
              <template #header>
                <span>产品编码 <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <span v-if="row.product_id">{{ emptyText(row.code) }}</span>
                <el-input v-else v-model="row.code" placeholder="产品编码" />
              </template>
            </el-table-column>
            <el-table-column label="产品规格" width="140">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ emptyText(row.spec) }}</span>
                <el-input v-else v-model="row.spec" placeholder="产品规格" />
              </template>
            </el-table-column>
            <el-table-column label="计量单位" width="120">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ emptyText(row.unit_name) }}</span>
                <el-select v-else v-model="row.unit_name" placeholder="选择" clearable filterable>
                  <el-option v-for="unit in unitOptions" :key="unit" :label="unit" :value="unit" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="单位基准数" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-if="!row.product_id" v-model="row.base_quantity" :min="1" :controls="false" />
                <span v-else>{{ formatQuantity(row.base_quantity) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="采购数量" width="140" align="right">
              <template #header>
                <span>采购数量 <span class="edit-mark">✎</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="0.001" :precision="3" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="采购价格" width="140" align="right">
              <template #header>
                <span>采购价格 <span class="edit-mark">✎</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="税金" width="120" align="right">
              <template #header>
                <span>税金 <span class="edit-mark">✎</span> <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.tax" :min="0" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="采购总价" width="130" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template #default="{ row }">
                <el-input v-model="row.remark" placeholder="备注" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ $index }">
                <el-button type="danger" link @click="removeItem($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="bottom-product-search">
            <el-input v-model="bottomProductKeyword" clearable placeholder="输入产品名称/首字母/简述/编码">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <span class="help-dot">?</span>
          </div>

          <el-table v-if="bottomProductResults.length" :data="bottomProductResults" border class="search-result-table">
            <el-table-column prop="name" label="产品名称" min-width="220" show-overflow-tooltip />
            <el-table-column label="单价" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(productPrice(row)) }}</template>
            </el-table-column>
            <el-table-column label="计量单位/单位基准数" width="180">
              <template #default="{ row }">{{ productUnitName(row) }}/{{ productBaseQuantity(row) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button v-if="isProductAdded(row.id)" type="danger" link @click="removeProductById(row.id)">移除</el-button>
                <el-button v-else type="primary" link @click="addProduct(row)">添加</el-button>
              </template>
            </el-table-column>
          </el-table>

        </el-form>

        <div class="editor-footer">
          <div class="total-bar">
            <span>明细 {{ form.items.length }} 行</span>
            <strong>合计：¥{{ formatMoney(totalAmount) }}</strong>
          </div>
          <div>
            <el-button @click="leaveEditor">取消</el-button>
            <el-button v-if="editorMode !== 'view'" type="primary" @click="handleSave">保存</el-button>
          </div>
        </div>
      </div>

      <el-drawer v-model="productDrawerVisible" title="选择产品" size="62%" direction="rtl" class="product-drawer">
        <div class="drawer-filter">
          <el-select v-model="drawerFilters.category_id" placeholder="产品分类..." clearable filterable>
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-select v-model="drawerFilters.brand_id" placeholder="品牌..." clearable filterable>
            <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
          <el-input v-model="drawerFilters.keyword" placeholder="产品名称/首字母/简述/编码" clearable @keyup.enter="noop">
            <template #append>
              <el-button :icon="Search">搜索</el-button>
            </template>
          </el-input>
        </div>

        <el-table :data="drawerProducts" class="drawer-product-table" height="calc(100vh - 190px)" stripe>
          <el-table-column width="44">
            <template #default="{ row }">
              <el-checkbox :model-value="isProductAdded(row.id)" @change="toggleDrawerProduct(row)" />
            </template>
          </el-table-column>
          <el-table-column label="产品信息" min-width="220">
            <template #default="{ row }">
              <div class="drawer-product-info">
                <img v-if="firstProductImage(row)" :src="firstProductImage(row)" alt="" />
                <span v-else class="product-avatar-placeholder"></span>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="数量/单位/基准数" width="250">
            <template #default="{ row }">
              <div class="drawer-unit-row">
                <el-input-number v-model="selectorState(row).quantity" :min="0.001" :precision="3" :controls="false" />
                <el-select v-model="selectorState(row).unit_name">
                  <el-option :label="productUnitName(row)" :value="productUnitName(row)" />
                </el-select>
                <el-tooltip :content="`当前库存：${formatQuantity(row.stock_total)}`" placement="top">
                  <el-icon class="unit-cube"><Box /></el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="采购价" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(productPrice(row)) }}</template>
          </el-table-column>
          <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
          <el-table-column prop="code" label="编码" width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button v-if="isProductAdded(row.id)" type="danger" link @click="removeProductById(row.id)">移除</el-button>
              <el-button v-else type="primary" link @click="addProduct(row, selectorState(row).quantity)">选择</el-button>
            </template>
          </el-table-column>
        </el-table>

        <template #footer>
          <div class="drawer-footer">
            <el-button @click="productDrawerVisible = false">取消</el-button>
            <el-button type="primary" @click="productDrawerVisible = false">确认</el-button>
          </div>
        </template>
      </el-drawer>
    </template>

    <template v-else-if="confirmVisible">
      <div class="editor-page confirm-page">
        <div class="editor-title">
          <el-button link @click="leaveConfirm">←</el-button>
          <span>采购单已采购确认</span>
        </div>

        <el-form label-width="96px" class="purchase-form">
          <div class="purchase-form-grid confirm-form-grid">
            <el-form-item label="采购单号">
              <el-input v-model="confirmForm.order_no" disabled>
                <template #append><CopyableNo :value="confirmForm.order_no" icon-only /></template>
              </el-input>
            </el-form-item>
            <el-form-item label="供应商">
              <el-select v-model="confirmForm.supplier_id" disabled>
                <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="付款方式">
              <el-select v-model="confirmForm.payment_method" placeholder="未确定" clearable>
                <el-option label="未确定" value="" />
                <el-option v-for="method in paymentMethodOptions" :key="method" :label="method" :value="method" />
              </el-select>
            </el-form-item>
            <el-form-item label="联系信息" class="contact-form-item">
              <div class="contact-fields">
                <el-input v-model="confirmForm.supplier_contact" disabled />
                <el-input v-model="confirmForm.supplier_phone" disabled />
              </div>
            </el-form-item>
            <el-form-item label="管理备注">
              <el-input v-model="confirmForm.admin_remark" type="textarea" :rows="1" placeholder="管理备注" />
            </el-form-item>
            <el-form-item label="单据备注">
              <el-input v-model="confirmForm.purchase_remark" type="textarea" :rows="1" placeholder="单据备注" />
            </el-form-item>
          </div>

          <el-table :data="confirmForm.items" class="purchase-detail-table confirm-table" stripe>
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column label="计量单位" width="130">
              <template #default="{ row }">{{ emptyText(row.unit_name) }} / {{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column label="单价 / 数量" width="140">
              <template #default="{ row }">{{ formatMoney(row.price) }} / {{ formatQuantity(row.quantity) }}</template>
            </el-table-column>
            <el-table-column label="税金 / 总额" width="140">
              <template #default="{ row }">{{ formatMoney(row.tax) }} / {{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="最终采购数量" width="150">
              <template #default="{ row }">
                <el-input-number v-model="row.final_quantity" :min="0.001" :precision="3" :controls="false" @change="recalculateFinalRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="最终采购单价" width="150">
              <template #default="{ row }">
                <el-input-number v-model="row.final_price" :min="0" :precision="2" :controls="false" @change="recalculateFinalRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="最终税金" width="140">
              <template #header>
                <span>最终税金 <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.final_tax" :min="0" :precision="2" :controls="false" @change="recalculateFinalRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="最终总价" width="150">
              <template #default="{ row }">
                <el-input-number v-model="row.final_amount" :min="0" :precision="2" :controls="false" />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template #default="{ row }">
                <el-input v-model="row.final_remark" placeholder="备注" />
              </template>
            </el-table-column>
          </el-table>
        </el-form>

        <div class="editor-footer">
          <span></span>
          <el-button type="primary" @click="handleConfirmPurchasedSubmit">提交</el-button>
        </div>
      </div>
    </template>

    <template v-else-if="inboundVisible">
      <div class="editor-page confirm-page">
        <div class="editor-title">
          <el-button link @click="leaveInbound">←</el-button>
          <span>采购单入库</span>
          <el-divider direction="vertical" />
          <el-button link type="primary" @click="openCurrentOrderDetail(inboundForm.id)">查看采购单</el-button>
        </div>

        <el-form label-width="96px" class="purchase-form">
          <div class="purchase-form-grid confirm-form-grid">
            <el-form-item label="入库单号" required>
              <el-input v-model="inboundForm.inbound_no" disabled>
                <template #append><CopyableNo :value="inboundForm.inbound_no" icon-only /></template>
              </el-input>
            </el-form-item>
            <el-form-item label="仓库" required>
              <el-select v-model="inboundForm.warehouse_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="入库状态" required>
              <el-select v-model="inboundForm.inbound_status" placeholder="请选择..." clearable>
                <el-option label="等待入库" :value="0" />
                <el-option label="直接入库" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item label="单据备注">
              <el-input v-model="inboundForm.remark" type="textarea" :rows="1" placeholder="单据备注" />
            </el-form-item>
          </div>

          <el-table :data="inboundForm.items" class="purchase-detail-table confirm-table" stripe>
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column label="采购单价 / 总额" width="150">
              <template #default="{ row }">{{ formatMoney(row.final_price) }} / {{ formatMoney(row.final_amount) }}</template>
            </el-table-column>
            <el-table-column label="采购税金 / 总额" width="150">
              <template #default="{ row }">{{ formatMoney(row.final_tax) }} / {{ formatMoney(row.final_tax) }}</template>
            </el-table-column>
            <el-table-column label="产品单位" width="120">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}/{{ emptyText(row.unit_name) }}</template>
            </el-table-column>
            <el-table-column label="采购数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.final_quantity) }}</template>
            </el-table-column>
            <el-table-column label="已处理 / 剩余" width="140">
              <template #default="{ row }">{{ formatQuantity(Number(row.inbounded_quantity || 0) + Number(row.returned_quantity || 0)) }} / {{ formatQuantity(row.remaining_quantity) }}</template>
            </el-table-column>
            <el-table-column label="入库数量" width="150">
              <template #header>
                <span>入库数量 <span class="edit-mark">✎</span> <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.inbound_quantity" :min="0" :max="Number(row.remaining_quantity || 0)" :precision="3" :controls="false" placeholder="入库数量" />
              </template>
            </el-table-column>
            <el-table-column label="仓位" width="160">
              <template #header>
                <span>仓位 <span class="edit-mark">✎</span> <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input v-model="row.location" placeholder="请选择..." />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.final_remark" placeholder="备注" />
              </template>
            </el-table-column>
          </el-table>
        </el-form>

        <div class="editor-footer">
          <el-button type="primary" @click="handleInboundSubmit">提交</el-button>
          <div class="total-bar">
            <span>条数 {{ inboundLineCount }}</span>
            <strong>数量 {{ formatQuantity(inboundQuantityTotal) }}</strong>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="returnVisible">
      <div class="editor-page confirm-page">
        <div class="editor-title">
          <el-button link @click="leaveReturn">←</el-button>
          <span>采购单退货</span>
          <el-divider direction="vertical" />
          <el-button link type="primary" @click="openCurrentOrderDetail(returnForm.id)">查看采购单</el-button>
        </div>

        <el-form label-width="96px" class="purchase-form">
          <div class="purchase-form-grid confirm-form-grid">
            <el-form-item label="退货单号" required>
              <el-input v-model="returnForm.return_no" disabled>
                <template #append><CopyableNo :value="returnForm.return_no" icon-only /></template>
              </el-input>
            </el-form-item>
            <el-form-item label="退货状态" required>
              <el-select v-model="returnForm.return_status" placeholder="请选择..." clearable>
                <el-option label="等待退货" :value="0" />
                <el-option label="直接退货" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item label="快递名称">
              <el-input v-model="returnForm.express_name" placeholder="快递名称" />
            </el-form-item>
            <el-form-item label="快递单号">
              <el-input v-model="returnForm.express_no" placeholder="快递单号" />
            </el-form-item>
            <el-form-item label="收货信息" class="contact-form-item">
              <div class="contact-fields return-contact-fields">
                <el-input v-model="returnForm.contact" placeholder="供应商联系人" />
                <el-input v-model="returnForm.phone" placeholder="供应商联系电话" />
                <el-input v-model="returnForm.address" placeholder="详细地址" />
              </div>
            </el-form-item>
            <el-form-item label="单据备注">
              <el-input v-model="returnForm.remark" type="textarea" :rows="1" placeholder="单据备注" />
            </el-form-item>
          </div>

          <el-table :data="returnForm.items" class="purchase-detail-table confirm-table" stripe>
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column label="采购单价 / 总额" width="150">
              <template #default="{ row }">{{ formatMoney(row.final_price) }} / {{ formatMoney(row.final_amount) }}</template>
            </el-table-column>
            <el-table-column label="采购税金 / 总额" width="150">
              <template #default="{ row }">{{ formatMoney(row.final_tax) }} / {{ formatMoney(row.final_tax) }}</template>
            </el-table-column>
            <el-table-column label="产品单位" width="120">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}/{{ emptyText(row.unit_name) }}</template>
            </el-table-column>
            <el-table-column label="采购数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.final_quantity) }}</template>
            </el-table-column>
            <el-table-column label="已处理 / 剩余" width="140">
              <template #default="{ row }">{{ formatQuantity(Number(row.inbounded_quantity || 0) + Number(row.returned_quantity || 0)) }} / {{ formatQuantity(row.remaining_quantity) }}</template>
            </el-table-column>
            <el-table-column label="退货数量" width="150">
              <template #header>
                <span>退货数量 <span class="edit-mark">✎</span> <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.return_quantity" :min="0" :max="Number(row.remaining_quantity || 0)" :precision="3" :controls="false" placeholder="退货数量" @change="recalculateReturnRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="退款金额" width="150">
              <template #header>
                <span>退款金额 <span class="edit-mark">✎</span> <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.return_amount" :min="0" :precision="2" :controls="false" placeholder="退款金额" />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.return_remark" placeholder="备注" />
              </template>
            </el-table-column>
          </el-table>
        </el-form>

        <div class="editor-footer">
          <el-button type="primary" @click="handleReturnSubmit">提交</el-button>
          <div class="total-bar">
            <span>条数 {{ returnLineCount }}</span>
            <strong>数量 {{ formatQuantity(returnQuantityTotal) }}</strong>
            <strong>总价 ¥{{ formatMoney(returnAmountTotal) }}</strong>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <el-card>
        <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
          <el-form-item label="关键词">
            <el-input v-model="searchForm.keyword" placeholder="订单号/供应商" clearable />
          </el-form-item>
          <el-form-item label="供应商">
            <el-select v-model="searchForm.supplier_id" class="search-wide-select" placeholder="请选择" clearable filterable>
              <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" class="search-status-select" placeholder="请选择" clearable>
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="日期">
            <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
          </el-form-item>
        </SearchForm>

        <div class="toolbar">
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增采购订单</el-button>
        </div>

        <el-table :data="tableData" stripe v-loading="loading">
          <el-table-column prop="order_no" label="采购单号" width="190">
            <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
          </el-table-column>
          <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip />
          <el-table-column label="采购状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="付款状态" width="100">
            <template #default="{ row }">
              <el-tag :type="paymentStatusTagType(row.payment_status)" size="small">{{ paymentStatusText(row.payment_status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="退货状态" width="100">
            <template #default="{ row }">
              <el-tag :type="returnFlagTagType(row.return_status)" size="small">{{ returnFlagText(row.return_status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="付款方式" width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.payment_method) }}</template>
          </el-table-column>
          <el-table-column label="付款总额" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.payment_total_amount) }}</template>
          </el-table-column>
          <el-table-column label="单价" width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.unit_price) }}</template>
          </el-table-column>
          <el-table-column label="税金" width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.tax_amount) }}</template>
          </el-table-column>
          <el-table-column label="总价" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.total_price ?? row.total_amount) }}</template>
          </el-table-column>
          <el-table-column label="产品总数量" width="120" align="right">
            <template #default="{ row }">{{ formatQuantity(row.product_total_quantity) }}</template>
          </el-table-column>
          <el-table-column label="最终单价" width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.final_unit_price) }}</template>
          </el-table-column>
          <el-table-column label="最终税金" width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.final_tax_amount) }}</template>
          </el-table-column>
          <el-table-column label="最终产品总数量" width="140" align="right">
            <template #default="{ row }">{{ formatQuantity(row.final_product_total_quantity) }}</template>
          </el-table-column>
          <el-table-column label="退款金额" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.refund_amount) }}</template>
          </el-table-column>
          <el-table-column label="退货数量" width="110" align="right">
            <template #default="{ row }">{{ formatQuantity(row.return_quantity) }}</template>
          </el-table-column>
          <el-table-column prop="contact" label="联系人" width="110" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.contact) }}</template>
          </el-table-column>
          <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.phone) }}</template>
          </el-table-column>
          <el-table-column prop="bank_name" label="开户银行" width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.bank_name) }}</template>
          </el-table-column>
          <el-table-column prop="bank_address" label="开户地址" width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.bank_address) }}</template>
          </el-table-column>
          <el-table-column prop="bank_account_name" label="开户户名" width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.bank_account_name) }}</template>
          </el-table-column>
          <el-table-column prop="bank_account" label="开户户号" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.bank_account) }}</template>
          </el-table-column>
          <el-table-column prop="admin_remark" label="管理员备注信息" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.admin_remark) }}</template>
          </el-table-column>
          <el-table-column prop="purchase_remark" label="采购单备注信息" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.purchase_remark) }}</template>
          </el-table-column>
          <el-table-column label="完成时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.completed_time) }}</template>
          </el-table-column>
          <el-table-column label="入库开始时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.inbound_start_time) }}</template>
          </el-table-column>
          <el-table-column label="采购完成时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.purchase_completed_time) }}</template>
          </el-table-column>
          <el-table-column label="采购开始时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.purchase_start_time) }}</template>
          </el-table-column>
          <el-table-column label="审核时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.audit_time) }}</template>
          </el-table-column>
          <el-table-column label="提审时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.submit_time) }}</template>
          </el-table-column>
          <el-table-column label="取消时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.cancel_time) }}</template>
          </el-table-column>
          <el-table-column label="关闭时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.close_time) }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleView(row)">详情</el-button>
              <el-dropdown trigger="click" @command="handleOrderCommand(String($event), row)">
                <el-button type="primary" link>
                  操作<el-icon class="operation-more"><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="action in orderActions(row)" :key="action.command" :command="action.command">
                      {{ action.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>

        <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
      </el-card>
    </template>

    <el-drawer v-model="detailDrawerVisible" title="采购单详情" size="72%" direction="rtl" class="detail-drawer">
      <el-tabs v-model="detailActiveTab">
        <el-tab-pane label="基础信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="采购单号"><CopyableNo :value="detailData.order_no" /></el-descriptions-item>
            <el-descriptions-item label="采购状态">
              <el-tag :type="statusTagType(detailData.status)" size="small">{{ statusText(detailData.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(detailData.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="入库仓库">{{ emptyText(detailData.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="付款方式">{{ emptyText(detailData.payment_method) }}</el-descriptions-item>
            <el-descriptions-item label="付款状态">{{ paymentStatusText(detailData.payment_status) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detailData.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(detailData.phone) }}</el-descriptions-item>
            <el-descriptions-item label="总价">¥{{ formatMoney(detailData.total_price ?? detailData.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="最终总价">¥{{ formatMoney(detailFinalAmount) }}</el-descriptions-item>
            <el-descriptions-item label="管理员备注信息">{{ emptyText(detailData.admin_remark) }}</el-descriptions-item>
            <el-descriptions-item label="采购单备注信息">{{ emptyText(detailData.purchase_remark) }}</el-descriptions-item>
            <el-descriptions-item label="提审时间">{{ formatDateTime(detailData.submit_time) }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ formatDateTime(detailData.audit_time) }}</el-descriptions-item>
            <el-descriptions-item label="采购开始时间">{{ formatDateTime(detailData.purchase_start_time) }}</el-descriptions-item>
            <el-descriptions-item label="采购完成时间">{{ formatDateTime(detailData.purchase_completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="入库开始时间">{{ formatDateTime(detailData.inbound_start_time) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatDateTime(detailData.completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="取消时间">{{ formatDateTime(detailData.cancel_time) }}</el-descriptions-item>
            <el-descriptions-item label="关闭时间">{{ formatDateTime(detailData.close_time) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detailData.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(detailData.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="产品列表" name="items">
          <el-table :data="detailData.items" stripe class="detail-item-table">
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="code" label="产品编码" width="130" show-overflow-tooltip />
            <el-table-column prop="spec" label="产品规格" width="120" show-overflow-tooltip />
            <el-table-column label="计量单位" width="120">
              <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
            </el-table-column>
            <el-table-column label="单位基准数" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column label="采购数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
            </el-table-column>
            <el-table-column label="采购单价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
            </el-table-column>
            <el-table-column label="税金" width="100" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.tax) }}</template>
            </el-table-column>
            <el-table-column label="总价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="最终数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.final_quantity ?? row.quantity) }}</template>
            </el-table-column>
            <el-table-column label="最终单价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.final_price ?? row.price) }}</template>
            </el-table-column>
            <el-table-column label="最终税金" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.final_tax ?? row.tax) }}</template>
            </el-table-column>
            <el-table-column label="最终总价" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.final_amount ?? row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="final_remark" label="备注" min-width="140" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Box, MoreFilled, Plus, Search } from '@element-plus/icons-vue'
import {
  auditPurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  completePurchaseInboundByOrder,
  createPurchaseOrderInbound,
  createPurchaseOrderReturn,
  confirmPurchasedOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  rejectPurchaseOrder,
  startPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder
} from '@/api/purchase'
import { getBrands } from '@/api/brand'
import { getCategories } from '@/api/category'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import { getUnits } from '@/api/unit'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { returnFlagTagType, returnFlagText } from '@/utils/status'

interface PurchaseItem {
  id: number | null
  product_id: number | null
  product_name: string
  code: string
  spec: string
  unit_name: string
  base_quantity: number
  quantity: number
  price: number
  tax: number
  amount: number
  remark: string
  final_quantity: number
  final_price: number
  final_tax: number
  final_amount: number
  final_remark: string
  inbound_quantity: number
  location: string
  return_quantity: number
  return_amount: number
  return_remark: string
  inbounded_quantity: number
  returned_quantity: number
  remaining_quantity: number
}

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const editorVisible = ref(false)
const confirmVisible = ref(false)
const inboundVisible = ref(false)
const returnVisible = ref(false)
const editorMode = ref<'add' | 'edit' | 'view'>('add')
const productDrawerVisible = ref(false)
const detailDrawerVisible = ref(false)
const detailActiveTab = ref('basic')
const formRef = ref<FormInstance>()
const bottomProductKeyword = ref('')

const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, status: null as any, dateRange: null as any })
const drawerFilters = reactive({ category_id: null as any, brand_id: null as any, keyword: '' })
const selectorStates = reactive<Record<number, { quantity: number; unit_name: string; base_quantity: number }>>({})
const form = reactive({
  id: null as number | null,
  order_no: '',
  supplier_id: null as any,
  warehouse_id: null as any,
  status: 0,
  payment_method: '',
  admin_remark: '',
  purchase_remark: '',
  supplier_contact: '',
  supplier_phone: '',
  items: [] as PurchaseItem[]
})
const detailData = reactive<any>({ items: [] })
const confirmForm = reactive({
  id: null as number | null,
  order_no: '',
  supplier_id: null as any,
  supplier_name: '',
  payment_method: '',
  admin_remark: '',
  purchase_remark: '',
  supplier_contact: '',
  supplier_phone: '',
  items: [] as PurchaseItem[]
})
const inboundForm = reactive({
  id: null as number | null,
  order_no: '',
  inbound_no: 'PE{date}{time}{id}******',
  warehouse_id: null as any,
  inbound_status: null as any,
  remark: '',
  items: [] as PurchaseItem[]
})
const returnForm = reactive({
  id: null as number | null,
  order_no: '',
  return_no: 'PR{date}{time}{id}******',
  return_status: null as any,
  express_name: '',
  express_no: '',
  contact: '',
  phone: '',
  address: '',
  remark: '',
  items: [] as PurchaseItem[]
})
const formRules = {
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }]
}
const statusOptions = [
  { label: '待提交', value: 0 },
  { label: '待审核', value: 2 },
  { label: '已审核', value: 5 },
  { label: '采购中', value: 1 },
  { label: '已采购', value: 6 },
  { label: '入库中', value: 7 },
  { label: '已入库', value: 8 },
  { label: '已拒绝', value: 9 },
  { label: '已取消', value: 3 },
  { label: '已关闭', value: 4 }
]
const paymentMethodOptions = ['账期结算', '预付款', '银行转账', '现金支付', '在线支付', '其他方式']
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const detailFinalAmount = computed(() => (detailData.items || []).reduce((sum: number, item: any) => sum + Number(item.final_amount ?? item.amount ?? 0), 0))
const inboundLineCount = computed(() => inboundForm.items.filter(item => Number(item.inbound_quantity || 0) > 0).length)
const inboundQuantityTotal = computed(() => inboundForm.items.reduce((sum, item) => sum + Number(item.inbound_quantity || 0), 0))
const returnLineCount = computed(() => returnForm.items.filter(item => Number(item.return_quantity || 0) > 0 || Number(item.return_amount || 0) > 0).length)
const returnQuantityTotal = computed(() => returnForm.items.reduce((sum, item) => sum + Number(item.return_quantity || 0), 0))
const returnAmountTotal = computed(() => returnForm.items.reduce((sum, item) => sum + Number(item.return_amount || 0), 0))
const drawerProducts = computed(() => filterProducts(drawerFilters.keyword, drawerFilters.category_id, drawerFilters.brand_id))
const bottomProductResults = computed(() => bottomProductKeyword.value.trim() ? filterProducts(bottomProductKeyword.value).slice(0, 8) : [])
const unitOptions = computed(() => {
  const names = new Set<string>()
  units.value.forEach(unit => {
    if (unit.name) names.add(unit.name)
  })
  products.value.forEach(product => {
    productUnits(product).forEach((unit: any) => {
      if (unit.unit_name) names.add(unit.unit_name)
    })
    if (product.unit_name) names.add(product.unit_name)
  })
  if (!names.size) names.add('个')
  return Array.from(names)
})

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      supplier_id: searchForm.supplier_id,
      status: searchForm.status ?? ''
    }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getPurchaseOrders(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { keyword: '', supplier_id: null, status: null, dateRange: null }); handleSearch() }

function resetForm() {
  Object.assign(form, {
    id: null,
    order_no: 'P{date}{time}{id}******',
    supplier_id: null,
    warehouse_id: warehouses.value[0]?.id || null,
    status: 0,
    payment_method: '',
    admin_remark: '',
    purchase_remark: '',
    supplier_contact: '',
    supplier_phone: '',
    items: []
  })
  confirmVisible.value = false
  inboundVisible.value = false
  returnVisible.value = false
  bottomProductKeyword.value = ''
  formRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  editorMode.value = 'add'
  editorVisible.value = true
}

async function handleEdit(row: any) {
  await loadOrder(row.id)
  editorMode.value = 'edit'
  editorVisible.value = true
}

async function handleView(row: any) {
  const detail = await fetchOrderDetail(row.id)
  Object.keys(detailData).forEach(key => delete detailData[key])
  Object.assign(detailData, row, detail, { items: detail.items || [] })
  detailActiveTab.value = 'basic'
  detailDrawerVisible.value = true
}

function leaveEditor() {
  editorVisible.value = false
  productDrawerVisible.value = false
}

function leaveConfirm() {
  confirmVisible.value = false
}

function leaveInbound() {
  inboundVisible.value = false
}

function leaveReturn() {
  returnVisible.value = false
}

async function fetchOrderDetail(id: number) {
  const res: any = await getPurchaseOrder(id)
  return res.data || {}
}

async function loadOrder(id: number) {
  resetForm()
  const detail = await fetchOrderDetail(id)
  Object.assign(form, {
    id: detail.id,
    order_no: detail.order_no || '',
    supplier_id: detail.supplier_id || null,
    warehouse_id: detail.warehouse_id || warehouses.value[0]?.id || null,
    status: Number(detail.status || 0),
    payment_method: detail.payment_method || '',
    admin_remark: detail.admin_remark || '',
    purchase_remark: detail.purchase_remark || '',
    supplier_contact: detail.contact || '',
    supplier_phone: detail.phone || ''
  })
  handleSupplierChange(form.supplier_id)
  form.items = normalizeOrderItems(detail.items || [])
}

function normalizeOrderItems(items: any[]) {
  return items.map((item: any) => createItem({
    id: item.id || null,
    product_id: item.product_id || null,
    product_name: item.product_name || '',
    code: item.code || '',
    spec: item.spec || '',
    unit_name: item.unit_name || productUnitName(products.value.find(product => product.id === item.product_id) || {}),
    base_quantity: Number(item.base_quantity || 1),
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    tax: Number(item.tax || 0),
    amount: Number(item.amount || 0),
    remark: item.remark || '',
    final_quantity: Number(item.final_quantity ?? item.quantity ?? 1),
    final_price: Number(item.final_price ?? item.price ?? 0),
    final_tax: Number(item.final_tax ?? item.tax ?? 0),
    final_amount: Number(item.final_amount ?? item.amount ?? 0),
    final_remark: item.final_remark || item.remark || '',
    inbound_quantity: Number(item.final_quantity ?? item.quantity ?? 1),
    location: item.location || '',
    return_quantity: Number(item.final_quantity ?? item.quantity ?? 1),
    return_amount: Number(item.final_amount ?? item.amount ?? 0),
    return_remark: item.return_remark || item.final_remark || item.remark || '',
    inbounded_quantity: Number(item.inbounded_quantity || 0),
    returned_quantity: Number(item.returned_quantity || 0),
    remaining_quantity: Number(item.remaining_quantity ?? item.final_quantity ?? item.quantity ?? 0)
  }))
}

function createItem(partial: Partial<PurchaseItem> = {}): PurchaseItem {
  return {
    id: partial.id ?? null,
    product_id: partial.product_id ?? null,
    product_name: partial.product_name ?? '',
    code: partial.code ?? '',
    spec: partial.spec ?? '',
    unit_name: partial.unit_name ?? '',
    base_quantity: partial.base_quantity ?? 1,
    quantity: partial.quantity ?? 1,
    price: partial.price ?? 0,
    tax: partial.tax ?? 0,
    amount: partial.amount ?? 0,
    remark: partial.remark ?? '',
    final_quantity: partial.final_quantity ?? partial.quantity ?? 1,
    final_price: partial.final_price ?? partial.price ?? 0,
    final_tax: partial.final_tax ?? partial.tax ?? 0,
    final_amount: partial.final_amount ?? partial.amount ?? 0,
    final_remark: partial.final_remark ?? partial.remark ?? '',
    inbound_quantity: partial.inbound_quantity ?? partial.final_quantity ?? partial.quantity ?? 1,
    location: partial.location ?? '',
    return_quantity: partial.return_quantity ?? partial.final_quantity ?? partial.quantity ?? 1,
    return_amount: partial.return_amount ?? partial.final_amount ?? partial.amount ?? 0,
    return_remark: partial.return_remark ?? partial.final_remark ?? partial.remark ?? '',
    inbounded_quantity: partial.inbounded_quantity ?? 0,
    returned_quantity: partial.returned_quantity ?? 0,
    remaining_quantity: partial.remaining_quantity ?? partial.final_quantity ?? partial.quantity ?? 0
  }
}

function addBlankItem() {
  form.items.push(createItem())
}

function openProductDrawer() {
  productDrawerVisible.value = true
}

function addProduct(product: any, quantity = 1) {
  const existing = form.items.find(item => item.product_id === product.id)
  if (existing) {
    existing.quantity = Number(quantity || existing.quantity || 1)
    recalculateRow(existing)
    return
  }
  const emptyRow = form.items.find(item => !item.product_id && !item.product_name && !item.code)
  const row = emptyRow || createItem()
  fillRowFromProduct(row, product, quantity)
  recalculateRow(row)
  if (!emptyRow) form.items.push(row)
}

function removeProductById(productId: number) {
  form.items = form.items.filter(item => item.product_id !== productId)
}

function toggleDrawerProduct(product: any) {
  if (isProductAdded(product.id)) {
    removeProductById(product.id)
  } else {
    addProduct(product, selectorState(product).quantity)
  }
}

function handleProductChange(row: PurchaseItem) {
  const product = products.value.find(item => item.id === row.product_id)
  if (!product) return
  fillRowFromProduct(row, product, row.quantity)
  recalculateRow(row)
}

function fillRowFromProduct(row: PurchaseItem, product: any, quantity = 1) {
  row.product_id = product.id
  row.product_name = product.name || ''
  row.code = product.code || ''
  row.spec = product.spec || ''
  row.unit_name = productUnitName(product)
  row.base_quantity = productBaseQuantity(product)
  row.quantity = Number(quantity || row.quantity || 1)
  row.price = productPrice(product)
  row.tax = row.tax || 0
  row.final_quantity = row.quantity
  row.final_price = row.price
  row.final_tax = row.tax
  row.final_remark = row.remark || ''
  row.inbound_quantity = row.quantity
  row.return_quantity = row.quantity
  row.return_amount = row.amount
}

function recalculateRow(row: PurchaseItem) {
  row.amount = Number((Number(row.quantity || 0) * Number(row.price || 0) + Number(row.tax || 0)).toFixed(2))
  row.final_quantity = row.final_quantity || row.quantity
  row.final_price = row.final_price || row.price
  row.final_tax = row.final_tax || row.tax
  recalculateFinalRow(row)
}

function recalculateFinalRow(row: PurchaseItem) {
  row.final_amount = Number((Number(row.final_quantity || 0) * Number(row.final_price || 0) + Number(row.final_tax || 0)).toFixed(2))
}

function recalculateReturnRow(row: PurchaseItem) {
  row.return_amount = Number((Number(row.return_quantity || 0) * Number(row.final_price || row.price || 0)).toFixed(2))
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const items = form.items.filter(item => (
    (item.product_id || item.product_name.trim()) && Number(item.quantity) > 0
  ))
  if (!items.length) {
    ElMessage.warning('请至少添加一条产品明细')
    return
  }
  const payload = {
    supplier_id: form.supplier_id,
    warehouse_id: form.warehouse_id || warehouses.value[0]?.id || 0,
    payment_method: form.payment_method,
    admin_remark: form.admin_remark,
    purchase_remark: form.purchase_remark,
    items: items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name.trim(),
      code: item.code.trim(),
      spec: item.spec.trim(),
      unit_name: item.unit_name,
      base_quantity: Number(item.base_quantity || 1),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      tax: Number(item.tax || 0),
      remark: item.remark || ''
    }))
  }
  if (editorMode.value === 'edit' && form.id) {
    await updatePurchaseOrder(form.id, payload)
    ElMessage.success('更新成功')
  } else {
    await createPurchaseOrder(payload)
    ElMessage.success('创建成功')
  }
  leaveEditor()
  fetchData()
}

async function handleSubmitAudit(row: any) {
  await ElMessageBox.confirm(`确认提交订单 ${row.order_no} 审核？`, '提示', { type: 'warning' })
  await submitPurchaseOrder(row.id)
  ElMessage.success('已提交审核')
  fetchData()
}

async function handleAudit(row: any) {
  await ElMessageBox.confirm(`确认审核通过采购单 ${row.order_no}？`, '提示', { type: 'warning' })
  await auditPurchaseOrder(row.id)
  ElMessage.success('审核通过')
  fetchData()
}

async function handleReject(row: any) {
  await ElMessageBox.confirm(`确认拒绝采购单 ${row.order_no}？`, '提示', { type: 'warning' })
  await rejectPurchaseOrder(row.id)
  ElMessage.success('已拒绝')
  fetchData()
}

async function handleStartPurchase(row: any) {
  await ElMessageBox.confirm(`确认开始采购 ${row.order_no}？`, '提示', { type: 'warning' })
  await startPurchaseOrder(row.id)
  ElMessage.success('已进入采购中')
  fetchData()
}

async function handleConfirmPurchased(row: any) {
  const detail = await fetchOrderDetail(row.id)
  Object.assign(confirmForm, {
    id: detail.id,
    order_no: detail.order_no || '',
    supplier_id: detail.supplier_id || null,
    supplier_name: detail.supplier_name || '',
    payment_method: detail.payment_method || '',
    admin_remark: detail.admin_remark || '',
    purchase_remark: detail.purchase_remark || '',
    supplier_contact: detail.contact || '',
    supplier_phone: detail.phone || '',
    items: normalizeOrderItems(detail.items || [])
  })
  confirmVisible.value = true
}

async function handleConfirmPurchasedSubmit() {
  if (!confirmForm.id) return
  const items = confirmForm.items.filter(item => item.id && Number(item.final_quantity) > 0)
  if (!items.length) {
    ElMessage.warning('请至少保留一条最终采购明细')
    return
  }
  await confirmPurchasedOrder(confirmForm.id, {
    payment_method: confirmForm.payment_method,
    admin_remark: confirmForm.admin_remark,
    purchase_remark: confirmForm.purchase_remark,
    items: items.map(item => ({
      id: item.id,
      final_quantity: Number(item.final_quantity || 0),
      final_price: Number(item.final_price || 0),
      final_tax: Number(item.final_tax || 0),
      final_amount: Number(item.final_amount || 0),
      final_remark: item.final_remark || ''
    }))
  })
  ElMessage.success('已采确认成功')
  confirmVisible.value = false
  fetchData()
}

async function handleInbound(row: any) {
  const detail = await fetchOrderDetail(row.id)
  const remainingItems = normalizeOrderItems(detail.items || []).filter(item => Number(item.remaining_quantity || 0) > 0)
  if (!remainingItems.length) {
    ElMessage.warning('该采购单没有剩余可入库数量')
    return
  }
  Object.assign(inboundForm, {
    id: detail.id,
    order_no: detail.order_no || '',
    inbound_no: 'PE{date}{time}{id}******',
    warehouse_id: detail.warehouse_id || warehouses.value[0]?.id || null,
    inbound_status: null,
    remark: '',
    items: remainingItems.map(item => ({
      ...item,
      inbound_quantity: Number(item.remaining_quantity || 0),
      location: '',
      final_remark: item.final_remark || ''
    }))
  })
  inboundVisible.value = true
}

async function handleInboundSubmit() {
  if (!inboundForm.id) return
  if (!inboundForm.warehouse_id) {
    ElMessage.warning('请选择仓库')
    return
  }
  if (inboundForm.inbound_status === null || inboundForm.inbound_status === undefined) {
    ElMessage.warning('请选择入库状态')
    return
  }
  const detailItems = inboundForm.items.filter(item => item.product_id)
  if (!detailItems.length) {
    ElMessage.warning('请至少添加一条产品明细')
    return
  }
  const hasEmptyQuantity = detailItems.some(item => Number(item.remaining_quantity || 0) > 0 && (!item.inbound_quantity || Number(item.inbound_quantity) <= 0))
  if (hasEmptyQuantity) {
    ElMessage.warning('入库数量不能为空，请填写每条明细的入库数量')
    return
  }
  const items = detailItems.filter(item => Number(item.inbound_quantity || 0) > 0)
  await createPurchaseOrderInbound(inboundForm.id, {
    warehouse_id: inboundForm.warehouse_id,
    inbound_status: inboundForm.inbound_status,
    remark: inboundForm.remark,
    items: items.map(item => ({
      product_id: item.product_id,
      inbound_quantity: Number(item.inbound_quantity || 0),
      price: Number(item.final_price || item.price || 0),
      location: item.location || '',
      remark: item.final_remark || ''
    }))
  })
  ElMessage.success('入库单已提交')
  inboundVisible.value = false
  fetchData()
}

async function handleReturn(row: any) {
  const detail = await fetchOrderDetail(row.id)
  const remainingItems = normalizeOrderItems(detail.items || []).filter(item => Number(item.remaining_quantity || 0) > 0)
  if (!remainingItems.length) {
    ElMessage.warning('该采购单没有剩余可退货数量')
    return
  }
  Object.assign(returnForm, {
    id: detail.id,
    order_no: detail.order_no || '',
    return_no: 'PR{date}{time}{id}******',
    return_status: null,
    express_name: '',
    express_no: '',
    contact: detail.contact || '',
    phone: detail.phone || '',
    address: detail.bank_address || '',
    remark: '',
    items: remainingItems.map(item => ({
      ...item,
      return_quantity: Number(item.remaining_quantity || 0),
      return_amount: Number((Number(item.remaining_quantity || 0) * Number(item.final_price || item.price || 0)).toFixed(2)),
      return_remark: ''
    }))
  })
  returnVisible.value = true
}

async function handleReturnSubmit() {
  if (!returnForm.id) return
  if (returnForm.return_status === null || returnForm.return_status === undefined) {
    ElMessage.warning('请选择退货状态')
    return
  }
  const detailItems = returnForm.items.filter(item => item.product_id)
  if (!detailItems.length) {
    ElMessage.warning('请至少添加一条产品明细')
    return
  }
  const hasEmptyQuantity = detailItems.some(item => Number(item.remaining_quantity || 0) > 0 && (!item.return_quantity || Number(item.return_quantity) <= 0))
  if (hasEmptyQuantity) {
    ElMessage.warning('退货数量不能为空，请填写每条明细的退货数量')
    return
  }
  const items = detailItems.filter(item => Number(item.return_quantity || 0) > 0 || Number(item.return_amount || 0) > 0)
  await createPurchaseOrderReturn(returnForm.id, {
    return_status: returnForm.return_status,
    express_name: returnForm.express_name,
    express_no: returnForm.express_no,
    contact: returnForm.contact,
    phone: returnForm.phone,
    address: returnForm.address,
    remark: returnForm.remark,
    items: items.map(item => ({
      product_id: item.product_id,
      return_quantity: Number(item.return_quantity || 0),
      return_amount: Number(item.return_amount || 0),
      price: Number(item.final_price || item.price || 0),
      remark: item.return_remark || ''
    }))
  })
  ElMessage.success('退单已提交')
  returnVisible.value = false
  fetchData()
}

async function handleCompleteInbound(row: any) {
  await ElMessageBox.confirm(`确认完成入库 ${row.order_no}？完成后会增加库存。`, '提示', { type: 'warning' })
  await completePurchaseInboundByOrder(row.id)
  ElMessage.success('已入库')
  fetchData()
}

async function openCurrentOrderDetail(id: number | null) {
  if (!id) return
  await handleView({ id })
}

async function handleCancel(row: any) {
  await ElMessageBox.confirm(`确认取消订单 ${row.order_no}？`, '提示', { type: 'warning' })
  await cancelPurchaseOrder(row.id)
  ElMessage.success('已取消')
  fetchData()
}

async function handleClose(row: any) {
  await ElMessageBox.confirm(`确认关闭订单 ${row.order_no}？`, '提示', { type: 'warning' })
  await closePurchaseOrder(row.id)
  ElMessage.success('已关闭')
  fetchData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确认删除订单 ${row.order_no}？`, '提示', { type: 'warning' })
  await deletePurchaseOrder(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

function handleOrderCommand(command: string, row: any) {
  const map: Record<string, (row: any) => void | Promise<void>> = {
    edit: handleEdit,
    submit: handleSubmitAudit,
    audit: handleAudit,
    reject: handleReject,
    startPurchase: handleStartPurchase,
    confirmPurchased: handleConfirmPurchased,
    inbound: handleInbound,
    returnOrder: handleReturn,
    completeInbound: handleCompleteInbound,
    cancel: handleCancel,
    close: handleClose,
    delete: handleDelete
  }
  map[command]?.(row)
}

function orderActions(row: any) {
  const status = Number(row.status)
  const hasRemaining = Number(row.remaining_quantity || 0) > 0
  const actions: Array<{ command: string; label: string }> = []
  if (status === 0) actions.push({ command: 'edit', label: '编辑' }, { command: 'submit', label: '提审' }, { command: 'cancel', label: '取消' })
  if (status === 2) actions.push({ command: 'audit', label: '审核通过' }, { command: 'reject', label: '拒绝' }, { command: 'cancel', label: '取消' })
  if (status === 5) actions.push({ command: 'startPurchase', label: '开始采购' }, { command: 'cancel', label: '取消' }, { command: 'close', label: '关闭' })
  if (status === 1) actions.push({ command: 'confirmPurchased', label: '已采确认' }, { command: 'cancel', label: '取消' })
  if ([6, 7, 8].includes(status) && hasRemaining) actions.push({ command: 'inbound', label: '入库' }, { command: 'returnOrder', label: '退单' })
  if ([6, 7, 8].includes(status)) actions.push({ command: 'close', label: '关闭' })
  if ([3, 4].includes(status)) actions.push({ command: 'delete', label: '删除' })
  return actions
}

function handleSupplierChange(value: any) {
  const supplier = suppliers.value.find(item => item.id === value)
  form.supplier_contact = supplier?.contact || ''
  form.supplier_phone = supplier?.phone || ''
}

function filterProducts(keyword = '', categoryId: any = '', brandId: any = '') {
  const text = keyword.trim().toLowerCase()
  return products.value.filter(product => {
    const matchedText = !text || [product.name, product.code, product.barcode, product.spec, product.description].some(value => String(value || '').toLowerCase().includes(text))
    const matchedCategory = !categoryId || product.category_id === categoryId
    const matchedBrand = !brandId || product.brand_id === brandId
    return matchedText && matchedCategory && matchedBrand
  })
}

function selectorState(product: any) {
  if (!selectorStates[product.id]) {
    selectorStates[product.id] = { quantity: 1, unit_name: productUnitName(product), base_quantity: productBaseQuantity(product) }
  }
  return selectorStates[product.id]
}

function isProductAdded(productId: number) {
  return form.items.some(item => item.product_id === productId)
}

function productPrice(product: any) {
  return Number(product.cost_price || product.sale_price || 0)
}

function productUnitName(product: any) {
  return product?.unit_name || productUnits(product)[0]?.unit_name || '个'
}

function productBaseQuantity(product: any) {
  return Number(product?.base_quantity || productUnits(product)[0]?.base_quantity || 1)
}

function productUnits(product: any) {
  if (!product?.units) return []
  if (Array.isArray(product.units)) return product.units
  if (typeof product.units === 'string') {
    try {
      const parsed = JSON.parse(product.units)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function firstProductImage(product: any) {
  const images = normalizeImageUrls(product.image_urls)
  const url = images[0] || ''
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url
}

function normalizeImageUrls(value: any) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function statusText(status: any) {
  const map: Record<number, string> = {
    0: '待提交',
    1: '采购中',
    2: '待审核',
    3: '已取消',
    4: '已关闭',
    5: '已审核',
    6: '已采购',
    7: '入库中',
    8: '已入库',
    9: '已拒绝'
  }
  return map[Number(status)] || '未知'
}

function statusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
    0: 'info',
    1: 'primary',
    2: 'warning',
    3: 'danger',
    4: 'info',
    5: 'success',
    6: 'success',
    7: 'warning',
    8: 'success',
    9: 'danger'
  }
  return map[Number(status)] || 'info'
}

function paymentStatusText(status: any) {
  const map: Record<number, string> = { 0: '未付款', 1: '部分付款', 2: '已付款' }
  return map[Number(status)] || '未付款'
}

function paymentStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning'> = { 0: 'info', 1: 'warning', 2: 'success' }
  return map[Number(status)] || 'info'
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(3)))
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function emptyText(value: any) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function noop() {}

function listOf(res: any) {
  return res.data?.list || res.data || []
}

onMounted(async () => {
  fetchData()
  const [supplierRes, warehouseRes, productRes, categoryRes, brandRes, unitRes]: any[] = await Promise.all([
    getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
    getWarehouses({ page: 1, pageSize: 1000, status: 1 }),
    getProducts({ page: 1, pageSize: 1000, status: 1 }),
    getCategories(),
    getBrands(),
    getUnits()
  ])
  suppliers.value = listOf(supplierRes)
  warehouses.value = listOf(warehouseRes)
  products.value = listOf(productRes)
  categories.value = listOf(categoryRes)
  brands.value = listOf(brandRes)
  units.value = listOf(unitRes)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 10px;
}
.operation-more {
  margin-left: 4px;
}
.search-wide-select {
  width: 240px;
}
.search-status-select {
  width: 160px;
}
.editor-page {
  min-height: 100%;
  background: #fff;
  padding: 16px 0 0;
}
.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px 12px;
  border-bottom: 1px solid #f0f2f5;
  font-weight: 600;
}
.purchase-form {
  padding: 18px 12px 0;
}
.purchase-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  column-gap: 48px;
}
.confirm-form-grid {
  grid-template-columns: repeat(3, minmax(260px, 1fr));
}
.purchase-form-grid :deep(.el-select),
.purchase-form-grid :deep(.el-input) {
  width: 100%;
}
.contact-form-item {
  grid-column: span 2;
}
.contact-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
}
.product-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 2px 0 12px;
}
.purchase-detail-table {
  width: 100%;
}
.purchase-detail-table :deep(.el-table__empty-block) {
  min-height: 320px;
}
.purchase-detail-table :deep(.el-table__empty-text) {
  width: 100%;
}
.purchase-detail-table :deep(.el-input-number),
.purchase-detail-table :deep(.el-input) {
  width: 100%;
}
.confirm-table {
  margin-top: 8px;
}
.help-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff9900;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.edit-mark {
  color: #409eff;
}
.bottom-product-search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 290px;
  margin: 10px 0 0 12px;
}
.search-result-table {
  width: 520px;
  margin: 8px 0 0 12px;
}
.empty-purchase {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b5cf6;
}
.cart-line {
  font-size: 76px;
  line-height: 1;
  color: #555;
}
.editor-footer {
  position: sticky;
  bottom: 0;
  z-index: 6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-top: 24px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}
.total-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  color: #606266;
}
.total-bar strong {
  color: #303133;
  font-size: 16px;
}
.drawer-filter {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 18px;
  padding: 2px 0 12px;
}
.drawer-product-table :deep(.el-input-number) {
  width: 80px;
}
.drawer-product-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.drawer-product-info img,
.product-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f2f5;
}
.drawer-unit-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.drawer-unit-row .el-select {
  width: 70px;
}
.unit-cube {
  color: #409eff;
}
.drawer-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}
.detail-drawer :deep(.el-drawer__body) {
  padding-top: 0;
}
.detail-item-table {
  width: 100%;
}
@media (max-width: 1200px) {
  .purchase-form-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}
</style>
