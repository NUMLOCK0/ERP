<template>
  <view class="custom-tabbar safe-bottom">
    <view
      class="tabbar-item"
      :class="{ active: current === 'index' }"
      @click="switchTab('index')"
    >
      <u-icon
        :name="current === 'index' ? 'home-fill' : 'home'"
        :size="24"
        :color="current === 'index' ? '#409EFF' : '#999999'"
      ></u-icon>
      <text class="tabbar-text">首页</text>
    </view>

    <!-- 中间 + 号 -->
    <view class="tabbar-center" @click.stop="handleKaiden">
      <view class="center-btn">
        <text class="center-plus">+</text>
      </view>
    </view>

    <view
      class="tabbar-item"
      :class="{ active: current === 'mine' }"
      @click="switchTab('mine')"
    >
      <u-icon
        :name="current === 'mine' ? 'account-fill' : 'account'"
        :size="24"
        :color="current === 'mine' ? '#409EFF' : '#999999'"
      ></u-icon>
      <text class="tabbar-text">我的</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  current: {
    type: String,
    default: 'index'
  }
})

const emit = defineEmits(['open-kaidan'])

const tabMap = {
  index: '/pages/index/index',
  mine: '/pages/mine/index'
}

const switchTab = (tab) => {
  if (tab === props.current) return
  uni.switchTab({ url: tabMap[tab] || tabMap.index })
}

const handleKaiden = () => {
  emit('open-kaidan')
}
</script>

<style lang="scss" scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 130rpx;
  background: #FFFFFF;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.04);
  z-index: 100;
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding-top: 8rpx;
}

.tabbar-text {
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
  font-weight: 400;

  .active & {
    color: #409EFF;
    font-weight: 600;
  }
}

.tabbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;

  .center-btn {
    width: 104rpx;
    height: 104rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #409EFF, #66B1FF);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6rpx 20rpx rgba(64, 158, 255, 0.4);
    position: absolute;
    top: -32rpx;

    &:active {
      transform: scale(0.95);
    }
  }

  .center-plus {
    font-size: 56rpx;
    color: #FFFFFF;
    font-weight: 300;
    line-height: 1;
    margin-top: -4rpx;
  }
}

.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
