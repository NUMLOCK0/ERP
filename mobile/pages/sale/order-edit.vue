<template>
  <view class="order-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">销售客户</text>
              <picker class="form-picker" @change="onCustomerChange" :value="customerIndex" :range="customers" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: customerIndex === -1 }">
                    {{ customers[customerIndex]?.name || '请选择客户' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label required">出库仓库</text>
              <picker class="form-picker" @change="onWarehouseChange" :value="warehouseIndex" :range="warehouses" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: warehouseIndex === -1 }">
                    {{ warehouses[warehouseIndex]?.name || '请选择仓库' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">销售员</text>
              <picker class="form-picker" @change="onEmployeeChange" :value="employeeIndex" :range="employees" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: employeeIndex === -1 }">
                    {{ employees[employeeIndex]?.name || '请选择销售员' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">付款方式</text>
              <picker class="form-picker" @change="onPaymentChange" :value="paymentIndex" :range="paymentMethods">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: paymentIndex === -1 }">
                    {{ paymentMethods[paymentIndex] || '请选择付款方式' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">收货人</text>
              <input class="form-input" v-model="form.customer_contact" placeholder="请输入收货人" />
            </view>
            <view class="form-item">
              <text class="form-label">联系电话</text>
              <input class="form-input" v-model="form.customer_phone" placeholder="请输入联系电话" />
            </view>
            <view class="form-item">
              <text class="form-label">收货地址</text>
              <input class="form-input" v-model="form.detail_address" placeholder="请输入详细地址" />
            </view>
            <view class="form-item">
              <text class="form-label">单据备注</text>
              <input class="form-input" v-model="form.sale_remark" placeholder="请输入单据备注" />
            </view>
            <view class="form-item">
              <text class="form-label">管理备注</text>
              <input class="form-input" v-model="form.admin_remark" placeholder="请输入管理备注" />
            </view>
          </view>
        </view>

        <!-- ===== 发货设置 (仅新增模式下显示) ===== -->
        <view class="section" v-if="!editId">
          <view class="section-header">
            <text class="section-title">发货设置</text>
          </view>
          <view class="form-group">
            <view class="form-item-switch">
              <text class="form-label">创建发货单</text>
              <switch :checked="form.create_delivery" @change="form.create_delivery = $event.detail.value" color="#1890FF" />
            </view>
            <view class="form-item-switch" v-if="form.create_delivery">
              <text class="form-label">直接发货 (扣库存)</text>
              <switch :checked="form.ship" @change="form.ship = $event.detail.value" color="#1890FF" />
            </view>
          </view>
        </view>

        <!-- ===== 商品明细 ===== -->
        <view class="section">
          <view class="section-header list-title-row">
            <text class="section-title">销售商品明细</text>
            <view class="add-row-btn" @click="openProductSelector">
              <uni-icons type="plus" size="14" color="#1890FF"></uni-icons>
              <text class="add-row-text">选择商品</text>
            </view>
          </view>

          <!-- 销售明细列表 -->
          <view v-if="form.items.length > 0" class="items-wrap">
            <view class="item-row-card" v-for="(item, idx) in form.items" :key="idx">
              <view class="card-title-row">
                <text class="card-index-title">商品明细 #{{ idx + 1 }}</text>
                <text class="remove-row-btn" @click="removeItemRow(idx)">删除</text>
              </view>

              <view class="form-group row-group">
                <view class="form-item">
                  <text class="form-label">商品名称</text>
                  <text class="product-info-text">{{ item.name || '-' }}</text>
                </view>
                <view class="form-item" v-if="item.spec || item.unit_name">
                  <text class="form-label">规格单位</text>
                  <text class="product-info-text">{{ item.spec || '-' }} ({{ item.unit_name || '-' }})</text>
                </view>
                <view class="form-item">
                  <text class="form-label required">销售数量</text>
                  <input class="form-input" type="digit" v-model="item.quantity" placeholder="请输入数量" @input="calcTotalAmount" />
                </view>
                <view class="form-item">
                  <text class="form-label required">销售单价</text>
                  <input class="form-input" type="digit" v-model="item.price" placeholder="请输入单价" @input="calcTotalAmount" />
                </view>
                <view class="form-item">
                  <text class="form-label">税率 (%)</text>
                  <input class="form-input" type="number" v-model="item.tax_rate" placeholder="默认13" @input="calcTotalAmount" />
                </view>
                <view class="form-item">
                  <text class="form-label">备注</text>
                  <input class="form-input" v-model="item.remark" placeholder="选填" />
                </view>
              </view>
            </view>

            <!-- 统计汇总 -->
            <view class="summary-card">
              <view class="summary-row">
                <text class="summary-label">销售总项数</text>
                <text class="summary-val">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-row">
                <text class="summary-label">应收总金额</text>
                <text class="summary-val danger-text font-bold">¥{{ formatPrice(totalOrderAmount) }}</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-items-state">
            <uni-icons type="cart" size="48" color="#DCDFE6"></uni-icons>
            <text class="empty-items-text">尚未选择销售商品，请点击右上角选择商品</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存订单</view>
    </view>

    <!-- 商品选择弹窗 -->
    <view v-if="renderProductPopup" class="dialog-overlay" :class="{ show: showProductPopup }" @click="closeProductSelector">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">选择销售商品</text>
          <text class="dialog-close" @click="closeProductSelector">×</text>
        </view>
        <view class="popup-search-bar">
          <view class="popup-search-input-wrap">
            <uni-icons type="search" size="18" color="#999"></uni-icons>
            <input class="popup-search-input" v-model="productKeyword" placeholder="搜索商品名称/编码" type="text" @confirm="onProductSearch" />
          </view>
          <view class="popup-search-btn" @click="onProductSearch">搜索</view>
        </view>
        <scroll-view class="dialog-body-scroll" scroll-y @scrolltolower="loadMoreProducts">
          <view class="popup-product-list">
            <view v-if="products.length > 0">
              <view class="product-select-card" v-for="item in products" :key="item.id" @click="selectProduct(item)">
                <view class="prod-left">
                  <image v-if="item.image" :src="item.image" mode="aspectFill" class="prod-img" />
                  <view v-else class="prod-img-placeholder">
                    <uni-icons type="gift" size="20" color="#C0C4CC"></uni-icons>
                  </view>
                  <view class="prod-info">
                    <text class="prod-name">{{ item.name }}</text>
                    <text class="prod-code" v-if="item.code">编码: {{ item.code }}</text>
                    <text class="prod-spec" v-if="item.spec">规格: {{ item.spec }}</text>
                    <text class="prod-stock">可用库存: {{ formatStock(item.stock_total || item.stock) }}</text>
                  </view>
                </view>
                <view class="prod-right">
                  <uni-icons type="plus-filled" size="22" color="#1890FF"></uni-icons>
                </view>
              </view>
            </view>
            <view v-else-if="!productsLoading" class="popup-empty">
              <text class="popup-empty-text">未找到相关商品</text>
            </view>
            <view v-if="productsLoading" class="popup-loading">
              <uni-load-more status="loading"></uni-load-more>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { saleApi } from '@/api/sale'
import { commonApi } from '@/api/common'
import { productApi } from '@/api/product'
import { employeeApi } from '@/api/employee'

const editId = ref(null)

// Dropdown Options
const customers = ref([])
const warehouses = ref([])
const employees = ref([])
const paymentMethods = ['银行转账', '支付宝', '微信支付', '现金', '网银', '未确定']

// Selection Indices
const customerIndex = ref(-1)
const warehouseIndex = ref(-1)
const employeeIndex = ref(-1)
const paymentIndex = ref(-1)

// Form State
const form = reactive({
  customer_id: null,
  employee_id: null,
  warehouse_id: null,
  payment_method: '',
  customer_contact: '',
  customer_phone: '',
  detail_address: '',
  admin_remark: '',
  sale_remark: '',
  create_delivery: false,
  ship: false,
  items: []
})

const totalOrderAmount = ref(0)

// Product Selector State
const renderProductPopup = ref(false)
const showProductPopup = ref(false)
const productKeyword = ref('')
const products = ref([])
const productsPage = ref(1)
const productsPageSize = 10
const productsTotal = ref(0)
const productsLoading = ref(false)
const productsNoMore = ref(false)

const loadOptions = async () => {
  try {
    const [cRes, wRes, eRes] = await Promise.all([
      commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'customer', status: 1 }),
      commonApi.getWarehouses({ page: 1, pageSize: 1000 }),
      employeeApi.getList({ page: 1, pageSize: 1000, status: 1 })
    ])
    if (cRes.code === 0) customers.value = cRes.data?.list || cRes.data || []
    if (wRes.code === 0) warehouses.value = wRes.data || []
    if (eRes.code === 0) employees.value = eRes.data?.list || eRes.data || []
  } catch (e) {
    // handled
  }
}

const loadDetail = async (id) => {
  try {
    const res = await saleApi.getOrderDetail(id)
    if (res.code === 0) {
      const data = res.data || {}
      form.customer_id = data.customer_id || null
      form.employee_id = data.employee_id || null
      form.warehouse_id = data.warehouse_id || null
      form.payment_method = data.payment_method || ''
      form.customer_contact = data.contact || ''
      form.customer_phone = data.phone || ''
      form.detail_address = data.detail_address || ''
      form.admin_remark = data.admin_remark || ''
      form.sale_remark = data.sale_remark || ''
      form.create_delivery = Boolean(data.create_delivery)
      form.ship = Boolean(data.ship)
      
      // Populate items list
      form.items = (data.items || []).map(item => ({
        product_id: item.product_id,
        name: item.product_name,
        spec: item.spec || '',
        unit_name: item.unit_name || '',
        quantity: item.quantity || 1,
        price: item.price || 0,
        tax_rate: item.tax_rate ?? 13,
        remark: item.remark || ''
      }))
      
      matchIndices()
      calcTotalAmount()
    }
  } catch (e) {
    // handled
  }
}

const matchIndices = () => {
  if (form.customer_id && customers.value.length > 0) {
    customerIndex.value = customers.value.findIndex(c => c.id === form.customer_id)
  }
  if (form.warehouse_id && warehouses.value.length > 0) {
    warehouseIndex.value = warehouses.value.findIndex(w => w.id === form.warehouse_id)
  }
  if (form.employee_id && employees.value.length > 0) {
    employeeIndex.value = employees.value.findIndex(e => e.id === form.employee_id)
  }
  if (form.payment_method) {
    paymentIndex.value = paymentMethods.indexOf(form.payment_method)
  }
}

const onCustomerChange = (e) => {
  customerIndex.value = e.detail.value
  const customer = customers.value[customerIndex.value]
  form.customer_id = customer?.id || null
  form.customer_contact = customer?.contact || ''
  form.customer_phone = customer?.phone || ''
  form.detail_address = customer?.address || ''
}

const onWarehouseChange = (e) => {
  warehouseIndex.value = e.detail.value
  form.warehouse_id = warehouses.value[warehouseIndex.value]?.id || null
}

const onEmployeeChange = (e) => {
  employeeIndex.value = e.detail.value
  form.employee_id = employees.value[employeeIndex.value]?.id || null
}

const onPaymentChange = (e) => {
  paymentIndex.value = e.detail.value
  form.payment_method = paymentMethods[paymentIndex.value] || ''
}

const calcTotalAmount = () => {
  let sum = 0
  for (const item of form.items) {
    sum += Number(item.quantity || 0) * Number(item.price || 0)
  }
  totalOrderAmount.value = sum
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const formatStock = (val) => {
  if (val === null || val === undefined) return '0'
  return Number(val).toString()
}

const removeItemRow = (index) => {
  form.items.splice(index, 1)
  calcTotalAmount()
}

// Product Selector Handlers
const openProductSelector = () => {
  productKeyword.value = ''
  products.value = []
  productsPage.value = 1
  productsNoMore.value = false
  fetchProducts(true)
  renderProductPopup.value = true
  setTimeout(() => {
    showProductPopup.value = true
  }, 30)
}

const closeProductSelector = () => {
  showProductPopup.value = false
  setTimeout(() => {
    renderProductPopup.value = false
  }, 280)
}

const onProductSearch = () => {
  productsPage.value = 1
  productsNoMore.value = false
  products.value = []
  fetchProducts(true)
}

const fetchProducts = async (isRefresh = false) => {
  if (productsLoading.value) return
  productsLoading.value = true
  
  try {
    const params = {
      page: isRefresh ? 1 : productsPage.value,
      pageSize: productsPageSize,
      keyword: productKeyword.value.trim(),
      status: 1
    }
    const res = await productApi.getList(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      productsTotal.value = res.data?.total || data.length
      
      const mapped = data.map(p => {
        let image = ''
        if (p.image_urls) {
          try {
            const parsed = typeof p.image_urls === 'string' ? JSON.parse(p.image_urls) : p.image_urls
            if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0]
          } catch(e) {}
        }
        return {
          ...p,
          image
        }
      })

      if (isRefresh) {
        products.value = mapped
        productsPage.value = 2
      } else {
        products.value = [...products.value, ...mapped]
        productsPage.value++
      }
      productsNoMore.value = products.value.length >= productsTotal.value
    }
  } catch (e) {
    // handled
  } finally {
    productsLoading.value = false
  }
}

const loadMoreProducts = () => {
  if (!productsNoMore.value && !productsLoading.value) {
    fetchProducts()
  }
}

const selectProduct = (item) => {
  const existing = form.items.find(row => row.product_id === item.id)
  if (existing) {
    uni.showToast({ title: '该商品已在明细中', icon: 'none' })
    return
  }
  
  form.items.push({
    product_id: item.id,
    name: item.name,
    spec: item.spec || '',
    unit_name: item.unit_name || item.unit || '件',
    quantity: 1,
    price: Number(item.price || item.price_sale || 0),
    tax_rate: 13,
    remark: ''
  })
  
  calcTotalAmount()
  uni.showToast({ title: '已添加商品', icon: 'success' })
}

const goCancel = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (!form.customer_id) {
    uni.showToast({ title: '请选择客户', icon: 'none' })
    return
  }
  if (!form.warehouse_id) {
    uni.showToast({ title: '请选择出库仓库', icon: 'none' })
    return
  }
  if (form.items.length === 0) {
    uni.showToast({ title: '商品明细不能为空', icon: 'none' })
    return
  }

  // Validate item entries
  for (let i = 0; i < form.items.length; i++) {
    const row = form.items[i]
    if (Number(row.quantity || 0) <= 0) {
      uni.showToast({ title: `明细 #${i + 1} 数量必须大于0`, icon: 'none' })
      return
    }
    if (Number(row.price || 0) < 0) {
      uni.showToast({ title: `明细 #${i + 1} 价格不能为负数`, icon: 'none' })
      return
    }
  }

  uni.showLoading({ title: '正在保存...' })
  try {
    const payload = {
      customer_id: form.customer_id,
      employee_id: form.employee_id || 0,
      warehouse_id: form.warehouse_id,
      payment_method: form.payment_method,
      customer_contact: form.customer_contact.trim(),
      customer_phone: form.customer_phone.trim(),
      detail_address: form.detail_address.trim(),
      admin_remark: form.admin_remark.trim(),
      sale_remark: form.sale_remark.trim(),
      create_delivery: form.create_delivery,
      ship: form.ship,
      items: form.items.map(item => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        price: Number(item.price),
        tax_rate: Number(item.tax_rate || 13),
        remark: item.remark.trim()
      }))
    }

    let res
    if (editId.value) {
      res = await saleApi.updateOrder(editId.value, payload)
    } else {
      res = await saleApi.createOrder(payload)
    }
    
    if (res.code === 0) {
      uni.showToast({ title: '订单保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 500)
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  
  await loadOptions()
  
  if (id) {
    editId.value = id
    uni.setNavigationBarTitle({ title: '编辑销售订单' })
    await loadDetail(id)
  } else {
    uni.setNavigationBarTitle({ title: '新增销售订单' })
  }
})
</script>

<style lang="scss" scoped>
.order-edit-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  box-sizing: border-box;
}

.form-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 20rpx;
}

.section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  
  &.list-title-row {
    border-bottom: 1rpx solid #F2F6FC;
    padding-bottom: 16rpx;
    margin-bottom: 16rpx;
  }
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.add-row-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background: #E8F4FF;
  border-radius: 24rpx;
  
  .add-row-text {
    font-size: 24rpx;
    color: #1890FF;
    font-weight: 600;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }
}

.form-item-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  width: 180rpx;

  &.required::after {
    content: '*';
    color: #F56C6C;
    margin-left: 4rpx;
  }
}

.form-picker {
  flex: 1;
  text-align: right;
}

.picker-inner {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.picker-value {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
  
  &.placeholder {
    color: #C0C4CC;
    font-weight: 400;
  }
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
}

.product-info-text {
  font-size: 28rpx;
  color: #303133;
  font-weight: 600;
  text-align: right;
  flex: 1;
}

/* 商品明细列表 */
.items-wrap {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item-row-card {
  background: #F8FAFC;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  border: 1rpx solid #EBEEF5;

  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1rpx solid #E4E7ED;
    padding-bottom: 12rpx;
    margin-bottom: 12rpx;

    .card-index-title {
      font-size: 24rpx;
      color: #909399;
      font-weight: 600;
    }

    .remove-row-btn {
      font-size: 24rpx;
      color: #F56C6C;
      font-weight: 600;
    }
  }

  .row-group .form-item {
    padding: 16rpx 0;
    border-bottom: 1rpx dashed #E4E7ED;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

.summary-card {
  background: #FFF9F9;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  border: 1rpx solid #FFECEC;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 10rpx;

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 26rpx;

    .summary-label {
      color: #909399;
    }

    .summary-val {
      color: #303133;
      font-weight: 600;
    }

    .danger-text {
      color: #F56C6C;
    }

    .font-bold {
      font-weight: 700;
    }
  }
}

.empty-items-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  gap: 16rpx;
  
  .empty-items-text {
    font-size: 24rpx;
    color: #C0C4CC;
    text-align: center;
  }
}

/* 底部操作栏 */
.bottom-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 16rpx;
  z-index: 99;
}

.bottom-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;

  &.outline {
    background: #F4F4F5;
    color: #909399;
  }

  &.primary {
    background: #1890FF;
    color: #FFFFFF;
    box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
  }

  &:active {
    opacity: 0.85;
  }
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 999;
  transition: background-color 0.28s ease;
  visibility: hidden;
  
  &.show {
    visibility: visible;
    background: rgba(0, 0, 0, 0.5);
    
    .dialog-content {
      transform: translateY(0);
    }
  }
}

.dialog-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 75vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.25, 1, 0.5, 1);
  overflow: hidden;
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #F2F6FC;

  .dialog-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #303133;
  }

  .dialog-close {
    font-size: 40rpx;
    color: #909399;
    padding: 10rpx;
  }
}

.popup-search-bar {
  flex-shrink: 0;
  display: flex;
  padding: 16rpx 30rpx;
  gap: 16rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F2F6FC;
}

.popup-search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F2F4F6;
  border-radius: 12rpx;
  padding: 0 16rpx;
  height: 64rpx;
}

.popup-search-input {
  flex: 1;
  font-size: 26rpx;
  margin-left: 8rpx;
}

.popup-search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 12rpx;
  
  &:active {
    opacity: 0.85;
  }
}

.dialog-body-scroll {
  flex: 1;
  height: 0;
  width: 100%;
  background: #F8FAFC;
}

.popup-product-list {
  padding: 20rpx;
}

.product-select-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02);

  .prod-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
  }

  .prod-img {
    width: 100rpx;
    height: 100rpx;
    border-radius: 10rpx;
  }

  .prod-img-placeholder {
    width: 100rpx;
    height: 100rpx;
    border-radius: 10rpx;
    background: #F2F6FC;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .prod-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    
    .prod-name {
      font-size: 26rpx;
      color: #303133;
      font-weight: 600;
    }

    .prod-code, .prod-spec {
      font-size: 20rpx;
      color: #909399;
    }

    .prod-stock {
      font-size: 20rpx;
      color: #E6A23C;
      font-weight: 500;
    }
  }
  
  .prod-right {
    padding-left: 20rpx;
  }
}

.popup-empty {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
  
  .popup-empty-text {
    font-size: 26rpx;
    color: #C0C4CC;
  }
}

.popup-loading {
  padding: 20rpx 0;
}
</style>
