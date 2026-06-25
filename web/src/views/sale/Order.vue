<template>
  <div class="page-container">
    <template v-if="editorVisible">
      <div class="editor-page">
        <div class="editor-title">
          <el-button link @click="leaveEditor">←</el-button>
          <span>{{ editorMode === 'add' ? '销售单添加' : editorMode === 'edit' ? '销售单编辑' : '销售单详情' }}</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px" :disabled="editorMode === 'view'" class="sale-form">
          <div class="sale-form-grid">
            <el-form-item label="销售单号" required>
              <el-input v-model="form.order_no" placeholder="S{date}{time}{id}******" />
            </el-form-item>
            <el-form-item label="职员">
              <el-select v-model="form.employee_id" placeholder="请选择..." clearable filterable>
                <el-option v-for="employee in employees" :key="employee.id" :label="employee.name" :value="employee.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="销售客户" prop="customer_id" required>
              <el-select v-model="form.customer_id" placeholder="请选择..." clearable filterable @change="handleCustomerChange">
                <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="付款方式">
              <el-select v-model="form.payment_method" placeholder="未确定" clearable>
                <el-option label="未确定" value="" />
                <el-option v-for="method in paymentMethodOptions" :key="method" :label="method" :value="method" />
              </el-select>
            </el-form-item>
            <el-form-item label="管理备注">
              <el-input v-model="form.admin_remark" type="textarea" :rows="1" placeholder="管理备注" />
            </el-form-item>
            <el-form-item label="单据备注">
              <el-input v-model="form.sale_remark" type="textarea" :rows="1" placeholder="单据备注" />
            </el-form-item>
            <el-form-item label="收货信息" class="receiver-form-item">
              <div class="receiver-fields">
                <el-input v-model="form.customer_contact" placeholder="客户联系人" />
                <el-input v-model="form.customer_phone" placeholder="客户联系电话" />
                <el-input v-model="form.detail_address" placeholder="详细地址" />
              </div>
            </el-form-item>
          </div>

          <div class="product-actions">
            <el-button type="primary" plain @click="openProductDrawer">选择产品</el-button>
            <el-button type="primary" plain @click="addBlankItem">添加产品</el-button>
            <el-input v-model="quickProductKeyword" clearable placeholder="产品ID/编码/条形码" class="quick-product-input" @keyup.enter="addFirstMatchedProduct">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-checkbox v-model="quickAddEnabled" />
          </div>

          <el-table border :data="form.items" class="sale-detail-table" stripe>
            <template #empty>
              <div class="empty-sale">
                <el-button link type="primary" @click="openProductDrawer">选择产品</el-button>
                <el-button link type="primary" @click="addBlankItem">添加产品</el-button>
              </div>
            </template>
            <el-table-column label="产品标题" min-width="260">
              <template #default="{ row }">
                <span v-if="row.product_id">{{ row.product_name }}</span>
                <el-select v-else v-model="row.product_id" placeholder="请选择产品" filterable clearable @change="handleInlineProductChange(row)">
                  <el-option v-for="product in products" :key="product.id" :label="product.name" :value="product.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="产品编码" width="140">
              <template #header>
                <span>产品编码 <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">{{ emptyText(row.code) }}</template>
            </el-table-column>
            <el-table-column label="产品规格" width="140">
              <template #default="{ row }">{{ emptyText(row.spec) }}</template>
            </el-table-column>
            <el-table-column label="计量单位" width="120">
              <template #default="{ row }">{{ emptyText(row.unit_name) }}</template>
            </el-table-column>
            <el-table-column label="单位基准数" width="120" align="center">
              <template #default="{ row }">{{ formatQuantity(row.base_quantity) }}</template>
            </el-table-column>
            <el-table-column label="销售数量" width="140" align="right">
              <template #header>
                <span>销售数量 <span class="edit-mark">✎</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="0.01" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="销售价格" width="140" align="right">
              <template #header>
                <span>销售价格 <span class="edit-mark">✎</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="税率" width="110" align="right">
              <template #header>
                <span>税率 <span class="edit-mark">✎</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.tax_rate" :min="0" :max="100" :precision="2" :controls="false" @change="recalculateRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="税金" width="120" align="right">
              <template #header>
                <span>税金 <span class="edit-mark">✎</span> <span class="help-dot">?</span></span>
              </template>
              <template #default="{ row }">
                <el-input-number v-model="row.tax" :min="0" :precision="2" :controls="false" @change="recalculateRow(row, false)" />
              </template>
            </el-table-column>
            <el-table-column label="销售总价" width="130" align="right">
              <template #default="{ row }">
                <el-input v-model="row.amount" disabled />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template #default="{ row }">
                <el-input v-model="row.remark" placeholder="备注" />
              </template>
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

          <div class="bottom-product-search">
            <el-input v-model="bottomProductKeyword" clearable placeholder="输入产品名称/首字母/简述/编码">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <span class="help-dot">?</span>
          </div>

          <el-table v-if="bottomProductResults.length" :data="bottomProductResults" border class="search-result-table">
            <el-table-column prop="name" label="产品名称" min-width="220" show-overflow-tooltip />
            <el-table-column label="单价" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(productPrice(row)) }}</template>
            </el-table-column>
            <el-table-column label="库存" width="110" align="right">
              <template #default="{ row }">{{ formatQuantity(row.stock_total) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
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

          <div v-if="editorMode === 'add'" class="delivery-options">
            <div class="delivery-checks">
              <el-checkbox v-model="form.create_delivery">创建发货单</el-checkbox>
              <el-checkbox v-model="form.ship" :disabled="!form.create_delivery">发货</el-checkbox>
            </div>
            <el-alert v-if="form.create_delivery || form.ship" :closable="false" type="warning" show-icon>
              <template #title>
                <span v-if="form.ship">勾选“发货”后，提交将自动审核销售单、创建发货单并扣减库存。</span>
                <span v-else>勾选“创建发货单”后，提交将自动审核销售单并创建待发货单，不扣减库存。</span>
              </template>
            </el-alert>
          </div>
        </el-form>

        <div class="editor-footer">
          <div class="footer-left">
            <el-button>导出PDF</el-button>
            <el-button>打印</el-button>
            <el-button v-if="editorMode !== 'view'" @click="handleSave">保存</el-button>
            <el-button v-if="editorMode !== 'view'" type="primary" @click="handleSubmitFromEditor">提交</el-button>
          </div>
          <div class="total-bar">
            <span>条数 <strong>{{ form.items.length }}</strong></span>
            <span>数量 <strong>{{ formatQuantity(totalQuantity) }}</strong></span>
            <span>税金: <strong>¥{{ formatMoney(totalTax) }}</strong></span>
            <span>总价: <strong>¥{{ formatMoney(totalAmount) }}</strong></span>
          </div>
        </div>
      </div>

      <el-drawer v-model="productDrawerVisible" title="选择产品" size="62%" direction="rtl" class="product-drawer">
        <div class="drawer-filter">
          <el-select v-model="drawerFilters.category_id" placeholder="产品分类..." clearable filterable>
            <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
          </el-select>
          <el-select v-model="drawerFilters.brand_id" placeholder="品牌..." clearable filterable>
            <el-option v-for="brand in brands" :key="brand.id" :label="brand.name" :value="brand.id" />
          </el-select>
          <el-input v-model="drawerFilters.keyword" placeholder="产品名称/首字母/简述/编码" clearable>
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
          <el-table-column label="销售价" width="120" align="right">
            <template #default="{ row }">¥{{ formatMoney(productPrice(row)) }}</template>
          </el-table-column>
          <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
          <el-table-column prop="code" label="编码" width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-dropdown trigger="hover">
                <el-button type="primary" link>更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="isProductAdded(row.id)" @click="removeProductById(row.id)">移除</el-dropdown-item>
                    <el-dropdown-item v-else @click="addProduct(row, selectorState(row).quantity)">选择</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
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
    </template>

    <el-card v-else>
      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="订单号"><el-input v-model="searchForm.order_no" placeholder="订单号" clearable /></el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customer_id" placeholder="请选择" clearable filterable>
            <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="草稿" :value="0" />
            <el-option label="待审核" :value="2" />
            <el-option label="进行中" :value="1" />
            <el-option label="已取消" :value="3" />
            <el-option label="已关闭" :value="4" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增销售单</el-button>
      </div>

      <TableColumnTools table-key="sale-order" filename="销售订单" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="销售单id" width="100" />
        <el-table-column prop="order_no" label="销售单号" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.customer_name) }}</template>
        </el-table-column>
        <el-table-column prop="employee_name" label="职员" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.employee_name) }}</template>
        </el-table-column>
        <el-table-column label="销售状态" width="100">
          <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="付款状态" width="100">
          <template #default="{ row }"><el-tag :type="paymentStatusTagType(row.payment_status)" size="small">{{ paymentStatusText(row.payment_status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="退货状态" width="100">
          <template #default="{ row }"><el-tag :type="returnFlagTagType(row.return_status)" size="small">{{ returnFlagText(row.return_status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="payment_method" label="付款方式" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.payment_method) }}</template>
        </el-table-column>
        <el-table-column label="付款总额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.payment_total_amount) }}</template>
        </el-table-column>
        <el-table-column label="单价" width="110" align="right">
          <template #default="{ row }">{{ row.unit_price === null || row.unit_price === undefined ? (Number(row.item_count || 0) > 1 ? '多产品' : '-') : `¥${formatMoney(row.unit_price)}` }}</template>
        </el-table-column>
        <el-table-column label="税金" width="110" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_tax) }}</template>
        </el-table-column>
        <el-table-column label="总价" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="产品总数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.product_total_quantity) }}</template>
        </el-table-column>
        <el-table-column label="退款金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.refund_amount) }}</template>
        </el-table-column>
        <el-table-column label="退货数量" width="120" align="right">
          <template #default="{ row }">{{ formatQuantity(row.return_quantity) }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.contact) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.phone) }}</template>
        </el-table-column>
        <el-table-column prop="detail_address" label="详细地址" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.detail_address) }}</template>
        </el-table-column>
        <el-table-column prop="sale_remark" label="销售单备注信息" width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyText(row.sale_remark) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.completed_time) }}</template>
        </el-table-column>
        <el-table-column label="发货完成时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.delivery_completed_time) }}</template>
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
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-dropdown
              v-if="Number(row.status) === 0 || Number(row.status) === 1 || Number(row.status) === 2 || [3, 4].includes(Number(row.status))"
              trigger="hover"
            >
              <el-button type="primary" link>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="Number(row.status) === 0 || (!saleAuditEnabled && Number(row.status) === 2)" @click="handleSubmit(row)">{{ saleAuditEnabled ? '提审' : '提交' }}</el-dropdown-item>
                  <el-dropdown-item v-if="saleAuditEnabled && [0, 2].includes(Number(row.status))" @click="handleAudit(row)">审核</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 0" @click="handleEdit(row)">编辑</el-dropdown-item>
                  <el-dropdown-item v-if="[0, 2].includes(Number(row.status))" @click="handleCancel(row)">取消</el-dropdown-item>
                  <el-dropdown-item v-if="Number(row.status) === 1" @click="handleClose(row)">关闭</el-dropdown-item>
                  <el-dropdown-item v-if="[3, 4].includes(Number(row.status))" @click="handleDelete(row)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Box, Plus, Search } from '@element-plus/icons-vue'
import {
  auditSaleOrder,
  cancelSaleOrder,
  closeSaleOrder,
  createSaleOrder,
  deleteSaleOrder,
  getSaleOrder,
  getSaleOrders,
  submitSaleOrder,
  updateSaleOrder
} from '@/api/sale'
import { getBrands } from '@/api/brand'
import { getCategories } from '@/api/category'
import { getAllEmployees } from '@/api/employee'
import { getProducts } from '@/api/product'
import { getSuppliers } from '@/api/supplier'
import { getSystemConfig } from '@/api/system'
import { getUnits } from '@/api/unit'
import { getWarehouses } from '@/api/warehouse'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import { returnFlagTagType, returnFlagText } from '@/utils/status'
import { getDefaultUnitName, getPreferredProductUnit } from '@/utils/unit'

interface SaleItem {
  id: number | null
  product_id: number | null
  product_name: string
  code: string
  spec: string
  unit_name: string
  base_quantity: number
  quantity: number
  price: number
  tax_rate: number
  tax: number
  amount: number
  remark: string
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const customers = ref<any[]>([])
const employees = ref<any[]>([])
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const editorVisible = ref(false)
const editorMode = ref<'add' | 'edit' | 'view'>('add')
const productDrawerVisible = ref(false)
const formRef = ref<FormInstance>()
const bottomProductKeyword = ref('')
const quickProductKeyword = ref('')
const quickAddEnabled = ref(true)
const initialized = ref(false)
const saleAuditEnabled = ref(true)

const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ order_no: '', customer_id: null as any, status: '' as any })
const drawerFilters = reactive({ category_id: null as any, brand_id: null as any, keyword: '' })
const selectorStates = reactive<Record<number, { quantity: number; unit_name: string; base_quantity: number }>>({})
const form = reactive({
  id: null as number | null,
  order_no: 'S{date}{time}{id}******',
  customer_id: null as any,
  employee_id: null as any,
  warehouse_id: null as any,
  status: 0,
  payment_method: '',
  admin_remark: '',
  sale_remark: '',
  customer_contact: '',
  customer_phone: '',
  detail_address: '',
  create_delivery: true,
  ship: false,
  items: [] as SaleItem[]
})

const formRules = {
  customer_id: [{ required: true, message: '请选择销售客户', trigger: 'change' }]
}
const paymentMethodOptions = ['账期结算', '预付款', '银行转账', '现金支付', '在线支付', '其他方式']
const totalQuantity = computed(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0))
const totalTax = computed(() => form.items.reduce((sum, item) => sum + Number(item.tax || 0), 0))
const totalAmount = computed(() => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const drawerProducts = computed(() => filterProducts(drawerFilters.keyword, drawerFilters.category_id, drawerFilters.brand_id))
const bottomProductResults = computed(() => bottomProductKeyword.value.trim() ? filterProducts(bottomProductKeyword.value).slice(0, 8) : [])

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getSaleOrders({ page: pagination.page, pageSize: pagination.size, ...searchForm })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() { Object.assign(searchForm, { order_no: '', customer_id: null, status: '' }); handleSearch() }

function resetForm() {
  Object.assign(form, {
    id: null,
    order_no: 'S{date}{time}{id}******',
    customer_id: null,
    employee_id: null,
    warehouse_id: warehouses.value[0]?.id || null,
    status: 0,
    payment_method: '',
    admin_remark: '',
    sale_remark: '',
    customer_contact: '',
    customer_phone: '',
    detail_address: '',
    create_delivery: true,
    ship: false,
    items: []
  })
  bottomProductKeyword.value = ''
  quickProductKeyword.value = ''
  formRef.value?.clearValidate()
}

async function handleAdd() {
  resetForm()
  editorMode.value = 'add'
  editorVisible.value = true
  await router.push({ name: 'SaleOrder', query: { action: 'add' } })
}

async function handleEdit(row: any) {
  await router.push({ name: 'SaleOrder', query: { action: 'edit', id: row.id } })
}

async function handleView(row: any) {
  await router.push({ name: 'SaleOrder', query: { action: 'view', id: row.id } })
}

async function syncEditorFromRoute() {
  const action = String(route.query.action || '')
  const id = Number(route.query.id || 0)
  if (action === 'add') {
    resetForm()
    editorMode.value = 'add'
    editorVisible.value = true
    return
  }
  if (['edit', 'view'].includes(action) && id) {
    await loadOrder(id)
    editorMode.value = action as 'edit' | 'view'
    editorVisible.value = true
    return
  }
  editorVisible.value = false
  productDrawerVisible.value = false
}

async function leaveEditor() {
  editorVisible.value = false
  productDrawerVisible.value = false
  await router.push({ name: 'SaleOrder' })
  fetchData()
}

async function fetchOrderDetail(id: number) {
  const res: any = await getSaleOrder(id)
  return res.data || {}
}

async function loadOrder(id: number) {
  resetForm()
  const detail = await fetchOrderDetail(id)
  Object.assign(form, {
    id: detail.id,
    order_no: detail.order_no || '',
    customer_id: detail.customer_id || null,
    employee_id: detail.employee_id || null,
    warehouse_id: detail.warehouse_id || warehouses.value[0]?.id || null,
    status: Number(detail.status || 0),
    payment_method: detail.payment_method || '',
    admin_remark: detail.admin_remark || '',
    sale_remark: detail.sale_remark || '',
    customer_contact: detail.customer_contact || '',
    customer_phone: detail.customer_phone || '',
    detail_address: detail.detail_address || '',
    create_delivery: Boolean(Number(detail.create_delivery || 0)),
    ship: Boolean(Number(detail.ship || 0))
  })
  if (!form.customer_contact && !form.customer_phone && !form.detail_address) handleCustomerChange(form.customer_id)
  form.items = normalizeOrderItems(detail.items || [])
}

function normalizeOrderItems(items: any[]) {
  return items.map((item: any) => createItem({
    id: item.id || null,
    product_id: item.product_id || null,
    product_name: item.product_name || '',
    code: item.code || '',
    spec: item.spec || '',
    unit_name: item.unit_name || productUnitName(products.value.find(product => product.id === item.product_id) || {}),
    base_quantity: Number(item.base_quantity || 1),
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    tax_rate: Number(item.tax_rate ?? inferTaxRate(item)),
    tax: Number(item.tax || 0),
    amount: Number(item.amount || 0),
    remark: item.remark || ''
  }))
}

function createItem(partial: Partial<SaleItem> = {}): SaleItem {
  return {
    id: partial.id ?? null,
    product_id: partial.product_id ?? null,
    product_name: partial.product_name ?? '',
    code: partial.code ?? '',
    spec: partial.spec ?? '',
    unit_name: partial.unit_name ?? getDefaultUnitName(units.value, ''),
    base_quantity: partial.base_quantity ?? 1,
    quantity: partial.quantity ?? 1,
    price: partial.price ?? 0,
    tax_rate: partial.tax_rate ?? 13,
    tax: partial.tax ?? 0,
    amount: partial.amount ?? 0,
    remark: partial.remark ?? ''
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
  const emptyRow = form.items.find(item => !item.product_id)
  const row = emptyRow || createItem()
  fillRowFromProduct(row, product, quantity)
  recalculateRow(row)
  if (!emptyRow) form.items.push(row)
}

function addFirstMatchedProduct() {
  if (!quickAddEnabled.value) return
  const product = filterProducts(quickProductKeyword.value)[0]
  if (!product) {
    ElMessage.warning('未找到匹配产品')
    return
  }
  addProduct(product)
  quickProductKeyword.value = ''
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

function handleInlineProductChange(row: SaleItem) {
  const product = products.value.find(item => item.id === row.product_id)
  if (!product) return
  fillRowFromProduct(row, product, row.quantity)
  recalculateRow(row)
}

function fillRowFromProduct(row: SaleItem, product: any, quantity = 1) {
  row.product_id = product.id
  row.product_name = product.name || ''
  row.code = product.code || ''
  row.spec = product.spec || ''
  row.unit_name = productUnitName(product)
  row.base_quantity = productBaseQuantity(product)
  row.quantity = Number(quantity || row.quantity || 1)
  row.price = productPrice(product)
  row.tax_rate = row.tax_rate ?? 13
  row.tax = calculateTax(row.quantity, row.price, row.tax_rate)
}

function recalculateRow(row: SaleItem, recalculateTax = true) {
  row.tax_rate = row.tax_rate ?? 13
  if (recalculateTax) row.tax = calculateTax(row.quantity, row.price, row.tax_rate)
  row.amount = calculateLineAmount(row.quantity, row.price)
}

function calculateTax(quantity: any, price: any, taxRate: any) {
  const grossAmount = calculateLineAmount(quantity, price)
  const rate = Number(taxRate || 0)
  return rate > 0 ? Number((grossAmount * rate / (100 + rate)).toFixed(2)) : 0
}

function calculateLineAmount(quantity: any, price: any) {
  return Number((Number(quantity || 0) * Number(price || 0)).toFixed(2))
}

function inferTaxRate(item: any) {
  const grossAmount = calculateLineAmount(item.quantity, item.price)
  const tax = Number(item.tax || 0)
  if (grossAmount <= 0 || tax <= 0 || tax >= grossAmount) return 13
  return Number((tax / (grossAmount - tax) * 100).toFixed(2))
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSave() {
  const id = await saveOrder(false)
  if (id) {
    ElMessage.success('保存成功')
    await leaveEditor()
  }
}

async function handleSubmitFromEditor() {
  const id = await saveOrder(true)
  if (!id) return
  ElMessage.success(saleAuditEnabled.value ? '已提交' : '已提交并自动审核')
  await leaveEditor()
}

async function saveOrder(isSubmit: boolean) {
  if (editorMode.value === 'view') return form.id
  await formRef.value?.validate()
  if (!form.warehouse_id) {
    ElMessage.warning('请先维护默认仓库')
    return null
  }
  if (!form.items.length) {
    ElMessage.warning('请添加产品明细')
    return null
  }
  if (form.items.some(item => !item.product_id)) {
    ElMessage.warning('请选择产品后再保存')
    return null
  }
  form.items.forEach(item => recalculateRow(item, false))
  const payload = {
    customer_id: form.customer_id,
    employee_id: form.employee_id || 0,
    warehouse_id: form.warehouse_id,
    payment_method: form.payment_method,
    admin_remark: form.admin_remark,
    sale_remark: form.sale_remark,
    customer_contact: form.customer_contact,
    customer_phone: form.customer_phone,
    detail_address: form.detail_address,
    create_delivery: Boolean(form.create_delivery),
    ship: Boolean(form.ship),
    items: form.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      tax_rate: item.tax_rate,
      tax: item.tax,
      amount: item.amount,
      remark: item.remark
    }))
  }
  if (form.id) {
    await updateSaleOrder(form.id, payload)
    if (isSubmit) {
      await submitSaleOrder(form.id)
    }
    return form.id
  }
  const res: any = await createSaleOrder(payload)
  if (res.data?.audit_enabled !== undefined) {
    saleAuditEnabled.value = toBoolean(res.data.audit_enabled, saleAuditEnabled.value)
  }
  if (isSubmit && res.data?.id && !res.data?.auto_approved) {
    await submitSaleOrder(res.data.id)
  }
  return res.data?.id || null
}

async function handleSubmit(row: any) {
  await ElMessageBox.confirm(saleAuditEnabled.value ? '确认提交审核？' : '确认提交并自动审核？', '提示', { type: 'warning' })
  await submitSaleOrder(row.id)
  ElMessage.success(saleAuditEnabled.value ? '已提交' : '已提交并自动审核')
  fetchData()
}

async function handleAudit(row: any) {
  await ElMessageBox.confirm('确认审核通过？', '提示', { type: 'warning' })
  await auditSaleOrder(row.id)
  ElMessage.success('审核通过')
  fetchData()
}

async function handleCancel(row: any) {
  await ElMessageBox.confirm('确认取消？', '提示', { type: 'warning' })
  await cancelSaleOrder(row.id)
  ElMessage.success('已取消')
  fetchData()
}

async function handleClose(row: any) {
  await ElMessageBox.confirm('确认关闭？', '提示', { type: 'warning' })
  await closeSaleOrder(row.id)
  ElMessage.success('已关闭')
  fetchData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' })
  await deleteSaleOrder(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

function handleCustomerChange(value: any) {
  const customer = customers.value.find(item => item.id === value)
  form.customer_contact = customer?.contact || ''
  form.customer_phone = customer?.phone || ''
  form.detail_address = customer?.address || ''
}

function filterProducts(keyword = '', categoryId: any = '', brandId: any = '') {
  const text = keyword.trim().toLowerCase()
  return products.value.filter(product => {
    const matchedText = !text || [product.id, product.name, product.code, product.barcode, product.spec, product.description].some(value => String(value || '').toLowerCase().includes(text))
    const matchedCategory = !categoryId || product.category_id === categoryId
    const matchedBrand = !brandId || product.brand_id === brandId
    return matchedText && matchedCategory && matchedBrand
  })
}

function selectorState(product: any) {
  if (!selectorStates[product.id]) {
    selectorStates[product.id] = { quantity: 1, unit_name: productUnitName(product), base_quantity: productBaseQuantity(product) }
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
  const url = images[0] || ''
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

function statusText(status: any) {
  const map: Record<number, string> = { 0: '草稿', 1: '进行中', 2: '待审核', 3: '已取消', 4: '已关闭' }
  return map[Number(status)] || '未知'
}

function statusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = { 0: 'info', 1: 'success', 2: 'warning', 3: 'danger', 4: 'info' }
  return map[Number(status)] || 'info'
}

function paymentStatusText(status: any) {
  const map: Record<number, string> = { 0: '未付款', 1: '部分付款', 2: '已付款' }
  return map[Number(status)] || '未付款'
}

function paymentStatusTagType(status: any) {
  const map: Record<number, 'info' | 'success' | 'warning'> = { 0: 'info', 1: 'warning', 2: 'success' }
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

function toBoolean(value: any, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const text = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(text)) return true
  if (['0', 'false', 'no', 'off', 'disabled'].includes(text)) return false
  return defaultValue
}

watch(() => form.create_delivery, value => {
  if (!value) form.ship = false
})

watch(() => form.ship, value => {
  if (value) form.create_delivery = true
})

watch(() => route.query, () => {
  if (initialized.value) syncEditorFromRoute()
})

onMounted(async () => {
  fetchData()
  const [customerRes, employeeRes, warehouseRes, productRes, categoryRes, brandRes, unitRes, configRes]: any[] = await Promise.all([
    getSuppliers({ page: 1, pageSize: 1000, status: 1 }),
    getAllEmployees(),
    getWarehouses({ page: 1, pageSize: 1000, status: 1 }),
    getProducts({ page: 1, pageSize: 1000, status: 1 }),
    getCategories(),
    getBrands(),
    getUnits(),
    getSystemConfig()
  ])
  customers.value = listOf(customerRes)
  employees.value = listOf(employeeRes)
  warehouses.value = listOf(warehouseRes)
  products.value = listOf(productRes)
  categories.value = listOf(categoryRes)
  brands.value = listOf(brandRes)
  units.value = listOf(unitRes)
  saleAuditEnabled.value = toBoolean(configRes.data?.audit_sale_order_enabled, true)
  initialized.value = true
  syncEditorFromRoute()
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
.editor-page {
  min-height: 100%;
  background: #fff;
}
.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #f0f2f5;
  font-weight: 600;
}
.sale-form {
  padding: 18px 12px 0;
}
.sale-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  column-gap: 48px;
}
.sale-form-grid :deep(.el-select),
.sale-form-grid :deep(.el-input) {
  width: 100%;
}
.receiver-form-item {
  grid-column: span 2;
}
.receiver-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 10px;
  width: 100%;
}
.product-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 12px;
}
.quick-product-input {
  width: 240px;
}
.sale-detail-table {
  width: 100%;
}
.sale-detail-table :deep(.el-input-number) {
  width: 100%;
}
.sale-detail-table :deep(.el-input-number .el-input__inner) {
  text-align: left;
}
.empty-sale {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.help-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff9f0a;
  color: #fff;
  font-size: 11px;
  line-height: 1;
}
.edit-mark {
  color: #409eff;
  font-weight: 600;
}
.bottom-product-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 350px;
  margin-top: 14px;
}
.search-result-table {
  width: 720px;
  margin-top: 8px;
}
.delivery-options {
  display: grid;
  grid-template-columns: auto minmax(320px, 560px);
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}
.delivery-checks {
  display: flex;
  align-items: center;
  gap: 16px;
}
.editor-footer {
  min-height: 56px;
  margin-top: 20px;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.auto-label {
  margin-left: 12px;
  color: #303133;
  font-weight: 600;
}
.total-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  color: #303133;
}
.total-bar strong {
  margin-left: 4px;
}
.drawer-filter {
  display: grid;
  grid-template-columns: 180px 180px 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.drawer-product-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.drawer-product-info img,
.product-avatar-placeholder {
  width: 34px;
  height: 34px;
  border-radius: 4px;
  object-fit: cover;
  background: #eef2f7;
}
.drawer-unit-row {
  display: grid;
  grid-template-columns: 92px 1fr 24px;
  gap: 8px;
  align-items: center;
}
.unit-cube {
  color: #409eff;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
@media (max-width: 1200px) {
  .sale-form-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    column-gap: 24px;
  }
  .editor-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 760px) {
  .sale-form-grid,
  .receiver-fields,
  .drawer-filter {
    grid-template-columns: 1fr;
  }
  .receiver-form-item {
    grid-column: span 1;
  }
  .product-actions,
  .delivery-checks,
  .footer-left,
  .total-bar {
    flex-wrap: wrap;
  }
  .delivery-options {
    grid-template-columns: 1fr;
  }
  .quick-product-input,
  .bottom-product-search,
  .search-result-table {
    width: 100%;
  }
}
</style>

