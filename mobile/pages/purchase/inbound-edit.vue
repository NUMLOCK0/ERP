<template>
  <view class="inbound-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 采购单信息 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基础信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">采购单号</text>
              <text class="info-value">{{ order.order_no || '-' }}</text>
            </view>
            <view class="form-item">
              <text class="form-label">供应商</text>
              <text class="info-value">{{ order.supplier_name || '-' }}</text>
            </view>
            <view class="form-item">
              <text class="form-label">入库单号</text>
              <input class="form-input" v-model="form.inbound_no" placeholder="自定义单号(留空自动生成)" />
            </view>
            <view class="form-item">
              <text class="form-label required">入库仓库</text>
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
              <text class="form-label required">入库状态</text>
              <view class="status-selector">
                <view class="status-btn" :class="{ active: form.inbound_status === 0 }" @click="form.inbound_status = 0">
                  <text class="status-btn-text">草稿</text>
                </view>
                <view class="status-btn" :class="{ active: form.inbound_status === 1 }" @click="form.inbound_status = 1">
                  <text class="status-btn-text">立即入库</text>
                </view>
              </view>
            </view>
            <view class="form-item vertical">
              <text class="form-label">入库备注</text>
              <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注说明(选填)" maxlength="200" />
            </view>
            <BusinessImageUpload v-model="form.image_urls" title="入库图片留痕" />
          </view>
        </view>

        <!-- ===== 入库明细 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">入库明细</text>
          </view>
          
          <view v-if="form.items.length > 0" class="items-wrap">
            <view class="item-row-card" v-for="(item, idx) in form.items" :key="idx">
              <view class="card-title-row">
                <text class="card-index-title">#{{ idx + 1 }} {{ item.product_name || '-' }}</text>
                <text class="card-spec-tag" v-if="item.spec">{{ item.spec }}</text>
              </view>

              <view class="item-grid-details">
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">单位：</text><text class="cell-value">{{ item.unit_name || '-' }}</text></view>
                  <view class="grid-cell"><text class="cell-label">采购单价：</text><text class="cell-value">¥{{ formatPrice(item.price) }}</text></view>
                </view>
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">税额/率：</text><text class="cell-value">¥{{ formatPrice(item.tax) }} ({{ item.tax_rate }}%)</text></view>
                  <view class="grid-cell"><text class="cell-label">采购总额：</text><text class="cell-value">¥{{ formatPrice(item.amount) }}</text></view>
                </view>
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">已入库：</text><text class="cell-value success">{{ item.inbounded_quantity }} {{ item.unit_name }}</text></view>
                  <view class="grid-cell"><text class="cell-label">待入库：</text><text class="cell-value primary">{{ item.remaining_quantity }} {{ item.unit_name }}</text></view>
                </view>
              </view>

              <view class="item-inputs-section">
                <view class="input-inline-item">
                  <text class="input-label required">本次入库</text>
                  <input class="input-field font-bold" type="number" v-model="item.inbound_quantity" placeholder="数量" />
                </view>
                <view class="input-inline-item">
                  <text class="input-label">入库货位</text>
                  <input class="input-field" v-model="item.location" placeholder="选填" />
                </view>
                <view class="input-inline-item wide">
                  <text class="input-label">入库备注</text>
                  <input class="input-field" v-model="item.remark" placeholder="选填" />
                </view>
              </view>
            </view>

            <!-- 统计汇总 -->
            <view class="summary-card">
              <view class="summary-row">
                <text class="summary-label">入库总项数</text>
                <text class="summary-val">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-row">
                <text class="summary-label">预计入库总金额</text>
                <text class="summary-val danger-text font-bold">¥{{ formatPrice(totalInboundAmount) }}</text>
              </view>
            </view>
          </view>
          
          <view v-else class="empty-items-state">
            <u-icon name="info-circle" size="48" color="#DCDFE6"></u-icon>
            <text class="empty-text">该采购订单没有可入库的明细</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">确认入库</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'
import { commonApi } from '@/api/common'
import BusinessImageUpload from '@/components/BusinessImageUpload.vue'

const orderId = ref(null)
const order = ref({})
const warehouses = ref([])
const warehouseIndex = ref(-1)

const form = reactive({
  inbound_no: '',
  warehouse_id: null,
  inbound_status: 1, // 默认立即入库 (status: 1)
  remark: '',
  image_urls: [],
  items: []
})

const totalInboundAmount = computed(() => {
  return form.items.reduce((sum, item) => {
    const qty = Number(item.inbound_quantity || 0)
    const price = Number(item.price || 0)
    return sum + (qty * price)
  }, 0)
})

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '0.00'
  return Number(val).toFixed(2)
}

const onWarehouseChange = (e) => {
  const index = e.detail.value
  warehouseIndex.value = index
  form.warehouse_id = warehouses.value[index]?.id || null
}

const loadData = async () => {
  if (!orderId.value) return
  uni.showLoading({ title: '加载中...' })
  try {
    // 1. 获取仓库选项列表
    const wRes = await commonApi.getWarehouses()
    if (wRes.code === 0) {
      warehouses.value = wRes.data || []
    }
    
    // 2. 获取采购订单明细
    const oRes = await purchaseApi.getOrderDetail(orderId.value)
    if (oRes.code === 0) {
      order.value = oRes.data || {}
      
      // 筛选剩余未入库的产品列表
      const remainingItems = (order.value.items || []).filter(
        item => Number(item.remaining_quantity || 0) > 0
      )
      
      form.items = remainingItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || item.name || '',
        spec: item.spec || '',
        unit_name: item.unit_name || '',
        price: Number(item.final_price ?? item.price ?? 0),
        tax: Number(item.final_tax ?? item.tax ?? 0),
        tax_rate: Number(item.tax_rate ?? 13),
        amount: Number(item.final_amount ?? item.amount ?? 0),
        inbounded_quantity: Number(item.inbounded_quantity || 0),
        remaining_quantity: Number(item.remaining_quantity || 0),
        inbound_quantity: Number(item.remaining_quantity || 0), // 默认入库全部剩余
        location: '',
        remark: ''
      }))
      
      // 自动匹配采购单设定的入库仓库
      if (order.value.warehouse_id && warehouses.value.length > 0) {
        const idx = warehouses.value.findIndex(w => w.id === order.value.warehouse_id)
        if (idx !== -1) {
          warehouseIndex.value = idx
          form.warehouse_id = order.value.warehouse_id
        }
      } else if (warehouses.value.length > 0) {
        warehouseIndex.value = 0
        form.warehouse_id = warehouses.value[0].id
      }
    }
  } catch (e) {
    // 错误由请求拦截器统一提示
  } finally {
    uni.hideLoading()
  }
}

onLoad((options) => {
  if (options && options.order_id) {
    orderId.value = options.order_id
  } else {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    orderId.value = currentPage?.$page?.options?.order_id || currentPage?.options?.order_id
  }
  loadData()
})

const goCancel = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (!form.warehouse_id) {
    uni.showToast({ title: '请选择入库仓库', icon: 'none' })
    return
  }
  
  const inboundItems = form.items.filter(item => Number(item.inbound_quantity || 0) > 0)
  if (inboundItems.length === 0) {
    uni.showToast({ title: '入库明细不能为空，请输入至少一个商品入库量', icon: 'none' })
    return
  }
  
  // 检查入库量上限
  for (const item of inboundItems) {
    if (Number(item.inbound_quantity) > Number(item.remaining_quantity)) {
      uni.showToast({
        title: `${item.product_name} 的入库量超过待入库量`,
        icon: 'none'
      })
      return
    }
  }
  
  uni.showLoading({ title: '提交中...' })
  try {
    const payload = {
      inbound_no: form.inbound_no.trim() || undefined,
      warehouse_id: form.warehouse_id,
      inbound_status: form.inbound_status,
      remark: form.remark,
      image_urls: form.image_urls,
      items: inboundItems.map(item => ({
        product_id: item.product_id,
        inbound_quantity: Number(item.inbound_quantity),
        price: item.price,
        location: item.location || '',
        remark: item.remark || ''
      }))
    }
    
    const res = await purchaseApi.createOrderInbound(orderId.value, payload)
    uni.hideLoading()
    if (res.code === 0) {
      uni.showToast({ title: '入库成功', icon: 'success' })
      setTimeout(() => {
        // 重定向跳转到采购入库单列表页
        uni.redirectTo({
          url: '/pages/purchase/inbound-list'
        })
      }, 800)
    }
  } catch (e) {
    uni.hideLoading()
  }
}
</script>

<style scoped lang="scss">
.inbound-edit-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.form-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 24rpx 24rpx 180rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.section {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid #f2f6fc;
  padding-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
  position: relative;
  padding-left: 16rpx;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: #1890ff;
    border-radius: 4rpx;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  border-bottom: 1rpx solid #f8fafc;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.vertical {
    flex-direction: column;
    align-items: flex-start;
    gap: 16rpx;
    border-bottom: none;
  }
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  
  &.required::after {
    content: ' *';
    color: #f56c6c;
  }
}

.info-value {
  font-size: 28rpx;
  color: #303133;
  font-weight: 600;
  text-align: right;
  flex: 1;
}

.product-info-text {
  font-size: 28rpx;
  color: #303133;
  text-align: right;
  flex: 1;
}

.form-picker {
  flex: 1;
}

.picker-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
}

.picker-value {
  font-size: 28rpx;
  color: #303133;
  font-weight: 600;
  
  &.placeholder {
    color: #c0c4cc;
    font-weight: normal;
  }
}

.status-selector {
  display: flex;
  background: #f4f4f5;
  border-radius: 12rpx;
  padding: 4rpx;
  gap: 4rpx;
}

.status-btn {
  padding: 10rpx 28rpx;
  border-radius: 10rpx;
  transition: all 0.2s;
  
  &.active {
    background: #ffffff;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    
    .status-btn-text {
      color: #1890ff;
      font-weight: 700;
    }
  }
}

.status-btn-text {
  font-size: 26rpx;
  color: #909399;
}

.form-textarea {
  width: 100%;
  height: 120rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 28rpx;
  color: #303133;
  box-sizing: border-box;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
  
  &.font-bold {
    font-weight: 700;
  }
}

.items-wrap {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.item-row-card {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid #eef2f6;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
  border-bottom: 1rpx solid #eef2f6;
  padding-bottom: 10rpx;
}

.card-index-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #303133;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.card-spec-tag {
  font-size: 20rpx;
  background: #e8f4ff;
  color: #1890ff;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  max-width: 180rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.item-grid-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
}

.grid-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.grid-cell {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #606266;
}

.cell-label {
  color: #909399;
}

.cell-value {
  font-weight: 600;
  color: #303133;
  
  &.primary {
    color: #1890ff;
  }
  
  &.success {
    color: #67c23a;
  }
}

.item-inputs-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

.input-inline-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #ffffff;
  border: 1rpx solid #dcdfe6;
  border-radius: 10rpx;
  padding: 6rpx 12rpx;
  
  &.wide {
    grid-column: 1 / -1;
  }
}

.input-label {
  font-size: 22rpx;
  color: #606266;
  flex-shrink: 0;
  
  &.required::after {
    content: '*';
    color: #f56c6c;
  }
}

.input-field {
  flex: 1;
  font-size: 24rpx;
  color: #303133;
  text-align: right;
  height: 48rpx;
  min-height: 48rpx;
  
  &.font-bold {
    font-weight: 700;
    color: #1890ff;
  }
}

.summary-card {
  background: #fff8f8;
  border: 1rpx dashed #ffcbcb;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
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
    color: #f56c6c;
  }
  
  &.font-bold {
    font-weight: 700;
  }
}

.empty-items-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 60rpx 0;
  
  .empty-text {
    font-size: 26rpx;
    color: #c0c4cc;
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
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
    background: #f4f4f5;
    color: #909399;
  }
  
  &.primary {
    background: #1890ff;
    color: #ffffff;
    box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
  }
  
  &:active {
    opacity: 0.85;
  }
}
</style>
