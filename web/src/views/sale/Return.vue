<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="退单id/退货单号/发货单号/销售单号/客户" clearable />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待退货" :value="0" />
            <el-option label="已退货" :value="1" />
            <el-option label="已取消" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" :icon="RefreshLeft" @click="openCreateDialog">退单</el-button>
      </div>

      <TableColumnTools table-key="sale-return" filename="销售退货单" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="退单id" width="90" />
        <el-table-column prop="return_no" label="退货单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.return_no" /></template>
        </el-table-column>
        <el-table-column prop="delivery_no" label="销售发货单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.delivery_no" /></template>
        </el-table-column>
        <el-table-column prop="order_no" label="销售单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="returnOrderStatusTagType(row.status)" size="small">{{ returnOrderStatusText(row.status) }}</el-tag>
          </template>
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
        <el-table-column label="退款总额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.refund_total_amount) }}</template>
        </el-table-column>
        <el-table-column label="退货总数" width="110" align="right">
          <template #default="{ row }">{{ formatQuantity(row.return_total_quantity) }}</template>
        </el-table-column>
        <el-table-column label="单价" width="110" align="right">
          <template #default="{ row }">{{ unitPriceText(row) }}</template>
        </el-table-column>
        <el-table-column label="税金" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.tax_amount) }}</template>
        </el-table-column>
        <el-table-column label="总价" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_price) }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.contact) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.phone) }}</template>
        </el-table-column>
        <el-table-column prop="address" label="收货地址" width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.address) }}</template>
        </el-table-column>
        <el-table-column prop="express_name" label="快递名称" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.express_name) }}</template>
        </el-table-column>
        <el-table-column prop="express_no" label="快递单号" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.express_no) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="备注信息" width="180" show-overflow-tooltip>
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
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
            <el-dropdown v-if="[0, 1, 2].includes(Number(row.status))" trigger="hover">
              <el-button type="primary" link>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="Number(row.status) === 0" @click="openCompleteDialog(row)">退货</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 0" @click="handleCancel(row)">取消</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 1" @click="handleRefund(row)">退款</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 2" @click="handleDelete(row)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="createDialogVisible" title="发货退单" width="480px" @closed="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="120px" @submit.prevent>
        <el-form-item label="销售发货单号" prop="delivery_no">
          <el-input
            v-model="createForm.delivery_no"
            clearable
            autofocus
            maxlength="50"
            placeholder="请输入销售发货单号"
            @keyup.enter="submitCreate"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">下一步</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="completeDialogVisible" title="退货" width="520px" @closed="resetCompleteForm">
      <el-alert :closable="false" type="warning" show-icon>
        确认完成退货后将把商品数量退回库存，退货单号：<CopyableNo :value="completeTarget?.return_no" />
      </el-alert>
      <el-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="100px" class="complete-form">
        <el-form-item label="快递名称">
          <el-input v-model="completeForm.express_name" maxlength="100" placeholder="请输入快递名称" />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="completeForm.express_no" maxlength="100" placeholder="请输入快递单号" />
        </el-form-item>
        <el-form-item label="备注" prop="reason">
          <el-input v-model="completeForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="completeSubmitting" @click="submitComplete">确认退货</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailDrawerVisible" title="发货退货单详情" size="72%" direction="rtl">
      <div v-loading="detailLoading" class="return-detail">
        <el-descriptions title="基础信息" :column="2" border>
          <el-descriptions-item label="退货单号"><CopyableNo :value="detailData.return_no" /></el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="returnOrderStatusTagType(detailData.status)" size="small">
              {{ returnOrderStatusText(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="销售发货单号"><CopyableNo :value="detailData.delivery_no" /></el-descriptions-item>
          <el-descriptions-item label="销售单号"><CopyableNo :value="detailData.order_no" /></el-descriptions-item>
          <el-descriptions-item label="客户">{{ emptyText(detailData.customer_name) }}</el-descriptions-item>
          <el-descriptions-item label="职员">{{ emptyText(detailData.employee_name) }}</el-descriptions-item>
          <el-descriptions-item label="仓库">{{ emptyText(detailData.warehouse_name) }}</el-descriptions-item>
          <el-descriptions-item label="退款总额">¥{{ formatMoney(detailTotalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ emptyText(detailData.contact) }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ emptyText(detailData.phone) }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ emptyText(detailData.address) }}</el-descriptions-item>
          <el-descriptions-item label="快递名称">{{ emptyText(detailData.express_name) }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">{{ emptyText(detailData.express_no) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatDateTime(detailData.completed_time) }}</el-descriptions-item>
          <el-descriptions-item label="取消时间">{{ formatDateTime(detailData.cancel_time) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detailData.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(detailData.updated_at) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ emptyText(detailData.reason) }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section-title">退货商品列表</div>
        <el-table :data="detailData.items || []" border stripe class="detail-table">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="product_name" label="产品名称" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.product_name) }}</template>
          </el-table-column>
          <el-table-column prop="code" label="编码" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.code) }}</template>
          </el-table-column>
          <el-table-column prop="spec" label="规格" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.spec) }}</template>
          </el-table-column>
          <el-table-column label="退货数量" width="110" align="right">
            <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
          </el-table-column>
          <el-table-column label="单价" width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
          </el-table-column>
          <el-table-column label="税金" width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.tax) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ emptyText(row.remark) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { RefreshLeft } from '@element-plus/icons-vue'
import {
  cancelSaleReturn,
  completeSaleReturn,
  deleteSaleReturn,
  getSaleDeliveries,
  getSaleReturn,
  getSaleReturns
} from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { returnOrderStatusTagType, returnOrderStatusText } from '@/utils/status'

const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({
  keyword: '',
  customer_id: null as number | null,
  status: null as number | null,
  dateRange: null as string[] | null
})

const createDialogVisible = ref(false)
const createSubmitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({ delivery_no: '' })
const createRules = {
  delivery_no: [{ required: true, message: '请输入销售发货单号', trigger: 'blur' }]
}

const completeDialogVisible = ref(false)
const completeSubmitting = ref(false)
const completeFormRef = ref<FormInstance>()
const completeTarget = ref<any>(null)
const completeForm = reactive({ express_name: '', express_no: '', reason: '' })
const completeRules = {
  reason: [{ max: 200, message: '备注最多200个字符', trigger: 'blur' }]
}

const detailDrawerVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any>({})
const detailTotalAmount = computed(() => {
  const itemTotal = (detailData.value.items || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  return itemTotal || detailData.value.refund_total_amount || detailData.value.total_amount || 0
})

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      customer_id: searchForm.customer_id,
      status: searchForm.status ?? ''
    }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getSaleReturns(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
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

function openCreateDialog() {
  createDialogVisible.value = true
}

async function submitCreate() {
  await createFormRef.value?.validate()
  createSubmitting.value = true
  try {
    const deliveryNo = createForm.delivery_no.trim()
    const res: any = await getSaleDeliveries({ page: 1, pageSize: 100, keyword: deliveryNo })
    const deliveries = res.data?.list || []
    const delivery = deliveries.find(
      (item: any) => String(item.delivery_no).trim().toLowerCase() === deliveryNo.toLowerCase()
    )
    if (!delivery) {
      ElMessage.warning('销售发货单不存在')
      return
    }
    if (![1, 2].includes(Number(delivery.status))) {
      ElMessage.warning('仅已发货或已收货单允许退货')
      return
    }
    createDialogVisible.value = false
    await router.push({ name: 'SaleDeliveryReturn', params: { id: delivery.id }, query: { from: 'return' } })
  } finally {
    createSubmitting.value = false
  }
}

function resetCreateForm() {
  createForm.delivery_no = ''
  createFormRef.value?.clearValidate()
}

function openCompleteDialog(row: any) {
  completeTarget.value = row
  Object.assign(completeForm, {
    express_name: row.express_name || '',
    express_no: row.express_no || '',
    reason: row.reason || ''
  })
  completeDialogVisible.value = true
}

async function submitComplete() {
  await completeFormRef.value?.validate()
  if (!completeTarget.value) return
  completeSubmitting.value = true
  try {
    await completeSaleReturn(completeTarget.value.id, { ...completeForm })
    ElMessage.success('退货成功')
    completeDialogVisible.value = false
    await fetchData()
  } finally {
    completeSubmitting.value = false
  }
}

function resetCompleteForm() {
  completeTarget.value = null
  Object.assign(completeForm, { express_name: '', express_no: '', reason: '' })
  completeFormRef.value?.clearValidate()
}

async function handleDetail(row: any) {
  detailDrawerVisible.value = true
  detailLoading.value = true
  detailData.value = {}
  try {
    const res: any = await getSaleReturn(row.id)
    detailData.value = res.data || {}
  } finally {
    detailLoading.value = false
  }
}

function handleRefund(row: any) {
  router.push({ name: 'FinanceReceiptCreate', query: { type: 'refund', orderNo: row.return_no, orderId: row.id } })
}

async function handleCancel(row: any) {
  await ElMessageBox.confirm(`确定取消退货单 ${row.return_no}？取消后将释放已占用的可退数量。`, '取消退货单', {
    type: 'warning',
    confirmButtonText: '确认取消',
    cancelButtonText: '返回'
  })
  await cancelSaleReturn(row.id)
  ElMessage.success('取消成功')
  fetchData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除已取消的退货单 ${row.return_no}？`, '删除退货单', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '返回'
  })
  await deleteSaleReturn(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

function unitPriceText(row: any) {
  if (row.unit_price === null || row.unit_price === undefined) {
    return Number(row.item_count || 0) > 1 ? '多产品' : '-'
  }
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

function listOf(res: any) {
  return res.data?.list || res.data || []
}

onMounted(async () => {
  fetchData()
  const res: any = await getSuppliers({ page: 1, pageSize: 1000, type: 'customer', status: 1 })
  customers.value = listOf(res)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.toolbar {
  margin-bottom: 16px;
}

.complete-form {
  margin-top: 20px;
}

.return-detail {
  padding-bottom: 24px;
}

.detail-section-title {
  margin: 20px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.detail-table {
  width: 100%;
}
</style>
