<template>
  <view class="custom-tabbar safe-bottom">
    <view
      class="tabbar-item"
      :class="{ active: current === 'index' }"
      @click="switchTab('index')"
    >
      <view class="tabbar-icon-wrap">
        <image
          v-if="current === 'index'"
          class="tabbar-icon"
          src="/static/tabbar/home-active.png"
          mode="aspectFit"
        />
        <image
          v-else
          class="tabbar-icon"
          src="/static/tabbar/home.png"
          mode="aspectFit"
        />
      </view>
      <text class="tabbar-text" :class="{ active: current === 'index' }">首页</text>
    </view>

    <!-- 中间开单按钮 -->
    <view class="tabbar-center" @click="handleKaiden">
      <view class="center-btn">
        <text class="center-plus">+</text>
      </view>
      <text class="tabbar-text center-text">开单</text>
    </view>

    <view
      class="tabbar-item"
      :class="{ active: current === 'mine' }"
      @click="switchTab('mine')"
    >
      <view class="tabbar-icon-wrap">
        <image
          v-if="current === 'mine'"
          class="tabbar-icon"
          src="/static/tabbar/mine-active.png"
          mode="aspectFit"
        />
        <image
          v-else
          class="tabbar-icon"
          src="/static/tabbar/mine.png"
          mode="aspectFit"
        />
      </view>
      <text class="tabbar-text" :class="{ active: current === 'mine' }">我的</text>
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

const switchTab = (tab) => {
  if (tab === props.current) return
  const url = tab === 'index' ? '/pages/index/index' : '/pages/mine/index'
  uni.switchTab({ url })
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
  height: 120rpx;
  background: #FFFFFF;
  box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
  padding-bottom: 10rpx;
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  padding-top: 8rpx;
}

.tabbar-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rpx;

  .tabbar-icon {
    width: 44rpx;
    height: 44rpx;
  }
}

.tabbar-text {
  font-size: 20rpx;
  color: #999999;

  &.active {
    color: #409EFF;
  }
}

.tabbar-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;

  .center-btn {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #409EFF, #66B1FF);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rpx;
    box-shadow: 0 4rpx 16rpx rgba(64, 158, 255, 0.4);
    position: absolute;
    top: -30rpx;
  }

  .center-plus {
    font-size: 56rpx;
    color: #FFFFFF;
    font-weight: 300;
    line-height: 1;
    margin-top: -4rpx;
  }
}

.center-text {
  margin-top: 40rpx;
}

.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
