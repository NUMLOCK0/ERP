<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="日期范围"><el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="产品名称"><el-input v-model="searchForm.product_name" placeholder="产品名称" clearable /></el-form-item>
        <el-form-item label="仓库"><el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable><el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" /></el-select></el-form-item>
      </SearchForm>
      <div class="toolbar"><el-button type="primary" @click="ElMessage.info('导出Excel')">导出Excel</el-button></div>

      <TableColumnTools table-key="report-product-stock" filename="商品库存报表" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="product_name" label="产品名称" min-width="150" />
        <el-table-column prop="product_code" label="产品编码" width="120" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column prop="quantity" label="库存数量" width="110" />
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.updated_at) }}</template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProductStockReport } from '@/api/report'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const warehouses = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ dateRange: null as any, product_name: '', warehouse_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.size, product_name: searchForm.product_name, warehouse_id: searchForm.warehouse_id }
    if (searchForm.dateRange) { params.start_date = searchForm.dateRange[0]; params.end_date = searchForm.dateRange[1] }
    const res: any = await getProductStockReport(params)
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { dateRange: null, product_name: '', warehouse_id: null }); handleSearch() }

onMounted(async () => {
  fetchData()
  const r: any = await getWarehouses(); warehouses.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>

