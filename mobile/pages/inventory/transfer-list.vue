<template>
  <view class="transfer-list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999"  />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索调拨单号"
          type="text"
          confirm-type="search"
          @confirm="reload"
        />
      </view>
      <view class="search-btn" @click="reload">搜索</view>
    </view>

    <scroll-view
      class="list-scroll"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view class="scroll-inner">
        <view v-if="list.length > 0">
          <view v-for="item in list" :key="item.id" class="transfer-card">
            <view class="card-header">
              <text class="transfer-no">{{ item.transfer_no }}</text>
              <uni-tag :text="statusText(item.status)" size="small" :type="item.status === 1 ? 'success' : 'warning'" />
            </view>
            <view class="card-body">
              <view class="body-item">
                <text class="body-label">调出仓库</text>
                <text class="body-value">{{ item.from_warehouse_name || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">调入仓库</text>
                <text class="body-value">{{ item.to_warehouse_name || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">金额</text>
                <text class="body-value text-danger">¥{{ formatMoney(item.total_amount) }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">创建时间</text>
                <text class="body-value">{{ formatTime(item.created_at) }}</text>
              </view>
            </view>
            <view class="card-footer">
              <view class="footer-actions">
                <view v-if="Number(item.status) === 0" class="footer-btn primary" @click="confirm(item)">确认调拨</view>
                <view class="footer-btn outline" @click="detail(item)">详情</view>
              </view>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <u-icon name="reload" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无调拨单</text>
        </view>
        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading" />
        </view>
        <view v-if="noMore && list.length > 0" class="loading-more">
          <uni-load-more status="noMore" />
        </view>
      </view>
    </scroll-view>

    <view class="floating-btn" @click="goCreate">
      <u-icon name="plus" size="24" color="#FFFFFF"  />
    </view>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { inventoryApi } from '@/api/inventory'

const keyword = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

async function fetchList(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await inventoryApi.getTransfers({
      page: reset ? 1 : page.value,
      pageSize,
      transfer_no: keyword.value.trim()
    })
    const data = res.data?.list || res.data || []
    const total = res.data?.total ?? data.length
    list.value = reset ? data : [...list.value, ...data]
    page.value = reset ? 2 : page.value + 1
    noMore.value = list.value.length >= total
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function reload() {
  page.value = 1
  noMore.value = false
  fetchList(true)
}

function onRefresh() {
  refreshing.value = true
  reload()
}

function loadMore() {
  if (!loading.value && !noMore.value) fetchList()
}

function statusText(status) {
  return Number(status) === 1 ? '已完成' : '待确认'
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function formatTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 19)
}

async function confirm(item) {
  const confirmed = await new Promise(resolve => {
    uni.showModal({
      title: '确认调拨',
      content: '确认后将执行跨仓库库存转移。',
      success: res => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
  if (!confirmed) return
  await inventoryApi.confirmTransfer(item.id)
  uni.showToast({ title: '调拨已确认', icon: 'success' })
  reload()
}

function detail(item) {
  uni.showModal({
    title: item.transfer_no || '调拨单',
    content: `调出：${item.from_warehouse_name || '-'}\n调入：${item.to_warehouse_name || '-'}\n金额：¥${formatMoney(item.total_amount)}`,
    showCancel: false
  })
}

function goCreate() {
  uni.showToast({ title: '请在后续补充调拨新增页', icon: 'none' })
}

onShow(() => {
  uni.hideTabBar()
  fetchList(true)
})

onMounted(() => {})
</script>

<style scoped lang="scss">
.transfer-list-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

.search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #FFFFFF;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.02);
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F2F4F6;
  border-radius: 12rpx;
  padding: 0 16rpx;
  height: 72rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  margin-left: 10rpx;
}

.search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}

.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx 20rpx;
}

.transfer-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #F2F6FC;
}

.transfer-no {
  font-size: 26rpx;
  font-weight: 600;
  color: #303133;
}

.card-body {
  padding: 16rpx 24rpx;
}

.body-item {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
}

.body-label {
  font-size: 24rpx;
  color: #909399;
}

.body-value {
  font-size: 24rpx;
  color: #303133;
  font-weight: 500;
}

.body-value.text-danger {
  color: #F56C6C;
}

.card-footer {
  padding: 12rpx 24rpx 16rpx;
  border-top: 1rpx solid #F2F6FC;
  background: #FAFAFA;
}

.footer-actions {
  display: flex;
  gap: 12rpx;
}

.footer-btn {
  flex: 1;
  height: 66rpx;
  line-height: 66rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.footer-btn.primary {
  background: #1890FF;
  color: #FFFFFF;
}

.footer-btn.outline {
  background: #F4F4F5;
  color: #606266;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #C0C4CC;
  margin-top: 16rpx;
}

.loading-more {
  padding: 20rpx 0;
}

.floating-btn {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #1890FF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.4);
  z-index: 99;
}
</style>
