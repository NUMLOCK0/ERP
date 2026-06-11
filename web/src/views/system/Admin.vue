<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar"><el-button type="primary" :icon="Plus" @click="handleAdd">新增管理员</el-button></div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="real_name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="160" />
        <el-table-column label="角色" width="120"><template #default="{ row }"><el-tag size="small">{{ row.role_name }}</el-tag></template></el-table-column>
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'启用':'禁用' }}</el-tag></template></el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ $formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleResetPwd(row)">重置密码</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="!!form.id" /></el-form-item>
        <el-form-item v-if="!form.id" label="密码" prop="password"><el-input v-model="form.password" type="password" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.real_name" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="角色"><el-select v-model="form.role_id"><el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" /></el-select></el-form-item>
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
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, resetAdminPassword } from '@/api/system'
import { getRoles } from '@/api/system'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false); const tableData = ref<any[]>([]); const total = ref(0); const roles = ref<any[]>([])
const pagination = reactive({ page: 1, size: 20 })
const dialogVisible = ref(false); const dialogTitle = ref('新增'); const formRef = ref<FormInstance>()
const form = reactive({ id: null as any, username: '', password: '', real_name: '', phone: '', email: '', role_id: null as any, status: 1 })
const rules = { username: [{ required: true, message: '请输入用户名', trigger: 'blur' }], password: [{ required: true, message: '请输入密码', trigger: 'blur' }] }

async function fetchData() {
  loading.value = true
  try { const res: any = await getAdmins({ page: pagination.page, pageSize: pagination.size }); tableData.value = res.data?.list || []; total.value = res.data?.total || 0 } finally { loading.value = false }
}
function handleAdd() { dialogTitle.value = '新增'; Object.assign(form, { id: null, username: '', password: '', real_name: '', phone: '', email: '', role_id: null, status: 1 }); dialogVisible.value = true }
function handleEdit(row: any) { dialogTitle.value = '编辑'; Object.assign(form, { ...row, password: '' }); dialogVisible.value = true }
async function handleDelete(row: any) { await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }); await deleteAdmin(row.id); ElMessage.success('已删除'); fetchData() }
async function handleResetPwd(row: any) {
  const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', { inputType: 'password' })
  if (value) { await resetAdminPassword(row.id, value); ElMessage.success('密码已重置') }
}
async function handleSubmit() {
  const valid = await formRef.value!.validate().catch(() => false); if (!valid) return
  if (form.id) { await updateAdmin(form.id, form) } else { await createAdmin(form) }
  ElMessage.success('保存成功'); dialogVisible.value = false; fetchData()
}
onMounted(async () => { fetchData(); const r: any = await getRoles(); roles.value = r.data || [] })
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
