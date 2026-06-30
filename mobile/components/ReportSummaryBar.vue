<template>
  <view v-if="items.length" class="summary-bar">
    <view class="summary-head">
      <text class="summary-title">{{ title }}</text>
      <view class="summary-more" @click="openPopup">查看全部</view>
    </view>

    <view class="summary-card">
      <view class="summary-card-top">
        <text class="summary-card-title">{{ currentItem.title }}</text>
        <text class="summary-card-index">{{ currentIndex + 1 }}/{{ items.length }}</text>
      </view>
      <view class="summary-grid">
        <view
          v-for="(stat, index) in currentItem.stats"
          :key="`${currentItem.key || currentItem.title}-${index}`"
          class="summary-grid-item"
        >
          <text class="summary-label">{{ stat.label }}</text>
          <text class="summary-value">{{ stat.value }}</text>
        </view>
      </view>
    </view>

    <view v-if="popupVisible" class="popup-mask" @click="closePopup">
      <view class="popup-panel" @click.stop>
        <view class="popup-head">
          <text class="popup-title">{{ title }}</text>
          <view class="popup-close" @click="closePopup">
            <u-icon name="close" size="18" color="#909399"  />
          </view>
        </view>

        <scroll-view class="popup-scroll" scroll-y>
          <view
            v-for="item in items"
            :key="item.key || item.title"
            class="popup-card"
          >
            <text class="popup-card-title">{{ item.title }}</text>
            <view class="popup-grid">
              <view
                v-for="(stat, index) in item.stats"
                :key="`${item.key || item.title}-${index}`"
                class="popup-grid-item"
              >
                <text class="popup-label">{{ stat.label }}</text>
                <text class="popup-value">{{ stat.value }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '汇总'
  },
  items: {
    type: Array,
    default: () => []
  },
  interval: {
    type: Number,
    default: 2000
  }
})

const popupVisible = ref(false)
const currentIndex = ref(0)
let timer = null

const currentItem = computed(() => props.items[currentIndex.value] || { title: '', stats: [] })

const stopRotate = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const startRotate = () => {
  stopRotate()
  if (props.items.length <= 1) return
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % props.items.length
  }, props.interval)
}

const openPopup = () => {
  popupVisible.value = true
  stopRotate()
}

const closePopup = () => {
  popupVisible.value = false
  startRotate()
}

watch(
  () => props.items,
  (items) => {
    if (currentIndex.value >= items.length) currentIndex.value = 0
    startRotate()
  },
  { deep: true }
)

onMounted(() => {
  startRotate()
})

onBeforeUnmount(() => {
  stopRotate()
})
</script>

<style scoped lang="scss">
.summary-bar {
  position: fixed;
  left: 16rpx;
  right: 16rpx;
  bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 60;
  padding: 14rpx 16rpx 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.summary-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #303133;
}

.summary-more {
  font-size: 22rpx;
  color: #1890ff;
  font-weight: 600;
}

.summary-card,
.popup-card {
  background: #f8fafc;
  border: 1rpx solid #edf2f7;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
}

.summary-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.summary-card-title,
.popup-card-title {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #303133;
}

.summary-card-index {
  font-size: 20rpx;
  color: #909399;
}

.summary-grid,
.popup-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
}

.summary-grid-item,
.popup-grid-item {
  min-width: 0;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: #ffffff;
}

.summary-label,
.popup-label {
  display: block;
  font-size: 20rpx;
  color: #909399;
  line-height: 1.3;
}

.summary-value,
.popup-value {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.35;
  word-break: break-all;
}

.popup-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.36);
}

.popup-panel {
  width: 100%;
  max-height: 70vh;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  overflow: hidden;
}

.popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 24rpx 16rpx;
  border-bottom: 1rpx solid #f2f6fc;
}

.popup-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.popup-close {
  width: 52rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-scroll {
  max-height: calc(70vh - 90rpx);
  padding: 18rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.popup-card + .popup-card {
  margin-top: 14rpx;
}
</style>
