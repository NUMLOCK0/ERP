<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="ElMessage.info('新增付款单')">新增付款单</el-button>
      </div>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="付款单号"><el-input v-model="searchForm.payment_no" placeholder="付款单号" clearable /></el-form-item>
        <el-form-item label="供应商"><el-select v-model="searchForm.supplier_id" placeholder="请选择" clearable><el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="payment_no" label="付款单号" width="180" />
        <el-table-column prop="supplier_name" label="供应商" min-width="150" />
        <el-table-column prop="inbound_no" label="关联入库单" width="180" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="pay_method" label="付款方式" width="100" />
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
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getPayments } from '@/api/finance'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const suppliers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ payment_no: '', supplier_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getPayments({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { payment_no: '', supplier_id: null }); handleSearch() }

onMounted(async () => {
  fetchData()
  const r: any = await getSuppliers({ type: 'supplier' }); suppliers.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
