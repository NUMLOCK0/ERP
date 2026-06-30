<template>
  <div class="business-image-upload">
    <el-upload
      v-model:file-list="fileList"
      action="/api/upload/file"
      :headers="headers"
      list-type="picture-card"
      accept="image/*"
      :limit="limit"
      :disabled="disabled"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-remove="handleRemove"
      :on-preview="handlePreview"
    >
      <el-icon><Plus /></el-icon>
      <template #tip>
        <div class="upload-tip">最多{{ limit }}张，单张不超过{{ maxSize }}MB</div>
      </template>
    </el-upload>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewList"
      :initial-index="previewIndex"
      teleported
      @close="previewVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  limit?: number
  maxSize?: number
  disabled?: boolean
}>(), {
  modelValue: () => [],
  limit: 10,
  maxSize: 10,
  disabled: false
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()

const fileList = ref<any[]>([])
const previewVisible = ref(false)
const previewIndex = ref(0)
const headers = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }))
const previewList = computed(() => props.modelValue.map(assetUrl))

watch(
  () => props.modelValue,
  value => {
    fileList.value = normalizeUrls(value).map((url, index) => ({
      name: fileNameFromUrl(url) || `图片${index + 1}`,
      url: assetUrl(url),
      rawUrl: url
    }))
  },
  { immediate: true, deep: true }
)

function beforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const validSize = file.size / 1024 / 1024 <= props.maxSize
  if (!isImage) ElMessage.warning('只能上传图片')
  if (!validSize) ElMessage.warning(`图片不能超过${props.maxSize}MB`)
  return isImage && validSize
}

function handleSuccess(res: any, file: any) {
  if (res?.code !== 0 || !res?.data?.url) {
    ElMessage.error(res?.message || '上传失败')
    fileList.value = fileList.value.filter(item => item.uid !== file.uid)
    return
  }
  const url = res.data.url
  file.url = assetUrl(url)
  file.rawUrl = url
  const urls = normalizeUrls(props.modelValue)
  if (!urls.includes(url)) emit('update:modelValue', [...urls, url].slice(0, props.limit))
  ElMessage.success('上传成功')
}

function handleRemove(file: any) {
  const url = file.rawUrl || file.response?.data?.url || file.url
  emit('update:modelValue', normalizeUrls(props.modelValue).filter(item => assetUrl(item) !== assetUrl(url) && item !== url))
}

function handlePreview(file: any) {
  const url = file.rawUrl || file.response?.data?.url || file.url
  const index = normalizeUrls(props.modelValue).findIndex(item => assetUrl(item) === assetUrl(url) || item === url)
  previewIndex.value = Math.max(index, 0)
  previewVisible.value = true
}

function normalizeUrls(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [value]
    } catch {
      return [value]
    }
  }
  return []
}

function assetUrl(url: string) {
  if (!url) return ''
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url
  return url
}

function fileNameFromUrl(url: string) {
  return decodeURIComponent(String(url || '').split('/').pop() || '')
}
</script>

<style scoped>
.business-image-upload :deep(.el-upload--picture-card),
.business-image-upload :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 72px;
  height: 72px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}
</style>
