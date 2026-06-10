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
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
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
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button type="info" link @click="openDetailDrawer(row)">查看</el-button>
            <el-button type="primary" link :disabled="Number(row.status) >= 2" @click="openPayDrawer(row)">付款</el-button>
            <el-button type="success" link :disabled="Number(row.invoice_status) === 1" @click="openInvoiceDialog(row)">开票</el-button>
            <el-button v-if="Number(row.status) === 3" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-drawer v-model="payDrawerVisible" size="560px" direction="rtl" class="payment-drawer" @close="resetPayForm">
      <template #header>
        <div class="drawer-header">
          <span>付款</span>
          <el-button type="primary" link :disabled="!payForm.order_id" @click="openPurchaseOrderDetail(payForm.order_id)">查看采购单</el-button>
        </div>
      </template>

      <el-form ref="payFormRef" :model="payForm" :rules="payRules" label-width="96px" class="pay-form">
        <el-form-item label="应付金额">
          <el-input :model-value="formatMoney(payForm.payable_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="未付金额">
          <el-input :model-value="formatMoney(payForm.unpaid_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input :model-value="formatMoney(payForm.paid_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="付款金额" prop="amount">
          <el-input v-model="payForm.amount" type="number" placeholder="请输入付款金额">
            <template #prepend>¥</template>
            <template #append><el-button @click="fillAllUnpaid">全部</el-button></template>
          </el-input>
        </el-form-item>
        <el-form-item label="付款人" prop="payer">
          <el-input v-model="payForm.payer" maxlength="30" show-word-limit placeholder="请输入付款人" />
        </el-form-item>
        <el-form-item label="付款时间" prop="pay_time">
          <el-date-picker v-model="payForm.pay_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择付款时间" />
        </el-form-item>
        <el-form-item label="付款方式" prop="pay_method">
          <el-select v-model="payForm.pay_method" placeholder="请选择付款方式" clearable>
            <el-option v-for="method in paymentMethodOptions" :key="method" :label="method" :value="method" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="payForm.remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="付款凭证">
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
          <el-button @click="payDrawerVisible = false">取消</el-button>
          <el-button type="primary" @click="handlePaySubmit">确认付款</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="invoiceDialogVisible" size="560px" direction="rtl" class="payment-drawer" @close="resetInvoiceForm">
      <template #header>
        <div class="drawer-header">
          <span>开票</span>
          <el-button type="primary" link :disabled="!invoiceForm.order_id" @click="openPurchaseOrderDetail(invoiceForm.order_id)">查看采购单</el-button>
        </div>
      </template>

      <el-form ref="invoiceFormRef" :model="invoiceForm" :rules="invoiceRules" label-width="96px" class="pay-form">
        <el-form-item label="应付金额">
          <el-input :model-value="formatMoney(invoiceForm.payable_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="未付金额">
          <el-input :model-value="formatMoney(invoiceForm.unpaid_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input :model-value="formatMoney(invoiceForm.paid_amount)" disabled>
            <template #prefix>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="状态" prop="invoice_status">
          <el-select v-model="invoiceForm.invoice_status" placeholder="请选择">
            <el-option label="未开票" :value="0" />
            <el-option label="开票中" :value="2" />
            <el-option label="已开票" :value="1" />
            <el-option label="无需开票" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="invoice_remark">
          <el-input v-model="invoiceForm.invoice_remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="开票附件">
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
          <el-button @click="invoiceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleInvoiceSubmit">确认开票</el-button>
        </div>
      </template>
    </el-drawer>

    <el-image-viewer v-if="previewVisible" :url-list="previewImageList" :initial-index="previewIndex" teleported @close="previewVisible = false" />

    <el-drawer v-model="detailDrawerVisible" title="付款单详情" size="72%" direction="rtl" class="detail-drawer" @close="resetDetailDrawer">
      <el-tabs v-model="detailActiveTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="付款单id">{{ emptyText(detailData.id) }}</el-descriptions-item>
            <el-descriptions-item label="付款单号"><CopyableNo :value="detailData.payment_no" /></el-descriptions-item>
            <el-descriptions-item label="采购单号"><CopyableNo :value="detailData.order_no" /></el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(detailData.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="付款状态">
              <el-tag :type="paymentStatusTagType(detailData.status)" size="small">{{ paymentStatusText(detailData.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="开票状态">
              <el-tag :type="invoiceStatusTagType(detailData.invoice_status)" size="small">{{ invoiceStatusText(detailData.invoice_status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="应付金额">¥{{ formatMoney(detailData.receivable_total_amount ?? detailData.should_amount) }}</el-descriptions-item>
            <el-descriptions-item label="已付金额">¥{{ formatMoney(detailData.paid_total_amount ?? detailData.amount) }}</el-descriptions-item>
            <el-descriptions-item label="未付金额">¥{{ formatMoney(detailUnpaidAmount) }}</el-descriptions-item>
            <el-descriptions-item label="付款方式">{{ emptyText(detailData.pay_method) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detailData.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(detailData.phone) }}</el-descriptions-item>
            <el-descriptions-item label="开户银行">{{ emptyText(detailData.bank_name) }}</el-descriptions-item>
            <el-descriptions-item label="开户户号">{{ emptyText(detailData.bank_account) }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ emptyText(detailData.remark) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detailData.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(detailData.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="付款信息" name="payments">
          <el-table :data="detailPaymentRecords" stripe class="detail-item-table">
            <el-table-column type="index" label="序号" width="70" />
            <el-table-column label="付款金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="payer" label="付款人" width="120">
              <template #default="{ row }">{{ emptyText(row.payer) }}</template>
            </el-table-column>
            <el-table-column label="付款时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.pay_time) }}</template>
            </el-table-column>
            <el-table-column prop="pay_method" label="付款方式" width="130">
              <template #default="{ row }">{{ emptyText(row.pay_method) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ emptyText(row.remark) }}</template>
            </el-table-column>
            <el-table-column label="付款附件" min-width="220">
              <template #default="{ row }">
                <div v-if="normalizeAttachmentUrls(row.voucher_urls).length" class="attachment-list">
                  <button
                    v-for="url in normalizeAttachmentUrls(row.voucher_urls)"
                    :key="url"
                    type="button"
                    class="attachment-item"
                    @click="previewAttachmentUrl(url, normalizeAttachmentUrls(row.voucher_urls))"
                  >
                    <img v-if="isImageUrl(url)" :src="assetUrl(url)" alt="" class="attachment-thumb" />
                    <span v-else class="attachment-file">文件</span>
                    <span class="attachment-name">{{ fileNameFromUrl(url) }}</span>
                  </button>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="开票附件" name="invoiceAttachments">
          <div v-if="detailInvoiceAttachments.length" class="attachment-list attachment-list-large">
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
          <el-empty v-else description="暂无开票附件" />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-drawer v-model="orderDrawerVisible" title="采购单详情" size="72%" direction="rtl" class="detail-drawer">
      <el-tabs v-model="orderActiveTab">
        <el-tab-pane label="基础信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="采购单号"><CopyableNo :value="orderDetail.order_no" /></el-descriptions-item>
            <el-descriptions-item label="采购状态">
              <el-tag :type="purchaseStatusTagType(orderDetail.status)" size="small">{{ purchaseStatusText(orderDetail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(orderDetail.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="入库仓库">{{ emptyText(orderDetail.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="付款方式">{{ emptyText(orderDetail.payment_method) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(orderDetail.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(orderDetail.phone) }}</el-descriptions-item>
            <el-descriptions-item label="总价">¥{{ formatMoney(orderDetail.total_price ?? orderDetail.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="最终总价">¥{{ formatMoney(orderDetailFinalAmount) }}</el-descriptions-item>
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
          <el-table :data="orderDetail.items" stripe class="detail-item-table">
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="code" label="产品编码" width="130" show-overflow-tooltip />
            <el-table-column prop="spec" label="产品规格" width="120" show-overflow-tooltip />
            <el-table-column label="计量单位" width="120">
              <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
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
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { deletePayment, getPayment, getPayments, invoicePayment, payPayment } from '@/api/finance'
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
const invoiceDialogVisible = ref(false)
const detailDrawerVisible = ref(false)
const detailActiveTab = ref('basic')
const orderDrawerVisible = ref(false)
const orderActiveTab = ref('basic')
const payFormRef = ref<FormInstance>()
const invoiceFormRef = ref<FormInstance>()
const voucherFileList = ref<any[]>([])
const invoiceFileList = ref<any[]>([])
const previewVisible = ref(false)
const previewImageList = ref<string[]>([])
const previewIndex = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, status: null as any, dateRange: null as any })
const paymentMethodOptions = ['账期结算', '预付款', '银行转账', '现金支付', '在线支付', '其他方式']
const payForm = reactive({
  id: null as number | null,
  order_id: null as number | null,
  payable_amount: 0,
  unpaid_amount: 0,
  paid_amount: 0,
  amount: '',
  payer: '',
  pay_time: '',
  pay_method: '',
  remark: '',
  voucher_urls: [] as string[]
})
const invoiceForm = reactive({
  id: null as number | null,
  order_id: null as number | null,
  payable_amount: 0,
  unpaid_amount: 0,
  paid_amount: 0,
  invoice_status: null as number | null,
  invoice_remark: '',
  invoice_attachment_urls: [] as string[]
})
const detailData = reactive<any>({ payment_records: [] })
const orderDetail = reactive<any>({ items: [] })
const payRules = {
  amount: [{ required: true, message: '请输入付款金额', trigger: 'blur' }],
  payer: [
    { required: true, message: '请输入付款人', trigger: 'blur' },
    { max: 30, message: '付款人最多30个字符', trigger: 'blur' }
  ],
  pay_time: [{ required: true, message: '请选择付款时间', trigger: 'change' }],
  pay_method: [{ required: true, message: '请选择付款方式', trigger: 'change' }],
  remark: [{ max: 300, message: '备注最多300个字符', trigger: 'blur' }]
}
const invoiceRules = {
  invoice_status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  invoice_remark: [{ max: 300, message: '备注最多300个字符', trigger: 'blur' }]
}
const orderDetailFinalAmount = computed(() => (orderDetail.items || []).reduce((sum: number, item: any) => sum + Number(item.final_amount ?? item.amount ?? 0), 0))
const detailPaymentRecords = computed(() => Array.isArray(detailData.payment_records) ? detailData.payment_records : [])
const detailInvoiceAttachments = computed(() => normalizeAttachmentUrls(detailData.invoice_attachment_urls))
const detailUnpaidAmount = computed(() => {
  const payable = Number(detailData.receivable_total_amount ?? detailData.should_amount ?? detailData.purchase_total_amount ?? 0)
  const paid = Number(detailData.paid_total_amount ?? detailData.amount ?? 0)
  return Math.max(payable - paid, 0)
})

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

async function openDetailDrawer(row: any) {
  const res: any = await getPayment(row.id)
  const detail = res.data || {}
  Object.keys(detailData).forEach(key => delete detailData[key])
  Object.assign(detailData, detail, {
    payment_records: Array.isArray(detail.payment_records) ? detail.payment_records : []
  })
  detailActiveTab.value = 'basic'
  detailDrawerVisible.value = true
}

function resetDetailDrawer() {
  Object.keys(detailData).forEach(key => delete detailData[key])
  Object.assign(detailData, { payment_records: [] })
}

function openPayDrawer(row: any) {
  const paid = Number(row.paid_total_amount ?? row.amount ?? 0)
  const payable = Number(row.receivable_total_amount || row.purchase_total_amount || 0)
  const unpaid = Number(Math.max(payable - paid, 0).toFixed(2))
  const voucherUrls = normalizeVoucherUrls(row.voucher_urls)
  Object.assign(payForm, {
    id: row.id,
    order_id: row.order_id || null,
    payable_amount: payable,
    unpaid_amount: unpaid,
    paid_amount: paid,
    amount: '',
    payer: row.payer || '',
    pay_time: formatInputDateTime(new Date()),
    pay_method: row.pay_method || '',
    remark: row.remark || '',
    voucher_urls: [...voucherUrls]
  })
  voucherFileList.value = toUploadFileList(voucherUrls, '凭证')
  payDrawerVisible.value = true
}

function openInvoiceDialog(row: any) {
  const paid = Number(row.paid_total_amount ?? row.amount ?? 0)
  const payable = Number(row.receivable_total_amount || row.purchase_total_amount || 0)
  const unpaid = Number(Math.max(payable - paid, 0).toFixed(2))
  const attachmentUrls = normalizeAttachmentUrls(row.invoice_attachment_urls)
  Object.assign(invoiceForm, {
    id: row.id,
    order_id: row.order_id || null,
    payable_amount: payable,
    unpaid_amount: unpaid,
    paid_amount: paid,
    invoice_status: Number(row.invoice_status ?? 0),
    invoice_remark: row.invoice_remark || '',
    invoice_attachment_urls: [...attachmentUrls]
  })
  invoiceFileList.value = toUploadFileList(attachmentUrls, '附件')
  invoiceDialogVisible.value = true
}

function resetPayForm() {
  Object.assign(payForm, {
    id: null,
    order_id: null,
    payable_amount: 0,
    unpaid_amount: 0,
    paid_amount: 0,
    amount: '',
    payer: '',
    pay_time: '',
    pay_method: '',
    remark: '',
    voucher_urls: []
  })
  voucherFileList.value = []
  payFormRef.value?.clearValidate()
}

function resetInvoiceForm() {
  Object.assign(invoiceForm, {
    id: null,
    order_id: null,
    payable_amount: 0,
    unpaid_amount: 0,
    paid_amount: 0,
    invoice_status: null,
    invoice_remark: '',
    invoice_attachment_urls: []
  })
  invoiceFileList.value = []
  invoiceFormRef.value?.clearValidate()
}

function fillAllUnpaid() {
  payForm.amount = formatMoney(payForm.unpaid_amount)
}

async function handlePaySubmit() {
  const valid = await payFormRef.value?.validate().catch(() => false)
  if (!valid || !payForm.id) return
  const amount = Number(payForm.amount || 0)
  if (amount <= 0) {
    ElMessage.warning('付款金额必须大于0')
    return
  }
  if (amount > Number(payForm.unpaid_amount || 0)) {
    ElMessage.warning('付款金额不能大于未付金额')
    return
  }
  await payPayment(payForm.id, {
    amount,
    payer: payForm.payer,
    pay_time: payForm.pay_time,
    pay_method: payForm.pay_method,
    remark: payForm.remark,
    voucher_urls: payForm.voucher_urls
  })
  ElMessage.success('付款成功')
  payDrawerVisible.value = false
  fetchData()
}

async function handleInvoiceSubmit() {
  const valid = await invoiceFormRef.value?.validate().catch(() => false)
  if (!valid || !invoiceForm.id) return
  await invoicePayment(invoiceForm.id, {
    invoice_status: invoiceForm.invoice_status,
    invoice_remark: invoiceForm.invoice_remark,
    invoice_attachment_urls: invoiceForm.invoice_attachment_urls
  })
  ElMessage.success('开票成功')
  invoiceDialogVisible.value = false
  fetchData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确认删除付款单 ${row.id}？`, '提示', { type: 'warning' })
  await deletePayment(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

async function openPurchaseOrderDetail(orderId: number | null) {
  if (!orderId) return
  const res: any = await getPurchaseOrder(orderId)
  const detail = res.data || {}
  Object.keys(orderDetail).forEach(key => delete orderDetail[key])
  Object.assign(orderDetail, detail, { items: detail.items || [] })
  orderActiveTab.value = 'basic'
  orderDrawerVisible.value = true
}

function beforeVoucherUpload(file: File) {
  return beforeAttachmentUpload(file, payForm.voucher_urls.length, '付款凭证')
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
  if (!payForm.voucher_urls.includes(url)) payForm.voucher_urls.push(url)
}

function handleVoucherRemove(file: any) {
  const url = file.url || file.response?.data?.url
  payForm.voucher_urls = payForm.voucher_urls.filter(item => item !== url)
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
  const sourceUrls = urls?.length ? urls : [...payForm.voucher_urls, ...invoiceForm.invoice_attachment_urls, ...detailInvoiceAttachments.value]
  const images = sourceUrls.filter(isImageUrl).map(assetUrl)
  const current = assetUrl(url)
  previewImageList.value = images.length ? images : [current]
  previewIndex.value = Math.max(previewImageList.value.findIndex(item => item === current), 0)
  previewVisible.value = true
}

function normalizeVoucherUrls(value: any) {
  return normalizeAttachmentUrls(value)
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

function paymentStatusText(status: any) {
  const map: Record<number, string> = { 0: '待付款', 1: '付款中', 2: '已付款', 3: '已关闭' }
  return map[Number(status)] || '待付款'
}

function paymentStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
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

function purchaseStatusText(status: any) {
  const map: Record<number, string> = {
    0: '待提交',
    1: '采购中',
    2: '待审核',
    3: '已取消',
    4: '已关闭',
    5: '已审核',
    6: '已采购',
    7: '入库中',
    8: '已入库',
    9: '已拒绝'
  }
  return map[Number(status)] || '未知'
}

function purchaseStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
    0: 'info',
    1: 'primary',
    2: 'warning',
    3: 'danger',
    4: 'info',
    5: 'success',
    6: 'success',
    7: 'warning',
    8: 'success',
    9: 'danger'
  }
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
.drawer-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pay-form :deep(.el-input-number),
.pay-form :deep(.el-select),
.pay-form :deep(.el-date-editor),
.pay-form :deep(.el-upload) {
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
.detail-drawer :deep(.el-drawer__body) {
  padding-top: 0;
}
.detail-item-table {
  width: 100%;
}
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.attachment-list-large {
  padding-top: 4px;
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
