<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="退货单号"><el-input v-model="searchForm.return_no" placeholder="退货单号" clearable /></el-form-item>
        <el-form-item label="客户"><el-select v-model="searchForm.customer_id" placeholder="请选择" clearable><el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="return_no" label="退货单号" width="180" />
        <el-table-column prop="customer_name" label="客户" min-width="150" />
        <el-table-column prop="total_amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.total_amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="退货原因" min-width="150" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="row.status==='completed'?'success':'warning'" size="small">{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="120" />
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getSaleReturns } from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ return_no: '', customer_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getSaleReturns({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { return_no: '', customer_id: null }); handleSearch() }

onMounted(async () => {
  fetchData()
  const r: any = await getSuppliers({ type: 'customer' }); customers.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
