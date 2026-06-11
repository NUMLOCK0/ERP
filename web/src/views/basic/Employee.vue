<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增职员</el-button>
      </div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="username" label="登录账号" width="140" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="position" label="职位" width="120" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'在职':'离职' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="入职时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="form.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="editId && form.user_id ? '留空表示不修改密码' : '请输入至少6位密码'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="职位"><el-input v-model="form.position" /></el-form-item>
        <el-form-item label="部门"><el-input v-model="form.department" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option label="在职" :value="1" /><el-option label="离职" :value="0" /></el-select></el-form-item>
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
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/api/employee'

const loading = ref(false)
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增职员')
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)
const form = reactive({
  user_id: 0,
  username: '',
  password: '',
  name: '',
  phone: '',
  position: '',
  department: '',
  status: 1
})
const rules: FormRules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [{
    validator: (_rule, value, callback) => {
      const passwordRequired = !editId.value || !form.user_id
      if (passwordRequired && !value) {
        callback(new Error('请输入登录密码'))
      } else if (value && String(value).length < 6) {
        callback(new Error('登录密码不能少于6位'))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getEmployees()
    tableData.value = Array.isArray(res.data) ? res.data : res.data?.list || []
  } catch {
    tableData.value = []
  } finally {
    loading.value = false
  }
}
function handleAdd() { editId.value = null; dialogTitle.value = '新增职员'; resetForm(); dialogVisible.value = true }
function handleEdit(row: any) {
  editId.value = row.id; dialogTitle.value = '编辑职员'
  Object.assign(form, {
    user_id: row.user_id || 0,
    username: row.username || '',
    password: '',
    name: row.name,
    phone: row.phone || '',
    position: row.position || '',
    department: row.department || '',
    status: row.status
  })
  dialogVisible.value = true
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' })
  await deleteEmployee(row.id); ElMessage.success('删除成功'); fetchData()
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editId.value) { await updateEmployee(editId.value, { ...form }) } else { await createEmployee({ ...form }) }
  ElMessage.success(editId.value ? '更新成功' : '创建成功'); dialogVisible.value = false; fetchData()
}
function resetForm() {
  Object.assign(form, {
    user_id: 0,
    username: '',
    password: '',
    name: '',
    phone: '',
    position: '',
    department: '',
    status: 1
  })
  formRef.value?.clearValidate()
}

onMounted(fetchData)
</script>

<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
