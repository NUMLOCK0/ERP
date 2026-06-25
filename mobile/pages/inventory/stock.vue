<template>
  <view class="stock-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索产品名称/编码"
          type="text"
          confirm-type="search"
          @confirm="reload"
        />
      </view>
      <view class="search-btn" @click="reload">搜索</view>
    </view>

    <view class="filter-row">
      <picker mode="selector" :range="warehouseLabels" @change="onWarehousePick">
        <view class="filter-box">
          <text class="filter-text">{{ warehouseLabels[warehouseIndex] || '全部仓库' }}</text>
          <uni-icons type="arrowdown" size="14" color="#909399" />
        </view>
      </picker>
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
          <view v-for="item in list" :key="`${item.id}-${item.warehouse_id || ''}`" class="stock-card" @click="openDetail(item)">
            <view class="card-main">
              <view class="product-info">
                <text class="product-name">{{ item.product_name || '-' }}</text>
                <text class="product-code">编码: {{ item.product_code || item.code || '-' }}</text>
                <text v-if="item.unit_name" class="product-spec">单位: {{ item.unit_name }}</text>
              </view>
              <view class="stock-info" :class="qtyClass(item.quantity)">
                <text class="stock-qty">{{ formatQty(item.quantity) }}</text>
                <text class="stock-label">库存数量</text>
              </view>
            </view>
            <view class="card-footer">
              <text class="footer-tag warehouse-tag">{{ item.warehouse_name || '-' }}</text>
              <text class="footer-tag unit-tag" v-if="item.unit_name">{{ item.unit_name }}</text>
              <text class="footer-time">更新: {{ formatTime(item.updated_at) }}</text>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="box" size="60" color="#DCDFE6" />
          <text class="empty-text">暂无库存数据</text>
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
import { computed, onMounted, ref } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { warehouseApi } from '@/api/warehouse'

const keyword = ref('')
const warehouses = ref([])
const warehouseIndex = ref(0)
const list = ref([])
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const warehouseLabels = computed(() => ['全部仓库', ...warehouses.value.map(item => item.name)])
const selectedWarehouseId = computed(() => (warehouseIndex.value > 0 ? warehouses.value[warehouseIndex.value - 1]?.id : ''))

async function loadWarehouses() {
  const res = await warehouseApi.getList({ page: 1, pageSize: 1000, status: 1 })
  warehouses.value = res.data?.list || res.data || []
}

async function fetchList(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await inventoryApi.getStock({
      page: reset ? 1 : page.value,
      pageSize,
      keyword: keyword.value.trim(),
      warehouse_id: selectedWarehouseId.value || undefined
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

function onWarehousePick(e) {
  warehouseIndex.value = Number(e.detail.value)
  reload()
}

function openDetail(item) {
  uni.showModal({
    title: item.product_name || '库存详情',
    content: `仓库：${item.warehouse_name || '-'}\n数量：${formatQty(item.quantity)}\n成本：¥${formatMoney(item.cost_price)}`,
    showCancel: false
  })
}

function qtyClass(value) {
  const quantity = Number(value || 0)
  if (quantity <= 0) return 'danger'
  if (quantity < 10) return 'warning'
  return 'success'
}

function formatQty(value) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : Number(quantity).toFixed(2)
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function formatTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 19)
}

onMounted(async () => {
  await loadWarehouses()
  await fetchList(true)
})
</script>

<style scoped lang="scss">
.stock-page {
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

.filter-row {
  padding: 0 20rpx 16rpx;
  background: #FFFFFF;
}

.filter-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64rpx;
  padding: 0 16rpx;
  background: #F2F4F6;
  border-radius: 12rpx;
}

.filter-text {
  font-size: 26rpx;
  color: #303133;
}

.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx 20rpx;
}

.stock-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx 16rpx;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-code,
.product-spec {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
}

.stock-info {
  text-align: center;
  margin-left: 20rpx;
  flex-shrink: 0;
}

.stock-qty {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.1;
  color: #303133;
}

.stock-info.success .stock-qty {
  color: #67C23A;
}

.stock-info.warning .stock-qty {
  color: #E6A23C;
}

.stock-info.danger .stock-qty {
  color: #F56C6C;
}

.stock-label {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #C0C4CC;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  border-top: 1rpx solid #F2F6FC;
  flex-wrap: wrap;
}

.footer-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  line-height: 1.4;
}

.warehouse-tag {
  color: #409EFF;
  background: #ECF5FF;
}

.unit-tag {
  color: #67C23A;
  background: #F0F9EB;
}

.footer-time {
  font-size: 22rpx;
  color: #909399;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #C0C4CC;
  margin-top: 20rpx;
}

.loading-more {
  padding: 20rpx 0;
}
</style>
