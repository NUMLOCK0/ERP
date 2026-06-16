<template>
  <view class="sale-page">
    <!-- 顶部 -->
    <view class="page-header">
      <text class="page-title">销售管理</text>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">43</text>
        <text class="stat-label">待出库</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">12</text>
        <text class="stat-label">销售订单</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">5</text>
        <text class="stat-label">退货单</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="section">
      <text class="section-title">销售功能</text>
      <view class="menu-list">
        <view class="menu-item" v-for="item in menuList" :key="item.label" @click="navigateTo(item.url)">
          <view class="menu-left">
            <view class="menu-icon" :style="{ backgroundColor: item.bgColor }">
              <uni-icons :type="item.icon" size="20" color="#FFFFFF"></uni-icons>
            </view>
            <text class="menu-label">{{ item.label }}</text>
          </view>
          <uni-icons type="right" size="16" color="#C0C4CC"></uni-icons>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>

const menuList = [
  { label: '销售订单', icon: 'wallet', bgColor: '#67C23A', url: '/pages/sale/order-list' },
  { label: '销售发货', icon: 'paperplane', bgColor: '#409EFF', url: '/pages/sale/delivery-list' },
  { label: '销售退货', icon: 'undo', bgColor: '#F56C6C', url: '/pages/sale/return-list' },
  { label: '销售收款', icon: 'wallet', bgColor: '#8E44AD', url: '/pages/finance/receipt-list' }
]

const navigateTo = (url) => {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.sale-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 40rpx;
}

.page-header {
  background: linear-gradient(160deg, #67C23A, #85CE61);
  padding: 44rpx 30rpx 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.stats-row {
  display: flex;
  gap: 16rpx;
  margin: 20rpx;
  margin-top: -20rpx;
}

.stat-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #303133;
  display: block;
  line-height: 1.2;
}

.stat-label {
  font-size: 22rpx;
  color: #909399;
  margin-top: 6rpx;
  display: block;
}

.section {
  margin: 0 20rpx 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #303133;
  padding: 10rpx 10rpx 20rpx;
  display: block;
}

.menu-list {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }

  .menu-left {
    display: flex;
    align-items: center;

    .menu-icon {
      width: 64rpx;
      height: 64rpx;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;
    }

    .menu-label {
      font-size: 28rpx;
      color: #303133;
    }
  }
}
</style>
