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
        <el-table-column prop="return_no" label="退货单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.return_no" /></template>
        </el-table-column>
        <el-table-column prop="order_no" label="采购单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag :type="returnOrderStatusTagType(row.status)" size="small">{{ returnOrderStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.supplier_name) }}</template>
        </el-table-column>
        <el-table-column label="退款总额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.refund_total_amount ?? row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="退款总数" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.refund_total_quantity) }}</template>
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
        <el-table-column prop="contact" label="联系人" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.contact) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.phone) }}</template>
        </el-table-column>
        <el-table-column prop="address" label="收获地址" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.address) }}</template>
        </el-table-column>
        <el-table-column prop="express_name" label="快递名称" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.express_name) }}</template>
        </el-table-column>
        <el-table-column prop="express_no" label="快递单号" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.express_no) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="备注信息" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.reason) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.completed_time) }}</template>
        </el-table-column>
        <el-table-column label="取消时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.cancel_time) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleView(row)">详情</el-button>
            <el-button v-if="Number(row.status) === 0" type="success" link @click="handleComplete(row)">退货</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增采购退货单' : '采购退货单详情'" width="1120px" top="5vh" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" :disabled="dialogMode === 'view'">
        <div class="return-summary">
          <el-form-item label="退货单号">
            <el-input v-model="form.return_no" placeholder="保存后自动生成" disabled>
              <template #append><CopyableNo :value="form.return_no" icon-only /></template>
            </el-input>
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

    <el-drawer v-model="drawerVisible" title="采购退货单详情" size="72%" direction="rtl" class="detail-drawer">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="退货单号"><CopyableNo :value="detail.return_no" /></el-descriptions-item>
            <el-descriptions-item label="采购单号"><CopyableNo :value="detail.order_no" /></el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="returnOrderStatusTagType(detail.status)" size="small">{{ returnOrderStatusText(detail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(detail.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="退款总额">¥{{ formatMoney(detail.refund_total_amount ?? detail.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="退款总数">{{ formatQuantity(detailRefundTotalQuantity) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detail.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(detail.phone) }}</el-descriptions-item>
            <el-descriptions-item label="收货地址">{{ emptyText(detail.address) }}</el-descriptions-item>
            <el-descriptions-item label="快递名称">{{ emptyText(detail.express_name) }}</el-descriptions-item>
            <el-descriptions-item label="快递单号">{{ emptyText(detail.express_no) }}</el-descriptions-item>
            <el-descriptions-item label="备注信息">{{ emptyText(detail.reason) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatDateTime(detail.completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="取消时间">{{ formatDateTime(detail.cancel_time) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="商品列表" name="items">
          <el-table :data="detail.items" stripe class="detail-table">
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="code" label="编码" width="120" show-overflow-tooltip />
            <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
            <el-table-column label="数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
            </el-table-column>
            <el-table-column label="单价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ emptyText(row.remark) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-dialog v-model="completeDialogVisible" title="退货" width="520px" @close="resetCompleteForm">
      <el-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="90px">
        <el-form-item label="快递名称">
          <el-input v-model="completeForm.express_name" placeholder="请输入快递名称" clearable />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="completeForm.express_no" placeholder="请输入快递单号" clearable />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="completeForm.remark" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCompleteSubmit">确认退货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { Delete, Plus, View } from '@element-plus/icons-vue'
import { completePurchaseReturn, createPurchaseReturn, getPurchaseInbound, getPurchaseInbounds, getPurchaseReturn, getPurchaseReturns } from '@/api/purchase'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { returnOrderStatusTagType, returnOrderStatusText } from '@/utils/status'

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
const drawerVisible = ref(false)
const completeDialogVisible = ref(false)
const activeTab = ref('basic')
const formRef = ref<FormInstance>()
const completeFormRef = ref<FormInstance>()
const selectedProductId = ref<number | null>(null)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, dateRange: null as any })
const detail = reactive<any>({ items: [] })
const completeForm = reactive({
  id: null as number | null,
  return_no: '',
  express_name: '',
  express_no: '',
  remark: ''
})
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
const completeRules = {
  remark: [{ max: 200, message: '备注最多200个字', trigger: 'blur' }]
}
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const detailRefundTotalQuantity = computed(() => detail.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0))

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

function resetCompleteForm() {
  Object.assign(completeForm, { id: null, return_no: '', express_name: '', express_no: '', remark: '' })
  completeFormRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

async function handleView(row: any) {
  const res: any = await getPurchaseReturn(row.id)
  Object.assign(detail, { ...row, ...(res.data || {}), items: res.data?.items || [] })
  activeTab.value = 'basic'
  drawerVisible.value = true
}

function handleComplete(row: any) {
  Object.assign(completeForm, {
    id: row.id,
    return_no: row.return_no || '',
    express_name: row.express_name || '',
    express_no: row.express_no || '',
    remark: row.reason || ''
  })
  completeDialogVisible.value = true
}

async function handleCompleteSubmit() {
  const valid = await completeFormRef.value?.validate().catch(() => false)
  if (!valid || !completeForm.id) return
  await completePurchaseReturn(completeForm.id, {
    express_name: completeForm.express_name,
    express_no: completeForm.express_no,
    remark: completeForm.remark
  })
  ElMessage.success('退货成功')
  completeDialogVisible.value = false
  fetchData()
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
