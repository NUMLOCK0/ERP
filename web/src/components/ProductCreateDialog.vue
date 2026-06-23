<template>
  <el-dialog
    :model-value="modelValue"
    title="新增产品"
    width="1280px"
    top="5vh"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="prepareDialog"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
      <el-tabs v-model="activeTab" class="product-tabs">
        <el-tab-pane label="基础信息" name="basic">
          <div class="basic-form">
            <el-form-item label="标题" prop="name">
              <el-input v-model="form.name" maxlength="120" placeholder="标题格式1~120个字符" />
            </el-form-item>
            <el-form-item label="产品编码">
              <el-input v-model="form.code" maxlength="100" placeholder="留空按规则自动生成" />
            </el-form-item>
            <el-form-item label="品牌">
              <el-select v-model="form.brand_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="item in brands" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="默认供应商">
              <el-select v-model="form.default_supplier_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="item in suppliers" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="产品分类" prop="category_id">
              <el-select v-model="form.category_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="简述" prop="description">
              <el-input v-model="form.description" maxlength="160" placeholder="简述格式最多160个字符" />
            </el-form-item>
            <el-form-item label="产品图片">
              <el-upload
                class="product-image-uploader"
                action="/api/upload/file"
                :headers="uploadHeaders"
                :show-file-list="false"
                accept="image/*"
                :before-upload="beforeImageUpload"
                :on-success="handleImageSuccess"
              >
                <img v-if="form.image_urls[0]" :src="form.image_urls[0]" class="product-image-preview" />
                <el-icon v-else class="product-image-placeholder"><Plus /></el-icon>
              </el-upload>
              <el-button v-if="form.image_urls[0]" type="danger" link class="image-remove" @click="form.image_urls = []">移除</el-button>
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :value="1">正常</el-radio>
                <el-radio :value="0">下架</el-radio>
                <el-radio :value="2">停售</el-radio>
                <el-radio :value="3">停产</el-radio>
              </el-radio-group>
            </el-form-item>
          </div>
        </el-tab-pane>

        <el-tab-pane label="规格/计量单位" name="units">
          <div class="unit-section">
            <el-table border :data="unitRows" class="unit-table" :row-class-name="unitRowClass">
              <el-table-column label="单位" width="170" fixed="left">
                <template #header>
                  <span>单位 <el-tooltip content="选择该规格使用的计量单位" placement="top"><el-icon class="help-icon"><QuestionFilled /></el-icon></el-tooltip></span>
                </template>
                <template #default="{ row, $index }">
                  <el-select v-model="row.unit_id" placeholder="选择" filterable @change="syncFirstUnit($index)">
                    <el-option v-for="item in units" :key="item.id" :label="item.name" :value="item.id" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="基准数" width="125">
                <template #default="{ row }"><el-input-number v-model="row.base_quantity" :disabled="row.is_base" :min="1" :precision="2" :controls="false" /></template>
              </el-table-column>
              <el-table-column label="编码" width="150">
                <template #default="{ row }"><el-input v-model="row.code" placeholder="{product}-{unit}" /></template>
              </el-table-column>
              <el-table-column label="重量(kg)" width="125">
                <template #default="{ row }"><el-input-number v-model="row.weight" :min="0" :precision="2" :controls="false" placeholder="重量" /></template>
              </el-table-column>
              <el-table-column label="体积(m³)" width="125">
                <template #default="{ row }"><el-input-number v-model="row.volume" :min="0" :precision="2" :controls="false" placeholder="体积" /></template>
              </el-table-column>
              <el-table-column label="零售价" width="125">
                <template #default="{ row }"><el-input-number v-model="row.sale_price" :min="0" :precision="2" :controls="false" placeholder="零售价" /></template>
              </el-table-column>
              <el-table-column label="成本价" width="125">
                <template #default="{ row }"><el-input-number v-model="row.cost_price" :min="0" :precision="2" :controls="false" placeholder="成本价" /></template>
              </el-table-column>
              <el-table-column v-for="level in memberLevels" :key="level.id" :label="level.name" width="145">
                <template #default="{ row }">
                  <el-input-number v-model="row.member_prices[level.id]" :min="0" :precision="2" :controls="false" :placeholder="`${level.name}价格`" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row, $index }">
                  <el-button type="primary" link @click="copyUnitRow(row)">复制</el-button>
                  <el-button v-if="unitRows.length > 1 && !row.is_base" type="danger" link @click="removeUnitRow($index)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="unit-actions">
              <el-button type="primary" plain :icon="Plus" @click="addUnitRow">单位</el-button>
              <el-button type="primary" plain :icon="CopyDocument" :disabled="!unitRows.length" @click="copyUnitRow(unitRows[unitRows.length - 1])">复制</el-button>
            </div>

            <div class="unit-extra">
              <el-select v-model="unitMeta.defaultWarehouseId" placeholder="默认仓库单位" clearable filterable>
                <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
              <el-input v-model="unitMeta.spec" placeholder="规格" />
              <el-input v-model="unitMeta.bmCode" placeholder="编码规则 bm{id}******" clearable />
              <el-input v-model="unitMeta.remark" placeholder="备注" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认新增</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { CopyDocument, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { createProduct } from '@/api/product'
import { getCategories } from '@/api/category'
import { getBrands } from '@/api/brand'
import { getUnits } from '@/api/unit'
import { getWarehouses } from '@/api/warehouse'
import { getEnabledMemberLevels, getSuppliers } from '@/api/supplier'
import { getDefaultUnit } from '@/utils/unit'

interface UnitRow {
  unit_id: number | null
  is_base: boolean
  base_quantity: number
  code: string
  weight: number
  volume: number
  sale_price: number
  cost_price: number
  member_prices: Record<string, number>
  warehouse_id: number | null
  spec: string
  bm_code: string
  remark: string
}

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'created', productId: number): void
}>()

const formRef = ref<FormInstance>()
const activeTab = ref('basic')
const submitting = ref(false)
const loaded = ref(false)
const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const warehouses = ref<any[]>([])
const suppliers = ref<any[]>([])
const memberLevels = ref<any[]>([])
const unitRows = ref<UnitRow[]>([])
const form = reactive({
  code: '', name: '', spec: '', category_id: null as number | null, brand_id: null as number | null,
  default_supplier_id: null as number | null, unit_id: null as number | null, status: 1,
  cost_price: 0, sale_price: 0, description: '', image_urls: [] as string[]
})
const unitMeta = reactive({ defaultWarehouseId: null as number | null, spec: '', bmCode: '', remark: '' })
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 120, message: '标题格式1~120个字符', trigger: 'blur' }
  ],
  category_id: [{ required: true, message: '请选择产品分类', trigger: 'change' }],
  description: [{ max: 160, message: '简述最多160个字符', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }

function createUnitRow(partial: Partial<UnitRow> = {}): UnitRow {
  const memberPrices: Record<string, number> = {}
  memberLevels.value.forEach(level => { memberPrices[level.id] = partial.member_prices?.[level.id] ?? 0 })
  return {
    unit_id: partial.unit_id ?? null,
    is_base: partial.is_base ?? unitRows.value.length === 0,
    base_quantity: partial.base_quantity ?? 1,
    code: partial.code ?? '',
    weight: partial.weight ?? 0,
    volume: partial.volume ?? 0,
    sale_price: partial.sale_price ?? 0,
    cost_price: partial.cost_price ?? 0,
    member_prices: memberPrices,
    warehouse_id: partial.warehouse_id ?? null,
    spec: partial.spec ?? '',
    bm_code: partial.bm_code ?? '',
    remark: partial.remark ?? ''
  }
}

async function prepareDialog() {
  resetForm()
  if (!loaded.value) {
    const [categoryRes, brandRes, unitRes, warehouseRes, supplierRes, levelRes]: any[] = await Promise.all([
      getCategories(), getBrands(), getUnits(), getWarehouses(),
      getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }), getEnabledMemberLevels()
    ])
    categories.value = listOf(categoryRes)
    brands.value = listOf(brandRes)
    units.value = listOf(unitRes)
    warehouses.value = listOf(warehouseRes)
    suppliers.value = listOf(supplierRes)
    memberLevels.value = listOf(levelRes)
    loaded.value = true
  }
  unitRows.value = [createUnitRow({ unit_id: getDefaultUnit(units.value)?.id || units.value[0]?.id || null, is_base: true })]
}

function resetForm() {
  Object.assign(form, {
    code: '', name: '', spec: '', category_id: null, brand_id: null, default_supplier_id: null,
    unit_id: null, status: 1, cost_price: 0, sale_price: 0, description: '', image_urls: []
  })
  Object.assign(unitMeta, { defaultWarehouseId: null, spec: '', bmCode: '', remark: '' })
  unitRows.value = []
  activeTab.value = 'basic'
  formRef.value?.clearValidate()
}

function ensureBaseRow() {
  unitRows.value.forEach((row, index) => { row.is_base = index === 0 })
  if (unitRows.value[0]) unitRows.value[0].base_quantity = 1
}
function addUnitRow() { unitRows.value.push(createUnitRow()); ensureBaseRow() }
function copyUnitRow(row: UnitRow) { unitRows.value.push(createUnitRow({ ...row, is_base: false, member_prices: { ...row.member_prices } })); ensureBaseRow() }
function removeUnitRow(index: number) { unitRows.value.splice(index, 1); ensureBaseRow() }
function syncFirstUnit(index: number) { if (index === 0) form.unit_id = unitRows.value[0].unit_id }
function unitRowClass({ row }: { row: UnitRow }) { return row.is_base ? 'base-unit-row' : '' }

function buildPayload() {
  ensureBaseRow()
  const first = unitRows.value[0]
  return {
    ...form,
    unit_id: first?.unit_id || 0,
    spec: form.spec || first?.spec || unitMeta.spec || '',
    cost_price: first?.cost_price || 0,
    sale_price: first?.sale_price || 0,
    default_supplier_id: form.default_supplier_id || 0,
    units: unitRows.value.map((row, index) => ({
      ...row,
      warehouse_id: row.warehouse_id || unitMeta.defaultWarehouseId || 0,
      is_base: index === 0 ? 1 : 0,
      spec: row.spec || unitMeta.spec,
      bm_code: row.bm_code || unitMeta.bmCode,
      remark: row.remark || unitMeta.remark,
      sort_order: index
    }))
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!unitRows.value.length || !unitRows.value[0].unit_id) {
    activeTab.value = 'units'
    ElMessage.warning('请选择至少一个计量单位')
    return
  }
  submitting.value = true
  try {
    const res: any = await createProduct(buildPayload())
    ElMessage.success('产品创建成功')
    emit('created', Number(res.data?.id))
    emit('update:modelValue', false)
  } finally {
    submitting.value = false
  }
}

function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) ElMessage.error('只能上传图片')
  if (!isLt2M) ElMessage.error('图片大小不能超过2MB')
  return isImage && isLt2M
}
function handleImageSuccess(res: any) {
  if (res.code === 0) form.image_urls = [res.data.url]
  else ElMessage.error(res.message || '上传失败')
}
function listOf(res: any) { return res.data?.list || res.data || [] }
</script>

<style scoped>
.product-tabs { min-height: 520px; }
.basic-form { width: 450px; }
.basic-form :deep(.el-select) { width: 100%; }
.product-image-uploader { display: inline-flex; vertical-align: top; }
.product-image-uploader :deep(.el-upload) {
  width: 72px; height: 72px; border: 1px dashed #dcdfe6; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.product-image-preview { width: 72px; height: 72px; border-radius: 4px; object-fit: cover; }
.product-image-placeholder { color: #c0c4cc; font-size: 28px; }
.image-remove { margin-left: 12px; }
.unit-section { display: flex; flex-direction: column; gap: 12px; }
.unit-table { width: 100%; }
.unit-table :deep(.el-input-number), .unit-table :deep(.el-select) { width: 100%; }
.unit-table :deep(.base-unit-row td) { background: #fafafa; }
.help-icon { color: #e6a23c; vertical-align: -2px; }
.unit-actions { display: flex; gap: 8px; }
.unit-extra {
  display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 8px;
  align-items: center; border-top: 1px solid #ebeef5; padding-top: 12px;
}
</style>
