<template>
  <view class="inbound-detail">
    <view v-if="inbound.id" class="detail-content">
      <!-- 入库基本信息 -->
      <view class="card">
        <view class="card-title">入库单信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">入库单号</text>
            <text class="info-value">{{ inbound.inbound_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[inbound.status] || '未知'" size="small" :type="getStatusType(inbound.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">关联采购单</text>
            <text class="info-value">{{ inbound.order_no || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ inbound.supplier_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">入库仓库</text>
            <text class="info-value">{{ inbound.warehouse_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">总金额</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(inbound.total_amount) }}</text>
          </view>
          <view class="info-item" v-if="inbound.creator_name">
            <text class="info-label">创建人</text>
            <text class="info-value">{{ inbound.creator_name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(inbound.created_at || inbound.createdAt) }}</text>
          </view>
          <view class="info-item" v-if="inbound.completed_time">
            <text class="info-label">入库完成时间</text>
            <text class="info-value date-text">{{ formatDate(inbound.completed_time || inbound.completedTime) }}</text>
          </view>
          <view class="info-item" v-if="inbound.remark" style="width: 100%;">
            <text class="info-label">备注说明</text>
            <text class="info-value">{{ inbound.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 入库明细 -->
      <view class="card">
        <view class="card-title">入库明细</view>
        <view class="item-list">
          <view class="item-header">
            <text class="col-name">商品</text>
            <text class="col-qty">入库量</text>
            <text class="col-price">入库价</text>
            <text class="col-amount">金额</text>
          </view>
          <view class="item-row" v-for="(item, index) in inbound.items" :key="index">
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
      <text class="empty-text">入库单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="inbound.id" class="bottom-bar safe-bottom">
      <button v-if="Number(inbound.status) === 0" class="btn-primary" @click="handleConfirmInbound">确认入库</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'

const inbound = ref({})
const loading = ref(true)

const statusMap = {
  0: '待入库',
  1: '已入库'
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
    const res = await purchaseApi.getInboundDetail(id)
    if (res.code === 0) {
      inbound.value = res.data || {}
    }
  } catch (e) {
    // Interceptor auto toasts
  } finally {
    loading.value = false
  }
}

const handleConfirmInbound = () => {
  uni.showModal({
    title: '确认入库',
    content: '点击确认后，系统将自动增加对应仓库中的商品库存，且此入库单将不可修改。确定要确认入库吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在入库...' })
        try {
          const confirmRes = await purchaseApi.confirmInbound(inbound.value.id)
          if (confirmRes.code === 0) {
            uni.showToast({ title: '入库成功', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
        finally {
          uni.hideLoading()
        }
      }
    }
  })
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
.inbound-detail {
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
