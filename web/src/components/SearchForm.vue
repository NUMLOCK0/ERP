<template>
  <el-card shadow="never" class="search-card">
    <el-form :inline="true" :model="model" class="search-form">
      <slot />
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="$emit('search')">搜索</el-button>
        <el-button :icon="Refresh" @click="$emit('reset')">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { Search, Refresh } from '@element-plus/icons-vue'

defineProps<{ model: Record<string, any> }>()
defineEmits<{ (e: 'search'): void; (e: 'reset'): void }>()
</script>

<style scoped>
.search-card{margin-bottom:16px}
.search-form .el-form-item{margin-bottom:0}
</style>
