<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="操作人"><el-input v-model="searchForm.username" placeholder="操作人" clearable /></el-form-item>
        <el-form-item label="模块"><el-input v-model="searchForm.module" placeholder="模块" clearable /></el-form-item>
        <el-form-item label="日期范围"><el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" /></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="username" label="操作人" width="100" />
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="action" label="操作" width="80" />
        <el-table-column prop="target" label="目标" width="150" />
        <el-table-column prop="content" label="内容" min-width="180" />
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getOperationLogs } from '@/api/system'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ username: '', module: '', dateRange: null as any })

async function fetchData() {
  loading.value = true
  try {
    const p: any = { page: pagination.page, pageSize: pagination.size, username: searchForm.username, module: searchForm.module }
    if (searchForm.dateRange) { p.start_date = searchForm.dateRange[0]; p.end_date = searchForm.dateRange[1] }
    const res: any = await getOperationLogs(p)
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { username: '', module: '', dateRange: null }); handleSearch() }
onMounted(fetchData)
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
