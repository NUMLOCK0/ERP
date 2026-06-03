<template>
  <view class="product-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <uni-search-bar
        v-model="searchQuery"
        placeholder="搜索产品名称/编码"
        @confirm="onSearch"
        @cancel="onSearchCancel"
        bgColor="#F2F6FC"
        radius="40"
        focus
      ></uni-search-bar>
    </view>

    <!-- 产品列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0">
        <view
          class="product-card"
          v-for="item in list"
          :key="item.id"
          @click="goDetail(item.id)"
        >
          <view class="card-body">
            <view class="product-main">
              <view class="product-avatar" :style="{ backgroundColor: getAvatarColor(item.id) }">
                <text class="avatar-text">{{ (item.name || '?')[0] }}</text>
              </view>
              <view class="product-info">
                <text class="product-name">{{ item.name }}</text>
                <text class="product-code">编码: {{ item.code || '-' }}</text>
                <text class="product-spec" v-if="item.spec">规格: {{ item.spec }}</text>
              </view>
            </view>
            <view class="product-meta">
              <view class="meta-item">
                <text class="meta-label">销售价</text>
                <text class="meta-value text-primary">¥{{ formatPrice(item.sale_price) }}</text>
              </view>
              <view class="meta-item">
                <text class="meta-label">成本价</text>
                <text class="meta-value text-muted">¥{{ formatPrice(item.cost_price) }}</text>
              </view>
              <view class="meta-item">
                <text class="meta-label">库存</text>
                <text class="meta-value" :class="getStockClass(item.stock_quantity || 0)">
                  {{ item.stock_quantity || 0 }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty-state">
        <uni-icons type="box" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无产品数据</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-more">
        <uni-load-more status="loading" :contentText="{ contentdown: '上拉加载更多', contentrefresh: '加载中...', contentnomore: '没有更多了' }"></uni-load-more>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <uni-load-more status="noMore"></uni-load-more>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { productApi } from '@/api/product'

const searchQuery = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const getStockClass = (qty) => {
  if (qty <= 0) return 'text-danger'
  if (qty < 10) return 'text-warning'
  return 'text-success'
}

const getAvatarColor = (id) => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#8E44AD', '#17A2B8']
  return colors[(id || 0) % colors.length]
}

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true

  try {
    const params = {
      page: isRefresh ? 1 : page.value,
      pageSize,
      keyword: searchQuery.value.trim()
    }
    const res = await productApi.getList(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      total.value = res.data?.total || data.length
      if (isRefresh) {
        list.value = data
        page.value = 2
      } else {
        list.value = [...list.value, ...data]
        page.value++
      }
      noMore.value = list.value.length >= total.value
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onSearch = () => {
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const onSearchCancel = () => {
  searchQuery.value = ''
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const onRefresh = () => {
  refreshing.value = true
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const loadMore = () => {
  if (!noMore.value && !loading.value) {
    fetchList()
  }
}

const goDetail = (id) => {
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` })
}

onMounted(() => {
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.product-list {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
}

.search-bar {
  padding: 10rpx 20rpx;
  background: #FFFFFF;
}

.list-scroll {
  flex: 1;
  padding: 10rpx 20rpx;
}

.product-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;

  .card-body {
    padding: 24rpx;
  }
}

.product-main {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;

  .product-avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    flex-shrink: 0;

    .avatar-text {
      font-size: 32rpx;
      font-weight: 700;
      color: #FFFFFF;
    }
  }

  .product-info {
    flex: 1;
    .product-name {
      font-size: 30rpx;
      font-weight: 600;
      color: #303133;
      display: block;
      margin-bottom: 4rpx;
    }
    .product-code, .product-spec {
      font-size: 22rpx;
      color: #909399;
      display: block;
      margin-top: 2rpx;
    }
  }
}

.product-meta {
  display: flex;
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;

  .meta-item {
    flex: 1;
    text-align: center;
    .meta-label {
      font-size: 20rpx;
      color: #C0C4CC;
      display: block;
      margin-bottom: 4rpx;
    }
    .meta-value {
      font-size: 26rpx;
      font-weight: 600;
      display: block;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;

  .empty-text {
    font-size: 28rpx;
    color: #C0C4CC;
    margin-top: 20rpx;
  }
}

.loading-more {
  padding: 20rpx 0;
}
</style>
