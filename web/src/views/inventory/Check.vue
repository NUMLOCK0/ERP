<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="ElMessage.info('新增盘点单')">新增盘点单</el-button>
      </div>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="盘点单号"><el-input v-model="searchForm.check_no" placeholder="盘点单号" clearable /></el-form-item>
        <el-form-item label="仓库"><el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable><el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" /></el-select></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="check_no" label="盘点单号" width="180" />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="checked_at" label="盘点时间" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="120" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button v-if="Number(row.status) === 0" type="success" link @click="handleConfirm(row)">确认盘点</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getChecks, confirmCheck } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const warehouses = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ check_no: '', warehouse_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getChecks({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { check_no: '', warehouse_id: null }); handleSearch() }
async function handleConfirm(row: any) {
  await ElMessageBox.confirm('确认盘点结果？系统将自动调整库存差异。', '提示', { type: 'warning' })
  await confirmCheck(row.id); ElMessage.success('盘点确认成功'); fetchData()
}
function statusText(status: any) {
  return Number(status) === 1 ? '已确认' : '待确认'
}
function statusTagType(status: any) {
  return Number(status) === 1 ? 'success' : 'warning'
}

onMounted(async () => {
  fetchData()
  const r: any = await getWarehouses(); warehouses.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
