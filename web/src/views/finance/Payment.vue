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
            <el-button type="primary" link :disabled="Number(row.status) >= 2" @click="openPayDrawer(row)">付款</el-button>
            <el-button type="success" link :disabled="Number(row.invoice_status) === 2" @click="openInvoiceDialog(row)">开票</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <!-- 付款抽屉 -->
    <el-drawer v-model="payDrawerVisible" direction="rtl" size="560px" :close-on-click-modal="false" @close="resetPayForm">
      <template #header>
        <div class="drawer-header">
          <span class="drawer-title">付款</span>
          <el-button type="primary" link @click="openOrderDetail">查看采购单</el-button>
        </div>
      </template>

      <el-form ref="payFormRef" :model="payForm" :rules="payRules" label-width="90px">
        <el-form-item label="应付金额">
          <el-input :model-value="formatMoney(payForm.receivable_amount)" disabled />
        </el-form-item>
        <el-form-item label="未付金额">
          <el-input :model-value="formatMoney(payForm.unpaid_amount)" disabled />
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input :model-value="formatMoney(payForm.paid_amount)" disabled />
        </el-form-item>
        <el-form-item label="付款金额" prop="pay_amount">
          <div class="pay-amount-row">
            <el-input-number v-model="payForm.pay_amount" :min="0.01" :precision="2" :controls="false" />
            <el-button @click="fillAllAmount">全部</el-button>
          </div>
        </el-form-item>
        <el-form-item label="付款人" prop="payer">
          <el-input v-model="payForm.payer" placeholder="请输入付款人" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="付款时间" prop="pay_time">
          <el-date-picker v-model="payForm.pay_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择付款时间" />
        </el-form-item>
        <el-form-item label="付款方式" prop="pay_method">
          <el-select v-model="payForm.pay_method" placeholder="请选择" clearable>
            <el-option label="现金" value="现金" />
            <el-option label="银行转账" value="银行转账" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="payForm.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="备注信息（选填）" />
        </el-form-item>
        <el-form-item label="付款凭证">
          <div class="voucher-upload">
            <div v-for="(file, index) in payForm.vouchers" :key="index" class="voucher-item">
              <img v-if="file.url" :src="file.url" class="voucher-img" />
              <div class="voucher-placeholder" v-else>
                <span>{{ file.name }}</span>
              </div>
              <el-icon class="voucher-remove" @click="removeVoucher(index)"><Close /></el-icon>
            </div>
            <el-upload
              v-if="payForm.vouchers.length < 10"
              :auto-upload="true"
              :show-file-list="false"
              :http-request="handleVoucherUpload"
              accept="image/*"
              class="voucher-uploader"
            >
              <el-icon class="voucher-add"><Plus /></el-icon>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="payDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePaySubmit" :loading="paySubmitting">确认付款</el-button>
      </template>
    </el-drawer>

    <!-- 开票抽屉 -->
    <el-drawer v-model="invoiceDrawerVisible" direction="rtl" size="560px" @close="resetInvoiceForm">
      <template #header>
        <div class="drawer-header-row">
          <span>开票</span>
          <el-button type="primary" link @click="openInvoiceOrderDetail">查看采购单</el-button>
        </div>
      </template>

      <el-form ref="invoiceFormRef" :model="invoiceForm" :rules="invoiceRules" label-width="90px">
        <el-form-item label="应付金额">
          <el-input :model-value="formatMoney(invoiceForm.receivable_amount)" disabled />
        </el-form-item>
        <el-form-item label="未付金额">
          <el-input :model-value="formatMoney(invoiceForm.unpaid_amount)" disabled />
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input :model-value="formatMoney(invoiceForm.paid_amount)" disabled />
        </el-form-item>
        <el-form-item label="状态" prop="invoice_status">
          <el-select v-model="invoiceForm.invoice_status" placeholder="请选择">
            <el-option label="未开票" :value="0" />
            <el-option label="开票中" :value="1" />
            <el-option label="已开票" :value="2" />
            <el-option label="无需开票" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="开票时间" prop="invoice_time">
          <el-date-picker v-model="invoiceForm.invoice_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择开票时间" />
        </el-form-item>
        <el-form-item label="付款方式">
          <el-input :model-value="invoiceForm.pay_method" disabled />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="invoiceForm.invoice_remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="备注信息（选填）" />
        </el-form-item>
        <el-form-item label="开票附件">
          <div class="voucher-upload">
            <div v-for="(file, index) in invoiceForm.invoice_vouchers" :key="index" class="voucher-item">
              <img v-if="file.url" :src="file.url" class="voucher-img" />
              <div class="voucher-placeholder" v-else>
                <span>{{ file.name }}</span>
              </div>
              <el-icon class="voucher-remove" @click="removeInvoiceVoucher(index)"><Close /></el-icon>
            </div>
            <el-upload
              v-if="invoiceForm.invoice_vouchers.length < 10"
              :auto-upload="true"
              :show-file-list="false"
              :http-request="handleInvoiceVoucherUpload"
              accept="image/*"
              class="voucher-uploader"
            >
              <el-icon class="voucher-add"><Plus /></el-icon>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="invoiceDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="handleInvoiceSubmit" :loading="invoiceSubmitting">确认开票</el-button>
      </template>
    </el-drawer>

    <!-- 采购单详情抽屉 -->
    <el-drawer v-model="orderDetailVisible" title="采购单详情" size="72%" direction="rtl">
      <el-tabs v-model="orderDetailTab">
        <el-tab-pane label="基础信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="采购单号">{{ emptyText(orderDetail.order_no) }}</el-descriptions-item>
            <el-descriptions-item label="采购状态">
              <el-tag :type="purchaseStatusTagType(orderDetail.status)" size="small">{{ purchaseStatusText(orderDetail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(orderDetail.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="入库仓库">{{ emptyText(orderDetail.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="付款方式">{{ emptyText(orderDetail.payment_method) }}</el-descriptions-item>
            <el-descriptions-item label="付款状态">{{ paymentStatusText(orderDetail.payment_status) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(orderDetail.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(orderDetail.phone) }}</el-descriptions-item>
            <el-descriptions-item label="总价">¥{{ formatMoney(orderDetail.total_price ?? orderDetail.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="最终总价">¥{{ formatMoney(orderFinalAmount) }}</el-descriptions-item>
            <el-descriptions-item label="管理员备注信息">{{ emptyText(orderDetail.admin_remark) }}</el-descriptions-item>
            <el-descriptions-item label="采购单备注信息">{{ emptyText(orderDetail.purchase_remark) }}</el-descriptions-item>
            <el-descriptions-item label="提审时间">{{ formatDateTime(orderDetail.submit_time) }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ formatDateTime(orderDetail.audit_time) }}</el-descriptions-item>
            <el-descriptions-item label="采购开始时间">{{ formatDateTime(orderDetail.purchase_start_time) }}</el-descriptions-item>
            <el-descriptions-item label="采购完成时间">{{ formatDateTime(orderDetail.purchase_completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="入库开始时间">{{ formatDateTime(orderDetail.inbound_start_time) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatDateTime(orderDetail.completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="取消时间">{{ formatDateTime(orderDetail.cancel_time) }}</el-descriptions-item>
            <el-descriptions-item label="关闭时间">{{ formatDateTime(orderDetail.close_time) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(orderDetail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(orderDetail.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="产品列表" name="items">
          <el-table :data="orderDetail.items" stripe>
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
import { ElMessage, type FormInstance, type UploadRequestOptions } from 'element-plus'
import { Close, Plus } from '@element-plus/icons-vue'
import { getPayments, invoicePayment, payPayment } from '@/api/finance'
import { getPurchaseOrder } from '@/api/purchase'
import { getSuppliers } from '@/api/supplier'
import { uploadFile } from '@/api/upload'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const payDrawerVisible = ref(false)
const invoiceDrawerVisible = ref(false)
const orderDetailVisible = ref(false)
const orderDetailTab = ref('basic')
const payFormRef = ref<FormInstance>()
const invoiceFormRef = ref<FormInstance>()
const paySubmitting = ref(false)
const invoiceSubmitting = ref(false)
const currentPaymentRow = ref<any>(null)
const invoicePaymentRow = ref<any>(null)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, status: null as any, dateRange: null as any })
const payForm = reactive({
  id: null as number | null,
  receivable_amount: 0,
  unpaid_amount: 0,
  paid_amount: 0,
  pay_amount: 0,
  payer: '',
  pay_time: '',
  pay_method: '',
  remark: '',
  vouchers: [] as { url: string; name: string }[]
})
const invoiceForm = reactive({
  id: null as number | null,
  receivable_amount: 0,
  unpaid_amount: 0,
  paid_amount: 0,
  invoice_time: '',
  invoice_status: 0,
  pay_method: '',
  invoice_remark: '',
  invoice_vouchers: [] as { url: string; name: string }[]
})
const orderDetail = reactive<any>({ items: [] })

const orderFinalAmount = computed(() =>
  (orderDetail.items || []).reduce((sum: number, item: any) => sum + Number(item.final_amount ?? item.amount ?? 0), 0)
)

const payRules = {
  pay_amount: [{ required: true, message: '请输入付款金额', trigger: 'blur' }],
  payer: [
    { required: true, message: '请输入付款人', trigger: 'blur' },
    { max: 30, message: '付款人最多30个字符', trigger: 'blur' }
  ],
  pay_time: [{ required: true, message: '请选择付款时间', trigger: 'change' }],
  pay_method: [{ required: true, message: '请选择付款方式', trigger: 'change' }]
}

const invoiceRules = {
  invoice_status: [{ required: true, message: '请选择开票状态', trigger: 'change' }],
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

function openPayDrawer(row: any) {
  currentPaymentRow.value = row
  const receivable = Number(row.receivable_total_amount ?? 0)
  const paid = Number(row.paid_total_amount ?? row.amount ?? 0)
  const unpaid = Math.max(receivable - paid, 0)
  Object.assign(payForm, {
    id: row.id,
    receivable_amount: receivable,
    unpaid_amount: unpaid,
    paid_amount: paid,
    pay_amount: Number(unpaid.toFixed(2)),
    payer: '',
    pay_time: formatInputDateTime(new Date()),
    pay_method: row.pay_method || '',
    remark: '',
    vouchers: []
  })
  payDrawerVisible.value = true
}

function fillAllAmount() {
  payForm.pay_amount = payForm.unpaid_amount
}

function openInvoiceDialog(row: any) {
  invoicePaymentRow.value = row
  const receivable = Number(row.receivable_total_amount ?? 0)
  const paid = Number(row.paid_total_amount ?? row.amount ?? 0)
  const unpaid = Math.max(receivable - paid, 0)
  Object.assign(invoiceForm, {
    id: row.id,
    receivable_amount: receivable,
    unpaid_amount: unpaid,
    paid_amount: paid,
    invoice_time: row.invoice_time ? formatInputDateTime(row.invoice_time) : formatInputDateTime(new Date()),
    invoice_status: Number(row.invoice_status || 0),
    pay_method: row.pay_method || '',
    invoice_remark: row.invoice_remark || '',
    invoice_vouchers: []
  })
  invoiceDrawerVisible.value = true
}

function resetPayForm() {
  Object.assign(payForm, {
    id: null, receivable_amount: 0, unpaid_amount: 0, paid_amount: 0,
    pay_amount: 0, payer: '', pay_time: '', pay_method: '', remark: '', vouchers: []
  })
  payFormRef.value?.clearValidate()
  currentPaymentRow.value = null
}

function resetInvoiceForm() {
  Object.assign(invoiceForm, {
    id: null, receivable_amount: 0, unpaid_amount: 0, paid_amount: 0,
    invoice_time: '', invoice_status: 0, pay_method: '', invoice_remark: '', invoice_vouchers: []
  })
  invoiceFormRef.value?.clearValidate()
  invoicePaymentRow.value = null
}

async function handleVoucherUpload(options: UploadRequestOptions) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res: any = await uploadFile(formData)
    const url = res.data?.url || ''
    payForm.vouchers.push({ url, name: res.data?.originalname || options.file.name })
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

function removeVoucher(index: number) {
  payForm.vouchers.splice(index, 1)
}

async function handleInvoiceVoucherUpload(options: UploadRequestOptions) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res: any = await uploadFile(formData)
    const url = res.data?.url || ''
    invoiceForm.invoice_vouchers.push({ url, name: res.data?.originalname || options.file.name })
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

function removeInvoiceVoucher(index: number) {
  invoiceForm.invoice_vouchers.splice(index, 1)
}

async function openInvoiceOrderDetail() {
  const row = invoicePaymentRow.value
  if (!row || !row.order_id) {
    ElMessage.warning('未关联采购单')
    return
  }
  try {
    const res: any = await getPurchaseOrder(row.order_id)
    const detail = res.data || {}
    Object.keys(orderDetail).forEach(key => delete orderDetail[key])
    Object.assign(orderDetail, detail, { items: detail.items || [] })
    orderDetailTab.value = 'basic'
    orderDetailVisible.value = true
  } catch {
    ElMessage.error('获取采购单详情失败')
  }
}

async function openOrderDetail() {
  const row = currentPaymentRow.value
  if (!row || !row.order_id) {
    ElMessage.warning('未关联采购单')
    return
  }
  try {
    const res: any = await getPurchaseOrder(row.order_id)
    const detail = res.data || {}
    Object.keys(orderDetail).forEach(key => delete orderDetail[key])
    Object.assign(orderDetail, detail, { items: detail.items || [] })
    orderDetailTab.value = 'basic'
    orderDetailVisible.value = true
  } catch {
    ElMessage.error('获取采购单详情失败')
  }
}

async function handlePaySubmit() {
  const valid = await payFormRef.value?.validate().catch(() => false)
  if (!valid || !payForm.id) return
  if (Number(payForm.pay_amount || 0) <= 0) {
    ElMessage.warning('付款金额必须大于0')
    return
  }
  paySubmitting.value = true
  try {
    await payPayment(payForm.id, {
      amount: Number(payForm.pay_amount || 0),
      pay_method: payForm.pay_method,
      payer: payForm.payer,
      pay_time: payForm.pay_time,
      remark: payForm.remark
    })
    ElMessage.success('付款成功')
    payDrawerVisible.value = false
    fetchData()
  } finally {
    paySubmitting.value = false
  }
}

async function handleInvoiceSubmit() {
  const valid = await invoiceFormRef.value?.validate().catch(() => false)
  if (!valid || !invoiceForm.id) return
  invoiceSubmitting.value = true
  try {
    await invoicePayment(invoiceForm.id, {
      invoice_time: invoiceForm.invoice_time,
      invoice_status: invoiceForm.invoice_status,
      invoice_remark: invoiceForm.invoice_remark
    })
    ElMessage.success('开票成功')
    invoiceDrawerVisible.value = false
    fetchData()
  } finally {
    invoiceSubmitting.value = false
  }
}

function paymentStatusText(status: any) {
  const map: Record<number, string> = { 0: '待付款', 1: '付款中', 2: '已付款', 3: '已关闭' }
  return map[Number(status)] || '待付款'
}

function paymentStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
  return map[Number(status)] || 'info'
}

function purchaseStatusText(status: any) {
  const map: Record<number, string> = { 0: '待提交', 1: '采购中', 2: '待审核', 3: '已取消', 4: '已关闭', 5: '已审核', 6: '已采购', 7: '入库中', 8: '已入库', 9: '已拒绝' }
  return map[Number(status)] || ''
}

function purchaseStatusTagType(status: any) {
  const map: Record<number, '' | 'success' | 'warning' | 'danger' | 'info'> = { 0: 'info', 1: 'warning', 2: '', 3: 'danger', 4: 'danger', 5: 'success', 6: '', 7: 'warning', 8: 'success', 9: 'danger' }
  return map[Number(status)] || 'info'
}

function invoiceStatusText(status: any) {
  const map: Record<number, string> = { 0: '未开票', 1: '开票中', 2: '已开票', 3: '无需开票' }
  return map[Number(status)] || '未开票'
}
function invoiceStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning'> = { 0: 'info', 1: 'warning', 2: 'success', 3: '' }
  return map[Number(status)] || 'info'
}

function formatMoney(value: any) { return Number(value || 0).toFixed(2) }
function formatQuantity(value: any) {
  const q = Number(value || 0)
  return Number.isInteger(q) ? String(q) : String(Number(q.toFixed(3)))
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

function emptyText(value: any) { return value === undefined || value === null || value === '' ? '-' : value }

function listOf(res: any) { return res.data?.list || res.data || [] }

onMounted(async () => {
  fetchData()
  const supplierRes: any = await getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 })
  suppliers.value = listOf(supplierRes)
})
</script>

<style scoped>
.page-container { height: 100%; }
.el-input-number, .el-select, .el-date-editor { width: 100%; }

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.drawer-title { font-size: 16px; font-weight: 600; }

.pay-amount-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.pay-amount-row .el-input-number { flex: 1; }

.voucher-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.voucher-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}
.voucher-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.voucher-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #909399;
  padding: 4px;
  text-align: center;
}
.voucher-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: #f56c6c;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voucher-uploader {
  width: 80px;
  height: 80px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voucher-uploader:hover { border-color: #409eff; }
.voucher-add { font-size: 24px; color: #909399; }
</style>
