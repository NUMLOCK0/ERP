<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar"><el-button type="primary" :icon="Plus" @click="handleAdd">新增模板</el-button></div>
      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="模板名称" min-width="180" />
        <el-table-column label="类型" width="120"><template #default="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template></el-table-column>
        <el-table-column label="默认" width="80"><template #default="{ row }"><el-tag v-if="row.is_default" type="success" size="small">默认</el-tag></template></el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" link @click="handleSetDefault(row)">设为默认</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型" prop="type"><el-select v-model="form.type"><el-option label="采购订单" value="purchase_order" /><el-option label="采购入库" value="purchase_inbound" /><el-option label="销售订单" value="sale_order" /><el-option label="销售发货" value="sale_delivery" /></el-select></el-form-item>
        <el-form-item label="内容" prop="content"><el-input v-model="form.content" type="textarea" :rows="12" placeholder="HTML模板内容" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSubmit">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getPrintTemplates, createPrintTemplate, updatePrintTemplate, deletePrintTemplate, setDefaultTemplate } from '@/api/system'

const loading = ref(false); const tableData = ref<any[]>([])
const dialogVisible = ref(false); const dialogTitle = ref('新增'); const formRef = ref<FormInstance>()
const form = reactive({ id: null as any, name: '', type: 'purchase_order', content: '' })
const rules = { name: [{ required: true, message: '请输入名称', trigger: 'blur' }], type: [{ required: true, message: '请选择类型', trigger: 'change' }] }

async function fetchData() { loading.value = true; try { const res: any = await getPrintTemplates(); tableData.value = res.data || [] } finally { loading.value = false } }
function handleAdd() { dialogTitle.value = '新增'; Object.assign(form, { id: null, name: '', type: 'purchase_order', content: '' }); dialogVisible.value = true }
function handleEdit(row: any) { dialogTitle.value = '编辑'; Object.assign(form, row); dialogVisible.value = true }
async function handleDelete(row: any) { await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }); await deletePrintTemplate(row.id); ElMessage.success('已删除'); fetchData() }
async function handleSetDefault(row: any) { await setDefaultTemplate(row.id); ElMessage.success('已设为默认'); fetchData() }
async function handleSubmit() {
  const valid = await formRef.value!.validate().catch(() => false); if (!valid) return
  if (form.id) { await updatePrintTemplate(form.id, form) } else { await createPrintTemplate(form) }
  ElMessage.success('保存成功'); dialogVisible.value = false; fetchData()
}
onMounted(fetchData)
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
