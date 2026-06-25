<template>
  <view class="payment-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">关联采购单</text>
              <picker class="form-picker" @change="onOrderChange" :value="orderIndex" :range="orders" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: orderIndex === -1 }">
                    {{ orders[orderIndex]?.label || '请选择采购单(可空)' }}
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
              <text class="form-label required">应付总额</text>
              <input class="form-input" type="digit" v-model="form.should_amount" placeholder="请输入应付总额" />
            </view>
            <view class="form-item">
              <text class="form-label required">本次实付</text>
              <input class="form-input" type="digit" v-model="form.amount" placeholder="请输入实付金额" />
            </view>
            <view class="form-item">
              <text class="form-label required">付款方式</text>
              <picker class="form-picker" @change="onPayMethodChange" :value="payMethodIndex" :range="payMethods">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: payMethodIndex === -1 }">
                    {{ payMethods[payMethodIndex] || '请选择付款方式' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">付款备注</text>
              <input class="form-input" v-model="form.remark" placeholder="请输入付款备注(选填)" maxlength="200" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存付款单</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { financeApi } from '@/api/finance'
import { purchaseApi } from '@/api/purchase'
import { commonApi } from '@/api/common'

// Dropdown Options
const suppliers = ref([])
const orders = ref([])
const payMethods = ['账期结算', '预付款', '银行转账', '现金支付', '在线支付', '其他方式']

// Selection Indices
const supplierIndex = ref(-1)
const orderIndex = ref(-1)
const payMethodIndex = ref(-1)

// Form State
const form = reactive({
  supplier_id: null,
  order_id: 0,
  inbound_id: 0,
  should_amount: '',
  amount: '',
  pay_method: '',
  remark: ''
})

const loadOptions = async () => {
  try {
    const [sRes, oRes] = await Promise.all([
      commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
      purchaseApi.getOrders({ page: 1, pageSize: 1000 })
    ])
    if (sRes.code === 0) suppliers.value = sRes.data?.list || sRes.data || []
    if (oRes.code === 0) {
      const listData = oRes.data?.list || oRes.data || []
      orders.value = [
        { id: null, label: '无（手动创建付款单）' },
        ...listData.map(item => ({
          ...item,
          label: `${item.order_no} (${item.supplier_name || ''})`
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

const onPayMethodChange = (e) => {
  const index = e.detail.value
  payMethodIndex.value = index
  form.pay_method = payMethods[index] || ''
}

const onOrderChange = (e) => {
  const index = e.detail.value
  orderIndex.value = index
  const selected = orders.value[index]
  if (!selected) return

  form.order_id = selected.id || 0
  
  if (selected.id === null) {
    form.should_amount = ''
    form.amount = ''
    return
  }

  // Find supplier index and sync
  const sIdx = suppliers.value.findIndex(s => s.id === selected.supplier_id)
  if (sIdx !== -1) {
    supplierIndex.value = sIdx
    form.supplier_id = selected.supplier_id
  }

  // Set amounts based on purchase order totals
  const totalAmount = Number(selected.total_price || selected.total_amount || 0)
  form.should_amount = totalAmount > 0 ? totalAmount.toFixed(2) : ''
  form.amount = totalAmount > 0 ? totalAmount.toFixed(2) : ''
}

const handleSave = async () => {
  if (!form.supplier_id) {
    uni.showToast({ title: '请选择供应商', icon: 'none' })
    return
  }
  
  const shouldAmount = Number(form.should_amount || 0)
  const amount = Number(form.amount || 0)
  
  if (shouldAmount <= 0) {
    uni.showToast({ title: '应付金额必须大于0', icon: 'none' })
    return
  }
  if (amount <= 0) {
    uni.showToast({ title: '实付金额必须大于0', icon: 'none' })
    return
  }
  if (amount > shouldAmount) {
    uni.showToast({ title: '实付金额不能大于应付金额', icon: 'none' })
    return
  }
  if (!form.pay_method) {
    uni.showToast({ title: '请选择付款方式', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在保存...' })
  try {
    const payload = {
      supplier_id: form.supplier_id,
      order_id: form.order_id,
      inbound_id: form.inbound_id,
      should_amount: shouldAmount,
      amount: amount,
      pay_method: form.pay_method,
      status: amount >= shouldAmount ? 2 : 1, // 2: paid, 1: paying
      remark: form.remark.trim()
    }
    const res = await financeApi.createPayment(payload)
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
.payment-edit-page {
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
