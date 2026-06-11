<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar"><el-button type="primary" :icon="Plus" @click="handleAdd">新增角色</el-button></div>
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="角色名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="权限" min-width="300">
          <template #default="{ row }">
            <el-tag v-for="p in (typeof row.permissions==='string' ? JSON.parse(row.permissions||'[]') : row.permissions||[])" :key="p" size="small" style="margin-right:4px;margin-bottom:4px">{{ p }}</el-tag>
          </template>
        </el-table-column>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" /></el-form-item>
        <el-form-item label="权限">
          <el-tree ref="treeRef" :data="permTree" show-checkbox node-key="id" :default-checked-keys="checkedKeys" :props="{ label: 'label', children: 'children' }" @check="onCheck" />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="handleSubmit">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type ElTree } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getRoles, createRole, updateRole, deleteRole } from '@/api/system'

const loading = ref(false); const tableData = ref<any[]>([])
const dialogVisible = ref(false); const dialogTitle = ref('新增'); const formRef = ref<FormInstance>(); const treeRef = ref<InstanceType<typeof ElTree>>()
const form = reactive({ id: null as any, name: '', description: '', permissions: [] as string[] })
const rules = { name: [{ required: true, message: '请输入名称', trigger: 'blur' }] }
const checkedKeys = ref<number[]>([])

const permTree = [
  { id: 1, label: '仪表盘', children: [] },
  { id: 2, label: '基础数据', children: [{ id: 21, label: '产品管理' },{ id: 22, label: '产品分类' },{ id: 23, label: '品牌管理' },{ id: 24, label: '计量单位' },{ id: 25, label: '职员管理' },{ id: 26, label: '仓库管理' }] },
  { id: 3, label: '采购管理', children: [{ id: 31, label: '采购订单' },{ id: 32, label: '采购入库' },{ id: 33, label: '采购退货' }] },
  { id: 4, label: '销售管理', children: [{ id: 41, label: '销售订单' },{ id: 42, label: '销售发货' },{ id: 43, label: '发货退货' }] },
  { id: 5, label: '库存管理', children: [{ id: 51, label: '库存查询' },{ id: 52, label: '其他入库' },{ id: 53, label: '其他出库' },{ id: 54, label: '库存盘点' },{ id: 55, label: '库存调拨' },{ id: 56, label: '库存日志' }] },
  { id: 6, label: '资金账单', children: [{ id: 61, label: '采购付款' },{ id: 62, label: '销售收款' }] },
  { id: 7, label: '数据报表', children: [{ id: 71, label: '产品库存' },{ id: 72, label: '销售发货' },{ id: 73, label: '采购入库' },{ id: 74, label: '采购订单' },{ id: 75, label: '销售订单' },{ id: 76, label: '销售收款' },{ id: 77, label: '采购付款' }] },
  { id: 8, label: '客商管理', children: [{ id: 81, label: '企业管理' },{ id: 82, label: '企业分类' }] },
  { id: 9, label: '系统配置', children: [{ id: 91, label: '系统设置' },{ id: 92, label: '管理员' },{ id: 93, label: '角色管理' },{ id: 94, label: '打印模板' },{ id: 95, label: '操作日志' }] },
]

function onCheck() { form.permissions = treeRef.value!.getCheckedKeys(false) as string[] }

async function fetchData() { loading.value = true; try { const res: any = await getRoles(); tableData.value = res.data || [] } finally { loading.value = false } }
function handleAdd() { dialogTitle.value = '新增'; Object.assign(form, { id: null, name: '', description: '', permissions: [] }); checkedKeys.value = []; dialogVisible.value = true }
function handleEdit(row: any) {
  dialogTitle.value = '编辑'
  const perms: string[] = typeof row.permissions === 'string' ? JSON.parse(row.permissions||'[]') : row.permissions || []
  Object.assign(form, { ...row, permissions: perms }); checkedKeys.value = perms.map(Number); dialogVisible.value = true
}
async function handleDelete(row: any) { await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' }); await deleteRole(row.id); ElMessage.success('已删除'); fetchData() }
async function handleSubmit() {
  const valid = await formRef.value!.validate().catch(() => false); if (!valid) return
  if (form.id) { await updateRole(form.id, form) } else { await createRole(form) }
  ElMessage.success('保存成功'); dialogVisible.value = false; fetchData()
}
onMounted(fetchData)
</script>
<style scoped>.page-container{height:100%}.toolbar{margin-bottom:16px}</style>
