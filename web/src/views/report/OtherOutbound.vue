<template>
  <div class="report-page">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="出库单号/产品名称/编码" clearable />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="销售客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable>
            <el-option v-for="warehouse in warehouses" :key="warehouse.id" :label="warehouse.name" :value="warehouse.id" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <TableColumnTools table-key="report-other-outbound" filename="其他出库报表" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="数据ID" width="90" />
        <el-table-column prop="outbound_no" label="其他出库单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.outbound_no" /></template>
        </el-table-column>
        <el-table-column prop="product_id" label="产品ID" width="90" />
        <el-table-column label="产品图片" width="90">
          <template #default="{ row }">
            <el-image
              v-if="firstProductImage(row)"
              class="product-image"
              :src="firstProductImage(row)"
              :preview-src-list="[firstProductImage(row)]"
              fit="cover"
              preview-teleported
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="产品名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="产品规格" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.product_spec) }}</template>
        </el-table-column>
        <el-table-column label="出库价" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.outbound_price) }}</template>
        </el-table-column>
        <el-table-column label="出库总额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.outbound_total_amount) }}</template>
        </el-table-column>
        <el-table-column label="出库数量" width="110" align="right">
          <template #default="{ row }">{{ formatQuantity(row.outbound_quantity) }}</template>
        </el-table-column>
        <el-table-column label="税金" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.tax) }}</template>
        </el-table-column>
        <el-table-column label="税金总额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.tax_total) }}</template>
        </el-table-column>
        <el-table-column label="单位" width="90">
          <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
        </el-table-column>
        <el-table-column label="单位基准数" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="customer_name" label="销售客户" min-width="140" show-overflow-tooltip />
        <el-table-column prop="warehouse_name" label="仓库" min-width="130" show-overflow-tooltip />
        <el-table-column label="新增时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />

      <div class="warehouse-section">
        <button class="carousel-arrow" type="button" :disabled="warehouseOffset === 0" @click="moveWarehouses(-1)">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div class="warehouse-cards">
          <div v-for="warehouse in visibleWarehouses" :key="warehouse.id" class="warehouse-card">
            <div class="warehouse-title">{{ warehouse.warehouse_name }}</div>
            <div class="warehouse-stat-grid">
              <span>产品总数 {{ formatQuantity(warehouse.product_total) }}</span>
              <span>出库总数 {{ formatQuantity(warehouse.outbound_total) }}</span>
              <span>出库总额 ¥{{ formatMoney(warehouse.outbound_amount) }}</span>
              <span>税金总额 ¥{{ formatMoney(warehouse.tax_total) }}</span>
            </div>
          </div>
          <div v-if="!warehouseSummaries.length" class="warehouse-empty">暂无仓库数据</div>
        </div>
        <button
          class="carousel-arrow"
          type="button"
          :disabled="warehouseOffset + warehousePageSize >= warehouseSummaries.length"
          @click="moveWarehouses(1)"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>
        <button class="warehouse-more" type="button" @click="warehouseDialogVisible = true">
          <span>更多</span>
          <el-icon><ArrowDown /></el-icon>
        </button>
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" title="其他出库详情" size="72%">
      <div v-loading="detailLoading" class="detail-content">
        <template v-if="detail">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="数据ID">{{ detail.report_item_id }}</el-descriptions-item>
            <el-descriptions-item label="其他出库单号"><CopyableNo :value="detail.outbound_no" /></el-descriptions-item>
            <el-descriptions-item label="销售客户">{{ emptyText(detail.customer_name) }}</el-descriptions-item>
            <el-descriptions-item label="仓库">{{ emptyText(detail.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="出库总数">{{ formatQuantity(detail.total_quantity) }}</el-descriptions-item>
            <el-descriptions-item label="出库总额">¥{{ formatMoney(detail.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="税金总额">¥{{ formatMoney(detail.tax_amount) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detail.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(detail.phone) }}</el-descriptions-item>
            <el-descriptions-item label="新增时间">{{ $formatDateTime(detail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ $formatDateTime(detail.updated_at) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ $formatDateTime(detail.completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="3">{{ emptyText(detail.address) }}</el-descriptions-item>
            <el-descriptions-item label="出库备注" :span="3">{{ emptyText(detail.outbound_remark || detail.remark) }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section-title">出库产品</div>
          <el-table :data="detail.items || []" border stripe>
            <el-table-column prop="product_name" label="产品名称" min-width="160" />
            <el-table-column prop="code" label="产品编码" width="130" />
            <el-table-column prop="spec" label="产品规格" width="130" />
            <el-table-column prop="unit_name" label="单位" width="90" />
            <el-table-column label="单位基准数" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column label="出库价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
            </el-table-column>
            <el-table-column label="出库数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
            </el-table-column>
            <el-table-column label="税金总额" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.tax) }}</template>
            </el-table-column>
            <el-table-column label="出库总额" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="warehouseDialogVisible" title="全部仓库出库数据" width="850px">
      <el-table border :data="warehouseSummaries" stripe max-height="520">
        <el-table-column prop="warehouse_name" label="仓库名称" min-width="180" />
        <el-table-column label="产品总数" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.product_total) }}</template>
        </el-table-column>
        <el-table-column label="出库总数" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.outbound_total) }}</template>
        </el-table-column>
        <el-table-column label="出库总额" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.outbound_amount) }}</template>
        </el-table-column>
        <el-table-column label="税金总额" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.tax_total) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, View } from '@element-plus/icons-vue'
import { getOtherOutboundReport, getOtherOutboundWarehouseSummary } from '@/api/report'
import { getOtherOutbound } from '@/api/inventory'
import { getSuppliers } from '@/api/supplier'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const warehouses = ref<any[]>([])
const warehouseSummaries = ref<any[]>([])
const warehouseOffset = ref(0)
const warehousePageSize = 4
const warehouseDialogVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<any | null>(null)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({
  keyword: '',
  dateRange: null as string[] | null,
  customer_id: null as number | null,
  warehouse_id: null as number | null
})

const visibleWarehouses = computed(() => (
  warehouseSummaries.value.slice(warehouseOffset.value, warehouseOffset.value + warehousePageSize)
))

function reportParams(includePagination = true) {
  const params: any = {
    keyword: searchForm.keyword,
    customer_id: searchForm.customer_id,
    warehouse_id: searchForm.warehouse_id
  }
  if (includePagination) {
    params.page = pagination.page
    params.pageSize = pagination.size
  }
  if (searchForm.dateRange?.length === 2) {
    params.start_date = searchForm.dateRange[0]
    params.end_date = searchForm.dateRange[1]
  }
  return params
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getOtherOutboundReport(reportParams())
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchWarehouseSummaries() {
  const res: any = await getOtherOutboundWarehouseSummary(reportParams(false))
  warehouseSummaries.value = res.data || []
  if (warehouseOffset.value >= warehouseSummaries.value.length) warehouseOffset.value = 0
}

async function handleSearch() {
  pagination.page = 1
  warehouseOffset.value = 0
  await Promise.all([fetchData(), fetchWarehouseSummaries()])
}

function handleReset() {
  Object.assign(searchForm, { keyword: '', dateRange: null, customer_id: null, warehouse_id: null })
  handleSearch()
}

function moveWarehouses(direction: number) {
  const next = warehouseOffset.value + direction
  const maxOffset = Math.max(0, warehouseSummaries.value.length - warehousePageSize)
  warehouseOffset.value = Math.min(Math.max(0, next), maxOffset)
}

async function handleDetail(row: any) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = { ...row, report_item_id: row.id, items: [] }
  try {
    const res: any = await getOtherOutbound(row.outbound_id)
    detail.value = {
      ...row,
      ...(res.data || {}),
      report_item_id: row.id,
      items: res.data?.items || []
    }
  } finally {
    detailLoading.value = false
  }
}

function normalizeImageUrls(value: any) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return [value]
    }
  }
  return []
}

function firstProductImage(row: any) {
  return normalizeImageUrls(row.product_image_urls)[0] || ''
}

function emptyText(value: any) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

onMounted(async () => {
  const [, , customerRes, warehouseRes]: any[] = await Promise.all([
    fetchData(),
    fetchWarehouseSummaries(),
    getSuppliers({ page: 1, pageSize: 1000, type: 'customer', status: 1 }),
    getWarehouses()
  ])
  customers.value = customerRes.data?.list || customerRes.data || []
  warehouses.value = warehouseRes.data?.list || warehouseRes.data || []
})
</script>

<style scoped>
.report-page {
  height: 100%;
}

.product-image {
  width: 50px;
  height: 50px;
  border-radius: 4px;
}

.warehouse-section {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-top: 20px;
}

.warehouse-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.warehouse-card,
.warehouse-empty {
  min-height: 112px;
  padding: 12px 10px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
}

.warehouse-title {
  overflow: hidden;
  margin-bottom: 8px;
  color: #303133;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warehouse-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 8px;
  color: #909399;
  font-size: 11px;
  line-height: 16px;
}

.warehouse-stat-grid span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carousel-arrow,
.warehouse-more {
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #606266;
  cursor: pointer;
}

.carousel-arrow {
  width: 34px;
}

.carousel-arrow:disabled {
  cursor: not-allowed;
  color: #c0c4cc;
}

.warehouse-more {
  width: 42px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.warehouse-more span {
  writing-mode: vertical-rl;
  letter-spacing: 2px;
}

.detail-content {
  min-height: 260px;
}

.detail-section-title {
  margin: 22px 0 12px;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .warehouse-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

