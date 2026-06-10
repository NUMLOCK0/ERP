<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="日期范围"><el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="searchForm.status" placeholder="请选择" clearable><el-option label="草稿" value="draft" /><el-option label="待审核" value="pending" /><el-option label="已审核" value="audited" /><el-option label="已完成" value="completed" /><el-option label="已取消" value="cancelled" /></el-select></el-form-item>
      </SearchForm>
      <div class="toolbar"><el-button type="primary" @click="ElMessage.info('导出Excel')">导出Excel</el-button></div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="order_no" label="订单号" width="190">
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="150" />
        <el-table-column prop="total_amount" label="金额" width="120"><template #default="{ row }">¥{{ row.total_amount?.toLocaleString() }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag size="small">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="created_at" label="日期" width="120" />
      </el-table>
      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPurchaseOrderReport } from '@/api/report'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0)
const pagination = reactive({ page: 1, size: 20 }); const searchForm = reactive({ dateRange: null as any, status: '' })

async function fetchData() {
  loading.value = true
  try {
    const p: any = { page: pagination.page, pageSize: pagination.size, status: searchForm.status }
    if (searchForm.dateRange) { p.start_date = searchForm.dateRange[0]; p.end_date = searchForm.dateRange[1] }
    const res: any = await getPurchaseOrderReport(p)
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { dateRange: null, status: '' }); handleSearch() }
onMounted(fetchData)
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
