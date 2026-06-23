<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar"><el-button type="primary" :icon="Plus" @click="handleAdd">新增分类</el-button></div>

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSubmit">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getSupplierCategories, createSupplierCategory, updateSupplierCategory, deleteSupplierCategory } from '@/api/supplier'

const loading = ref(false); const tableData = ref<any[]>([]);
const dialogVisible = ref(false); const dialogTitle = ref('新增'); const formRef = ref<FormInstance>()
const form = reactive({ id: null as any, name: '', description: '' })
const rules = { name: [{ required: true, message: '请输入名称', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try { const res: any = await getSupplierCategories(); tableData.value = res.data || [] } catch {} finally { loading.value = false }
}
function handleAdd() { dialogTitle.value = '新增'; Object.assign(form, { id: null, name: '', description: '' }); dialogVisible.value = true }
function handleEdit(row: any) { dialogTitle.value = '编辑'; Object.assign(form, row); dialogVisible.value = true }
async function handleDelete(row: any) { await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }); await deleteSupplierCategory(row.id); ElMessage.success('已删除'); fetchData() }
async function handleSubmit() {
  const valid = await formRef.value!.validate().catch(() => false); if (!valid) return
  if (form.id) { await updateSupplierCategory(form.id, form) } else { await createSupplierCategory(form) }
  ElMessage.success('保存成功'); dialogVisible.value = false; fetchData()
}
onMounted(fetchData)
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
