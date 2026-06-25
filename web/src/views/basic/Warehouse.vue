<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增仓库</el-button>
      </div>
      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="仓库名称" min-width="150" />
        <el-table-column prop="address" label="地址" min-width="200" />
        <el-table-column prop="manager" label="负责人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'启用':'禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="100">
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
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="负责人"><el-input v-model="form.manager" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="启用" :value="1" /><el-option label="禁用" :value="0" /></el-select></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/api/warehouse'

const loading = ref(false)
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增仓库')
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)
const form = reactive({ name: '', address: '', manager: '', phone: '', status: 1 })
const rules = { name: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try { const res: any = await getWarehouses(); tableData.value = res.data || [] } finally { loading.value = false }
}
function handleAdd() { editId.value = null; dialogTitle.value = '新增仓库'; resetForm(); dialogVisible.value = true }
function handleEdit(row: any) {
  editId.value = row.id; dialogTitle.value = '编辑仓库'
  Object.assign(form, { name: row.name, address: row.address||'', manager: row.manager||'', phone: row.phone||'', status: row.status })
  dialogVisible.value = true
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该仓库？', '提示', { type: 'warning' })
  await deleteWarehouse(row.id); ElMessage.success('删除成功'); fetchData()
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) { await updateWarehouse(editId.value, { ...form }) } else { await createWarehouse({ ...form }) }
  ElMessage.success(editId.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
}
function resetForm() { Object.assign(form, { name: '', address: '', manager: '', phone: '', status: 1 }); formRef.value?.clearValidate() }

onMounted(fetchData)
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
