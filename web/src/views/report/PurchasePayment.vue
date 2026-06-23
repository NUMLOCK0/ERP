<template>
  <div class="report-page">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="采购单号/付款单号/供应商" clearable />
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
        <el-form-item label="供应商">
          <el-select v-model="searchForm.supplier_id" placeholder="请选择" clearable filterable>
            <el-option v-for="supplier in suppliers" :key="supplier.id" :label="supplier.name" :value="supplier.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable>
            <el-option v-for="warehouse in warehouses" :key="warehouse.id" :label="warehouse.name" :value="warehouse.id" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <TableColumnTools table-key="report-purchase-payment" filename="采购付款报表" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="数据ID" width="90" />
        <el-table-column prop="order_no" label="采购单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.supplier_name) }}</template>
        </el-table-column>
        <el-table-column prop="pay_method" label="付款方式" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.pay_method) }}</template>
        </el-table-column>
        <el-table-column label="付款金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.payment_amount) }}</template>
        </el-table-column>
        <el-table-column prop="payer" label="付款人" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.payer) }}</template>
        </el-table-column>
        <el-table-column label="付款时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.payment_time) }}</template>
        </el-table-column>
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
            <div class="warehouse-title">{{ warehouse.warehouse_name }}</div>
            <div class="warehouse-stat-grid">
              <span>应付总额 ¥{{ formatMoney(warehouse.payable_total) }}</span>
              <span>未付总额 ¥{{ formatMoney(warehouse.unpaid_total) }}</span>
              <span>已付总额 ¥{{ formatMoney(warehouse.paid_total) }}</span>
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

    <el-drawer v-model="detailVisible" title="采购付款详情" size="68%">
      <div v-loading="detailLoading" class="detail-content">
        <template v-if="detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数据ID">{{ detail.id }}</el-descriptions-item>
            <el-descriptions-item label="付款单号"><CopyableNo :value="detail.payment_no" /></el-descriptions-item>
            <el-descriptions-item label="采购单号"><CopyableNo :value="detail.order_no" /></el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(detail.supplier_name) }}</el-descriptions-item>
            <el-descriptions-item label="仓库">{{ emptyText(detail.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="付款方式">{{ emptyText(detail.payment_method || detail.pay_method) }}</el-descriptions-item>
            <el-descriptions-item label="应付金额">¥{{ formatMoney(detail.receivable_total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="已付金额">¥{{ formatMoney(detail.paid_total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="未付金额">¥{{ formatMoney(detail.unpaid_total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="最近付款人">{{ emptyText(detail.payer) }}</el-descriptions-item>
            <el-descriptions-item label="最近付款时间">{{ $formatDateTime(detail.payment_time) }}</el-descriptions-item>
            <el-descriptions-item label="新增时间">{{ $formatDateTime(detail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ $formatDateTime(detail.updated_at) }}</el-descriptions-item>
            <el-descriptions-item label="付款开始时间">{{ $formatDateTime(detail.payment_start_time) }}</el-descriptions-item>
            <el-descriptions-item label="付款完成时间">{{ $formatDateTime(detail.payment_completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="关闭时间">{{ $formatDateTime(detail.close_time) }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ emptyText(detail.detail_remark || detail.remark) }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section-title">付款记录</div>
          <el-table :data="detail.payment_records || []" border stripe>
            <el-table-column prop="id" label="记录ID" width="90" />
            <el-table-column label="付款金额" width="130" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="payer" label="付款人" width="120">
              <template #default="{ row }">{{ emptyText(row.payer) }}</template>
            </el-table-column>
            <el-table-column prop="pay_method" label="付款方式" width="120">
              <template #default="{ row }">{{ emptyText(row.pay_method) }}</template>
            </el-table-column>
            <el-table-column label="付款时间" width="180">
              <template #default="{ row }">{{ $formatDateTime(row.pay_time) }}</template>
            </el-table-column>
            <el-table-column prop="creator_name" label="操作人" width="120">
              <template #default="{ row }">{{ emptyText(row.creator_name) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ emptyText(row.remark) }}</template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="warehouseDialogVisible" title="全部仓库采购付款数据" width="760px">
      <el-table border :data="warehouseSummaries" stripe max-height="520">
        <el-table-column prop="warehouse_name" label="仓库名称" min-width="180" />
        <el-table-column label="应付总额" width="160" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.payable_total) }}</template>
        </el-table-column>
        <el-table-column label="未付总额" width="160" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.unpaid_total) }}</template>
        </el-table-column>
        <el-table-column label="已付总额" width="160" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.paid_total) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, View } from '@element-plus/icons-vue'
import { getPurchasePaymentReport, getPurchasePaymentWarehouseSummary } from '@/api/report'
import { getPayment } from '@/api/finance'
import { getSuppliers } from '@/api/supplier'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
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
  supplier_id: null as number | null,
  warehouse_id: null as number | null
})

const visibleWarehouses = computed(() => (
  warehouseSummaries.value.slice(warehouseOffset.value, warehouseOffset.value + warehousePageSize)
))

function reportParams(includePagination = true) {
  const params: any = {
    keyword: searchForm.keyword,
    supplier_id: searchForm.supplier_id,
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
    const res: any = await getPurchasePaymentReport(reportParams())
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchWarehouseSummaries() {
  const res: any = await getPurchasePaymentWarehouseSummary(reportParams(false))
  warehouseSummaries.value = res.data || []
  if (warehouseOffset.value >= warehouseSummaries.value.length) warehouseOffset.value = 0
}

async function handleSearch() {
  pagination.page = 1
  warehouseOffset.value = 0
  await Promise.all([fetchData(), fetchWarehouseSummaries()])
}

function handleReset() {
  Object.assign(searchForm, { keyword: '', dateRange: null, supplier_id: null, warehouse_id: null })
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
  detail.value = { ...row, payment_records: [] }
  try {
    const res: any = await getPayment(row.id)
    detail.value = {
      ...row,
      ...(res.data || {}),
      payment_records: res.data?.payment_records || []
    }
  } finally {
    detailLoading.value = false
  }
}

function emptyText(value: any) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

onMounted(async () => {
  const [, , supplierRes, warehouseRes]: any[] = await Promise.all([
    fetchData(),
    fetchWarehouseSummaries(),
    getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
    getWarehouses()
  ])
  suppliers.value = supplierRes.data?.list || supplierRes.data || []
  warehouses.value = warehouseRes.data?.list || warehouseRes.data || []
})
</script>

<style scoped>
.report-page {
  height: 100%;
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
  min-height: 108px;
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
  min-height: 240px;
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

