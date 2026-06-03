<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="产品编码"><el-input v-model="searchForm.code" placeholder="编码" clearable /></el-form-item>
        <el-form-item label="产品条码"><el-input v-model="searchForm.barcode" placeholder="条码" clearable /></el-form-item>
        <el-form-item label="产品名称"><el-input v-model="searchForm.name" placeholder="名称" clearable /></el-form-item>
        <el-form-item label="分类"><el-select v-model="searchForm.category_id" placeholder="请选择" clearable><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
        <el-form-item label="品牌"><el-select v-model="searchForm.brand_id" placeholder="请选择" clearable><el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" /></el-select></el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
        <el-button :icon="Upload" @click="handleImport">导入</el-button>
        <el-button :icon="Download" @click="handleExport">导出</el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading" style="width:100%">
        <el-table-column prop="code" label="产品编码" width="120" />
        <el-table-column prop="barcode" label="条码" width="120" />
        <el-table-column prop="name" label="产品名称" min-width="150" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="brand_name" label="品牌" width="100" />
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit_name" label="单位" width="70" />
        <el-table-column prop="cost_price" label="成本价" width="90" />
        <el-table-column prop="sale_price" label="销售价" width="90" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'启用':'禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="产品编码" prop="code"><el-input v-model="form.code" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="条码"><el-input v-model="form.barcode" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="产品名称" prop="name"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="规格"><el-input v-model="form.spec" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="分类"><el-select v-model="form.category_id" placeholder="请选择" style="width:100%"><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="品牌"><el-select v-model="form.brand_id" placeholder="请选择" style="width:100%"><el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单位"><el-select v-model="form.unit_id" placeholder="请选择" style="width:100%"><el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="启用" :value="1" /><el-option label="禁用" :value="0" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="成本价"><el-input-number v-model="form.cost_price" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="销售价"><el-input-number v-model="form.sale_price" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
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
import { Plus, Upload, Download, Edit, Delete } from '@element-plus/icons-vue'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/api/product'
import { getCategories } from '@/api/category'
import { getBrands } from '@/api/brand'
import { getUnits } from '@/api/unit'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('新增产品')
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)

const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ code: '', barcode: '', name: '', category_id: null as any, brand_id: null as any })
const form = reactive({ code: '', barcode: '', name: '', spec: '', category_id: null as any, brand_id: null as any, unit_id: null as any, status: 1, cost_price: 0, sale_price: 0, description: '' })
const formRules = { code: [{ required: true, message: '请输入产品编码', trigger: 'blur' }], name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }] }

const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getProducts({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { code: '', barcode: '', name: '', category_id: null, brand_id: null }); handleSearch() }

function handleAdd() { editId.value = null; dialogTitle.value = '新增产品'; resetForm(); dialogVisible.value = true }
function handleEdit(row: any) {
  editId.value = row.id; dialogTitle.value = '编辑产品'
  Object.assign(form, {
    code: row.code, barcode: row.barcode || '', name: row.name, spec: row.spec || '',
    category_id: row.category_id, brand_id: row.brand_id, unit_id: row.unit_id,
    status: row.status, cost_price: row.cost_price || 0, sale_price: row.sale_price || 0,
    description: row.description || ''
  })
  dialogVisible.value = true
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该产品？', '提示', { type: 'warning' })
  await deleteProduct(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) {
    await updateProduct(editId.value, { ...form })
    ElMessage.success('更新成功')
  } else {
    await createProduct({ ...form })
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  fetchData()
}

function resetForm() {
  Object.assign(form, { code: '', barcode: '', name: '', spec: '', category_id: null, brand_id: null, unit_id: null, status: 1, cost_price: 0, sale_price: 0, description: '' })
  formRef.value?.clearValidate()
}

function handleImport() { ElMessage.info('导入功能请调用后端 /products/import 接口') }
function handleExport() { ElMessage.info('导出功能请调用后端 /products/export 接口') }

onMounted(async () => {
  fetchData()
  const [cRes, bRes, uRes]: any[] = await Promise.all([getCategories(), getBrands(), getUnits()])
  categories.value = cRes.data || []
  brands.value = bRes.data || []
  units.value = uRes.data || []
})
</script>

<style scoped>
.page-container { height: 100%; }
.toolbar { margin-bottom: 16px; display: flex; gap: 10px; }
</style>
