<template>
  <div class="page-container">
    <el-card header="系统设置">
      <el-form :model="form" label-width="120px" style="max-width:600px">
        <el-form-item label="系统名称"><el-input v-model="form.site_name" /></el-form-item>
        <el-form-item label="Logo地址"><el-input v-model="form.logo_url" /></el-form-item>
        <el-form-item label="默认分页大小"><el-input-number v-model="form.page_size" :min="5" :max="100" /></el-form-item>
        <el-form-item label="库存预警阈值"><el-input-number v-model="form.stock_warning" :min="1" /></el-form-item>
        <el-form-item label="自动备份"><el-switch v-model="form.auto_backup" /></el-form-item>
        <el-form-item><el-button type="primary" @click="handleSave">保存设置</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemConfig, saveSystemConfig } from '@/api/system'

const form = reactive({ site_name: '进销存管理系统', logo_url: '', page_size: 20, stock_warning: 10, auto_backup: false })

onMounted(async () => {
  try { const res: any = await getSystemConfig(); if (res.data) Object.assign(form, res.data) } catch {}
})
async function handleSave() {
  await saveSystemConfig(form); ElMessage.success('保存成功')
}
</script>
<style scoped>.page-container{padding:20px}</style>
