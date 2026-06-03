<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增品牌</el-button>
      </div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="品牌名称" min-width="200" />
        <el-table-column prop="sort_order" label="排序" width="100" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
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
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/api/brand'

const loading = ref(false)
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增品牌')
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)
const form = reactive({ name: '', sort_order: 0 })
const rules = { name: [{ required: true, message: '请输入品牌名称', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try { const res: any = await getBrands(); tableData.value = res.data || [] } finally { loading.value = false }
}
function handleAdd() { editId.value = null; dialogTitle.value = '新增品牌'; resetForm(); dialogVisible.value = true }
function handleEdit(row: any) {
  editId.value = row.id; dialogTitle.value = '编辑品牌'
  Object.assign(form, { name: row.name, sort_order: row.sort_order || 0 })
  dialogVisible.value = true
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该品牌？', '提示', { type: 'warning' })
  await deleteBrand(row.id); ElMessage.success('删除成功'); fetchData()
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) { await updateBrand(editId.value, { ...form }) } else { await createBrand({ ...form }) }
  ElMessage.success(editId.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
}
function resetForm() { Object.assign(form, { name: '', sort_order: 0 }); formRef.value?.clearValidate() }

onMounted(fetchData)
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
