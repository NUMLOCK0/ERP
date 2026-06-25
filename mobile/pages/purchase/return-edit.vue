<template>
  <view class="return-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">关联入库单</text>
              <picker class="form-picker" @change="onInboundChange" :value="inboundIndex" :range="inbounds" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: inboundIndex === -1 }">
                    {{ inbounds[inboundIndex]?.label || '请选择关联入库单(可空)' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label required">供应商</text>
              <picker class="form-picker" @change="onSupplierChange" :value="supplierIndex" :range="suppliers" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: supplierIndex === -1 }">
                    {{ suppliers[supplierIndex]?.name || '请选择供应商' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">退货原因</text>
              <input class="form-input" v-model="form.reason" placeholder="请输入退货原因(选填)" maxlength="160" />
            </view>
          </view>
        </view>

        <!-- ===== 商品明细 ===== -->
        <view class="section">
          <view class="section-header list-title-row">
            <text class="section-title">退货商品明细</text>
            <view class="add-row-btn" @click="openProductSelector">
              <uni-icons type="plus" size="14" color="#1890FF"></uni-icons>
              <text class="add-row-text">选择商品</text>
            </view>
          </view>

          <!-- 商品明细列表 -->
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
                  <text class="form-label required">退货数量</text>
                  <input class="form-input" type="number" v-model="item.quantity" placeholder="请输入数量" @input="onItemQtyOrPriceInput(idx)" />
                </view>
                <view class="form-item">
                  <text class="form-label required">退货单价</text>
                  <input class="form-input" type="digit" v-model="item.price" placeholder="请输入单价" @input="onItemQtyOrPriceInput(idx)" />
                </view>
                <view class="form-item">
                  <text class="form-label">退货金额</text>
                  <text class="product-info-text text-danger font-bold">¥{{ formatPrice(item.amount) }}</text>
                </view>
              </view>
            </view>

            <!-- 统计汇总 -->
            <view class="summary-card">
              <view class="summary-row">
                <text class="summary-label">退货总项数</text>
                <text class="summary-val">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-row">
                <text class="summary-label">退货总金额</text>
                <text class="summary-val danger-text font-bold">¥{{ formatPrice(totalReturnAmount) }}</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-items-state">
            <uni-icons type="undo" size="48" color="#DCDFE6"></uni-icons>
            <text class="empty-items-text">尚未选择退货商品，请点击右上角选择商品或通过关联入库单自动带出明细</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存退货单</view>
    </view>

    <!-- 商品选择弹窗 -->
    <view v-if="renderProductPopup" class="dialog-overlay" :class="{ show: showProductPopup }" @click="closeProductSelector">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">选择退货商品</text>
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
import { purchaseApi } from '@/api/purchase'
import { commonApi } from '@/api/common'
import { productApi } from '@/api/product'

// Dropdown Options
const suppliers = ref([])
const inbounds = ref([])

// Selection Indices
const supplierIndex = ref(-1)
const inboundIndex = ref(-1)

// Form State
const form = reactive({
  inbound_id: null,
  supplier_id: null,
  reason: '',
  items: []
})

const totalReturnAmount = ref(0)

// Product Selector State
const renderProductPopup = ref(false)
const showProductPopup = ref(false)
const productKeyword = ref('')
const products = ref([])
const productsPage = ref(1)
const productsPageSize = 20
const productsNoMore = ref(false)
const productsLoading = ref(false)

const loadOptions = async () => {
  try {
    const [sRes, iRes] = await Promise.all([
      commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
      purchaseApi.getInbounds({ page: 1, pageSize: 1000 })
    ])
    if (sRes.code === 0) suppliers.value = sRes.data?.list || sRes.data || []
    if (iRes.code === 0) {
      const listData = iRes.data?.list || iRes.data || []
      inbounds.value = [
        { id: null, label: '无（手动创建退货）' },
        ...listData.map(item => ({
          ...item,
          label: `${item.inbound_no} (${item.supplier_name || ''})`
        }))
      ]
    }
  } catch (e) {
    // handled
  }
}

const onSupplierChange = (e) => {
  const index = e.detail.value
  supplierIndex.value = index
  const selected = suppliers.value[index]
  if (selected) {
    form.supplier_id = selected.id
  }
}

const onInboundChange = async (e) => {
  const index = e.detail.value
  inboundIndex.value = index
  const selected = inbounds.value[index]
  if (!selected) return

  form.inbound_id = selected.id
  
  if (selected.id === null) {
    // Manually creating, don't clear supplier but clear items
    form.items = []
    calcTotalAmount()
    return
  }

  // Find supplier index and sync
  const sIdx = suppliers.value.findIndex(s => s.id === selected.supplier_id)
  if (sIdx !== -1) {
    supplierIndex.value = sIdx
    form.supplier_id = selected.supplier_id
  }

  // Load inbound details to get items
  uni.showLoading({ title: '加载入库单明细...' })
  try {
    const res = await purchaseApi.getInboundDetail(selected.id)
    if (res.code === 0 && res.data) {
      form.items = (res.data.items || []).map(item => ({
        product_id: item.product_id,
        name: item.product_name,
        code: item.code || '',
        spec: item.spec || '',
        unit_name: item.unit_name || '',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        amount: Number(item.amount || 0)
      }))
      calcTotalAmount()
    }
  } catch (err) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const openProductSelector = () => {
  renderProductPopup.value = true
  setTimeout(() => {
    showProductPopup.value = true
  }, 50)
  productKeyword.value = ''
  products.value = []
  productsPage.value = 1
  productsNoMore.value = false
  fetchProducts(true)
}

const closeProductSelector = () => {
  showProductPopup.value = false
  setTimeout(() => {
    renderProductPopup.value = false
  }, 200)
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
      const total = res.data?.total || data.length
      if (isRefresh) {
        products.value = data
        productsPage.value = 2
      } else {
        products.value = [...products.value, ...data]
        productsPage.value++
      }
      productsNoMore.value = products.value.length >= total
    }
  } catch (e) {
    // handled
  } finally {
    productsLoading.value = false
  }
}

const onProductSearch = () => {
  productsPage.value = 1
  productsNoMore.value = false
  products.value = []
  fetchProducts(true)
}

const loadMoreProducts = () => {
  if (!productsNoMore.value && !productsLoading.value) {
    fetchProducts()
  }
}

const selectProduct = (item) => {
  const exist = form.items.find(x => x.product_id === item.id)
  if (exist) {
    uni.showToast({ title: '该商品已在明细中', icon: 'none' })
    return
  }

  form.items.push({
    product_id: item.id,
    name: item.name,
    code: item.code || '',
    spec: item.spec || '',
    unit_name: item.unit_name || '',
    quantity: 1,
    price: Number(item.cost_price || item.sale_price || 0),
    amount: Number(item.cost_price || item.sale_price || 0)
  })
  calcTotalAmount()
  closeProductSelector()
  uni.showToast({ title: '已添加商品', icon: 'none' })
}

const removeItemRow = (idx) => {
  form.items.splice(idx, 1)
  calcTotalAmount()
}

const onItemQtyOrPriceInput = (idx) => {
  const item = form.items[idx]
  if (item) {
    item.amount = Number((Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2))
  }
  calcTotalAmount()
}

const calcTotalAmount = () => {
  totalReturnAmount.value = form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const handleSave = async () => {
  if (!form.supplier_id) {
    uni.showToast({ title: '请选择供应商', icon: 'none' })
    return
  }
  const validItems = form.items.filter(item => item.product_id && Number(item.quantity) > 0)
  if (!validItems.length) {
    uni.showToast({ title: '退货明细不能为空', icon: 'none' })
    return
  }

  // Validate quantities and prices
  for (const item of validItems) {
    if (Number(item.quantity) <= 0) {
      uni.showToast({ title: '退货数量必须大于0', icon: 'none' })
      return
    }
    if (Number(item.price) < 0) {
      uni.showToast({ title: '退货单价不能小于0', icon: 'none' })
      return
    }
  }

  uni.showLoading({ title: '正在保存...' })
  try {
    const payload = {
      inbound_id: form.inbound_id || 0,
      supplier_id: form.supplier_id,
      reason: form.reason.trim(),
      items: validItems.map(item => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        price: Number(item.price)
      }))
    }
    const res = await purchaseApi.createReturn(payload)
    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const goCancel = () => {
  uni.navigateBack()
}

onMounted(() => {
  loadOptions()
})
</script>

<style lang="scss" scoped>
.return-edit-page {
  height: 100vh;
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
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background: #E8F4FF;
}

.add-row-text {
  font-size: 22rpx;
  color: #1890FF;
  font-weight: 600;
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

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  width: 160rpx;

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

/* 商品明细卡片 */
.items-wrap {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item-row-card {
  background: #F8FAFC;
  border-radius: 16rpx;
  padding: 20rpx;
  border: 1rpx solid #E4E7ED;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.card-index-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #606266;
}

.remove-row-btn {
  font-size: 24rpx;
  color: #F56C6C;
  font-weight: 600;
}

.row-group {
  .form-item {
    padding: 16rpx 0;
    border-bottom: 1rpx solid #EBEEF5;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

.product-info-text {
  font-size: 26rpx;
  color: #303133;
  font-weight: 600;
  text-align: right;
  flex: 1;
}

.empty-items-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.empty-items-text {
  font-size: 24rpx;
  color: #C0C4CC;
  margin-top: 12rpx;
  text-align: center;
}

.summary-card {
  background: #F5F7FA;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  border: 1rpx dashed #DCDFE6;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 26rpx;
  color: #606266;
}

.summary-val {
  font-size: 28rpx;
  color: #303133;
  
  &.danger-text {
    color: #F56C6C;
    font-size: 32rpx;
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

/* 弹窗遮罩 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  display: flex;
  align-items: flex-end;
  transition: all 0.24s ease-out;
  pointer-events: none;
  visibility: hidden;

  &.show {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(5px);
    pointer-events: auto;
    visibility: visible;
    .dialog-content {
      transform: translateY(0);
    }
  }
}

.dialog-content {
  width: 100%;
  height: 75vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.24s ease-out;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 36rpx;
  border-bottom: 1rpx solid #F2F6FC;
}

.dialog-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.dialog-close {
  font-size: 40rpx;
  color: #909399;
  line-height: 1;
}

.popup-search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 36rpx;
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
  height: 68rpx;
}

.popup-search-input {
  flex: 1;
  font-size: 26rpx;
  margin-left: 10rpx;
}

.popup-search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 12rpx;
  white-space: nowrap;

  &:active {
    opacity: 0.85;
  }
}

.dialog-body-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.popup-product-list {
  padding: 16rpx 36rpx;
}

.product-select-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
  
  &:last-child {
    border-bottom: none;
  }
}

.prod-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  overflow: hidden;
}

.prod-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: #F2F6FC;
  flex-shrink: 0;
}

.prod-img-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: #F2F6FC;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prod-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  overflow: hidden;
  flex: 1;
}

.prod-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.prod-code, .prod-spec {
  font-size: 20rpx;
  color: #909399;
}

.prod-right {
  flex-shrink: 0;
  margin-left: 12rpx;
}

.popup-empty {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
  
  .popup-empty-text {
    font-size: 24rpx;
    color: #C0C4CC;
  }
}

.popup-loading {
  padding: 10rpx 0;
}
</style>
