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
        <el-table-column prop="inbound_no" label="入库单号" width="180" />
        <el-table-column prop="order_no" label="采购订单" width="180" />
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag type="success" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleView(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" title="采购入库单详情" width="980px" top="6vh">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="入库单号">{{ detail.inbound_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="采购订单">{{ detail.order_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusText(detail.status) }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplier_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{ detail.warehouse_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ formatMoney(detail.total_amount) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.created_at) }}</el-descriptions-item>
      </el-descriptions>

      <el-table :data="detail.items" border class="detail-table">
        <el-table-column prop="product_name" label="产品" min-width="180" show-overflow-tooltip />
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="110" align="right" />
        <el-table-column label="单价" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
        </el-table-column>
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { View } from '@element-plus/icons-vue'
import { getPurchaseInbound, getPurchaseInbounds } from '@/api/purchase'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const dialogVisible = ref(false)
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
  dialogVisible.value = true
}

function statusText(status: any) {
  return Number(status) === 1 ? '已入库' : '待入库'
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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
