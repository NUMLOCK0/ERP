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
            <view class="form-item" v-if="editId">
              <text class="form-label">采购单号</text>
              <text class="info-value">{{ form.order_no || '-' }}</text>
            </view>
            <view class="form-item" v-else>
              <text class="form-label">采购单号</text>
              <input class="form-input" v-model="form.order_no" placeholder="自定义单号(留空自动生成)" />
            </view>
            <view class="form-item">
              <text class="form-label required">供应商</text>
              <picker class="form-picker" @change="onSupplierChange" :value="supplierIndex" :range="suppliers" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: supplierIndex === -1 }">
                    {{ suppliers[supplierIndex]?.name || '请选择供应商' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label required">收货仓库</text>
              <picker class="form-picker" @change="onWarehouseChange" :value="warehouseIndex" :range="warehouses" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: warehouseIndex === -1 }">
                    {{ warehouses[warehouseIndex]?.name || '请选择仓库' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">付款方式</text>
              <input class="form-input" v-model="form.payment_method" placeholder="请输入付款方式" maxlength="50" />
            </view>
            <view class="form-item">
              <text class="form-label">管理备注</text>
              <input class="form-input" v-model="form.admin_remark" placeholder="限160字" />
            </view>
            <view class="form-item">
              <text class="form-label">采购备注</text>
              <input class="form-input" v-model="form.purchase_remark" placeholder="限160字" />
            </view>
          </view>
        </view>

        <!-- ===== 商品明细 ===== -->
        <view class="section">
          <view class="section-header list-title-row">
            <text class="section-title">采购商品明细</text>
            <view class="add-row-btn" @click="openProductSelector">
              <u-icon name="plus" size="14" color="#1890FF"></u-icon>
              <text class="add-row-text">选择商品</text>
            </view>
          </view>

          <!-- 采购明细列表 -->
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
                  <text class="form-label required">采购数量</text>
                  <input class="form-input" type="number" v-model="item.quantity" placeholder="请输入数量" @input="calcTotalAmount" />
                </view>
                <view class="form-item">
                  <text class="form-label required">采购单价</text>
                  <input class="form-input" type="digit" v-model="item.price" placeholder="请输入单价" @input="calcTotalAmount" />
                </view>
                <view class="form-item">
                  <text class="form-label">税率 (%)</text>
                  <input class="form-input" type="number" v-model="item.tax_rate" placeholder="默认13" />
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
                <text class="summary-label">采购总项数</text>
                <text class="summary-val">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-row">
                <text class="summary-label">订单总金额</text>
                <text class="summary-val danger-text font-bold">¥{{ formatPrice(totalOrderAmount) }}</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-items-state">
            <u-icon name="shopping-cart" size="48" color="#DCDFE6"></u-icon>
            <text class="empty-items-text">尚未选择采购商品，请点击右上角添加商品</text>
          </view>
          
          <!-- ===== 订单图片留痕 ===== -->
          <view class="section">
            <view class="section-header flex-row">
              <text class="section-title">订单图片留痕</text>
              <text class="section-subtitle">{{ (form.image_urls || []).length }} / 10</text>
            </view>
            <view class="attachment-upload-grid">
              <view class="attachment-upload-item" v-for="(url, idx) in form.image_urls" :key="idx">
                <image :src="url" mode="aspectFill" class="attachment-upload-img" @click="previewUploadImage(idx)" />
                <view class="remove-btn" @click.stop="removeImage(idx)">
                  <u-icon name="close" size="12" color="#FFFFFF"></u-icon>
                </view>
              </view>
              <view class="uploader-box" v-if="(form.image_urls || []).length < 10" @click="chooseAndUploadImages">
                <u-icon name="plus" size="28" color="#909399"></u-icon>
                <text class="uploader-text">上传图片</text>
              </view>
            </view>
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
    <product-select-popup
      v-model:show="showProductPopup"
      :multiple="true"
      priceType="cost_price"
      :selectedProducts="form.items"
      @confirm="handleProductSelectConfirm"
    />
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { purchaseApi } from '@/api/purchase'
import { commonApi } from '@/api/common'
import { productApi } from '@/api/product'
import http from '@/api/request'
import ProductSelectPopup from '@/components/ProductSelectPopup.vue'

const editId = ref(null)

// Dropdown Options
const suppliers = ref([])
const warehouses = ref([])
const paymentMethods = ['现金', '银行转账', '支付宝', '微信支付', '其他']

// Selection Indices
const supplierIndex = ref(-1)
const warehouseIndex = ref(-1)
const paymentIndex = ref(-1)

// Form State
const form = reactive({
  order_no: '',
  supplier_id: null,
  warehouse_id: null,
  payment_method: '',
  admin_remark: '',
  purchase_remark: '',
  items: [],
  image_urls: []
})

const totalOrderAmount = ref(0)

// Product Selector State
const showProductPopup = ref(false)

const loadOptions = async () => {
  try {
    const [sRes, wRes] = await Promise.all([
      commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
      commonApi.getWarehouses()
    ])
    if (sRes.code === 0) suppliers.value = sRes.data?.list || sRes.data || []
    if (wRes.code === 0) warehouses.value = wRes.data || []
  } catch (e) {
    // handled
  }
}

const loadDetail = async (id) => {
  try {
    const res = await purchaseApi.getOrderDetail(id)
    if (res.code === 0) {
      const data = res.data || {}
      form.order_no = data.order_no || ''
      form.admin_remark = data.admin_remark || ''
      form.purchase_remark = data.purchase_remark || ''
      form.supplier_id = data.supplier_id || null
      form.warehouse_id = data.warehouse_id || null
      form.payment_method = data.payment_method || ''
      form.image_urls = data.image_urls || []
      
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
  if (form.supplier_id && suppliers.value.length > 0) {
    supplierIndex.value = suppliers.value.findIndex(s => s.id === form.supplier_id)
  }
  if (form.warehouse_id && warehouses.value.length > 0) {
    warehouseIndex.value = warehouses.value.findIndex(w => w.id === form.warehouse_id)
  }
  if (form.payment_method) {
    paymentIndex.value = paymentMethods.indexOf(form.payment_method)
  }
}

const onSupplierChange = (e) => {
  supplierIndex.value = e.detail.value
  form.supplier_id = suppliers.value[supplierIndex.value]?.id || null
}

const onWarehouseChange = (e) => {
  warehouseIndex.value = e.detail.value
  form.warehouse_id = warehouses.value[warehouseIndex.value]?.id || null
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

const removeItemRow = (index) => {
  form.items.splice(index, 1)
  calcTotalAmount()
}

// Product Selector Handlers
const openProductSelector = () => {
  showProductPopup.value = true
}

const handleProductSelectConfirm = (selectedList) => {
  // Build a map of existing items to preserve user inputs like tax_rate or remark
  const existingMap = {}
  form.items.forEach(item => {
    existingMap[item.product_id] = item
  })
  
  form.items = selectedList.map(item => {
    const id = item.product_id
    const existing = existingMap[id]
    
    return {
      product_id: id,
      name: item.name || item.product_name,
      spec: item.spec || '',
      unit_name: item.unit_name || item.unit || '',
      quantity: item.quantity || 1,
      price: item.price ?? item.cost_price ?? 0,
      tax_rate: existing ? (existing.tax_rate ?? 13) : 13,
      remark: existing ? (existing.remark || '') : ''
    }
  })
  
  calcTotalAmount()
}

const chooseAndUploadImages = () => {
  const limit = 10 - (form.image_urls || []).length;
  if (limit <= 0) return;

  uni.chooseImage({
    count: limit,
    success: async (chooseRes) => {
      uni.showLoading({ title: '上传中...' });
      try {
        for (const filePath of chooseRes.tempFilePaths) {
          const res = await http.upload('/upload/file', filePath);
          if (res.code === 0 && res.data?.url) {
            form.image_urls.push(res.data.url);
          }
        }
        uni.showToast({ title: '上传成功', icon: 'success' });
      } catch (err) {
        uni.showToast({ title: err.message || '上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
}

const removeImage = (idx) => {
  form.image_urls.splice(idx, 1);
}

const previewUploadImage = (idx) => {
  uni.previewImage({
    urls: form.image_urls,
    current: form.image_urls[idx]
  });
}

const goCancel = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (!form.supplier_id) {
    uni.showToast({ title: '请选择供应商', icon: 'none' })
    return
  }
  if (!form.warehouse_id) {
    uni.showToast({ title: '请选择收货仓库', icon: 'none' })
    return
  }
  if (form.items.length === 0) {
    uni.showToast({ title: '请添加至少一项采购明细', icon: 'none' })
    return
  }
  
  // Validate details quantity and price
  for (let i = 0; i < form.items.length; i++) {
    const item = form.items[i]
    if (!item.quantity || Number(item.quantity) <= 0) {
      uni.showToast({ title: `明细 #${i + 1} 数量必须大于 0`, icon: 'none' })
      return
    }
    if (item.price === undefined || item.price === null || Number(item.price) < 0) {
      uni.showToast({ title: `明细 #${i + 1} 单价不能为负数`, icon: 'none' })
      return
    }
  }
  
  const payload = {
    order_no: form.order_no.trim() || undefined,
    supplier_id: Number(form.supplier_id),
    warehouse_id: Number(form.warehouse_id),
    payment_method: form.payment_method,
    admin_remark: form.admin_remark.trim(),
    purchase_remark: form.purchase_remark.trim(),
    image_urls: form.image_urls,
    items: form.items.map(it => ({
      product_id: Number(it.product_id),
      quantity: Number(it.quantity),
      price: Number(it.price),
      tax_rate: Number(it.tax_rate ?? 13),
      remark: it.remark.trim()
    }))
  }
  
  uni.showLoading({ title: '正在保存...' })
  try {
    let res
    if (editId.value) {
      res = await purchaseApi.updateOrder(editId.value, payload)
    } else {
      res = await purchaseApi.createOrder(payload)
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
    uni.setNavigationBarTitle({ title: '编辑采购订单' })
    await loadDetail(id)
  } else {
    uni.setNavigationBarTitle({ title: '新增采购订单' })
  }
})
</script>

<style lang="scss" scoped>
.order-edit-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
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
  }
}

.dialog-content {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);

  .show & {
    transform: translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 36rpx;
  border-bottom: 1rpx solid #F0F0F0;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.dialog-close {
  font-size: 44rpx;
  color: #909399;
  line-height: 1;
}

.dialog-body-scroll {
  flex: 1;
  height: 0;
  overflow: hidden;
}

/* 商品搜索 */
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

.section-subtitle {
  font-size: 24rpx;
  color: #909399;
}

.attachment-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 10rpx 0;
}

.attachment-upload-item {
  position: relative;
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid #EBEEF5;
  background: #F8FAFC;
}

.attachment-upload-img {
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.uploader-box {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #DCDFE6;
  background: #FAFAFA;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  &:active {
    background: #F2F6FC;
  }

  .uploader-text {
    font-size: 20rpx;
    color: #909399;
  }
}
</style>
