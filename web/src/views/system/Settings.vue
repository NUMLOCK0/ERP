<template>
  <div class="page-container">
    <el-card header="系统设置">
      <el-form :model="form" label-width="140px" class="settings-form">
        <el-form-item label="系统名称"><el-input v-model="form.site_name" /></el-form-item>
        <el-form-item label="Logo地址"><el-input v-model="form.logo_url" /></el-form-item>
        <el-form-item label="默认分页大小"><el-input-number v-model="form.page_size" :min="5" :max="100" /></el-form-item>
        <el-form-item label="库存预警阈值"><el-input-number v-model="form.stock_warning" :min="1" /></el-form-item>
        <el-form-item label="自动备份"><el-switch v-model="form.auto_backup" /></el-form-item>

        <el-divider content-position="left">审核配置</el-divider>
        <el-form-item v-for="item in auditModules" :key="item.key" :label="item.label">
          <div class="audit-setting-row">
            <el-switch
              v-model="form[item.key]"
              active-text="开启审核"
              inactive-text="关闭审核"
            />
            <span class="audit-setting-desc">{{ item.description }}</span>
          </div>
        </el-form-item>

        <el-form-item><el-button type="primary" @click="handleSave">保存设置</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemConfig, saveSystemConfig } from '@/api/system'

const auditModules = [
  { key: 'audit_purchase_order_enabled', label: '采购订单', description: '关闭后新增采购订单会直接生成采购入库并更新库存。' },
  { key: 'audit_sale_order_enabled', label: '销售订单', description: '关闭后新增销售订单会直接生成销售发货并扣减库存。' },
  { key: 'audit_inventory_check_enabled', label: '库存盘点', description: '关闭后新增盘点单会直接确认并调整库存差异。' },
  { key: 'audit_inventory_transfer_enabled', label: '库存调拨', description: '关闭后新增调拨单会直接完成跨仓库调拨。' }
] as const

const form = reactive<Record<string, any>>({
  site_name: '进销存管理系统',
  logo_url: '',
  page_size: 20,
  stock_warning: 10,
  auto_backup: false,
  audit_purchase_order_enabled: true,
  audit_sale_order_enabled: true,
  audit_inventory_check_enabled: true,
  audit_inventory_transfer_enabled: false
})

onMounted(async () => {
  try {
    const res: any = await getSystemConfig()
    if (res.data) {
      Object.assign(form, res.data)
      form.page_size = Number(form.page_size || 20)
      form.stock_warning = Number(form.stock_warning || 10)
      form.auto_backup = toBoolean(form.auto_backup, false)
      auditModules.forEach(item => {
        form[item.key] = toBoolean(form[item.key], form[item.key])
      })
    }
  } catch {}
})
async function handleSave() {
  await saveSystemConfig(form); ElMessage.success('保存成功')
}

function toBoolean(value: any, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const text = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(text)) return true
  if (['0', 'false', 'no', 'off', 'disabled'].includes(text)) return false
  return defaultValue
}
</script>
<style scoped>
.page-container {
  padding: 20px;
}
.settings-form {
  max-width: 760px;
}
.audit-setting-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 32px;
}
.audit-setting-desc {
  color: #606266;
  font-size: 13px;
}
</style>
