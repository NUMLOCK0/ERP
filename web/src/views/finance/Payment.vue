<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="付款单ID/采购单号/供应商" clearable />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="searchForm.supplier_id" placeholder="请选择" clearable filterable>
            <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="付款状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待付款" :value="0" />
            <el-option label="付款中" :value="1" />
            <el-option label="已付款" :value="2" />
            <el-option label="已关闭" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="付款单id" width="100" />
        <el-table-column prop="order_no" label="采购单号" width="190" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.order_no) }}</template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.supplier_name) }}</template>
        </el-table-column>
        <el-table-column label="付款状态" width="100">
          <template #default="{ row }"><el-tag :type="paymentStatusTagType(row.status)" size="small">{{ paymentStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="已付款总额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.paid_total_amount ?? row.amount) }}</template>
        </el-table-column>
        <el-table-column label="应收总额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.receivable_total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="pay_method" label="付款方式" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.pay_method) }}</template>
        </el-table-column>
        <el-table-column label="开票时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.invoice_time) }}</template>
        </el-table-column>
        <el-table-column label="开票状态" width="100">
          <template #default="{ row }"><el-tag :type="invoiceStatusTagType(row.invoice_status)" size="small">{{ invoiceStatusText(row.invoice_status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="采购总额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.purchase_total_amount) }}</template>
        </el-table-column>
        <el-table-column label="采购产品总数量" width="140" align="right">
          <template #default="{ row }">{{ formatQuantity(row.purchase_total_quantity) }}</template>
        </el-table-column>
        <el-table-column label="采购退款金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.purchase_refund_amount) }}</template>
        </el-table-column>
        <el-table-column label="采购退货金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.purchase_return_amount) }}</template>
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
        <el-table-column label="付款开始时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.payment_start_time) }}</template>
        </el-table-column>
        <el-table-column label="付款完成时间" width="170">
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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :disabled="Number(row.status) >= 2" @click="openPayDialog(row)">支付</el-button>
            <el-button type="success" link @click="openInvoiceDialog(row)">开票</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="payDialogVisible" title="支付" width="520px" @close="resetPayForm">
      <el-form ref="payFormRef" :model="payForm" :rules="payRules" label-width="90px">
        <el-form-item label="付款单id">
          <el-input v-model="payForm.id" disabled />
        </el-form-item>
        <el-form-item label="支付金额" prop="amount">
          <el-input-number v-model="payForm.amount" :min="0.01" :precision="2" :controls="false" />
        </el-form-item>
        <el-form-item label="付款方式">
          <el-select v-model="payForm.pay_method" placeholder="请选择" clearable>
            <el-option label="现金" value="现金" />
            <el-option label="银行转账" value="银行转账" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="payForm.remark" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePaySubmit">确认支付</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="invoiceDialogVisible" title="开票" width="520px" @close="resetInvoiceForm">
      <el-form ref="invoiceFormRef" :model="invoiceForm" :rules="invoiceRules" label-width="90px">
        <el-form-item label="付款单id">
          <el-input v-model="invoiceForm.id" disabled />
        </el-form-item>
        <el-form-item label="开票时间" prop="invoice_time">
          <el-date-picker v-model="invoiceForm.invoice_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择开票时间" />
        </el-form-item>
        <el-form-item label="开票状态">
          <el-select v-model="invoiceForm.invoice_status" placeholder="请选择">
            <el-option label="未开票" :value="0" />
            <el-option label="已开票" :value="1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="invoiceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleInvoiceSubmit">确认开票</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { getPayments, invoicePayment, payPayment } from '@/api/finance'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const payDialogVisible = ref(false)
const invoiceDialogVisible = ref(false)
const payFormRef = ref<FormInstance>()
const invoiceFormRef = ref<FormInstance>()
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, status: null as any, dateRange: null as any })
const payForm = reactive({ id: null as number | null, amount: 0, pay_method: '', remark: '' })
const invoiceForm = reactive({ id: null as number | null, invoice_time: '', invoice_status: 1 })
const payRules = {
  amount: [{ required: true, message: '请输入支付金额', trigger: 'blur' }]
}
const invoiceRules = {
  invoice_time: [{ required: true, message: '请选择开票时间', trigger: 'change' }]
}

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
    const res: any = await getPayments(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { keyword: '', supplier_id: null, status: null, dateRange: null }); handleSearch() }

function openPayDialog(row: any) {
  const paid = Number(row.paid_total_amount ?? row.amount ?? 0)
  const should = Number(row.receivable_total_amount || row.purchase_total_amount || 0)
  Object.assign(payForm, {
    id: row.id,
    amount: Number(Math.max(should - paid, 0).toFixed(2)) || 0,
    pay_method: row.pay_method || '',
    remark: row.remark || ''
  })
  payDialogVisible.value = true
}

function openInvoiceDialog(row: any) {
  Object.assign(invoiceForm, {
    id: row.id,
    invoice_time: row.invoice_time ? formatInputDateTime(row.invoice_time) : formatInputDateTime(new Date()),
    invoice_status: Number(row.invoice_status || 0) || 1
  })
  invoiceDialogVisible.value = true
}

function resetPayForm() {
  Object.assign(payForm, { id: null, amount: 0, pay_method: '', remark: '' })
  payFormRef.value?.clearValidate()
}

function resetInvoiceForm() {
  Object.assign(invoiceForm, { id: null, invoice_time: '', invoice_status: 1 })
  invoiceFormRef.value?.clearValidate()
}

async function handlePaySubmit() {
  const valid = await payFormRef.value?.validate().catch(() => false)
  if (!valid || !payForm.id) return
  if (Number(payForm.amount || 0) <= 0) {
    ElMessage.warning('支付金额必须大于0')
    return
  }
  await payPayment(payForm.id, {
    amount: Number(payForm.amount || 0),
    pay_method: payForm.pay_method,
    remark: payForm.remark
  })
  ElMessage.success('支付成功')
  payDialogVisible.value = false
  fetchData()
}

async function handleInvoiceSubmit() {
  const valid = await invoiceFormRef.value?.validate().catch(() => false)
  if (!valid || !invoiceForm.id) return
  await invoicePayment(invoiceForm.id, {
    invoice_time: invoiceForm.invoice_time,
    invoice_status: invoiceForm.invoice_status
  })
  ElMessage.success('开票成功')
  invoiceDialogVisible.value = false
  fetchData()
}

function paymentStatusText(status: any) {
  const map: Record<number, string> = { 0: '待付款', 1: '付款中', 2: '已付款', 3: '已关闭' }
  return map[Number(status)] || '待付款'
}

function paymentStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
  return map[Number(status)] || 'info'
}

function invoiceStatusText(status: any) {
  return Number(status) === 1 ? '已开票' : '未开票'
}

function invoiceStatusTagType(status: any) {
  return Number(status) === 1 ? 'success' : 'info'
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

function formatInputDateTime(value: any) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
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
  const supplierRes: any = await getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 })
  suppliers.value = listOf(supplierRes)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}
.el-input-number,
.el-select,
.el-date-editor {
  width: 100%;
}
</style>
