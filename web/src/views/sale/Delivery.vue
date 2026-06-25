<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="发货单id/发货单号/销售单号/客户" clearable />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="发货状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待发货" :value="0" />
            <el-option label="已发货" :value="1" />
            <el-option label="已收货" :value="2" />
            <el-option label="已取消" :value="3" />
            <el-option label="已关闭" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" :icon="Van" @click="createDialogVisible = true">发货</el-button>
        <el-button type="success" :icon="CircleCheck" :disabled="selectedRows.length === 0" :loading="batchReceiving" @click="handleToolbarReceive">收货</el-button>
        <span v-if="selectedRows.length" class="selection-tip">已选择 {{ selectedRows.length }} 条</span>
      </div>

      <TableColumnTools table-key="sale-delivery" filename="销售发货单" />

      <el-table border :data="tableData" stripe v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="48" fixed="left" />
        <el-table-column prop="id" label="发货单id" width="100" />
        <el-table-column prop="delivery_no" label="发货单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.delivery_no" /></template>
        </el-table-column>
        <el-table-column prop="order_no" label="销售单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column label="发货状态" width="100">
          <template #default="{ row }"><el-tag :type="deliveryStatusTagType(row.status)" size="small">{{ deliveryStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="退货状态" width="100">
          <template #default="{ row }"><el-tag :type="returnFlagTagType(row.return_status)" size="small">{{ returnFlagText(row.return_status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="warehouse_name" label="仓库" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.warehouse_name) }}</template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.customer_name) }}</template>
        </el-table-column>
        <el-table-column prop="employee_name" label="职员" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.employee_name) }}</template>
        </el-table-column>
        <el-table-column label="单价" width="110" align="right">
          <template #default="{ row }">{{ unitPriceText(row) }}</template>
        </el-table-column>
        <el-table-column label="税金" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_tax) }}</template>
        </el-table-column>
        <el-table-column label="总价" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="发货总数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.delivery_total_quantity) }}</template>
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
        <el-table-column prop="detail_address" label="收货地址" width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.detail_address) }}</template>
        </el-table-column>
        <el-table-column prop="logistics_company" label="快递名称" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.logistics_company) }}</template>
        </el-table-column>
        <el-table-column prop="logistics_no" label="快递单号" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.logistics_no) }}</template>
        </el-table-column>
        <el-table-column prop="admin_remark" label="管理员备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.admin_remark) }}</template>
        </el-table-column>
        <el-table-column prop="delivery_remark" label="发货单备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.delivery_remark) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.completed_time) }}</template>
        </el-table-column>
        <el-table-column label="发货时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.shipped_time) }}</template>
        </el-table-column>
        <el-table-column label="取消时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.cancel_time) }}</template>
        </el-table-column>
        <el-table-column label="关闭时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.close_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-dropdown v-if="[0, 1, 2].includes(Number(row.status))" trigger="hover">
              <el-button type="primary" link>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="Number(row.status) === 0" @click="openShipDialog(row)">发货</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 0" @click="handleCancel(row)">取消</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 1" @click="handleReceive(row)">收货</el-dropdown-item>
                  <el-dropdown-item v-if="[1, 2].includes(Number(row.status))" @click="handleReturn(row)">退货</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-drawer v-model="drawerVisible" title="销售发货单详情" size="72%" direction="rtl">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="发货单id">{{ emptyText(detail.id) }}</el-descriptions-item>
            <el-descriptions-item label="发货单号"><CopyableNo :value="detail.delivery_no" /></el-descriptions-item>
            <el-descriptions-item label="销售单号"><CopyableNo :value="detail.order_no" /></el-descriptions-item>
            <el-descriptions-item label="发货状态"><el-tag :type="deliveryStatusTagType(detail.status)" size="small">{{ deliveryStatusText(detail.status) }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="退货状态"><el-tag :type="returnFlagTagType(detail.return_status)" size="small">{{ returnFlagText(detail.return_status) }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="仓库">{{ emptyText(detail.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ emptyText(detail.customer_name) }}</el-descriptions-item>
            <el-descriptions-item label="职员">{{ emptyText(detail.employee_name) }}</el-descriptions-item>
            <el-descriptions-item label="税金">¥{{ formatMoney(detail.total_tax) }}</el-descriptions-item>
            <el-descriptions-item label="总价">¥{{ formatMoney(detail.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="发货总数量">{{ formatQuantity(detail.delivery_total_quantity) }}</el-descriptions-item>
            <el-descriptions-item label="退款金额">¥{{ formatMoney(detail.refund_amount) }}</el-descriptions-item>
            <el-descriptions-item label="退货数量">{{ formatQuantity(detail.return_quantity) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detail.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(detail.phone) }}</el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="2">{{ emptyText(detail.detail_address) }}</el-descriptions-item>
            <el-descriptions-item label="快递名称">{{ emptyText(detail.logistics_company) }}</el-descriptions-item>
            <el-descriptions-item label="快递单号">{{ emptyText(detail.logistics_no) }}</el-descriptions-item>
            <el-descriptions-item label="管理员备注信息" :span="2">{{ emptyText(detail.admin_remark) }}</el-descriptions-item>
            <el-descriptions-item label="发货单备注信息" :span="2">{{ emptyText(detail.delivery_remark) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatDateTime(detail.completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="发货时间">{{ formatDateTime(detail.shipped_time) }}</el-descriptions-item>
            <el-descriptions-item label="取消时间">{{ formatDateTime(detail.cancel_time) }}</el-descriptions-item>
            <el-descriptions-item label="关闭时间">{{ formatDateTime(detail.close_time) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="商品列表" name="items">
          <el-table border :data="detail.items" stripe>
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="code" label="编码" width="130" show-overflow-tooltip />
            <el-table-column prop="spec" label="规格" width="130" show-overflow-tooltip />
            <el-table-column label="数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
            </el-table-column>
            <el-table-column label="单价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-dialog v-model="createDialogVisible" title="创建销售发货单" width="480px" @closed="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px" @submit.prevent>
        <el-form-item label="销售订单号" prop="order_no">
          <el-input
            v-model="createForm.order_no"
            maxlength="50"
            clearable
            autofocus
            placeholder="请输入销售订单号"
            @keyup.enter="submitCreateDelivery"
          />
        </el-form-item>
      </el-form>
      <el-alert :closable="false" type="info" show-icon>
        创建后发货单默认为待发货状态。
      </el-alert>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreateDelivery">确认创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shipDialogVisible" title="发货" width="520px" @closed="resetShipForm">
      <el-alert :closable="false" type="warning" show-icon>
        发货后将扣减仓库库存，发货单号：<CopyableNo :value="shipTarget?.delivery_no" />
      </el-alert>
      <el-form label-width="100px" class="ship-form">
        <el-form-item label="快递名称">
          <el-input v-model="shipForm.logistics_company" maxlength="100" placeholder="请输入快递名称" />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="shipForm.logistics_no" maxlength="100" placeholder="请输入快递单号" />
        </el-form-item>
        <el-form-item label="备注信息">
          <el-input v-model="shipForm.delivery_remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipSubmitting" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { CircleCheck, Van } from '@element-plus/icons-vue'
import { batchReceiveSaleDeliveries, cancelSaleDelivery, createSaleDelivery, getSaleDeliveries, getSaleDelivery, receiveSaleDelivery, shipSaleDelivery } from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { deliveryStatusTagType, deliveryStatusText, returnFlagTagType, returnFlagText } from '@/utils/status'

const loading = ref(false)
const router = useRouter()
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const selectedRows = ref<any[]>([])
const batchReceiving = ref(false)
const drawerVisible = ref(false)
const activeTab = ref('basic')
const detail = reactive<any>({ items: [] })
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', customer_id: null as any, status: null as any, dateRange: null as any })
const createDialogVisible = ref(false)
const createSubmitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({ order_no: '' })
const createRules = {
  order_no: [{ required: true, message: '请输入销售订单号', trigger: 'blur' }]
}
const shipDialogVisible = ref(false)
const shipSubmitting = ref(false)
const shipTarget = ref<any>(null)
const shipForm = reactive({ logistics_company: '', logistics_no: '', delivery_remark: '' })

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      customer_id: searchForm.customer_id,
      status: searchForm.status
    }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getSaleDeliveries(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
    selectedRows.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  Object.assign(searchForm, { keyword: '', customer_id: null, status: null, dateRange: null })
  handleSearch()
}

function handleSelectionChange(rows: any[]) {
  selectedRows.value = rows
}

async function handleView(row: any) {
  const res: any = await getSaleDelivery(row.id)
  Object.assign(detail, { ...row, ...(res.data || {}), items: res.data?.items || [] })
  activeTab.value = 'basic'
  drawerVisible.value = true
}

async function handleToolbarReceive() {
  const invalidRows = selectedRows.value.filter(row => Number(row.status) !== 1)
  if (invalidRows.length) {
    ElMessage.warning(`仅已发货单允许收货：${invalidRows.map(row => row.delivery_no).join('、')}`)
    return
  }
  const count = selectedRows.value.length
  await ElMessageBox.confirm(`确认将选中的 ${count} 条发货单完成收货？`, '批量确认收货', {
    type: 'warning',
    confirmButtonText: '确认收货',
    cancelButtonText: '取消'
  })
  batchReceiving.value = true
  try {
    await batchReceiveSaleDeliveries(selectedRows.value.map(row => Number(row.id)))
    ElMessage.success(`已完成 ${count} 条发货单收货`)
    await fetchData()
  } finally {
    batchReceiving.value = false
  }
}

async function submitCreateDelivery() {
  await createFormRef.value?.validate()
  createSubmitting.value = true
  try {
    const res: any = await createSaleDelivery({ order_no: createForm.order_no.trim() })
    ElMessage.success(`发货单 ${res.data?.delivery_no || ''} 创建成功`)
    createDialogVisible.value = false
    await fetchData()
  } finally {
    createSubmitting.value = false
  }
}

function resetCreateForm() {
  createForm.order_no = ''
  createFormRef.value?.clearValidate()
}

function openShipDialog(row: any) {
  shipTarget.value = row
  Object.assign(shipForm, {
    logistics_company: row.logistics_company || '',
    logistics_no: row.logistics_no || '',
    delivery_remark: row.delivery_remark || ''
  })
  shipDialogVisible.value = true
}

async function submitShip() {
  if (!shipTarget.value) return
  shipSubmitting.value = true
  try {
    await shipSaleDelivery(shipTarget.value.id, { ...shipForm })
    ElMessage.success('发货成功')
    shipDialogVisible.value = false
    await fetchData()
  } finally {
    shipSubmitting.value = false
  }
}

async function handleCancel(row: any) {
  await ElMessageBox.confirm(`确定取消发货单 ${row.delivery_no}？`, '提示', { type: 'warning' })
  await cancelSaleDelivery(row.id)
  ElMessage.success('取消成功')
  fetchData()
}

async function handleReceive(row: any) {
  await ElMessageBox.confirm(`确认发货单 ${row.delivery_no} 已完成收货？`, '确认收货', {
    type: 'warning',
    confirmButtonText: '确认收货',
    cancelButtonText: '取消'
  })
  await receiveSaleDelivery(row.id)
  ElMessage.success('收货成功')
  fetchData()
}

function handleReturn(row: any) {
  router.push({ name: 'SaleDeliveryReturn', params: { id: row.id } })
}

function resetShipForm() {
  shipTarget.value = null
  Object.assign(shipForm, { logistics_company: '', logistics_no: '', delivery_remark: '' })
}

function unitPriceText(row: any) {
  if (row.unit_price === null || row.unit_price === undefined) return Number(row.item_count || 0) > 1 ? '多产品' : '-'
  return `¥${formatMoney(row.unit_price)}`
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function emptyText(value: any) {
  return value === undefined || value === null || value === '' ? '-' : value
}

onMounted(async () => {
  fetchData()
  const res: any = await getSuppliers({ page: 1, pageSize: 1000, type: 'customer', status: 1 })
  customers.value = res.data?.list || res.data || []
})
</script>

<style scoped>
.page-container {
  height: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.selection-tip {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.ship-form {
  margin-top: 20px;
}
</style>

