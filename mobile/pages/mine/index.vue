<template>
  <view class="mine-page">
    <!-- 顶部信息 -->
    <view class="mine-header">
      <view class="user-avatar">
        <text class="avatar-text">{{ avatarText }}</text>
      </view>
      <text class="user-name">{{ userStore.userName }}</text>
      <text class="user-role">管理员</text>
    </view>

    <!-- 功能列表 -->
    <view class="section">
      <text class="section-title">常用功能</text>
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

    <view class="section">
      <view class="menu-list">
        <view class="menu-item" @click="handleLogout">
          <view class="menu-left">
            <view class="menu-icon" style="background-color: #F56C6C;">
              <uni-icons type="closeempty" size="20" color="#FFFFFF"></uni-icons>
            </view>
            <text class="menu-label">退出登录</text>
          </view>
          <uni-icons type="right" size="16" color="#C0C4CC"></uni-icons>
        </view>
      </view>
    </view>

    <CustomTabbar current="mine" @open-kaidan="showKaidenPopup = true" />

    <KaidenPopup v-model:show="showKaidenPopup" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import CustomTabbar from '@/components/CustomTabbar.vue'
import KaidenPopup from '@/components/KaidenPopup.vue'

const userStore = useUserStore()
const showKaidenPopup = ref(false)

const avatarText = computed(() => {
  const name = userStore.userName
  return name ? name.charAt(0).toUpperCase() : '管'
})

const menuList = [
  { label: '产品管理', icon: 'gift', bgColor: '#F0AD4E', url: '/pages/product/list' },
  { label: '库存查询', icon: 'box', bgColor: '#5BC0DE', url: '/pages/inventory/stock' },
  { label: '采购订单', icon: 'cart', bgColor: '#409EFF', url: '/pages/purchase/order-list' },
  { label: '销售订单', icon: 'wallet', bgColor: '#67C23A', url: '/pages/sale/order-list' },
  { label: '财务报表', icon: 'paperclip', bgColor: '#8E44AD', url: '/pages/finance/payment-list' },
  { label: '数据报表', icon: 'bars', bgColor: '#17A2B8', url: '/pages/report/product-stock' }
]

const navigateTo = (url) => {
  uni.navigateTo({ url })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 120rpx;
}

.mine-header {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  padding: 60rpx 40rpx 50rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  .user-avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20rpx;

    .avatar-text {
      font-size: 48rpx;
      font-weight: 700;
      color: #FFFFFF;
    }
  }

  .user-name {
    font-size: 36rpx;
    font-weight: 600;
    color: #FFFFFF;
  }

  .user-role {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 8rpx;
  }
}

.section {
  margin: 20rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #303133;
    padding: 10rpx 10rpx 20rpx;
    display: block;
  }
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
