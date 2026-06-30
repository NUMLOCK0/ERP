<template>
  <view v-if="show" class="kaidan-overlay" @click="close">
    <view class="kaidan-popup" @click.stop>
      <!-- 半透明遮罩 -->
      <view class="kaidan-mask" @click="close"></view>

      <!-- 放射状菜单 -->
      <view class="kaidan-menu">
        <view class="menu-item" @click="goCreate('purchase')">
          <view class="menu-icon-wrap purchase">
            <u-icon name="shopping-cart" size="30" color="#67C23A"></u-icon>
          </view>
          <text class="menu-label">采购</text>
        </view>
        <view class="menu-item" @click="goCreate('sale')">
          <view class="menu-icon-wrap sale">
            <u-icon name="bag" size="30" color="#409EFF"></u-icon>
          </view>
          <text class="menu-label">销售</text>
        </view>
        <view class="menu-item" @click="goCreate('processing')">
          <view class="menu-icon-wrap processing">
            <u-icon name="setting" size="30" color="#E6A23C"></u-icon>
          </view>
          <text class="menu-label">加工</text>
        </view>
      </view>

      <!-- 关闭按钮 -->
      <view class="close-btn" @click="close">
        <u-icon name="close" size="28" color="#FFFFFF"></u-icon>
      </view>
      <text class="close-label">关闭</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show'])

const close = () => {
  emit('update:show', false)
}

const goCreate = (type) => {
  close()
  const urlMap = {
    sale: '/pages/sale/order-edit',
    purchase: '/pages/purchase/order-edit',
    processing: '/pages/processing/batch-edit'
  }
  uni.navigateTo({ url: urlMap[type] })
}
</script>

<style lang="scss" scoped>
.kaidan-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.kaidan-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.kaidan-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8rpx);
}

.kaidan-menu {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60rpx;
  z-index: 1;
  margin-bottom: 60rpx;
  padding: 40rpx;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;

  .menu-icon-wrap {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease;

    &:active {
      transform: scale(0.9);
    }

    &.sale {
      background: #E8F4FD;
      border: 4rpx solid #409EFF;
    }
    &.purchase {
      background: #E8F8F0;
      border: 4rpx solid #67C23A;
    }
    &.processing {
      background: #FDF6EC;
      border: 4rpx solid #E6A23C;
    }
  }

  .menu-label {
    font-size: 26rpx;
    color: #FFFFFF;
    font-weight: 500;
  }
}

.close-btn {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: transform 0.2s ease;

  &:active {
    transform: rotate(90deg) scale(0.9);
  }
}

.close-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10rpx;
  position: relative;
  z-index: 1;
}
</style>
