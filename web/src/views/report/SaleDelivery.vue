<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="日期范围"><el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="客户"><el-select v-model="searchForm.customer_id" placeholder="请选择" clearable><el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
      </SearchForm>
      <div class="toolbar"><el-button type="primary" @click="ElMessage.info('导出Excel')">导出Excel</el-button></div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="delivery_no" label="发货单号" width="190">
          <template #default="{ row }"><CopyableNo :value="row.delivery_no" /></template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户" min-width="150" />
        <el-table-column prop="product_name" label="产品" min-width="150" />
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="日期" width="120" />
      </el-table>
      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSaleDeliveryReport } from '@/api/report'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ dateRange: null as any, customer_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const p: any = { page: pagination.page, pageSize: pagination.size, customer_id: searchForm.customer_id }
    if (searchForm.dateRange) { p.start_date = searchForm.dateRange[0]; p.end_date = searchForm.dateRange[1] }
    const res: any = await getSaleDeliveryReport(p)
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { dateRange: null, customer_id: null }); handleSearch() }
onMounted(async () => { fetchData(); const r: any = await getSuppliers({ type: 'customer' }); customers.value = r.data || [] })
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
