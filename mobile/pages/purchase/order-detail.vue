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
              <uni-tag :text="statusMap[order.status] || order.status" size="small" :type="getStatusType(order.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ order.supplier_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">仓库</text>
            <text class="info-value">{{ order.warehouse_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">总金额</text>
            <text class="info-value text-danger">¥{{ formatPrice(order.total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ order.created_at || order.createdAt }}</text>
          </view>
          <view class="info-item" v-if="order.audit_time">
            <text class="info-label">审核时间</text>
            <text class="info-value">{{ order.audit_time || order.auditTime }}</text>
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
            <text class="col-name">{{ item.product_name || item.productName || '-' }}</text>
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
      <button v-if="order.status === 'draft'" class="btn-submit" @click="handleSubmit">提 审</button>
      <button v-if="order.status === 'submitted'" class="btn-primary" @click="handleAudit(1)">审核通过</button>
      <button v-if="order.status === 'submitted'" class="btn-danger" @click="handleAudit(0)">审核拒绝</button>
      <button v-if="order.status === 'draft'" class="btn-cancel" @click="handleCancel">取消订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { purchaseApi } from '@/api/purchase'

const order = ref({})
const loading = ref(true)

const statusMap = { draft: '草稿', submitted: '待审核', approved: '已审核', completed: '已完成', cancelled: '已取消' }

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const getStatusType = (status) => {
  const map = { draft: 'info', submitted: 'warning', approved: 'success', completed: '', cancelled: 'error' }
  return map[status] || 'info'
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) { loading.value = false; return }

  try {
    const res = await purchaseApi.getOrderDetail(id)
    if (res.code === 0) {
      order.value = res.data || {}
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
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
          await purchaseApi.submitOrder(order.value.id)
          uni.showToast({ title: '提审成功', icon: 'success' })
          loadDetail()
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
          await purchaseApi.auditOrder(order.value.id, { approved })
          uni.showToast({ title: approved ? '审核通过' : '已拒绝', icon: 'success' })
          loadDetail()
        } catch (e) { /* handled */ }
      }
    }
  })
}

const handleCancel = () => {
  uni.showModal({
    title: '确认取消',
    content: '确定取消此订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await purchaseApi.deleteOrder(order.value.id)
          uni.showToast({ title: '已取消', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch (e) { /* handled */ }
      }
    }
  })
}

onMounted(() => loadDetail())
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: #F5F7FA;
}

.detail-content {
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

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
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 4rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; }
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
    padding: 14rpx 12rpx;
    border-bottom: 1rpx solid #F2F6FC;
    &:last-child { border-bottom: none; }
  }
  .col-name { flex: 2; font-size: 24rpx; color: #303133; }
  .col-qty { flex: 1; text-align: center; font-size: 24rpx; color: #606266; }
  .col-price { flex: 1.5; text-align: right; font-size: 24rpx; color: #606266; }
  .col-amount { flex: 1.5; text-align: right; font-size: 24rpx; color: #F56C6C; font-weight: 500; }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 16rpx 24rpx;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);

  button {
    height: 72rpx;
    padding: 0 32rpx;
    font-size: 26rpx;
    border-radius: 36rpx;
    line-height: 72rpx;
    &::after { border: none; }
  }

  .btn-submit { background: #409EFF; color: #FFFFFF; }
  .btn-primary { background: #67C23A; color: #FFFFFF; }
  .btn-danger { background: #F56C6C; color: #FFFFFF; }
  .btn-cancel { background: #f0f0f0; color: #606266; }
}

.empty-state, .loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
  .empty-text { font-size: 28rpx; color: #C0C4CC; }
}
</style>
