<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增单位</el-button>
      </div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="单位名称" min-width="200" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
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
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getUnits, createUnit, updateUnit, deleteUnit } from '@/api/unit'

const loading = ref(false)
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增单位')
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)
const form = reactive({ name: '' })
const rules = { name: [{ required: true, message: '请输入单位名称', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try { const res: any = await getUnits(); tableData.value = res.data || [] } finally { loading.value = false }
}
function handleAdd() { editId.value = null; dialogTitle.value = '新增单位'; resetForm(); dialogVisible.value = true }
function handleEdit(row: any) { editId.value = row.id; dialogTitle.value = '编辑单位'; form.name = row.name; dialogVisible.value = true }
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' })
  await deleteUnit(row.id); ElMessage.success('删除成功'); fetchData()
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) { await updateUnit(editId.value, { ...form }) } else { await createUnit({ ...form }) }
  ElMessage.success(editId.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
}
function resetForm() { form.name = ''; formRef.value?.clearValidate() }

onMounted(fetchData)
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
