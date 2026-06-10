<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="产品"><el-input v-model="searchForm.product_name" placeholder="产品名称" clearable /></el-form-item>
        <el-form-item label="变动类型"><el-select v-model="searchForm.change_type" placeholder="请选择" clearable><el-option label="采购入库" value="purchase_inbound" /><el-option label="销售出库" value="sale_delivery" /><el-option label="盘点调整" value="check" /><el-option label="调拨出库" value="transfer_out" /><el-option label="调拨入库" value="transfer_in" /><el-option label="其他入库" value="other_inbound" /><el-option label="其他出库" value="other_outbound" /></el-select></el-form-item>
      </SearchForm>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="product_name" label="产品" min-width="120" />
        <el-table-column prop="warehouse_name" label="仓库" width="100" />
        <el-table-column prop="change_type" label="变动类型" width="100" />
        <el-table-column prop="change_quantity" label="变动数量" width="100" />
        <el-table-column prop="before_quantity" label="变动前" width="80" />
        <el-table-column prop="after_quantity" label="变动后" width="80" />
        <el-table-column prop="ref_no" label="关联单据" width="190">
          <template #default="{ row }"><CopyableNo :value="row.ref_no" /></template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" />
        <el-table-column prop="created_at" label="时间" width="160" />
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getInventoryLogs } from '@/api/inventory'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ product_name: '', change_type: '' })

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getInventoryLogs({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { product_name: '', change_type: '' }); handleSearch() }

onMounted(fetchData)
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
