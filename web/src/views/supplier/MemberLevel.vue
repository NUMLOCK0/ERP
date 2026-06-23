<template>
  <div class="page-container">
    <el-card v-if="mode === 'list'" class="list-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
          <el-button @click="handleExport">导出Excel</el-button>
          <el-button :disabled="!selectedRows.length" @click="handleBatchDelete">删除</el-button>
        </div>
        <div class="toolbar-right">
          <el-tooltip content="搜索" placement="top"><el-button :icon="Search" circle @click="fetchData" /></el-tooltip>
          <el-tooltip content="刷新" placement="top"><el-button :icon="Refresh" circle @click="handleReset" /></el-tooltip>
          <el-tooltip content="列设置" placement="top"><el-button :icon="Setting" circle /></el-tooltip>
        </div>
      </div>

      <div class="filters">
        <el-input v-model="searchForm.id" placeholder="请输入会员等级ID" clearable />
        <div class="filter-placeholder"></div>
        <el-input v-model="searchForm.name" placeholder="请输入名称" clearable />
        <el-input v-model="searchForm.description" placeholder="请输入描述" clearable />
        <el-select v-model="searchForm.status" placeholder="请选择是否启用" clearable>
          <el-option label="启用" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
        <div class="range-inputs">
          <el-input-number v-model="searchForm.sort_min" :controls="false" placeholder="最小值" />
          <span>-</span>
          <el-input-number v-model="searchForm.sort_max" :controls="false" placeholder="最大值" />
        </div>
        <el-date-picker v-model="searchForm.created_start" value-format="YYYY-MM-DD" placeholder="开始" />
        <el-date-picker v-model="searchForm.updated_start" value-format="YYYY-MM-DD" placeholder="开始" />
      </div>
      <div class="filters secondary">
        <div></div><div></div><div></div><div></div><div></div><div></div>
        <el-date-picker v-model="searchForm.created_end" value-format="YYYY-MM-DD" placeholder="结束" />
        <el-date-picker v-model="searchForm.updated_end" value-format="YYYY-MM-DD" placeholder="结束" />
      </div>

      <el-table border
        :data="tableData"
        stripe
        v-loading="loading"
        style="width:100%"
        @selection-change="selectedRows = $event"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="id" label="会员等级ID" width="120" sortable />
        <el-table-column label="图标" width="90">
          <template #default="{ row }">
            <el-image v-if="row.icon_url" class="level-icon" :src="assetUrl(row.icon_url)" fit="cover" />
            <span v-else class="empty-icon">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="160" sortable />
        <el-table-column prop="description" label="描述" min-width="240" sortable />
        <el-table-column label="是否启用" width="110" sortable>
          <template #default="{ row }">
            <el-icon v-if="row.status === 1" class="status-enabled" :size="22"><CircleCheck /></el-icon>
            <el-icon v-else class="status-disabled" :size="22"><CircleClose /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="100" sortable />
        <el-table-column prop="created_at" label="创建时间" width="180" sortable>
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180" sortable>
          <template #default="{ row }">{{ $formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
            <el-dropdown trigger="click">
              <el-button type="primary" link>
                更多<el-icon class="el-icon--right"><MoreFilled /></el-icon>
              </el-button>
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

    <el-card v-else class="form-card">
      <div class="form-title">
        <el-button :icon="Back" link @click="backToList" />
        <span>{{ formTitle }}</span>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="level-form">
        <el-form-item label="名称" prop="name" required>
          <el-input v-model="form.name" :disabled="readonly" maxlength="30" placeholder="名称格式1~30个字符" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" :disabled="readonly" type="textarea" maxlength="230" :rows="4" placeholder="描述最多230个字符" show-word-limit />
        </el-form-item>
        <el-form-item label="顺序">
          <template #label>
            <span>顺序 <el-tooltip content="数值越小越靠前" placement="top"><el-icon class="help-icon"><QuestionFilled /></el-icon></el-tooltip></span>
          </template>
          <el-input-number v-model="form.sort_order" :disabled="readonly" :min="0" :controls="false" class="full-input" />
        </el-form-item>
        <el-form-item label="图标">
          <template #label><span>图标 <span class="hint">建议100*100px</span></span></template>
          <el-upload
            class="icon-uploader"
            action="/api/upload/file"
            :headers="uploadHeaders"
            :show-file-list="false"
            accept="image/*"
            :disabled="readonly"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
          >
            <img v-if="form.icon_url" :src="assetUrl(form.icon_url)" class="upload-preview" />
            <el-icon v-else class="upload-placeholder"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.status" :disabled="readonly" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-button v-if="!readonly" type="primary" class="submit-btn" @click="handleSubmit">提交</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type UploadProps } from 'element-plus'
import {
  Back,
  CircleCheck,
  CircleClose,
  MoreFilled,
  Plus,
  QuestionFilled,
  Refresh,
  Search,
  Setting
} from '@element-plus/icons-vue'
import {
  createMemberLevel,
  deleteMemberLevel,
  getMemberLevels,
  updateMemberLevel
} from '@/api/supplier'
import Pagination from '@/components/Pagination.vue'

type Mode = 'list' | 'form'

const loading = ref(false)
const mode = ref<Mode>('list')
const readonly = ref(false)
const tableData = ref<any[]>([])
const selectedRows = ref<any[]>([])
const total = ref(0)
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({
  id: '',
  name: '',
  description: '',
  status: null as number | null,
  sort_min: null as number | null,
  sort_max: null as number | null,
  created_start: '',
  created_end: '',
  updated_start: '',
  updated_end: ''
})
const form = reactive({
  name: '',
  description: '',
  icon_url: '',
  sort_order: 0,
  status: 1
})
const rules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 1, max: 30, message: '名称格式1~30个字符', trigger: 'blur' }
  ],
  description: [{ max: 230, message: '描述最多230个字符', trigger: 'blur' }]
}

const formTitle = computed(() => readonly.value ? '会员等级详情' : editId.value ? '会员等级编辑' : '会员等级添加')
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }))

function buildParams() {
  return {
    page: pagination.page,
    pageSize: pagination.size,
    id: searchForm.id || undefined,
    name: searchForm.name || undefined,
    description: searchForm.description || undefined,
    status: searchForm.status ?? '',
    sort_min: searchForm.sort_min ?? '',
    sort_max: searchForm.sort_max ?? '',
    created_start: searchForm.created_start || undefined,
    created_end: searchForm.created_end || undefined,
    updated_start: searchForm.updated_start || undefined,
    updated_end: searchForm.updated_end || undefined
  }
}

function assetUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getMemberLevels(buildParams())
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, { name: '', description: '', icon_url: '', sort_order: 0, status: 1 })
  formRef.value?.clearValidate()
}

function handleReset() {
  Object.assign(searchForm, {
    id: '',
    name: '',
    description: '',
    status: null,
    sort_min: null,
    sort_max: null,
    created_start: '',
    created_end: '',
    updated_start: '',
    updated_end: ''
  })
  pagination.page = 1
  fetchData()
}

function handleAdd() {
  readonly.value = false
  editId.value = null
  resetForm()
  mode.value = 'form'
}

function loadForm(row: any, detail = false) {
  readonly.value = detail
  editId.value = row.id
  Object.assign(form, {
    name: row.name || '',
    description: row.description || '',
    icon_url: row.icon_url || '',
    sort_order: row.sort_order || 0,
    status: row.status ?? 1
  })
  mode.value = 'form'
}

function handleDetail(row: any) { loadForm(row, true) }
function handleEdit(row: any) { loadForm(row, false) }

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确认删除会员等级「${row.name}」？`, '提示', { type: 'warning' })
  await deleteMemberLevel(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

async function handleBatchDelete() {
  await ElMessageBox.confirm(`确认删除选中的 ${selectedRows.value.length} 个会员等级？`, '提示', { type: 'warning' })
  await Promise.all(selectedRows.value.map(row => deleteMemberLevel(row.id)))
  ElMessage.success('删除成功')
  selectedRows.value = []
  fetchData()
}

function handleExport() {
  const header = ['会员等级ID', '图标', '名称', '描述', '是否启用', '排序', '创建时间', '更新时间']
  const rows = tableData.value.map(row => [
    row.id,
    row.icon_url || '',
    row.name || '',
    row.description || '',
    row.status === 1 ? '启用' : '禁用',
    row.sort_order ?? 0,
    row.created_at || '',
    row.updated_at || ''
  ])
  const csv = [header, ...rows].map(cols => cols.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '会员等级.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) ElMessage.error('只能上传图片')
  if (!isLt2M) ElMessage.error('图片大小不能超过2MB')
  return isImage && isLt2M
}

function handleUploadSuccess(res: any) {
  if (res.code === 0) {
    form.icon_url = res.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(res.message || '上传失败')
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) {
    await updateMemberLevel(editId.value, { ...form })
    ElMessage.success('更新成功')
  } else {
    await createMemberLevel({ ...form })
    ElMessage.success('创建成功')
  }
  backToList()
  fetchData()
}

function backToList() {
  mode.value = 'list'
  readonly.value = false
  editId.value = null
  resetForm()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  min-height: 100%;
}
.list-card,
.form-card {
  border-radius: 6px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 10px;
}
.filters {
  display: grid;
  grid-template-columns: 120px 70px 180px 260px 220px 220px 200px 200px;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.filters :deep(.el-select) {
  width: 220px;
}
.filters.secondary {
  margin-top: -8px;
}
.filter-placeholder {
  height: 32px;
}
.range-inputs {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 6px;
}
.range-inputs :deep(.el-input-number) {
  width: 96px;
}
.level-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}
.empty-icon {
  color: #c0c4cc;
}
.status-enabled {
  color: #67c23a;
}
.status-disabled {
  color: #c0c4cc;
}
.form-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  font-weight: 600;
  margin-bottom: 22px;
}
.level-form {
  width: 480px;
}
.full-input {
  width: 100%;
}
.help-icon {
  color: #e6a23c;
  vertical-align: -2px;
}
.hint {
  color: #c0c4cc;
  font-size: 12px;
  margin-left: 8px;
}
.icon-uploader :deep(.el-upload) {
  width: 64px;
  height: 64px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-preview {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
}
.upload-placeholder {
  color: #dcdfe6;
  font-size: 28px;
}
.submit-btn {
  margin-top: 10px;
  min-width: 70px;
}
@media (max-width: 1400px) {
  .filters {
    grid-template-columns: repeat(4, minmax(140px, 1fr));
  }
}
@media (max-width: 900px) {
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .filters {
    grid-template-columns: 1fr;
  }
  .filters.secondary {
    display: none;
  }
  .level-form {
    width: 100%;
  }
}
</style>
