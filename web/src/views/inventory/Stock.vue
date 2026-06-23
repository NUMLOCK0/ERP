<template>
  <div class="stock-page">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="产品">
          <el-input v-model="searchForm.keyword" placeholder="产品名称/编码" clearable />
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable>
            <el-option v-for="warehouse in warehouses" :key="warehouse.id" :label="warehouse.name" :value="warehouse.id" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <TableColumnTools table-key="inventory-stock" filename="库存列表" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="数据id" width="90" />
        <el-table-column prop="product_id" label="产品id" width="90" />
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
        <el-table-column label="库存" width="110" align="right">
          <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
        </el-table-column>
        <el-table-column label="单位" width="90">
          <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
        </el-table-column>
        <el-table-column label="单位基准数" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="warehouse_name" label="仓库" min-width="130" />
        <el-table-column label="新增时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleDetail(row)">查看详情</el-button>
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
            <div class="warehouse-title">{{ warehouse.title }}</div>
            <div class="warehouse-stat-row">
              <span>产品总数 {{ formatQuantity(warehouse.product_total) }}</span>
              <span>库存总数 {{ formatQuantity(warehouse.stock_total) }}</span>
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

    <el-drawer v-model="detailVisible" title="产品详情" size="620px">
      <div v-loading="detailLoading" class="detail-content">
        <template v-if="detailData">
          <div class="detail-head">
            <el-image
              v-if="detailImages.length"
              class="detail-main-image"
              :src="detailImages[0]"
              :preview-src-list="detailImages"
              fit="cover"
              preview-teleported
            />
            <div v-else class="detail-image-empty">暂无主图</div>
            <div>
              <h3>{{ detailData.name || detailData.product_name }}</h3>
              <p>{{ emptyText(detailData.code || detailData.product_code) }}</p>
            </div>
          </div>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="产品ID">{{ detailData.product_id || detailData.id }}</el-descriptions-item>
            <el-descriptions-item label="库存数据ID">{{ detailData.stock_id }}</el-descriptions-item>
            <el-descriptions-item label="产品名称">{{ detailData.name || detailData.product_name }}</el-descriptions-item>
            <el-descriptions-item label="产品规格">{{ emptyText(detailData.spec || detailData.product_spec) }}</el-descriptions-item>
            <el-descriptions-item label="当前库存">{{ formatQuantity(detailData.quantity) }}</el-descriptions-item>
            <el-descriptions-item label="仓库">{{ emptyText(detailData.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="计量单位">{{ emptyText(detailData.unit_name) }}</el-descriptions-item>
            <el-descriptions-item label="单位基准数">{{ formatQuantity(detailData.base_quantity) }}</el-descriptions-item>
            <el-descriptions-item label="成本价">{{ formatMoney(detailData.cost_price) }}</el-descriptions-item>
            <el-descriptions-item label="零售价">{{ formatMoney(detailData.sale_price) }}</el-descriptions-item>
            <el-descriptions-item label="产品简介" :span="2">{{ emptyText(detailData.description || detailData.product_description) }}</el-descriptions-item>
            <el-descriptions-item label="新增时间">{{ $formatDateTime(detailData.stock_created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ $formatDateTime(detailData.stock_updated_at) }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section-title">规格/计量单位</div>
          <el-table :data="detailData.units || []" border size="small">
            <el-table-column prop="unit_name" label="单位" min-width="100" />
            <el-table-column label="基准数" width="100">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column prop="spec" label="规格" min-width="120" />
            <el-table-column prop="code" label="编码" min-width="130" />
          </el-table>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="warehouseDialogVisible" title="全部仓库数据" width="760px">
      <el-table border :data="warehouseSummaries" stripe max-height="520">
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column label="产品总数" width="160" align="right">
          <template #default="{ row }">{{ formatQuantity(row.product_total) }}</template>
        </el-table-column>
        <el-table-column label="库存总数" width="160" align="right">
          <template #default="{ row }">{{ formatQuantity(row.stock_total) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, View } from '@element-plus/icons-vue'
import { getProduct } from '@/api/product'
import { getStocks, getStockWarehouseSummary } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const warehouses = ref<any[]>([])
const warehouseSummaries = ref<any[]>([])
const warehouseOffset = ref(0)
const warehousePageSize = 4
const warehouseDialogVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any | null>(null)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', warehouse_id: null as number | null })

const visibleWarehouses = computed(() => (
  warehouseSummaries.value.slice(warehouseOffset.value, warehouseOffset.value + warehousePageSize)
))
const detailImages = computed(() => normalizeImageUrls(detailData.value?.image_urls).map(assetUrl))

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getStocks({
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      warehouse_id: searchForm.warehouse_id
    })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchWarehouseSummaries() {
  const res: any = await getStockWarehouseSummary()
  warehouseSummaries.value = res.data || []
  if (warehouseOffset.value >= warehouseSummaries.value.length) warehouseOffset.value = 0
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  Object.assign(searchForm, { keyword: '', warehouse_id: null })
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
  detailData.value = {
    ...row,
    stock_id: row.id,
    stock_created_at: row.created_at,
    stock_updated_at: row.updated_at,
    image_urls: row.product_image_urls,
    units: []
  }
  try {
    const res: any = await getProduct(row.product_id)
    detailData.value = {
      ...row,
      ...(res.data || {}),
      stock_id: row.id,
      product_id: row.product_id,
      quantity: row.quantity,
      warehouse_name: row.warehouse_name,
      unit_name: row.unit_name,
      base_quantity: row.base_quantity,
      stock_created_at: row.created_at,
      stock_updated_at: row.updated_at,
      image_urls: res.data?.image_urls || row.product_image_urls,
      units: res.data?.units || []
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
  return assetUrl(normalizeImageUrls(row.product_image_urls)[0] || '')
}

function assetUrl(url: string) {
  return url || ''
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
  const [, warehouseRes]: any[] = await Promise.all([
    fetchData(),
    getWarehouses()
  ])
  warehouses.value = warehouseRes.data || []
  await fetchWarehouseSummaries()
})
</script>

<style scoped>
.stock-page {
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
  min-height: 82px;
  padding: 14px 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
}

.warehouse-title {
  margin-bottom: 12px;
  color: #303133;
  font-size: 15px;
}

.warehouse-stat-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #909399;
  font-size: 13px;
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
  min-height: 240px;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 20px;
}

.detail-head h3 {
  margin: 0 0 8px;
}

.detail-head p {
  margin: 0;
  color: #909399;
}

.detail-main-image,
.detail-image-empty {
  width: 96px;
  height: 96px;
  border-radius: 6px;
}

.detail-image-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
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

