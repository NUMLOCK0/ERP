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

      <TableColumnTools table-key="finance-receipt" filename="收款单" />

      <el-table border :data="tableData" stripe v-loading="loading">
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
        <el-table-column label="已开票金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.invoice_total_amount) }}</template>
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
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
            <el-dropdown trigger="hover">
              <el-button type="primary" link>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :disabled="Number(row.status) >= 2" @click="openReceiveDrawer(row)">收款</el-dropdown-item>
                  <el-dropdown-item :disabled="Number(row.invoice_status) === 1" @click="openInvoiceDrawer(row)">发票登记</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-drawer v-model="receiveDrawerVisible" title="收款" size="560px" direction="rtl" class="receipt-action-drawer" @close="resetReceiveForm">
      <el-form ref="receiveFormRef" :model="receiveForm" :rules="receiveRules" label-width="96px" class="receipt-form">
        <el-form-item label="应收金额">
          <el-input :model-value="formatMoney(receiveForm.receivable_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="未收金额">
          <el-input :model-value="formatMoney(receiveForm.unreceived_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="已收金额">
          <el-input :model-value="formatMoney(receiveForm.received_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="收款金额" prop="amount">
          <el-input v-model="receiveForm.amount" type="number" placeholder="请输入收款金额">
            <template #prepend>¥</template>
            <template #append><el-button @click="fillAllUnreceived">全部</el-button></template>
          </el-input>
        </el-form-item>
        <el-form-item label="收款时间" prop="pay_time">
          <el-date-picker v-model="receiveForm.pay_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择收款时间" />
        </el-form-item>
        <el-form-item label="收款方式" prop="pay_method">
          <el-select v-model="receiveForm.pay_method" placeholder="请选择收款方式" clearable>
            <el-option v-for="method in receiptMethodOptions" :key="method" :label="method" :value="method" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="receiveForm.remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="收款凭证">
          <el-upload
            v-model:file-list="voucherFileList"
            :http-request="handleVoucherUpload"
            :before-upload="beforeVoucherUpload"
            :on-success="handleVoucherSuccess"
            :on-remove="handleVoucherRemove"
            :on-preview="handleAttachmentPreview"
            :limit="10"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            multiple
          >
            <el-button type="primary" plain>上传凭证</el-button>
            <template #tip>
              <div class="upload-tip">支持图片或文件，最多10个，单个不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="receiveDrawerVisible = false">取消</el-button>
          <el-button type="primary" @click="handleReceiveSubmit">确认收款</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="invoiceDrawerVisible" title="销售发票登记" size="560px" direction="rtl" class="receipt-action-drawer" @close="resetInvoiceForm">
      <el-form ref="invoiceFormRef" :model="invoiceForm" :rules="invoiceRules" label-width="96px" class="receipt-form">
        <el-form-item label="应收金额">
          <el-input :model-value="formatMoney(invoiceForm.receivable_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="已开票金额">
          <el-input :model-value="formatMoney(invoiceForm.invoiced_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="未开票金额">
          <el-input :model-value="formatMoney(invoiceForm.unreceived_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="发票号码">
          <el-input v-model="invoiceForm.external_invoice_no" maxlength="100" placeholder="请输入发票号码" />
        </el-form-item>
        <el-form-item label="开票日期">
          <el-date-picker v-model="invoiceForm.invoice_date" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择开票日期" />
        </el-form-item>
        <el-form-item label="不含税金额" prop="amount">
          <el-input :model-value="formatMoney(invoiceForm.amount)" disabled>
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="税率" prop="tax_rate">
          <el-input-number v-model="invoiceForm.tax_rate" :min="0" :max="100" :precision="2" :controls="false" @change="recalculateInvoiceTaxFromRate" />
        </el-form-item>
        <el-form-item label="税金">
          <el-input v-model="invoiceForm.tax_amount" type="number" @input="recalculateInvoiceAmountFromTax">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="价税合计">
          <el-input v-model="invoiceForm.total_amount" type="number" @input="recalculateInvoiceTaxFromRate">
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="备注" prop="invoice_remark">
          <el-input v-model="invoiceForm.invoice_remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="发票附件">
          <el-upload
            v-model:file-list="invoiceFileList"
            :http-request="handleInvoiceAttachmentUpload"
            :before-upload="beforeInvoiceAttachmentUpload"
            :on-success="handleInvoiceAttachmentSuccess"
            :on-remove="handleInvoiceAttachmentRemove"
            :on-preview="handleAttachmentPreview"
            :limit="10"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            multiple
          >
            <el-button type="primary" plain>上传附件</el-button>
            <template #tip>
              <div class="upload-tip">支持图片或文件，最多10个，单个不超过10MB；图片可点击预览</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="invoiceDrawerVisible = false">取消</el-button>
          <el-button type="primary" @click="handleInvoiceSubmit">确认登记</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="detailDrawerVisible" title="销售收款单详情" size="62%" direction="rtl">
      <div v-loading="detailLoading" class="receipt-detail">
        <el-descriptions title="基础信息" :column="2" border>
          <el-descriptions-item label="收款单号"><CopyableNo :value="detailData.receipt_no" /></el-descriptions-item>
          <el-descriptions-item label="收款状态">
            <el-tag :type="receiptStatusTagType(detailData.status)" size="small">
              {{ receiptStatusText(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="销售单号"><CopyableNo :value="detailData.order_no" /></el-descriptions-item>
          <el-descriptions-item label="客户">{{ emptyText(detailData.customer_name) }}</el-descriptions-item>
          <el-descriptions-item label="仓库">{{ emptyText(detailData.warehouse_name) }}</el-descriptions-item>
          <el-descriptions-item label="收款人">{{ emptyText(detailData.receiver_name) }}</el-descriptions-item>
          <el-descriptions-item label="应收金额">¥{{ formatMoney(detailData.receivable_amount ?? detailData.should_amount) }}</el-descriptions-item>
          <el-descriptions-item label="已收金额">¥{{ formatMoney(detailData.amount) }}</el-descriptions-item>
          <el-descriptions-item label="未收金额">¥{{ formatMoney(detailData.unreceived_amount) }}</el-descriptions-item>
          <el-descriptions-item label="收款方式">{{ emptyText(detailData.receipt_method || detailData.pay_method) }}</el-descriptions-item>
          <el-descriptions-item label="开票状态">
            <el-tag :type="invoiceStatusTagType(detailData.invoice_status)" size="small">
              {{ invoiceStatusText(detailData.invoice_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开票时间">{{ formatDateTime(detailData.invoice_time) }}</el-descriptions-item>
          <el-descriptions-item label="收款开始时间">{{ formatDateTime(detailData.payment_start_time) }}</el-descriptions-item>
          <el-descriptions-item label="收款完成时间">{{ formatDateTime(detailData.payment_completed_time) }}</el-descriptions-item>
          <el-descriptions-item label="收款时间">{{ formatDateTime(detailData.receipt_time) }}</el-descriptions-item>
          <el-descriptions-item label="关闭时间">{{ formatDateTime(detailData.close_time) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ emptyText(detailData.detail_remark || detailData.remark) }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions title="附件信息" :column="1" border class="detail-attachment-descriptions">
          <el-descriptions-item label="发票登记">
            <el-table border :data="detailSaleInvoices" stripe class="invoice-table">
              <el-table-column prop="invoice_no" label="登记单号" width="180" show-overflow-tooltip />
              <el-table-column prop="external_invoice_no" label="发票号码" width="150" show-overflow-tooltip>
                <template #default="{ row }">{{ emptyText(row.external_invoice_no) }}</template>
              </el-table-column>
              <el-table-column label="价税合计" width="120" align="right">
                <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
              </el-table-column>
              <el-table-column label="税金" width="110" align="right">
                <template #default="{ row }">¥{{ formatMoney(row.tax_amount) }}</template>
              </el-table-column>
              <el-table-column label="开票日期" width="170">
                <template #default="{ row }">{{ formatDateTime(row.invoice_date || row.created_at) }}</template>
              </el-table-column>
            </el-table>
          </el-descriptions-item>
          <el-descriptions-item label="收款凭证">
            <div v-if="normalizeAttachmentUrls(detailData.voucher_urls).length" class="attachment-list">
              <button
                v-for="url in normalizeAttachmentUrls(detailData.voucher_urls)"
                :key="url"
                type="button"
                class="attachment-item"
                @click="previewAttachmentUrl(url, normalizeAttachmentUrls(detailData.voucher_urls))"
              >
                <img v-if="isImageUrl(url)" :src="assetUrl(url)" alt="" class="attachment-thumb" />
                <span v-else class="attachment-file">文件</span>
                <span class="attachment-name">{{ fileNameFromUrl(url) }}</span>
              </button>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="开票附件">
            <div v-if="detailInvoiceAttachments.length" class="attachment-list">
              <button
                v-for="url in detailInvoiceAttachments"
                :key="url"
                type="button"
                class="attachment-item"
                @click="previewAttachmentUrl(url, detailInvoiceAttachments)"
              >
                <img v-if="isImageUrl(url)" :src="assetUrl(url)" alt="" class="attachment-thumb" />
                <span v-else class="attachment-file">文件</span>
                <span class="attachment-name">{{ fileNameFromUrl(url) }}</span>
              </button>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>

    <el-image-viewer v-if="previewVisible" :url-list="previewImageList" :initial-index="previewIndex" teleported @close="previewVisible = false" />
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { getReceipt, getReceipts, receiveReceipt } from '@/api/finance'
import { createSaleInvoice } from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import { uploadFile } from '@/api/upload'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', customer_id: null as any, status: '' as any })
const detailDrawerVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any>({})
const detailSaleInvoices = computed(() => Array.isArray(detailData.value.sale_invoices) ? detailData.value.sale_invoices : [])
const detailInvoiceAttachments = computed(() => [
  ...normalizeAttachmentUrls(detailData.value.invoice_attachment_urls),
  ...detailSaleInvoices.value.flatMap((item: any) => normalizeAttachmentUrls(item.attachment_urls))
])
const receiveDrawerVisible = ref(false)
const receiveFormRef = ref<FormInstance>()
const invoiceDrawerVisible = ref(false)
const invoiceFormRef = ref<FormInstance>()
const voucherFileList = ref<any[]>([])
const invoiceFileList = ref<any[]>([])
const previewVisible = ref(false)
const previewImageList = ref<string[]>([])
const previewIndex = ref(0)
const receiptMethodOptions = ['账期结算', '预收款', '银行转账', '现金收款', '在线支付', '其他方式']
const receiveForm = reactive({
  id: null as number | null,
  receivable_amount: 0,
  received_amount: 0,
  unreceived_amount: 0,
  amount: '',
  pay_method: '',
  pay_time: '',
  remark: '',
  voucher_urls: [] as string[]
})
const invoiceForm = reactive({
  id: null as number | null,
  order_id: null as number | null,
  receivable_amount: 0,
  received_amount: 0,
  unreceived_amount: 0,
  invoiced_amount: 0,
  external_invoice_no: '',
  invoice_date: '',
  amount: '',
  tax_rate: 13,
  tax_amount: 0,
  total_amount: 0,
  invoice_remark: '',
  invoice_attachment_urls: [] as string[]
})
const receiveRules = {
  amount: [{ required: true, message: '请输入收款金额', trigger: 'blur' }],
  pay_method: [{ required: true, message: '请选择收款方式', trigger: 'change' }],
  pay_time: [{ required: true, message: '请选择收款时间', trigger: 'change' }],
  remark: [{ max: 300, message: '备注最多300个字符', trigger: 'blur' }]
}
const invoiceRules = {
  amount: [{ required: true, message: '请输入不含税金额', trigger: 'blur' }],
  tax_rate: [{ required: true, message: '请输入税率', trigger: 'blur' }],
  invoice_remark: [{ max: 300, message: '备注最多300个字符', trigger: 'blur' }]
}

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

async function handleDetail(row: any) {
  detailDrawerVisible.value = true
  detailLoading.value = true
  detailData.value = {}
  try {
    const res: any = await getReceipt(row.id)
    detailData.value = res.data || {}
  } finally {
    detailLoading.value = false
  }
}

async function openReceiveDrawer(row: any) {
  receiveDrawerVisible.value = true
  resetReceiveForm()
  const res: any = await getReceipt(row.id)
  const receipt = res.data || {}
  const receivableAmount = toMoney(receipt.receivable_amount ?? receipt.should_amount)
  const receivedAmount = toMoney(receipt.amount)
  const unreceivedAmount = toMoney(receipt.unreceived_amount ?? Math.max(receivableAmount - receivedAmount, 0))
  const voucherUrls = normalizeAttachmentUrls(receipt.voucher_urls)
  Object.assign(receiveForm, {
    id: row.id,
    receivable_amount: receivableAmount,
    received_amount: receivedAmount,
    unreceived_amount: unreceivedAmount,
    amount: unreceivedAmount > 0 ? unreceivedAmount.toFixed(2) : '',
    pay_method: receipt.receipt_method || receipt.pay_method || '',
    pay_time: formatInputDateTime(new Date()),
    remark: receipt.detail_remark || receipt.remark || '',
    voucher_urls: [...voucherUrls]
  })
  voucherFileList.value = toUploadFileList(voucherUrls, '凭证')
}

async function openInvoiceDrawer(row: any) {
  invoiceDrawerVisible.value = true
  resetInvoiceForm()
  const res: any = await getReceipt(row.id)
  const receipt = res.data || {}
  const receivableAmount = toMoney(receipt.receivable_amount ?? receipt.should_amount)
  const receivedAmount = toMoney(receipt.amount)
  const attachmentUrls = normalizeAttachmentUrls(receipt.invoice_attachment_urls)
  const invoicedAmount = toMoney(receipt.invoice_total_amount)
  const uninvoicedAmount = toMoney(Math.max(receivableAmount - invoicedAmount, 0))
  const taxAmount = calculateIncludedTax(uninvoicedAmount, 13)
  const amount = toMoney(uninvoicedAmount - taxAmount)
  Object.assign(invoiceForm, {
    id: row.id,
    order_id: receipt.sale_order_id || receipt.order_id || row.order_id || null,
    receivable_amount: receivableAmount,
    received_amount: receivedAmount,
    unreceived_amount: uninvoicedAmount,
    invoiced_amount: invoicedAmount,
    external_invoice_no: '',
    invoice_date: formatInputDateTime(new Date()),
    amount: amount > 0 ? amount.toFixed(2) : '',
    tax_rate: 13,
    tax_amount: taxAmount,
    total_amount: uninvoicedAmount,
    invoice_remark: receipt.invoice_remark || '',
    invoice_attachment_urls: [...attachmentUrls]
  })
  invoiceFileList.value = toUploadFileList(attachmentUrls, '附件')
}

function fillAllUnreceived() {
  receiveForm.amount = toMoney(receiveForm.unreceived_amount).toFixed(2)
}

async function handleReceiveSubmit() {
  if (!receiveFormRef.value || !receiveForm.id) return
  await receiveFormRef.value.validate()
  const amount = toMoney(receiveForm.amount)
  if (amount <= 0) {
    ElMessage.warning('请输入有效的收款金额')
    return
  }
  if (amount > toMoney(receiveForm.unreceived_amount)) {
    ElMessage.warning(`收款金额不能大于未收金额 ${formatMoney(receiveForm.unreceived_amount)}`)
    return
  }
  await receiveReceipt(receiveForm.id, {
    amount,
    pay_method: receiveForm.pay_method,
    pay_time: receiveForm.pay_time,
    remark: receiveForm.remark,
    voucher_urls: receiveForm.voucher_urls
  })
  ElMessage.success('收款成功')
  receiveDrawerVisible.value = false
  fetchData()
}

async function handleInvoiceSubmit() {
  if (!invoiceFormRef.value || !invoiceForm.order_id) return
  await invoiceFormRef.value.validate()
  recalculateInvoiceAmountFromTax()
  await createSaleInvoice({
    order_id: invoiceForm.order_id,
    external_invoice_no: invoiceForm.external_invoice_no,
    invoice_date: invoiceForm.invoice_date,
    amount: Number(invoiceForm.amount || 0),
    tax_rate: Number(invoiceForm.tax_rate || 0),
    tax_amount: invoiceForm.tax_amount,
    total_amount: invoiceForm.total_amount,
    remark: invoiceForm.invoice_remark,
    attachment_urls: invoiceForm.invoice_attachment_urls
  })
  ElMessage.success('发票登记成功')
  invoiceDrawerVisible.value = false
  fetchData()
}

function recalculateInvoiceTaxFromRate() {
  const totalAmount = toMoney(invoiceForm.total_amount)
  const taxAmount = calculateIncludedTax(totalAmount, invoiceForm.tax_rate)
  Object.assign(invoiceForm, {
    amount: toMoney(Math.max(totalAmount - taxAmount, 0)).toFixed(2),
    tax_amount: taxAmount,
    total_amount: totalAmount
  })
}

function recalculateInvoiceAmountFromTax() {
  const totalAmount = toMoney(invoiceForm.total_amount)
  const taxAmount = Math.min(Math.max(toMoney(invoiceForm.tax_amount), 0), totalAmount)
  invoiceForm.tax_amount = taxAmount
  invoiceForm.amount = toMoney(Math.max(totalAmount - taxAmount, 0)).toFixed(2)
}

function resetReceiveForm() {
  Object.assign(receiveForm, {
    id: null,
    receivable_amount: 0,
    received_amount: 0,
    unreceived_amount: 0,
    amount: '',
    pay_method: '',
    pay_time: '',
    remark: '',
    voucher_urls: []
  })
  voucherFileList.value = []
  receiveFormRef.value?.clearValidate()
}

function resetInvoiceForm() {
  Object.assign(invoiceForm, {
    id: null,
    order_id: null,
    receivable_amount: 0,
    received_amount: 0,
    unreceived_amount: 0,
    invoiced_amount: 0,
    external_invoice_no: '',
    invoice_date: '',
    amount: '',
    tax_rate: 13,
    tax_amount: 0,
    total_amount: 0,
    invoice_remark: '',
    invoice_attachment_urls: []
  })
  invoiceFileList.value = []
  invoiceFormRef.value?.clearValidate()
}

function beforeVoucherUpload(file: File) {
  return beforeAttachmentUpload(file, receiveForm.voucher_urls.length, '收款凭证')
}

async function handleVoucherUpload(options: any) {
  await uploadAttachment(options)
}

function handleVoucherSuccess(res: any, file: any) {
  const url = res?.data?.url
  if (!url) return
  file.url = url
  file.name = res?.data?.originalname || file.name
  if (isImageUrl(url)) file.thumbUrl = assetUrl(url)
  if (!receiveForm.voucher_urls.includes(url)) receiveForm.voucher_urls.push(url)
}

function handleVoucherRemove(file: any) {
  const url = file.url || file.response?.data?.url
  receiveForm.voucher_urls = receiveForm.voucher_urls.filter(item => item !== url)
}

function beforeInvoiceAttachmentUpload(file: File) {
  return beforeAttachmentUpload(file, invoiceForm.invoice_attachment_urls.length, '开票附件')
}

async function handleInvoiceAttachmentUpload(options: any) {
  await uploadAttachment(options)
}

function handleInvoiceAttachmentSuccess(res: any, file: any) {
  const url = res?.data?.url
  if (!url) return
  file.url = url
  file.name = res?.data?.originalname || file.name
  if (isImageUrl(url)) file.thumbUrl = assetUrl(url)
  if (!invoiceForm.invoice_attachment_urls.includes(url)) invoiceForm.invoice_attachment_urls.push(url)
}

function handleInvoiceAttachmentRemove(file: any) {
  const url = file.url || file.response?.data?.url
  invoiceForm.invoice_attachment_urls = invoiceForm.invoice_attachment_urls.filter(item => item !== url)
}

function beforeAttachmentUpload(file: File, currentCount: number, label: string) {
  if (currentCount >= 10) {
    ElMessage.warning(`${label}最多10个`)
    return false
  }
  const validSize = file.size / 1024 / 1024 <= 10
  if (!validSize) ElMessage.warning('单个文件不能超过10MB')
  return validSize
}

async function uploadAttachment(options: any) {
  try {
    const formData = new FormData()
    formData.append('file', options.file)
    const res: any = await uploadFile(formData)
    options.onSuccess?.(res)
  } catch (err) {
    options.onError?.(err)
  }
}

function handleAttachmentPreview(file: any) {
  const url = file.url || file.response?.data?.url
  if (!url) return
  previewAttachmentUrl(url)
}

function previewAttachmentUrl(url: string, urls?: string[]) {
  if (!isImageUrl(url)) {
    window.open(assetUrl(url), '_blank')
    return
  }
  const sourceUrls = urls?.length
    ? urls
    : [...receiveForm.voucher_urls, ...invoiceForm.invoice_attachment_urls, ...normalizeAttachmentUrls(detailData.value.voucher_urls), ...normalizeAttachmentUrls(detailData.value.invoice_attachment_urls)]
  const images = sourceUrls.filter(isImageUrl).map(assetUrl)
  const current = assetUrl(url)
  previewImageList.value = images.length ? images : [current]
  previewIndex.value = Math.max(previewImageList.value.findIndex(item => item === current), 0)
  previewVisible.value = true
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

function fileNameFromUrl(url: string) {
  return String(url || '').split('/').pop() || ''
}

function toUploadFileList(urls: string[], prefix: string) {
  return urls.map((url: string, index: number) => ({
    name: fileNameFromUrl(url) || `${prefix}${index + 1}`,
    url,
    thumbUrl: isImageUrl(url) ? assetUrl(url) : undefined
  }))
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(url).split('?')[0])
}

function assetUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url
}

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

function toMoney(value: any) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

function calculateIncludedTax(totalAmount: any, taxRate: any) {
  const total = toMoney(totalAmount)
  const rate = toMoney(taxRate)
  return rate > 0 ? toMoney(total * rate / (100 + rate)) : 0
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
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
  const res: any = await getSuppliers({ page: 1, pageSize: 1000, status: 1 })
  customers.value = listOf(res)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.receipt-detail {
  padding-bottom: 24px;
}

.receipt-form :deep(.el-select),
.receipt-form :deep(.el-date-editor),
.receipt-form :deep(.el-upload) {
  width: 100%;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 6px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}

.detail-attachment-descriptions {
  margin-top: 16px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-item {
  max-width: 180px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #303133;
  padding: 6px 8px;
  cursor: pointer;
}

.attachment-item:hover {
  color: #409eff;
  border-color: #409eff;
}

.attachment-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  background: #f5f7fa;
}

.attachment-file {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 4px;
  background: #f5f7fa;
  color: #606266;
  font-size: 12px;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

