<template>
  <div>
    <el-upload
      :action="uploadUrl"
      :headers="headers"
      :accept="accept"
      :limit="limit"
      :on-success="handleSuccess"
      :on-error="handleError"
      :before-upload="beforeUpload"
      :file-list="fileList"
      list-type="picture-card"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{ accept?: string; limit?: number; fileList?: any[]; maxSize?: number }>(), { accept: 'image/*', limit: 5, fileList: () => [], maxSize: 10 })
const emit = defineEmits<{ (e: 'success', url: string): void }>()

const uploadUrl = '/api/upload/file'
const headers = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }))

function beforeUpload(file: File) { return file.size / 1024 / 1024 <= props.maxSize }
function handleSuccess(res: any) { if (res.code === 0) { emit('success', res.data.url); ElMessage.success('上传成功') } else { ElMessage.error(res.message) } }
function handleError() { ElMessage.error('上传失败') }
</script>
