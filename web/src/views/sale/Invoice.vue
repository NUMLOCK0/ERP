<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="登记单号/发票号/销售单号/客户" clearable />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" @click="openCreateDrawer">新增登记</el-button>
        <div class="toolbar-right">
          <TableColumnTools table-key="sale-invoice" filename="销售发票登记" />
        </div>
      </div>

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="invoice_no" label="登记单号" width="190" show-overflow-tooltip />
        <el-table-column prop="external_invoice_no" label="发票号码" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.external_invoice_no) }}</template>
        </el-table-column>
        <el-table-column prop="order_no" label="销售单号" width="190" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户" min-width="150" show-overflow-tooltip />
        <el-table-column label="不含税金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="税率" width="90" align="right">
          <template #default="{ row }">{{ formatMoney(row.tax_rate) }}%</template>
        </el-table-column>
        <el-table-column label="税金" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.tax_amount) }}</template>
        </el-table-column>
        <el-table-column label="价税合计" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="已收金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.received_amount) }}</template>
        </el-table-column>
        <el-table-column label="开票日期" width="170">
          <template #default="{ row }">{{ formatDateTime(row.invoice_date) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetailDrawer(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-drawer v-model="createDrawerVisible" title="销售发票登记" size="560px" direction="rtl" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="110px" class="invoice-form">
        <el-form-item label="销售订单" prop="order_id">
          <el-select v-model="form.order_id" placeholder="请选择销售订单" filterable clearable @change="handleOrderChange">
            <el-option v-for="order in orders" :key="order.id" :label="`${order.order_no} / ${order.customer_name || ''}`" :value="order.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-input :model-value="selectedOrder?.customer_name || ''" disabled />
        </el-form-item>
        <el-form-item label="发票号码">
          <el-input v-model="form.external_invoice_no" maxlength="100" placeholder="请输入发票号码" />
        </el-form-item>
        <el-form-item label="开票日期">
          <el-date-picker v-model="form.invoice_date" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择开票日期" />
        </el-form-item>
        <el-form-item label="不含税金额" prop="amount">
          <el-input :model-value="formatMoney(form.amount)" disabled>
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="税率" prop="tax_rate">
          <el-input-number v-model="form.tax_rate" :min="0" :max="100" :precision="2" :controls="false" @change="recalculateTaxFromRate" />
        </el-form-item>
        <el-form-item label="税金">
          <el-input v-model="form.tax_amount" type="number" @input="recalculateAmountFromTax">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="价税合计">
          <el-input v-model="form.total_amount" type="number" @input="recalculateTaxFromRate">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="发票附件">
          <el-upload
            v-model:file-list="attachmentFileList"
            :http-request="handleUpload"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
            :on-remove="handleUploadRemove"
            :limit="10"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            multiple
          >
            <el-button type="primary" plain>上传附件</el-button>
            <template #tip><div class="upload-tip">最多10个，单个不超过10MB</div></template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="createDrawerVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确认登记</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="detailDrawerVisible" title="销售发票详情" size="560px" direction="rtl">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="登记单号">{{ detailData.invoice_no }}</el-descriptions-item>
        <el-descriptions-item label="发票号码">{{ emptyText(detailData.external_invoice_no) }}</el-descriptions-item>
        <el-descriptions-item label="销售单号">{{ detailData.order_no }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ detailData.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="不含税金额">¥{{ formatMoney(detailData.amount) }}</el-descriptions-item>
        <el-descriptions-item label="税率">{{ formatMoney(detailData.tax_rate) }}%</el-descriptions-item>
        <el-descriptions-item label="税金">¥{{ formatMoney(detailData.tax_amount) }}</el-descriptions-item>
        <el-descriptions-item label="价税合计">¥{{ formatMoney(detailData.total_amount) }}</el-descriptions-item>
        <el-descriptions-item label="开票日期">{{ formatDateTime(detailData.invoice_date) }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ emptyText(detailData.remark) }}</el-descriptions-item>
        <el-descriptions-item label="附件">
          <div v-if="normalizeAttachmentUrls(detailData.attachment_urls).length" class="attachment-list">
            <a v-for="url in normalizeAttachmentUrls(detailData.attachment_urls)" :key="url" :href="assetUrl(url)" target="_blank" class="attachment-item">
              {{ fileNameFromUrl(url) }}
            </a>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import TableColumnTools from '@/components/TableColumnTools.vue'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { createSaleInvoice, getSaleInvoice, getSaleInvoices, getSaleOrders } from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import { uploadFile } from '@/api/upload'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const orders = ref<any[]>([])
const createDrawerVisible = ref(false)
const detailDrawerVisible = ref(false)
const formRef = ref<FormInstance>()
const attachmentFileList = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', customer_id: null as any })
const form = reactive({
  order_id: null as number | null,
  external_invoice_no: '',
  invoice_date: '',
  amount: '',
  tax_rate: 13,
  tax_amount: 0,
  total_amount: 0,
  remark: '',
  attachment_urls: [] as string[]
})
const detailData = reactive<any>({})
const formRules = {
  order_id: [{ required: true, message: '请选择销售订单', trigger: 'change' }],
  amount: [{ required: true, message: '请输入不含税金额', trigger: 'blur' }],
  tax_rate: [{ required: true, message: '请输入税率', trigger: 'blur' }]
}
const selectedOrder = computed(() => orders.value.find(item => Number(item.id) === Number(form.order_id)))

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getSaleInvoices({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { keyword: '', customer_id: null }); handleSearch() }

function openCreateDrawer() {
  resetForm()
  createDrawerVisible.value = true
}

async function openDetailDrawer(row: any) {
  const res: any = await getSaleInvoice(row.id)
  Object.keys(detailData).forEach(key => delete detailData[key])
  Object.assign(detailData, res.data || {})
  detailDrawerVisible.value = true
}

function handleOrderChange() {
  const order = selectedOrder.value
  if (!order) return
  const totalAmount = toMoney(order.total_amount)
  const taxAmount = calculateIncludedTax(totalAmount, form.tax_rate)
  Object.assign(form, {
    amount: toMoney(Math.max(totalAmount - taxAmount, 0)).toFixed(2),
    tax_amount: taxAmount,
    total_amount: totalAmount
  })
}

function recalculateTaxFromRate() {
  const totalAmount = toMoney(form.total_amount)
  const taxAmount = calculateIncludedTax(totalAmount, form.tax_rate)
  Object.assign(form, {
    amount: toMoney(Math.max(totalAmount - taxAmount, 0)).toFixed(2),
    tax_amount: taxAmount,
    total_amount: totalAmount
  })
}

function recalculateAmountFromTax() {
  const totalAmount = toMoney(form.total_amount)
  const taxAmount = Math.min(Math.max(toMoney(form.tax_amount), 0), totalAmount)
  form.tax_amount = taxAmount
  form.amount = toMoney(Math.max(totalAmount - taxAmount, 0)).toFixed(2)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  recalculateAmountFromTax()
  await createSaleInvoice({
    order_id: form.order_id,
    external_invoice_no: form.external_invoice_no,
    invoice_date: form.invoice_date,
    amount: toMoney(form.amount),
    tax_rate: toMoney(form.tax_rate),
    tax_amount: form.tax_amount,
    total_amount: form.total_amount,
    remark: form.remark,
    attachment_urls: form.attachment_urls
  })
  ElMessage.success('登记成功')
  createDrawerVisible.value = false
  fetchData()
}

function resetForm() {
  Object.assign(form, {
    order_id: null,
    external_invoice_no: '',
    invoice_date: formatInputDateTime(new Date()),
    amount: '',
    tax_rate: 13,
    tax_amount: 0,
    total_amount: 0,
    remark: '',
    attachment_urls: []
  })
  attachmentFileList.value = []
  formRef.value?.clearValidate()
}

function beforeUpload(file: File) {
  if (form.attachment_urls.length >= 10) {
    ElMessage.warning('发票附件最多10个')
    return false
  }
  const validSize = file.size / 1024 / 1024 <= 10
  if (!validSize) ElMessage.warning('单个文件不能超过10MB')
  return validSize
}

async function handleUpload(options: any) {
  try {
    const data = new FormData()
    data.append('file', options.file)
    const res: any = await uploadFile(data)
    options.onSuccess?.(res)
  } catch (err) {
    options.onError?.(err)
  }
}

function handleUploadSuccess(res: any, file: any) {
  const url = res?.data?.url
  if (!url) return
  file.url = url
  file.name = res?.data?.originalname || file.name
  if (!form.attachment_urls.includes(url)) form.attachment_urls.push(url)
}

function handleUploadRemove(file: any) {
  const url = file.url || file.response?.data?.url
  form.attachment_urls = form.attachment_urls.filter(item => item !== url)
}

function normalizeAttachmentUrls(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function assetUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url
}

function fileNameFromUrl(url: string) {
  return String(url || '').split('/').pop() || ''
}

function toMoney(value: any) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

function calculateIncludedTax(totalAmount: any, taxRate: any) {
  const total = toMoney(totalAmount)
  const rate = toMoney(taxRate)
  return rate > 0 ? toMoney(total * rate / (100 + rate)) : 0
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatInputDateTime(value: any) {
  const date = new Date(value)
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
  const [customerRes, orderRes]: any[] = await Promise.all([
    getSuppliers({ page: 1, pageSize: 1000, status: 1 }),
    getSaleOrders({ page: 1, pageSize: 1000 })
  ])
  customers.value = listOf(customerRes)
  orders.value = orderRes.data?.list || []
})
</script>

<style scoped>
.page-container { height: 100%; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-right {
  margin-left: auto;
}
.invoice-form :deep(.el-select),
.invoice-form :deep(.el-date-editor),
.invoice-form :deep(.el-input-number),
.invoice-form :deep(.el-upload) {
  width: 100%;
}
.upload-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 6px;
}
.drawer-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.attachment-item {
  color: #409eff;
}
</style>
