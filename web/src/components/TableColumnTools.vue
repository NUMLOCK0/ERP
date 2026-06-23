<template>
  <div ref="rootRef" class="table-column-tools">
    <el-popover placement="bottom-start" trigger="click" width="260" @show="refreshColumns">
      <template #reference>
        <el-button :icon="Setting">字段设置</el-button>
      </template>
      <div class="column-panel">
        <div class="column-panel-header">
          <span>显示字段</span>
          <div>
            <el-button link type="primary" @click="selectAll">全选</el-button>
            <el-button link type="primary" @click="resetColumns">重置</el-button>
          </div>
        </div>
        <el-checkbox-group v-model="visibleKeys" class="column-checks" @change="handleVisibleChange">
          <el-checkbox v-for="column in configurableColumns" :key="column.key" :label="column.key">
            {{ column.label }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </el-popover>
    <el-button :icon="Download" @click="exportExcel">导出Excel</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Setting } from '@element-plus/icons-vue'

type TableColumn = {
  key: string
  label: string
  index: number
  exportable: boolean
}

const props = withDefaults(defineProps<{
  tableKey: string
  filename?: string
  ignoreLabels?: string[]
}>(), {
  filename: '列表数据',
  ignoreLabels: () => ['操作']
})

const rootRef = ref<HTMLElement>()
const tableRef = ref<HTMLElement | null>(null)
const columns = ref<TableColumn[]>([])
const visibleKeys = ref<string[]>([])
const storageKey = computed(() => `table-visible-columns:${props.tableKey}`)
const styleId = computed(() => `table-column-tools-style-${props.tableKey}`)
const configurableColumns = computed(() => columns.value.filter(column => column.exportable))

function resolveTable() {
  const root = rootRef.value
  if (!root) return null
  const siblings = Array.from(root.parentElement?.children || [])
  const rootIndex = siblings.indexOf(root)
  const afterRoot = siblings.slice(rootIndex + 1)
  return (afterRoot.find(item => item.classList.contains('el-table')) ||
    root.parentElement?.querySelector('.el-table')) as HTMLElement | null
}

function columnKey(label: string, index: number) {
  return `${index}:${label}`
}

async function refreshColumns() {
  await nextTick()
  const table = resolveTable()
  if (!table) return
  tableRef.value = table
  table.setAttribute('data-column-tools', props.tableKey)

  const headerCells = Array.from(table.querySelectorAll('.el-table__header-wrapper thead tr:last-child th')) as HTMLElement[]
  const nextColumns = headerCells.map((cell, index) => {
    const label = (cell.innerText || '').replace(/\s+/g, ' ').trim()
    const exportable = Boolean(label) && !props.ignoreLabels.includes(label)
    return { key: columnKey(label || `column-${index + 1}`, index), label: label || `字段${index + 1}`, index: index + 1, exportable }
  })
  columns.value = nextColumns

  const exportableKeys = nextColumns.filter(column => column.exportable).map(column => column.key)
  const saved = readSavedKeys()
  visibleKeys.value = saved?.filter(key => exportableKeys.includes(key)) || exportableKeys
  applyColumnVisibility()
}

function readSavedKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey.value) || 'null')
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function handleVisibleChange() {
  localStorage.setItem(storageKey.value, JSON.stringify(visibleKeys.value))
  applyColumnVisibility()
}

function selectAll() {
  visibleKeys.value = configurableColumns.value.map(column => column.key)
  handleVisibleChange()
}

function resetColumns() {
  localStorage.removeItem(storageKey.value)
  visibleKeys.value = configurableColumns.value.map(column => column.key)
  applyColumnVisibility()
}

function applyColumnVisibility() {
  const table = tableRef.value
  if (!table) return
  table.setAttribute('data-column-tools', props.tableKey)
  const hiddenColumns = configurableColumns.value.filter(column => !visibleKeys.value.includes(column.key))
  const previous = document.getElementById(styleId.value)
  previous?.remove()
  if (!hiddenColumns.length) {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    return
  }

  const selectors = hiddenColumns.flatMap(column => [
    `.el-table[data-column-tools="${props.tableKey}"] .el-table__header-wrapper col:nth-child(${column.index})`,
    `.el-table[data-column-tools="${props.tableKey}"] .el-table__body-wrapper col:nth-child(${column.index})`,
    `.el-table[data-column-tools="${props.tableKey}"] .el-table__footer-wrapper col:nth-child(${column.index})`,
    `.el-table[data-column-tools="${props.tableKey}"] .el-table__header-wrapper th:nth-child(${column.index})`,
    `.el-table[data-column-tools="${props.tableKey}"] .el-table__body-wrapper td:nth-child(${column.index})`,
    `.el-table[data-column-tools="${props.tableKey}"] .el-table__footer-wrapper td:nth-child(${column.index})`
  ])
  const style = document.createElement('style')
  style.id = styleId.value
  style.textContent = `${selectors.join(',')}{display:none!important;width:0!important;min-width:0!important;max-width:0!important;padding:0!important;border:0!important;}`
  document.head.appendChild(style)
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
}

function cellText(cell: Element | undefined) {
  return (cell?.textContent || '').replace(/\s+/g, ' ').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function exportExcel() {
  await refreshColumns()
  const table = tableRef.value
  if (!table) {
    ElMessage.warning('未找到可导出的表格')
    return
  }
  const exportColumns = configurableColumns.value.filter(column => visibleKeys.value.includes(column.key))
  if (!exportColumns.length) {
    ElMessage.warning('请至少显示一个字段')
    return
  }

  const rows = Array.from(table.querySelectorAll('.el-table__body-wrapper tbody tr')).filter(row => !row.classList.contains('el-table__empty-row'))
  if (!rows.length) {
    ElMessage.warning('暂无可导出的数据')
    return
  }

  const headerHtml = exportColumns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')
  const bodyHtml = rows.map(row => {
    const cells = Array.from(row.children)
    return `<tr>${exportColumns.map(column => `<td>${escapeHtml(cellText(cells[column.index - 1]))}</td>`).join('')}</tr>`
  }).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.filename || '列表数据'}-${new Date().toISOString().slice(0, 10)}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  setTimeout(refreshColumns, 0)
})

onBeforeUnmount(() => {
  document.getElementById(styleId.value)?.remove()
})

watch(() => props.tableKey, refreshColumns)
</script>

<style scoped>
.table-column-tools {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 0 0 10px;
}
.column-panel { max-height: 360px; overflow: hidden; }
.column-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #303133;
  font-weight: 600;
}
.column-checks {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  max-height: 300px;
  overflow: auto;
}
.column-checks :deep(.el-checkbox) { height: 24px; }
</style>
