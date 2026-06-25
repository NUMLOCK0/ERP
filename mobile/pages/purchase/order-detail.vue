<template>
  <view class="order-detail">
    <view v-if="order.id" class="detail-content">
      <!-- 订单基本信息 -->
      <view class="card">
        <view class="card-title">订单信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">订单号</text>
            <text class="info-value">{{ order.order_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[order.status] || '未知'" size="small" :type="getStatusType(order.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ order.supplier_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">收货仓库</text>
            <text class="info-value">{{ order.warehouse_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">付款方式</text>
            <text class="info-value">{{ order.payment_method || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">总金额</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(order.total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(order.created_at || order.createdAt) }}</text>
          </view>
          <view class="info-item" v-if="order.audit_time">
            <text class="info-label">审核时间</text>
            <text class="info-value date-text">{{ formatDate(order.audit_time || order.auditTime) }}</text>
          </view>
          <view class="info-item" v-if="order.admin_remark" style="width: 100%;">
            <text class="info-label">管理备注</text>
            <text class="info-value">{{ order.admin_remark }}</text>
          </view>
          <view class="info-item" v-if="order.purchase_remark" style="width: 100%;">
            <text class="info-label">采购备注</text>
            <text class="info-value">{{ order.purchase_remark }}</text>
          </view>
        </view>
      </view>

      <!-- 商品明细 -->
      <view class="card">
        <view class="card-title">商品明细</view>
        <view class="item-list">
          <view class="item-header">
            <text class="col-name">商品</text>
            <text class="col-qty">数量</text>
            <text class="col-price">单价</text>
            <text class="col-amount">金额</text>
          </view>
          <view class="item-row" v-for="(item, index) in order.items" :key="index">
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
      <text class="empty-text">订单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="order.id" class="bottom-bar safe-bottom">
      <button v-if="Number(order.status) === 0" class="btn-cancel outline" @click="handleCancel">取消订单</button>
      <button v-if="Number(order.status) === 0" class="btn-edit warning" @click="goEdit">编 辑</button>
      <button v-if="Number(order.status) === 0" class="btn-submit primary" @click="handleSubmit">提 审</button>
      
      <button v-if="Number(order.status) === 2" class="btn-danger" @click="handleAudit(0)">审核拒绝</button>
      <button v-if="Number(order.status) === 2" class="btn-primary" @click="handleAudit(1)">审核通过</button>
      
      <button class="btn-back" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'

const order = ref({})
const loading = ref(true)

const statusMap = {
  0: '草稿',
  1: '采购中',
  2: '待审核',
  3: '已取消',
  4: '已关闭',
  5: '已审核',
  6: '已采购',
  7: '入库中',
  8: '已完成',
  9: '已拒绝'
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'primary',
    2: 'warning',
    3: 'error',
    4: 'info',
    5: 'success',
    6: 'primary',
    7: 'warning',
    8: 'success',
    9: 'error'
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
    const res = await purchaseApi.getOrderDetail(id)
    if (res.code === 0) {
      order.value = res.data || {}
    }
  } catch (e) {
    // Interceptor auto toasts
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  uni.showModal({
    title: '确认提审',
    content: '提交后将不可修改，确定提交审核吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const submitRes = await purchaseApi.submitOrder(order.value.id)
          if (submitRes.code === 0) {
            uni.showToast({ title: '提审成功', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const handleAudit = async (approved) => {
  const title = approved ? '确认审核通过' : '确认拒绝'
  uni.showModal({
    title,
    content: approved ? '审核通过后将生成采购入库单。' : '确定拒绝此订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const auditRes = await purchaseApi.auditOrder(order.value.id, { approved })
          if (auditRes.code === 0) {
            uni.showToast({ title: approved ? '审核通过' : '已拒绝', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const handleCancel = () => {
  uni.showModal({
    title: '确认取消',
    content: '确定取消并删除此采购订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await purchaseApi.deleteOrder(order.value.id)
          if (deleteRes.code === 0) {
            uni.showToast({ title: '已取消删除', icon: 'success' })
            setTimeout(() => uni.navigateBack(), 500)
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/purchase/order-edit?id=${order.value.id}` })
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
.order-detail {
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
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 500; }
    .date-text { color: #909399; font-size: 24rpx; }
  }
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
    
    &.outline {
      background: #FFFFFF;
      color: #909399;
      border: 1rpx solid #DCDFE6;
    }
    
    &.warning {
      background: #FF9800;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.2);
    }

    &.primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &.btn-primary {
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
    }
    
    &.btn-danger {
      background: #F56C6C;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(245, 108, 108, 0.2);
    }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
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
