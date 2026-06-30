<template>
  <view class="return-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- 基本信息 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">退货单号</text>
              <input class="form-input" v-model="form.return_no" placeholder="自定义单号(留空自动生成)" />
            </view>
            <view class="form-item">
              <text class="form-label required">关联发货单</text>
              <picker class="form-picker" @change="onDeliveryChange" :value="deliveryIndex" :range="deliveries" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: deliveryIndex === -1 }">
                    {{ deliveries[deliveryIndex]?.label || '请选择关联发货单' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item" v-if="selectedDelivery">
              <text class="form-label">客户</text>
              <text class="form-value-text">{{ selectedDelivery.customer_name || '-' }}</text>
            </view>
            <view class="form-item" v-if="selectedDelivery">
              <text class="form-label">销售员</text>
              <text class="form-value-text">{{ selectedDelivery.employee_name || '-' }}</text>
            </view>
            <view class="form-item">
              <text class="form-label required">退货状态</text>
              <picker class="form-picker" @change="onStatusChange" :value="statusIndex" :range="statuses" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value">
                    {{ statuses[statusIndex]?.label }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">退货原因</text>
              <input class="form-input" v-model="form.reason" placeholder="请输入退货原因或备注" maxlength="200" />
            </view>
          </view>
        </view>

        <!-- 物流信息 (仅已退货状态下可选/必填) -->
        <view class="section" v-if="Number(form.status) === 1">
          <view class="section-header">
            <text class="section-title">退货物流信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">物流公司</text>
              <input class="form-input" v-model="form.express_name" placeholder="请输入物流公司" />
            </view>
            <view class="form-item">
              <text class="form-label required">快递单号</text>
              <input class="form-input" v-model="form.express_no" placeholder="请输入快递单号" />
            </view>
          </view>
        </view>

        <!-- 退货联系信息 -->
        <view class="section" v-if="selectedDelivery">
          <view class="section-header">
            <text class="section-title">退货联系人信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">联系人</text>
              <input class="form-input" v-model="form.contact" placeholder="请输入联系人(选填)" />
            </view>
            <view class="form-item">
              <text class="form-label">联系电话</text>
              <input class="form-input" v-model="form.phone" placeholder="请输入联系电话(选填)" />
            </view>
            <view class="form-item">
              <text class="form-label">地址</text>
              <input class="form-input" v-model="form.address" placeholder="请输入退货地址(选填)" />
            </view>
          </view>
        </view>

        <!-- 商品明细 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">退货商品明细</text>
          </view>

          <view v-if="form.items.length > 0" class="items-wrap">
            <view class="item-row-card" v-for="(item, idx) in form.items" :key="idx">
              <view class="card-title-row">
                <text class="card-index-title">商品明细 #{{ idx + 1 }}</text>
              </view>

              <view class="form-group row-group">
                <view class="form-item">
                  <text class="form-label">商品名称</text>
                  <text class="product-info-text">{{ item.name || '-' }}</text>
                </view>
                <view class="form-item" v-if="item.spec || item.code">
                  <text class="form-label">规格编码</text>
                  <text class="product-info-text">{{ item.spec || '-' }} ({{ item.code || '-' }})</text>
                </view>
                <view class="form-item">
                  <text class="form-label">发货数量</text>
                  <text class="product-info-text">{{ item.delivery_quantity }}{{ item.unit_name || '' }} (已退: {{ item.returned_quantity }})</text>
                </view>
                <view class="form-item">
                  <text class="form-label required">退货数量</text>
                  <input class="form-input" type="number" v-model="item.quantity" :placeholder="'最多可退 ' + item.available_quantity" @input="onItemQtyInput(idx)" />
                </view>
                <view class="form-item">
                  <text class="form-label">退款单价</text>
                  <text class="product-info-text">¥{{ formatPrice(item.price) }}</text>
                </view>
                <view class="form-item">
                  <text class="form-label">退款金额</text>
                  <text class="product-info-text text-danger font-bold">¥{{ formatPrice(item.refund_amount) }}</text>
                </view>
              </view>
            </view>

            <!-- 汇总 -->
            <view class="summary-card">
              <view class="summary-row">
                <text class="summary-label">退货总项数</text>
                <text class="summary-val">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-row">
                <text class="summary-label">预计退款总额</text>
                <text class="summary-val danger-text font-bold">¥{{ formatPrice(totalRefundAmount) }}</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-items-state">
            <u-icon name="rewind-left" size="48" color="#DCDFE6"></u-icon>
            <text class="empty-items-text">请先在上方选择关联发货单以加载发货商品明细</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存退货单</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'

const deliveries = ref([])
const deliveryIndex = ref(-1)
const selectedDelivery = ref(null)

const statuses = [
  { label: '待退货', value: 0 },
  { label: '已退货', value: 1 }
]
const statusIndex = ref(0)

const form = reactive({
  return_no: '',
  delivery_id: null,
  status: 0,
  express_name: '',
  express_no: '',
  contact: '',
  phone: '',
  address: '',
  reason: '',
  items: []
})

const totalRefundAmount = ref(0)

const loadDeliveryGoods = async (delivery) => {
  if (!delivery) return
  form.delivery_id = delivery.id
  selectedDelivery.value = delivery
  form.contact = delivery.contact || ''
  form.phone = delivery.phone || ''
  form.address = delivery.detail_address || delivery.address || ''

  uni.showLoading({ title: '加载发货单商品...' })
  try {
    const res = await saleApi.getDeliveryDetail(delivery.id)
    if (res.code === 0 && res.data) {
      const dDetail = res.data
      const rawItems = dDetail.items || []
      
      form.items = rawItems
        .map(item => {
          const avail = Number(item.quantity || 0) - Number(item.returned_quantity || 0)
          return {
            delivery_item_id: item.id,
            product_id: item.product_id,
            name: item.product_name,
            code: item.code || '',
            spec: item.spec || '',
            unit_name: item.unit_name || '',
            delivery_quantity: Number(item.quantity || 0),
            returned_quantity: Number(item.returned_quantity || 0),
            available_quantity: avail > 0 ? avail : 0,
            quantity: avail > 0 ? avail : 0,
            price: Number(item.price || 0),
            tax: Number(item.tax || 0),
            refund_amount: 0
          }
        })
        .filter(item => item.available_quantity > 0)
      
      form.items.forEach((item, idx) => {
        onItemQtyInput(idx)
      })
    }
  } catch (err) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const loadDeliveries = async (targetDeliveryId) => {
  try {
    const res = await saleApi.getDeliveries({ page: 1, pageSize: 1000 })
    if (res.code === 0) {
      const listData = res.data?.list || res.data || []
      // Backend validates: only shipped (1) or received (2) can be returned
      deliveries.value = listData
        .filter(item => [1, 2].includes(Number(item.status)))
        .map(item => ({
          ...item,
          label: item.delivery_no + ' (' + (item.customer_name || '') + ')'
        }))

      if (targetDeliveryId) {
        const idx = deliveries.value.findIndex(item => Number(item.id) === Number(targetDeliveryId))
        if (idx > -1) {
          deliveryIndex.value = idx
          await loadDeliveryGoods(deliveries.value[idx])
        }
      }
    }
  } catch (e) {
    // handled
  }
}

const onDeliveryChange = (e) => {
  const index = e.detail.value
  deliveryIndex.value = index
  const delivery = deliveries.value[index]
  if (delivery) {
    loadDeliveryGoods(delivery)
  }
}

const onStatusChange = (e) => {
  statusIndex.value = e.detail.value
  form.status = statuses[statusIndex.value].value
}

const onItemQtyInput = (idx) => {
  const item = form.items[idx]
  if (item) {
    let qty = Number(item.quantity || 0)
    if (qty > item.available_quantity) {
      qty = item.available_quantity
      item.quantity = qty
      uni.showToast({ title: `退货数量不能超过 ${item.available_quantity}`, icon: 'none' })
    }
    
    // Proportional tax = source.tax * quantity / source.quantity
    const proportionalTax = item.delivery_quantity > 0
      ? (Number(item.tax || 0) * qty) / item.delivery_quantity
      : 0
    
    item.refund_amount = Number((qty * item.price + proportionalTax).toFixed(2))
  }
  calcTotalRefund()
}

const calcTotalRefund = () => {
  totalRefundAmount.value = form.items.reduce((sum, item) => sum + Number(item.refund_amount || 0), 0)
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const goCancel = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (!form.delivery_id) {
    uni.showToast({ title: '请选择关联发货单', icon: 'none' })
    return
  }
  
  if (Number(form.status) === 1) {
    if (!form.express_name.trim()) {
      uni.showToast({ title: '请输入物流公司', icon: 'none' })
      return
    }
    if (!form.express_no.trim()) {
      uni.showToast({ title: '请输入快递单号', icon: 'none' })
      return
    }
  }

  const validItems = form.items.filter(item => Number(item.quantity) > 0)
  if (!validItems.length) {
    uni.showToast({ title: '退货明细数量不能全为0', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在保存...' })
  try {
    const payload = {
      return_no: form.return_no.trim() || undefined,
      delivery_id: form.delivery_id,
      status: Number(form.status),
      express_name: form.express_name.trim(),
      express_no: form.express_no.trim(),
      contact: form.contact.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      reason: form.reason.trim(),
      items: validItems.map(item => ({
        delivery_item_id: item.delivery_item_id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        refund_amount: Number(item.refund_amount)
      }))
    }
    
    const res = await saleApi.createReturn(payload)
    if (res.code === 0) {
      uni.showToast({ title: '新建成功', icon: 'success' })
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

onLoad((options) => {
  const deliveryId = options?.delivery_id
  loadDeliveries(deliveryId)
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
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
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

.form-value-text {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
}

/* 商品明细 */
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
  padding: 0 40rpx;
  line-height: 1.5;
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
</style>
