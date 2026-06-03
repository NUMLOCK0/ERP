<template>
  <view class="stock-page">
    <!-- 搜索筛选 -->
    <view class="filter-bar">
      <view class="filter-row">
        <uni-search-bar
          v-model="keyword"
          placeholder="搜索产品名称/编码"
          @confirm="onSearch"
          bgColor="#F2F6FC"
          radius="40"
        ></uni-search-bar>
      </view>
      <view class="filter-row">
        <view class="filter-item">
          <picker mode="selector" :range="warehouseOptions" range-key="name" @change="onWarehouseChange">
            <view class="picker-box">
              <text :class="selectedWarehouse > 0 ? '' : 'placeholder'">{{ warehouseLabel || '全部仓库' }}</text>
              <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
            </view>
          </picker>
        </view>
        <view class="filter-item">
          <picker mode="selector" :range="stockFilterOptions" @change="onStockFilterChange">
            <view class="picker-box">
              <text :class="stockFilterIndex > 0 ? '' : 'placeholder'">{{ stockFilterLabel }}</text>
              <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 库存列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0">
        <view class="stock-card" v-for="item in list" :key="item.id">
          <view class="card-main">
            <view class="product-info">
              <text class="product-name">{{ item.product_name || item.name || '-' }}</text>
              <text class="product-code">编码: {{ item.product_code || item.code || '-' }}</text>
            </view>
            <view class="stock-info">
              <text class="stock-qty" :class="getStockClass(item.quantity || 0)">
                {{ item.quantity || 0 }}
              </text>
              <text class="stock-label">库存数量</text>
            </view>
          </view>
          <view class="card-footer">
            <text class="footer-warehouse">{{ item.warehouse_name || '-' }}</text>
            <text class="footer-time">更新: {{ item.updated_at || item.updatedAt || '-' }}</text>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty-state">
        <uni-icons type="box" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无库存数据</text>
      </view>
      <view v-if="loading" class="loading-more"><uni-load-more status="loading"></uni-load-more></view>
      <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore"></uni-load-more></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { inventoryApi } from '@/api/inventory'

const keyword = ref('')
const list = ref([])
const page = ref(1)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const warehouseOptions = ref([{ id: 0, name: '全部仓库' }])
const selectedWarehouse = ref(0)
const warehouseLabel = ref('全部仓库')

const stockFilterOptions = ['全部', '库存不足(<10)', '库存紧张(<50)', '库存充足(>=50)']
const stockFilterIndex = ref(0)
const stockFilterLabel = ref('库存筛选')

const getStockClass = (qty) => {
  if (qty <= 0) return 'text-danger'
  if (qty < 10) return 'text-warning'
  return 'text-success'
}

const onWarehouseChange = (e) => {
  const idx = e.detail.value
  selectedWarehouse.value = warehouseOptions.value[idx].id
  warehouseLabel.value = warehouseOptions.value[idx].name
  onSearch()
}

const onStockFilterChange = (e) => {
  stockFilterIndex.value = e.detail.value
  stockFilterLabel.value = stockFilterOptions[e.detail.value]
  onSearch()
}

const onSearch = () => { page.value = 1; noMore.value = false; fetchList(true) }

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const params = { page: isRefresh ? 1 : page.value, pageSize: 10, keyword: keyword.value.trim() }
    if (selectedWarehouse.value > 0) params.warehouse_id = selectedWarehouse.value
    const res = await inventoryApi.getStock(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      const total = res.data?.total || data.length
      if (isRefresh) { list.value = data; page.value = 2 }
      else { list.value = [...list.value, ...data]; page.value++ }
      noMore.value = list.value.length >= total
    }
  } catch (e) { /* ignore */ }
  finally { loading.value = false; refreshing.value = false }
}

const onRefresh = () => { refreshing.value = true; page.value = 1; noMore.value = false; fetchList(true) }
const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }

onMounted(() => fetchList(true))
</script>

<style lang="scss" scoped>
.stock-page { height: 100vh; display: flex; flex-direction: column; background: #F5F7FA; }
.filter-bar { background: #FFFFFF; padding: 10rpx 20rpx 0; }
.filter-row { display: flex; margin-bottom: 10rpx; }
.filter-item { flex: 1; margin-right: 16rpx; &:last-child { margin-right: 0; }
  .picker-box { display: flex; align-items: center; justify-content: space-between; height: 64rpx; background: #F2F6FC; border-radius: 32rpx; padding: 0 24rpx; font-size: 26rpx; color: #606266; }
  .placeholder { color: #C0C4CC; }
}
.list-scroll { flex: 1; padding: 10rpx 20rpx; }
.stock-card {
  background: #FFFFFF; border-radius: 16rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); overflow: hidden;
  .card-main { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; }
  .product-info { flex: 1; .product-name { font-size: 28rpx; font-weight: 600; color: #303133; display: block; } .product-code { font-size: 22rpx; color: #909399; margin-top: 4rpx; display: block; } }
  .stock-info { text-align: center; .stock-qty { font-size: 40rpx; font-weight: 700; display: block; } .stock-label { font-size: 20rpx; color: #C0C4CC; margin-top: 2rpx; display: block; } }
  .card-footer { display: flex; justify-content: space-between; padding: 12rpx 24rpx; border-top: 1rpx solid #F2F6FC; .footer-warehouse { font-size: 22rpx; color: #409EFF; } .footer-time { font-size: 20rpx; color: #C0C4CC; } }
}
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; .empty-text { font-size: 28rpx; color: #C0C4CC; margin-top: 20rpx; } }
.loading-more { padding: 20rpx 0; }
</style>
