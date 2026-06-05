<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增采购退货单</el-button>
      </div>

      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="退货单号/供应商" clearable />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="searchForm.supplier_id" placeholder="请选择" clearable filterable>
            <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="return_no" label="退货单号" width="180" />
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip />
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="退货原因" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag type="success" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleView(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增采购退货单' : '采购退货单详情'" width="1120px" top="5vh" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" :disabled="dialogMode === 'view'">
        <div class="return-summary">
          <el-form-item label="退货单号">
            <el-input v-model="form.return_no" placeholder="保存后自动生成" disabled />
          </el-form-item>
          <el-form-item label="入库单">
            <el-select v-model="form.inbound_id" placeholder="选择入库单带出明细" clearable filterable @change="handleInboundChange">
              <el-option v-for="item in inbounds" :key="item.id" :label="`${item.inbound_no} / ${item.supplier_name || ''}`" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="供应商" prop="supplier_id">
            <el-select v-model="form.supplier_id" placeholder="请选择供应商" clearable filterable>
              <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="退货原因">
            <el-input v-model="form.reason" placeholder="请输入退货原因" clearable />
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
          <el-table-column label="单价" width="140" align="right">
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
        <el-button v-if="dialogMode === 'create'" type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { Delete, Plus, View } from '@element-plus/icons-vue'
import { createPurchaseReturn, getPurchaseInbound, getPurchaseInbounds, getPurchaseReturn, getPurchaseReturns } from '@/api/purchase'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

interface ReturnItem {
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
const products = ref<any[]>([])
const inbounds = ref<any[]>([])
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'view'>('create')
const formRef = ref<FormInstance>()
const selectedProductId = ref<number | null>(null)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, dateRange: null as any })
const form = reactive({
  id: null as number | null,
  return_no: '',
  inbound_id: null as any,
  supplier_id: null as any,
  reason: '',
  status: 0,
  items: [] as ReturnItem[]
})
const formRules = {
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }]
}
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.size, keyword: searchForm.keyword, supplier_id: searchForm.supplier_id }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getPurchaseReturns(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { keyword: '', supplier_id: null, dateRange: null }); handleSearch() }

function resetForm() {
  Object.assign(form, { id: null, return_no: '', inbound_id: null, supplier_id: null, reason: '', status: 0, items: [] })
  selectedProductId.value = null
  formRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

async function handleView(row: any) {
  resetForm()
  const res: any = await getPurchaseReturn(row.id)
  const detail = res.data || {}
  Object.assign(form, {
    id: detail.id,
    return_no: detail.return_no || row.return_no || '',
    inbound_id: detail.inbound_id || null,
    supplier_id: detail.supplier_id || row.supplier_id || null,
    reason: detail.reason || '',
    status: Number(detail.status || 0),
    items: (detail.items || []).map((item: any) => createItem({
      product_id: item.product_id || null,
      product_name: item.product_name || '',
      code: item.code || '',
      spec: item.spec || '',
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      amount: Number(item.amount || 0)
    }))
  })
  dialogMode.value = 'view'
  dialogVisible.value = true
}

async function handleInboundChange(value: number) {
  if (!value) return
  const inbound = inbounds.value.find(item => item.id === value)
  if (inbound) form.supplier_id = inbound.supplier_id
  const res: any = await getPurchaseInbound(value)
  form.items = (res.data?.items || []).map((item: any) => createItem({
    product_id: item.product_id || null,
    product_name: item.product_name || '',
    code: item.code || '',
    spec: item.spec || '',
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    amount: Number(item.amount || 0)
  }))
}

function createItem(partial: Partial<ReturnItem> = {}): ReturnItem {
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

function handleProductChange(row: ReturnItem) {
  fillProduct(row)
  recalculateRow(row)
}

function fillProduct(row: ReturnItem) {
  const product = products.value.find(item => item.id === row.product_id)
  if (!product) return
  row.product_name = product.name || ''
  row.code = product.code || ''
  row.spec = product.spec || ''
  row.price = Number(product.cost_price || product.sale_price || row.price || 0)
}

function recalculateRow(row: ReturnItem) {
  row.amount = Number((Number(row.quantity || 0) * Number(row.price || 0)).toFixed(2))
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const items = form.items.filter(item => item.product_id && Number(item.quantity) > 0)
  if (!items.length) {
    ElMessage.warning('请至少添加一条退货明细')
    return
  }
  await createPurchaseReturn({
    inbound_id: form.inbound_id || 0,
    supplier_id: form.supplier_id,
    reason: form.reason,
    items: items.map(item => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0)
    }))
  })
  ElMessage.success('创建成功')
  dialogVisible.value = false
  fetchData()
}

function statusText(_status: any) {
  return '已退货'
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
  const [supplierRes, productRes, inboundRes]: any[] = await Promise.all([
    getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
    getProducts({ page: 1, pageSize: 1000, status: 1 }),
    getPurchaseInbounds({ page: 1, pageSize: 1000 })
  ])
  suppliers.value = listOf(supplierRes)
  products.value = listOf(productRes)
  inbounds.value = listOf(inboundRes)
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
.return-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 0 12px;
}
.return-summary :deep(.el-select) {
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
  .return-summary {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
