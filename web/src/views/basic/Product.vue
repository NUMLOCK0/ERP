<template>
  <div class="page-container">
    <el-card>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="产品编码"><el-input v-model="searchForm.code" placeholder="编码" clearable /></el-form-item>
        <el-form-item label="产品名称"><el-input v-model="searchForm.name" placeholder="名称" clearable /></el-form-item>
        <el-form-item label="分类"><el-select v-model="searchForm.category_id" class="search-wide-select" placeholder="请选择" clearable><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
        <el-form-item label="品牌"><el-select v-model="searchForm.brand_id" class="search-wide-select" placeholder="请选择" clearable><el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" /></el-select></el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
        <el-button :icon="Upload" @click="handleImport">导入</el-button>
        <el-button :icon="Download" @click="handleExport">导出</el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading" style="width:100%">
        <el-table-column prop="name" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="主图" width="82" align="center">
          <template #default="{ row }">
            <el-image
              v-if="firstProductImage(row)"
              class="product-thumb"
              :src="firstProductImage(row)"
              :preview-src-list="[firstProductImage(row)]"
              fit="cover"
              preview-teleported
            />
            <span v-else class="empty-cell">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" min-width="120" show-overflow-tooltip />
        <el-table-column prop="description" label="简介" min-width="200" show-overflow-tooltip />
        <el-table-column label="零售价" width="110" align="right">
          <template #default="{ row }">{{ formatMoney(row.sale_price) }}</template>
        </el-table-column>
        <el-table-column label="成本价" width="110" align="right">
          <template #default="{ row }">{{ formatMoney(row.cost_price) }}</template>
        </el-table-column>
        <el-table-column label="库存总量" width="110" align="right">
          <template #default="{ row }">{{ formatQuantity(row.stock_total) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="category_name" label="产品分类" min-width="120" show-overflow-tooltip />
        <el-table-column prop="id" label="产品id" width="90" />
        <el-table-column label="是否多规格" width="110">
          <template #default="{ row }">
            <el-tag :type="row.is_multi_spec ? 'success' : 'info'" size="small">{{ row.is_multi_spec ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="140" show-overflow-tooltip />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleDetail(row)">详情</el-button>
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="1280px" top="5vh" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-tabs v-model="activeTab" class="product-tabs">
          <el-tab-pane label="基础信息" name="basic">
            <div class="basic-form">
              <el-form-item label="标题" prop="name" required>
                <el-input v-model="form.name" maxlength="120" placeholder="标题格式1~120个字符" />
              </el-form-item>
              <el-form-item label="产品编码">
                <el-input v-model="form.code" maxlength="100" placeholder="留空按规则自动生成" />
              </el-form-item>
              <el-form-item label="品牌">
                <el-select v-model="form.brand_id" placeholder="请选择..." clearable filterable>
                  <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="默认供应商">
                <el-select v-model="form.default_supplier_id" placeholder="请选择..." clearable filterable>
                  <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="产品分类" prop="category_id" required>
                <el-select v-model="form.category_id" placeholder="请选择..." clearable filterable>
                  <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
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
                  <img v-if="form.image_urls[0]" :src="assetUrl(form.image_urls[0])" class="product-image-preview" />
                  <el-icon v-else class="product-image-placeholder"><Plus /></el-icon>
                </el-upload>
                <el-button v-if="form.image_urls[0]" type="danger" link class="image-remove" @click="removeProductImage">移除</el-button>
              </el-form-item>
              <el-form-item label="状态" prop="status" required>
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
              <el-table :data="unitRows" border class="unit-table" :row-class-name="unitRowClass">
                <el-table-column label="单位" width="170" fixed="left">
                  <template #header>
                    <span>单位 <el-tooltip content="选择该规格使用的计量单位" placement="top"><el-icon class="help-icon"><QuestionFilled /></el-icon></el-tooltip></span>
                  </template>
                  <template #default="{ row, $index }">
                    <div class="unit-cell">
                      <el-select v-model="row.unit_id" placeholder="选择" filterable class="unit-select" @change="syncFirstUnit($index)">
                        <el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" />
                      </el-select>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="基准数" width="130">
                  <template #default="{ row }"><el-input-number v-model="row.base_quantity" :disabled="row.is_base" :min="1" :controls="false" /></template>
                </el-table-column>
                <el-table-column width="150">
                  <template #header>
                    <span>编码 <el-tooltip content="留空时可由业务规则生成" placement="top"><el-icon class="help-icon"><QuestionFilled /></el-icon></el-tooltip></span>
                  </template>
                  <template #default="{ row }"><el-input v-model="row.code" placeholder="{product}-{unit}" /></template>
                </el-table-column>
                <el-table-column label="重量(kg)" width="130">
                  <template #default="{ row }"><el-input-number v-model="row.weight" :min="0" :precision="3" :controls="false" placeholder="重量" /></template>
                </el-table-column>
                <el-table-column label="体积(m³)" width="130">
                  <template #default="{ row }"><el-input-number v-model="row.volume" :min="0" :precision="3" :controls="false" placeholder="体积" /></template>
                </el-table-column>
                <el-table-column label="零售价" width="130">
                  <template #default="{ row }"><el-input-number v-model="row.sale_price" :min="0" :precision="2" :controls="false" placeholder="零售价" /></template>
                </el-table-column>
                <el-table-column label="成本价" width="130">
                  <template #default="{ row }"><el-input-number v-model="row.cost_price" :min="0" :precision="2" :controls="false" placeholder="成本价" /></template>
                </el-table-column>
                <el-table-column v-for="level in memberLevels" :key="level.id" :label="level.name" width="150">
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
                <div class="image-placeholder"><el-icon><Plus /></el-icon></div>
                <el-select v-model="unitMeta.defaultWarehouseId" placeholder="默认仓库单位" clearable filterable>
                  <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
                </el-select>
                <el-input v-model="unitMeta.spec" placeholder="规格" />
                <div class="code-rule-field">
                  <el-input v-model="unitMeta.bmCode" placeholder="bm{id}******" clearable @focus="codeRuleFocused = true" @blur="codeRuleFocused = false" />
                  <div v-if="codeRuleFocused" class="code-rule-tip">
                    <div>bm{id}******</div>
                    <div>1. {id}为当前产品id，强烈建议保留{id}规则</div>
                    <div>2. 星号则表示自动生成，位数表示生成的长度</div>
                    <div>3. 仅添加数据执行自动生成</div>
                  </div>
                </div>
                <el-input v-model="unitMeta.remark" placeholder="备注" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="产品详情" size="520px" direction="rtl" class="product-detail-drawer">
      <div v-loading="detailLoading" class="product-detail">
        <div v-if="detailData" class="detail-stack">
          <div class="detail-title">
            <div class="detail-name">{{ detailData.name }}</div>
            <el-tag :type="statusTagType(detailData.status)" size="small">{{ statusText(detailData.status) }}</el-tag>
          </div>

          <div class="detail-image-block">
            <el-image
              v-if="detailImages.length"
              class="detail-image"
              :src="assetUrl(detailImages[0])"
              :preview-src-list="detailImages.map(assetUrl)"
              fit="cover"
              preview-teleported
            />
            <div v-else class="detail-image-empty">暂无主图</div>
          </div>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="产品ID">{{ detailData.id }}</el-descriptions-item>
            <el-descriptions-item label="产品编码">{{ emptyText(detailData.code) }}</el-descriptions-item>
            <el-descriptions-item label="规格">{{ emptyText(detailData.spec) }}</el-descriptions-item>
            <el-descriptions-item label="简介">{{ emptyText(detailData.description) }}</el-descriptions-item>
            <el-descriptions-item label="零售价">{{ formatMoney(detailData.sale_price) }}</el-descriptions-item>
            <el-descriptions-item label="成本价">{{ formatMoney(detailData.cost_price) }}</el-descriptions-item>
            <el-descriptions-item label="库存总量">{{ formatQuantity(detailData.stock_total) }}</el-descriptions-item>
            <el-descriptions-item label="产品分类">{{ emptyText(detailData.category_name || lookupName(categories, detailData.category_id)) }}</el-descriptions-item>
            <el-descriptions-item label="品牌">{{ emptyText(detailData.brand_name || lookupName(brands, detailData.brand_id)) }}</el-descriptions-item>
            <el-descriptions-item label="供应商">{{ emptyText(detailData.supplier_name || lookupName(suppliers, detailData.default_supplier_id)) }}</el-descriptions-item>
            <el-descriptions-item label="是否多规格">{{ Number(detailData.units?.length || detailData.unit_count || 0) > 1 ? '是' : '否' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detailData.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(detailData.updated_at) }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-section-title">规格/计量单位</div>
          <el-table :data="detailData.units || []" border size="small" class="detail-unit-table">
            <el-table-column label="单位" min-width="90">
              <template #default="{ row }">{{ emptyText(row.unit_name || lookupName(units, row.unit_id)) }}</template>
            </el-table-column>
            <el-table-column label="基准数" width="90">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column label="编码" min-width="120">
              <template #default="{ row }">{{ emptyText(row.code) }}</template>
            </el-table-column>
            <el-table-column label="规格" min-width="100">
              <template #default="{ row }">{{ emptyText(row.spec) }}</template>
            </el-table-column>
            <el-table-column label="零售价" width="90" align="right">
              <template #default="{ row }">{{ formatMoney(row.sale_price) }}</template>
            </el-table-column>
            <el-table-column label="成本价" width="90" align="right">
              <template #default="{ row }">{{ formatMoney(row.cost_price) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { CopyDocument, Delete, Download, Edit, Plus, QuestionFilled, Upload, View } from '@element-plus/icons-vue'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '@/api/product'
import { getCategories } from '@/api/category'
import { getBrands } from '@/api/brand'
import { getUnits } from '@/api/unit'
import { getDefaultUnit } from '@/utils/unit'
import { getWarehouses } from '@/api/warehouse'
import { getEnabledMemberLevels, getSuppliers } from '@/api/supplier'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'

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

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('新增产品')
const activeTab = ref('basic')
const codeRuleFocused = ref(false)
const formRef = ref<FormInstance>()
const editId = ref<number | null>(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any | null>(null)

const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ code: '', name: '', category_id: null as any, brand_id: null as any })
const form = reactive({
  code: '',
  name: '',
  spec: '',
  category_id: null as any,
  brand_id: null as any,
  default_supplier_id: null as any,
  unit_id: null as any,
  status: 1,
  cost_price: 0,
  sale_price: 0,
  description: '',
  image_urls: [] as string[]
})
const formRules = {
  name: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 120, message: '标题格式1~120个字符', trigger: 'blur' }
  ],
  category_id: [{ required: true, message: '请选择产品分类', trigger: 'change' }],
  description: [{ max: 160, message: '简述最多160个字符', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}
const unitMeta = reactive({ defaultWarehouseId: null as number | null, spec: '', bmCode: '', remark: '' })

const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const warehouses = ref<any[]>([])
const suppliers = ref<any[]>([])
const memberLevels = ref<any[]>([])
const unitRows = ref<UnitRow[]>([])

function createUnitRow(partial: Partial<UnitRow> = {}): UnitRow {
  const prices: Record<string, number> = {}
  memberLevels.value.forEach(level => { prices[level.id] = partial.member_prices?.[level.id] ?? 0 })
  return {
    unit_id: partial.unit_id ?? null,
    is_base: partial.is_base ?? unitRows.value.length === 0,
    base_quantity: partial.base_quantity ?? 1,
    code: partial.code ?? '',
    weight: partial.weight ?? 0,
    volume: partial.volume ?? 0,
    sale_price: partial.sale_price ?? 0,
    cost_price: partial.cost_price ?? 0,
    member_prices: prices,
    warehouse_id: partial.warehouse_id ?? null,
    spec: partial.spec ?? '',
    bm_code: partial.bm_code ?? '',
    remark: partial.remark ?? ''
  }
}

function ensureMemberPriceKeys() {
  unitRows.value.forEach(row => {
    memberLevels.value.forEach(level => {
      if (row.member_prices[level.id] === undefined) row.member_prices[level.id] = 0
    })
  })
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getProducts({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { code: '', name: '', category_id: null, brand_id: null }); handleSearch() }

function statusText(status: number) {
  const map: Record<number, string> = { 1: '正常', 0: '下架', 2: '停售', 3: '停产' }
  return map[Number(status)] || '未知'
}

function statusTagType(status: number) {
  const map: Record<number, 'success' | 'info' | 'warning' | 'danger'> = { 1: 'success', 0: 'info', 2: 'warning', 3: 'danger' }
  return map[Number(status)] || 'info'
}

function firstProductImage(row: any) {
  const images = normalizeImageUrls(row.image_urls)
  return images[0] ? assetUrl(images[0]) : ''
}

const detailImages = computed(() => normalizeImageUrls(detailData.value?.image_urls))

function formatMoney(value: any) {
  const amount = Number(value || 0)
  return amount.toFixed(2)
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(3)))
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function emptyText(value: any) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function lookupName(listRef: any, id: any) {
  const list = Array.isArray(listRef?.value) ? listRef.value : []
  return list.find((item: any) => item.id === id)?.name || ''
}

function handleAdd() {
  editId.value = null
  dialogTitle.value = '新增产品'
  resetForm()
  unitRows.value = [createUnitRow({
    unit_id: form.unit_id || getDefaultUnit(units.value)?.id || units.value[0]?.id || null,
    is_base: true
  })]
  activeTab.value = 'basic'
  dialogVisible.value = true
}

async function handleEdit(row: any) {
  editId.value = row.id
  dialogTitle.value = '编辑产品'
  resetForm()
  const res: any = await getProduct(row.id)
  const detail = res.data || row
  Object.assign(form, {
    code: detail.code || '',
    name: detail.name || '',
    spec: detail.spec || '',
    category_id: detail.category_id || null,
    brand_id: detail.brand_id || null,
    default_supplier_id: detail.default_supplier_id || null,
    unit_id: detail.unit_id || null,
    status: detail.status ?? 1,
    cost_price: detail.cost_price || 0,
    sale_price: detail.sale_price || 0,
    description: detail.description || ''
    ,
    image_urls: normalizeImageUrls(detail.image_urls)
  })
  const firstWarehouseId = detail.units?.find?.((item: any) => item.warehouse_id)?.warehouse_id || null
  unitMeta.defaultWarehouseId = firstWarehouseId
  unitRows.value = (detail.units || []).map((item: any) => createUnitRow({
    unit_id: item.unit_id || null,
    is_base: item.is_base === 1,
    base_quantity: item.base_quantity || 1,
    code: item.code || '',
    weight: item.weight || 0,
    volume: item.volume || 0,
    sale_price: item.sale_price || 0,
    cost_price: item.cost_price || 0,
    member_prices: item.member_prices || {},
    warehouse_id: item.warehouse_id || null,
    spec: item.spec || '',
    bm_code: item.bm_code || '',
    remark: item.remark || ''
  }))
  if (!unitRows.value.length) unitRows.value = [createUnitRow({ unit_id: form.unit_id, is_base: true })]
  ensureBaseRow()
  activeTab.value = 'basic'
  dialogVisible.value = true
}

async function handleDetail(row: any) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = { ...row, units: [] }
  try {
    const res: any = await getProduct(row.id)
    detailData.value = {
      ...row,
      ...(res.data || {}),
      stock_total: row.stock_total ?? res.data?.stock_total ?? 0,
      category_name: row.category_name || '',
      brand_name: row.brand_name || '',
      supplier_name: row.supplier_name || '',
      unit_count: row.unit_count ?? res.data?.units?.length ?? 0
    }
  } finally {
    detailLoading.value = false
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该产品？', '提示', { type: 'warning' })
  await deleteProduct(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

function ensureBaseRow() {
  if (!unitRows.value.length) return
  unitRows.value.forEach((row, index) => { row.is_base = index === 0 })
  unitRows.value[0].base_quantity = 1
}

function addUnitRow() {
  unitRows.value.push(createUnitRow())
  ensureBaseRow()
}

function copyUnitRow(row: UnitRow) {
  unitRows.value.push(createUnitRow({
    ...row,
    is_base: false,
    member_prices: { ...row.member_prices }
  }))
  ensureBaseRow()
}

function removeUnitRow(index: number) {
  unitRows.value.splice(index, 1)
  ensureBaseRow()
}

function syncFirstUnit(index: number) {
  if (index === 0) form.unit_id = unitRows.value[0].unit_id
}

function unitRowClass({ row }: { row: UnitRow }) {
  return row.is_base ? 'base-unit-row' : ''
}

function buildPayload() {
  ensureBaseRow()
  const first = unitRows.value[0]
  return {
    ...form,
    unit_id: form.unit_id || first?.unit_id || 0,
    spec: form.spec || first?.spec || unitMeta.spec || '',
    cost_price: form.cost_price || first?.cost_price || 0,
    sale_price: form.sale_price || first?.sale_price || 0,
    default_supplier_id: form.default_supplier_id || 0,
    image_urls: form.image_urls,
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
  const payload = buildPayload()
  if (editId.value) {
    await updateProduct(editId.value, payload)
    ElMessage.success('更新成功')
  } else {
    await createProduct(payload)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  fetchData()
}

function resetForm() {
  Object.assign(form, {
    code: '',
    name: '',
    spec: '',
    category_id: null,
    brand_id: null,
    default_supplier_id: null,
    unit_id: null,
    status: 1,
    cost_price: 0,
    sale_price: 0,
    description: '',
    image_urls: []
  })
  Object.assign(unitMeta, { defaultWarehouseId: null, spec: '', bmCode: '', remark: '' })
  unitRows.value = []
  formRef.value?.clearValidate()
}

const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }

function assetUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url
}

function normalizeImageUrls(value: any) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) ElMessage.error('只能上传图片')
  if (!isLt2M) ElMessage.error('图片大小不能超过2MB')
  return isImage && isLt2M
}

function handleImageSuccess(res: any) {
  if (res.code === 0) {
    form.image_urls = [res.data.url]
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(res.message || '上传失败')
  }
}

function removeProductImage() {
  form.image_urls = []
}

function handleImport() { ElMessage.info('导入功能请调用后端产品导入接口') }
function handleExport() { ElMessage.info('导出功能请调用后端产品导出接口') }

onMounted(async () => {
  fetchData()
  const [cRes, bRes, uRes, wRes, sRes, lRes]: any[] = await Promise.all([
    getCategories(),
    getBrands(),
    getUnits(),
    getWarehouses(),
    getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
    getEnabledMemberLevels()
  ])
  categories.value = cRes.data || []
  brands.value = bRes.data || []
  units.value = uRes.data || []
  warehouses.value = wRes.data || []
  suppliers.value = sRes.data?.list || sRes.data || []
  memberLevels.value = lRes.data || []
  ensureMemberPriceKeys()
})
</script>

<style scoped>
.page-container {
  height: 100%;
}
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 10px;
}
.search-wide-select {
  width: 220px;
}
.product-thumb {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  vertical-align: middle;
}
.empty-cell {
  color: #c0c4cc;
}
.product-tabs {
  min-height: 520px;
}
.basic-form {
  width: 450px;
}
.basic-form :deep(.el-select) {
  width: 100%;
}
.product-image-uploader {
  display: inline-flex;
  vertical-align: top;
}
.product-image-uploader :deep(.el-upload) {
  width: 72px;
  height: 72px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-image-preview {
  width: 72px;
  height: 72px;
  border-radius: 4px;
  object-fit: cover;
}
.product-image-placeholder {
  color: #c0c4cc;
  font-size: 28px;
}
.image-remove {
  margin-left: 12px;
}
.unit-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.unit-table {
  width: 100%;
}
.unit-table :deep(.el-input-number) {
  width: 100%;
}
.unit-table :deep(.base-unit-row td) {
  background: #fafafa;
}
.unit-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.unit-select {
  width: 96px;
}
.help-icon {
  color: #e6a23c;
  vertical-align: -2px;
}
.unit-actions {
  display: flex;
  gap: 8px;
}
.unit-extra {
  display: grid;
  grid-template-columns: 36px repeat(4, minmax(160px, 1fr));
  gap: 8px;
  align-items: center;
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}
.image-placeholder {
  width: 32px;
  height: 32px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  color: #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.code-rule-field {
  position: relative;
}
.code-rule-tip {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  min-width: 310px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  line-height: 1.8;
  color: #303133;
  font-size: 12px;
}
.product-detail {
  min-height: 240px;
}
.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.detail-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.detail-image-block {
  width: 100%;
}
.detail-image {
  width: 140px;
  height: 140px;
  border-radius: 4px;
}
.detail-image-empty {
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  color: #909399;
}
.detail-section-title {
  font-weight: 600;
  color: #303133;
}
.detail-unit-table {
  width: 100%;
}
@media (max-width: 900px) {
  .unit-extra {
    grid-template-columns: 1fr;
  }
}
</style>
