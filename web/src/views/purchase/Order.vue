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
              <el-input v-model="form.order_no" placeholder="P{date}{time}{id}******" :disabled="editorMode !== 'add'" />
            </el-form-item>
            <el-form-item label="供应商" prop="supplier_id" required>
              <el-select v-model="form.supplier_id" placeholder="请选择..." clearable filterable @change="handleSupplierChange">
                <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="付款方式">
              <el-select v-model="form.payment_method" placeholder="未确定" clearable>
                <el-option label="未确定" value="" />
                <el-option label="现金" value="现金" />
                <el-option label="银行转账" value="银行转账" />
                <el-option label="微信" value="微信" />
                <el-option label="支付宝" value="支付宝" />
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

          <div v-if="!form.items.length" class="empty-purchase">
            <div class="cart-line">▱</div>
            <div>
              <el-button link type="primary" @click="openProductDrawer">选择产品</el-button>
              <el-button link type="primary" @click="addBlankItem">添加产品</el-button>
            </div>
          </div>
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
                <el-icon class="unit-cube"><Box /></el-icon>
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

    <template v-else>
      <el-card>
        <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
          <el-form-item label="关键词">
            <el-input v-model="searchForm.keyword" placeholder="订单号/供应商" clearable />
          </el-form-item>
          <el-form-item label="供应商">
            <el-select v-model="searchForm.supplier_id" placeholder="请选择" clearable filterable>
              <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择" clearable>
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
          <el-table-column prop="order_no" label="采购单号" width="180" />
          <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip />
          <el-table-column label="采购的状态" width="110">
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
              <el-tag :type="row.return_status ? 'warning' : 'info'" size="small">{{ row.return_status ? '有退货' : '无退货' }}</el-tag>
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
          <el-table-column label="操作" width="300" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link :icon="View" @click="handleView(row)">详情</el-button>
              <el-button v-if="Number(row.status) === 0" type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button v-if="Number(row.status) === 0" type="warning" link @click="handleSubmitAudit(row)">提审</el-button>
              <el-button v-if="[0, 2].includes(Number(row.status))" type="success" link @click="handleAudit(row)">审核</el-button>
              <el-button v-if="[0, 2].includes(Number(row.status))" type="danger" link @click="handleCancel(row)">取消</el-button>
            </template>
          </el-table-column>
        </el-table>

        <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Box, Edit, Plus, Search, View } from '@element-plus/icons-vue'
import { auditPurchaseOrder, cancelPurchaseOrder, createPurchaseOrder, getPurchaseOrder, getPurchaseOrders, submitPurchaseOrder, updatePurchaseOrder } from '@/api/purchase'
import { getBrands } from '@/api/brand'
import { getCategories } from '@/api/category'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import { getUnits } from '@/api/unit'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

interface PurchaseItem {
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
const editorMode = ref<'add' | 'edit' | 'view'>('add')
const productDrawerVisible = ref(false)
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
const formRules = {
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }]
}
const statusOptions = [
  { label: '草稿', value: 0 },
  { label: '待审核', value: 2 },
  { label: '已审核', value: 1 },
  { label: '已取消', value: 3 }
]
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
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
  await loadOrder(row.id)
  editorMode.value = 'view'
  editorVisible.value = true
}

function leaveEditor() {
  editorVisible.value = false
  productDrawerVisible.value = false
}

async function loadOrder(id: number) {
  resetForm()
  const res: any = await getPurchaseOrder(id)
  const detail = res.data || {}
  Object.assign(form, {
    id: detail.id,
    order_no: detail.order_no || '',
    supplier_id: detail.supplier_id || null,
    warehouse_id: detail.warehouse_id || warehouses.value[0]?.id || null,
    status: Number(detail.status || 0)
  })
  handleSupplierChange(form.supplier_id)
  form.items = (detail.items || []).map((item: any) => createItem({
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
    remark: item.remark || ''
  }))
}

function createItem(partial: Partial<PurchaseItem> = {}): PurchaseItem {
  return {
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
    remark: partial.remark ?? ''
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
}

function recalculateRow(row: PurchaseItem) {
  row.amount = Number((Number(row.quantity || 0) * Number(row.price || 0) + Number(row.tax || 0)).toFixed(2))
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const items = form.items.filter(item => item.product_id && Number(item.quantity) > 0)
  if (!items.length) {
    ElMessage.warning('请至少添加一条产品明细')
    return
  }
  const payload = {
    supplier_id: form.supplier_id,
    warehouse_id: form.warehouse_id || warehouses.value[0]?.id || 0,
    items: items.map(item => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0)
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
  await ElMessageBox.confirm(`审核通过后会生成采购入库单并增加库存，确认审核 ${row.order_no}？`, '提示', { type: 'warning' })
  await auditPurchaseOrder(row.id)
  ElMessage.success('审核通过')
  fetchData()
}

async function handleCancel(row: any) {
  await ElMessageBox.confirm(`确认取消订单 ${row.order_no}？`, '提示', { type: 'warning' })
  await cancelPurchaseOrder(row.id)
  ElMessage.success('已取消')
  fetchData()
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
  return `http://localhost:3000${url}`
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
  const map: Record<number, string> = { 0: '草稿', 1: '已审核', 2: '待审核', 3: '已取消' }
  return map[Number(status)] || '未知'
}

function statusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = { 0: 'info', 1: 'success', 2: 'warning', 3: 'danger' }
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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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
.purchase-detail-table :deep(.el-input-number),
.purchase-detail-table :deep(.el-input) {
  width: 100%;
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
@media (max-width: 1200px) {
  .purchase-form-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}
</style>
