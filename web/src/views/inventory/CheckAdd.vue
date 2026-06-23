<template>
  <div class="check-add-page">
    <div class="page-title">
      <el-button link :icon="Back" @click="router.push('/inventory/check')" />
      <span class="title-divider"></span>
      <strong>库存盘点添加</strong>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" class="check-form">
      <div class="form-grid">
        <el-form-item label="盘点单号" required>
          <el-input v-model="form.check_no" disabled />
        </el-form-item>
        <el-form-item label="仓库" prop="warehouse_id">
          <el-select v-model="form.warehouse_id" placeholder="请选择..." filterable @change="handleWarehouseChange">
            <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="盘点状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择...">
            <el-option label="待盘点" :value="0" />
            <el-option label="审核中" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="盘点人员">
          <el-input v-model="form.checker_name" disabled />
        </el-form-item>
        <el-form-item label="盘点时间" prop="check_time">
          <el-date-picker
            v-model="form.check_time"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="盘点时间"
          />
        </el-form-item>
        <el-form-item label="单据备注">
          <el-input v-model="form.remark" type="textarea" :rows="1" placeholder="单据备注" />
        </el-form-item>
      </div>

      <div class="product-toolbar">
        <el-button type="primary" plain @click="openProductDrawer">选择产品</el-button>
        <el-input v-model="quickKeyword" clearable placeholder="产品ID/编码/条形码">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" :icon="Plus" @click="addFirstQuickProduct">添加</el-button>
      </div>

      <el-table border :data="form.items" class="detail-table" stripe>
        <template #empty>
          <div class="empty-products">
            <el-icon :size="78"><ShoppingCart /></el-icon>
            <el-button link type="primary" @click="openProductDrawer">选择产品</el-button>
          </div>
        </template>
        <el-table-column prop="product_name" label="产品标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="code" label="产品编码" width="150" show-overflow-tooltip />
        <el-table-column prop="spec" label="产品规格" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.spec) }}</template>
        </el-table-column>
        <el-table-column prop="unit_name" label="计量单位" width="120">
          <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
        </el-table-column>
        <el-table-column label="单位基准数" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
        </el-table-column>
        <el-table-column label="盘点前库存" width="130" align="right">
          <template #default="{ row }">{{ formatQuantity(row.book_quantity) }}</template>
        </el-table-column>
        <el-table-column label="盘点后库存" width="150" align="right">
          <template #header><span>盘点后库存 <span class="edit-mark">✎</span></span></template>
          <template #default="{ row }">
            <el-input-number
              v-model="row.actual_quantity"
              :min="0"
              :precision="2"
              :controls="false"
            />
          </template>
        </el-table-column>
        <el-table-column label="差异数量" width="120" align="right">
          <template #default="{ row }">
            <span :class="differenceClass(row)">{{ formatSignedQuantity(row.actual_quantity - row.book_quantity) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="160">
          <template #default="{ row }"><el-input v-model="row.remark" placeholder="备注" /></template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" link @click="form.items.splice($index, 1)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-form>

    <div class="page-footer">
      <div class="footer-actions">
        <el-button @click="printAsPdf">导出PDF</el-button>
        <el-button @click="windowPrint">打印</el-button>
        <el-button :loading="submitting" @click="submitForm(false)">保存</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm(true)">提交</el-button>
      </div>
      <div class="totals">
        <span>条数 <strong>{{ form.items.length }}</strong></span>
        <span>数量 <strong>{{ formatQuantity(totalQuantity) }}</strong></span>
      </div>
    </div>

    <el-drawer v-model="productDrawerVisible" title="选择产品" size="62%" direction="rtl" class="product-drawer">
      <div class="drawer-filter">
        <el-select v-model="drawerFilters.category_id" placeholder="产品分类..." clearable filterable>
          <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="drawerFilters.brand_id" placeholder="品牌..." clearable filterable>
          <el-option v-for="item in brands" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-input v-model="drawerFilters.keyword" clearable placeholder="产品名称/首字母/简述/编码">
          <template #append>
            <el-button :icon="Search">搜索</el-button>
          </template>
        </el-input>
      </div>

      <el-table border :data="drawerProducts" class="drawer-product-table" height="calc(100vh - 190px)" stripe>
        <el-table-column width="44">
          <template #default="{ row }">
            <el-checkbox :model-value="isProductAdded(row.id)" @change="toggleDrawerProduct(row)" />
          </template>
        </el-table-column>
        <el-table-column label="产品信息" min-width="220">
          <template #default="{ row }">
            <div class="drawer-product-info">
              <img v-if="firstProductImage(row)" :src="firstProductImage(row)" alt="" />
              <span v-else class="product-avatar-placeholder"></span>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="数量/单位/基准数" width="250">
          <template #default="{ row }">
            <div class="drawer-unit-row">
              <el-input-number v-model="selectorState(row).quantity" :min="0" :precision="2" :controls="false" />
              <el-select v-model="selectorState(row).unit_name">
                <el-option :label="productUnitName(row)" :value="productUnitName(row)" />
              </el-select>
              <el-tooltip
                :content="form.warehouse_id ? `当前仓库库存：${formatQuantity(stockQuantity(row.id))}` : '选择仓库后显示库存'"
                placement="top"
              >
                <el-icon class="unit-cube"><Box /></el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="当前库存" width="110" align="right">
          <template #default="{ row }">
            {{ form.warehouse_id ? formatQuantity(stockQuantity(row.id)) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
        <el-table-column prop="code" label="编码" width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button v-if="isProductAdded(row.id)" type="danger" link @click="removeProductById(row.id)">移除</el-button>
            <el-button v-else type="primary" link @click="addProduct(row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="productDrawerVisible = false">取消</el-button>
          <el-button type="primary" @click="productDrawerVisible = false">确认</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Back, Box, Plus, Search, ShoppingCart } from '@element-plus/icons-vue'
import { getBrands } from '@/api/brand'
import { getCategories } from '@/api/category'
import { createCheck, getStocks } from '@/api/inventory'
import { getProducts } from '@/api/product'
import { getUnits } from '@/api/unit'
import { getWarehouses } from '@/api/warehouse'
import { useUserStore } from '@/stores/user'
import { getDefaultUnitName, getPreferredProductUnit } from '@/utils/unit'

interface CheckItem {
  product_id: number
  product_name: string
  code: string
  spec: string
  unit_name: string
  base_quantity: number
  book_quantity: number
  actual_quantity: number
  remark: string
}

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const productDrawerVisible = ref(false)
const quickKeyword = ref('')
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const stocks = ref<any[]>([])
const selectorStates = reactive<Record<number, { quantity: number; unit_name: string; base_quantity: number }>>({})
const drawerFilters = reactive({
  category_id: null as number | null,
  brand_id: null as number | null,
  keyword: ''
})
const form = reactive({
  check_no: 'IC{date}{time}{id}******',
  warehouse_id: null as number | null,
  status: 0,
  checker_name: userStore.userInfo?.real_name || userStore.userInfo?.username || '',
  check_time: formatNow(),
  remark: '',
  items: [] as CheckItem[]
})
const rules: FormRules = {
  warehouse_id: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  status: [{ required: true, message: '请选择盘点状态', trigger: 'change' }],
  check_time: [{ required: true, message: '请选择盘点时间', trigger: 'change' }]
}
const stockMap = computed(() => {
  const map = new Map<number, number>()
  stocks.value.forEach(item => map.set(Number(item.product_id), Number(item.quantity || 0)))
  return map
})
const totalQuantity = computed(() => (
  form.items.reduce((sum, item) => sum + Number(item.actual_quantity || 0), 0)
))
const drawerProducts = computed(() => filterProducts(
  drawerFilters.keyword,
  drawerFilters.category_id,
  drawerFilters.brand_id
))
const quickProducts = computed(() => {
  const keyword = quickKeyword.value.trim().toLowerCase()
  if (!keyword) return []
  return products.value.filter(product => productMatches(product, keyword))
})

async function loadStocks() {
  if (!form.warehouse_id) {
    stocks.value = []
    return
  }
  const res: any = await getStocks({
    page: 1,
    pageSize: 1000,
    warehouse_id: form.warehouse_id
  })
  stocks.value = res.data?.list || []
}

async function handleWarehouseChange() {
  await loadStocks()
  form.items.forEach(item => {
    const quantity = stockQuantity(item.product_id)
    item.book_quantity = quantity
    item.actual_quantity = quantity
  })
}

function openProductDrawer() {
  productDrawerVisible.value = true
}

function toggleDrawerProduct(product: any) {
  if (isProductAdded(product.id)) {
    removeProductById(product.id)
  } else {
    addProduct(product)
  }
}

function addProduct(product: any) {
  if (isProductAdded(product.id)) return
  form.items.push(createCheckItem(product))
}

function removeProductById(productId: number) {
  form.items = form.items.filter(item => item.product_id !== productId)
}

function isProductAdded(productId: number) {
  return form.items.some(item => item.product_id === productId)
}

function addFirstQuickProduct() {
  const product = quickProducts.value[0]
  if (!product) {
    ElMessage.warning('未找到匹配的产品')
    return
  }
  if (form.items.some(item => item.product_id === product.id)) {
    ElMessage.info('该产品已添加')
    return
  }
  addProduct(product)
  quickKeyword.value = ''
}

function createCheckItem(product: any): CheckItem {
  const quantity = stockQuantity(product.id)
  return {
    product_id: product.id,
    product_name: product.name || '',
    code: product.code || '',
    spec: product.spec || '',
    unit_name: productUnitName(product),
    base_quantity: productBaseQuantity(product),
    book_quantity: quantity,
    actual_quantity: quantity,
    remark: ''
  }
}

async function submitForm(submit: boolean) {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!form.items.length) {
    ElMessage.warning('请至少选择一个产品')
    return
  }
  form.status = submit ? 4 : 0
  submitting.value = true
  try {
    await createCheck({
      warehouse_id: form.warehouse_id,
      checker_name: form.checker_name,
      check_time: form.check_time,
      remark: form.remark,
      submit,
      items: form.items.map(item => ({
        product_id: item.product_id,
        book_quantity: Number(item.book_quantity || 0),
        actual_quantity: Number(item.actual_quantity || 0),
        remark: item.remark
      }))
    })
    ElMessage.success(submit ? '盘点单提交成功' : '盘点单保存成功')
    router.push('/inventory/check')
  } finally {
    submitting.value = false
  }
}

function productMatches(product: any, keyword: string) {
  return [product.id, product.name, product.code, product.barcode, product.spec]
    .some(value => String(value || '').toLowerCase().includes(keyword))
}

function filterProducts(keyword = '', categoryId: any = '', brandId: any = '') {
  const text = keyword.trim().toLowerCase()
  return products.value.filter(product => {
    const matchedText = !text || productMatches(product, text)
    const matchedCategory = !categoryId || product.category_id === categoryId
    const matchedBrand = !brandId || product.brand_id === brandId
    return matchedText && matchedCategory && matchedBrand
  })
}

function selectorState(product: any) {
  if (!selectorStates[product.id]) {
    selectorStates[product.id] = {
      quantity: 1,
      unit_name: productUnitName(product),
      base_quantity: productBaseQuantity(product)
    }
  }
  return selectorStates[product.id]
}

function productUnitName(product: any) {
  return getPreferredProductUnit(product, units.value)?.unit_name || getDefaultUnitName(units.value)
}

function productBaseQuantity(product: any) {
  return Number(getPreferredProductUnit(product, units.value)?.base_quantity || 1)
}

function productUnits(product: any) {
  if (!product?.units) return []
  if (Array.isArray(product.units)) return product.units
  if (typeof product.units === 'string') {
    try {
      const parsed = JSON.parse(product.units)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function firstProductImage(product: any) {
  const images = normalizeImageUrls(product.image_urls)
  return images[0] || ''
}

function normalizeImageUrls(value: any) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return [value]
    }
  }
  return []
}

function stockQuantity(productId: number) {
  return Number(stockMap.value.get(Number(productId)) || 0)
}

function differenceClass(row: CheckItem) {
  const difference = Number(row.actual_quantity) - Number(row.book_quantity)
  if (difference > 0) return 'difference-positive'
  if (difference < 0) return 'difference-negative'
  return ''
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}

function formatSignedQuantity(value: any) {
  const quantity = Number(value || 0)
  return quantity > 0 ? `+${formatQuantity(quantity)}` : formatQuantity(quantity)
}

function emptyText(value: any) {
  return value === undefined || value === null || value === '' ? '-' : value
}

function formatNow() {
  const date = new Date()
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function windowPrint() {
  window.print()
}

function printAsPdf() {
  ElMessage.info('请在打印窗口中选择“另存为 PDF”')
  window.print()
}

function listOf(res: any) {
  return res.data?.list || res.data || []
}

onMounted(async () => {
  const [warehouseRes, productRes, categoryRes, brandRes, unitRes]: any[] = await Promise.all([
    getWarehouses({ page: 1, pageSize: 1000, status: 1 }),
    getProducts({ page: 1, pageSize: 1000, status: 1 }),
    getCategories(),
    getBrands(),
    getUnits()
  ])
  warehouses.value = listOf(warehouseRes)
  products.value = listOf(productRes)
  categories.value = listOf(categoryRes)
  brands.value = listOf(brandRes)
  units.value = listOf(unitRes)
})
</script>

<style scoped>
.check-add-page {
  min-height: calc(100vh - 100px);
  padding: 16px 14px 0;
  background: #fff;
  border-radius: 4px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  margin-bottom: 18px;
}

.title-divider {
  width: 1px;
  height: 16px;
  background: #dcdfe6;
}

.check-form {
  padding-bottom: 76px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  column-gap: 54px;
}

.form-grid :deep(.el-select),
.form-grid :deep(.el-date-editor),
.form-grid :deep(.el-input) {
  width: 100%;
}

.product-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
}

.product-toolbar .el-input {
  width: 260px;
}

.detail-table :deep(.el-table__empty-block) {
  min-height: 420px;
}

.detail-table :deep(.el-table__empty-text) {
  width: 100%;
}

.detail-table :deep(.el-input-number) {
  width: 100%;
}

.empty-products {
  min-height: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7655e7;
}

.edit-mark {
  color: #409eff;
}

.difference-positive {
  color: #67c23a;
}

.difference-negative {
  color: #f56c6c;
}

.page-footer {
  position: fixed;
  right: 20px;
  bottom: 0;
  left: 240px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 10px 28px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.totals {
  display: flex;
  gap: 24px;
  color: #606266;
}

.totals strong {
  color: #303133;
}

.drawer-filter {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 18px;
  padding: 2px 0 12px;
}

.drawer-product-table :deep(.el-input-number) {
  width: 80px;
}

.drawer-product-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-product-info img,
.product-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f2f5;
}

.drawer-unit-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drawer-unit-row .el-select {
  width: 70px;
}

.unit-cube {
  color: #409eff;
}

.drawer-footer {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
}

@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}

@media print {
  .page-title button,
  .product-toolbar,
  .page-footer,
  :deep(.el-table__fixed-right) {
    display: none !important;
  }
}
</style>
