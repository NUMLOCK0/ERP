<template>
  <view class="log-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索产品/单号/备注"
          type="text"
          confirm-type="search"
          @confirm="reload"
        />
      </view>
      <view class="search-btn" @click="reload">搜索</view>
    </view>

    <view class="tab-bar">
      <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
        <view class="tab-list">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-item"
            :class="{ active: activeTab === tab.value }"
            @click="switchTab(tab.value)"
          >
            <text class="tab-text">{{ tab.label }}</text>
            <view v-if="activeTab === tab.value" class="tab-line" />
          </view>
        </view>
      </scroll-view>
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
          <view v-for="item in list" :key="item.id" class="log-card">
            <view class="card-header">
              <text class="log-no">{{ item.ref_no || item.change_no || '-' }}</text>
              <uni-tag :text="typeLabel(item.change_type)" size="small" :type="typeStyle(item.change_type)" />
            </view>
            <view class="card-body">
              <view class="body-item">
                <text class="body-label">产品</text>
                <text class="body-value">{{ item.product_name || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">仓库</text>
                <text class="body-value">{{ item.warehouse_name || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">变动</text>
                <text class="body-value" :class="deltaClass(item.change_quantity)">{{ formatDelta(item.change_quantity) }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">时间</text>
                <text class="body-value">{{ formatTime(item.created_at) }}</text>
              </view>
            </view>
            <view class="card-footer" v-if="item.remark || item.operator_name">
              <text class="footer-text">{{ item.operator_name || '-' }}</text>
              <text class="footer-note">{{ item.remark || '-' }}</text>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="list" size="60" color="#DCDFE6" />
          <text class="empty-text">暂无库存日志</text>
        </view>
        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading" />
        </view>
        <view v-if="noMore && list.length > 0" class="loading-more">
          <uni-load-more status="noMore" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { inventoryApi } from '@/api/inventory'

const keyword = ref('')
const activeTab = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const tabs = [
  { label: '全部', value: '' },
  { label: '其他入库', value: 'other_inbound' },
  { label: '其他出库', value: 'other_outbound' },
  { label: '盘点调整', value: 'inventory_check' },
  { label: '调拨入库', value: 'inventory_transfer_in' },
  { label: '调拨出库', value: 'inventory_transfer_out' }
]

async function fetchList(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const params = {
      page: reset ? 1 : page.value,
      pageSize,
      keyword: keyword.value.trim()
    }
    if (activeTab.value) params.change_type = activeTab.value
    const res = await inventoryApi.getLogList(params)
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

function switchTab(value) {
  activeTab.value = value
  reload()
}

function typeLabel(value) {
  return {
    purchase_inbound: '采购入库',
    purchase_return: '采购退货',
    sale_delivery: '销售发货',
    sale_return: '销售退货',
    other_inbound: '其他入库',
    other_outbound: '其他出库',
    inventory_check: '盘点调整',
    inventory_transfer_in: '调拨入库',
    inventory_transfer_out: '调拨出库'
  }[value] || '库存变动'
}

function typeStyle(value) {
  if (['purchase_inbound', 'sale_return', 'other_inbound', 'inventory_transfer_in'].includes(value)) return 'success'
  if (['purchase_return', 'sale_delivery', 'other_outbound', 'inventory_transfer_out'].includes(value)) return 'error'
  if (value === 'inventory_check') return 'primary'
  return 'warning'
}

function deltaClass(value) {
  const delta = Number(value || 0)
  if (delta > 0) return 'text-success'
  if (delta < 0) return 'text-danger'
  return ''
}

function formatDelta(value) {
  const delta = Number(value || 0)
  return delta > 0 ? `+${delta}` : String(delta)
}

function formatTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 19)
}

onShow(() => {
  uni.hideTabBar()
  fetchList(true)
})

onMounted(() => {})
</script>

<style scoped lang="scss">
.log-page {
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

.tab-bar {
  flex-shrink: 0;
  background: #FFFFFF;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.02);
}

.tab-scroll {
  white-space: nowrap;
}

.tab-list {
  display: inline-flex;
  padding: 0 12rpx;
}

.tab-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 22rpx 20rpx 16rpx;
  position: relative;
}

.tab-text {
  font-size: 26rpx;
  color: #606266;
  white-space: nowrap;
}

.tab-item.active .tab-text {
  color: #1890FF;
  font-weight: 600;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  border-radius: 2rpx;
  background: #1890FF;
}

.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx 20rpx;
}

.log-card {
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

.log-no {
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

.body-value.text-success {
  color: #67C23A;
}

.body-value.text-danger {
  color: #F56C6C;
}

.card-footer {
  padding: 12rpx 24rpx;
  border-top: 1rpx solid #F2F6FC;
  background: #FAFAFA;
}

.footer-text {
  display: block;
  font-size: 22rpx;
  color: #606266;
}

.footer-note {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #909399;
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
</style>
