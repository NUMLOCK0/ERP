<template>
  <div class="page-container">
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
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="制单人" width="110" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="1180px" top="5vh" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" :disabled="dialogMode === 'view'">
        <div class="order-summary">
          <el-form-item label="订单号">
            <el-input v-model="form.order_no" placeholder="保存后自动生成" disabled />
          </el-form-item>
          <el-form-item label="状态">
            <el-tag :type="statusTagType(form.status)">{{ statusText(form.status) }}</el-tag>
          </el-form-item>
          <el-form-item label="供应商" prop="supplier_id">
            <el-select v-model="form.supplier_id" placeholder="请选择供应商" clearable filterable>
              <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="入库仓库" prop="warehouse_id">
            <el-select v-model="form.warehouse_id" placeholder="请选择仓库" clearable filterable>
              <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
          </el-form-item>
        </div>

        <div class="detail-toolbar">
          <el-select v-model="selectedProductId" placeholder="选择产品加入明细" clearable filterable :disabled="dialogMode === 'view'">
            <el-option v-for="p in products" :key="p.id" :label="productOptionLabel(p)" :value="p.id" />
          </el-select>
          <el-button type="primary" :icon="Plus" :disabled="dialogMode === 'view'" @click="addSelectedProduct">添加产品</el-button>
        </div>

        <el-table :data="form.items" border class="detail-table">
          <el-table-column label="产品" min-width="220">
            <template #default="{ row }">
              <el-select v-model="row.product_id" placeholder="请选择产品" filterable :disabled="dialogMode === 'view'" @change="handleProductChange(row)">
                <el-option v-for="p in products" :key="p.id" :label="productOptionLabel(p)" :value="p.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="code" label="编码" width="120" />
          <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
          <el-table-column label="数量" width="140" align="right">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="0.001" :precision="3" :controls="false" :disabled="dialogMode === 'view'" @change="recalculateRow(row)" />
            </template>
          </el-table-column>
          <el-table-column label="采购价" width="140" align="right">
            <template #default="{ row }">
              <el-input-number v-model="row.price" :min="0" :precision="2" :controls="false" :disabled="dialogMode === 'view'" @change="recalculateRow(row)" />
            </template>
          </el-table-column>
          <el-table-column label="金额" width="130" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ $index }">
              <el-button type="danger" link :icon="Delete" :disabled="dialogMode === 'view'" @click="removeItem($index)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>

      <div class="total-bar">
        <span>明细 {{ form.items.length }} 行</span>
        <strong>合计：¥{{ formatMoney(totalAmount) }}</strong>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ dialogMode === 'view' ? '关闭' : '取消' }}</el-button>
        <el-button v-if="dialogMode !== 'view'" type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Delete, Edit, Plus, View } from '@element-plus/icons-vue'
import { auditPurchaseOrder, cancelPurchaseOrder, createPurchaseOrder, getPurchaseOrder, getPurchaseOrders, submitPurchaseOrder, updatePurchaseOrder } from '@/api/purchase'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

interface PurchaseItem {
  product_id: number | null
  product_name: string
  code: string
  spec: string
  quantity: number
  price: number
  amount: number
}

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit' | 'view'>('add')
const formRef = ref<FormInstance>()
const selectedProductId = ref<number | null>(null)

const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, status: null as any, dateRange: null as any })
const form = reactive({
  id: null as number | null,
  order_no: '',
  supplier_id: null as any,
  warehouse_id: null as any,
  status: 0,
  items: [] as PurchaseItem[]
})
const formRules = {
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  warehouse_id: [{ required: true, message: '请选择仓库', trigger: 'change' }]
}
const statusOptions = [
  { label: '草稿', value: 0 },
  { label: '待审核', value: 2 },
  { label: '已审核', value: 1 },
  { label: '已取消', value: 3 }
]
const dialogTitle = computed(() => {
  const map = { add: '新增采购订单', edit: '编辑采购订单', view: '采购订单详情' }
  return map[dialogMode.value]
})
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))

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
  Object.assign(form, { id: null, order_no: '', supplier_id: null, warehouse_id: null, status: 0, items: [] })
  selectedProductId.value = null
  formRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  dialogMode.value = 'add'
  form.items = [createItem()]
  dialogVisible.value = true
}

async function handleEdit(row: any) {
  await loadOrder(row.id)
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function handleView(row: any) {
  await loadOrder(row.id)
  dialogMode.value = 'view'
  dialogVisible.value = true
}

async function loadOrder(id: number) {
  resetForm()
  const res: any = await getPurchaseOrder(id)
  const detail = res.data || {}
  Object.assign(form, {
    id: detail.id,
    order_no: detail.order_no || '',
    supplier_id: detail.supplier_id || null,
    warehouse_id: detail.warehouse_id || null,
    status: Number(detail.status || 0)
  })
  form.items = (detail.items || []).map((item: any) => createItem({
    product_id: item.product_id || null,
    product_name: item.product_name || '',
    code: item.code || '',
    spec: item.spec || '',
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    amount: Number(item.amount || 0)
  }))
}

function createItem(partial: Partial<PurchaseItem> = {}): PurchaseItem {
  return {
    product_id: partial.product_id ?? null,
    product_name: partial.product_name ?? '',
    code: partial.code ?? '',
    spec: partial.spec ?? '',
    quantity: partial.quantity ?? 1,
    price: partial.price ?? 0,
    amount: partial.amount ?? 0
  }
}

function addSelectedProduct() {
  if (!selectedProductId.value) return
  const row = createItem({ product_id: selectedProductId.value })
  fillProduct(row)
  recalculateRow(row)
  form.items.push(row)
  selectedProductId.value = null
}

function handleProductChange(row: PurchaseItem) {
  fillProduct(row)
  recalculateRow(row)
}

function fillProduct(row: PurchaseItem) {
  const product = products.value.find(item => item.id === row.product_id)
  if (!product) return
  row.product_name = product.name || ''
  row.code = product.code || ''
  row.spec = product.spec || ''
  row.price = Number(product.cost_price || product.sale_price || row.price || 0)
}

function recalculateRow(row: PurchaseItem) {
  row.amount = Number(((Number(row.quantity || 0)) * Number(row.price || 0)).toFixed(2))
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
    warehouse_id: form.warehouse_id,
    items: items.map(item => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0)
    }))
  }
  if (dialogMode.value === 'edit' && form.id) {
    await updatePurchaseOrder(form.id, payload)
    ElMessage.success('更新成功')
  } else {
    await createPurchaseOrder(payload)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
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

function statusText(status: any) {
  const map: Record<number, string> = { 0: '草稿', 1: '已审核', 2: '待审核', 3: '已取消' }
  return map[Number(status)] || '未知'
}

function statusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = { 0: 'info', 1: 'success', 2: 'warning', 3: 'danger' }
  return map[Number(status)] || 'info'
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function productOptionLabel(product: any) {
  return [product.name, product.code, product.spec].filter(Boolean).join(' / ')
}

function listOf(res: any) {
  return res.data?.list || res.data || []
}

onMounted(async () => {
  fetchData()
  const [supplierRes, warehouseRes, productRes]: any[] = await Promise.all([
    getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
    getWarehouses({ page: 1, pageSize: 1000, status: 1 }),
    getProducts({ page: 1, pageSize: 1000, status: 1 })
  ])
  suppliers.value = listOf(supplierRes)
  warehouses.value = listOf(warehouseRes)
  products.value = listOf(productRes)
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
.order-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 0 12px;
}
.order-summary :deep(.el-select) {
  width: 100%;
}
.detail-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.detail-toolbar .el-select {
  width: 360px;
}
.detail-table :deep(.el-select),
.detail-table :deep(.el-input-number) {
  width: 100%;
}
.total-bar {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 24px;
  color: #606266;
}
.total-bar strong {
  color: #303133;
  font-size: 16px;
}
@media (max-width: 1100px) {
  .order-summary {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
