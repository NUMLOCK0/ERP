<template>
  <span class="copyable-no" :class="{ 'copyable-no--icon-only': iconOnly }">
    <span v-if="!iconOnly" class="copyable-no__text" :title="text">{{ text }}</span>
    <el-tooltip content="复制单号" placement="top">
      <el-button
        class="copyable-no__button"
        type="primary"
        link
        :icon="CopyDocument"
        :disabled="!canCopy"
        aria-label="复制单号"
        @click.stop="copy"
      />
    </el-tooltip>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  value?: string | number | null
  iconOnly?: boolean
}>(), {
  value: '',
  iconOnly: false
})

const rawText = computed(() => String(props.value ?? '').trim())
const text = computed(() => rawText.value || '-')
const canCopy = computed(() => Boolean(rawText.value) && !rawText.value.includes('{'))

async function copy() {
  if (!canCopy.value) return
  try {
    await copyText(rawText.value)
    ElMessage.success('单号已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy failed')
}
</script>

<style scoped>
.copyable-no {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  vertical-align: middle;
}

.copyable-no__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copyable-no__button {
  flex: none;
  margin-left: 4px;
  padding: 2px;
}

.copyable-no--icon-only .copyable-no__button {
  margin-left: 0;
}
</style>
