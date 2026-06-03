<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="ElMessage.info('新增其他入库单')">新增其他入库单</el-button>
      </div>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="入库单号"><el-input v-model="searchForm.inbound_no" placeholder="入库单号" clearable /></el-form-item>
        <el-form-item label="仓库"><el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable><el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" /></el-select></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="inbound_no" label="入库单号" width="180" />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="total_amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.total_amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" />
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
import { getOtherInbounds } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const warehouses = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ inbound_no: '', warehouse_id: null as any })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getOtherInbounds({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { inbound_no: '', warehouse_id: null }); handleSearch() }

onMounted(async () => {
  fetchData()
  const r: any = await getWarehouses(); warehouses.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
