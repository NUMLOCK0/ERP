<template>
  <view v-if="show" class="kaidan-overlay" @click="close">
    <view class="kaidan-popup" @click.stop>
      <!-- 半透明遮罩 -->
      <view class="kaidan-mask" @click="close"></view>

      <!-- 放射状菜单 -->
      <view class="kaidan-menu">
        <view class="menu-item" @click="goCreate('sale')">
          <view class="menu-icon-wrap sale">
            <image class="menu-icon-img" src="/static/icon/icon-sale.png" mode="aspectFit" />
          </view>
          <text class="menu-label">销售</text>
        </view>
        <view class="menu-item" @click="goCreate('purchase')">
          <view class="menu-icon-wrap purchase">
            <image class="menu-icon-img" src="/static/icon/icon-purchase.png" mode="aspectFit" />
          </view>
          <text class="menu-label">采购</text>
        </view>
        <view class="menu-item" @click="goCreate('inventory')">
          <view class="menu-icon-wrap inventory">
            <image class="menu-icon-img" src="/static/icon/icon-inventory.png" mode="aspectFit" />
          </view>
          <text class="menu-label">库存</text>
        </view>
      </view>

      <!-- 关闭按钮 -->
      <view class="close-btn" @click="close">
        <uni-icons type="closeempty" size="28" color="#FFFFFF"></uni-icons>
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
    sale: '/pages/sale/order-detail',
    purchase: '/pages/purchase/order-detail',
    inventory: '/pages/inventory/check-list'
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
  background: rgba(0, 0, 0, 0.55);
}

.kaidan-menu {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 80rpx;
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
    background: #FFFFFF;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);

    .menu-icon-img {
      width: 56rpx;
      height: 56rpx;
    }

    /* 图标不存在时用纯色圆形+文字占位 */
    &.sale {
      background: #E8F4FD;
      border: 4rpx solid #409EFF;
    }
    &.purchase {
      background: #E8F8F0;
      border: 4rpx solid #67C23A;
    }
    &.inventory {
      background: #F4E8FC;
      border: 4rpx solid #9B59B6;
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
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.close-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10rpx;
  position: relative;
  z-index: 1;
}
</style>
