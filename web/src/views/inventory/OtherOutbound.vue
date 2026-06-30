<template>
  <div class="page-container">
    <template v-if="editorVisible">
      <div class="editor-page">
        <div class="editor-title">
          <el-button link @click="leaveEditor">←</el-button>
          <span>其他出库单添加</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px" class="outbound-form">
          <div class="outbound-form-grid">
            <el-form-item label="出库单号" required>
              <el-input v-model="form.outbound_no" />
            </el-form-item>
            <el-form-item label="仓库" prop="warehouse_id" required>
              <el-select v-model="form.warehouse_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="出库状态" prop="status" required>
              <el-select v-model="form.status" placeholder="请选择...">
                <el-option label="待出库" :value="0" />
                <el-option label="已出库" :value="1" />
                <el-option label="已取消" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="客户" prop="customer_id" required>
              <el-select v-model="form.customer_id" placeholder="请选择..." clearable filterable @change="handleCustomerChange">
                <el-option v-for="item in customers" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="管理备注">
              <el-input v-model="form.admin_remark" type="textarea" :rows="1" placeholder="管理备注" />
            </el-form-item>
            <el-form-item label="单据备注">
              <el-input v-model="form.outbound_remark" type="textarea" :rows="1" placeholder="单据备注" />
            </el-form-item>
            <el-form-item label="收货信息" class="receiving-form-item">
              <div class="receiving-fields">
                <el-input v-model="form.contact" placeholder="客户联系人" />
                <el-input v-model="form.phone" placeholder="客户联系电话" />
                <el-input v-model="form.address" placeholder="详细地址" />
              </div>
            </el-form-item>
            <el-form-item label="快递名称">
              <el-input v-model="form.express_name" placeholder="快递名称" />
            </el-form-item>
            <el-form-item label="快递单号">
              <el-input v-model="form.express_no" placeholder="快递单号" />
            </el-form-item>
          </div>

          <div class="product-actions">
            <el-button type="primary" plain @click="openProductDrawer">选择产品</el-button>
            <el-button type="primary" plain @click="addBlankItem">添加产品</el-button>
            <el-input v-model="bottomProductKeyword" clearable placeholder="产品ID/编码/条形码">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>

          <el-table border :data="form.items" class="outbound-detail-table" stripe>
            <template #empty>
              <div class="empty-outbound">
                <div class="cart-line">▱</div>
                <div>
                  <el-button link type="primary" @click="openProductDrawer">选择产品</el-button>
                  <el-button link type="primary" @click="addBlankItem">添加产品</el-button>
                </div>
              </div>
            </template>
            <el-table-column label="产品标题" min-width="260">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ row.product_name }}</span>
                <el-input v-else v-model="row.product_name" placeholder="产品标题" />
              </template>
            </el-table-column>
            <el-table-column label="产品编码" width="140">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ emptyText(row.code) }}</span>
                <el-input v-else v-model="row.code" placeholder="产品编码" />
              </template>
            </el-table-column>
            <el-table-column label="产品规格" width="140">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ emptyText(row.spec) }}</span>
                <el-input v-else v-model="row.spec" placeholder="产品规格" />
              </template>
            </el-table-column>
            <el-table-column label="计量单位" width="120">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ emptyText(row.unit_name) }}</span>
                <el-select v-else v-model="row.unit_name" placeholder="选择" clearable filterable>
                  <el-option v-for="unit in unitOptions" :key="unit" :label="unit" :value="unit" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="单位基准数" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-if="!row.product_id" v-model="row.base_quantity" :min="1" :controls="false" />
                <span v-else>{{ formatQuantity(row.base_quantity) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="出库数量" width="140" align="right">
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="0.01" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="仓位" width="140">
              <template #default="{ row }">
                <el-input v-model="row.location" placeholder="仓位" />
              </template>
            </el-table-column>
            <el-table-column label="出库价格" width="140" align="right">
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="税金" width="130" align="right">
              <template #default="{ row }">
                <el-input-number v-model="row.tax" :min="0" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="总价" width="130" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ $index }">
                <el-dropdown trigger="hover">
                  <el-button type="primary" link>更多</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="removeItem($index)">移除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <el-table v-if="bottomProductResults.length" :data="bottomProductResults" border class="search-result-table">
            <el-table-column prop="name" label="产品名称" min-width="220" show-overflow-tooltip />
            <el-table-column label="出库价" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(productPrice(row)) }}</template>
            </el-table-column>
            <el-table-column label="计量单位/单位基准数" width="180">
              <template #default="{ row }">{{ productUnitName(row) }}/{{ productBaseQuantity(row) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-dropdown trigger="hover">
                  <el-button type="primary" link>更多</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="isProductAdded(row.id)" @click="removeProductById(row.id)">移除</el-dropdown-item>
                      <el-dropdown-item v-else @click="addProduct(row)">添加</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </el-form>

        <div class="editor-footer">
          <div>
            <el-button @click="handleExportPdf">导出PDF</el-button>
            <el-button @click="handlePrint">打印</el-button>
            <el-button :loading="submitting" @click="handleSave()">保存</el-button>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
          </div>
          <div class="total-bar">
            <span>条数 {{ form.items.length }}</span>
            <span>数量 {{ formatQuantity(totalQuantity) }}</span>
            <span>税金：¥{{ formatMoney(totalTax) }}</span>
            <strong>总价：¥{{ formatMoney(totalAmount) }}</strong>
          </div>
        </div>
      </div>

      <el-drawer v-model="productDrawerVisible" title="选择产品" size="62%" direction="rtl">
        <div class="drawer-filter">
          <el-select v-model="drawerFilters.category_id" placeholder="产品分类..." clearable filterable>
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <el-select v-model="drawerFilters.brand_id" placeholder="品牌..." clearable filterable>
            <el-option v-for="item in brands" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <el-input v-model="drawerFilters.keyword" placeholder="产品名称/首字母/简述/编码" clearable>
            <template #append><el-button :icon="Search">搜索</el-button></template>
          </el-input>
        </div>
        <el-table border :data="drawerProducts" height="calc(100vh - 190px)" stripe>
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
                <el-input-number v-model="selectorState(row).quantity" :min="0.01" :precision="2" :controls="false" />
                <el-select v-model="selectorState(row).unit_name">
                  <el-option :label="productUnitName(row)" :value="productUnitName(row)" />
                </el-select>
                <el-tooltip :content="`当前库存：${formatQuantity(row.stock_total)}`" placement="top">
                  <el-icon class="unit-cube"><Box /></el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="出库价" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(productPrice(row)) }}</template>
          </el-table-column>
        </el-table>
        <template #footer>
          <div class="drawer-footer">
            <el-button @click="productDrawerVisible = false">取消</el-button>
            <el-button type="primary" @click="productDrawerVisible = false">确认</el-button>
          </div>
        </template>
      </el-drawer>
    </template>

    <el-card v-else>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
      </div>

      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="出库单号/客户" clearable />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="item in customers" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse_id" placeholder="请选择" clearable filterable>
            <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="出库状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待出库" :value="0" />
            <el-option label="已出库" :value="1" />
            <el-option label="已取消" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
      </SearchForm>

      <TableColumnTools table-key="inventory-other-outbound" filename="其他出库单" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="出库单id" width="100" />
        <el-table-column prop="outbound_no" label="出库单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.outbound_no" /></template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.customer_name) }}</template>
        </el-table-column>
        <el-table-column prop="warehouse_name" label="仓库" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.warehouse_name) }}</template>
        </el-table-column>
        <el-table-column label="出库状态" width="110">
          <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="单价" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.unit_price) }}</template>
        </el-table-column>
        <el-table-column label="税金" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.tax_amount) }}</template>
        </el-table-column>
        <el-table-column label="总价" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="产品总数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.product_total_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.contact) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.phone) }}</template>
        </el-table-column>
        <el-table-column prop="address" label="收货地址" width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.address) }}</template>
        </el-table-column>
        <el-table-column prop="express_name" label="快递名称" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.express_name) }}</template>
        </el-table-column>
        <el-table-column prop="express_no" label="快递单号" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.express_no) }}</template>
        </el-table-column>
        <el-table-column prop="admin_remark" label="管理员备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.admin_remark) }}</template>
        </el-table-column>
        <el-table-column prop="outbound_remark" label="出库单备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.outbound_remark || row.remark) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.completed_time) }}</template>
        </el-table-column>
        <el-table-column label="审核时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.audit_time) }}</template>
        </el-table-column>
        <el-table-column label="提审时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.submit_time) }}</template>
        </el-table-column>
        <el-table-column label="取消时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.cancel_time) }}</template>
        </el-table-column>
        <el-table-column label="关闭时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.close_time) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleView(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-drawer v-model="detailDrawerVisible" title="其他出库单详情" size="72%" direction="rtl" class="detail-drawer">
      <el-tabs v-model="detailActiveTab">
        <el-tab-pane label="基础信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="出库单ID">{{ emptyText(detailData.id) }}</el-descriptions-item>
            <el-descriptions-item label="出库单号"><CopyableNo :value="detailData.outbound_no" /></el-descriptions-item>
            <el-descriptions-item label="出库状态">
              <el-tag :type="statusTagType(detailData.status)" size="small">{{ statusText(detailData.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="客户">{{ emptyText(detailData.customer_name) }}</el-descriptions-item>
            <el-descriptions-item label="出库仓库">{{ emptyText(detailData.warehouse_name) }}</el-descriptions-item>
            <el-descriptions-item label="产品总数量">{{ formatQuantity(detailProductTotalQuantity) }}</el-descriptions-item>
            <el-descriptions-item label="税金">¥{{ formatMoney(detailTaxAmount) }}</el-descriptions-item>
            <el-descriptions-item label="出库总金额">¥{{ formatMoney(detailData.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ emptyText(detailData.contact) }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ emptyText(detailData.phone) }}</el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="2">{{ emptyText(detailData.address) }}</el-descriptions-item>
            <el-descriptions-item label="快递名称">{{ emptyText(detailData.express_name) }}</el-descriptions-item>
            <el-descriptions-item label="快递单号">{{ emptyText(detailData.express_no) }}</el-descriptions-item>
            <el-descriptions-item label="管理员备注信息">{{ emptyText(detailData.admin_remark) }}</el-descriptions-item>
            <el-descriptions-item label="出库单备注信息">{{ emptyText(detailData.outbound_remark || detailData.remark) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ formatDateTime(detailData.completed_time) }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ formatDateTime(detailData.audit_time) }}</el-descriptions-item>
            <el-descriptions-item label="提审时间">{{ formatDateTime(detailData.submit_time) }}</el-descriptions-item>
            <el-descriptions-item label="取消时间">{{ formatDateTime(detailData.cancel_time) }}</el-descriptions-item>
            <el-descriptions-item label="关闭时间">{{ formatDateTime(detailData.close_time) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detailData.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDateTime(detailData.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="产品列表" name="items">
          <el-table border :data="detailData.items" stripe class="detail-item-table">
            <el-table-column prop="product_name" label="产品标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="code" label="产品编码" width="130" show-overflow-tooltip />
            <el-table-column prop="spec" label="产品规格" width="120" show-overflow-tooltip />
            <el-table-column label="计量单位" width="110">
              <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
            </el-table-column>
            <el-table-column label="单位基准数" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column label="出库数量" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
            </el-table-column>
            <el-table-column prop="location" label="仓位" width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ emptyText(row.location) }}</template>
            </el-table-column>
            <el-table-column label="单价" width="110" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
            </el-table-column>
            <el-table-column label="税金" width="100" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.tax) }}</template>
            </el-table-column>
            <el-table-column label="总价" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Box, Plus, Search, View } from '@element-plus/icons-vue'
import { getBrands } from '@/api/brand'
import { getCategories } from '@/api/category'
import { createOtherOutbound, getOtherOutbound, getOtherOutbounds } from '@/api/inventory'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import { getUnits } from '@/api/unit'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { getDefaultUnitName, getPreferredProductUnit } from '@/utils/unit'

interface OutboundItem {
  product_id: number | null
  product_name: string
  code: string
  spec: string
  unit_name: string
  base_quantity: number
  quantity: number
  price: number
  tax: number
  location: string
  amount: number
}

const loading = ref(false)
const submitting = ref(false)
const editorVisible = ref(false)
const productDrawerVisible = ref(false)
const detailDrawerVisible = ref(false)
const detailActiveTab = ref('basic')
const formRef = ref<FormInstance>()
const bottomProductKeyword = ref('')
const tableData = ref<any[]>([])
const customers = ref<any[]>([])
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const detailData = reactive<any>({ items: [] })
const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({
  keyword: '',
  customer_id: null as number | null,
  warehouse_id: null as number | null,
  status: null as number | null,
  dateRange: null as string[] | null
})
const drawerFilters = reactive({
  category_id: null as number | null,
  brand_id: null as number | null,
  keyword: ''
})
const selectorStates = reactive<Record<number, { quantity: number; unit_name: string; base_quantity: number }>>({})
const form = reactive({
  outbound_no: 'QC{date}{time}{id}******',
  customer_id: null as number | null,
  warehouse_id: null as number | null,
  status: null as number | null,
  contact: '',
  phone: '',
  address: '',
  express_name: '',
  express_no: '',
  admin_remark: '',
  outbound_remark: '',
  items: [] as OutboundItem[]
})
const formRules: FormRules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  warehouse_id: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  status: [{ required: true, message: '请选择出库状态', trigger: 'change' }]
}
const totalQuantity = computed(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0))
const totalTax = computed(() => form.items.reduce((sum, item) => sum + Number(item.tax || 0), 0))
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const detailProductTotalQuantity = computed(() => (
  (detailData.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
))
const detailTaxAmount = computed(() => (
  (detailData.items || []).reduce((sum: number, item: any) => sum + Number(item.tax || 0), 0)
))
const drawerProducts = computed(() => filterProducts(drawerFilters.keyword, drawerFilters.category_id, drawerFilters.brand_id))
const bottomProductResults = computed(() => (
  bottomProductKeyword.value.trim() ? filterProducts(bottomProductKeyword.value).slice(0, 8) : []
))
const unitOptions = computed(() => {
  const names = new Set<string>()
  units.value.forEach(unit => {
    if (unit.name) names.add(unit.name)
  })
  products.value.forEach(product => {
    if (product.unit_name) names.add(product.unit_name)
  })
  if (!names.size) names.add('个')
  return Array.from(names)
})

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      customer_id: searchForm.customer_id,
      warehouse_id: searchForm.warehouse_id,
      status: searchForm.status ?? ''
    }
    if (searchForm.dateRange?.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    const res: any = await getOtherOutbounds(params)
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  Object.assign(searchForm, {
    keyword: '',
    customer_id: null,
    warehouse_id: null,
    status: null,
    dateRange: null
  })
  handleSearch()
}

function resetForm() {
  Object.assign(form, {
    outbound_no: 'QC{date}{time}{id}******',
    customer_id: null,
    warehouse_id: warehouses.value[0]?.id || null,
    status: null,
    contact: '',
    phone: '',
    address: '',
    express_name: '',
    express_no: '',
    admin_remark: '',
    outbound_remark: '',
    items: []
  })
  bottomProductKeyword.value = ''
  productDrawerVisible.value = false
  formRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  editorVisible.value = true
}

function leaveEditor() {
  editorVisible.value = false
  productDrawerVisible.value = false
}

function handleCustomerChange(value: number) {
  const customer = customers.value.find(item => item.id === value)
  form.contact = customer?.contact || ''
  form.phone = customer?.phone || ''
  form.address = customer?.address || ''
}

async function handleView(row: any) {
  const res: any = await getOtherOutbound(row.id)
  Object.keys(detailData).forEach(key => delete detailData[key])
  Object.assign(detailData, row, res.data || {}, { items: res.data?.items || [] })
  detailActiveTab.value = 'basic'
  detailDrawerVisible.value = true
}

function createItem(): OutboundItem {
  return {
    product_id: null,
    product_name: '',
    code: '',
    spec: '',
    unit_name: getDefaultUnitName(units.value, ''),
    base_quantity: 1,
    quantity: 1,
    price: 0,
    tax: 0,
    location: '',
    amount: 0
  }
}

function addBlankItem() {
  form.items.push(createItem())
}

function openProductDrawer() {
  productDrawerVisible.value = true
}

function addProduct(product: any, quantity = 1) {
  const existing = form.items.find(item => item.product_id === product.id)
  if (existing) {
    existing.quantity = Number(quantity || existing.quantity || 1)
    recalculateRow(existing)
    return
  }
  const emptyRow = form.items.find(item => !item.product_id && !item.product_name && !item.code)
  const row = emptyRow || createItem()
  fillRowFromProduct(row, product, quantity)
  if (!emptyRow) form.items.push(row)
}

function removeProductById(productId: number) {
  form.items = form.items.filter(item => item.product_id !== productId)
}

function toggleDrawerProduct(product: any) {
  if (isProductAdded(product.id)) {
    removeProductById(product.id)
  } else {
    addProduct(product, selectorState(product).quantity)
  }
}

function fillRowFromProduct(row: OutboundItem, product: any, quantity = 1) {
  row.product_id = product.id
  row.product_name = product.name || ''
  row.code = product.code || ''
  row.spec = product.spec || ''
  row.unit_name = productUnitName(product)
  row.base_quantity = productBaseQuantity(product)
  row.quantity = Number(quantity || row.quantity || 1)
  row.price = productPrice(product)
  recalculateRow(row)
}

function recalculateRow(row: OutboundItem) {
  row.amount = Number((Number(row.quantity || 0) * Number(row.price || 0) + Number(row.tax || 0)).toFixed(2))
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSave(statusOverride?: number) {
  if (statusOverride !== undefined) form.status = statusOverride
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const items = form.items.filter(item => (
    (item.product_id || item.product_name.trim()) && Number(item.quantity) > 0
  ))
  if (!items.length) {
    ElMessage.warning('请至少添加一条产品明细')
    return
  }

  submitting.value = true
  try {
    await createOtherOutbound({
      outbound_no: form.outbound_no,
      customer_id: form.customer_id,
      warehouse_id: form.warehouse_id,
      status: form.status,
      contact: form.contact,
      phone: form.phone,
      address: form.address,
      express_name: form.express_name,
      express_no: form.express_no,
      admin_remark: form.admin_remark,
      outbound_remark: form.outbound_remark,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name.trim(),
        code: item.code.trim(),
        spec: item.spec.trim(),
        unit_name: item.unit_name,
        base_quantity: Number(item.base_quantity || 1),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        tax: Number(item.tax || 0),
        location: item.location
      }))
    })
    ElMessage.success('创建成功')
    leaveEditor()
    fetchData()
  } finally {
    submitting.value = false
  }
}

function handleSubmit() {
  handleSave(1)
}

function handlePrint() {
  window.print()
}

function handleExportPdf() {
  window.print()
}

function filterProducts(keyword = '', categoryId: any = '', brandId: any = '') {
  const text = keyword.trim().toLowerCase()
  return products.value.filter(product => {
    const matchedText = !text || [product.id, product.name, product.code, product.barcode, product.spec, product.description]
      .some(value => String(value || '').toLowerCase().includes(text))
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

function isProductAdded(productId: number) {
  return form.items.some(item => item.product_id === productId)
}

function productPrice(product: any) {
  return Number(product.sale_price || product.cost_price || 0)
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

function statusText(status: any) {
  const map: Record<number, string> = {
    0: '待出库',
    1: '已出库',
    2: '已取消'
  }
  return map[Number(status)] || '未知'
}

function statusTagType(status: any) {
  const map: Record<number, 'success' | 'warning' | 'danger' | 'info'> = {
    0: 'warning',
    1: 'success',
    2: 'danger'
  }
  return map[Number(status)] || 'info'
}

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
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

function listOf(res: any) {
  return res.data?.list || res.data || []
}

onMounted(async () => {
  fetchData()
  const [customerRes, warehouseRes, productRes, categoryRes, brandRes, unitRes]: any[] = await Promise.all([
    getSuppliers({ page: 1, pageSize: 1000, type: 'customer', status: 1 }),
    getWarehouses({ page: 1, pageSize: 1000, status: 1 }),
    getProducts({ page: 1, pageSize: 1000, status: 1 }),
    getCategories(),
    getBrands(),
    getUnits()
  ])
  customers.value = listOf(customerRes)
  warehouses.value = listOf(warehouseRes)
  products.value = listOf(productRes)
  categories.value = listOf(categoryRes)
  brands.value = listOf(brandRes)
  units.value = listOf(unitRes)
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.toolbar {
  margin-bottom: 16px;
}

.editor-page {
  min-height: 100%;
  background: #fff;
  padding: 16px 0 0;
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px 12px;
  border-bottom: 1px solid #f0f2f5;
  font-weight: 600;
}

.outbound-form {
  padding: 18px 12px 0;
}

.outbound-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  column-gap: 48px;
}

.outbound-form-grid :deep(.el-select),
.outbound-form-grid :deep(.el-input) {
  width: 100%;
}

.receiving-form-item {
  grid-column: span 2;
}

.receiving-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
  width: 100%;
}

.product-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 2px 0 12px;
}

.product-actions > .el-input {
  width: 300px;
}

.outbound-detail-table {
  width: 100%;
}

.outbound-detail-table :deep(.el-table__empty-block) {
  min-height: 320px;
}

.outbound-detail-table :deep(.el-table__empty-text) {
  width: 100%;
}

.outbound-detail-table :deep(.el-input-number),
.outbound-detail-table :deep(.el-select),
.outbound-detail-table :deep(.el-input) {
  width: 100%;
}

.empty-outbound {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b5cf6;
}

.cart-line {
  font-size: 76px;
  line-height: 1;
  color: #555;
}

.editor-footer {
  position: sticky;
  bottom: 0;
  z-index: 6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-top: 24px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.total-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  color: #606266;
}

.total-bar strong {
  color: #303133;
  font-size: 16px;
}

.search-result-table {
  width: 560px;
  margin: 10px 0 0 12px;
}

.drawer-filter {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 18px;
  padding: 2px 0 12px;
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

.drawer-unit-row :deep(.el-input-number) {
  width: 80px;
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

.detail-drawer :deep(.el-drawer__body) {
  padding-top: 0;
}

.detail-item-table {
  width: 100%;
}

@media (max-width: 1200px) {
  .outbound-form-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}
</style>

