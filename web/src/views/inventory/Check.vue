<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="router.push('/inventory/check/add')">新增</el-button>
      </div>

      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="盘点单号/盘点人员" clearable />
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable filterable>
            <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="盘点状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待盘点" :value="0" />
            <el-option label="已完成" :value="1" />
            <el-option label="已取消" :value="2" />
            <el-option label="已关闭" :value="3" />
            <el-option label="审核中" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
      </SearchForm>

      <TableColumnTools table-key="inventory-check" filename="库存盘点单" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="盘点id" width="90" />
        <el-table-column prop="check_no" label="盘点单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.check_no" /></template>
        </el-table-column>
        <el-table-column label="盘点状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="warehouse_name" label="仓库" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.warehouse_name) }}</template>
        </el-table-column>
        <el-table-column label="产品总数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.product_total_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="checker_name" label="盘点人员" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.checker_name || row.creator_name) }}</template>
        </el-table-column>
        <el-table-column label="盘点时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.check_time || row.checked_at) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.remark) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.completed_time) }}</template>
        </el-table-column>
        <el-table-column label="审核时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.audit_time) }}</template>
        </el-table-column>
        <el-table-column label="提审时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.submit_time) }}</template>
        </el-table-column>
        <el-table-column label="取消时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.cancel_time) }}</template>
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
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-dropdown v-if="[0, 4].includes(Number(row.status))" trigger="hover">
              <el-button type="primary" link>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleConfirm(row)">确认盘点</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <span v-else>-</span>
          </template>
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
import TableColumnTools from '@/components/TableColumnTools.vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { confirmCheck, getChecks } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import Pagination from '@/components/Pagination.vue'
import SearchForm from '@/components/SearchForm.vue'

const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const warehouses = ref<any[]>([])
const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({
  keyword: '',
  warehouse_id: null as number | null,
  status: null as number | null,
  dateRange: null as string[] | null
})

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      warehouse_id: searchForm.warehouse_id,
      status: searchForm.status ?? ''
    }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getChecks(params)
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
    warehouse_id: null,
    status: null,
    dateRange: null
  })
  handleSearch()
}

async function handleConfirm(row: any) {
  await ElMessageBox.confirm('确认盘点结果？系统将按盘点差异调整库存。', '提示', { type: 'warning' })
  await confirmCheck(row.id)
  ElMessage.success('盘点确认成功')
  fetchData()
}

function statusText(status: any) {
  const map: Record<number, string> = {
    0: '待盘点',
    1: '已完成',
    2: '已取消',
    3: '已关闭',
    4: '审核中'
  }
  return map[Number(status)] || '未知'
}

function statusTagType(status: any) {
  const map: Record<number, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
    0: 'warning',
    1: 'success',
    2: 'danger',
    3: 'info',
    4: 'primary'
  }
  return map[Number(status)] || 'info'
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

.toolbar {
  margin-bottom: 16px;
}
</style>

