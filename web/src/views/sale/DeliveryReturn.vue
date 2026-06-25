<template>
  <div class="return-page" v-loading="loading">
    <div class="page-heading">
      <div class="heading-left">
        <el-button link class="back-button" @click="goBack">←</el-button>
        <span class="page-title">发货退货</span>
        <span class="heading-divider"></span>
        <el-button link type="primary" @click="deliveryDialogVisible = true">查看销售发货单</el-button>
      </div>
    </div>

    <el-form ref="formRef" :model="form" :rules="formRules" label-width="92px" class="return-form">
      <div class="form-grid">
        <el-form-item label="退货单号" required>
          <el-input v-model="form.return_no" placeholder="提交后自动生成">
          </el-input>
        </el-form-item>
        <el-form-item label="职员">
          <el-select v-model="form.employee_id" placeholder="请选择..." clearable filterable>
            <el-option v-for="employee in employees" :key="employee.id" :label="employee.name" :value="employee.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="退货状态" prop="status" required>
          <el-select v-model="form.status" placeholder="请选择...">
            <el-option label="待退货" :value="0" />
            <el-option label="已退货" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="单据备注">
          <el-input v-model="form.reason" type="textarea" :rows="1" maxlength="200" show-word-limit placeholder="单据备注" />
        </el-form-item>

        <el-form-item label="快递名称">
          <el-input v-model="form.express_name" maxlength="100" placeholder="快递名称" />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="form.express_no" maxlength="100" placeholder="快递单号" />
        </el-form-item>
        <el-form-item label="收货信息" class="receiver-item">
          <div class="receiver-fields">
            <el-input v-model="form.contact" maxlength="100" placeholder="联系人" />
            <el-input v-model="form.phone" maxlength="50" placeholder="联系电话" />
            <el-input v-model="form.address" maxlength="255" placeholder="收货地址" />
          </div>
        </el-form-item>
      </div>

      <el-table border :data="form.items" stripe class="return-table">
        <el-table-column prop="product_name" label="产品标题" min-width="240" show-overflow-tooltip />
        <el-table-column label="单价 / 总额" width="160">
          <template #default="{ row }">{{ formatMoney(row.price) }} / {{ formatMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="税金 / 总额" width="160">
          <template #default="{ row }">{{ formatMoney(unitTax(row)) }} / {{ formatMoney(row.tax) }}</template>
        </el-table-column>
        <el-table-column label="产品单位" width="120">
          <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
        </el-table-column>
        <el-table-column label="发货数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
        </el-table-column>
        <el-table-column label="可退数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.available_quantity) }}</template>
        </el-table-column>
        <el-table-column label="退货数量" width="150">
          <template #header>
            <span>退货数量 <span class="edit-mark">✎</span></span>
          </template>
          <template #default="{ row }">
            <el-input-number
              v-model="row.return_quantity"
              :min="0"
              :max="row.available_quantity"
              :precision="2"
              :controls="false"
              placeholder="退货数量"
              @change="handleQuantityChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="退款金额" width="150">
          <template #header>
            <span>退款金额 <span class="edit-mark">✎</span></span>
          </template>
          <template #default="{ row }">
            <el-input-number
              v-model="row.refund_amount"
              :min="0"
              :max="maximumRefund(row)"
              :precision="2"
              :controls="false"
              placeholder="退款金额"
            />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="170">
          <template #default="{ row }">
            <el-input v-model="row.remark" maxlength="255" placeholder="备注" />
          </template>
        </el-table-column>
      </el-table>
    </el-form>

    <div class="page-footer">
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      <div class="summary">
        <span>条数 <strong>{{ selectedItems.length }}</strong></span>
        <span>数量 <strong>{{ formatQuantity(totalQuantity) }}</strong></span>
        <span>总价: <strong>¥{{ formatMoney(totalRefund) }}</strong></span>
      </div>
    </div>

    <el-dialog v-model="deliveryDialogVisible" title="查看销售发货单" width="680px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="销售单号"><CopyableNo :value="delivery.order_no" /></el-descriptions-item>
        <el-descriptions-item label="客户">{{ emptyText(delivery.customer_name) }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{ emptyText(delivery.warehouse_name) }}</el-descriptions-item>
        <el-descriptions-item label="总价">¥{{ formatMoney(delivery.total_amount) }}</el-descriptions-item>
        <el-descriptions-item label="产品发货总数">{{ formatQuantity(delivery.delivery_total_quantity) }}</el-descriptions-item>
        <el-descriptions-item label="发货单时间">{{ formatDateTime(delivery.shipped_time || delivery.created_at) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="deliveryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { getEmployees } from '@/api/employee'
import { createSaleReturn, getSaleDelivery } from '@/api/sale'

interface ReturnItem {
  delivery_item_id: number
  product_id: number
  product_name: string
  unit_name: string
  quantity: number
  available_quantity: number
  price: number
  amount: number
  tax: number
  return_quantity: number
  refund_amount: number
  remark: string
}

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)
const deliveryDialogVisible = ref(false)
const employees = ref<any[]>([])
const delivery = reactive<any>({ items: [] })
const form = reactive({
  return_no: '',
  employee_id: null as number | null,
  status: 0 as number | null,
  express_name: '',
  express_no: '',
  contact: '',
  phone: '',
  address: '',
  reason: '',
  items: [] as ReturnItem[]
})
const formRules = {
  status: [{ required: true, message: '请选择退货状态', trigger: 'change' }]
}

const selectedItems = computed(() => form.items.filter(item => Number(item.return_quantity || 0) > 0))
const totalQuantity = computed(() => selectedItems.value.reduce((sum, item) => sum + Number(item.return_quantity || 0), 0))
const totalRefund = computed(() => selectedItems.value.reduce((sum, item) => sum + Number(item.refund_amount || 0), 0))

async function loadPage() {
  const deliveryId = Number(route.params.id || 0)
  if (!deliveryId) {
    ElMessage.error('发货单参数无效')
    goBack()
    return
  }
  loading.value = true
  try {
    const [deliveryRes, employeeRes]: any[] = await Promise.all([
      getSaleDelivery(deliveryId),
      getEmployees({ page: 1, pageSize: 1000, status: 1 })
    ])
    const data = deliveryRes.data || {}
    if (![1, 2].includes(Number(data.status))) {
      ElMessage.error('仅已发货或已收货单允许退货')
      goBack()
      return
    }
    Object.assign(delivery, data)
    employees.value = employeeRes.data?.list || employeeRes.data || []
    Object.assign(form, {
      employee_id: data.employee_id || null,
      contact: data.contact || '',
      phone: data.phone || '',
      address: data.detail_address || '',
      items: (data.items || []).map((item: any) => ({
        delivery_item_id: Number(item.id),
        product_id: Number(item.product_id),
        product_name: item.product_name || '-',
        unit_name: item.unit_name || '-',
        quantity: Number(item.quantity || 0),
        available_quantity: Math.max(0, Number(item.quantity || 0) - Number(item.returned_quantity || 0)),
        price: Number(item.price || 0),
        amount: Number(item.amount || 0),
        tax: Number(item.tax || 0),
        return_quantity: 0,
        refund_amount: 0,
        remark: ''
      }))
    })
  } finally {
    loading.value = false
  }
}

function handleQuantityChange(row: ReturnItem) {
  const quantity = Math.min(Math.max(Number(row.return_quantity || 0), 0), Number(row.available_quantity || 0))
  row.return_quantity = quantity
  row.refund_amount = Number(maximumRefund(row).toFixed(2))
}

function maximumRefund(row: ReturnItem) {
  const quantity = Number(row.return_quantity || 0)
  const tax = Number(row.quantity || 0) > 0 ? Number(row.tax || 0) * quantity / Number(row.quantity) : 0
  return quantity * Number(row.price || 0) + tax
}

function unitTax(row: ReturnItem) {
  return Number(row.quantity || 0) > 0 ? Number(row.tax || 0) / Number(row.quantity) : 0
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (!selectedItems.value.length) {
    ElMessage.warning('请至少填写一项退货数量')
    return
  }
  for (const item of selectedItems.value) {
    if (Number(item.return_quantity) > Number(item.available_quantity)) {
      ElMessage.warning(`${item.product_name} 的退货数量超过可退数量`)
      return
    }
    if (Number(item.refund_amount || 0) > maximumRefund(item) + 0.01) {
      ElMessage.warning(`${item.product_name} 的退款金额超过可退款金额`)
      return
    }
  }

  submitting.value = true
  try {
    const res: any = await createSaleReturn({
      delivery_id: Number(route.params.id),
      employee_id: form.employee_id || 0,
      status: form.status,
      express_name: form.express_name,
      express_no: form.express_no,
      contact: form.contact,
      phone: form.phone,
      address: form.address,
      reason: form.reason,
      items: selectedItems.value.map(item => ({
        delivery_item_id: item.delivery_item_id,
        product_id: item.product_id,
        quantity: item.return_quantity,
        refund_amount: item.refund_amount,
        remark: item.remark
      }))
    })
    ElMessage.success(`退货单 ${res.data?.return_no || ''} 创建成功`)
    await router.push({ name: route.query.from === 'return' ? 'SaleReturn' : 'SaleDelivery' })
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push({ name: route.query.from === 'return' ? 'SaleReturn' : 'SaleDelivery' })
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

onMounted(loadPage)
</script>

<style scoped>
.return-page {
  position: relative;
  min-height: calc(100vh - 100px);
  padding: 0 0 76px;
  background: #fff;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 10px;
}
.heading-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.back-button {
  padding: 0;
  font-size: 20px;
}
.page-title {
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
}
.heading-divider {
  width: 1px;
  height: 16px;
  background: var(--el-border-color);
}
.return-form {
  padding: 4px 20px 20px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr));
  column-gap: 24px;
}
.receiver-item {
  grid-column: span 2;
}
.receiver-fields {
  display: grid;
  grid-template-columns: 1fr 1fr 1.35fr;
  gap: 10px;
  width: 100%;
}
.return-table {
  margin-top: 8px;
}
.edit-mark {
  color: var(--el-color-primary);
}
.page-footer {
  position: absolute;
  right: 20px;
  bottom: 0;
  left: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  background: #fff;
}
.summary {
  display: flex;
  gap: 24px;
  font-size: 14px;
}
.summary strong {
  color: var(--el-text-color-primary);
}
@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}
</style>
