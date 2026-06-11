<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增分类</el-button>
      </div>
      <el-table :data="tableData" stripe row-key="id" v-loading="loading" default-expand-all>
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="sort_order" label="排序" width="100" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="上级分类">
          <el-tree-select v-model="form.parent_id" :data="categoryTree" :props="{ label: 'name', value: 'id' }" placeholder="请选择" clearable check-strictly style="width:100%" />
        </el-form-item>
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
import { getCategories, getCategoryTree, createCategory, updateCategory, deleteCategory } from '@/api/category'

const loading = ref(false)
const tableData = ref<any[]>([])
const categoryTree = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增分类')
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)
const form = reactive({ parent_id: null as any, name: '', sort_order: 0 })
const rules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getCategories()
    tableData.value = res.data || []
    const treeRes: any = await getCategoryTree()
    categoryTree.value = treeRes.data || []
  } finally { loading.value = false }
}

function handleAdd() { editId.value = null; dialogTitle.value = '新增分类'; resetForm(); dialogVisible.value = true }
function handleEdit(row: any) {
  editId.value = row.id; dialogTitle.value = '编辑分类'
  Object.assign(form, { parent_id: row.parent_id || null, name: row.name, sort_order: row.sort_order || 0 })
  dialogVisible.value = true
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该分类？', '提示', { type: 'warning' })
  await deleteCategory(row.id)
  ElMessage.success('删除成功')
  fetchData()
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) {
    await updateCategory(editId.value, { ...form })
  } else {
    await createCategory({ ...form })
  }
  ElMessage.success(editId.value ? '更新成功' : '创建成功')
  dialogVisible.value = false
  fetchData()
}
function resetForm() {
  Object.assign(form, { parent_id: null, name: '', sort_order: 0 })
  formRef.value?.clearValidate()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { height: 100%; }
.toolbar { margin-bottom: 16px; }
</style>
