<template>
  <view class="detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <view class="scroll-inner" v-if="detail.id">
        <!-- ===== 头部概要 ===== -->
        <view class="summary-section">
          <view class="summary-header">
            <text class="outbound-no font-bold">{{ detail.outbound_no }}</text>
            <view class="status-tag" :class="getStatusClass(detail.status)">
              {{ statusMap[detail.status] || '未知' }}
            </view>
          </view>
          
          <view class="summary-grid">
            <view class="grid-item">
              <text class="grid-label">出库仓库</text>
              <text class="grid-value font-bold">{{ detail.warehouse_name || '-' }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">出库总金额</text>
              <text class="grid-value font-bold text-red">￥{{ formatPrice(detail.total_amount) }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">产品总数量</text>
              <text class="grid-value font-bold">{{ formatQuantity(totalQty) }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">创建时间</text>
              <text class="grid-value">{{ formatTime(detail.created_at) }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">完成时间</text>
              <text class="grid-value">{{ formatTime(detail.completed_time) }}</text>
            </view>
            <view class="grid-item wide" v-if="detail.admin_remark">
              <text class="grid-label">管理员备注</text>
              <text class="grid-value">{{ detail.admin_remark }}</text>
            </view>
            <view class="grid-item wide" v-if="detail.outbound_remark || detail.remark">
              <text class="grid-label">出库备注</text>
              <text class="grid-value">{{ detail.outbound_remark || detail.remark }}</text>
            </view>
          </view>
        </view>

        <!-- ===== 出库明细 ===== -->
        <view class="section-title-row">
          <text class="section-title">出库明细 ({{ detail.items?.length || 0 }} 笔)</text>
        </view>

        <view class="items-list">
          <view class="item-card" v-for="(item, idx) in detail.items" :key="idx">
            <view class="item-title-row">
              <text class="item-name font-bold">#{{ idx + 1 }} {{ item.product_name || '-' }}</text>
              <text class="item-spec" v-if="item.spec">{{ item.spec }}</text>
            </view>
            
            <view class="divider"></view>
            
            <view class="item-details">
              <view class="detail-row">
                <text class="row-label">产品编码：</text>
                <text class="row-value">{{ item.code || '-' }}</text>
              </view>
              <view class="detail-row">
                <text class="row-label">计量单位：</text>
                <text class="row-value">{{ item.unit_name || '-' }}</text>
              </view>
              <view class="detail-row">
                <text class="row-label">单位基准数：</text>
                <text class="row-value">{{ formatQuantity(item.base_quantity) }}</text>
              </view>
              <view class="detail-row">
                <text class="row-label">出库数量：</text>
                <text class="row-value font-bold">{{ formatQuantity(item.quantity) }}</text>
              </view>
              <view class="detail-row">
                <text class="row-label">出库单价：</text>
                <text class="row-value">￥{{ formatPrice(item.price) }}</text>
              </view>
              <view class="detail-row">
                <text class="row-label">出库总价：</text>
                <text class="row-value text-red font-bold">￥{{ formatPrice(item.amount) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ===== 底部操作 ===== -->
    <view class="bottom-bar">
      <view class="action-btn outline-primary" @click="goBack">返回列表</view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { inventoryApi } from '@/api/inventory'

const detailId = ref(null)
const detail = ref({})

const statusMap = {
  0: '待出库',
  1: '已完成',
  2: '已取消',
  3: '已关闭',
  4: '审核中'
}

const getStatusClass = (status) => {
  const map = {
    0: 'warning',
    1: 'success',
    2: 'danger',
    3: 'info',
    4: 'primary'
  }
  return map[status] || 'info'
}

const totalQty = computed(() => {
  return (detail.value.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
})

onLoad((options) => {
  detailId.value = Number(options.id)
})

onMounted(async () => {
  if (detailId.value) {
    try {
      const res = await inventoryApi.getOtherOutDetail(detailId.value)
      if (res.code === 0) {
        detail.value = res.data || {}
      }
    } catch (e) {
      console.error(e)
    }
  }
})

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '0.00'
  return Number(val).toFixed(2)
}

const formatQuantity = (val) => {
  const quantity = Number(val || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}

const formatTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 19)
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.detail-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.detail-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 24rpx 20rpx 140rpx;
}

.summary-section {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #F2F6FC;
  padding-bottom: 20rpx;
  margin-bottom: 20rpx;
}

.outbound-no {
  font-size: 32rpx;
  color: #303133;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 600;
  
  &.info { background: #F4F4F5; color: #909399; }
  &.warning { background: #FDF6EC; color: #E6A23C; }
  &.success { background: #F0F9EB; color: #67C23A; }
  &.danger { background: #FEF0F0; color: #F56C6C; }
  &.primary { background: #ECF5FF; color: #409EFF; }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx 24rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  
  &.wide {
    grid-column: span 2;
  }
}

.grid-label {
  font-size: 24rpx;
  color: #909399;
}

.grid-value {
  font-size: 26rpx;
  color: #303133;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #303133;
  border-left: 6rpx solid #1890ff;
  padding-left: 14rpx;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.item-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid #EBEEF5;
}

.item-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}

.item-name {
  font-size: 28rpx;
  color: #303133;
}

.item-spec {
  font-size: 22rpx;
  color: #909399;
  background: #F4F4F5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.divider {
  height: 1rpx;
  background: #EBEEF5;
  margin: 14rpx 0;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
}

.row-label {
  color: #909399;
}

.row-value {
  color: #303133;
}

.bottom-bar {
  flex-shrink: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 16rpx;
  z-index: 99;
}

.action-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;

  &.outline-primary {
    background: #E8F4FF;
    color: #1890FF;
    border: 1rpx solid #B3D8FF;
  }
}
</style>
