<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="收款单ID/销售单号/客户" clearable />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="未收款" :value="0" />
            <el-option label="收款中" :value="1" />
            <el-option label="已收款" :value="2" />
            <el-option label="已关闭" :value="3" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="收款单id" width="100" />
        <el-table-column prop="order_no" label="销售单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.customer_name) }}</template>
        </el-table-column>
        <el-table-column label="收款状态" width="100">
          <template #default="{ row }"><el-tag :type="receiptStatusTagType(row.status)" size="small">{{ receiptStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="pay_method" label="付款方式" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.pay_method) }}</template>
        </el-table-column>
        <el-table-column label="开票状态" width="100">
          <template #default="{ row }"><el-tag :type="invoiceStatusTagType(row.invoice_status)" size="small">{{ invoiceStatusText(row.invoice_status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="开票时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.invoice_time) }}</template>
        </el-table-column>
        <el-table-column label="销售产品总数量" width="140" align="right">
          <template #default="{ row }">{{ formatQuantity(row.sale_total_quantity) }}</template>
        </el-table-column>
        <el-table-column label="销售退款金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.sale_refund_amount) }}</template>
        </el-table-column>
        <el-table-column label="销售退货数量" width="130" align="right">
          <template #default="{ row }">{{ formatQuantity(row.sale_return_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.contact) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.phone) }}</template>
        </el-table-column>
        <el-table-column prop="detail_address" label="详细地址" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.detail_address) }}</template>
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
        <el-table-column prop="bank_account" label="开户户号" width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.bank_account) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.remark) }}</template>
        </el-table-column>
        <el-table-column label="收款开始时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.payment_start_time) }}</template>
        </el-table-column>
        <el-table-column label="收款完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.payment_completed_time) }}</template>
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
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getReceipts } from '@/api/finance'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', customer_id: null as any, status: '' as any })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getReceipts({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { keyword: '', customer_id: null, status: '' }); handleSearch() }

function receiptStatusText(status: any) {
  const map: Record<number, string> = { 0: '未收款', 1: '收款中', 2: '已收款', 3: '已关闭' }
  return map[Number(status)] || '未收款'
}

function receiptStatusTagType(status: any) {
  const map: Record<number, 'info' | 'warning' | 'success' | 'danger'> = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
  return map[Number(status)] || 'info'
}

function invoiceStatusText(status: any) {
  const map: Record<number, string> = { 0: '未开票', 1: '已开票', 2: '开票中', 3: '无需开票' }
  return map[Number(status)] || '未开票'
}

function invoiceStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning'> = { 0: 'info', 1: 'success', 2: 'warning', 3: 'info' }
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

function listOf(res: any) {
  return res.data?.list || res.data || []
}

onMounted(async () => {
  fetchData()
  const res: any = await getSuppliers({ page: 1, pageSize: 1000, status: 1 })
  customers.value = listOf(res)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}
</style>
