<template>
  <view class="edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">单号</text>
              <input v-model="form.other_in_no" class="form-input" placeholder="自定义单号(留空自动生成)" />
            </view>
            <view class="form-item">
              <text class="form-label required">仓库</text>
              <picker mode="selector" :range="warehouseLabels" @change="onWarehouseChange">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: warehouseIndex === -1 }">
                    {{ warehouseLabels[warehouseIndex] || '请选择仓库' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"  />
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">备注</text>
              <input v-model="form.remark" class="form-input" placeholder="请输入备注" />
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-header list-title-row">
            <text class="section-title">入库明细</text>
            <view class="add-row-btn" @click="openPicker">
              <u-icon name="plus" size="14" color="#1890FF"  />
              <text class="add-row-text">添加产品</text>
            </view>
          </view>

          <view v-if="form.items.length > 0" class="items-wrap">
            <view v-for="(item, index) in form.items" :key="item.product_id" class="item-row-card">
              <view class="card-title-row">
                <text class="card-index-title">{{ item.product_name }}</text>
                <text class="remove-row-btn" @click="removeItem(index)">删除</text>
              </view>
              <view class="form-group row-group">
                <view class="form-item">
                  <text class="form-label">编码</text>
                  <text class="product-info-text">{{ item.code || '-' }}</text>
                </view>
                <view class="form-item">
                  <text class="form-label required">数量</text>
                  <input v-model="item.quantity" class="form-input" type="number" />
                </view>
                <view class="form-item">
                  <text class="form-label required">单价</text>
                  <input v-model="item.price" class="form-input" type="number" />
                </view>
                <view class="form-item">
                  <text class="form-label">金额</text>
                  <text class="product-info-text text-success">¥{{ formatMoney(item.quantity * item.price) }}</text>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="empty-items-state">
            <u-icon name="grid" size="48" color="#DCDFE6"  />
            <text class="empty-items-text">暂无明细，请先添加产品</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goBack">取消</view>
      <view class="bottom-btn primary" @click="submit">提交</view>
    </view>

    <!-- 商品选择弹窗 -->
    <product-select-popup
      v-model:show="pickerShown"
      :selected-ids="selectedProductIds"
      @confirm="handleProductSelectConfirm"
    />
  </view>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { productApi } from '@/api/product'
import { warehouseApi } from '@/api/warehouse'

const warehouses = ref([])
const warehouseIndex = ref(-1)
const pickerShown = ref(false)

const selectedProductIds = computed(() => {
  return form.items.map(item => item.product_id)
})

const form = reactive({
  other_in_no: '',
  warehouse_id: null,
  remark: '',
  items: []
})

const warehouseLabels = computed(() => warehouses.value.map(item => item.name))

async function loadOptions() {
  const warehouseRes = await warehouseApi.getList({ page: 1, pageSize: 1000, status: 1 })
  warehouses.value = warehouseRes.data?.list || warehouseRes.data || []
  if (warehouses.value.length > 0) {
    warehouseIndex.value = 0
    form.warehouse_id = warehouses.value[0].id
  }
}

function onWarehouseChange(e) {
  warehouseIndex.value = Number(e.detail.value)
  form.warehouse_id = warehouses.value[warehouseIndex.value]?.id || null
}

function openPicker() {
  pickerShown.value = true
}

function handleProductSelectConfirm(selectedList) {
  const currentItems = [...form.items]
  form.items = selectedList.map(prod => {
    const existing = currentItems.find(item => item.product_id === prod.id)
    if (existing) {
      return {
        product_id: prod.id,
        product_name: prod.name,
        code: prod.code || '',
        quantity: existing.quantity,
        price: existing.price
      }
    } else {
      return {
        product_id: prod.id,
        product_name: prod.name,
        code: prod.code || '',
        quantity: prod.quantity || 1,
        price: Number(prod.price || prod.cost_price || prod.sale_price || 0)
      }
    }
  })
}

function removeItem(index) {
  form.items.splice(index, 1)
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function goBack() {
  uni.navigateBack()
}

async function submit() {
  if (!form.warehouse_id) {
    uni.showToast({ title: '请选择仓库', icon: 'none' })
    return
  }
  if (!form.items.length) {
    uni.showToast({ title: '请先添加产品', icon: 'none' })
    return
  }

  await inventoryApi.createOtherIn({
    inbound_no: form.other_in_no.trim() || undefined,
    warehouse_id: form.warehouse_id,
    remark: form.remark.trim(),
    items: form.items.map(item => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0)
    }))
  })

  uni.showToast({ title: '提交成功', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 400)
}

onMounted(() => {
  loadOptions()
})
</script>

<style scoped lang="scss">
.edit-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
}

.form-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 20rpx;
}

.section {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.list-title-row {
  margin-bottom: 16rpx;
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
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  width: 160rpx;
  flex-shrink: 0;
}

.form-label.required::after {
  content: '*';
  color: #F56C6C;
  margin-left: 4rpx;
}

.picker-inner {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.picker-value {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
}

.picker-value.placeholder {
  color: #C0C4CC;
  font-weight: 400;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
}

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

.row-group .form-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #EBEEF5;
}

.product-info-text {
  flex: 1;
  font-size: 26rpx;
  color: #303133;
  font-weight: 600;
  text-align: right;
}

.product-info-text.text-success {
  color: #67C23A;
}

.empty-items-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.empty-items-text {
  font-size: 24rpx;
  color: #C0C4CC;
  margin-top: 12rpx;
}

.bottom-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
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
}

.bottom-btn.outline {
  background: #F4F4F5;
  color: #909399;
}

.bottom-btn.primary {
  background: #1890FF;
  color: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: flex-end;
  pointer-events: none;
  visibility: hidden;
  transition: all 0.24s ease-out;
}

.dialog-overlay.show {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  visibility: visible;
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
}

.dialog-overlay.show .dialog-content {
  transform: translateY(0);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 36rpx;
  border-bottom: 1rpx solid #F0F0F0;
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

.popup-search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 36rpx;
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
}

.prod-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  overflow: hidden;
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

.prod-code,
.prod-spec {
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
}

.popup-empty-text {
  font-size: 24rpx;
  color: #C0C4CC;
}

.popup-loading {
  padding: 10rpx 0;
}
</style>
