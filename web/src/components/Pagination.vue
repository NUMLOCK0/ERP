<template>
  <div class="pagination-wrapper">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      background
      @size-change="$emit('change')"
      @current-change="$emit('change')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ page: number; size: number; total: number }>()
const emit = defineEmits<{ (e: 'update:page', v: number): void; (e: 'update:size', v: number): void; (e: 'change'): void }>()

const currentPage = computed({ get: () => props.page, set: (v) => emit('update:page', v) })
const currentSize = computed({ get: () => props.size, set: (v) => emit('update:size', v) })
</script>

<style scoped>.pagination-wrapper{display:flex;justify-content:flex-end;margin-top:16px}</style>
