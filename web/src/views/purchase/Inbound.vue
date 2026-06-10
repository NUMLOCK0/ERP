<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="入库单号/供应商" clearable />
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
        <el-table-column prop="inbound_no" label="入库单单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.inbound_no" /></template>
        </el-table-column>
        <el-table-column prop="order_no" label="采购单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="warehouse_name" label="仓库" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.warehouse_name) }}</template>
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
        <el-table-column label="入库总数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.inbound_total_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.contact) }}</template>
        </el-table-column>
        <el-table-column prop="mobile_phone" label="联系手机" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.mobile_phone) }}</template>
        </el-table-column>
        <el-table-column prop="telephone" label="联系座机" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.telephone) }}</template>
        </el-table-column>
        <el-table-column prop="email" label="联系邮箱" width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.email) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注信息" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.remark) }}</template>
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
            <el-button v-if="Number(row.status) === 0" type="success" link @click="handleComplete(row)">入库</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-drawer v-model="drawerVisible" title="采购入库单详情" size="72%" direction="rtl" class="detail-drawer">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="入库单号"><CopyableNo :value="detail.inbound_no" /></el-descriptions-item>
            <el-descriptions-item label="采购单号"><CopyableNo :value="detail.order_no" /></el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(detail.status)" size="small">{{ statusText(detail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(detail.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="仓库">{{ emptyText(detail.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="总价">¥{{ formatMoney(detail.total_price ?? detail.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="入库总数量">{{ formatQuantity(detail.inbound_total_quantity) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detail.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系手机">{{ emptyText(detail.mobile_phone) }}</el-descriptions-item>
            <el-descriptions-item label="联系座机">{{ emptyText(detail.telephone) }}</el-descriptions-item>
            <el-descriptions-item label="联系邮箱">{{ emptyText(detail.email) }}</el-descriptions-item>
            <el-descriptions-item label="备注信息">{{ emptyText(detail.remark) }}</el-descriptions-item>
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
            <el-table-column prop="location" label="仓位" width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ emptyText(row.location) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ emptyText(row.remark) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View } from '@element-plus/icons-vue'
import { completePurchaseInbound, getPurchaseInbound, getPurchaseInbounds } from '@/api/purchase'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const drawerVisible = ref(false)
const activeTab = ref('basic')
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', supplier_id: null as any, dateRange: null as any })
const detail = reactive<any>({ items: [] })

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.size, keyword: searchForm.keyword, supplier_id: searchForm.supplier_id }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getPurchaseInbounds(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { keyword: '', supplier_id: null, dateRange: null }); handleSearch() }

async function handleView(row: any) {
  const res: any = await getPurchaseInbound(row.id)
  Object.assign(detail, { ...row, ...(res.data || {}), items: res.data?.items || [] })
  activeTab.value = 'basic'
  drawerVisible.value = true
}

async function handleComplete(row: any) {
  await ElMessageBox.confirm(`确认入库 ${row.inbound_no}？完成后会增加库存。`, '提示', { type: 'warning' })
  await completePurchaseInbound(row.id)
  ElMessage.success('入库成功')
  fetchData()
}

function statusText(status: any) {
  return Number(status) === 1 ? '已入库' : '待入库'
}

function statusTagType(status: any) {
  return Number(status) === 1 ? 'success' : 'warning'
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

onMounted(async () => {
  fetchData()
  const res: any = await getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 })
  suppliers.value = res.data?.list || res.data || []
})
</script>

<style scoped>
.page-container {
  height: 100%;
}
.detail-table {
  margin-top: 16px;
}
</style>
