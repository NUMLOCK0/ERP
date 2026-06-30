<template>
  <view class="purchase-page">
    <!-- 顶部 -->
    <view class="page-header">
      <text class="page-title">采购管理</text>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">20</text>
        <text class="stat-label">待入库</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">8</text>
        <text class="stat-label">采购订单</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">3</text>
        <text class="stat-label">退货单</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="section">
      <text class="section-title">采购功能</text>
      <view class="menu-list">
        <view class="menu-item" v-for="item in menuList" :key="item.label" @click="navigateTo(item.url)">
          <view class="menu-left">
            <view class="menu-icon" :style="{ backgroundColor: item.bgColor }">
              <u-icon :name="item.icon" size="20" color="#FFFFFF"></u-icon>
            </view>
            <text class="menu-label">{{ item.label }}</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#C0C4CC"></u-icon>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>

const menuList = [
  { label: '采购订单', icon: 'shopping-cart', bgColor: '#409EFF', url: '/pages/purchase/order-list' },
  { label: '采购入库单', icon: 'arrow-down', bgColor: '#67C23A', url: '/pages/purchase/inbound-list' },
  { label: '采购退货单', icon: 'rewind-left', bgColor: '#F56C6C', url: '/pages/purchase/return-list' },
  { label: '采购付款单', icon: 'rmb-circle', bgColor: '#8E44AD', url: '/pages/finance/payment-list' },
  { label: '采购发票登记', icon: 'edit-pen', bgColor: '#909399', url: '/pages/purchase/invoice-list' }
]

const navigateTo = (url) => {
  if (!url || url === 'todo') {
    uni.showToast({
      title: '该功能暂未开放',
      icon: 'none'
    })
    return
  }
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.purchase-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 40rpx;
}

.page-header {
  background: linear-gradient(160deg, #409EFF, #5CADFF);
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
