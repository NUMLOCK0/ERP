<template>
  <view class="inventory-page">
    <view class="page-header">
      <text class="page-title">库存管理</text>
      <text class="page-subtitle">库存查询、单据录入、盘点和日志</text>
    </view>

    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">4</text>
        <text class="stat-label">核心功能</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">1</text>
        <text class="stat-label">查询入口</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">3</text>
        <text class="stat-label">单据入口</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">库存功能</text>
      <view class="menu-list">
        <view v-for="item in menuList" :key="item.label" class="menu-item" @click="navigateTo(item.url)">
          <view class="menu-left">
            <view class="menu-icon" :style="{ backgroundColor: item.bgColor }">
              <u-icon :name="item.icon" size="20" color="#FFFFFF"  />
            </view>
            <view class="menu-meta">
              <text class="menu-label">{{ item.label }}</text>
              <text class="menu-desc">{{ item.desc }}</text>
            </view>
          </view>
          <u-icon name="arrow-right" size="16" color="#C0C4CC"  />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const menuList = [
  { label: '库存查询', desc: '按产品和仓库查看库存', icon: 'search', bgColor: '#409EFF', url: '/pages/inventory/stock' },
  { label: '其他入库', desc: '快速新增其他入库单', icon: 'arrow-down', bgColor: '#67C23A', url: '/pages/inventory/other-in-list' },
  { label: '其他出库', desc: '快速新增其他出库单', icon: 'arrow-up', bgColor: '#F56C6C', url: '/pages/inventory/other-out-list' },
  { label: '库存盘点', desc: '盘点确认与调整库存', icon: 'checkmark-circle', bgColor: '#E6A23C', url: '/pages/inventory/check-list' },
  { label: '库存日志', desc: '查看库存变动记录', icon: 'list', bgColor: '#909399', url: '/pages/inventory/log' },
  { label: '仓库管理', desc: '维护仓库基础资料', icon: 'home', bgColor: '#8E44AD', url: '/pages/inventory/warehouse' }
]

function navigateTo(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped lang="scss">
.inventory-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 40rpx;
}

.page-header {
  background: linear-gradient(160deg, #409EFF, #5CADFF);
  padding: 44rpx 30rpx 30rpx;
}

.page-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.page-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.82);
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
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
}

.section {
  margin: 0 20rpx 20rpx;
}

.section-title {
  display: block;
  padding: 10rpx 10rpx 20rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #303133;
}

.menu-list {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }
}

.menu-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.menu-meta {
  min-width: 0;
}

.menu-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.menu-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #909399;
}
</style>
