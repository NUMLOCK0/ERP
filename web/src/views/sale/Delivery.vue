<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="发货单号"><el-input v-model="searchForm.delivery_no" placeholder="发货单号" clearable /></el-form-item>
        <el-form-item label="客户"><el-select v-model="searchForm.customer_id" placeholder="请选择" clearable><el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="delivery_no" label="发货单号" width="180" />
        <el-table-column prop="order_no" label="销售订单" width="180" />
        <el-table-column prop="customer_name" label="客户" min-width="150" />
        <el-table-column prop="total_amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.total_amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="logistics_company" label="物流公司" width="120" />
        <el-table-column prop="logistics_no" label="物流单号" width="150" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="isShipped(row.status)?'success':'warning'" size="small">{{ isShipped(row.status)?'已发货':'待发货' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="120" />
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getSaleDeliveries } from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ delivery_no: '', customer_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getSaleDeliveries({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { delivery_no: '', customer_id: null }); handleSearch() }
function isShipped(status: any) { return status === 'completed' || Number(status) === 1 }

onMounted(async () => {
  fetchData()
  const r: any = await getSuppliers({ type: 'customer' }); customers.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
