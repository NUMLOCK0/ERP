<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="企业名称"><el-input v-model="searchForm.name" placeholder="企业名称" clearable /></el-form-item>
        <el-form-item label="类型"><el-select v-model="searchForm.type" placeholder="请选择" clearable><el-option label="供应商" value="supplier" /><el-option label="客户" value="customer" /><el-option label="双重" value="both" /></el-select></el-form-item>
      </SearchForm>
      <div class="toolbar"><el-button type="primary" :icon="Plus" @click="handleAdd">新增企业</el-button></div>

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="企业名称" min-width="180" />
        <el-table-column label="类型" width="80"><template #default="{ row }"><el-tag size="small">{{ row.type==='supplier'?'供应商':row.type==='customer'?'客户':'双重' }}</el-tag></template></el-table-column>
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="160" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'启用':'禁用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-dropdown trigger="hover">
              <el-button type="primary" link>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(row)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="企业名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型" prop="type"><el-select v-model="form.type"><el-option label="供应商" value="supplier" /><el-option label="客户" value="customer" /><el-option label="双重" value="both" /></el-select></el-form-item>
        <el-form-item label="联系人" prop="contact"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="电话" prop="phone"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="开户行"><el-input v-model="form.bank_name" /></el-form-item>
        <el-form-item label="银行账号"><el-input v-model="form.bank_account" /></el-form-item>
        <el-form-item label="税号"><el-input v-model="form.tax_no" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSubmit">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0)
const pagination = reactive({ page: 1, size: 20 }); const searchForm = reactive({ name: '', type: '' })
const dialogVisible = ref(false); const dialogTitle = ref('新增'); const formRef = ref<FormInstance>()
const form = reactive({ id: null as any, name: '', type: 'supplier', contact: '', phone: '', email: '', address: '', bank_name: '', bank_account: '', tax_no: '', status: 1 })
const rules = { name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }], type: [{ required: true, message: '请选择类型', trigger: 'change' }] }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getSuppliers({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []; total.value = res.data?.total || 0
  } finally { loading.value = false }
}
function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { name: '', type: '' }); handleSearch() }
function handleAdd() { dialogTitle.value = '新增'; Object.assign(form, { id: null, name: '', type: 'supplier', contact: '', phone: '', email: '', address: '', bank_name: '', bank_account: '', tax_no: '', status: 1 }); dialogVisible.value = true }
function handleEdit(row: any) { dialogTitle.value = '编辑'; Object.assign(form, row); dialogVisible.value = true }
async function handleDelete(row: any) { await ElMessageBox.confirm('确认删除该企业？', '提示', { type: 'warning' }); await deleteSupplier(row.id); ElMessage.success('删除成功'); fetchData() }
async function handleSubmit() {
  const valid = await formRef.value!.validate().catch(() => false)
  if (!valid) return
  if (form.id) { await updateSupplier(form.id, form) } else { await createSupplier(form) }
  ElMessage.success('保存成功'); dialogVisible.value = false; fetchData()
}
onMounted(fetchData)
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
