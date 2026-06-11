<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="产品">
          <el-input v-model="searchForm.keyword" placeholder="产品ID/名称/编码" clearable />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.operation_type" placeholder="请选择" clearable>
            <el-option label="增加库存" value="increase" />
            <el-option label="减少库存" value="decrease" />
            <el-option label="库存不变" value="unchanged" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable filterable>
            <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="searchForm.change_type" placeholder="请选择" clearable>
            <el-option v-for="item in businessTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="日志id" width="90" />
        <el-table-column prop="product_id" label="产品id" width="90" />
        <el-table-column label="产品主图" width="90" align="center">
          <template #default="{ row }">
            <el-image
              v-if="productImage(row)"
              class="product-image"
              :src="productImage(row)"
              :preview-src-list="[productImage(row)]"
              preview-teleported
              fit="cover"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="产品名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.product_name) }}</template>
        </el-table-column>
        <el-table-column prop="product_spec" label="产品规格" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.product_spec) }}</template>
        </el-table-column>
        <el-table-column prop="product_code" label="产品编码" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.product_code) }}</template>
        </el-table-column>
        <el-table-column label="操作类型" width="110">
          <template #default="{ row }">
            <el-tag :type="operationTagType(row.operation_type)" size="small">
              {{ operationTypeText(row.operation_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作库存" width="110" align="right">
          <template #default="{ row }">
            <span :class="operationQuantityClass(row.operation_quantity)">
              {{ formatSignedQuantity(row.operation_quantity) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="unit_name" label="计量单位" width="100">
          <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
        </el-table-column>
        <el-table-column prop="warehouse_name" label="仓库" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.warehouse_name) }}</template>
        </el-table-column>
        <el-table-column label="业务类型" width="130">
          <template #default="{ row }">{{ businessTypeText(row.business_type) }}</template>
        </el-table-column>
        <el-table-column label="业务订单id" width="130" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.business_order_no" :content="`业务单号：${row.business_order_no}`" placement="top">
              <span>{{ emptyText(row.business_order_id) }}</span>
            </el-tooltip>
            <span v-else>{{ emptyText(row.business_order_id) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.operator_name) }}</template>
        </el-table-column>
        <el-table-column label="操作时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.operation_time) }}</template>
        </el-table-column>
      </el-table>

      <Pagination
        v-model:page="pagination.page"
        v-model:size="pagination.size"
        :total="total"
        @change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getInventoryLogs } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import Pagination from '@/components/Pagination.vue'
import SearchForm from '@/components/SearchForm.vue'

const businessTypeOptions = [
  { label: '采购入库', value: 'purchase_inbound' },
  { label: '采购退货', value: 'purchase_return' },
  { label: '销售出库', value: 'sale_delivery' },
  { label: '销售退货', value: 'sale_return' },
  { label: '盘点调整', value: 'inventory_check' },
  { label: '调拨入库', value: 'inventory_transfer_in' },
  { label: '调拨出库', value: 'inventory_transfer_out' },
  { label: '其他入库', value: 'other_inbound' },
  { label: '其他出库', value: 'other_outbound' }
]

const loading = ref(false)
const tableData = ref<any[]>([])
const warehouses = ref<any[]>([])
const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({
  keyword: '',
  operation_type: '',
  warehouse_id: null as number | null,
  change_type: '',
  dateRange: null as string[] | null
})

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      operation_type: searchForm.operation_type,
      warehouse_id: searchForm.warehouse_id,
      change_type: searchForm.change_type
    }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getInventoryLogs(params)
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
  Object.assign(searchForm, {
    keyword: '',
    operation_type: '',
    warehouse_id: null,
    change_type: '',
    dateRange: null
  })
  handleSearch()
}

function operationTypeText(type: string) {
  const map: Record<string, string> = {
    increase: '增加库存',
    decrease: '减少库存',
    unchanged: '库存不变'
  }
  return map[type] || '未知'
}

function operationTagType(type: string) {
  const map: Record<string, 'success' | 'danger' | 'info'> = {
    increase: 'success',
    decrease: 'danger',
    unchanged: 'info'
  }
  return map[type] || 'info'
}

function businessTypeText(type: string) {
  const aliases: Record<string, string> = {
    check: '盘点调整',
    transfer_in: '调拨入库',
    transfer_out: '调拨出库'
  }
  return businessTypeOptions.find(item => item.value === type)?.label || aliases[type] || emptyText(type)
}

function operationQuantityClass(value: any) {
  const quantity = Number(value || 0)
  if (quantity > 0) return 'quantity-increase'
  if (quantity < 0) return 'quantity-decrease'
  return ''
}

function formatSignedQuantity(value: any) {
  const quantity = Number(value || 0)
  const text = Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(3)))
  return quantity > 0 ? `+${text}` : text
}

function productImage(row: any) {
  const images = normalizeImageUrls(row.product_image_urls)
  return images[0] || ''
}

function normalizeImageUrls(value: any) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return [value]
    }
  }
  return []
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
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
  const res: any = await getWarehouses({ page: 1, pageSize: 1000, status: 1 })
  warehouses.value = listOf(res)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.product-image {
  width: 44px;
  height: 44px;
  border-radius: 4px;
}

.quantity-increase {
  color: #67c23a;
  font-weight: 600;
}

.quantity-decrease {
  color: #f56c6c;
  font-weight: 600;
}
</style>
