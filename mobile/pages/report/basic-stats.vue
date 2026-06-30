<template>
  <view class="basic-stats-page">
    <!-- 顶部时间范围选择栏 -->
    <view class="top-bar">
      <text class="top-title">基础统计</text>
      <view class="dropdown-btn" @click="showDatePopup = !showDatePopup">
        <text class="dropdown-text">{{ dateRangeLabel }}</text>
        <u-icon :name="showDatePopup ? 'arrow-up' : 'arrow-down'" size="12" color="#606266"></u-icon>
      </view>
    </view>

    <!-- 统计卡片 两列 -->
    <view class="cards-grid">
      <view class="stat-card" v-for="card in statCards" :key="card.title">
        <text class="card-title">{{ card.title }}</text>
        <text class="card-value">{{ card.total }}</text>
        <view class="card-extra-row">
          <text class="extra-item">
            <text class="extra-label">今日</text>
            <text class="extra-value" :class="{ green: card.today > 0 }">{{ card.today > 0 ? '+' + card.today : card.today }}</text>
          </text>
          <text class="extra-item">
            <text class="extra-label">昨日</text>
            <text class="extra-value">{{ card.yesterday }}</text>
          </text>
        </view>
      </view>
    </view>

    <!-- 时间范围弹窗 -->
    <DateRangePopup v-model:show="showDatePopup" @query="onDateQuery" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import DateRangePopup from '@/components/DateRangePopup.vue'

const showDatePopup = ref(false)
const dateRangeLabel = ref('近30天')

const statCards = [
  { title: '产品总量', total: 86, today: 2, yesterday: 0 },
  { title: '客商总量', total: 35, today: 1, yesterday: 0 },
  { title: '采购订单', total: 8, today: 1, yesterday: 2 },
  { title: '采购入库', total: 5, today: 0, yesterday: 1 },
  { title: '采购退货', total: 3, today: 1, yesterday: 0 },
  { title: '销售订单', total: 12, today: 3, yesterday: 1 },
  { title: '销售发货', total: 10, today: 2, yesterday: 0 },
  { title: '销售退货', total: 2, today: 0, yesterday: 0 },
  { title: '其他入库', total: 4, today: 1, yesterday: 1 },
  { title: '其他出库', total: 1, today: 0, yesterday: 0 },
  { title: '采购付款', total: 6, today: 1, yesterday: 0 },
  { title: '销售收款', total: 9, today: 2, yesterday: 1 }
]

function onDateQuery(result) {
  dateRangeLabel.value = result.presetLabel
  console.log('查询时间范围:', result)
  // TODO: 根据 result 调用接口刷新统计数据
}
</script>

<style lang="scss" scoped>
.basic-stats-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 40rpx;
}

/* 顶部栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 30rpx;
}

.top-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: #F5F7FA;
  border-radius: 20rpx;
}

.dropdown-text {
  font-size: 24rpx;
  color: #606266;
}

/* 卡片网格 */
.cards-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 4rpx 20rpx 20rpx;
}

.stat-card {
  width: calc((100% - 16rpx) / 2);
  box-sizing: border-box;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 26rpx;
  color: #909399;
  margin-bottom: 12rpx;
  display: block;
}

.card-value {
  font-size: 52rpx;
  font-weight: 800;
  color: #303133;
  display: block;
  line-height: 1.2;
  margin-bottom: 12rpx;
}

.card-extra-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #F2F6FC;
}

.extra-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.extra-label {
  font-size: 22rpx;
  color: #909399;
}

.extra-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #303133;

  &.green {
    color: #67C23A;
  }
}
</style>
