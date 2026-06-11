<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="ElMessage.info('新增调拨单')">新增调拨单</el-button>
      </div>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="调拨单号"><el-input v-model="searchForm.transfer_no" placeholder="调拨单号" clearable /></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="transfer_no" label="调拨单号" width="190">
          <template #default="{ row }"><CopyableNo :value="row.transfer_no" /></template>
        </el-table-column>
        <el-table-column prop="from_warehouse_name" label="调出仓库" width="120" />
        <el-table-column prop="to_warehouse_name" label="调入仓库" width="120" />
        <el-table-column prop="total_amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.total_amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button v-if="Number(row.status) === 0" type="success" link @click="handleConfirm(row)">确认调拨</el-button>
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
import { getTransfers, confirmTransfer } from '@/api/inventory'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ transfer_no: '' })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getTransfers({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { transfer_no: '' }); handleSearch() }
async function handleConfirm(row: any) {
  await ElMessageBox.confirm('确认调拨？将自动执行跨仓库库存转移。', '提示', { type: 'warning' })
  await confirmTransfer(row.id); ElMessage.success('调拨确认成功'); fetchData()
}
function statusText(status: any) {
  return Number(status) === 1 ? '已完成' : '待确认'
}
function statusTagType(status: any) {
  return Number(status) === 1 ? 'success' : 'warning'
}

onMounted(fetchData)
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
