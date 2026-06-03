<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="订单号"><el-input v-model="searchForm.order_no" placeholder="订单号" clearable /></el-form-item>
        <el-form-item label="客户"><el-select v-model="searchForm.customer_id" placeholder="请选择" clearable><el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
        <el-form-item label="状态"><el-select v-model="searchForm.status" placeholder="请选择" clearable><el-option label="草稿" value="draft" /><el-option label="待审核" value="pending" /><el-option label="已审核" value="audited" /><el-option label="已发货" value="delivered" /><el-option label="已完成" value="completed" /><el-option label="已取消" value="cancelled" /></el-select></el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增销售订单</el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="customer_name" label="客户" min-width="150" />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column prop="total_amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.total_amount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="sMap[row.status]||'info'" size="small">{{ sText[row.status] || row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="120" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button v-if="row.status==='draft'" type="warning" link @click="handleSubmit(row)">提审</el-button>
            <el-button v-if="row.status==='pending'" type="success" link @click="handleAudit(row)">审核</el-button>
            <el-button v-if="row.status==='draft'" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="['draft','pending'].includes(row.status)" type="danger" link @click="handleCancel(row)">取消</el-button>
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
import { getSaleOrders, submitSaleOrder, auditSaleOrder, cancelSaleOrder } from '@/api/sale'
import { getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ order_no: '', customer_id: null as any, status: '' })
const sText: Record<string, string> = { draft:'草稿', pending:'待审核', audited:'已审核', delivered:'已发货', completed:'已完成', cancelled:'已取消' }
const sMap: Record<string, string> = { draft:'info', pending:'warning', audited:'', delivered:'success', completed:'success', cancelled:'danger' }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getSaleOrders({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { order_no: '', customer_id: null, status: '' }); handleSearch() }
function handleAdd() { ElMessage.info('新增销售订单页面') }
function handleView(row: any) { ElMessage.info(`查看 ${row.order_no}`) }
function handleEdit(row: any) { ElMessage.info(`编辑 ${row.order_no}`) }
async function handleSubmit(row: any) { await ElMessageBox.confirm('确认提交审核？', '提示', { type: 'warning' }); await submitSaleOrder(row.id); ElMessage.success('已提交'); fetchData() }
async function handleAudit(row: any) { await ElMessageBox.confirm('确认审核通过？', '提示', { type: 'warning' }); await auditSaleOrder(row.id); ElMessage.success('审核通过'); fetchData() }
async function handleCancel(row: any) { await ElMessageBox.confirm('确认取消？', '提示', { type: 'warning' }); await cancelSaleOrder(row.id); ElMessage.success('已取消'); fetchData() }

onMounted(async () => {
  fetchData()
  const r: any = await getSuppliers({ type: 'customer' }); customers.value = r.data || []
})
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
