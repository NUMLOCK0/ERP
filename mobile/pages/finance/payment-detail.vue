<template>
  <view class="payment-detail">
    <view v-if="ret.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">付款单信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">付款单号</text>
            <text class="info-value">{{ ret.payment_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">付款状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[ret.status] || '未知'" size="small" :type="getStatusType(ret.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">关联采购单</text>
            <text class="info-value">{{ ret.order_no || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ ret.supplier_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">应付总额</text>
            <text class="info-value font-bold">¥{{ formatPrice(ret.receivable_total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">已付金额</text>
            <text class="info-value text-success font-bold">¥{{ formatPrice(ret.paid_total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">未付金额</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(ret.unpaid_total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">最近付款方式</text>
            <text class="info-value">{{ ret.pay_method || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ ret.contact || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ ret.phone || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(ret.created_at || ret.createdAt) }}</text>
          </view>
          <view class="info-item" v-if="ret.remark || ret.detail_remark" style="width: 100%;">
            <text class="info-label">备注说明</text>
            <text class="info-value">{{ ret.remark || ret.detail_remark }}</text>
          </view>
        </view>
      </view>

      <!-- 供应商开户信息 -->
      <view class="card" v-if="ret.bank_name || ret.bank_account">
        <view class="card-title">供应商开户信息</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">开户银行</text>
            <text class="info-value">{{ ret.bank_name || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">开户账号</text>
            <text class="info-value">{{ ret.bank_account || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">开户户名</text>
            <text class="info-value">{{ ret.bank_account_name || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="ret.bank_address">
            <text class="info-label">银行地址</text>
            <text class="info-value">{{ ret.bank_address }}</text>
          </view>
        </view>
      </view>

      <!-- 付款记录 -->
      <view class="card">
        <view class="card-title">付款明细历史</view>
        <view class="records-list" v-if="ret.payment_records && ret.payment_records.length > 0">
          <view class="record-item-card" v-for="(record, idx) in ret.payment_records" :key="idx">
            <view class="record-header">
              <text class="record-idx">第 {{ idx + 1 }} 笔付款</text>
              <text class="record-amount">¥{{ formatPrice(record.amount) }}</text>
            </view>
            <view class="record-body">
              <view class="record-row">
                <text class="record-label">付款方式：</text>
                <text class="record-val">{{ record.pay_method || '-' }}</text>
              </view>
              <view class="record-row">
                <text class="record-label">付款人：</text>
                <text class="record-val">{{ record.payer || '-' }}</text>
              </view>
              <view class="record-row">
                <text class="record-label">付款时间：</text>
                <text class="record-val">{{ formatDate(record.pay_time) }}</text>
              </view>
              <view class="record-row" v-if="record.remark">
                <text class="record-label">备注：</text>
                <text class="record-val">{{ record.remark }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="empty-records" v-else>
          <text class="empty-records-text">暂无历史付款流水</text>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">付款单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="ret.id" class="bottom-bar safe-bottom">
      <button v-if="Number(ret.status) < 2" class="btn-primary" @click="openConfirmPopup">确认付款</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>

    <!-- 确认付款弹窗 -->
    <view v-if="showConfirmPopup" class="popup-overlay" @click="closePopup">
      <view class="popup-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">确认付款</text>
          <view class="close-btn" @click="closePopup">
            <uni-icons type="closeempty" size="20" color="#999"></uni-icons>
          </view>
        </view>

        <view class="sheet-body">
          <view class="form-item">
            <text class="form-label">未付总金额</text>
            <text class="product-info-text text-danger font-bold">¥{{ formatPrice(ret.unpaid_total_amount) }}</text>
          </view>
          <view class="form-item">
            <text class="form-label required">付款金额</text>
            <input class="form-input" type="digit" v-model="form.amount" placeholder="请输入付款金额" />
          </view>
          <view class="form-item">
            <text class="form-label required">付款人</text>
            <input class="form-input" v-model="form.payer" placeholder="请输入付款人" maxlength="30" />
          </view>
          <view class="form-item">
            <text class="form-label required">付款日期</text>
            <picker class="form-picker" mode="date" :value="payDate" @change="onPayDateChange">
              <view class="picker-inner">
                <text class="picker-value" :class="{ placeholder: !payDate }">
                  {{ payDate || '请选择付款日期' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
              </view>
            </picker>
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
            <text class="form-label">备注说明</text>
            <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注说明（最多300字）" :maxlength="300" />
          </view>
        </view>

        <view class="sheet-footer">
          <button class="btn-cancel" @click="closePopup">取消</button>
          <button class="btn-confirm" @click="submitConfirm">确认付款</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { financeApi } from '@/api/finance'

const ret = ref({})
const loading = ref(true)
const showConfirmPopup = ref(false)

const payDate = ref('')
const payMethodIndex = ref(-1)
const payMethods = ['账期结算', '预付款', '银行转账', '现金支付', '在线支付', '其他方式']

const form = ref({
  amount: '',
  payer: '',
  pay_time: '',
  pay_method: '',
  remark: ''
})

const statusMap = {
  0: '待付款',
  1: '付款中',
  2: '已付款',
  3: '已关闭'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'info'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) { loading.value = false; return }

  loading.value = true
  try {
    const res = await financeApi.getPaymentDetail(id)
    if (res.code === 0) {
      ret.value = res.data || {}
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}

const openConfirmPopup = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  payDate.value = `${y}-${m}-${d}`

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  
  form.value = {
    amount: formatPrice(ret.value.unpaid_total_amount),
    payer: '',
    pay_time: `${payDate.value} ${hh}:${mm}:${ss}`,
    pay_method: '',
    remark: ''
  }

  // Pre-fill last used payment method index
  if (ret.value.pay_method) {
    payMethodIndex.value = payMethods.indexOf(ret.value.pay_method)
    if (payMethodIndex.value !== -1) {
      form.value.pay_method = ret.value.pay_method
    }
  } else {
    payMethodIndex.value = -1
  }

  showConfirmPopup.value = true
}

const closePopup = () => {
  showConfirmPopup.value = false
}

const onPayDateChange = (e) => {
  payDate.value = e.detail.value
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  form.value.pay_time = `${payDate.value} ${hh}:${mm}:${ss}`
}

const onPayMethodChange = (e) => {
  const index = e.detail.value
  payMethodIndex.value = index
  form.value.pay_method = payMethods[index] || ''
}

const submitConfirm = async () => {
  const amount = Number(form.value.amount || 0)
  if (amount <= 0) {
    uni.showToast({ title: '付款金额必须大于0', icon: 'none' })
    return
  }
  if (amount > Number(ret.value.unpaid_total_amount || 0)) {
    uni.showToast({ title: '付款金额不能大于未付金额', icon: 'none' })
    return
  }
  if (!form.value.payer.trim()) {
    uni.showToast({ title: '请输入付款人', icon: 'none' })
    return
  }
  if (!form.value.pay_time) {
    uni.showToast({ title: '请选择付款时间', icon: 'none' })
    return
  }
  if (!form.value.pay_method) {
    uni.showToast({ title: '请选择付款方式', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const res = await financeApi.payPayment(ret.value.id, {
      amount,
      payer: form.value.payer.trim(),
      pay_time: form.value.pay_time,
      pay_method: form.value.pay_method,
      remark: form.value.remark.trim()
    })
    if (res.code === 0) {
      uni.showToast({ title: '付款登记成功', icon: 'success' })
      closePopup()
      loadDetail()
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const goBack = () => {
  uni.navigateBack()
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.payment-detail {
  min-height: 100vh;
  background: #F5F7FA;
  box-sizing: border-box;
  padding-bottom: calc(120rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.detail-content {
  padding: 20rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);

  .card-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #303133;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #F2F6FC;
  }
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  .info-item {
    width: 50%;
    padding: 10rpx 0;
    box-sizing: border-box;
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 4rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 500; word-break: break-all; }
    .date-text { color: #909399; font-size: 24rpx; }
    .font-bold { font-weight: 700; }
    .text-success { color: #67C23A; }
    .text-danger { color: #F56C6C; }
  }
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item-card {
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid #EBEEF5;

  .record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1rpx solid #EBEEF5;
    padding-bottom: 10rpx;
    margin-bottom: 10rpx;

    .record-idx {
      font-size: 24rpx;
      font-weight: 600;
      color: #909399;
    }
    .record-amount {
      font-size: 28rpx;
      font-weight: 700;
      color: #F56C6C;
    }
  }

  .record-body {
    .record-row {
      display: flex;
      padding: 4rpx 0;
      font-size: 22rpx;
      .record-label {
        color: #909399;
        width: 130rpx;
        flex-shrink: 0;
      }
      .record-val {
        color: #303133;
        font-weight: 500;
      }
    }
  }
}

.empty-records {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
  .empty-records-text {
    font-size: 24rpx;
    color: #C0C4CC;
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 99;

  button {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 32rpx;
    font-size: 26rpx;
    border-radius: 16rpx;
    font-weight: 600;
    margin: 0;
    
    &::after { border: none; }

    &.btn-primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
    }
  }
}

/* 弹出层 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  display: flex;
  align-items: flex-end;
}

.popup-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.sheet-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx;
  position: relative;
  border-bottom: 1rpx solid #F2F6FC;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
}

.close-btn {
  position: absolute;
  right: 30rpx;
  top: 30rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-body {
  padding: 30rpx;
  
  .form-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #F2F6FC;

    &:last-child {
      border-bottom: none;
    }
    
    .form-label {
      font-size: 26rpx;
      color: #606266;
      font-weight: 500;
      flex-shrink: 0;
      width: 160rpx;

      &.required::after {
        content: '*';
        color: #F56C6C;
        margin-left: 4rpx;
      }
    }
    
    .form-input {
      flex: 1;
      text-align: right;
      font-size: 28rpx;
      color: #303133;
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
    
    .form-textarea {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 120rpx;
      padding: 16rpx 20rpx;
      font-size: 26rpx;
      color: #303133;
      width: 100%;
      box-sizing: border-box;
      text-align: left;
    }

    .product-info-text {
      font-size: 28rpx;
      color: #303133;
      font-weight: 600;
      text-align: right;
      flex: 1;
      
      &.text-danger {
        color: #F56C6C;
      }
    }
  }
}

.sheet-footer {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx 20rpx;
  
  button {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 28rpx;
    font-weight: 600;
    border-radius: 44rpx;
    margin: 0;
    
    &::after { border: none; }
    
    &.btn-cancel {
      background: #F4F4F5;
      color: #909399;
    }
    
    &.btn-confirm {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
  }
}

.empty-state, .loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
  .empty-text { font-size: 26rpx; color: #C0C4CC; }
}
</style>
