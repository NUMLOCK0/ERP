<template>
  <view class="return-detail">
    <view v-if="ret.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">退货单信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">退货单号</text>
            <text class="info-value">{{ ret.return_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">状态</text>
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
            <text class="info-label">退货总金额</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(ret.total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(ret.created_at || ret.createdAt) }}</text>
          </view>
          <view class="info-item" v-if="ret.completed_time">
            <text class="info-label">退货完成时间</text>
            <text class="info-value date-text">{{ formatDate(ret.completed_time || ret.completedTime) }}</text>
          </view>
        </view>
      </view>

      <!-- 物流信息 -->
      <view class="card" v-if="Number(ret.status) === 1">
        <view class="card-title">物流信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">物流公司</text>
            <text class="info-value">{{ ret.express_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">快递单号</text>
            <text class="info-value">{{ ret.express_no || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="ret.reason">
            <text class="info-label">备注说明</text>
            <text class="info-value">{{ ret.reason }}</text>
          </view>
        </view>
      </view>

      <!-- 退货原因 (待退货状态显示) -->
      <view class="card" v-if="Number(ret.status) === 0 && ret.reason">
        <view class="card-title">退货原因</view>
        <view class="reason-content">
          <text>{{ ret.reason }}</text>
        </view>
      </view>

      <!-- 退货明细 -->
      <view class="card">
        <view class="card-title">退货明细</view>
        <view class="item-list">
          <view class="item-header">
            <text class="col-name">商品</text>
            <text class="col-qty">退货量</text>
            <text class="col-price">退货价</text>
            <text class="col-amount">金额</text>
          </view>
          <view class="item-row" v-for="(item, index) in ret.items" :key="index">
            <view class="col-name">
              <text class="p-name">{{ item.product_name || '-' }}</text>
              <text class="p-spec" v-if="item.spec || item.unit_name">规格: {{ item.spec || '-' }} ({{ item.unit_name || '-' }})</text>
            </view>
            <text class="col-qty">{{ item.quantity }}</text>
            <text class="col-price">¥{{ formatPrice(item.price) }}</text>
            <text class="col-amount">¥{{ formatPrice(item.amount) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">退货单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="ret.id" class="bottom-bar safe-bottom">
      <button v-if="Number(ret.status) === 0" class="btn-primary" @click="openConfirmPopup">确认退货</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>

    <!-- 确认退货弹窗 -->
    <view v-if="showConfirmPopup" class="popup-overlay" @click="closePopup">
      <view class="popup-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">确认退货并填写物流</text>
          <view class="close-btn" @click="closePopup">
            <uni-icons type="closeempty" size="20" color="#999"></uni-icons>
          </view>
        </view>

        <view class="sheet-body">
          <view class="form-item">
            <text class="form-label">物流公司</text>
            <input class="form-input" v-model="form.express_name" placeholder="请输入物流公司名称" placeholder-style="color: #909399" />
          </view>
          <view class="form-item">
            <text class="form-label">快递单号</text>
            <input class="form-input" v-model="form.express_no" placeholder="请输入快递单号" placeholder-style="color: #909399" />
          </view>
          <view class="form-item">
            <text class="form-label">备注说明</text>
            <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注说明（最多200字）" placeholder-style="color: #909399" :maxlength="200" />
          </view>
        </view>

        <view class="sheet-footer">
          <button class="btn-cancel" @click="closePopup">取消</button>
          <button class="btn-confirm" @click="submitConfirm">确认退货</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'

const ret = ref({})
const loading = ref(true)
const showConfirmPopup = ref(false)

const form = ref({
  express_name: '',
  express_no: '',
  remark: ''
})

const statusMap = {
  0: '待退货',
  1: '已退货'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'success'
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
    const res = await purchaseApi.getReturnDetail(id)
    if (res.code === 0) {
      ret.value = res.data || {}
    }
  } catch (e) {
    // Interceptor auto toasts
  } finally {
    loading.value = false
  }
}

const openConfirmPopup = () => {
  form.value = {
    express_name: '',
    express_no: '',
    remark: ''
  }
  showConfirmPopup.value = true
}

const closePopup = () => {
  showConfirmPopup.value = false
}

const submitConfirm = async () => {
  if (!form.value.express_name.trim()) {
    uni.showToast({ title: '请输入物流公司', icon: 'none' })
    return
  }
  if (!form.value.express_no.trim()) {
    uni.showToast({ title: '请输入快递单号', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const res = await purchaseApi.completeReturn(ret.value.id, {
      express_name: form.value.express_name.trim(),
      express_no: form.value.express_no.trim(),
      remark: form.value.remark.trim()
    })
    if (res.code === 0) {
      uni.showToast({ title: '退货成功', icon: 'success' })
      closePopup()
      loadDetail()
    }
  } catch (e) {
    // Handled
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
.return-detail {
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
  }
}

.reason-content {
  background: #F8FAFC;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
}

.item-list {
  .item-header {
    display: flex;
    background: #F8FAFC;
    border-radius: 8rpx;
    padding: 16rpx 12rpx;
    margin-bottom: 8rpx;
  }
  .item-row {
    display: flex;
    align-items: center;
    padding: 18rpx 12rpx;
    border-bottom: 1rpx solid #F2F6FC;
    &:last-child { border-bottom: none; }
  }
  .col-name {
    flex: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-right: 10rpx;
    .p-name { font-size: 24rpx; color: #303133; font-weight: 600; }
    .p-spec { font-size: 20rpx; color: #909399; margin-top: 4rpx; }
  }
  .col-qty { flex: 0.8; text-align: center; font-size: 24rpx; color: #606266; font-weight: 600; }
  .col-price { flex: 1.2; text-align: right; font-size: 24rpx; color: #606266; }
  .col-amount { flex: 1.5; text-align: right; font-size: 24rpx; color: #F56C6C; font-weight: 600; }
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
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
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
    margin-bottom: 24rpx;
    
    .form-label {
      font-size: 26rpx;
      color: #606266;
      font-weight: 500;
      margin-bottom: 12rpx;
      display: block;
    }
    
    .form-input {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 80rpx;
      padding: 0 24rpx;
      font-size: 28rpx;
      color: #303133;
    }
    
    .form-textarea {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 160rpx;
      padding: 20rpx 24rpx;
      font-size: 28rpx;
      color: #303133;
      width: 100%;
      box-sizing: border-box;
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
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
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
