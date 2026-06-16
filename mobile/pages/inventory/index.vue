<template>
  <view class="inventory-page">
    <!-- 顶部 -->
    <view class="page-header">
      <text class="page-title">库存管理</text>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">79</text>
        <text class="stat-label">有效产品</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">7</text>
        <text class="stat-label">无效产品</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">15</text>
        <text class="stat-label">盘点中</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="section">
      <text class="section-title">库存功能</text>
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
  { label: '库存查询', icon: 'search', bgColor: '#FF9800', url: '/pages/inventory/stock' },
  { label: '盘点单', icon: 'checkbox', bgColor: '#409EFF', url: '/pages/inventory/check-list' },
  { label: '调拨单', icon: 'exchange', bgColor: '#67C23A', url: '/pages/inventory/transfer-list' },
  { label: '库存日志', icon: 'list', bgColor: '#909399', url: '/pages/inventory/log' }
]

const navigateTo = (url) => {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.inventory-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 40rpx;
}

.page-header {
  background: linear-gradient(160deg, #FF9800, #FFB74D);
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
